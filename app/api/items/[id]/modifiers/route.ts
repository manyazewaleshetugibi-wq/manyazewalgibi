import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireRole(["admin", "kitchen", "pos", "delivery", "barista", "coffee_maker", "stock_manager", "fb"]);
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const waiterId = searchParams.get('waiterId');
    
    if (!waiterId) {
      return NextResponse.json({ message: "Waiter ID is required" }, { status: 400 });
    }
    
    // Fetch orders registered by current user (waiterId)
    // Exclude orders with status "COMPLETED"
    const orders = await prisma.order.findMany({
      where: {
        waiterId: waiterId,
        status: { not: "COMPLETED" }
      }
    });

    return NextResponse.json({ 
      orders,
      count: orders.length
    });
    
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch orders'
    }, { status: 500 });
  }
}
