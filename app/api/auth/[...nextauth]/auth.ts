import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

    // Get user ID from session
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

    // Find user in database
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

    // Remove sensitive data
    const { password, ...userWithoutPassword } = user;
    const u = userWithoutPassword as any;

    // Debug log


    // Extract city helper
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
        const trimmedPart = part.trim().toLowerCase();

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

    return NextResponse.json({
      success: true,

      data: {
        // IDs
        _id: u.id,
        id: u.id,

        // Personal
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        email: u.email || "",
        phone: u.phone || "",

        // Dates
        birthDate:
          u.birthDate || null,

        // Gender
        gender: u.gender || "",

        // Address
        address: u.address || "",
        city: extractCityFromAddress(
          u.address || ""
        ),

        // GeoJSON location
        location: u.location || {
          type: "Point",
          coordinates: [0, 0],
        },

        // Account
        role: u.role || "user",

        registrationSource:
          u.registrationSource ||
          "website",

        locationConsent:
          u.locationConsent || false,

        // Timestamps
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        lastLogin:
          u.lastLogin || null,

        // Security
        loginAttempts:
          u.loginAttempts || 0,

        // Additional optional fields
        image: u.image || null,
        employeeId:
          u.employeeId || null,

        permissions:
          u.permissions || [],

        status: u.status || null,

        requiresPasswordChange:
          u.requiresPasswordChange ||
          false,

        googleId:
          u.googleId || null,

        emailVerified:
          u.emailVerified || null,

        specialization:
          u.specialization || null,

        shift: u.shift || null,
      },
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