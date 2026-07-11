import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { DeliveryOrderSchema } from "@/models/DeliveryOrders";
import { auth } from "@/auth"; // ✅ Changed from getServerSession import

// Define valid statuses directly to avoid import issues
const VALID_STATUSES = [
  "PENDING",
  "CONFIRMED", 
  "PREPARING",
  "PICKUP",  
  "SERVED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED"
] as const;

type OrderStatus = typeof VALID_STATUSES[number];

// Helper function to register employee activity
async function registerEmployeeActivity(db: any, userData: any, orderData: any, action: string) {
  try {
    if (!userData || !userData.id) {
      console.log("No user data available for employee activity registration");
      return { success: false, message: "No user data available" };
    }
    
    console.log("Registering employee activity:", {
      userId: userData.id,
      userName: userData.name,
      orderId: orderData._id,
      orderNumber: orderData.orderNumber,
      action: action
    });
    
    // Check if employee_rank collection exists
    const collections = await db.listCollections({ name: "employee_rank" }).toArray();
    
    if (collections.length === 0) {
      console.log("Creating employee_rank collection...");
      await db.createCollection("employee_rank");
      console.log("employee_rank collection created");
    }
    
    // Prepare user identifier - handle both string and ObjectId
    let userId;
    if (ObjectId.isValid(userData.id)) {
      userId = new ObjectId(userData.id);
    } else {
      userId = userData.id;
    }
    
    // Generate employee ID if not provided
    const employeeId = userData.employeeId || `EMP-${Date.now().toString().slice(-6)}`;
    
    const matchQuery: any = {
      $or: [
        { userId: userId },
        { employeeId: employeeId }
      ]
    };

    if (userData.email) {
      matchQuery.$or.push({ email: userData.email });
    }

    // Determine points based on action
    let pointsAwarded = 0;
    let activityType = "";
    
    if (action === "order_accepted") {
      pointsAwarded = 5;
      activityType = "order_accepted";
    } else if (action === "order_cancelled") {
      pointsAwarded = 0; // No points for cancellation
      activityType = "order_cancelled";
    } else if (action === "order_delivered") {
      pointsAwarded = 10;
      activityType = "order_delivered";
    }

    // Upsert operation: update if exists, insert if not
    const updateResult = await db.collection("employee_rank").updateOne(
      matchQuery,
      {
        $set: {
          name: userData.name,
          email: userData.email,
          role: userData.role || "staff",
          employeeId: employeeId,
          lastActivity: new Date(),
          lastActivityType: activityType,
          lastOrderId: orderData._id,
          lastOrderNumber: orderData.orderNumber
        },
        $inc: { 
          totalOrdersProcessed: 1,
          points: pointsAwarded,
          ...(action === "order_accepted" ? { acceptedOrders: 1 } : {}),
          ...(action === "order_cancelled" ? { cancelledOrders: 1 } : {}),
          ...(action === "order_delivered" ? { deliveredOrders: 1 } : {})
        },
        $setOnInsert: {
          userId: userId,
          createdAt: new Date(),
          totalPoints: pointsAwarded,
          activityHistory: [],
          acceptedOrders: 0,
          cancelledOrders: 0,
          deliveredOrders: 0
        }
      },
      { upsert: true }
    );
    
    // Add to activity history
    const activityRecord = {
      type: activityType,
      orderId: orderData._id,
      orderNumber: orderData.orderNumber,
      timestamp: new Date(),
      pointsAwarded: pointsAwarded,
      statusChange: action
    };
    
    await db.collection("employee_rank").updateOne(
      { 
        $or: [
          { userId: userId },
          { employeeId: employeeId }
        ]
      },
      {
        $push: {
          activityHistory: {
            $each: [activityRecord],
            $slice: -50 // Keep last 50 activities
          }
        }
      }
    );
    
    console.log("Employee activity registered successfully:", {
      userId: userData.id,
      action: action,
      pointsAwarded: pointsAwarded,
      upsertedId: updateResult.upsertedId,
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount
    });
    
    return { 
      success: true, 
      message: "Employee activity registered",
      employeeId: employeeId,
      pointsAwarded: pointsAwarded
    };
    
  } catch (error) {
    console.error("Failed to register employee activity:", error);
    return { 
      success: false, 
      message: "Failed to register employee activity",
      error: (error as any).message 
    };
  }
}

