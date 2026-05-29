// lib/tableOrderSync.ts
import { TableArrangement, ITable } from '@/models/TableArrangement';
// Import your actual Order model - adjust the import path as needed
import { TableOrder } from '@/models/Orders'; 
import mongoose from 'mongoose';

interface PendingOrder {
  tableNumber: string | number; // Your orders use string for tableNumber
  orderId: string;
  status: string;
  customerName?: string;
  orderNumber?: string;
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
    const arrangement = await TableArrangement.findOne({
      restaurantId,
      floor,
      isActive: true
    });

    if (!arrangement) {
      return { success: false, message: 'No arrangement found' };
    }

    // Get all pending orders (all statuses except 'COMPLETED' and 'CANCELLED')
    // Using your actual status enum values
    const pendingOrders = await TableOrder.find({
      restaurantId: restaurantId,
      floor: floor,
      isActive: true,
      status: { $nin: ['COMPLETED', 'CANCELLED'] }
    }).lean();

    // Create a map of tableNumber → order details
    // Your tableNumber can be string, so we need to handle conversion
    const orderMap = new Map<number, PendingOrder>();
    (pendingOrders as any[]).forEach((order: any) => {
      if (order.tableNumber) {
        // Convert tableNumber to number if it's a string
        const tableNum = typeof order.tableNumber === 'string' 
          ? parseInt(order.tableNumber) 
          : order.tableNumber;
        
        if (!isNaN(tableNum)) {
          orderMap.set(tableNum, {
            tableNumber: tableNum,
            orderId: order._id.toString(),
            status: order.status,
            customerName: order.customerName || order.notes?.split('\n')[0],
            orderNumber: order.orderNumber
          });
        }
      }
    });

    let updatedCount = 0;
    let reservedCount = 0;
    let availableCount = 0;

    // Update each table based on pending orders
    const updatedTables = arrangement.tables.map((table: ITable) => {
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

      // Handle toObject() safely
      const tableObj = table.toObject ? table.toObject() : table;
      
      return {
        ...tableObj,
        status: newStatus,
        ...updates,
        lastUpdated: new Date()
      };
    });

    arrangement.tables = updatedTables;

    // Recalculate statistics
    arrangement.availableTables = arrangement.tables.filter((t: any) => t.status === 'available').length;
    arrangement.reservedTables = arrangement.tables.filter((t: any) => t.status === 'reserved').length;
    arrangement.occupiedTables = arrangement.tables.filter((t: any) => t.status === 'occupied').length;
    arrangement.cleaningTables = arrangement.tables.filter((t: any) => t.status === 'cleaning').length;
    arrangement.maintenanceTables = arrangement.tables.filter((t: any) => t.status === 'maintenance').length;
    arrangement.updatedAt = new Date();

    await arrangement.save({ validateBeforeSave: false });

    return {
      success: true,
      message: `Sync completed: ${reservedCount} tables reserved, ${availableCount} tables made available, ${updatedCount} total changes`,
      data: {
        reservedCount,
        availableCount,
        updatedCount,
        totalPendingOrders: pendingOrders.length,
        arrangement
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
    const arrangements = await TableArrangement.find({
      restaurantId,
      isActive: true
    });

    const results = [];
    for (const arrangement of arrangements) {
      const result = await syncTablesWithPendingOrders(restaurantId, arrangement.floor);
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
