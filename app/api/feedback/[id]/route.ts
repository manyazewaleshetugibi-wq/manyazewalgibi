import { NextRequest, NextResponse } from "next/server";
import clientPromise  from "@/lib/mongodb"; // Your MongoDB connection utility
import { FeedbackSchema } from "@/models/Feedback";
import { ObjectId } from "mongodb";

// PUT: Update Feedback
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db();
    const feedbackId = params.id;

    // Validate the feedback ID
    if (!ObjectId.isValid(feedbackId)) {
      return NextResponse.json({ error: "Invalid feedback ID" }, { status: 400 });
    }

    const body = await req.json();

    // Validate and parse updated feedback
    const validatedFeedback = FeedbackSchema.omit({ _id: true }).parse(body);

    // Update feedback in the database
    const result = await db
      .collection("feedback")
      .updateOne({ _id: new ObjectId(feedbackId) }, { $set: { ...validatedFeedback, updatedAt: new Date() } });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Feedback updated" }, { status: 200 });
  } catch (error) {
    console.error("Error updating feedback:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: Delete Feedback
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db();
    const feedbackId = params.id;

    // Validate feedback ID
    if (!ObjectId.isValid(feedbackId)) {
      return NextResponse.json({ error: "Invalid feedback ID" }, { status: 400 });
    }

    // Delete feedback from the database
    const result = await db.collection("feedback").deleteOne({ _id: new ObjectId(feedbackId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Feedback deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting feedback:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
