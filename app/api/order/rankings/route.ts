import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { debugLog, debugError } from "../../utils/orderHelpers";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const sortBy = url.searchParams.get("sortBy") || "points";
    const role = url.searchParams.get("role");

    let query: any = {};
    if (role) {
      query = { role: { equals: role, mode: 'insensitive' } };
    }

    const rankings = await prisma.employeeRank.findMany({
      where: query,
      orderBy: { [sortBy]: 'desc' } as any,
      take: limit
    });

    const allRanked = await prisma.employeeRank.findMany({ where: query });

    const sum = (arr: any[], field: string) =>
      arr.reduce((acc, e) => acc + (e[field] || 0), 0);

    const stats = {
      totalEmployees: allRanked.length,
      totalCompletedOrders: sum(allRanked, 'completedOrders'),
      totalOrders: sum(allRanked, 'totalOrders'),
      totalPoints: sum(allRanked, 'points'),
      averageCompletedOrders: allRanked.length > 0 ? sum(allRanked, 'completedOrders') / allRanked.length : 0,
      averagePoints: allRanked.length > 0 ? sum(allRanked, 'points') / allRanked.length : 0
    };

    return NextResponse.json({
      success: true,
      rankings: rankings.map(r => ({ ...r, _id: r.id })),
      stats,
      count: rankings.length,
      timestamp: new Date()
    }, { status: 200 });

  } catch (error) {
    debugError("Error fetching employee rankings:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch employee rankings", details: (error as Error).message },
      { status: 500 }
    );
  }
}
