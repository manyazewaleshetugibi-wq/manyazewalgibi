import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getCurrentUserData } from "../../utils/orderHelpers";

// Helper function to check if a user role is admin (case-insensitive)
const isAdminRole = (role: string | undefined): boolean => {
  if (!role) return false;
  const normalized = role.toUpperCase();
  return ['ADMIN', 'SUPER_ADMIN'].includes(normalized);
};

// GET: Retrieve an order by ID - COMPLETELY HIDE ALL DATA
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const orderId = params.id;

    if (!ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { success: false, message: "Invalid request" },
        { status: 400 }
      );
    }

    const order = await db
      .collection("orders")
      .findOne({ _id: new ObjectId(orderId) });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Resource not found" },
        { status: 404 }
      );
    }

    // ✅ Return ONLY success message - NO order data, NO user data, NO filter info
    return NextResponse.json(
      { success: true, message: "Operation completed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { success: false, message: "Operation failed" },
      { status: 500 }
    );
  }
}

// PUT: Update an order by ID - COMPLETELY HIDE ALL DATA
export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const orderId = params.id;

    if (!ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { success: false, message: "Invalid request" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const result = await db.collection("orders").updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          ...body,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Resource not found" },
        { status: 404 }
      );
    }

    // ✅ Return ONLY success message - NO data
    return NextResponse.json(
      { success: true, message: "Operation completed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { success: false, message: "Operation failed" },
      { status: 500 }
    );
  }
}

// DELETE: Delete an order (Admin only) - COMPLETELY HIDE ALL DATA
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const orderId = params.id;
    const url = new URL(req.url);
    const reason = url.searchParams.get("reason") || "Admin deletion";

    if (!ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { success: false, message: "Invalid request" },
        { status: 400 }
      );
    }

    const userData = await getCurrentUserData(req);
    
    // Check if user is admin
    const isAdmin = isAdminRole(userData?.role);
    
    if (!isAdmin) {
      console.warn(`Order delete denied: userId=${userData?.id}, role=${userData?.role}, hasToken=${!!userData}`);
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
    
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Resource not found" },
        { status: 404 }
      );
    }

    // Soft delete - mark as deleted
    const updateResult = await db.collection("orders").updateOne(
      { _id: new ObjectId(orderId) },
      { 
        $set: { 
          deletedAt: new Date(),
          deletedBy: userData?.name || userData?.email || "Unknown Admin",
          deletionReason: reason,
          isActive: false,
          updatedAt: new Date()
        } 
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Resource not found" },
        { status: 404 }
      );
    }

    // Log deletion (without exposing any data)
    await db.collection("deletion_logs").insertOne({
      orderId: new ObjectId(orderId),
      deletedBy: userData?.name || userData?.email || "Unknown Admin",
      deletedByRole: userData?.role,
      deletionReason: reason,
      deletedAt: new Date()
    });

    // Update deletion request status if exists
    if (order.markedForDeletion) {
      await db.collection("deletion_requests").updateOne(
        { orderId: new ObjectId(orderId), status: "pending" },
        { 
          $set: { 
            status: "approved",
            approvedBy: userData?.name,
            approvedAt: new Date()
          } 
        }
      );
    }

    // ✅ Return ONLY success message - NO data
    return NextResponse.json(
      { success: true, message: "Operation completed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { success: false, message: "Operation failed" },
      { status: 500 }
    );
  }
}

// PATCH: Update order status or mark for deletion - COMPLETELY HIDE ALL DATA
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const ordersCollection = db.collection("orders");

    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, message: "Invalid request" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { status, action, reason, requestedBy, requestedAt } = body;

    // Handle mark for deletion
    if (action === "mark-for-deletion") {
      if (!reason) {
        return NextResponse.json(
          { success: false, message: "Deletion reason is required" },
          { status: 400 }
        );
      }

      const userData = await getCurrentUserData(req);

      const updateResult = await ordersCollection.updateOne(
        { _id: new ObjectId(params.id) },
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
          { success: false, message: "Resource not found" },
          { status: 404 }
        );
      }

      // Create audit log
      await db.collection("deletion_requests").insertOne({
        orderId: new ObjectId(params.id),
        reason: reason,
        requestedBy: requestedBy || userData?.name || userData?.email || "Unknown User",
        requestedAt: new Date(),
        status: "pending",
        createdAt: new Date()
      });

      // ✅ Return ONLY success message - NO data
      return NextResponse.json(
        { success: true, message: "Operation completed successfully" },
        { status: 200 }
      );
    }

    // Handle regular status update
    if (!status) {
      return NextResponse.json(
        { success: false, message: "Status is required" },
        { status: 400 }
      );
    }

    const updateResult = await ordersCollection.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Resource not found" },
        { status: 404 }
      );
    }

    // ✅ Return ONLY success message - NO data
    return NextResponse.json(
      { success: true, message: "Operation completed successfully" },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { success: false, message: "Operation failed" },
      { status: 500 }
    );
  }
}