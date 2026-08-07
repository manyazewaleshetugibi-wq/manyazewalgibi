// lib/tableOrderSync.ts
import { prisma } from '@/lib/prisma';

interface PendingOrder {
  tableNumber: string | number; // Your orders use string for tableNumber
  orderId: string;
  status: string;
  customerName?: string;
  orderNumber?: string;
}

interface TableData {
  id: string;
  number: number;
  capacity?: number;
  shape?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  status: string;
  rotation?: number;
  location?: string;
  description?: string;
  tags?: string[];
  features?: string[];
  lastUpdated?: Date | string;
  section?: string;
  merged?: boolean;
  mergedWith?: string[];
  currentOrder?: string;
  waiterId?: string;
  reservationInfo?: any;
}

/**
 * Sync table statuses with pending orders
 * Tables with pending orders → reserved
 * Tables without pending orders → available (only if currently reserved)
 * Preserves occupied, cleaning, maintenance statuses
 */
export async function syncTablesWithPendingOrders(
  restaurantId: string,
  floor: string
) {
  try {
    // Find the table arrangement
    const arrangement = await prisma.tableArrangement.findFirst({
      where: {
        restaurantId,
        floor,
        isActive: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    if (!arrangement) {
      return { success: false, message: 'No arrangement found' };
    }

    // Get all pending orders (all statuses except 'COMPLETED' and 'CANCELLED')
    const pendingOrders = await prisma.order.findMany({
      where: {
        restaurantId: restaurantId,
        floor: { equals: floor },
        isActive: true,
        status: { notIn: ['COMPLETED', 'CANCELLED'] }
      }
    });

    // Create a map of tableNumber → order details
    // Your tableNumber can be string, so we need to handle conversion
    const orderMap = new Map<number, PendingOrder>();
    pendingOrders.forEach((order) => {
      if (order.tableNumber) {
        // Convert tableNumber to number if it's a string
        const tableNum = typeof order.tableNumber === 'string'
          ? parseInt(order.tableNumber)
          : order.tableNumber;

        if (!isNaN(tableNum)) {
          orderMap.set(tableNum, {
            tableNumber: tableNum,
            orderId: order.id,
            status: order.status || '',
            customerName: order.customerName || order.notes?.split('\n')[0],
            orderNumber: order.orderNumber || undefined
          });
        }
      }
    });

    let updatedCount = 0;
    let reservedCount = 0;
    let availableCount = 0;

    const tables = (arrangement.tables as unknown as TableData[]) || [];

    // Update each table based on pending orders
    const updatedTables = tables.map((table: TableData) => {
      const hasPendingOrder = orderMap.has(table.number);
      const currentStatus = table.status;

      let newStatus = currentStatus;
      const updates: any = {};

      // Only auto-update tables that are 'available' or 'reserved'
      // Preserve 'occupied', 'cleaning', 'maintenance' statuses
      if (currentStatus === 'available' || currentStatus === 'reserved') {
        if (hasPendingOrder) {
          const order = orderMap.get(table.number)!;
          newStatus = 'reserved';
          reservedCount++;

          // Update reservation info with order details
          updates.reservationInfo = {
            reservedBy: 'system',
            reservedByName: 'Order System',
            reservedAt: new Date(),
            orderId: order.orderId,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            orderStatus: order.status
          };

          if (newStatus !== currentStatus) updatedCount++;
        } else {
          // No pending order, set to available if it was reserved
          if (currentStatus === 'reserved') {
            newStatus = 'available';
            availableCount++;
            updatedCount++;
            updates.reservationInfo = null;
          }
        }
      }

      return {
        ...table,
        status: newStatus,
        ...updates,
        lastUpdated: new Date()
      };
    });

    const updated = await prisma.tableArrangement.update({
      where: { id: arrangement.id },
      data: {
        tables: updatedTables,
        availableTables: updatedTables.filter((t) => t.status === 'available').length,
        reservedTables: updatedTables.filter((t) => t.status === 'reserved').length,
        occupiedTables: updatedTables.filter((t) => t.status === 'occupied').length,
        cleaningTables: updatedTables.filter((t) => t.status === 'cleaning').length,
        maintenanceTables: updatedTables.filter((t) => t.status === 'maintenance').length,
        updatedAt: new Date()
      }
    });

    return {
      success: true,
      message: `Sync completed: ${reservedCount} tables reserved, ${availableCount} tables made available, ${updatedCount} total changes`,
      data: {
        reservedCount,
        availableCount,
        updatedCount,
        totalPendingOrders: pendingOrders.length,
        arrangement: updated
      }
    };
  } catch (error) {
    console.error('Error syncing tables with orders:', error);
    return { success: false, message: 'Failed to sync tables', error };
  }
}

/**
 * Sync all floors for a restaurant
 */
export async function syncAllFloorsWithPendingOrders(restaurantId: string) {
  try {
    const arrangements = await prisma.tableArrangement.findMany({
      where: {
        restaurantId,
        isActive: true
      }
    });

    const results = [];
    for (const arrangement of arrangements) {
      const result = await syncTablesWithPendingOrders(restaurantId, arrangement.floor || '');
      results.push({ floor: arrangement.floor, ...result });
    }

    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Error syncing all floors:', error);
    return { success: false, message: 'Failed to sync all floors', error };
  }
}
