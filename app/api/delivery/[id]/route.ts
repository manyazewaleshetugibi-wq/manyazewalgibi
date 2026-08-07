import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { DeliveryOrderSchema } from "@/models/DeliveryOrders";
import { auth } from "@/auth"; // ✅ Changed from getServerSession import
import { requireRole } from "@/lib/api-auth";

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
async function registerEmployeeActivity(userData: any, orderData: any, action: string) {
  try {
    if (!userData || !userData.id) {

      return { success: false, message: "No user data available" };
    }

    const orderId = orderData._id || orderData.id;
    const orderNumber = orderData.orderNumber;


    
    // Generate employee ID if not provided
    const employeeId = userData.employeeId || `EMP-${Date.now().toString().slice(-6)}`;

    const matchQuery: any = {
      OR: [
        { userId: userData.id },
        { employeeId: employeeId }
      ]
    };

    if (userData.email) {
      matchQuery.OR.push({ email: userData.email });
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

    const activityRecord = {
      type: activityType,
      orderId: orderId,
      orderNumber: orderNumber,
      timestamp: new Date(),
      pointsAwarded: pointsAwarded,
      statusChange: action
    };

    // Upsert operation: update if exists, insert if not
    const existingEmployee = await prisma.employeeRank.findFirst({ where: matchQuery });

    if (!existingEmployee) {
      await prisma.employeeRank.create({
        data: {
          id: randomUUID(),
          userId: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role || "staff",
          employeeId: employeeId,
          lastActivity: new Date(),
          lastActivityType: activityType,
          lastOrderId: orderId,
          lastOrderNumber: orderNumber,
          totalOrdersProcessed: 1,
          points: pointsAwarded,
          totalPoints: pointsAwarded,
          activityHistory: [activityRecord],
          acceptedOrders: action === "order_accepted" ? 1 : 0,
          cancelledOrders: action === "order_cancelled" ? 1 : 0,
          deliveredOrders: action === "order_delivered" ? 1 : 0,
          createdAt: new Date()
        }
      });
    } else {
      const updateData: any = {
        name: userData.name,
        email: userData.email,
        role: userData.role || "staff",
        employeeId: employeeId,
        lastActivity: new Date(),
        lastActivityType: activityType,
        lastOrderId: orderId,
        lastOrderNumber: orderNumber,
        totalOrdersProcessed: { increment: 1 },
        points: { increment: pointsAwarded },
        ...(action === "order_accepted" ? { acceptedOrders: { increment: 1 } } : {}),
        ...(action === "order_cancelled" ? { cancelledOrders: { increment: 1 } } : {}),
        ...(action === "order_delivered" ? { deliveredOrders: { increment: 1 } } : {})
      };

      const existingHistory = Array.isArray(existingEmployee.activityHistory)
        ? (existingEmployee.activityHistory as any[])
        : [];
      updateData.activityHistory = [...existingHistory, activityRecord].slice(-50);

      await prisma.employeeRank.update({
        where: { id: existingEmployee.id },
        data: updateData
      });
    }


    
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

// Helper to enrich an order with user details and item details (replaces Mongo $lookup pipeline)
async function enrichOrder(order: any) {
  const enriched: any = { ...order, _id: order.id };

  // Lookup user details
  if (order.userId) {
    const userDetails = await prisma.user.findFirst({ where: { id: order.userId } });
    if (userDetails) {
      enriched.userDetails = userDetails;
    }
  }

  // Lookup item details
  const rawItems = Array.isArray(order.items) ? (order.items as any[]) : [];
  const enrichedItems = [];
  for (const item of rawItems) {
    const enrichedItem: any = { ...item };
    if (item?.itemId) {
      const itemDetails = await prisma.item.findFirst({ where: { id: item.itemId } });
      if (itemDetails) {
        enrichedItem.itemDetails = itemDetails;
      }
    }
    enrichedItems.push(enrichedItem);
  }
  enriched.items = enrichedItems;

  return enriched;
}

// GET: Retrieve an order by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireRole(["admin", "kitchen", "delivery"]);
    if (response) return response;

    const { id } = await params;

    // Find the order by ID with enhanced details
    const order = await prisma.order.findFirst({ where: { id } });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const enrichedOrder = await enrichOrder(order);

    // Return the order
    return NextResponse.json({ success: true, order: enrichedOrder }, { status: 200 });
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
    const { response } = await requireRole(["admin", "kitchen", "delivery"]);
    if (response) return response;

    const { id } = await params;

    const body = await req.json();

    // Validate the updated order data
    const validatedOrder = DeliveryOrderSchema.omit({ _id: true }).parse(body); // Omit _id for validation

    const data: any = { ...validatedOrder, updatedAt: new Date() }; // Update the updatedAt field
    if (validatedOrder.deliveryInfo === null) data.deliveryInfo = Prisma.DbNull;
    if (validatedOrder.paymentScreenshotUrl === null) data.paymentScreenshotUrl = Prisma.DbNull;

    // Update the order in the database
    const result = await prisma.order.updateMany({
      where: { id },
      data
    });

    if (result.count === 0) {
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
    const result = await prisma.order.deleteMany({ where: { id } });

    if (result.count === 0) {
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
    const { response } = await requireRole(["admin", "kitchen", "delivery"]);
    if (response) return response;

    const { id } = await params;
    
    // ✅ Changed: Use auth() instead of getServerSession
    const session = await auth();

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
    const existingOrder = await prisma.order.findFirst({ 
      where: { id }
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
    const updateResult = await prisma.order.updateMany({
      where: { id },
      data: updateData
    });

    if (updateResult.count === 0) {
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
        employeeRegistration = await registerEmployeeActivity(userData, existingOrder, employeeAction);

      } catch (empError) {
        console.error("Error registering employee activity:", empError);
      }
    }

    // Log to delivery_accepter if status is CONFIRMED or CANCELLED
    if (updateResult.count > 0 && (status === "CONFIRMED" || status === "CANCELLED")) {
      try {
        const logEntry = {
          orderId: existingOrder.id,
          orderNumber: existingOrder.orderNumber || `ORDER-${id.slice(-6)}`,
          previousStatus: existingOrder.status,
          newStatus: status,
          reason: reason ? reason : Prisma.DbNull,
          accepterId: userData?.id ? userData.id : null,
          accepterName: userData?.name || "Unknown",
          accepterEmail: userData?.email || "Unknown",
          accepterRole: userData?.role || "staff",
          changeDate: new Date(),
          employeeRegistration: employeeRegistration?.success ? {
            employeeId: employeeRegistration.employeeId,
            pointsAwarded: employeeRegistration.pointsAwarded
          } : Prisma.DbNull,
          orderDetails: {
            userId: existingOrder.userId ? existingOrder.userId : null,
            userName: (existingOrder.deliveryInfo as any)?.fullName || "Unknown",
            userEmail: (existingOrder.deliveryInfo as any)?.email || "Unknown",
            totalAmount: existingOrder.totalAmount || 0,
            finalAmount: existingOrder.finalAmount || 0,
            delivery: existingOrder.delivery || false,
            itemCount: (existingOrder.items as any)?.length || 0
          }
        };
        
        await prisma.deliveryAccepter.create({
          data: { id: randomUUID(), ...logEntry }
        });
      } catch (logError) {
        console.error("Error logging delivery acceptance:", logError);
      }
    }

    // NOTE: No stock restore on cancel here. Stock is only deducted when an order
    // becomes COMPLETED (processOrderStockUsage), and this route only cancels orders
    // that are still PENDING — so nothing was ever deducted to restore.

    // Fetch the updated order with enhanced details
    const freshOrder = await prisma.order.findFirst({ where: { id } });
    const updatedOrder = await enrichOrder(freshOrder);

    return NextResponse.json(
      { 
        success: true,
        message: `Order status updated to ${status} successfully`,
        order: updatedOrder,
        shouldRemove: status === "CONFIRMED", // Flag to remove order from list if confirmed
        employeeRegistered: employeeRegistration?.success || false,
        employeeRegistration: employeeRegistration,
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
