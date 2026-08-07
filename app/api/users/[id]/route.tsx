// app/api/user/route.ts - FIXED VERSION (HIDES SENSITIVE DATA)

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get authenticated session
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

    // Get user ID
    const userId = session.user.id;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user ID format",
        },
        { status: 400 }
      );
    }

    // Find user (just to verify existence)
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    // Remove password from memory
    const { password, ...userWithoutPassword } = user;



    // Extract city (for internal use only)
    const extractCityFromAddress = (
      address: string
    ): string => {
      if (!address) return "Addis Ababa";

      const addressParts = address.split(",");

      const cityKeywords = [
        "addis ababa",
        "bole",
        "kazanchis",
        "megenagna",
        "piassa",
        "merkato",
        "sarbet",
        "cazanchis",
        "old airport",
        "new airport",
        "ayertena",
        "summit",
        "gerji",
        "atlas",
        "gotera",
        "lafto",
        "mexico",
        "saris",
        "kera",
        "akaki",
        "kality",
        "kaliti",
      ];

      for (const part of addressParts) {
        const trimmedPart = part
          .trim()
          .toLowerCase();

        if (
          cityKeywords.some((keyword) =>
            trimmedPart.includes(keyword)
          )
        ) {
          return part.trim();
        }
      }

      if (addressParts.length > 1) {
        return (
          addressParts[addressParts.length - 2]?.trim() ||
          "Addis Ababa"
        );
      }

      return "Addis Ababa";
    };

    // Extract city (for internal use only)
    const city = extractCityFromAddress(
      userWithoutPassword.address || ""
    );

    // Return only success message - HIDE ALL DATA
    return NextResponse.json({
      success: true,
      message: "User data retrieved successfully",
      // OPTIONAL: If you need minimal data for the frontend, uncomment below
      // data: {
      //   _id: userWithoutPassword._id.toString(),
      //   email: userWithoutPassword.email || "",
      //   role: userWithoutPassword.role || "user",
      //   status: userWithoutPassword.status || "active",
      // }
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
        error: error.message,
      },
      { status: 500 }
    );
  }
}
