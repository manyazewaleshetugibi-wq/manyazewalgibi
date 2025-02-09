import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { validateItemData } from "@/models/Item";
import { uploadImage } from "@/utils/uploadImages";
import { ObjectId } from "mongodb";

/**
 * Get, Update, or Delete an Item by ID.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid Item ID" },
        { status: 400 }
      )
    }

    const dbClient = await clientPromise;
    const db = dbClient.db();
        const item = await db.collection('items').findOne({ _id: new ObjectId(id) })

    if (!item) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: item })
  } catch (error) {
    console.error('Error fetching item:', error)
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    )
  }
}


export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid Item ID" }, { status: 400 });
    }

    const body = await req.json();
    const dbClient = await clientPromise;
    const db = dbClient.db();

    // Handle image upload if `imageBase64` is provided
    let imageUrl = body.imageUrl;
    if (body.imageBase64) {
      imageUrl = await uploadImage(body.imageBase64);
    }

    // Validate item data
    const validatedData = validateItemData({
      ...body,
      imageUrl, // Use the uploaded image URL
    });

    // Ensure valid category and stock IDs
    if (!ObjectId.isValid(validatedData.categoryId)) {
      return NextResponse.json({ success: false, message: "Invalid category ID" }, { status: 400 });
    }

    validatedData.requiredStock.forEach((stock) => {
      if (!ObjectId.isValid(stock.stockId)) {
        throw new Error(`Invalid stock ID: ${stock.stockId}`);
      }
    });

    const updateResult = await db.collection("items").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...validatedData,
          categoryId: new ObjectId(validatedData.categoryId),
          requiredStock: validatedData.requiredStock.map((stock) => ({
            stockId: new ObjectId(stock.stockId),
            quantity: stock.quantity,
          })),
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json({ success: false, message: "Item not updated" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Item updated successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating item:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid Item ID" }, { status: 400 });
    }

    const dbClient = await clientPromise;
    const db = dbClient.db();

    const deleteResult = await db.collection("items").deleteOne({ _id: new ObjectId(id) });

    if (deleteResult.deletedCount === 0) {
      return NextResponse.json({ success: false, message: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Item deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting item:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
