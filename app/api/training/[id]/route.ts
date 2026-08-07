import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT - Update training details
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Await the params Promise
    const { id: trainingId } = await params;
    
    const body = await request.json();
    const { title, description, linkUrl, type } = body;

    const updateData: any = {
      title,
      description,
      type,
      updatedAt: new Date(),
    };

    // If linkUrl is provided, update it and ensure fileUrl is updated
    if (linkUrl !== undefined) {
      if (linkUrl && !linkUrl.startsWith('http')) {
        return NextResponse.json({
          success: false,
          error: "Invalid link URL. Must start with http(s)://",
        }, { status: 400 });
      }
      updateData.fileUrl = linkUrl;
    }

    try {
      await prisma.training.update(
        { where: { id: trainingId }, data: updateData }
      );
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return NextResponse.json({ 
          success: false,
          error: "Training not found" 
        }, { status: 404 });
      }
      throw e;
    }

    return NextResponse.json({ 
      success: true,
      message: "Training updated successfully" 
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error updating training:", error);
    return NextResponse.json({ 
      success: false,
      error: error.message || "Failed to update training" 
    }, { status: 500 });
  }
}

// DELETE - Delete training
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Await the params Promise
    const { id: trainingId } = await params;
    


    // Get training first
    const training = await prisma.training.findUnique({ 
      where: { id: trainingId } 
    });

    if (!training) {
      return NextResponse.json({ 
        success: false,
        error: "Training not found" 
      }, { status: 404 });
    }

    const result = await prisma.training.deleteMany({ 
      where: { id: trainingId } 
    });

    if (result.count === 0) {
      return NextResponse.json({ 
        success: false,
        error: "Failed to delete training" 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: "Training deleted successfully",
      deletedId: trainingId
    }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting training:", error);
    return NextResponse.json({ 
      success: false,
      error: error.message || "Failed to delete training" 
    }, { status: 500 });
  }
}
