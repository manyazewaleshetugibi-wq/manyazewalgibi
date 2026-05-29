import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { TableArrangement, ITable } from '@/models/TableArrangement';
import clientPromise from '@/lib/mongodb';
import mongoose from 'mongoose';
import { syncTablesWithPendingOrders, syncAllFloorsWithPendingOrders } from '@/lib/tableOrderSync';

// In-memory store for real-time selections (use Redis in production)
const activeSelections = new Map<string, {
  tableId: string;
  tableNumber: number;
  selectedBy: string;
  selectedByName: string;
  selectedAt: Date;
  expiresAt: Date;
  orderId?: string;
}>();

// Cleanup expired selections every minute
setInterval(() => {
  const now = new Date();
  for (const [key, selection] of activeSelections.entries()) {
    if (selection.expiresAt < now) {
      activeSelections.delete(key);
    }
  }
}, 60000);

// Helper to ensure mongoose connection
async function ensureConnection() {
  if (mongoose.connection.readyState === 0) {
    const client = await clientPromise;
    await mongoose.connect(process.env.MONGODB_URI!);
  }
  return mongoose.connection;
}

// Helper to get selection key
function getSelectionKey(restaurantId: string, floor: string): string {
  return `${restaurantId}:${floor}`;
}

// GET - Fetch table arrangement(s)
export async function GET(req: NextRequest) {
  try {
    await ensureConnection();
    
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const pathname = req.nextUrl.pathname;
    
    // Check if this is the SSE endpoint
    if (pathname.includes('/selection-status')) {
      return handleSelectionStatusSSE(req);
    }
    
    const restaurantId = searchParams.get('restaurantId');
    const floor = searchParams.get('floor');
    const fetchAll = searchParams.get('fetchAll') === 'true';
    const includeSelections = searchParams.get('includeSelections') === 'true';
    const skipSync = searchParams.get('skipSync') === 'true';

    // For viewing tables, we don't require authentication
    // Anyone can view available tables
    const query: any = { isActive: true };
    
    if (!fetchAll) {
      if (restaurantId) query.restaurantId = restaurantId;
      if (floor) query.floor = floor;

      // Don't filter by createdBy for viewing - show all active arrangements
      let arrangement = await TableArrangement.findOne(query)
        .sort({ updatedAt: -1 });

      // AUTO-SYNC: Sync tables with pending orders before returning
      if (arrangement && !skipSync && restaurantId && floor) {
        const syncResult = await syncTablesWithPendingOrders(restaurantId, floor);
        if (syncResult.success && syncResult.data?.arrangement) {
          arrangement = syncResult.data.arrangement;
          // Log sync but don't show to user unless requested
          if (syncResult.data.updatedCount > 0) {
            console.log(`[Auto-Sync] ${syncResult.message}`);
          }
        } else if (syncResult.success && arrangement) {
          // Re-fetch to get latest data if sync didn't return arrangement
          arrangement = await TableArrangement.findOne(query).sort({ updatedAt: -1 });
        }
      }

      // If no arrangement found, return empty data instead of error
      if (!arrangement) {
        return NextResponse.json({ 
          success: true, 
          data: null,
          message: 'No arrangement found for this restaurant and floor'
        });
      }

      const response: any = { 
        success: true, 
        data: arrangement 
      };

      // Include active selections if requested
      if (includeSelections && arrangement) {
        const selectionKey = getSelectionKey(arrangement.restaurantId, arrangement.floor);
        const activeSelection = activeSelections.get(selectionKey);
        if (activeSelection && activeSelection.expiresAt > new Date()) {
          response.activeSelection = activeSelection;
        }
      }

      return NextResponse.json(response);
    } else {
      // For fetchAll, we need authentication to see all arrangements
      // But we can still return public arrangements
      const arrangements = await TableArrangement.find({ isActive: true })
        .select('_id restaurantId restaurantName floor name layoutType totalTables availableTables occupiedTables totalCapacity updatedAt')
        .sort({ restaurantName: 1, floor: 1 });

      return NextResponse.json({ 
        success: true, 
        data: arrangements 
      });
    }
  } catch (error) {
    console.error('Error fetching table arrangement:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch table arrangement' },
      { status: 500 }
    );
  }
}

