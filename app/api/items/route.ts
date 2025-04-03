import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { validateItemData } from "@/models/Item";
import { uploadImage } from "@/utils/uploadImages";
import { ObjectId } from "mongodb";

/**
 * Handles creating a new item with optional image upload.
 */
export async function POST(req: NextRequest) {
    try {
      const body = await req.json();
      const dbClient = await clientPromise;
      const db = dbClient.db();
  
      // Check if image is Base64 and upload it
      let imageUrl = body.imageUrl;
      if (imageUrl.startsWith("data:image/")) {
        imageUrl = await uploadImage(imageUrl);
      }
  
      // Validate data
      const validatedData = validateItemData({
        ...body,
        imageUrl, // Ensure the image URL is valid before saving
      });
  
      // Ensure valid ObjectIds
      if (!ObjectId.isValid(validatedData.categoryId)) {
        return NextResponse.json({ success: false, message: "Invalid category ID" }, { status: 400 });
      }
  
      validatedData.requiredStock.forEach((stock) => {
        if (!ObjectId.isValid(stock.stockId)) {
          throw new Error(`Invalid stock ID: ${stock.stockId}`);
        }
      });
  
      // Insert into database
      const result = await db.collection("items").insertOne({
        ...validatedData,
        categoryId: new ObjectId(validatedData.categoryId),
        requiredStock: validatedData.requiredStock.map((stock) => ({
          stockId: new ObjectId(stock.stockId),
          quantity: stock.quantity,
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
  
      return NextResponse.json(
        {
          success: true,
          message: "Item created successfully",
          data: { ...validatedData, _id: result.insertedId },
        },
        { status: 201 }
      );
    } catch (error: any) {
      console.error("Error creating item:", error);
      return NextResponse.json(
        { success: false, message: error.message || "Internal Server Error" },
        { status: 500 }
      );
    }
  }
// ✅ GET all items
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const items = await db.collection("items").find({}).toArray();

    return NextResponse.json({ success: true, items }, { status: 200 });
  } catch (error) {
    console.error("GET /item Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
