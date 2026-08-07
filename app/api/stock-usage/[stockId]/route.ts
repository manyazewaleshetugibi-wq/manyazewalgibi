import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// Type for stock processing status
interface StockProcessingStatus {
  isProcessed: boolean;
  processedAt?: Date;
  status: 'processing' | 'completed' | 'partial' | 'failed';
  note?: string;
  error?: string;
}

// Type for order details related to stock
interface OrderDetails {
  orderId: string;
  orderNumber: string;
  quantityUsed: number;
  totalCost: number;
  status: string;
  usedAt: Date;
  stockProcessed?: boolean;
  stockProcessedAt?: Date;
  hasPartialStock?: boolean;
  stockProcessingError?: string;
  stockProcessingNote?: string;
  isFullyProcessed?: boolean;
  processingStatus?: StockProcessingStatus;
}

// Type for menu item details
interface MenuItemDetail {
  itemId: string;
  itemName: string;
  totalQuantity: number;
  frequency: number;
  status: 'used' | 'pending' | 'error';
  stockConsumption: Array<{
    stockId: string;
    stockName: string;
    stockCategory: string;
    stockUnit: string;
    quantityUsed: number;
    totalCost: number;
    percentageOfItem: number;
  }>;
}

// GET - Get detailed usage for a specific stock ID
// Includes stock processing status and order details
export async function GET(req: NextRequest, { params }: { params: Promise<{ stockId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { stockId } = await params;

    // Get all used_stock records for this specific stock
    const usedStockRecords = await prisma.usedStock.findMany({
      where: { stockId },
      orderBy: { usedAt: 'desc' },
    });

    if (usedStockRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: "Stock not found or has no usage records" },
        { status: 404 }
      );
    }

    // Get unique order IDs
    const uniqueOrderIds = [...new Set(usedStockRecords.map(record => record.orderId).filter((id): id is string => !!id))];

    // Get order details from orders collection
    const orders = await prisma.order.findMany({
      where: { id: { in: uniqueOrderIds } },
    });

    // Build orderId to order mapping
    const orderMap = new Map<string, any>();
    orders.forEach(order => {
      orderMap.set(order.id, order);
    });

    // Get stock details
    const stock = await prisma.stock.findUnique({ where: { id: stockId } });

    if (!stock) {
      return NextResponse.json(
        { success: false, error: "Stock not found" },
        { status: 404 }
      );
    }

    // Build order details with processing status
    const orderDetailsList: OrderDetails[] = [];
    const menuItemsMap: Map<string, MenuItemDetail> = new Map();

    for (const record of usedStockRecords) {
      const orderId = record.orderId || "";
      const order = orderMap.get(orderId);
      const orderNumber = record.orderNumber || "Unknown";

      // Determine processing status
      let processingStatus: StockProcessingStatus = {
        isProcessed: false,
        status: 'processing'
      };

      if (order?.stockProcessed) {
        if ((order as any).hasPartialStock) {
          processingStatus = {
            isProcessed: true,
            processedAt: order.stockProcessedAt ? new Date(order.stockProcessedAt) : undefined,
            status: 'partial',
            note: order.stockProcessingNote || "Partially processed"
          };
        } else {
          processingStatus = {
            isProcessed: true,
            processedAt: order.stockProcessedAt ? new Date(order.stockProcessedAt) : undefined,
            status: 'completed',
            note: order.stockProcessingNote || "Fully processed"
          };
        }
      } else if ((order as any)?.stockProcessingError) {
        processingStatus = {
          isProcessed: false,
          status: 'failed',
          error: (order as any).stockProcessingError,
          note: order.stockProcessingNote || "Processing failed"
        };
      }

      const orderDetail: OrderDetails = {
        orderId,
        orderNumber,
        quantityUsed: record.totalQuantityUsed || 0,
        totalCost: record.totalCost || 0,
        status: order?.status || "Unknown",
        usedAt: record.usedAt || new Date(),
        stockProcessed: order?.stockProcessed,
        stockProcessedAt: order?.stockProcessedAt ? new Date(order.stockProcessedAt) : undefined,
        hasPartialStock: (order as any)?.hasPartialStock,
        stockProcessingError: (order as any)?.stockProcessingError,
        stockProcessingNote: order?.stockProcessingNote,
        isFullyProcessed: processingStatus.status === 'completed',
        processingStatus
      };

      orderDetailsList.push(orderDetail);

      // Get items that used this stock for each order
      if ((record.items as any) && (record.items as any).length > 0) {
        for (const item of (record.items as any)) {
          const itemId = item.itemId?.toString() || "unknown";
          const itemName = item.itemName || "Unknown Item";

          if (!menuItemsMap.has(itemId)) {
            const menuItemDetail: MenuItemDetail = {
              itemId,
              itemName,
              totalQuantity: 0,
              frequency: 0,
              status: 'used',
              stockConsumption: []
            };
            menuItemsMap.set(itemId, menuItemDetail);
          }

          const menuItemDetail = menuItemsMap.get(itemId);
          if (menuItemDetail) {
            menuItemDetail.totalQuantity += item.quantityUsed || 0;
            menuItemDetail.frequency += 1;

            // Add stock consumption details
            menuItemDetail.stockConsumption.push({
              stockId: record.stockId || "",
              stockName: record.stockName || "",
              stockCategory: record.stockCategory || (stock as any).category || "General",
              stockUnit: record.stockUnit || stock.unit || "unit",
              quantityUsed: item.quantityUsed || 0,
              totalCost: (item.quantityUsed || 0) * (record.unitCost || 0),
              percentageOfItem: 0 // Will be calculated after
            });
          }
        }
      }
    }

    // Calculate percentage of item consumption
    menuItemsMap.forEach(menuItem => {
      const totalQuantity = menuItemsMap.size > 0 
        ? menuItemsMap.values().next().value?.totalQuantity ?? 1
        : 1;

      menuItem.stockConsumption.forEach(consumption => {
        menuItem.totalQuantity = consumption.quantityUsed; // Simplified: use last item's quantity as total
        consumption.percentageOfItem = totalQuantity > 0
          ? (consumption.quantityUsed / totalQuantity) * 100
          : 0;
      });
    });

    // Calculate summary statistics
    const totalQuantityUsed = usedStockRecords.reduce((sum, record) => sum + (record.totalQuantityUsed || 0), 0);
    const totalCost = usedStockRecords.reduce((sum, record) => sum + (record.totalCost || 0), 0);
    const uniqueOrders = orderDetailsList.length;
    const processedOrders = orderDetailsList.filter(order => order.isFullyProcessed).length;
    const pendingOrders = orderDetailsList.filter(order => order.hasPartialStock).length;
    const failedOrders = orderDetailsList.filter(order => order.processingStatus?.status === 'failed').length;

    // Get current stock status
    const currentStock = stock.currentStock || 0;
    const minimumStock = stock.minimumStock || 0;
    let currentStatus = 'normal';
    if (currentStock <= 0) currentStatus = 'critical';
    else if (currentStock <= minimumStock) currentStatus = 'low';

    // Prepare response
    const responseData = {
      success: true,
      data: {
        stockId: stockId,
        stockName: stock.name,
        stockCategory: (stock as any).category || "General",
        stockUnit: stock.unit || "unit",
        unitCost: (stock as any).costPerUnit || (stock as any).unitCost || 0,
        currentStock: currentStock,
        minimumStock: minimumStock,
        currentStatus: currentStatus,
        totalQuantityUsed,
        totalCost,
        uniqueOrders,
        processedOrders,
        pendingOrders,
        failedOrders,
        hasStockUsage: true,
        orderDetails: orderDetailsList,
        menuItems: Array.from(menuItemsMap.values())
      }
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Error fetching stock usage details:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stock usage details" },
      { status: 500 }
    );
  }
}

