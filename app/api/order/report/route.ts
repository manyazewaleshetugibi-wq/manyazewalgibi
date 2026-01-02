import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    
    const orders = await db.collection("orders").find({ status: "COMPLETED" }).toArray();

    let totalSales = 0;
    let totalTax = 0;
    let totalDiscounts = 0;

    const dailySales: Record<string, number> = {};

    orders.forEach((order) => {
      let date: string;
      try {
        if (order.createdAt instanceof Date) {
          date = order.createdAt.toISOString().split("T")[0];
        } else if (typeof order.createdAt === "string") {
          date = order.createdAt.split("T")[0];
        } else {
          date = new Date().toISOString().split("T")[0];
        }
      } catch (e) {
        date = new Date().toISOString().split("T")[0];
      }

      const finalAmount = Number(order.finalAmount) || 0;
      const tax = Number(order.tax) || 0;
      const discount = Number(order.discount) || 0;

      if (!dailySales[date]) dailySales[date] = 0;

      dailySales[date] += finalAmount;
      totalSales += finalAmount;
      totalTax += tax;
      totalDiscounts += discount;
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
