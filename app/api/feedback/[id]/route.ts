import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FeedbackSchema } from "@/models/Feedback";

// PUT: Update Feedback
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const body = await req.json();

    // Validate and parse updated feedback
    const validatedFeedback = FeedbackSchema.parse(body);

    // Update feedback in the database
    const result = await prisma.feedback.updateMany({
      where: { id },
      data: { ...validatedFeedback, updatedAt: new Date() },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Feedback updated" }, { status: 200 });
  } catch (error) {
    console.error("Error updating feedback:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: Delete Feedback
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Delete feedback from the database
    const result = await prisma.feedback.deleteMany({ where: { id } });

    if (result.count === 0) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Feedback deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting feedback:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
