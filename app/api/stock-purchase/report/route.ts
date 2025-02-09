import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db();

    // ✅ Extract query parameters
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // ✅ Validate required params
    if (!startDateParam || !endDateParam) {
      return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
    }

    // ✅ Convert to Date objects
    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);
    endDate.setHours(23, 59, 59, 999); // Ensure full-day range

    console.log("🔍 Start Date:", startDate);
    console.log("🔍 End Date:", endDate);

    // ✅ Fetch stock purchases with stock details
    const purchases = await db.collection("stock_purchases").aggregate([
      {
        $match: {
          purchaseDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $addFields: {
          stockIdObject: { $toObjectId: "$stockId" } // ✅ Convert `stockId` to `ObjectId`
        }
      },
      {
        $lookup: {
          from: "stocks", // ✅ Ensure this matches your stock collection name
          localField: "stockIdObject",
          foreignField: "_id",
          as: "stockDetails"
        }
      },
      {
        $unwind: {
          path: "$stockDetails",
          preserveNullAndEmptyArrays: true // ✅ Handle cases where stock details might be missing
        }
      },
      {
        $project: {
          _id: 1,
          stockId: 1,
          purchaseDate: 1,
          quantity: 1,
          unitPrice: 1,
          totalCost: { $multiply: ["$quantity", "$unitPrice"] }, // ✅ Calculate total cost
          stock: {
            name: "$stockDetails.name",
            categoryId: "$stockDetails.categoryId",
            unit: "$stockDetails.unit",
          
          }
        }
      }
    ]).toArray();

    return NextResponse.json({ success: true, data: purchases }, { status: 200 });

  } catch (error) {
    console.error("❌ Error fetching stock purchase report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
