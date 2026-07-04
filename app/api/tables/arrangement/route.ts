// app/api/tables/arrangement/route.ts

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
  guestInfo?: { name: string; phone?: string; email?: string };
}>();

const guestSessions = new Map<string, {
  guestId: string;
  name: string;
  phone?: string;
  email?: string;
  createdAt: Date;
  expiresAt: Date;
}>();

setInterval(() => {
  const now = new Date();
  for (const [key, s] of activeSelections.entries()) if (s.expiresAt < now) activeSelections.delete(key);
  for (const [key, s] of guestSessions.entries()) if (s.expiresAt < now) guestSessions.delete(key);
}, 30000);

async function ensureConnection() {
  try {
    if (mongoose.connection.readyState === 1) return mongoose.connection;
    await clientPromise;
    if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI!);
    return mongoose.connection;
  } catch (error) {
    console.error('DB connection error:', error);
    throw error;
  }
}

function getSelectionKey(restaurantId: string, floor: string) {
  return `${restaurantId}:${floor}`;
}

function generateGuestId() {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getOrCreateGuestSession(guestInfo?: { name?: string; phone?: string; email?: string }) {
  const guestId = generateGuestId();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  const session = {
    guestId,
    name: guestInfo?.name || `Guest_${Math.floor(Math.random() * 10000)}`,
    phone: guestInfo?.phone,
    email: guestInfo?.email,
    createdAt: new Date(),
    expiresAt,
  };
  guestSessions.set(guestId, session);
  return session;
}

function validateGuestSession(guestId?: string): { valid: boolean; session?: any } {
  if (!guestId) return { valid: false };
  const session = guestSessions.get(guestId);
  if (!session) return { valid: false };
  if (session.expiresAt < new Date()) { guestSessions.delete(guestId); return { valid: false }; }
  return { valid: true, session };
}

// ─── GET ────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    await ensureConnection();
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    const floor = searchParams.get('floor');
    const fetchAll = searchParams.get('fetchAll') === 'true';
    const includeSelections = searchParams.get('includeSelections') === 'true';
    const skipSync = searchParams.get('skipSync') === 'true';

    if (fetchAll) {
      const arrangements = await TableArrangement.find({ isActive: true })
        .select('_id restaurantId restaurantName floor name layoutType totalTables availableTables occupiedTables totalCapacity updatedAt')
        .sort({ restaurantName: 1, floor: 1 })
        .lean();
      return NextResponse.json({ success: true, data: arrangements });
    }

    if (!restaurantId || !floor) {
      return NextResponse.json({ success: false, error: 'restaurantId and floor are required' }, { status: 400 });
    }

    let arrangement = await TableArrangement.findOne({ restaurantId, floor, isActive: true }).sort({ updatedAt: -1 });

    if (arrangement && !skipSync) {
      try {
        const syncResult = await syncTablesWithPendingOrders(restaurantId, floor);
        if (syncResult.success && syncResult.data?.arrangement) arrangement = syncResult.data.arrangement;
      } catch (syncError) {
        console.error('Sync error (non-critical):', syncError);
      }
    }

    if (!arrangement) {
      return NextResponse.json({ success: true, data: null, message: 'No arrangement found' });
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
          isGuest: activeSelection.isGuest,
        };
      } else if (activeSelection) {
        activeSelections.delete(selectionKey);
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching table arrangement:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch table arrangement' }, { status: 500 });
  }
}

