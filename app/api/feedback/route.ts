import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { FeedbackSchema } from "@/models/Feedback";

// POST: Create Feedback
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate and parse feedback data
    const validatedFeedback = FeedbackSchema.parse(body);

    // Create the feedback in the database
    const result = await prisma.feedback.create({
      data: {
        id: randomUUID(),
        ...validatedFeedback,
      },
    });

    return NextResponse.json(
      { success: true, feedbackId: result.id },
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
    // Extract query parameters for filtering and pagination
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);

    const feedback = await prisma.feedback.findMany({
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      feedback: feedback.map(f => ({ ...f, _id: f.id })),
    });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
