import { NextRequest, NextResponse } from "next/server";
import  clientPromise from "@/lib/mongodb"; // Your MongoDB connection utility
import { FeedbackSchema } from "@/models/Feedback";

// POST: Create Feedback
export async function POST(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const body = await req.json();

    // Validate and parse feedback data
    const validatedFeedback = FeedbackSchema.parse(body);

    // Create the feedback in the database
    const result = await db.collection("feedback").insertOne(validatedFeedback);

    return NextResponse.json(
      { success: true, feedbackId: result.insertedId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating feedback:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// GET: Retrieve Feedback (paginated and optional filtering)
export async function GET(req: NextRequest) {
  try {
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    // Extract query parameters for filtering and pagination
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);

    const feedbackCursor = db
      .collection("feedback")
      .find({  }) // Only public feedback visible
      .skip((page - 1) * limit)
      .limit(limit);

    const feedback = await feedbackCursor.toArray();

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
