import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
    const orderId = params.id;

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
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Get items array (handle both 'items' and 'orderItems' fields)
    const items = (order.items as any) || [];
    const orderItems = (order.orderItems as any) || [];

    if (itemIndex < 0 || itemIndex >= Math.max(items.length, orderItems.length)) {
      return NextResponse.json({ error: "Invalid item index" }, { status: 400 });
    }

    // Mutate the specific item in JS (equivalent of Mongo dot-notation $set)
    const mutateItems = (arr: any[]) =>
      arr.map((item: any, idx: number) =>
        idx === itemIndex
          ? {
              ...item,
              isUneditable,
              uneditableAt: isUneditable ? new Date().toISOString() : null,
              uneditableBy: isUneditable ? currentUser : null,
            }
          : item
      );

    const updateData: any = {
      updatedAt: new Date()
    };

    // Update both 'items' and 'orderItems' if they exist
    if (items.length > 0) {
      updateData.items = mutateItems(items);
    }
    if (orderItems.length > 0) {
      updateData.orderItems = mutateItems(orderItems);
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData
    });

    const message = isUneditable
      ? `Item ${itemIndex + 1} marked as uneditable`
      : `Item ${itemIndex + 1} marked as editable`;

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
