import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await the params Promise
    const { id } = await params;
    
    const client = await clientPromise;
    const db = client.db("gold");
    const contentCollection = db.collection("contents");

    const content = await contentCollection.findOne({ _id: new ObjectId(id) });

    if (!content) {
      return NextResponse.json({ message: "Content not found" }, { status: 404 });
    }

    return NextResponse.json(content);
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
    // Await the params Promise
    const { id } = await params;
    
    const client = await clientPromise;
    const db = client.db("gold");
    const contentCollection = db.collection("contents");

    const data = await req.json();

    const result = await contentCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: data }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ message: "Content not found" }, { status: 404 });
    }

    const updatedContent = await contentCollection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json(updatedContent);
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
    // Await the params Promise
    const { id } = await params;
    
    const client = await clientPromise;
    const db = client.db("gold");
    const contentCollection = db.collection("contents");

    const result = await contentCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
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