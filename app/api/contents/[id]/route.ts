import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params Promise
    const { id } = await params;
    
    const content = await prisma.content.findUnique({ where: { id } });

    if (!content) {
      return NextResponse.json({ message: "Content not found" }, { status: 404 });
    }

    return NextResponse.json({ ...content, _id: content.id });
  } catch (error) {
    console.error("Error fetching content:", error);
    return NextResponse.json(
      { message: "Failed to fetch content", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireRole(["admin", "marketing"]);
    if (response) return response;
    
    const { id } = await params;
    
    const data = await req.json();

    const { _id, ...updateData } = data;

    const result = await prisma.content.updateMany({ where: { id }, data: updateData as any });

    if (result.count === 0) {
      return NextResponse.json({ message: "Content not found" }, { status: 404 });
    }

    const updatedContent = await prisma.content.findUnique({ where: { id } });

    return NextResponse.json(updatedContent ? { ...updatedContent, _id: updatedContent.id } : null);
  } catch (error) {
    console.error("Error updating content:", error);
    return NextResponse.json(
      { message: "Failed to update content", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireRole(["admin", "marketing"]);
    if (response) return response;
    
    const { id } = await params;
    
    const result = await prisma.content.deleteMany({ where: { id } });

    if (result.count === 0) {
      return NextResponse.json({ message: "Content not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Content deleted successfully" });
  } catch (error) {
    console.error("Error deleting content:", error);
    return NextResponse.json(
      { message: "Failed to delete content", error: (error as Error).message },
      { status: 500 }
    );
  }
}
