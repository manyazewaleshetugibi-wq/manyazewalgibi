import { NextResponse } from "next/server";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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

    const client = await clientPromise;
    const db = client.db();

    // Get user ID
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

    // Find user
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

    // Remove password
    const { password, ...userWithoutPassword } = user;

    console.log("User data fetched:", {
      id: userWithoutPassword._id,
      firstName: userWithoutPassword.firstName,
      lastName: userWithoutPassword.lastName,
      email: userWithoutPassword.email,
      phone: userWithoutPassword.phone,
      address: userWithoutPassword.address,
    });

    // Extract city
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

    return NextResponse.json({
      success: true,

      data: {
        _id: userWithoutPassword._id.toString(),

        firstName:
          userWithoutPassword.firstName || "",

        lastName:
          userWithoutPassword.lastName || "",

        email: userWithoutPassword.email || "",

        phone: userWithoutPassword.phone || "",

        birthDate:
          userWithoutPassword.birthDate || null,

        gender: userWithoutPassword.gender || "",

        address:
          userWithoutPassword.address || "",

        city: extractCityFromAddress(
          userWithoutPassword.address || ""
        ),

        location:
          userWithoutPassword.location || null,

        role: userWithoutPassword.role || "user",

        registrationSource:
          userWithoutPassword.registrationSource ||
          "website",

        locationConsent:
          userWithoutPassword.locationConsent ||
          false,

        createdAt:
          userWithoutPassword.createdAt,

        updatedAt:
          userWithoutPassword.updatedAt,

        lastLogin:
          userWithoutPassword.lastLogin || null,

        loginAttempts:
          userWithoutPassword.loginAttempts || 0,

        image: userWithoutPassword.image,

        employeeId:
          userWithoutPassword.employeeId,

        permissions:
          userWithoutPassword.permissions,

        status: userWithoutPassword.status,

        requiresPasswordChange:
          userWithoutPassword.requiresPasswordChange,

        googleId:
          userWithoutPassword.googleId,

        emailVerified:
          userWithoutPassword.emailVerified,

        specialization:
          userWithoutPassword.specialization,

        shift: userWithoutPassword.shift,
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
        error: error.message,
      },
      { status: 500 }
    );
  }
}