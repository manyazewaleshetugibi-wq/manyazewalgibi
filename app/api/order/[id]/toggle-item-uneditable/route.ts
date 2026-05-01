import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getCurrentUserData } from "../../../utils/orderHelpers";

// Helper function to check if a user role is admin
const isAdminRole = (role: string | undefined): boolean => {
  if (!role) return false;
  return ['ADMIN', 'admin', 'Admin', 'SUPER_ADMIN'].includes(role);
};

// PATCH: Toggle item uneditable status
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const ordersCollection = db.collection("orders");

    const orderId = params.id;

    if (!ObjectId.isValid(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    const body = await req.json();
    const { itemIndex, isUneditable, uneditableBy } = body;

    if (itemIndex === undefined) {
      return NextResponse.json(
        { error: "Item index is required" },
        { status: 400 }
      );
    }

    // Get current user data
    const userData = await getCurrentUserData(req);
    const currentUser = uneditableBy || userData?.name || userData?.email || "Unknown User";

    // Get the order
    const order = await ordersCollection.findOne({ _id: new ObjectId(orderId) });
    
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Get items array (handle both 'items' and 'orderItems' fields)
    const items = order.items || order.orderItems || [];
    
    if (itemIndex < 0 || itemIndex >= items.length) {
      return NextResponse.json({ error: "Invalid item index" }, { status: 400 });
    }

    // Prepare update object for the specific item using dot notation
    const updateData: any = {
      [`items.${itemIndex}.isUneditable`]: isUneditable,
      updatedAt: new Date()
    };

    if (isUneditable) {
      updateData[`items.${itemIndex}.uneditableAt`] = new Date();
      updateData[`items.${itemIndex}.uneditableBy`] = currentUser;
    } else {
      updateData[`items.${itemIndex}.uneditableAt`] = null;
      updateData[`items.${itemIndex}.uneditableBy`] = null;
    }

    // Also update orderItems if it exists separately
    if (order.orderItems && order.orderItems.length > 0) {
      updateData[`orderItems.${itemIndex}.isUneditable`] = isUneditable;
      if (isUneditable) {
        updateData[`orderItems.${itemIndex}.uneditableAt`] = new Date();
        updateData[`orderItems.${itemIndex}.uneditableBy`] = currentUser;
      } else {
        updateData[`orderItems.${itemIndex}.uneditableAt`] = null;
        updateData[`orderItems.${itemIndex}.uneditableBy`] = null;
      }
    }

    // Update the order
    const updateResult = await ordersCollection.updateOne(
      { _id: new ObjectId(orderId) },
      { $set: updateData }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Get the updated order
    const updatedOrder = await ordersCollection.findOne({ _id: new ObjectId(orderId) });

    const message = isUneditable 
      ? `Item ${itemIndex + 1} marked as uneditable` 
      : `Item ${itemIndex + 1} marked as editable`;

    // Log the action
    console.log(`📝 Order ${order.orderNumber} - ${message} by ${currentUser}`);

    return NextResponse.json({ 
      success: true,
      message,
      order: updatedOrder,
      itemIndex,
      isUneditable,
      updatedBy: currentUser,
      updatedAt: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error("Error toggling item uneditable status:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: (error as Error).message },
      { status: 500 }
    );
  }
}