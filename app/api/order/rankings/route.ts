import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { debugLog, debugError } from "../../utils/orderHelpers";

export async function GET(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const sortBy = url.searchParams.get("sortBy") || "points";
    const role = url.searchParams.get("role");

    let query = {};
    if (role) {
      query = { role: { $regex: new RegExp(`^${role}$`, 'i') } };
    }

    const rankings = await db.collection("employee_rank")
      .find(query)
      .sort({ [sortBy]: -1 })
      .limit(limit)
      .toArray();

    const stats = await db.collection("employee_rank").aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          totalCompletedOrders: { $sum: "$completedOrders" },
          totalOrders: { $sum: "$totalOrders" },
          totalPoints: { $sum: "$points" },
          averageCompletedOrders: { $avg: "$completedOrders" },
          averagePoints: { $avg: "$points" }
        }
      }
    ]).toArray();

    return NextResponse.json({
      success: true,
      rankings,
      stats: stats[0] || {},
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