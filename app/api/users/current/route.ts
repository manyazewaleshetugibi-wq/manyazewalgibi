import { NextResponse } from "next/server";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    // Get current authenticated session
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db("gold");

    // Get user ID from session
    const userId = session.user.id;

    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user ID format",
        },
        { status: 400 }
      );
    }

    // Find user in database
    const user = await db.collection("users").findOne({
      _id: new ObjectId(userId),
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    // Return ONLY success message - NO user data exposed
    return NextResponse.json({
      success: true,
      message: "User authenticated successfully"
    });
    
  } catch (error: any) {
    console.error(
      "Error fetching current user:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch user data",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}