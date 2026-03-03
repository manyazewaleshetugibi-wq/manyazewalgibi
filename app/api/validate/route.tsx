import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "vN7tL2mQ9rP3kW8yJ4hB5xC1dT6fM9zR2pK8wN3eJ5uQ4tL"; // Fallback for development; ensure JWT_SECRET is set in production

// Validate environment variables at runtime
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be set in environment variables");
}

export async function GET() {
  try {
    // Get session token from cookies
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session_token")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "No session token found" },
        { status: 401 }
      );
    }

    // Verify JWT token
    const decoded = jwt.verify(sessionToken, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
      category?: string;
    };

    // Return success with user data
    return NextResponse.json(
      {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        category: decoded.category,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    // Type error as unknown and narrow it
    let errorMessage = "Failed to validate session";
    let status = 500;

    if (error instanceof Error) {
      console.error("Session validation error:", {
        message: error.message,
        stack: error.stack,
      });

      if (error.name === "TokenExpiredError") {
        errorMessage = "Session token has expired. Please log in again.";
        status = 401;
      } else if (error.name === "JsonWebTokenError") {
        errorMessage = "Invalid session token.";
        status = 401;
      }
    } else {
      console.error("Unexpected error type:", error);
    }

    return NextResponse.json({ error: errorMessage }, { status });
  }
}

export const dynamic = "force-dynamic";