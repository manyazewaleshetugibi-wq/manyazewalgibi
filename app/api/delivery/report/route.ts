import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const orders = await prisma.order.findMany({ where: { delivery: true } });

    let totalSales = 0;
    let totalTax = 0;
    let totalDiscounts = 0;

    const dailySales: Record<string, number> = {};

    orders.forEach((order) => {
      const date = order.createdAt
        ? order.createdAt.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      if (!dailySales[date]) dailySales[date] = 0;

      dailySales[date] += Number(order.finalAmount) || 0;
      totalSales += Number(order.finalAmount) || 0;
      totalTax += Number(order.tax) || 0;
      totalDiscounts += Number(order.discount) || 0;
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
