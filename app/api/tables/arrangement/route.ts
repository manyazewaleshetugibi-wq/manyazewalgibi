import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { TableArrangement, ITable } from '@/models/TableArrangement';
import clientPromise from '@/lib/mongodb';
import mongoose from 'mongoose';
import { syncTablesWithPendingOrders, syncAllFloorsWithPendingOrders } from '@/lib/tableOrderSync';

// In-memory store for real-time selections
const activeSelections = new Map<string, {
  tableId: string;
  tableNumber: number;
  selectedBy: string;
  selectedByName: string;
  selectedAt: Date;
  expiresAt: Date;
  orderId?: string;
  isGuest?: boolean;
  guestInfo?: {
    name: string;
    phone?: string;
    email?: string;
  };
}>();

// Guest session store
const guestSessions = new Map<string, {
  guestId: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt: Date;
  expiresAt: Date;
}>();

// Cleanup expired selections every 30 seconds
setInterval(() => {
  const now = new Date();
  
  for (const [key, selection] of activeSelections.entries()) {
    if (selection.expiresAt < now) {
      activeSelections.delete(key);
    }
  }
  
  for (const [key, session] of guestSessions.entries()) {
    if (session.expiresAt < now) {
      guestSessions.delete(key);
    }
  }
}, 30000);

async function ensureConnection() {
  if (mongoose.connection.readyState === 0) {
    const client = await clientPromise;
    await mongoose.connect(process.env.MONGODB_URI!);
  }
  return mongoose.connection;
}

function getSelectionKey(restaurantId: string, floor: string): string {
  return `${restaurantId}:${floor}`;
}

function generateGuestId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getOrCreateGuestSession(guestInfo?: { name?: string; phone?: string; email?: string }) {
  const guestName = guestInfo?.name || `Guest_${Math.floor(Math.random() * 10000)}`;
  const guestId = generateGuestId();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  
  const session = {
    guestId,
    name: guestName,
    phone: guestInfo?.phone,
    email: guestInfo?.email,
    createdAt: new Date(),
    expiresAt
  };
  
  guestSessions.set(guestId, session);
  return session;
}

function validateGuestSession(guestId?: string): { valid: boolean; session?: any } {
  if (!guestId) return { valid: false };
  
  const session = guestSessions.get(guestId);
  if (!session) return { valid: false };
  
  if (session.expiresAt < new Date()) {
    guestSessions.delete(guestId);
    return { valid: false };
  }
  
  return { valid: true, session };
}

async function saveWithRetry(document: any, maxRetries = 3): Promise<any> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await document.save({ validateBeforeSave: false });
    } catch (error: any) {
      lastError = error;
      
      if (error.name === 'VersionError' && attempt < maxRetries) {
        console.log(`Version conflict on attempt ${attempt}, retrying...`);
        await document.refresh();
        continue;
      }
      throw error;
    }
  }
  
  throw lastError;
}

// GET - Fetch table arrangement(s)
export async function GET(req: NextRequest) {
  try {
    await ensureConnection();
    
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    const floor = searchParams.get('floor');
    const fetchAll = searchParams.get('fetchAll') === 'true';
    const includeSelections = searchParams.get('includeSelections') === 'true';
    const skipSync = searchParams.get('skipSync') === 'true';

    if (!fetchAll) {
      if (!restaurantId || !floor) {
        return NextResponse.json(
          { success: false, error: 'restaurantId and floor are required' },
          { status: 400 }
        );
      }

      const query: any = { restaurantId, floor, isActive: true };
      let arrangement = await TableArrangement.findOne(query).sort({ updatedAt: -1 });

      if (arrangement && !skipSync) {
        const syncResult = await syncTablesWithPendingOrders(restaurantId, floor);
        if (syncResult.success && syncResult.data?.arrangement) {
          arrangement = syncResult.data.arrangement;
        }
      }

      if (!arrangement) {
        return NextResponse.json({ 
          success: true, 
          data: null,
          message: 'No arrangement found'
        });
      }

      const response: any = { success: true, data: arrangement };

      if (includeSelections) {
        const selectionKey = getSelectionKey(arrangement.restaurantId, arrangement.floor);
        const activeSelection = activeSelections.get(selectionKey);
        if (activeSelection && activeSelection.expiresAt > new Date()) {
          response.activeSelection = {
            tableId: activeSelection.tableId,
            tableNumber: activeSelection.tableNumber,
            selectedBy: activeSelection.isGuest ? 'guest' : activeSelection.selectedBy,
            selectedByName: activeSelection.isGuest ? 'Guest' : activeSelection.selectedByName,
            selectedAt: activeSelection.selectedAt.toISOString(),
            expiresAt: activeSelection.expiresAt.toISOString(),
            isGuest: activeSelection.isGuest
          };
        } else if (activeSelection && activeSelection.expiresAt <= new Date()) {
          activeSelections.delete(selectionKey);
        }
      }

      return NextResponse.json(response);
    } else {
      const arrangements = await TableArrangement.find({ isActive: true })
        .select('_id restaurantId restaurantName floor name layoutType totalTables availableTables occupiedTables totalCapacity updatedAt')
        .sort({ restaurantName: 1, floor: 1 });
      return NextResponse.json({ success: true, data: arrangements });
    }
  } catch (error) {
    console.error('Error fetching table arrangement:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch table arrangement' },
      { status: 500 }
    );
  }
}

