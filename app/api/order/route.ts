// app/api/orders/route.ts - COMPLETE UPDATED VERSION with 2-hour filter
if (process.env.NODE_ENV === 'development') {
  import('../../../lib/localCron');
}
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { 
  debugLog, debugError, normalizeStatus, getCurrentUserData, uploadToCloudinary,
  isOrderCompleted
} from "../utils/orderHelpers";
import { registerOrderActivity, registerWaitressActivity } from "../utils/activityHelpers";

// GET endpoint - Fetch orders (FAST - no stock processing)
export async function GET(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const url = new URL(req.url);
    const orderId = url.searchParams.get("id");
    const status = url.searchParams.get("status");
    const after = url.searchParams.get("after");

    debugLog("GET request received (fast mode):", {
      orderId,
      status,
      pathname: url.pathname
    });

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

    // 🔥 NEW: Filter out completed orders older than 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    // Add condition: If order is completed AND older than 2 hours, don't fetch it
    const completedFilter = {
      $or: [
        { status: { $not: { $regex: /^completed$/i } } }, // Not completed
        { 
          status: { $regex: /^completed$/i },
          updatedAt: { $gte: twoHoursAgo } // Completed but within last 2 hours
        }
      ]
    };

    // Apply the filter to the query
    if (Object.keys(query).length > 0) {
      query = { $and: [query, completedFilter] };
    } else {
      query = completedFilter;
    }

    // Enforce delivery order visibility rule
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

    // Handle after parameter for pagination (get orders after a specific date)
    if (after) {
      const afterDate = new Date(after);
      if (!isNaN(afterDate.getTime())) {
        query.createdAt = { ...(query.createdAt || {}), $gt: afterDate };
      }
    }

    // Fetch orders - FAST operation
    const orders = await db.collection("orders")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    // Get count of pending stock processing (for admin info)
    // Only count orders that are still relevant (within 2 hours)
    const pendingStockCount = await db.collection("orders").countDocuments({
      status: { $regex: /^completed$/i },
      stockProcessed: { $ne: true },
      "items.0": { $exists: true },
      updatedAt: { $gte: twoHoursAgo } // Only count recent completed orders
    });

    debugLog(`Found ${orders.length} orders, ${pendingStockCount} pending stock processing (excluding completed orders >2h old)`);

    if (orders.length === 0) {
      return NextResponse.json(
        { 
          success: true, 
          message: "No orders found", 
          orders: [],
          pendingStockProcessing: pendingStockCount,
          filterInfo: {
            completedOrdersOlderThan2HoursExcluded: true,
            cutoffTime: twoHoursAgo.toISOString()
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

        // Logic for Table Orders: Fetch Waiter Details
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
        
        // Logic for Delivery Orders
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
          completedOrdersOlderThan2HoursExcluded: true,
          cutoffTime: twoHoursAgo.toISOString()
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

// POST endpoint - Create new order
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

    let totalAmount = 0;
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
      
      const subtotal = (Number(item.quantity) || 0) * (Number(itemData.price) || 0);
      totalAmount += subtotal;

      const processedItem = {
        itemId: item.itemId,
        itemName: itemData.name,
        quantity: Number(item.quantity) || 0,
        unitPrice: itemData.price,
        itemPrice: itemData.price,
        subtotal: subtotal,
        notes: item.notes || ""
      };

      processedItems.push(processedItem);
    }

    // Calculate amounts
    const taxAmount = totalAmount * 0.15;
    const finalAmount = totalAmount + taxAmount - (Number(body.discount) || 0);

    // Get current user data
    const userData = await getCurrentUserData(req);

    // Create the order object
    const orderData = {
      orderNumber,
      tableNumber: body.tableNumber || null,
      waiterId: body.waiterId || null,
      customerId: body.customerId || "walk-in",
      numberOfGuests: body.numberOfGuests || 1,
      items: processedItems,
      totalAmount,
      tax: taxAmount,
      discount: Number(body.discount) || 0,
      finalAmount,
      paymentMethod: body.paymentMethod || "CARD",
      status: "PENDING",
      specialRequirements: body.specialRequirements || "",
      isActive: body.isActive !== undefined ? body.isActive : true,
      stockProcessed: false,
      inTable: body.inTable || false,
      delivery: body.delivery || false,
      deliveryInfo: body.deliveryInfo || null,
      paymentScreenshotUrl: body.paymentScreenshotUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
      stockProcessedAt: null
    };

    // Insert order
    const result = await db.collection("orders").insertOne(orderData as any);
    const insertedOrder = await db.collection("orders").findOne({ _id: result.insertedId });

    // Register employee activity for order creation
    if (userData && insertedOrder) {
      await registerOrderActivity(db, userData, insertedOrder, 'created');
      if (insertedOrder.waiterId) {
        await registerWaitressActivity(db, insertedOrder, 'created');
      }
    }

    return NextResponse.json(
      {
        success: true, 
        orderId: result.insertedId,
        orderNumber,
        finalAmount,
        tax: taxAmount,
        status: "pending",
        userRegistered: !!userData,
        createdAt: orderData.createdAt,
        completedAt: null
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

// PATCH endpoint - Update order status (OPTIMIZED - NO WAITING FOR STOCK)
export async function PATCH(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const body = await req.json();

    const { orderId, status } = body;

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

    const updateData: any = {
      status: normalizedStatus,
      updatedAt: new Date(),
    };

    if (normalizedStatus === "completed") {
      updateData.completedAt = new Date();
      if (userData) {
        updateData.completedBy = {
          userId: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          completedAt: new Date()
        };
      }
    }

    // Update order status (FAST - no waiting)
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
    
    // CRITICAL: Check if updatedOrder exists
    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: "Failed to retrieve updated order" },
        { status: 500 }
      );
    }

    // Register activity in background (don't wait)
    if (userData) {
      setImmediate(async () => {
        try {
          await registerOrderActivity(db, userData, updatedOrder, 'updated');
        } catch (error) {
          debugError("Failed to register update activity:", error);
        }
      });
    }

    // If order is completed, process stock in BACKGROUND
    if (normalizedStatus === "completed") {
      // Store order data for background processing
      const orderForBackground = {
        _id: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        waiterId: updatedOrder.waiterId,
        status: updatedOrder.status,
        items: updatedOrder.items,
        stockProcessed: updatedOrder.stockProcessed
      };
      
      // Process in background - return immediately!
      setImmediate(async () => {
        try {
          debugLog(`🔄 Background stock processing for order: ${orderForBackground.orderNumber}`);
          
          // Import dynamically to avoid circular dependencies
          const { processOrderStockUsage } = await import("../utils/stockHelpers");
          
          const stockResult = await processOrderStockUsage(orderForBackground);
          
          if (stockResult.success) {
            debugLog(`✅ Background stock processing succeeded for ${orderForBackground.orderNumber}`);
          } else {
            debugLog(`⚠️ Background stock processing failed for ${orderForBackground.orderNumber}: ${stockResult.message}`);
          }
          
          // Register completion activity
          if (userData) {
            await registerOrderActivity(db, userData, updatedOrder, 'completed');
          }
          
          // Register waitress activity
          if (orderForBackground.waiterId) {
            await registerWaitressActivity(db, updatedOrder, 'completed');
          }
          
        } catch (error) {
          debugError(`❌ Background stock processing failed for order ${orderId}:`, error);
          
          // Mark order with error for retry (but don't block response)
          try {
            await db.collection("orders").updateOne(
              { _id: new ObjectId(orderId) },
              { 
                $set: { 
                  stockProcessingError: (error as Error).message,
                  stockLastAttempt: new Date()
                } 
              }
            );
          } catch (updateError) {
            debugError("Failed to mark order error:", updateError);
          }
        }
      });
      
      const duration = Date.now() - startTime;
      debugLog(`✅ Order completed in ${duration}ms (stock processing in background)`);
      
      // Return IMMEDIATELY - don't wait for stock processing
      return NextResponse.json({
        success: true,
        message: "Order completed. Stock processing in background.",
        orderId,
        orderNumber: updatedOrder.orderNumber,
        completedAt: updatedOrder.completedAt,
        employeeRegistered: !!userData,
        waitressRegistered: !!updatedOrder.waiterId,
        responseTime: duration
      }, { status: 200 });
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