import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { 
  debugLog, 
  debugError, 
  normalizeStatus, 
  getCurrentUserData, 
  isOrderCompleted 
} from "../utils/orderHelpers";
import { registerOrderActivity, registerWaitressActivity } from "../utils/activityHelpers";

// Cloudinary upload helper function (inline to avoid import issues)
async function uploadToCloudinary(file: File): Promise<string> {
  const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnqsoezfo';
  const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'photoupload';
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Cloudinary upload failed: ${error.error?.message || 'Unknown error'}`);
  }
  
  const data = await response.json();
  return data.secure_url;
}

// Normalize null/undefined for Prisma JSON fields (SQL NULL via Prisma.DbNull)
function normalizeJson(value: any): any {
  if (value === null || value === undefined) return Prisma.DbNull;
  return value;
}

// Type guard for activity result success
function isSuccessResult(result: any): result is { 
  success: true; 
  pointsAwarded: number; 
  completedOrdersIncremented: boolean;
  totalOrdersIncremented: boolean;
  employeeId: any;
  isNew: boolean;
  message: string;
} {
  return result?.success === true && typeof result?.pointsAwarded === 'number';
}

// Helper function to check if a user role is admin (case-insensitive)
const isAdminRole = (role: string | undefined): boolean => {
  if (!role) return false;
  const normalized = role.toUpperCase();
  return ['ADMIN', 'SUPER_ADMIN'].includes(normalized);
}

// GET endpoint - Fetch orders with role-based time filtering
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("id");
    const status = url.searchParams.get("status");
    const restaurantId = url.searchParams.get("restaurantId");
    const after = url.searchParams.get("after");
    const action = url.searchParams.get("action");
    const allParam = url.searchParams.get("all");
    const viewDeleted = url.searchParams.get("deleted") === "true";

    // Get current user to determine role
    const userData = await getCurrentUserData(req);
    const isAdmin = isAdminRole(userData?.role);

    debugLog("GET request received (fast mode):", {
      orderId,
      status,
      action,
      allParam,
      viewDeleted,
      pathname: url.pathname
    });

    // View deleted orders (admin only)
    if (viewDeleted && isAdmin) {
      const deletedOrders = (await prisma.deletedOrder.findMany())
        .sort((a, b) => {
          const ta = a.deletedAt ? new Date(a.deletedAt as any).getTime() : 0;
          const tb = b.deletedAt ? new Date(b.deletedAt as any).getTime() : 0;
          return tb - ta;
        })
        .slice(0, 100)
        .map(o => ({ ...o, _id: o.id }));
      
      return NextResponse.json({
        success: true,
        orders: deletedOrders,
        count: deletedOrders.length,
        message: "Retrieved deleted orders archive",
        isArchive: true
      }, { status: 200 });
    }

    // Handle employee rankings request
    if (action === "employeeRank") {
      const limit = parseInt(url.searchParams.get("limit") || "10");
      const sortBy = url.searchParams.get("sortBy") || "points";
      const role = url.searchParams.get("role");

      const where: any = {};
      if (role) {
        where.role = { equals: role, mode: 'insensitive' };
      }

      const allRanked = await prisma.employeeRank.findMany({ where });

      const rankings = allRanked
        .slice()
        .sort((a: any, b: any) => (Number(b[sortBy]) || 0) - (Number(a[sortBy]) || 0))
        .slice(0, limit)
        .map(r => ({ ...r, _id: r.id }));

      const stats = allRanked.reduce((acc: any, e) => {
        acc.totalEmployees += 1;
        acc.totalCompletedOrders += e.completedOrders || 0;
        acc.totalOrders += e.totalOrders || 0;
        acc.totalPoints += e.points || 0;
        acc.averageCompletedOrders += e.completedOrders || 0;
        acc.averagePoints += e.points || 0;
        return acc;
      }, {
        totalEmployees: 0,
        totalCompletedOrders: 0,
        totalOrders: 0,
        totalPoints: 0,
        averageCompletedOrders: 0,
        averagePoints: 0
      });

      if (stats.totalEmployees > 0) {
        stats.averageCompletedOrders = stats.averageCompletedOrders / stats.totalEmployees;
        stats.averagePoints = stats.averagePoints / stats.totalEmployees;
      }

      return NextResponse.json({
        success: true,
        rankings,
        stats: allRanked.length > 0 ? stats : {},
        count: rankings.length,
        timestamp: new Date()
      }, { status: 200 });
    }

    // Determine time filter based on role and parameters
    let timeFilterHours: number | null = null;
    let cutoffTime: Date | null = null;
    let filterMessage: string = "";
    
    if (isAdmin && allParam === "true") {
      timeFilterHours = 24;
      cutoffTime = new Date(Date.now() - timeFilterHours * 60 * 60 * 1000);
      filterMessage = `Admin view: Showing orders from last 24 hours (since ${cutoffTime.toISOString()}) plus all confirmed delivery orders`;
      debugLog(`Admin mode: Showing orders from last ${timeFilterHours} hours`);
    } else {
      timeFilterHours = null;
      filterMessage = "Regular view: Showing non-completed orders + completed orders from last 2 hours";
      debugLog(`Regular mode: Using standard filtering`);
    }

    // Build query based on parameters
    const and: any[] = [];
    
    if (orderId) {
      and.push({ id: orderId });
    }
    
    if (status) {
      and.push({ status: { equals: status, mode: 'insensitive' } });
    }

    if (restaurantId) {
      if (restaurantId === "manyazewal1") {
        and.push({ OR: [{ restaurantId: "manyazewal1" }, { delivery: true }] });
      } else {
        and.push({ restaurantId });
      }
    }

    // Apply different filtering based on user role
    if (isAdmin && allParam === "true") {
      // Orders within the 24h window, OR any confirmed delivery order (any age)
      // so confirmed delivery orders always pass through to the orders page
      and.push({
        OR: [
          { createdAt: { gte: cutoffTime } },
          { 
            delivery: true, 
            status: { equals: 'confirmed', mode: 'insensitive' } 
          }
        ]
      });
      
      const deliveryRestriction = {
        OR: [
          { delivery: { not: true } },
          { delivery: null },
          { 
            delivery: true, 
            status: { equals: 'confirmed', mode: 'insensitive' } 
          }
        ]
      };
      
      and.push(deliveryRestriction);
    } else {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      const completedFilter = {
        OR: [
          { status: null },
          { NOT: { status: { contains: 'completed', mode: 'insensitive' } } },
          { 
            status: { contains: 'completed', mode: 'insensitive' },
            updatedAt: { gte: twoHoursAgo }
          }
        ]
      };

      and.push(completedFilter);

      const deliveryRestriction = {
        OR: [
          { delivery: { not: true } },
          { delivery: null },
          { 
            delivery: true, 
            status: { equals: 'confirmed', mode: 'insensitive' } 
          }
        ]
      };

      and.push(deliveryRestriction);
    }

    if (after) {
      const afterDate = new Date(after);
      if (!isNaN(afterDate.getTime())) {
        and.push({ createdAt: { gt: afterDate } });
      }
    }

    const query = and.length > 0 ? { AND: and } : {};

    // Fetch orders
    const orders = await prisma.order.findMany({
      where: query,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const twoHoursAgoForStock = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const pendingStockOrders = await prisma.order.findMany({
      where: {
        status: { contains: 'completed', mode: 'insensitive' },
        OR: [
          { stockProcessed: { not: true } },
          { stockProcessed: null }
        ],
        updatedAt: { gte: twoHoursAgoForStock }
      },
      select: { id: true, items: true }
    });
    const pendingStockCount = pendingStockOrders.filter(o =>
      Array.isArray((o.items as any)) && (o.items as any).length > 0
    ).length;

    debugLog(`Found ${orders.length} orders, ${pendingStockCount} pending stock processing`);

    if (orders.length === 0) {
      return NextResponse.json(
        { 
          success: true, 
          message: "No orders found", 
          orders: [],
          pendingStockProcessing: pendingStockCount,
          filterInfo: {
            userRole: userData?.role,
            isAdmin: isAdmin,
            timeFilterHours: timeFilterHours,
            cutoffTime: cutoffTime?.toISOString() || null,
            message: filterMessage
          }
        },
        { status: 200 }
      );
    }

    // For each order, check if it has used stock records (batched, not N+1)
    const orderIds = orders.map((o) => o.id);
    const [allUsedStock, waitressRows, waiterRows] = await Promise.all([
      prisma.usedStock.findMany({
        where: { orderId: { in: orderIds } },
        orderBy: { usedAt: 'desc' },
      }),
      prisma.waitress.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, name: true, shift: true },
      }),
      prisma.waiter.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, name: true, shift: true },
      }),
    ]);

    const usedStockByOrder = new Map<string, any[]>();
    for (const us of allUsedStock) {
      const key = us.orderId || '';
      const list = usedStockByOrder.get(key) || [];
      list.push(us);
      usedStockByOrder.set(key, list);
    }

    const waiterByOrder = new Map<string, any>();
    for (const w of waitressRows) waiterByOrder.set(w.id, w);
    for (const w of waiterRows) {
      if (!waiterByOrder.has(w.id)) waiterByOrder.set(w.id, w);
    }

    const ordersWithStockInfo = orders.map((order) => {
      const usedStock = usedStockByOrder.get(order.id) || [];

      let additionalDetails = {};

      if ((order.inTable === true || order.waiterId) && (!order.delivery)) {
        if (order.waiterId) {
          const waiter = waiterByOrder.get(order.waiterId);
          if (waiter) {
            additionalDetails = { waiter };
          }
        }
      }

      if (order.delivery === true && (!order.inTable)) {
        if (!order.deliveryInfo) {
          (order as any).deliveryInfo = {};
        }
        if (!order.paymentScreenshotUrl) {
          (order as any).paymentScreenshotUrl = null;
        }
      }

      return {
        ...order,
        _id: order.id,
        ...additionalDetails,
        usedStockCount: usedStock.length,
        usedStock: usedStock.slice(0, 5),
      };
    });

    return NextResponse.json(
      { 
        success: true,
        orders: ordersWithStockInfo,
        count: orders.length,
        pendingStockProcessing: pendingStockCount,
        filterInfo: {
          userRole: userData?.role,
          isAdmin: isAdmin,
          timeFilterHours: timeFilterHours,
          cutoffTime: cutoffTime?.toISOString() || null,
          message: filterMessage,
          regularView: !(isAdmin && allParam === "true"),
          completedOrdersOlderThan2HoursExcluded: !(isAdmin && allParam === "true")
        }
      },
      { status: 200 }
    );

  } catch (error) {
    debugError("Error fetching orders:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { 
        success: false,
        error: "Internal Server Error", 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

// POST endpoint - Create new order with proper tax handling and assignmentRequest
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let body;

    try {
      if (contentType.includes('application/json')) {
        body = await req.json();
      } else if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        const orderDataString = formData.get('orderData') as string;
        if (!orderDataString) {
          return NextResponse.json({ success: false, error: "Missing 'orderData' in form data" }, { status: 400 });
        }
        body = JSON.parse(orderDataString);

        const paymentScreenshotFile = formData.get('paymentScreenshot') as File;
        if (paymentScreenshotFile) {
          debugLog("Uploading payment screenshot to Cloudinary from FormData...");
          const screenshotUrl = await uploadToCloudinary(paymentScreenshotFile);
          body.paymentScreenshotUrl = screenshotUrl;
          debugLog("Payment screenshot uploaded from FormData:", { url: screenshotUrl });
        }
      } else {
        const textBody = await req.text();
        if (!textBody) {
          return NextResponse.json({ success: false, error: 'Request body is empty' }, { status: 400 });
        }
        body = JSON.parse(textBody);
      }
    } catch (error: any) {
      debugError("Error parsing request body:", error);
      return NextResponse.json({ success: false, error: "Invalid request body.", details: error.message }, { status: 400 });
    }

    // Validation
    if (!body || !body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Generate order number
    const lastOrder = await prisma.order.findFirst({
      orderBy: { orderNumber: { sort: 'desc' } }
    });

    let nextOrderNum = 1;
    if (lastOrder && lastOrder.orderNumber) {
      const match = lastOrder.orderNumber.match(/ORD-(\d+)/);
      if (match && match[1]) {
        nextOrderNum = parseInt(match[1], 10) + 1;
      }
    }

    const orderNumber = `ORD-${String(nextOrderNum).padStart(6, '0')}`;

    // Use values from frontend or calculate them
    let subtotalAmount = body.subtotal || 0;
    let taxAmount = body.tax || 0;
    let totalAmount = body.totalAmount || 0;
    let deliveryFee = body.deliveryFee || 0;
    let discount = Number(body.discount) || 0;
    let packagingCharge = Number(body.packagingCharge) || 0;
    let categoryChargesTotal = Number(body.categoryChargesTotal) || 0;
    
    const processedItems = [];

    // Process each item
    for (const item of body.items) {
      if (!item.itemId) {
        return NextResponse.json(
          { success: false, error: "Invalid item ID format" },
          { status: 400 }
        );
      }

      let itemData: any = await prisma.item.findFirst({ where: { id: item.itemId } });

      // If not found in items, try the books collection
      if (!itemData) {
        itemData = await prisma.book.findFirst({ where: { id: item.itemId } });
      }

      if (!itemData) {
        return NextResponse.json(
          { success: false, error: `Item not found: ${item.itemId}` },
          { status: 404 }
        );
      }
      
      const priceWithTax = Number((itemData as any).price);
      const priceWithoutTax = priceWithTax / 1.15;
      const itemTaxAmount = priceWithTax - priceWithoutTax;
      
      const quantity = Number(item.quantity) || 0;
      const itemSubtotal = priceWithoutTax * quantity;
      const itemTaxTotal = itemTaxAmount * quantity;
      const itemTotal = priceWithTax * quantity;
      
      const processedItem = {
        itemId: item.itemId,
        itemName: (itemData as any).name || (itemData as any).title || "Unknown Item",
        quantity: quantity,
        unitPrice: priceWithTax,
        priceWithTax: priceWithTax,
        priceWithoutTax: priceWithoutTax,
        taxAmount: itemTaxAmount,
        subtotal: itemSubtotal,
        taxTotal: itemTaxTotal,
        total: itemTotal,
        notes: item.notes || "",
        isUneditable: false,
        uneditableAt: null,
        uneditableBy: null,
        ingredientChoices: Array.isArray(item.ingredientChoices) ? item.ingredientChoices : [],
      };

      processedItems.push(processedItem);
    }

    // Always recalculate totals server-side from items
    subtotalAmount = processedItems.reduce((sum, item) => sum + item.subtotal, 0);
    taxAmount = processedItems.reduce((sum, item) => sum + item.taxTotal, 0);
    totalAmount = processedItems.reduce((sum, item) => sum + item.total, 0);

    const finalAmount = totalAmount + deliveryFee + packagingCharge - discount;

    const userData = await getCurrentUserData(req);

    if (body.assignmentRequest) {
      debugLog("✅ Assignment request detected:", {
        type: body.assignmentRequest.type,
        status: body.assignmentRequest.status,
        tableNumber: body.assignmentRequest.tableNumber,
        orderNumber: body.assignmentRequest.orderNumber
      });
    }

    const orderData: any = {
      orderNumber,
      tableNumber: body.tableNumber || null,
      tableId: normalizeJson(body.tableId),
      restaurantId: body.restaurantId || null,
      restaurantName: body.restaurantName || null,
      floor: normalizeJson(body.floor),
      arrangementId: normalizeJson(body.arrangementId),
      tableCapacity: normalizeJson(body.tableCapacity),
      tableLocation: normalizeJson(body.tableLocation),
      tableFeatures: normalizeJson(body.tableFeatures),
      tableShape: normalizeJson(body.tableShape),
      waiterId: body.waiterId || null,
      waiterName: body.waiterName || null,
      customerId: body.customerId || "walk-in",
      numberOfGuests: body.numberOfGuests || 1,
      items: processedItems,
      subtotal: subtotalAmount,
      tax: taxAmount,
      totalAmount: totalAmount,
      discount: discount,
      finalAmount: finalAmount,
      deliveryFee: deliveryFee,
      packagingCharge: packagingCharge,
      categoryChargesTotal: categoryChargesTotal,
      paymentMethod: body.paymentMethod || "CARD",
      status: "PENDING",
      specialRequirements: body.specialRequirements || "",
      isActive: body.isActive !== undefined ? body.isActive : true,
      stockProcessed: false,
      inTable: body.inTable || false,
      delivery: body.delivery || false,
      deliveryInfo: normalizeJson(body.deliveryInfo),
      paymentScreenshotUrl: normalizeJson(body.paymentScreenshotUrl),
      markedForDeletion: false,
      deletionRequestReason: Prisma.DbNull,
      deletionRequestedBy: Prisma.DbNull,
      deletionRequestedAt: Prisma.DbNull,
      deletedAt: Prisma.DbNull,
      deletedBy: Prisma.DbNull,
      deletionReason: Prisma.DbNull,
      ...(body.assignmentRequest && {
        assignmentRequest: normalizeJson({
          status: body.assignmentRequest.status || 'pending',
          type: body.assignmentRequest.type || 'table_assignment',
          requestedAt: body.assignmentRequest.requestedAt || new Date().toISOString(),
          tableNumber: body.assignmentRequest.tableNumber || body.tableNumber,
          tableId: body.assignmentRequest.tableId || body.tableId || null,
          restaurantId: body.assignmentRequest.restaurantId || body.restaurantId || null,
          restaurantName: body.assignmentRequest.restaurantName || body.restaurantName || null,
          floor: body.assignmentRequest.floor || body.floor || null,
          arrangementId: body.assignmentRequest.arrangementId || body.arrangementId || null,
          waiterId: body.assignmentRequest.waiterId || body.waiterId || null,
          waiterName: body.assignmentRequest.waiterName || body.waiterName || null,
          numberOfGuests: body.assignmentRequest.numberOfGuests || body.numberOfGuests,
          orderNumber: body.assignmentRequest.orderNumber || orderNumber,
          customerName: body.assignmentRequest.customerName || body.customerName || 'Walk-in',
          itemsCount: body.assignmentRequest.itemsCount || processedItems.length,
          totalAmount: body.assignmentRequest.totalAmount || finalAmount
        })
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      stockProcessedAt: null,
      createdBy: normalizeJson(userData ? {
        userId: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        createdAt: new Date()
      } : null)
    };

    debugLog("Creating order with values:", {
      orderNumber,
      subtotal: orderData.subtotal,
      tax: orderData.tax,
      totalAmount: orderData.totalAmount,
      deliveryFee: orderData.deliveryFee,
      finalAmount: orderData.finalAmount,
      itemsCount: processedItems.length,
      hasAssignmentRequest: !!orderData.assignmentRequest,
      assignmentRequest: orderData.assignmentRequest
    });

    const result = await prisma.order.create({
      data: { id: randomUUID(), ...orderData }
    });
    const insertedOrder = result;

    if (userData && insertedOrder) {
      try {
        debugLog("📝 Tracking order creator:", userData.name);
        
        if (insertedOrder.waiterId) {
          debugLog("📝 Tracking waitress as creator...");
          await registerWaitressActivity(prisma, { ...insertedOrder, _id: insertedOrder.id }, 'created');
        }
        
        await prisma.order.update(
          { where: { id: insertedOrder.id }, data: { creatorTracked: true, creatorTrackedAt: new Date() } }
        );
      } catch (error) {
        debugError("❌ Failed to track order creator:", error);
      }
    }

    return NextResponse.json(
      {
        success: true, 
        orderId: result.id,
        orderNumber,
        subtotal: subtotalAmount,
        tax: taxAmount,
        totalAmount: totalAmount,
        finalAmount: finalAmount,
        status: "pending",
        createdBy: userData ? userData.name : null,
        createdAt: orderData.createdAt,
        hasAssignmentRequest: !!orderData.assignmentRequest
      },
      { status: 201 }
    );
  } catch (error) {
    debugError("Order placement error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { 
        success: false,
        error: "Internal Server Error", 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

// PATCH endpoint - Update order status, mark for deletion, or toggle item uneditable
export async function PATCH(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await req.json();

    const { orderId, status, action, reason, requestedBy, requestedAt, itemIndex, isUneditable, uneditableBy } = body;

   if (action === "toggle-item-uneditable") {

  
  if (!orderId || itemIndex === undefined) {
    return NextResponse.json(
      { success: false, error: "Order ID and item index are required" },
      { status: 400 }
    );
  }

  const userData = await getCurrentUserData(req);
  const order = await prisma.order.findFirst({ where: { id: orderId } });
  

  
  if (!order) {
    return NextResponse.json(
      { success: false, error: "Order not found" },
      { status: 404 }
    );
  }

  const items = (order.items as any) || [];
  if (itemIndex < 0 || itemIndex >= items.length) {

    return NextResponse.json(
      { success: false, error: "Invalid item index" },
      { status: 400 }
    );
  }

  // Mutate the specific item in JS (equivalent of Mongo dot-notation $set)
  const updateData: any = {
    items: items.map((item: any, idx: number) =>
      idx === itemIndex
        ? {
            ...item,
            isUneditable,
            uneditableAt: isUneditable ? new Date().toISOString() : null,
            uneditableBy: isUneditable ? (uneditableBy || userData?.name || userData?.email || "Unknown") : null,
          }
        : item
    ),
    updatedAt: new Date()
  };
  

  
  const updateResult = await prisma.order.updateMany(
    { where: { id: orderId }, data: updateData }
  );



  if (updateResult.count === 0) {
    return NextResponse.json(
      { success: false, error: "Order not found" },
      { status: 404 }
    );
  }

  const updatedOrder = await prisma.order.findFirst({ where: { id: orderId } });
  const updatedItems = (updatedOrder?.items as any) || [];
  

  
  const allItemsUneditable = updatedItems.length > 0 && updatedItems.every((item: any) => item.isUneditable === true);

  return NextResponse.json({
    success: true,
    message: isUneditable ? "Item marked as uneditable" : "Item marked as editable",
    allItemsUneditable,
    itemIndex,
    isUneditable
  }, { status: 200 });
}

    if (action === "mark-for-deletion") {
      if (!orderId || !reason) {
        return NextResponse.json(
          { success: false, error: "Order ID and deletion reason are required" },
          { status: 400 }
        );
      }

      const userData = await getCurrentUserData(req);
      
      const updateResult = await prisma.order.updateMany(
        { where: { id: orderId }, data: { markedForDeletion: true, deletionRequestReason: reason, deletionRequestedBy: requestedBy || userData?.name || userData?.email || "Unknown User", deletionRequestedAt: requestedAt || new Date().toISOString(), updatedAt: new Date() } }
      );

      if (updateResult.count === 0) {
        return NextResponse.json(
          { success: false, error: "Order not found" },
          { status: 404 }
        );
      }

      debugLog(`📝 Order ${orderId} marked for deletion by ${requestedBy || userData?.name}`, {
        reason,
        timestamp: new Date().toISOString()
      });

      await prisma.deletionRequest.create({
        data: {
          id: randomUUID(),
          orderId: orderId,
          reason: reason,
          requestedBy: requestedBy || userData?.name || userData?.email || "Unknown User",
          requestedAt: new Date(),
        status: "PENDING",
          createdAt: new Date()
        }
      });

      const updatedOrder = await prisma.order.findFirst({ where: { id: orderId } });

      return NextResponse.json({
        success: true,
        message: "Order has been marked for deletion. Admin will review your request.",
        order: updatedOrder ? { ...updatedOrder, _id: updatedOrder.id } : null,
        markedForDeletion: true
      }, { status: 200 });
    }

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: "Invalid request. Provide orderId and status" },
        { status: 400 }
      );
    }

    const userData = await getCurrentUserData(req);
    const normalizedStatus = normalizeStatus(status);
    
    const order = await prisma.order.findFirst({ where: { id: orderId } });
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    if (normalizedStatus === "completed" && order.completionRegistered) {
      debugLog(`⚠️ Order ${order.orderNumber} already has completion registered, skipping duplicate`);
      return NextResponse.json({
        success: true,
        message: "Order already completed and points awarded",
        orderId,
        orderNumber: order.orderNumber,
        alreadyProcessed: true,
        pointsAwarded: order.employeePointsAwarded || 0
      }, { status: 200 });
    }

    const updateData: any = {
      status: normalizedStatus,
      updatedAt: new Date(),
    };

    const isCompleting = normalizedStatus === "completed" && !isOrderCompleted(order);

    if (normalizedStatus === "completed") {
      updateData.completedAt = new Date();
      if (userData) {
        updateData.completedBy = {
          userId: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          employeeId: userData.employeeId,
          completedAt: new Date()
        };
      }
    }

    const updateResult = await prisma.order.updateMany(
      { where: { id: orderId }, data: updateData }
    );

    if (updateResult.count === 0) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const updatedOrder = await prisma.order.findFirst({ where: { id: orderId } });
    
    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: "Failed to retrieve updated order" },
        { status: 500 }
      );
    }

    if (normalizedStatus === "completed") {
      let completionResult = null;
      let waitressResult = null;
      
      try {
        debugLog(`🎯 AWARDING POINTS for completed order: ${updatedOrder.orderNumber}`);
        
        if (userData) {
          debugLog(`📝 Awarding completion points to: ${userData.name} (ID: ${userData.id})`);
          completionResult = await registerOrderActivity(prisma, userData, { ...updatedOrder, _id: updatedOrder.id }, 'completed');
          
          if (isSuccessResult(completionResult)) {
            debugLog(`✅ ${completionResult.pointsAwarded} points awarded to ${userData.name}`);
          } else {
            debugError(`❌ Failed to award points: ${completionResult?.message}`, completionResult);
          }
        }
        
        if (updatedOrder.waiterId) {
          debugLog(`📝 Awarding completion points to waitress for order ${updatedOrder.orderNumber}`);
          waitressResult = await registerWaitressActivity(prisma, { ...updatedOrder, _id: updatedOrder.id }, 'completed');
          if (waitressResult && isSuccessResult(waitressResult)) {
            debugLog(`✅ ${waitressResult.pointsAwarded} points awarded to waitress`);
          }
        }
        
        await prisma.order.update(
          { where: { id: orderId }, data: { completionRegistered: true, completionRegisteredAt: new Date(), employeePointsAwarded: isSuccessResult(completionResult) ? completionResult.pointsAwarded : 0, waitressPointsAwarded: isSuccessResult(waitressResult) ? waitressResult.pointsAwarded : 0, completedOrdersIncremented: isSuccessResult(completionResult) ? completionResult.completedOrdersIncremented : false } }
        );
        
        setImmediate(async () => {
          try {
            const { processOrderStockUsage } = await import("../utils/stockHelpers");
            await processOrderStockUsage(updatedOrder);
            debugLog(`✅ Stock processing completed for ${updatedOrder.orderNumber}`);
          } catch (stockError) {
            debugError(`❌ Stock processing failed for ${updatedOrder.orderNumber}:`, stockError);
          }
        });
        
        const duration = Date.now() - startTime;
        const pointsAwarded = isSuccessResult(completionResult) ? completionResult.pointsAwarded : 0;
        debugLog(`✅ Order ${updatedOrder.orderNumber} completed in ${duration}ms - Points awarded: ${pointsAwarded}`);
        
        return NextResponse.json({
          success: true,
          message: `Order completed! ${pointsAwarded} points awarded to ${userData?.name || 'employee'}`,
          orderId,
          orderNumber: updatedOrder.orderNumber,
          completedAt: updatedOrder.completedAt,
          pointsAwarded: pointsAwarded,
          completedOrdersIncremented: isSuccessResult(completionResult) ? completionResult.completedOrdersIncremented : false,
          employeeRegistered: !!userData,
          waitressRegistered: !!updatedOrder.waiterId,
          responseTime: duration
        }, { status: 200 });
        
      } catch (error) {
        debugError("❌ Critical error during points award:", error);
        
        return NextResponse.json({
          success: true,
          message: "Order completed but points award had issues. Will retry.",
          orderId,
          orderNumber: updatedOrder.orderNumber,
          completedAt: updatedOrder.completedAt,
          error: (error as Error).message
        }, { status: 200 });
      }
    }

    const duration = Date.now() - startTime;
    debugLog(`✅ Order status updated to ${normalizedStatus} in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${normalizedStatus}`,
      orderId,
      orderNumber: updatedOrder.orderNumber,
      updatedBy: userData ? { name: userData.name, id: userData.id } : null,
      responseTime: duration
    }, { status: 200 });
    
  } catch (error) {
    debugError("Order update error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to update order", 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}



// DELETE endpoint - Admin only - Moves order to deleted_orders collection and hard deletes from orders
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("id");
    const deletionReason = url.searchParams.get("reason") || "Admin deletion";
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    const userData = await getCurrentUserData(req);
    const isAdmin = isAdminRole(userData?.role);
    
    if (!isAdmin) {
      console.warn(`Order delete denied: userId=${userData?.id}, role=${userData?.role}, hasToken=${!!userData}`);
      return NextResponse.json(
        { success: false, error: "Unauthorized. Only administrators can delete orders." },
        { status: 403 }
      );
    }

    // Check if order exists in orders collection
    const order = await prisma.order.findFirst({ where: { id: orderId } });
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }



    // STEP 1: Create a copy of the order for deleted_orders collection
    const deletedOrderDocument = {
      ...order,  // Copy all original order data
      tableId: normalizeJson(order.tableId),
      floor: normalizeJson(order.floor),
      arrangementId: normalizeJson(order.arrangementId),
      tableCapacity: normalizeJson(order.tableCapacity),
      tableLocation: normalizeJson(order.tableLocation),
      tableFeatures: normalizeJson(order.tableFeatures),
      tableShape: normalizeJson(order.tableShape),
      items: normalizeJson(order.items),
      deliveryInfo: normalizeJson(order.deliveryInfo),
      paymentScreenshotUrl: normalizeJson(order.paymentScreenshotUrl),
      deletionRequestReason: normalizeJson(order.deletionRequestReason),
      deletionRequestedBy: normalizeJson(order.deletionRequestedBy),
      deletionRequestedAt: normalizeJson(order.deletionRequestedAt),
      deletionReason: normalizeJson(order.deletionReason),
      createdBy: normalizeJson(order.createdBy),
      editRequest: normalizeJson(order.editRequest),
      assignmentRequest: normalizeJson(order.assignmentRequest),
      notifications: normalizeJson(order.notifications),
      orderItems: normalizeJson(order.orderItems),
      updatedBy: normalizeJson(order.updatedBy),
      completedBy: normalizeJson(order.completedBy),
      pendingStockItems: normalizeJson((order as any).pendingStockItems),
      usedStockIds: normalizeJson((order as any).usedStockIds),
      // Add deletion metadata
      deletedAt: new Date(),
      deletedBy: userData?.name || userData?.email || "Unknown Admin",
      deletedByRole: userData?.role || "ADMIN",
      deletionMethod: "hard_delete",
      originalOrderId: order.id,
      originalOrderNumber: order.orderNumber,
      deletedFromCollection: "orders",
      movedToCollection: "deleted_orders",
      // Ensure these fields reflect deletion state
      isActive: false,
      markedForDeletion: false,
      deletionLogId: null  // Will be updated after log creation
    };



    // STEP 2: Insert into deleted_orders collection
    const createdDeletedOrder = await prisma.deletedOrder.create({
      data: deletedOrderDocument
    });
    


    // STEP 3: Create deletion log entry
    const deletionLogEntry = {
      orderId: orderId,
      orderNumber: order.orderNumber,
      deletedBy: userData?.name || userData?.email || "Unknown Admin",
      deletedByRole: userData?.role,
      deletionReason: deletionReason,
      deletedOrderDocumentId: createdDeletedOrder.id,
      orderData: {
        orderNumber: order.orderNumber,
        finalAmount: order.finalAmount,
        status: order.status,
        createdAt: order.createdAt,
        itemsCount: (order.items as any)?.length || 0,
        paymentMethod: order.paymentMethod,
        customerName: order.customerName,
        tableNumber: order.tableNumber
      },
      deletedAt: new Date(),
      createdAt: new Date()
    };

    const deletionLogResult = await prisma.deletionLog.create({
      data: { id: randomUUID(), ...deletionLogEntry }
    });


    // STEP 4: Update the deleted order with the log ID reference
    await prisma.deletedOrder.updateMany(
      { where: { id: createdDeletedOrder.id }, data: { deletionLogId: deletionLogResult.id } }
    );

    // STEP 5: Update related records (used_stock)
    await prisma.usedStock.updateMany(
      { where: { orderId: order.id }, data: { deletedWithOrder: true, deletedAt: new Date(), deletedBy: userData?.name, deletedOrderId: createdDeletedOrder.id } }
    );


    // STEP 6: Update deletion requests status if any
    await prisma.deletionRequest.updateMany(
      { where: { orderId: orderId, status: "pending" }, data: { status: "approved", approvedBy: userData?.name, approvedAt: new Date(), note: "Order permanently deleted by admin", deletedOrderId: createdDeletedOrder.id } }
    );

    // STEP 7: HARD DELETE from orders collection
    const deleteResult = await prisma.order.deleteMany({ where: { id: orderId } });
    
    if (deleteResult.count === 0) {
      throw new Error("Failed to delete order from orders collection");
    }



    // Verify the deletion was successful
    const orderStillExists = await prisma.order.findFirst({ where: { id: orderId } });
    const orderInDeleted = await prisma.deletedOrder.findFirst({ where: { originalOrderId: order.id } });

    debugLog(`✅ SUCCESS: Order ${order.orderNumber} moved to deleted_orders and removed from orders`, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      deletedBy: userData?.name,
      deletionReason,
      deletedOrderDocumentId: createdDeletedOrder.id,
      deletionLogId: deletionLogResult.id,
      removedFromOrders: !orderStillExists,
      archivedInDeletedOrders: !!orderInDeleted
    });

    return NextResponse.json({
      success: true,
      message: `Order ${order.orderNumber} has been permanently deleted and moved to deleted_orders archive`,
      data: {
        orderNumber: order.orderNumber,
        deletedAt: new Date().toISOString(),
        deletedBy: userData?.name || "Unknown Admin",
        deletionReason: deletionReason,
        originalOrderId: order.id,
        deletedOrderId: createdDeletedOrder.id,
        deletionLogId: deletionLogResult.id,
        removedFromOrders: !orderStillExists,
        archivedInDeletedOrders: !!orderInDeleted
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error("Order deletion error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to delete order", 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

// PUT endpoint for fixes and maintenance - Admin only
export async function PUT(req: NextRequest) {
  try {
    const userData = await getCurrentUserData(req);
    const isAdmin = isAdminRole(userData?.role);
    
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Only administrators can perform maintenance operations." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { action, orderId, userId, fixAll = false } = body;

    if (action === "fixMissingRegistration" && orderId) {
      const order = await prisma.order.findFirst({ where: { id: orderId } });
      
      if (!order) {
        return NextResponse.json(
          { success: false, error: "Order not found" },
          { status: 404 }
        );
      }

      const results = [];

      if (order.completedBy && !order.completionRegistered) {
        const cb = order.completedBy as any;
        const userData = {
          id: cb.userId,
          name: cb.name,
          email: cb.email,
          role: cb.role || "employee",
          employeeId: cb.employeeId
        };

        const activityResult = await registerOrderActivity(prisma, userData, { ...order, _id: order.id }, 'completed');
        results.push({ type: "employee", result: activityResult });
      }

      if (order.waiterId && !order.waitressActivityRegistered) {
        const waitressResult = await registerWaitressActivity(prisma, { ...order, _id: order.id }, 'completed');
        results.push({ type: "waitress", result: waitressResult });
      }

      await prisma.order.update(
        { where: { id: orderId }, data: { registrationFixed: true, registrationFixedAt: new Date(), completionRegistered: true } }
      );

      return NextResponse.json({
        success: true,
        message: "Missing registrations fixed",
        orderId,
        results
      }, { status: 200 });
    }

    if (action === "fixAllMissingRegistrations" && fixAll) {
      const completedOrders = await prisma.order.findMany({
        where: {
          status: { contains: 'completed', mode: 'insensitive' },
          OR: [
            { completionRegistered: { not: true } },
            { completionRegistered: null }
          ]
        }
      });

      debugLog(`Found ${completedOrders.length} orders missing completion registration`);

      const results = {
        totalProcessed: 0,
        pointsAwarded: 0,
        employeesUpdated: new Set(),
        ordersProcessed: [] as any[],
        errors: [] as any[]
      };

      for (const order of completedOrders) {
        try {
          let orderPoints = 0;
          
          if (order.completedBy && (order.completedBy as any).userId) {
            const cb = order.completedBy as any;
            const userData = {
              id: cb.userId,
              name: cb.name,
              email: cb.email,
              role: cb.role || "employee",
              employeeId: cb.employeeId
            };

            const activityResult = await registerOrderActivity(prisma, userData, { ...order, _id: order.id }, 'completed');
            if (isSuccessResult(activityResult)) {
              orderPoints += activityResult.pointsAwarded || 0;
              results.employeesUpdated.add(userData.id);
              results.ordersProcessed.push({
                orderId: order.id,
                orderNumber: order.orderNumber,
                type: "employee",
                points: activityResult.pointsAwarded
              });
            }
          }

          if (order.waiterId) {
            const waitressResult = await registerWaitressActivity(prisma, { ...order, _id: order.id }, 'completed');
            if (waitressResult && isSuccessResult(waitressResult)) {
              orderPoints += waitressResult.pointsAwarded || 0;
              results.ordersProcessed.push({
                orderId: order.id,
                orderNumber: order.orderNumber,
                type: "waitress",
                points: waitressResult.pointsAwarded
              });
            }
          }

          results.pointsAwarded += orderPoints;
          results.totalProcessed++;

          await prisma.order.update(
            { where: { id: order.id }, data: { registrationFixed: true, registrationFixedAt: new Date(), completionRegistered: true, pointsAwardedOnFix: orderPoints } }
          );

        } catch (error) {
          debugError(`Error fixing order ${order.id}:`, error);
          results.errors.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            error: (error as Error).message
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Fixed ${results.totalProcessed} orders`,
        results: {
          ...results,
          employeesUpdated: Array.from(results.employeesUpdated)
        }
      }, { status: 200 });
    }

    if (action === "recalculatePoints" && userId) {
      const employee = await prisma.employeeRank.findFirst({ where: { userId: userId } });
      
      if (!employee) {
        return NextResponse.json(
          { success: false, error: "Employee not found" },
          { status: 404 }
        );
      }

      const allCompleted = await prisma.order.findMany({
        where: { status: { contains: 'completed', mode: 'insensitive' } }
      });
      const completedOrders = allCompleted.filter(o => (o.completedBy as any)?.userId === userId);

      let totalPoints = 0;
      let completedCount = 0;

      for (const order of completedOrders) {
        completedCount++;
        
        let points = 10;
        
        const totalItems = ((order.items as any)?.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0)) || 0;
        if (totalItems > 5) {
          points += Math.min(Math.floor(totalItems / 5), 15);
        }
        
        totalPoints += points;
      }

      const updateResult = await prisma.employeeRank.updateMany(
        { where: { userId: userId }, data: { points: totalPoints, completedOrders: completedCount, recalculatedAt: new Date() } }
      );

      return NextResponse.json({
        success: true,
        message: "Points recalculated",
        userId,
        completedOrders: completedCount,
        totalPoints,
        updateResult
      }, { status: 200 });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use 'fixMissingRegistration', 'fixAllMissingRegistrations', or 'recalculatePoints'" },
      { status: 400 }
    );

  } catch (error) {
    debugError("PUT endpoint error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