// SSE Handler for real-time selection status
function handleSelectionStatusSSE(req: NextRequest): NextResponse {
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get('restaurantId');
  const floor = searchParams.get('floor');
  
  if (!restaurantId || !floor) {
    return NextResponse.json(
      { success: false, error: 'Missing parameters: restaurantId and floor are required' },
      { status: 400 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let lastSelection = null;
      const selectionKey = getSelectionKey(restaurantId, floor);
      
      // Send initial data
      const currentSelection = activeSelections.get(selectionKey);
      if (currentSelection && currentSelection.expiresAt > new Date()) {
        const selectionData = {
          ...currentSelection,
          selectedAt: currentSelection.selectedAt.toISOString(),
          expiresAt: currentSelection.expiresAt.toISOString()
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'selection', data: selectionData })}\n\n`));
        lastSelection = selectionData;
      }

      // Set up interval to check for changes
      const interval = setInterval(() => {
        const selection = activeSelections.get(selectionKey);
        let validSelection = null;
        
        if (selection && selection.expiresAt > new Date()) {
          validSelection = {
            ...selection,
            selectedAt: selection.selectedAt.toISOString(),
            expiresAt: selection.expiresAt.toISOString()
          };
        }
        
        if (JSON.stringify(validSelection) !== JSON.stringify(lastSelection)) {
          lastSelection = validSelection;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'selection', data: validSelection })}\n\n`));
        }
        
        // Send heartbeat every 30 seconds
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`));
      }, 5000);

      // Clean up on close
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    },
  });
}

// POST - Save/Create table arrangement (requires authentication)
export async function POST(req: NextRequest) {
  try {
    await ensureConnection();
    
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please login first' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { 
      restaurantId, 
      restaurantName,
      name, 
      floor, 
      tables, 
      layoutType, 
      totalTables,
      dimensions, 
      sections,
      totalCapacity,
      availableTables,
      occupiedTables,
      reservedTables,
      cleaningTables,
      maintenanceTables,
      updatedAt 
    } = body;

    if (!restaurantId || !floor || !tables) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: restaurantId, floor, and tables are required' },
        { status: 400 }
      );
    }

    // Process tables with proper formatting
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
      rotation: table.rotation || 0,
      location: table.location || '',
      description: table.description || '',
      tags: table.tags || [],
      features: table.features || [],
      lastUpdated: table.lastUpdated || new Date(),
      section: table.section || '',
      merged: table.merged || false,
      mergedWith: table.mergedWith || [],
      currentOrder: table.currentOrder || null,
      waiterId: table.waiterId || null,
      reservationInfo: table.reservationInfo || null,
    }));

    // Calculate statistics
    const calculatedTotalCapacity = totalCapacity || processedTables.reduce((sum: number, t: any) => sum + (t.capacity || 0), 0);
    const calculatedAvailableTables = availableTables || processedTables.filter((t: any) => t.status === 'available').length;
    const calculatedOccupiedTables = occupiedTables || processedTables.filter((t: any) => t.status === 'occupied').length;
    const calculatedReservedTables = reservedTables || processedTables.filter((t: any) => t.status === 'reserved').length;
    const calculatedCleaningTables = cleaningTables || processedTables.filter((t: any) => t.status === 'cleaning').length;
    const calculatedMaintenanceTables = maintenanceTables || processedTables.filter((t: any) => t.status === 'maintenance').length;

    // Find existing arrangement for this restaurant and floor
    const existingArrangement = await TableArrangement.findOne({
      restaurantId,
      floor,
      isActive: true
    });

    // If arrangement exists, update it; otherwise create new
    const arrangement = await TableArrangement.findOneAndUpdate(
      { 
        restaurantId, 
        floor, 
        isActive: true 
      },
      {
        restaurantId,
        restaurantName: restaurantName || restaurantId,
        name: name || `${restaurantName || restaurantId} - ${floor} Layout`,
        floor,
        layoutType: layoutType || 'custom',
        totalTables: totalTables || processedTables.length,
        tables: processedTables,
        totalCapacity: calculatedTotalCapacity,
        availableTables: calculatedAvailableTables,
        occupiedTables: calculatedOccupiedTables,
        reservedTables: calculatedReservedTables,
        cleaningTables: calculatedCleaningTables,
        maintenanceTables: calculatedMaintenanceTables,
        dimensions: dimensions || { width: 1200, height: 800 },
        sections: sections || [],
        createdBy: session.user.email,
        updatedAt: updatedAt || new Date(),
        isActive: true
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true 
      }
    );

    // After saving, sync with orders to ensure consistency
    await syncTablesWithPendingOrders(restaurantId, floor);

    return NextResponse.json({ 
      success: true,
      data: arrangement,
      message: existingArrangement 
        ? `Table arrangement for ${restaurantName} - ${floor} updated successfully` 
        : `Table arrangement for ${restaurantName} - ${floor} created successfully`
    });
  } catch (error) {
    console.error('Error saving table arrangement:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save table arrangement' },
      { status: 500 }
    );
  }
}

// PATCH - Update table status based on order or selection
export async function PATCH(req: NextRequest) {
  try {
    await ensureConnection();
    
    const session = await auth();
    
    const body = await req.json();
    const { 
      arrangementId, 
      restaurantId,
      floor,
      tableId, 
      updates,
      status, 
      capacity,
      location,
      description,
      tags,
      features,
      currentOrder, 
      waiterId, 
      reservationInfo,
      updateFromOrder,
      selectTable,
      unselectTable,
      duration = 30
    } = body;

    // Validate required fields
    if (!restaurantId || !floor) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: restaurantId and floor are required' },
        { status: 400 }
      );
    }

    // Find arrangement (don't filter by createdBy for viewing)
    let arrangement;
    if (arrangementId) {
      arrangement = await TableArrangement.findById(arrangementId);
    } else {
      arrangement = await TableArrangement.findOne({
        restaurantId,
        floor,
        isActive: true
      });
    }

    if (!arrangement) {
      return NextResponse.json(
        { success: false, error: 'Arrangement not found for this restaurant and floor' }, 
        { status: 404 }
      );
    }

    const selectionKey = getSelectionKey(restaurantId, floor);
    const existingSelection = activeSelections.get(selectionKey);

    // Handle table unselection (requires authentication)
    if (unselectTable && tableId) {
      if (!session?.user?.email) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized - Please login first' },
          { status: 401 }
        );
      }
      
      if (existingSelection && existingSelection.tableId === tableId && existingSelection.selectedBy === session.user.email) {
        // Clear the selection
        activeSelections.delete(selectionKey);
        
        // Update table status back to available if it was temporarily reserved
        const tableIndex = arrangement.tables.findIndex((t: ITable) => t.id === tableId);
        if (tableIndex !== -1 && arrangement.tables[tableIndex].status === 'reserved') {
          arrangement.tables[tableIndex].status = 'available';
          arrangement.tables[tableIndex].reservationInfo = null;
          arrangement.tables[tableIndex].lastUpdated = new Date();
          
          // Update statistics
          arrangement.availableTables = arrangement.tables.filter((t: ITable) => t.status === 'available').length;
          arrangement.reservedTables = arrangement.tables.filter((t: ITable) => t.status === 'reserved').length;
          await arrangement.save({ validateBeforeSave: false });
        }
        
        return NextResponse.json({ 
          success: true,
          message: 'Table unselected successfully'
        });
      } else {
        return NextResponse.json(
          { success: false, error: 'Cannot unselect: You did not select this table or selection has expired' },
          { status: 400 }
        );
      }
    }

    // Handle table selection (requires authentication)
    if (selectTable && tableId) {
      if (!session?.user?.email) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized - Please login to select a table' },
          { status: 401 }
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
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + duration);

      // Check if table is already selected by someone else
      if (existingSelection && 
          existingSelection.tableId !== tableId && 
          existingSelection.expiresAt > new Date()) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Table ${existingSelection.tableNumber} is already selected by ${existingSelection.selectedByName}`,
            conflict: true,
            currentSelection: {
              ...existingSelection,
              selectedAt: existingSelection.selectedAt.toISOString(),
              expiresAt: existingSelection.expiresAt.toISOString()
            }
          },
          { status: 409 }
        );
      }

      // Check if table is already selected by the same user (allow re-selection)
      if (existingSelection && existingSelection.tableId === tableId && existingSelection.selectedBy === session.user.email) {
        return NextResponse.json(
          { 
            success: true,
            data: {
              selection: {
                ...existingSelection,
                selectedAt: existingSelection.selectedAt.toISOString(),
                expiresAt: existingSelection.expiresAt.toISOString()
              },
              table
            },
            message: `Table ${table.number} is already selected by you`
          }
        );
      }

      // Check if trying to select an occupied table
      if (table.status !== 'available') {
        return NextResponse.json(
          { success: false, error: `Table ${table.number} is currently ${table.status} and cannot be selected` },
          { status: 400 }
        );
      }

      // Store the selection
      const newSelection = {
        tableId: table.id,
        tableNumber: table.number,
        selectedBy: session.user.email,
        selectedByName: session.user.name || session.user.email.split('@')[0],
        selectedAt: new Date(),
        expiresAt,
        orderId: currentOrder
      };
      
      activeSelections.set(selectionKey, newSelection);

      // Optionally update table status to 'reserved' temporarily
      if (updates?.temporaryReserve) {
        arrangement.tables[tableIndex].status = 'reserved';
        arrangement.tables[tableIndex].reservationInfo = {
          reservedBy: session.user.email,
          reservedByName: session.user.name || session.user.email.split('@')[0],
          reservedAt: new Date(),
          expiresAt
        };
        arrangement.tables[tableIndex].lastUpdated = new Date();
        
        // Update statistics
        arrangement.availableTables = arrangement.tables.filter((t: ITable) => t.status === 'available').length;
        arrangement.reservedTables = arrangement.tables.filter((t: ITable) => t.status === 'reserved').length;
        await arrangement.save({ validateBeforeSave: false });
      }

      return NextResponse.json({ 
        success: true,
        data: {
          selection: {
            ...newSelection,
            selectedAt: newSelection.selectedAt.toISOString(),
            expiresAt: newSelection.expiresAt.toISOString()
          },
          table: arrangement.tables[tableIndex]
        },
        message: `Table ${table.number} selected successfully`
      });
    }

    // For other updates (status changes, etc.), require authentication
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please login first' },
        { status: 401 }
      );
    }

    // Handle order completion - free the table
    if (updateFromOrder && currentOrder === 'completed') {
      const tableIndex = arrangement.tables.findIndex((t: ITable) => t.id === tableId);
      if (tableIndex !== -1) {
        // Free the table
        arrangement.tables[tableIndex].status = 'available';
        arrangement.tables[tableIndex].currentOrder = null;
        arrangement.tables[tableIndex].waiterId = null;
        arrangement.tables[tableIndex].reservationInfo = null;
        arrangement.tables[tableIndex].lastUpdated = new Date();
        
        // Clear any active selection
        if (existingSelection && existingSelection.tableId === tableId) {
          activeSelections.delete(selectionKey);
        }
        
        // Update statistics
        arrangement.availableTables = arrangement.tables.filter((t: ITable) => t.status === 'available').length;
        arrangement.occupiedTables = arrangement.tables.filter((t: ITable) => t.status === 'occupied').length;
        await arrangement.save({ validateBeforeSave: false });
        
        return NextResponse.json({ 
          success: true,
          data: arrangement.tables[tableIndex],
          message: `Table ${arrangement.tables[tableIndex].number} is now available`
        });
      }
    }

    // If tableId is provided, update specific table
    if (tableId) {
      const tableIndex = arrangement.tables.findIndex((t: ITable) => t.id === tableId);
      if (tableIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'Table not found' }, 
          { status: 404 }
        );
      }

      // Update table with all possible fields
      if (updates) {
        arrangement.tables[tableIndex] = {
          ...arrangement.tables[tableIndex],
          ...updates,
          lastUpdated: new Date()
        };
      } else {
        // Handle order-based updates
        if (updateFromOrder) {
          // If an order is placed, mark table as occupied
          if (currentOrder) {
            arrangement.tables[tableIndex].status = 'occupied';
            arrangement.tables[tableIndex].currentOrder = currentOrder;
            arrangement.tables[tableIndex].waiterId = waiterId;
            arrangement.tables[tableIndex].lastUpdated = new Date();
            
            // Clear selection when table becomes occupied
            if (existingSelection && existingSelection.tableId === tableId) {
              activeSelections.delete(selectionKey);
            }
          } 
          // If order is completed/cancelled, mark table as available
          else if (status === 'available') {
            arrangement.tables[tableIndex].status = 'available';
            arrangement.tables[tableIndex].currentOrder = null;
            arrangement.tables[tableIndex].waiterId = null;
            arrangement.tables[tableIndex].lastUpdated = new Date();
          }
        }
        
        // Regular status updates
        if (status !== undefined) arrangement.tables[tableIndex].status = status;
        if (capacity !== undefined) arrangement.tables[tableIndex].capacity = capacity;
        if (location !== undefined) arrangement.tables[tableIndex].location = location;
        if (description !== undefined) arrangement.tables[tableIndex].description = description;
        if (tags !== undefined) arrangement.tables[tableIndex].tags = tags;
        if (features !== undefined) arrangement.tables[tableIndex].features = features;
        if (currentOrder !== undefined && !updateFromOrder) arrangement.tables[tableIndex].currentOrder = currentOrder;
        if (waiterId !== undefined && !updateFromOrder) arrangement.tables[tableIndex].waiterId = waiterId;
        if (reservationInfo !== undefined) arrangement.tables[tableIndex].reservationInfo = reservationInfo;
        
        arrangement.tables[tableIndex].lastUpdated = new Date();
      }
    }

    // Recalculate all statistics
    arrangement.totalCapacity = arrangement.tables.reduce((sum: number, t: ITable) => 
      sum + (t.capacity || 0), 0);
    arrangement.availableTables = arrangement.tables.filter(
      (t: ITable) => t.status === 'available'
    ).length;
    arrangement.occupiedTables = arrangement.tables.filter(
      (t: ITable) => t.status === 'occupied'
    ).length;
    arrangement.reservedTables = arrangement.tables.filter(
      (t: ITable) => t.status === 'reserved'
    ).length;
    arrangement.cleaningTables = arrangement.tables.filter(
      (t: ITable) => t.status === 'cleaning'
    ).length;
    arrangement.maintenanceTables = arrangement.tables.filter(
      (t: ITable) => t.status === 'maintenance'
    ).length;

    arrangement.updatedAt = new Date();

    await arrangement.save({ validateBeforeSave: false });

    // After updating, sync with orders to ensure consistency
    await syncTablesWithPendingOrders(restaurantId, floor);

    return NextResponse.json({ 
      success: true,
      data: arrangement,
      message: tableId ? 'Table updated successfully' : 'Arrangement statistics updated successfully'
    });
  } catch (error) {
    console.error('Error updating table:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update table' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific floor arrangement or entire restaurant arrangement (requires authentication)
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
    const arrangementId = searchParams.get('id');
    const restaurantId = searchParams.get('restaurantId');
    const floor = searchParams.get('floor');
    const deleteAllFloors = searchParams.get('deleteAllFloors') === 'true';

    // Delete specific arrangement by ID
    if (arrangementId) {
      const arrangement = await TableArrangement.findById(arrangementId);
      if (!arrangement) {
        return NextResponse.json(
          { success: false, error: 'Arrangement not found' }, 
          { status: 404 }
        );
      }

      arrangement.isActive = false;
      arrangement.updatedAt = new Date();
      await arrangement.save({ validateBeforeSave: false });

      // Clear active selections for this arrangement
      const selectionKey = getSelectionKey(arrangement.restaurantId, arrangement.floor);
      activeSelections.delete(selectionKey);

      return NextResponse.json({ 
        success: true,
        message: `Table arrangement for ${arrangement.restaurantName} - ${arrangement.floor} deleted successfully`
      });
    }

    // Delete specific floor arrangement for a restaurant
    if (restaurantId && floor) {
      const arrangement = await TableArrangement.findOne({
        restaurantId,
        floor,
        isActive: true
      });

      if (!arrangement) {
        return NextResponse.json(
          { success: false, error: 'Arrangement not found for this floor' }, 
          { status: 404 }
        );
      }

      arrangement.isActive = false;
      arrangement.updatedAt = new Date();
      await arrangement.save({ validateBeforeSave: false });

      // Clear active selections for this arrangement
      const selectionKey = getSelectionKey(restaurantId, floor);
      activeSelections.delete(selectionKey);

      return NextResponse.json({ 
        success: true,
        message: `Table arrangement for floor ${floor} deleted successfully`
      });
    }

    // Delete all floors for a restaurant
    if (restaurantId && deleteAllFloors) {
      const result = await TableArrangement.updateMany(
        {
          restaurantId,
          isActive: true
        },
        {
          isActive: false,
          updatedAt: new Date()
        }
      );

      // Clear all active selections for this restaurant
      for (const [key] of activeSelections) {
        if (key.startsWith(restaurantId)) {
          activeSelections.delete(key);
        }
      }

      return NextResponse.json({ 
        success: true,
        message: `${result.modifiedCount} floor arrangements deleted successfully`
      });
    }

    return NextResponse.json(
      { success: false, error: 'Missing required parameters: id, restaurantId+floor, or restaurantId+deleteAllFloors' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error deleting table arrangement:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete table arrangement' },
      { status: 500 }
    );
  }
}

// PUT - Replace entire table arrangement or update bulk tables or sync with orders
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
    const { 
      arrangementId,
      restaurantId,
      floor,
      tables,
      updateTableStatuses,
      syncWithOrders,
      syncAllFloors
    } = body;

    // Handle manual sync with orders
    if (syncWithOrders && restaurantId) {
      if (syncAllFloors) {
        const result = await syncAllFloorsWithPendingOrders(restaurantId);
        return NextResponse.json(result);
      } else if (floor) {
        const result = await syncTablesWithPendingOrders(restaurantId, floor);
        return NextResponse.json(result);
      } else {
        return NextResponse.json(
          { success: false, error: 'Floor is required when syncing a single floor' },
          { status: 400 }
        );
      }
    }

    let arrangement;

    // Find arrangement either by ID or by restaurantId and floor
    if (arrangementId) {
      arrangement = await TableArrangement.findById(arrangementId);
    } else if (restaurantId && floor) {
      arrangement = await TableArrangement.findOne({
        restaurantId,
        floor,
        isActive: true
      });
    }

    if (!arrangement) {
      return NextResponse.json(
        { success: false, error: 'Arrangement not found' }, 
        { status: 404 }
      );
    }

    // Handle bulk table status updates (e.g., from order system)
    if (updateTableStatuses && tables) {
      for (const update of tables) {
        const { tableId, status, currentOrder, waiterId } = update;
        const tableIndex = arrangement.tables.findIndex((t: ITable) => t.id === tableId);
        
        if (tableIndex !== -1) {
          arrangement.tables[tableIndex].status = status;
          if (currentOrder !== undefined) arrangement.tables[tableIndex].currentOrder = currentOrder;
          if (waiterId !== undefined) arrangement.tables[tableIndex].waiterId = waiterId;
          arrangement.tables[tableIndex].lastUpdated = new Date();
          
          // Clear selection if table becomes occupied
          if (status === 'occupied') {
            const selectionKey = getSelectionKey(arrangement.restaurantId, arrangement.floor);
            const selection = activeSelections.get(selectionKey);
            if (selection && selection.tableId === tableId) {
              activeSelections.delete(selectionKey);
            }
          }
        }
      }
    } 
    // Handle full table replacement
    else if (tables) {
      const processedTables = tables.map((table: any) => ({
        ...table,
        lastUpdated: new Date()
      }));

      arrangement.tables = processedTables;
      arrangement.totalTables = processedTables.length;
    }

    // Recalculate all statistics
    arrangement.totalCapacity = arrangement.tables.reduce((sum: number, t: ITable) => 
      sum + (t.capacity || 0), 0);
    arrangement.availableTables = arrangement.tables.filter((t: ITable) => 
      t.status === 'available').length;
    arrangement.occupiedTables = arrangement.tables.filter((t: ITable) => 
      t.status === 'occupied').length;
    arrangement.reservedTables = arrangement.tables.filter((t: ITable) => 
      t.status === 'reserved').length;
    arrangement.cleaningTables = arrangement.tables.filter((t: ITable) => 
      t.status === 'cleaning').length;
    arrangement.maintenanceTables = arrangement.tables.filter((t: ITable) => 
      t.status === 'maintenance').length;
    
    arrangement.updatedAt = new Date();

    await arrangement.save({ validateBeforeSave: false });

    return NextResponse.json({ 
      success: true,
      data: arrangement,
      message: updateTableStatuses ? 'Table statuses updated successfully' : 'Table arrangement replaced successfully'
    });
  } catch (error) {
    console.error('Error updating table arrangement:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update table arrangement' },
      { status: 500 }
    );
  }
}