// ─── PATCH ───────────────────────────────────────────────────────────────────
// Uses findOneAndUpdate with $set to avoid Mongoose VersionError on concurrent saves
export async function PATCH(req: NextRequest) {
  try {
    await ensureConnection();

    const body = await req.json();
    const {
      restaurantId, floor, tableId,
      selectTable, unselectTable, switchTable,
      duration = 3, guestInfo, guestId,
      anonymousId: bodyAnonymousId,
    } = body;

    if (!restaurantId || !floor) {
      return NextResponse.json({ success: false, error: 'Missing required fields: restaurantId and floor are required' }, { status: 400 });
    }

    const selectionKey = getSelectionKey(restaurantId, floor);
    let existingSelection = activeSelections.get(selectionKey);
    if (existingSelection && existingSelection.expiresAt < new Date()) {
      activeSelections.delete(selectionKey);
      existingSelection = undefined;
    }

    let session: any = null;
    try { session = await auth(); } catch { session = null; }

    const anonymousId = req.headers.get('X-Anonymous-Id') || bodyAnonymousId || guestId;
    const userEmail = session?.user?.email;

    let selectedBy = '';
    let selectedByName = '';
    let isGuest = false;
    let guestSessionData: any = null;

    if (userEmail) {
      selectedBy = userEmail;
      selectedByName = session?.user?.name || userEmail.split('@')[0];
    } else if (anonymousId) {
      const existingGuestSession = guestSessions.get(anonymousId);
      if (!existingGuestSession) {
        guestSessionData = getOrCreateGuestSession({ name: guestInfo?.name, phone: guestInfo?.phone, email: guestInfo?.email });
        selectedBy = guestSessionData.guestId;
        selectedByName = guestSessionData.name;
      } else {
        selectedBy = existingGuestSession.guestId;
        selectedByName = existingGuestSession.name;
        guestSessionData = existingGuestSession;
      }
      isGuest = true;
    } else {
      return NextResponse.json({ success: false, error: 'Please login or provide guest information' }, { status: 401 });
    }

    const baseQuery = { restaurantId, floor, isActive: true };

    // ── UNSELECT ──────────────────────────────────────────────────────────────
    if (unselectTable && tableId) {
      if (!existingSelection) {
        return NextResponse.json({ success: true, message: 'No active selection to clear' });
      }

      let isAuthorized =
        (userEmail && existingSelection.selectedBy === userEmail) ||
        (anonymousId && existingSelection.selectedBy === anonymousId) ||
        (existingSelection.isGuest && anonymousId && validateGuestSession(anonymousId).valid && existingSelection.selectedBy === anonymousId);

      if (!isAuthorized) {
        return NextResponse.json({ success: false, error: 'Unauthorized - You did not select this table' }, { status: 401 });
      }

      activeSelections.delete(selectionKey);

      // Use findOne + atomic $set to avoid version conflicts
      const arr = await TableArrangement.findOne(baseQuery).lean() as any;
      if (arr) {
        const idx = arr.tables.findIndex((t: any) => t.id === tableId);
        if (idx !== -1 && arr.tables[idx].status === 'reserved') {
          const updatePath: any = {};
          updatePath[`tables.${idx}.status`] = 'available';
          updatePath[`tables.${idx}.reservationInfo`] = null;
          updatePath[`tables.${idx}.lastUpdated`] = new Date();
          updatePath['updatedAt'] = new Date();

          const allTables = arr.tables.map((t: any, i: number) =>
            i === idx ? { ...t, status: 'available', reservationInfo: null } : t
          );
          updatePath['availableTables'] = allTables.filter((t: any) => t.status === 'available').length;
          updatePath['reservedTables'] = allTables.filter((t: any) => t.status === 'reserved').length;

          await TableArrangement.findOneAndUpdate(baseQuery, { $set: updatePath }, { new: true });
        }
      }

      return NextResponse.json({ success: true, message: 'Table unselected successfully' });
    }

    // ── SWITCH TABLE ──────────────────────────────────────────────────────────
    if (switchTable && tableId) {
      const arr = await TableArrangement.findOne(baseQuery).lean() as any;
      if (!arr) return NextResponse.json({ success: false, error: 'Arrangement not found' }, { status: 404 });

      const newIdx = arr.tables.findIndex((t: any) => t.id === tableId);
      if (newIdx === -1) return NextResponse.json({ success: false, error: 'Table not found' }, { status: 404 });

      const newTable = arr.tables[newIdx];
      if (newTable.status !== 'available') {
        return NextResponse.json({ success: false, error: `Table ${newTable.number} is currently ${newTable.status}` }, { status: 400 });
      }

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + duration);

      const updatePath: any = {};
      let previousTableId = null;
      let previousTableNumber = null;

      // Clear old table if exists
      if (existingSelection) {
        const oldIdx = arr.tables.findIndex((t: any) => t.id === existingSelection!.tableId);
        if (oldIdx !== -1) {
          previousTableId = arr.tables[oldIdx].id;
          previousTableNumber = arr.tables[oldIdx].number;
          updatePath[`tables.${oldIdx}.status`] = 'available';
          updatePath[`tables.${oldIdx}.reservationInfo`] = null;
          updatePath[`tables.${oldIdx}.lastUpdated`] = new Date();
        }
        activeSelections.delete(selectionKey);
      }

      // Set new table
      updatePath[`tables.${newIdx}.status`] = 'reserved';
      updatePath[`tables.${newIdx}.reservationInfo`] = { reservedBy: selectedBy, reservedByName: selectedByName, reservedAt: new Date(), expiresAt };
      updatePath[`tables.${newIdx}.lastUpdated`] = new Date();
      updatePath['updatedAt'] = new Date();

      // Recalculate counts from current data
      const simulatedTables = arr.tables.map((t: any, i: number) => {
        if (existingSelection && t.id === existingSelection.tableId) return { ...t, status: 'available' };
        if (i === newIdx) return { ...t, status: 'reserved' };
        return t;
      });
      updatePath['availableTables'] = simulatedTables.filter((t: any) => t.status === 'available').length;
      updatePath['reservedTables'] = simulatedTables.filter((t: any) => t.status === 'reserved').length;

      const updated = await TableArrangement.findOneAndUpdate(baseQuery, { $set: updatePath }, { new: true });
      if (!updated) return NextResponse.json({ success: false, error: 'Failed to update arrangement' }, { status: 500 });

      const newSelection = {
        tableId: newTable.id, tableNumber: newTable.number,
        selectedBy, selectedByName, selectedAt: new Date(), expiresAt, isGuest,
        guestInfo: isGuest ? { name: selectedByName, phone: guestInfo?.phone, email: guestInfo?.email } : undefined,
      };
      activeSelections.set(selectionKey, newSelection);

      const responseData: any = {
        success: true,
        data: {
          selection: { ...newSelection, selectedAt: newSelection.selectedAt.toISOString(), expiresAt: newSelection.expiresAt.toISOString() },
          table: updated.tables[newIdx],
          previousTableId,
          previousTableNumber,
        },
        message: `Switched to Table ${newTable.number} successfully!`,
      };
      if (isGuest && guestSessionData) {
        responseData.guestId = guestSessionData.guestId;
        responseData.guestName = guestSessionData.name;
        responseData.isGuest = true;
      }
      return NextResponse.json(responseData);
    }

    // ── SELECT TABLE ──────────────────────────────────────────────────────────
    if (selectTable && tableId) {
      const arr = await TableArrangement.findOne(baseQuery).lean() as any;
      if (!arr) return NextResponse.json({ success: false, error: 'Arrangement not found' }, { status: 404 });

      const idx = arr.tables.findIndex((t: any) => t.id === tableId);
      if (idx === -1) return NextResponse.json({ success: false, error: 'Table not found' }, { status: 404 });

      const table = arr.tables[idx];

      if (table.status !== 'available') {
        return NextResponse.json({ success: false, error: `Table ${table.number} is currently ${table.status}` }, { status: 400 });
      }

      if (existingSelection && existingSelection.tableId !== tableId) {
        return NextResponse.json({
          success: false,
          error: `You already have Table ${existingSelection.tableNumber} selected. Please unselect it first.`,
          currentSelection: {
            tableId: existingSelection.tableId,
            tableNumber: existingSelection.tableNumber,
            tableName: `Table ${existingSelection.tableNumber}`,
            expiresAt: existingSelection.expiresAt.toISOString(),
          },
        }, { status: 409 });
      }

      if (existingSelection && existingSelection.tableId === tableId && existingSelection.selectedBy !== selectedBy) {
        return NextResponse.json({ success: false, error: `Table ${table.number} is being selected by another customer`, conflict: true }, { status: 409 });
      }

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + duration);

      // Refresh timer if same user re-selects
      if (existingSelection && existingSelection.tableId === tableId && existingSelection.selectedBy === selectedBy) {
        existingSelection.expiresAt = expiresAt;
        existingSelection.selectedAt = new Date();
        activeSelections.set(selectionKey, existingSelection);

        await TableArrangement.findOneAndUpdate(baseQuery, {
          $set: {
            [`tables.${idx}.reservationInfo.expiresAt`]: expiresAt,
            [`tables.${idx}.reservationInfo.reservedAt`]: new Date(),
            updatedAt: new Date(),
          },
        }, { new: true });

        return NextResponse.json({
          success: true,
          data: {
            selection: { ...existingSelection, selectedAt: existingSelection.selectedAt.toISOString(), expiresAt: existingSelection.expiresAt.toISOString() },
            table: arr.tables[idx],
          },
          message: `Table ${table.number} selection renewed`,
        });
      }

      // New selection
      const updatePath: any = {
        [`tables.${idx}.status`]: 'reserved',
        [`tables.${idx}.reservationInfo`]: { reservedBy: selectedBy, reservedByName: selectedByName, reservedAt: new Date(), expiresAt },
        [`tables.${idx}.lastUpdated`]: new Date(),
        updatedAt: new Date(),
      };

      const simulatedTables = arr.tables.map((t: any, i: number) => i === idx ? { ...t, status: 'reserved' } : t);
      updatePath['availableTables'] = simulatedTables.filter((t: any) => t.status === 'available').length;
      updatePath['reservedTables'] = simulatedTables.filter((t: any) => t.status === 'reserved').length;

      const updated = await TableArrangement.findOneAndUpdate(baseQuery, { $set: updatePath }, { new: true });
      if (!updated) return NextResponse.json({ success: false, error: 'Failed to update arrangement' }, { status: 500 });

      const newSelection = {
        tableId: table.id, tableNumber: table.number,
        selectedBy, selectedByName, selectedAt: new Date(), expiresAt, isGuest,
        guestInfo: isGuest ? { name: selectedByName, phone: guestInfo?.phone, email: guestInfo?.email } : undefined,
      };
      activeSelections.set(selectionKey, newSelection);

      const responseData: any = {
        success: true,
        data: {
          selection: { ...newSelection, selectedAt: newSelection.selectedAt.toISOString(), expiresAt: newSelection.expiresAt.toISOString() },
          table: updated.tables[idx],
        },
        message: `Table ${table.number} selected successfully!`,
      };
      if (isGuest && guestSessionData) {
        responseData.guestId = guestSessionData.guestId;
        responseData.guestName = guestSessionData.name;
        responseData.isGuest = true;
      }
      return NextResponse.json(responseData);
    }

    return NextResponse.json({ success: false, error: 'Invalid operation. Must specify selectTable, unselectTable, or switchTable' }, { status: 400 });
  } catch (error) {
    console.error('Error updating table:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update table: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    await ensureConnection();
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { restaurantId, restaurantName, floor, tables, dimensions } = body;

    if (!restaurantId || !floor || !tables) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
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
        isActive: true,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: arrangement });
  } catch (error) {
    console.error('Error saving table arrangement:', error);
    return NextResponse.json({ success: false, error: 'Failed to save table arrangement' }, { status: 500 });
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    await ensureConnection();
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    const floor = searchParams.get('floor');

    if (!restaurantId || !floor) {
      return NextResponse.json({ success: false, error: 'restaurantId and floor are required' }, { status: 400 });
    }

    const updated = await TableArrangement.findOneAndUpdate(
      { restaurantId, floor, isActive: true },
      { $set: { isActive: false, updatedAt: new Date() } },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Arrangement not found' }, { status: 404 });
    }

    activeSelections.delete(getSelectionKey(restaurantId, floor));
    return NextResponse.json({ success: true, message: 'Arrangement deleted successfully' });
  } catch (error) {
    console.error('Error deleting arrangement:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete arrangement' }, { status: 500 });
  }
}

// ─── PUT ─────────────────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    await ensureConnection();
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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

    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error syncing:', error);
    return NextResponse.json({ success: false, error: 'Failed to sync' }, { status: 500 });
  }
}

// ─── OPTIONS ─────────────────────────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Anonymous-Id',
    },
  });
}
