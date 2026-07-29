import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { uploadImage } from "@/types/utils/uploadImages";
import { ObjectId } from "mongodb";

const createResponse = (status: number, success: boolean, message: string, data: any = null) => {
    return NextResponse.json({ success, message, data }, { status });
};

// ✅ Fixed: Await params before accessing id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Changed type to Promise
) {
  try {
    const { id } = await params; // AWAIT the params Promise
    if (!ObjectId.isValid(id)) return createResponse(400, false, "Invalid category ID");

    const body = await req.json();

    if (body.imageBase64) {
      body.imageUrl = await uploadImage(body.imageBase64);
      delete body.imageBase64;
    }

    const updateData = {
      ...(body.name && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.type && { type: body.type }),
      ...(body.station && { station: body.station }),
      ...(body.imageUrl && { imageUrl: body.imageUrl }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      updatedAt: new Date(),
    };

    const client = await clientPromise;
    const db = client.db("gold");
    const result = await db.collection("itemCategories").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) return createResponse(404, false, "Category not found");
    return createResponse(200, true, "Category updated successfully");
  } catch (error) {
    console.error("PUT /item-category/[id] Error:", error);
    return createResponse(400, false, "Invalid request data");
  }
}

// ✅ Fixed: Await params
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Changed type
) {
  try {
    const { id } = await params; // AWAIT here
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("gold");
    const category = await db.collection("itemCategories").findOne({ _id: new ObjectId(id) });

    if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    return NextResponse.json({ success: true, category }, { status: 200 });
  } catch (error) {
    console.error("GET /item-category/[id] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ✅ Fixed: Await params
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Changed type
) {
  try {
    const { id } = await params; // AWAIT here
    if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db("gold");
    const result = await db.collection("itemCategories").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Category deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /item-category/[id] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}