// GET: Retrieve an order by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const orderId = id;

    // Validate the order ID
    if (!ObjectId.isValid(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    // Find the order by ID with enhanced details
    const order = await db.collection("orders").aggregate([
      {
        $match: { _id: new ObjectId(orderId) }
      },
      // Lookup User Details
      {
        $addFields: {
          userIdObj: {
            $cond: {
              if: { $and: [{ $ne: ["$userId", null] }, { $ne: ["$userId", ""] }] },
              then: { $toObjectId: "$userId" },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "userIdObj",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
      // Lookup Item Details
      { $unwind: "$items" },
      {
        $addFields: {
          "items.itemIdObj": { $toObjectId: "$items.itemId" }
        }
      },
      {
        $lookup: {
          from: "items",
          localField: "items.itemIdObj",
          foreignField: "_id",
          as: "items.itemDetails"
        }
      },
      {
        $unwind: {
          path: "$items.itemDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: "$_id",
          root: { $first: "$$ROOT" },
          items: { $push: "$items" }
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$root", { items: "$items" }]
          }
        }
      }
    ]).toArray();

    if (order.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Return the order
    return NextResponse.json({ success: true, order: order[0] }, { status: 200 });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT: Update an order by ID
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const orderId = id;

    // Validate the order ID
    if (!ObjectId.isValid(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const body = await req.json();

    // Validate the updated order data
    const validatedOrder = DeliveryOrderSchema.omit({ _id: true }).parse(body); // Omit _id for validation

    // Update the order in the database
    const result = await db.collection("orders").updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          ...validatedOrder,
          updatedAt: new Date(), // Update the updatedAt field
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Return success response
    return NextResponse.json(
      { success: true, message: "Order updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete an order by ID (Admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const orderId = id;

    // Validate the order ID
    if (!ObjectId.isValid(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    // Auth check - admin only
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as any).role;
    if (!role || !['ADMIN', 'SUPER_ADMIN'].includes(String(role).toUpperCase())) {
      return NextResponse.json({ error: "Unauthorized. Only administrators can delete orders." }, { status: 403 });
    }

    // Delete the order from the database
    const result = await db
      .collection("orders")
      .deleteOne({ _id: new ObjectId(orderId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Return success response
    return NextResponse.json(
      { success: true, message: "Order deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH: Update the status of an order
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const ordersCollection = db.collection("orders");
    
    // ✅ Changed: Use auth() instead of getServerSession
    const session = await auth();

    // Validate the order ID
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { status, reason } = body;

    // Validate status is provided
    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Validate status value
    if (!VALID_STATUSES.includes(status as OrderStatus)) {
      return NextResponse.json(
        { 
          error: `Invalid status: "${status}". Must be one of: ${VALID_STATUSES.join(", ")}`,
          validStatuses: VALID_STATUSES 
        },
        { status: 400 }
      );
    }

    // Get existing order before update
    const existingOrder = await ordersCollection.findOne({ 
      _id: new ObjectId(id) 
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Validate order is a delivery order
    if (!existingOrder.delivery) {
      return NextResponse.json(
        { error: "This order is not a delivery order" },
        { status: 400 }
      );
    }

    // Get user data from session
    const userData = session?.user ? {
      id: session.user.id || null,
      name: session.user.name || "Unknown",
      email: session.user.email || "Unknown",
      role: session.user.role || "staff",
      employeeId: session.user.employeeId || null
    } : null;

    // Prepare update data
    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    // Add cancellation reason if provided
    if (status === "CANCELLED" && reason) {
      updateData.cancellationReason = reason;
      updateData.cancelledBy = userData?.id || null;
      updateData.cancelledAt = new Date();
    }

    // Track who updated the status
    if (userData) {
      updateData.updatedBy = {
        userId: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        updatedAt: new Date()
      };
    }

    // Set completedAt if order is completed or delivered
    if (status === "COMPLETED" || status === "DELIVERED") {
      updateData.completedAt = new Date();
      
      // Also track who completed it
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

    // Update the order status
    const updateResult = await ordersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Determine action for employee activity tracking
    let employeeAction = "";
    if (status === "CONFIRMED") {
      employeeAction = "order_accepted";
    } else if (status === "CANCELLED") {
      employeeAction = "order_cancelled";
    } else if (status === "DELIVERED") {
      employeeAction = "order_delivered";
    }

    // Register employee activity if user is logged in and action is significant
    let employeeRegistration = null;
    if (userData && employeeAction) {
      try {
        employeeRegistration = await registerEmployeeActivity(db, userData, existingOrder, employeeAction);
        console.log("Employee registration result:", employeeRegistration);
      } catch (empError) {
        console.error("Error registering employee activity:", empError);
      }
    }

    // Log to delivery_accepter if status is CONFIRMED or CANCELLED
    if (updateResult.modifiedCount > 0 && (status === "CONFIRMED" || status === "CANCELLED")) {
      try {
        const logEntry = {
          orderId: existingOrder._id,
          orderNumber: existingOrder.orderNumber || `ORDER-${id.slice(-6)}`,
          previousStatus: existingOrder.status,
          newStatus: status,
          reason: reason || null,
          accepterId: userData?.id ? (ObjectId.isValid(userData.id) ? new ObjectId(userData.id) : userData.id) : null,
          accepterName: userData?.name || "Unknown",
          accepterEmail: userData?.email || "Unknown",
          accepterRole: userData?.role || "staff",
          changeDate: new Date(),
          employeeRegistration: employeeRegistration?.success ? {
            employeeId: employeeRegistration.employeeId,
            pointsAwarded: employeeRegistration.pointsAwarded
          } : null,
          orderDetails: {
            userId: existingOrder.userId ? new ObjectId(existingOrder.userId) : null,
            userName: existingOrder.deliveryInfo?.fullName || "Unknown",
            userEmail: existingOrder.deliveryInfo?.email || "Unknown",
            totalAmount: existingOrder.totalAmount || 0,
            finalAmount: existingOrder.finalAmount || 0,
            delivery: existingOrder.delivery || false,
            itemCount: existingOrder.items?.length || 0
          }
        };
        
        await db.collection("delivery_accepter").insertOne(logEntry);
      } catch (logError) {
        console.error("Error logging delivery acceptance:", logError);
      }
    }

    // If order is cancelled, restore stock if it was deducted during order creation
    if (status === "CANCELLED" && existingOrder.status === "PENDING") {
      try {
        console.log("Restoring stock for cancelled order:", existingOrder.orderNumber);
        
        for (const item of existingOrder.items) {
          const itemData = await db.collection("items").findOne({ 
            _id: new ObjectId(item.itemId) 
          });

          if (!itemData || !itemData.requiredStock) continue;

          for (const requiredStock of itemData.requiredStock) {
            await db.collection("stocks").updateOne(
              { _id: new ObjectId(requiredStock.stockId) },
              { $inc: { quantity: requiredStock.quantity * item.quantity } }
            );
          }
        }
        console.log("Stock restored successfully for order:", existingOrder.orderNumber);
      } catch (stockError) {
        console.error("Error restoring stock for cancelled order:", stockError);
      }
    }

    // Fetch the updated order with enhanced details
    const updatedOrder = await db.collection("orders").aggregate([
      {
        $match: { _id: new ObjectId(id) }
      },
      // Lookup User Details
      {
        $addFields: {
          userIdObj: {
            $cond: {
              if: { $and: [{ $ne: ["$userId", null] }, { $ne: ["$userId", ""] }] },
              then: { $toObjectId: "$userId" },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "userIdObj",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
      // Lookup Item Details
      { $unwind: "$items" },
      {
        $addFields: {
          "items.itemIdObj": { $toObjectId: "$items.itemId" }
        }
      },
      {
        $lookup: {
          from: "items",
          localField: "items.itemIdObj",
          foreignField: "_id",
          as: "items.itemDetails"
        }
      },
      {
        $unwind: {
          path: "$items.itemDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: "$_id",
          root: { $first: "$$ROOT" },
          items: { $push: "$items" }
        }
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$root", { items: "$items" }]
          }
        }
      }
    ]).toArray();

    return NextResponse.json(
      { 
        success: true,
        message: `Order status updated to ${status} successfully`,
        order: updatedOrder[0],
        shouldRemove: status === "CONFIRMED", // Flag to remove order from list if confirmed
        employeeRegistered: employeeRegistration?.success || false,
        employeeRegistration: employeeRegistration,
        stockRestored: status === "CANCELLED" && existingOrder.status === "PENDING"
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error updating order status:", error);
    
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}