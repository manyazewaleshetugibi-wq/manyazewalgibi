import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// PUT - Update training details
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const trainingId = params.id;
    const body = await request.json();
    const { title, description, linkUrl, type } = body;

    if (!ObjectId.isValid(trainingId)) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid training ID" 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("gold");

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

    const result = await db.collection("trainings").updateOne(
      { _id: new ObjectId(trainingId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ 
        success: false,
        error: "Training not found" 
      }, { status: 404 });
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
  { params }: { params: { id: string } }
) {
  try {
    const trainingId = params.id;
    console.log('Deleting training:', trainingId);

    if (!ObjectId.isValid(trainingId)) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid training ID" 
      }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("gold");
    
    // Get training first
    const training = await db.collection("trainings").findOne({ 
      _id: new ObjectId(trainingId) 
    });

    if (!training) {
      return NextResponse.json({ 
        success: false,
        error: "Training not found" 
      }, { status: 404 });
    }

    // Delete from MongoDB
    const result = await db.collection("trainings").deleteOne({ 
      _id: new ObjectId(trainingId) 
    });

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