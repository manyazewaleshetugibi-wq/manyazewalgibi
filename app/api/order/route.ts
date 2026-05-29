import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
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

// Helper function to check if a user role is admin
const isAdminRole = (role: string | undefined): boolean => {
  if (!role) return false;
  return ['ADMIN', 'admin', 'Admin', 'SUPER_ADMIN'].includes(role);
}

// GET endpoint - Fetch orders with role-based time filtering
export async function GET(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
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
      const deletedOrders = await db.collection("deleted_orders")
        .find({})
        .sort({ deletedAt: -1 })
        .limit(100)
        .toArray();
      
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

      let query = {};
      if (role) {
        query = { role: { $regex: new RegExp(`^${role}$`, 'i') } };
      }

      const rankings = await db.collection("employee_rank")
        .find(query)
        .sort({ [sortBy]: -1 })
        .limit(limit)
        .toArray();

      const stats = await db.collection("employee_rank").aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalEmployees: { $sum: 1 },
            totalCompletedOrders: { $sum: "$completedOrders" },
            totalOrders: { $sum: "$totalOrders" },
            totalPoints: { $sum: "$points" },
            averageCompletedOrders: { $avg: "$completedOrders" },
            averagePoints: { $avg: "$points" }
          }
        }
      ]).toArray();

      return NextResponse.json({
        success: true,
        rankings,
        stats: stats[0] || {},
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
      filterMessage = `Admin view: Showing orders from last 24 hours (since ${cutoffTime.toISOString()})`;
      debugLog(`Admin mode: Showing orders from last ${timeFilterHours} hours`);
    } else {
      timeFilterHours = null;
      filterMessage = "Regular view: Showing non-completed orders + completed orders from last 2 hours";
      debugLog(`Regular mode: Using standard filtering`);
    }

    // Build query based on parameters
    let query: any = {};
    
    if (orderId) {
      if (!ObjectId.isValid(orderId)) {
        return NextResponse.json(
          { success: false, error: "Invalid order ID format" },
          { status: 400 }
        );
      }
      query = { _id: new ObjectId(orderId) };
    }
    
    if (status) {
      query.status = { $regex: new RegExp(`^${status}$`, 'i') };
    }

    if (restaurantId) {
      if (restaurantId === "manyazewal1") {
        query.$or = [{ restaurantId: "manyazewal1" }, { delivery: true }];
      } else {
        query.restaurantId = restaurantId;
      }
    }

    // Apply different filtering based on user role
    if (isAdmin && allParam === "true") {
      query.createdAt = { $gte: cutoffTime };
      
      const deliveryRestriction = {
        $or: [
          { delivery: { $ne: true } },
          { 
            delivery: true, 
            status: { $regex: /^confirmed$/i } 
          }
        ]
      };
      
      if (Object.keys(query).length > 0 && query.$or) {
        const existingOr = query.$or;
        delete query.$or;
        query.$and = [
          { $or: existingOr },
          deliveryRestriction,
          { createdAt: { $gte: cutoffTime } }
        ];
      } else {
        query = { $and: [query, deliveryRestriction] };
      }
    } else {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      
      const completedFilter = {
        $or: [
          { status: { $not: { $regex: /^completed$/i } } },
          { 
            status: { $regex: /^completed$/i },
            updatedAt: { $gte: twoHoursAgo }
          }
        ]
      };

      if (Object.keys(query).length > 0) {
        query = { $and: [query, completedFilter] };
      } else {
        query = completedFilter;
      }

      const deliveryRestriction = {
        $or: [
          { delivery: { $ne: true } },
          { 
            delivery: true, 
            status: { $regex: /^confirmed$/i } 
          }
        ]
      };

      query = { $and: [query, deliveryRestriction] };
    }

    if (after) {
      const afterDate = new Date(after);
      if (!isNaN(afterDate.getTime())) {
        query.createdAt = { ...(query.createdAt || {}), $gt: afterDate };
      }
    }

    // Fetch orders
    const orders = await db.collection("orders")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    const twoHoursAgoForStock = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const pendingStockCount = await db.collection("orders").countDocuments({
      status: { $regex: /^completed$/i },
      stockProcessed: { $ne: true },
      "items.0": { $exists: true },
      updatedAt: { $gte: twoHoursAgoForStock }
    });

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

    // For each order, check if it has used stock records
    const ordersWithStockInfo = await Promise.all(
      orders.map(async (order) => {
        const usedStock = await db.collection("used_stock")
          .find({ orderId: order._id })
          .toArray();
        
        let additionalDetails = {};

        if ((order.inTable === true || order.waiterId) && (!order.delivery)) {
          try {
            if (order.waiterId && ObjectId.isValid(order.waiterId)) {
              let waiter = await db.collection("waitresses").findOne(
                { _id: new ObjectId(order.waiterId) },
                { projection: { name: 1, avatar: 1, shift: 1 } }
              );
              
              if (!waiter) {
                waiter = await db.collection("waiters").findOne(
                  { _id: new ObjectId(order.waiterId) },
                  { projection: { name: 1, avatar: 1, shift: 1 } }
                );
              }
              
              if (waiter) {
                additionalDetails = { waiter };
              }
            }
          } catch (err) {
            console.error(`Failed to fetch waiter for order ${order._id}`, err);
          }
        }
        
        if (order.delivery === true && (!order.inTable)) {
          if (!order.deliveryInfo) {
            order.deliveryInfo = {};
          }
          if (!order.paymentScreenshotUrl) {
            order.paymentScreenshotUrl = null;
          }
        }

        return {
          ...order,
          ...additionalDetails,
          usedStockCount: usedStock.length,
          usedStock: usedStock.length > 0 ? usedStock.slice(0, 5) : []
        };
      })
    );

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
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    
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
    const lastOrder = await db.collection("orders")
      .find({}, { projection: { orderNumber: 1 } })
      .sort({ orderNumber: -1 })
      .limit(1)
      .toArray();

    let nextOrderNum = 1;
    if (lastOrder.length > 0 && lastOrder[0].orderNumber) {
      const match = lastOrder[0].orderNumber.match(/ORD-(\d+)/);
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
      if (!ObjectId.isValid(item.itemId)) {
        return NextResponse.json(
          { success: false, error: "Invalid item ID format" },
          { status: 400 }
        );
      }

      const itemData = await db
        .collection("items")
        .findOne({ _id: new ObjectId(item.itemId) });

      if (!itemData) {
        return NextResponse.json(
          { success: false, error: `Item not found: ${item.itemId}` },
          { status: 404 }
        );
      }
      
      const priceWithTax = Number(itemData.price);
      const priceWithoutTax = priceWithTax / 1.15;
      const itemTaxAmount = priceWithTax - priceWithoutTax;
      
      const quantity = Number(item.quantity) || 0;
      const itemSubtotal = item.subtotal || (priceWithoutTax * quantity);
      const itemTaxTotal = item.taxTotal || (itemTaxAmount * quantity);
      const itemTotal = item.total || (priceWithTax * quantity);
      
      const processedItem = {
        itemId: item.itemId,
        itemName: itemData.name,
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
        uneditableBy: null
      };

      processedItems.push(processedItem);
    }

    if (!subtotalAmount || subtotalAmount === 0) {
      subtotalAmount = processedItems.reduce((sum, item) => sum + item.subtotal, 0);
    }
    if (!taxAmount || taxAmount === 0) {
      taxAmount = processedItems.reduce((sum, item) => sum + item.taxTotal, 0);
    }
    if (!totalAmount || totalAmount === 0) {
      totalAmount = processedItems.reduce((sum, item) => sum + item.total, 0);
    }

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

    const orderData = {
      orderNumber,
      tableNumber: body.tableNumber || null,
      tableId: body.tableId || null,
      restaurantId: body.restaurantId || null,
      restaurantName: body.restaurantName || null,
      floor: body.floor || null,
      arrangementId: body.arrangementId || null,
      tableCapacity: body.tableCapacity || null,
      tableLocation: body.tableLocation || null,
      tableFeatures: body.tableFeatures || null,
      tableShape: body.tableShape || null,
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
      deliveryInfo: body.deliveryInfo || null,
      paymentScreenshotUrl: body.paymentScreenshotUrl || null,
      markedForDeletion: false,
      deletionRequestReason: null,
      deletionRequestedBy: null,
      deletionRequestedAt: null,
      deletedAt: null,
      deletedBy: null,
      deletionReason: null,
      ...(body.assignmentRequest && {
        assignmentRequest: {
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
        }
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      stockProcessedAt: null,
      createdBy: userData ? {
        userId: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        createdAt: new Date()
      } : null
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

    const result = await db.collection("orders").insertOne(orderData as any);
    const insertedOrder = await db.collection("orders").findOne({ _id: result.insertedId });

    if (userData && insertedOrder) {
      try {
        debugLog("📝 Tracking order creator:", userData.name);
        
        if (insertedOrder.waiterId) {
          debugLog("📝 Tracking waitress as creator...");
          await registerWaitressActivity(db, insertedOrder, 'created');
        }
        
        await db.collection("orders").updateOne(
          { _id: result.insertedId },
          { $set: { creatorTracked: true, creatorTrackedAt: new Date() } }
        );
      } catch (error) {
        debugError("❌ Failed to track order creator:", error);
      }
    }

    return NextResponse.json(
      {
        success: true, 
        orderId: result.insertedId,
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
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const body = await req.json();

    const { orderId, status, action, reason, requestedBy, requestedAt, itemIndex, isUneditable, uneditableBy } = body;

   if (action === "toggle-item-uneditable") {
  console.log("🔧 TOGGLE UNEDITABLE REQUEST:", { orderId, itemIndex, isUneditable, uneditableBy });
  
  if (!orderId || itemIndex === undefined) {
    return NextResponse.json(
      { success: false, error: "Order ID and item index are required" },
      { status: 400 }
    );
  }

  if (!ObjectId.isValid(orderId)) {
    return NextResponse.json(
      { success: false, error: "Valid order ID is required" },
      { status: 400 }
    );
  }

  const userData = await getCurrentUserData(req);
  const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
  
  console.log("📦 Current order items before update:", order?.items?.map((item: any, idx: number) => ({
    index: idx,
    isUneditable: item.isUneditable,
    name: item.itemName
  })));
  
  if (!order) {
    return NextResponse.json(
      { success: false, error: "Order not found" },
      { status: 404 }
    );
  }

  const items = order.items || [];
  if (itemIndex < 0 || itemIndex >= items.length) {
    console.log("❌ Invalid item index:", { itemIndex, itemsLength: items.length });
    return NextResponse.json(
      { success: false, error: "Invalid item index" },
      { status: 400 }
    );
  }

  // FIXED: Use proper MongoDB dot notation and $set operator
  const updateData: any = {};
  const itemPath = `items.${itemIndex}`;
  
  updateData[`${itemPath}.isUneditable`] = isUneditable;
  
  if (isUneditable) {
    updateData[`${itemPath}.uneditableAt`] = new Date().toISOString();
    updateData[`${itemPath}.uneditableBy`] = uneditableBy || userData?.name || userData?.email || "Unknown";
  } else {
    updateData[`${itemPath}.uneditableAt`] = null;
    updateData[`${itemPath}.uneditableBy`] = null;
  }
  
  console.log("📝 Update data being sent to MongoDB:", updateData);
  
  const updateResult = await db.collection("orders").updateOne(
    { _id: new ObjectId(orderId) },
    { $set: updateData }
  );

  console.log("✅ Update result:", { 
    matchedCount: updateResult.matchedCount, 
    modifiedCount: updateResult.modifiedCount 
  });

  if (updateResult.matchedCount === 0) {
    return NextResponse.json(
      { success: false, error: "Order not found" },
      { status: 404 }
    );
  }

  const updatedOrder = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
  const updatedItems = updatedOrder?.items || [];
  
  console.log("📦 Updated order items after update:", updatedItems.map((item: any, idx: number) => ({
    index: idx,
    isUneditable: item.isUneditable
  })));
  
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

      if (!ObjectId.isValid(orderId)) {
        return NextResponse.json(
          { success: false, error: "Valid order ID is required" },
          { status: 400 }
        );
      }

      const userData = await getCurrentUserData(req);
      
      const updateResult = await db.collection("orders").updateOne(
        { _id: new ObjectId(orderId) },
        { 
          $set: { 
            markedForDeletion: true,
            deletionRequestReason: reason,
            deletionRequestedBy: requestedBy || userData?.name || userData?.email || "Unknown User",
            deletionRequestedAt: requestedAt || new Date().toISOString(),
            updatedAt: new Date()
          } 
        }
      );

      if (updateResult.matchedCount === 0) {
        return NextResponse.json(
          { success: false, error: "Order not found" },
          { status: 404 }
        );
      }

      debugLog(`📝 Order ${orderId} marked for deletion by ${requestedBy || userData?.name}`, {
        reason,
        timestamp: new Date().toISOString()
      });

      await db.collection("deletion_requests").insertOne({
        orderId: new ObjectId(orderId),
        reason: reason,
        requestedBy: requestedBy || userData?.name || userData?.email || "Unknown User",
        requestedAt: new Date(),
        status: "pending",
        createdAt: new Date()
      });

      const updatedOrder = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });

      return NextResponse.json({
        success: true,
        message: "Order has been marked for deletion. Admin will review your request.",
        order: updatedOrder,
        markedForDeletion: true
      }, { status: 200 });
    }

    if (!orderId || !status) {
      return NextResponse.json(
        { success: false, error: "Invalid request. Provide orderId and status" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { success: false, error: "Valid order ID is required" },
        { status: 400 }
      );
    }

    const userData = await getCurrentUserData(req);
    const normalizedStatus = normalizeStatus(status);
    
    const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
    
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

    const updateResult = await db.collection("orders").updateOne(
      { _id: new ObjectId(orderId) },
      { $set: updateData }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const updatedOrder = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
    
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
          completionResult = await registerOrderActivity(db, userData, updatedOrder, 'completed');
          
          if (isSuccessResult(completionResult)) {
            debugLog(`✅ ${completionResult.pointsAwarded} points awarded to ${userData.name}`);
          } else {
            debugError(`❌ Failed to award points: ${completionResult?.message}`, completionResult);
          }
        }
        
        if (updatedOrder.waiterId) {
          debugLog(`📝 Awarding completion points to waitress for order ${updatedOrder.orderNumber}`);
          waitressResult = await registerWaitressActivity(db, updatedOrder, 'completed');
          if (waitressResult && isSuccessResult(waitressResult)) {
            debugLog(`✅ ${waitressResult.pointsAwarded} points awarded to waitress`);
          }
        }
        
        await db.collection("orders").updateOne(
          { _id: new ObjectId(orderId) },
          { 
            $set: { 
              completionRegistered: true,
              completionRegisteredAt: new Date(),
              employeePointsAwarded: isSuccessResult(completionResult) ? completionResult.pointsAwarded : 0,
              waitressPointsAwarded: isSuccessResult(waitressResult) ? waitressResult.pointsAwarded : 0,
              completedOrdersIncremented: isSuccessResult(completionResult) ? completionResult.completedOrdersIncremented : false
            } 
          }
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
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const url = new URL(req.url);
    const orderId = url.searchParams.get("id");
    const deletionReason = url.searchParams.get("reason") || "Admin deletion";
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order ID is required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { success: false, error: "Invalid order ID format" },
        { status: 400 }
      );
    }

    const userData = await getCurrentUserData(req);
    const isAdmin = isAdminRole(userData?.role);
    
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Only administrators can delete orders." },
        { status: 403 }
      );
    }

    // Check if order exists in orders collection
    const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    console.log(`📦 Starting deletion process for order: ${order.orderNumber}`);

    // STEP 1: Create a copy of the order for deleted_orders collection
    const deletedOrderDocument = {
      ...order,  // Copy all original order data
      // Add deletion metadata
      deletedAt: new Date(),
      deletedBy: userData?.name || userData?.email || "Unknown Admin",
      deletedByRole: userData?.role || "ADMIN",
      deletionReason: deletionReason,
      deletionMethod: "hard_delete",
      originalOrderId: order._id,
      originalOrderNumber: order.orderNumber,
      deletedFromCollection: "orders",
      movedToCollection: "deleted_orders",
      // Ensure these fields reflect deletion state
      isActive: false,
      markedForDeletion: false,
      deletionLogId: null  // Will be updated after log creation
    };

    // Remove the _id from the deleted document to let MongoDB create a new one
    // But keep originalOrderId for reference
    delete (deletedOrderDocument as any)._id;

    console.log(`📋 Copying order to deleted_orders collection...`);

    // STEP 2: Insert into deleted_orders collection
    const insertResult = await db.collection("deleted_orders").insertOne(deletedOrderDocument);
    
    if (!insertResult.acknowledged) {
      throw new Error("Failed to insert into deleted_orders collection");
    }

    console.log(`✅ Order copied to deleted_orders with ID: ${insertResult.insertedId}`);

    // STEP 3: Create deletion log entry
    const deletionLogEntry = {
      orderId: new ObjectId(orderId),
      orderNumber: order.orderNumber,
      deletedBy: userData?.name || userData?.email || "Unknown Admin",
      deletedByRole: userData?.role,
      deletionReason: deletionReason,
      deletedOrderDocumentId: insertResult.insertedId,
      orderData: {
        orderNumber: order.orderNumber,
        finalAmount: order.finalAmount,
        status: order.status,
        createdAt: order.createdAt,
        itemsCount: order.items?.length || 0,
        paymentMethod: order.paymentMethod,
        customerName: order.customerName,
        tableNumber: order.tableNumber
      },
      deletedAt: new Date(),
      createdAt: new Date()
    };

    const logResult = await db.collection("deletion_logs").insertOne(deletionLogEntry);
    console.log(`📝 Deletion log created with ID: ${logResult.insertedId}`);

    // STEP 4: Update the deleted order with the log ID reference
    await db.collection("deleted_orders").updateOne(
      { _id: insertResult.insertedId },
      { $set: { deletionLogId: logResult.insertedId } }
    );

    // STEP 5: Update related records (used_stock)
    await db.collection("used_stock").updateMany(
      { orderId: order._id },
      { 
        $set: { 
          deletedWithOrder: true,
          deletedAt: new Date(),
          deletedBy: userData?.name,
          deletedOrderId: insertResult.insertedId
        } 
      }
    );
    console.log(`📦 Updated ${await db.collection("used_stock").countDocuments({ orderId: order._id })} used_stock records`);

    // STEP 6: Update deletion requests status if any
    await db.collection("deletion_requests").updateMany(
      { orderId: new ObjectId(orderId), status: "pending" },
      { 
        $set: { 
          status: "approved",
          approvedBy: userData?.name,
          approvedAt: new Date(),
          note: "Order permanently deleted by admin",
          deletedOrderId: insertResult.insertedId
        } 
      }
    );

    // STEP 7: HARD DELETE from orders collection
    const deleteResult = await db.collection("orders").deleteOne({ _id: new ObjectId(orderId) });
    
    if (deleteResult.deletedCount === 0) {
      throw new Error("Failed to delete order from orders collection");
    }

    console.log(`🗑️ Order ${order.orderNumber} removed from orders collection`);

    // Verify the deletion was successful
    const orderStillExists = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
    const orderInDeleted = await db.collection("deleted_orders").findOne({ originalOrderId: order._id });

    debugLog(`✅ SUCCESS: Order ${order.orderNumber} moved to deleted_orders and removed from orders`, {
      orderId: order._id,
      orderNumber: order.orderNumber,
      deletedBy: userData?.name,
      deletionReason,
      deletedOrderDocumentId: insertResult.insertedId,
      deletionLogId: logResult.insertedId,
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
        originalOrderId: order._id,
        deletedOrderId: insertResult.insertedId,
        deletionLogId: logResult.insertedId,
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

// PUT endpoint for fixes and maintenance
export async function PUT(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const body = await req.json();
    const { action, orderId, userId, fixAll = false } = body;

    if (action === "fixMissingRegistration" && orderId) {
      if (!ObjectId.isValid(orderId)) {
        return NextResponse.json(
          { success: false, error: "Invalid order ID format" },
          { status: 400 }
        );
      }

      const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
      
      if (!order) {
        return NextResponse.json(
          { success: false, error: "Order not found" },
          { status: 404 }
        );
      }

      const results = [];

      if (order.completedBy && !order.completionRegistered) {
        const userData = {
          id: order.completedBy.userId,
          name: order.completedBy.name,
          email: order.completedBy.email,
          role: order.completedBy.role || "employee",
          employeeId: order.completedBy.employeeId
        };

        const activityResult = await registerOrderActivity(db, userData, order, 'completed');
        results.push({ type: "employee", result: activityResult });
      }

      if (order.waiterId && !order.waitressActivityRegistered) {
        const waitressResult = await registerWaitressActivity(db, order, 'completed');
        results.push({ type: "waitress", result: waitressResult });
      }

      await db.collection("orders").updateOne(
        { _id: new ObjectId(orderId) },
        { 
          $set: { 
            registrationFixed: true,
            registrationFixedAt: new Date(),
            completionRegistered: true
          } 
        }
      );

      return NextResponse.json({
        success: true,
        message: "Missing registrations fixed",
        orderId,
        results
      }, { status: 200 });
    }

    if (action === "fixAllMissingRegistrations" && fixAll) {
      const completedOrders = await db.collection("orders").find({
        status: { $regex: /^completed$/i },
        $or: [
          { completionRegistered: { $ne: true } },
          { completionRegistered: { $exists: false } }
        ]
      }).toArray();

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
          
          if (order.completedBy && order.completedBy.userId) {
            const userData = {
              id: order.completedBy.userId,
              name: order.completedBy.name,
              email: order.completedBy.email,
              role: order.completedBy.role || "employee",
              employeeId: order.completedBy.employeeId
            };

            const activityResult = await registerOrderActivity(db, userData, order, 'completed');
            if (isSuccessResult(activityResult)) {
              orderPoints += activityResult.pointsAwarded || 0;
              results.employeesUpdated.add(userData.id);
              results.ordersProcessed.push({
                orderId: order._id,
                orderNumber: order.orderNumber,
                type: "employee",
                points: activityResult.pointsAwarded
              });
            }
          }

          if (order.waiterId) {
            const waitressResult = await registerWaitressActivity(db, order, 'completed');
            if (waitressResult && isSuccessResult(waitressResult)) {
              orderPoints += waitressResult.pointsAwarded || 0;
              results.ordersProcessed.push({
                orderId: order._id,
                orderNumber: order.orderNumber,
                type: "waitress",
                points: waitressResult.pointsAwarded
              });
            }
          }

          results.pointsAwarded += orderPoints;
          results.totalProcessed++;

          await db.collection("orders").updateOne(
            { _id: order._id },
            { 
              $set: { 
                registrationFixed: true,
                registrationFixedAt: new Date(),
                completionRegistered: true,
                pointsAwardedOnFix: orderPoints
              } 
            }
          );

        } catch (error) {
          debugError(`Error fixing order ${order._id}:`, error);
          results.errors.push({
            orderId: order._id,
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
      const employee = await db.collection("employee_rank").findOne({ userId: userId });
      
      if (!employee) {
        return NextResponse.json(
          { success: false, error: "Employee not found" },
          { status: 404 }
        );
      }

      const completedOrders = await db.collection("orders").find({
        "completedBy.userId": userId,
        status: { $regex: /^completed$/i }
      }).toArray();

      let totalPoints = 0;
      let completedCount = 0;

      for (const order of completedOrders) {
        completedCount++;
        
        let points = 10;
        
        const totalItems = order.items?.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0) || 0;
        if (totalItems > 5) {
          points += Math.min(Math.floor(totalItems / 5), 15);
        }
        
        totalPoints += points;
      }

      const updateResult = await db.collection("employee_rank").updateOne(
        { userId: userId },
        {
          $set: {
            points: totalPoints,
            completedOrders: completedCount,
            recalculatedAt: new Date()
          }
        }
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