// PATCH - Update table status (FIXED for auto-switch)
export async function PATCH(req: NextRequest) {
  try {
    await ensureConnection();
    
    const body = await req.json();
    const { 
      restaurantId,
      floor,
      tableId, 
      updates,
      selectTable,
      unselectTable,
      switchTable, // New flag for auto-switch
      duration = 3,
      guestInfo,
      guestId
    } = body;

    if (!restaurantId || !floor) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: restaurantId and floor are required' },
        { status: 400 }
      );
    }

    const selectionKey = getSelectionKey(restaurantId, floor);
    let existingSelection = activeSelections.get(selectionKey);
    
    if (existingSelection && existingSelection.expiresAt < new Date()) {
      activeSelections.delete(selectionKey);
      existingSelection = null;
    }

    // Handle auto-switch table - atomic operation to switch tables
    if (switchTable && tableId) {
      const session = await auth();
      const anonymousId = req.headers.get('X-Anonymous-Id') || guestId;
      const userEmail = session?.user?.email;
      
      // Get user info
      let selectedBy = '';
      let selectedByName = '';
      let isGuest = false;
      let guestSessionData = null;
      
      if (userEmail) {
        selectedBy = userEmail;
        selectedByName = session?.user?.name || userEmail.split('@')[0];
      } else if (anonymousId) {
        let existingGuestSession = guestSessions.get(anonymousId);
        
        if (!existingGuestSession) {
          const guestName = guestInfo?.name || `Guest_${Math.floor(Math.random() * 10000)}`;
          guestSessionData = getOrCreateGuestSession({
            name: guestName,
            phone: guestInfo?.phone,
            email: guestInfo?.email
          });
          selectedBy = guestSessionData.guestId;
          selectedByName = guestSessionData.name;
          isGuest = true;
        } else {
          selectedBy = existingGuestSession.guestId;
          selectedByName = existingGuestSession.name;
          isGuest = true;
          guestSessionData = existingGuestSession;
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Please login or provide guest information' },
          { status: 401 }
        );
      }
      
      // Fetch arrangement
      const arrangement = await TableArrangement.findOne({
        restaurantId,
        floor,
        isActive: true
      });
      
      if (!arrangement) {
        return NextResponse.json(
          { success: false, error: 'Arrangement not found' }, 
          { status: 404 }
        );
      }
      
      const newTableIndex = arrangement.tables.findIndex((t: ITable) => t.id === tableId);
      if (newTableIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'Table not found' }, 
          { status: 404 }
        );
      }
      
      const newTable = arrangement.tables[newTableIndex];
      
      if (newTable.status !== 'available') {
        return NextResponse.json(
          { success: false, error: `Table ${newTable.number} is currently ${newTable.status}` },
          { status: 400 }
        );
      }
      
      // If there's an existing selection, clear it first
      if (existingSelection) {
        const oldTableIndex = arrangement.tables.findIndex((t: ITable) => t.id === existingSelection.tableId);
        if (oldTableIndex !== -1) {
          arrangement.tables[oldTableIndex].status = 'available';
          arrangement.tables[oldTableIndex].reservationInfo = null;
          arrangement.tables[oldTableIndex].lastUpdated = new Date();
        }
        activeSelections.delete(selectionKey);
      }
      
      // Create new selection
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + duration);
      
      const newSelection = {
        tableId: newTable.id,
        tableNumber: newTable.number,
        selectedBy: selectedBy,
        selectedByName: selectedByName,
        selectedAt: new Date(),
        expiresAt,
        isGuest: isGuest,
        guestInfo: isGuest ? {
          name: selectedByName,
          phone: guestInfo?.phone,
          email: guestInfo?.email
        } : undefined
      };
      
      activeSelections.set(selectionKey, newSelection);
      
      // Update new table status
      arrangement.tables[newTableIndex].status = 'reserved';
      arrangement.tables[newTableIndex].reservationInfo = {
        reservedBy: selectedBy,
        reservedByName: selectedByName,
        reservedAt: new Date(),
        expiresAt
      };
      arrangement.tables[newTableIndex].lastUpdated = new Date();
      
      // Update statistics
      arrangement.availableTables = arrangement.tables.filter((t: ITable) => t.status === 'available').length;
      arrangement.reservedTables = arrangement.tables.filter((t: ITable) => t.status === 'reserved').length;
      
      await saveWithRetry(arrangement);
      
      const responseData: any = {
        success: true,
        data: {
          selection: {
            ...newSelection,
            selectedAt: newSelection.selectedAt.toISOString(),
            expiresAt: newSelection.expiresAt.toISOString()
          },
          table: arrangement.tables[newTableIndex],
          previousTableId: existingSelection?.tableId,
          previousTableNumber: existingSelection?.tableNumber
        },
        message: `Switched to Table ${newTable.number} successfully!`
      };
      
      if (isGuest && guestSessionData) {
        responseData.guestId = guestSessionData.guestId;
        responseData.guestName = guestSessionData.name;
        responseData.isGuest = true;
      }
      
      return NextResponse.json(responseData);
    }

    // Handle table unselection
    if (unselectTable && tableId) {
      const session = await auth();
      const anonymousId = req.headers.get('X-Anonymous-Id') || guestId;
      const userEmail = session?.user?.email;
      
      // If no existing selection, just return success
      if (!existingSelection) {
        return NextResponse.json({ 
          success: true,
          message: 'No active selection to clear'
        });
      }
      
      let isAuthorized = false;
      if (userEmail && existingSelection.selectedBy === userEmail) {
        isAuthorized = true;
      } else if (anonymousId && existingSelection.selectedBy === anonymousId) {
        isAuthorized = true;
      } else if (existingSelection.isGuest && anonymousId) {
        const guestCheck = validateGuestSession(anonymousId);
        if (guestCheck.valid && existingSelection.selectedBy === anonymousId) {
          isAuthorized = true;
        }
      }
      
      if (!isAuthorized) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized - You did not select this table' },
          { status: 401 }
        );
      }
      
      // Clear selection from memory
      activeSelections.delete(selectionKey);
      
      // Update database
      const arrangement = await TableArrangement.findOne({
        restaurantId,
        floor,
        isActive: true
      });
      
      if (arrangement) {
        const tableIndex = arrangement.tables.findIndex((t: ITable) => t.id === tableId);
        if (tableIndex !== -1 && arrangement.tables[tableIndex].status === 'reserved') {
          arrangement.tables[tableIndex].status = 'available';
          arrangement.tables[tableIndex].reservationInfo = null;
          arrangement.tables[tableIndex].lastUpdated = new Date();
          
          arrangement.availableTables = arrangement.tables.filter((t: ITable) => t.status === 'available').length;
          arrangement.reservedTables = arrangement.tables.filter((t: ITable) => t.status === 'reserved').length;
          
          await saveWithRetry(arrangement);
        }
      }
      
      return NextResponse.json({ 
        success: true,
        message: 'Table unselected successfully'
      });
    }

    // Handle single table selection (without auto-switch)
    if (selectTable && tableId) {
      let selectedBy = '';
      let selectedByName = '';
      let isGuest = false;
      let guestSessionData = null;
      
      const session = await auth();
      const anonymousId = req.headers.get('X-Anonymous-Id') || guestId;
      
      if (session?.user?.email) {
        selectedBy = session.user.email;
        selectedByName = session.user.name || session.user.email.split('@')[0];
      } else if (anonymousId) {
        let existingGuestSession = guestSessions.get(anonymousId);
        
        if (!existingGuestSession) {
          const guestName = guestInfo?.name || `Guest_${Math.floor(Math.random() * 10000)}`;
          guestSessionData = getOrCreateGuestSession({
            name: guestName,
            phone: guestInfo?.phone,
            email: guestInfo?.email
          });
          selectedBy = guestSessionData.guestId;
          selectedByName = guestSessionData.name;
          isGuest = true;
        } else {
          selectedBy = existingGuestSession.guestId;
          selectedByName = existingGuestSession.name;
          isGuest = true;
          guestSessionData = existingGuestSession;
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'Please login or provide guest information' },
          { status: 401 }
        );
      }
      
      // Fetch fresh arrangement
      const arrangement = await TableArrangement.findOne({
        restaurantId,
        floor,
        isActive: true
      });
      
      if (!arrangement) {
        return NextResponse.json(
          { success: false, error: 'Arrangement not found' }, 
          { status: 404 }
        );
      }
      
      const tableIndex = arrangement.tables.findIndex((t: ITable) => t.id === tableId);
      if (tableIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'Table not found' }, 
          { status: 404 }
        );
      }

      const table = arrangement.tables[tableIndex];
      
      if (table.status !== 'available') {
        return NextResponse.json(
          { success: false, error: `Table ${table.number} is currently ${table.status}` },
          { status: 400 }
        );
      }
      
      // Check if user already has a different table selected
      if (existingSelection && existingSelection.tableId !== tableId) {
        return NextResponse.json(
          { 
            success: false, 
            error: `You already have Table ${existingSelection.tableNumber} selected. Please unselect it first.`,
            currentSelection: {
              tableId: existingSelection.tableId,
              tableNumber: existingSelection.tableNumber,
              tableName: `Table ${existingSelection.tableNumber}`,
              expiresAt: existingSelection.expiresAt.toISOString()
            }
          },
          { status: 409 }
        );
      }
      
      // Check if table is selected by another user
      if (existingSelection && existingSelection.tableId === tableId && existingSelection.selectedBy !== selectedBy) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Table ${table.number} is being selected by another customer`,
            conflict: true
          },
          { status: 409 }
        );
      }
      
      // If same user re-selecting, just refresh the timer
      if (existingSelection && existingSelection.tableId === tableId && existingSelection.selectedBy === selectedBy) {
        const newExpiresAt = new Date();
        newExpiresAt.setMinutes(newExpiresAt.getMinutes() + duration);
        
        existingSelection.expiresAt = newExpiresAt;
        existingSelection.selectedAt = new Date();
        activeSelections.set(selectionKey, existingSelection);
        
        if (arrangement.tables[tableIndex].reservationInfo) {
          arrangement.tables[tableIndex].reservationInfo!.expiresAt = newExpiresAt;
          arrangement.tables[tableIndex].reservationInfo!.reservedAt = new Date();
          await saveWithRetry(arrangement);
        }
        
        return NextResponse.json({ 
          success: true,
          data: {
            selection: {
              ...existingSelection,
              selectedAt: existingSelection.selectedAt.toISOString(),
              expiresAt: existingSelection.expiresAt.toISOString()
            },
            table: arrangement.tables[tableIndex]
          },
          message: `Table ${table.number} selection renewed`
        });
      }
      
      // Create new selection
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + duration);
      
      const newSelection = {
        tableId: table.id,
        tableNumber: table.number,
        selectedBy: selectedBy,
        selectedByName: selectedByName,
        selectedAt: new Date(),
        expiresAt,
        isGuest: isGuest,
        guestInfo: isGuest ? {
          name: selectedByName,
          phone: guestInfo?.phone,
          email: guestInfo?.email
        } : undefined
      };
      
      activeSelections.set(selectionKey, newSelection);
      
      // Update table status
      arrangement.tables[tableIndex].status = 'reserved';
      arrangement.tables[tableIndex].reservationInfo = {
        reservedBy: selectedBy,
        reservedByName: selectedByName,
        reservedAt: new Date(),
        expiresAt
      };
      arrangement.tables[tableIndex].lastUpdated = new Date();
      
      arrangement.availableTables = arrangement.tables.filter((t: ITable) => t.status === 'available').length;
      arrangement.reservedTables = arrangement.tables.filter((t: ITable) => t.status === 'reserved').length;
      
      await saveWithRetry(arrangement);
      
      const responseData: any = {
        success: true,
        data: {
          selection: {
            ...newSelection,
            selectedAt: newSelection.selectedAt.toISOString(),
            expiresAt: newSelection.expiresAt.toISOString()
          },
          table: arrangement.tables[tableIndex]
        },
        message: `Table ${table.number} selected successfully!`
      };
      
      if (isGuest && guestSessionData) {
        responseData.guestId = guestSessionData.guestId;
        responseData.guestName = guestSessionData.name;
        responseData.isGuest = true;
      }
      
      return NextResponse.json(responseData);
    }

    return NextResponse.json(
      { success: false, error: 'Invalid operation' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating table:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update table' },
      { status: 500 }
    );
  }
}

// POST - Save/Create table arrangement
export async function POST(req: NextRequest) {
  try {
    await ensureConnection();
    
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { restaurantId, restaurantName, floor, tables, dimensions } = body;

    if (!restaurantId || !floor || !tables) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const processedTables = tables.map((table: any) => ({
      id: table.id,
      number: table.number,
      capacity: table.capacity || 4,
      shape: table.shape || 'circle',
      x: table.x || 0,
      y: table.y || 0,
      width: table.width || 80,
      height: table.height || 80,
      status: table.status || 'available',
      location: table.location || '',
      description: table.description || '',
      features: table.features || [],
      lastUpdated: new Date(),
    }));

    const arrangement = await TableArrangement.findOneAndUpdate(
      { restaurantId, floor, isActive: true },
      {
        restaurantId,
        restaurantName: restaurantName || restaurantId,
        floor,
        tables: processedTables,
        totalTables: processedTables.length,
        totalCapacity: processedTables.reduce((sum: number, t: any) => sum + (t.capacity || 0), 0),
        availableTables: processedTables.filter((t: any) => t.status === 'available').length,
        occupiedTables: processedTables.filter((t: any) => t.status === 'occupied').length,
        reservedTables: processedTables.filter((t: any) => t.status === 'reserved').length,
        dimensions: dimensions || { width: 1200, height: 800 },
        createdBy: session.user.email,
        updatedAt: new Date(),
        isActive: true
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: arrangement });
  } catch (error) {
    console.error('Error saving table arrangement:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save table arrangement' },
      { status: 500 }
    );
  }
}

// DELETE - Delete arrangement
export async function DELETE(req: NextRequest) {
  try {
    await ensureConnection();
    
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    const floor = searchParams.get('floor');

    if (!restaurantId || !floor) {
      return NextResponse.json(
        { success: false, error: 'restaurantId and floor are required' },
        { status: 400 }
      );
    }

    const arrangement = await TableArrangement.findOne({ restaurantId, floor, isActive: true });
    if (!arrangement) {
      return NextResponse.json(
        { success: false, error: 'Arrangement not found' },
        { status: 404 }
      );
    }

    arrangement.isActive = false;
    arrangement.updatedAt = new Date();
    await arrangement.save();

    const selectionKey = getSelectionKey(restaurantId, floor);
    activeSelections.delete(selectionKey);

    return NextResponse.json({ success: true, message: 'Arrangement deleted successfully' });
  } catch (error) {
    console.error('Error deleting arrangement:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete arrangement' },
      { status: 500 }
    );
  }
}

// PUT - Sync with orders
export async function PUT(req: NextRequest) {
  try {
    await ensureConnection();
    
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { restaurantId, floor, syncWithOrders, syncAllFloors } = body;

    if (syncWithOrders && restaurantId) {
      if (syncAllFloors) {
        const result = await syncAllFloorsWithPendingOrders(restaurantId);
        return NextResponse.json(result);
      } else if (floor) {
        const result = await syncTablesWithPendingOrders(restaurantId, floor);
        return NextResponse.json(result);
      }
    }

    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error syncing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync' },
      { status: 500 }
    );
  }
}