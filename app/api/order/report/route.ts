import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const orders = await prisma.order.findMany({ where: { status: "COMPLETED" } });

    let totalSales = 0;
    let totalTax = 0;
    let totalDiscounts = 0;

    const dailySales: Record<string, number> = {};

    orders.forEach((order) => {
      let date: string;
      try {
        // Use Ethiopia local date (UTC+3) for grouping
        const ETH_OFFSET_MS = 3 * 60 * 60 * 1000
        const createdAtMs = order.createdAt ? order.createdAt.getTime() : Date.now();
        const localDate = new Date(createdAtMs + ETH_OFFSET_MS)
        date = localDate.toISOString().split('T')[0]
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
      orders: orders.map(o => ({ ...o, _id: o.id })),
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
