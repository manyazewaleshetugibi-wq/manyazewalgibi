import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadImage } from "@/types/utils/uploadImages";

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

    const body = await req.json();

    if (body.imageBase64) {
      body.imageUrl = await uploadImage(body.imageBase64);
      delete body.imageBase64;
    }

    const updateData: any = {
      ...(body.name && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.type && { type: body.type }),
      ...(body.imageUrl && { imageUrl: body.imageUrl }),
    };

    try {
      await prisma.itemCategory.update({ where: { id }, data: updateData });
    } catch (e: any) {
      if (e?.code === 'P2025') return createResponse(404, false, "Category not found");
      throw e;
    }

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

    const category = await prisma.itemCategory.findUnique({ where: { id } });

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

    const result = await prisma.itemCategory.deleteMany({ where: { id } });

    if (result.count === 0) return NextResponse.json({ error: "Category not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Category deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /item-category/[id] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
