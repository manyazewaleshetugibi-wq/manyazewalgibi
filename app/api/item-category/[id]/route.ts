import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { validateItemCategoryData } from "@/models/Item";
import { uploadImage } from "@/utils/uploadImages";
import { ObjectId } from "mongodb";


const createResponse = (status: number, success: boolean, message: string, data: any = null) => {
    return NextResponse.json({ success, message, data }, { status });
  };

  
// ✅ Update an existing Item Category
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) return createResponse(400, false, "Invalid category ID");

    const body = await req.json();

    // ✅ Process image upload if `imageBase64` is provided
    if (body.imageBase64) {
      body.imageUrl = await uploadImage(body.imageBase64);
      delete body.imageBase64; // Remove base64 data after upload
    }

    const parsed = validateItemCategoryData({
      ...body,
      updatedAt: new Date(),
    });

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("itemCategories").updateOne(
      { _id: new ObjectId(id) },
      { $set: parsed }
    );

    if (result.matchedCount === 0) return createResponse(404, false, "Category not found");

    return createResponse(200, true, "Category updated successfully");
  } catch (error) {
    console.error("PUT /item-category/[id] Error:", error);
    return createResponse(400, false, "Invalid request data");
  }
}


export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db();
    const category = await db.collection("itemCategories").findOne({ _id: new ObjectId(id) });

    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    return NextResponse.json({ success: true, category }, { status: 200 });
  } catch (error) {
    console.error("GET /item-category/[id] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}



// ✅ DELETE Category
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db();
    const result = await db.collection("itemCategories").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Category deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /item-category/[id] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
