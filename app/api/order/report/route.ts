import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    
    const orders = await db.collection("orders").find().toArray();

    let totalSales = 0;
    let totalTax = 0;
    let totalDiscounts = 0;

    const dailySales: Record<string, number> = {};

    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split("T")[0];
      if (!dailySales[date]) dailySales[date] = 0;

      dailySales[date] += order.finalAmount;
      totalSales += order.finalAmount;
      totalTax += order.tax;
      totalDiscounts += order.discount;
    });

    return NextResponse.json({
      totalSales,
      totalTax,
      totalDiscounts,
      dailySales,
      orderCount: orders.length,
      orders,
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
