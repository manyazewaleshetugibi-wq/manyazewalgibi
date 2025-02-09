import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { validateItemCategoryData } from "@/models/Item";
import { uploadImage } from "@/utils/uploadImages";
import { ObjectId } from "mongodb";

// ✅ Utility function for consistent responses
const createResponse = (status: number, success: boolean, message: string, data: any = null) => {
  return NextResponse.json({ success, message, data }, { status });
};
export async function POST(req: NextRequest) {
    try {
      const body = await req.json();
  
      if (body.imageBase64) {
        body.imageUrl = await uploadImage(body.imageBase64);
        delete body.imageBase64;
      }
  
      const parsed = validateItemCategoryData({
        ...body,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
  
      console.log("✅ Parsed Data:", parsed);
  
      const client = await clientPromise;
      const db = client.db();
  
      console.log("✅ Connected to DB");
  
      const result = await db.collection("itemCategories").insertOne({
        ...parsed,
        _id: new ObjectId(),
      });
  
      console.log("✅ Insert Result:", result);
  
      if (!result.acknowledged) throw new Error("Insertion failed");
  
      return createResponse(201, true, "Category created successfully", {
        _id: result.insertedId,
        ...parsed,
      });
    } catch (error) {
      console.error("❌ POST /item-category Error:", error);
      return createResponse(500, false, "Failed to create category");
    }
  }
  

// ✅ GET all categories
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const categories = await db.collection("itemCategories").find({}).toArray();

    return createResponse(200, true, "Item categories retrieved successfully", categories);
  } catch (error) {
    console.error("GET /item-category Error:", error);
    return createResponse(500, false, "Internal Server Error");
  }
}
