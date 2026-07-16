import { NextResponse } from "next/server";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
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

    const { password, ...userWithoutPassword } = user;

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
        _id: userWithoutPassword._id.toString(),
        id: userWithoutPassword._id.toString(),

        firstName: userWithoutPassword.firstName || "",
        lastName: userWithoutPassword.lastName || "",
        email: userWithoutPassword.email || "",
        phone: userWithoutPassword.phone || "",

        birthDate:
          userWithoutPassword.birthDate || null,

        gender: userWithoutPassword.gender || "",

        address: userWithoutPassword.address || "",
        city: extractCityFromAddress(
          userWithoutPassword.address || ""
        ),

        location: userWithoutPassword.location || {
          type: "Point",
          coordinates: [0, 0],
        },

        role: userWithoutPassword.role || "user",

        registrationSource:
          userWithoutPassword.registrationSource ||
          "website",

        locationConsent:
          userWithoutPassword.locationConsent || false,

        createdAt: userWithoutPassword.createdAt,
        updatedAt: userWithoutPassword.updatedAt,
        lastLogin:
          userWithoutPassword.lastLogin || null,

        loginAttempts:
          userWithoutPassword.loginAttempts || 0,

        __v: userWithoutPassword.__v,

        image: userWithoutPassword.image || null,
        employeeId:
          userWithoutPassword.employeeId || null,

        permissions:
          userWithoutPassword.permissions || [],

        status: userWithoutPassword.status || null,

        requiresPasswordChange:
          userWithoutPassword.requiresPasswordChange ||
          false,

        googleId:
          userWithoutPassword.googleId || null,

        emailVerified:
          userWithoutPassword.emailVerified || null,

        specialization:
          userWithoutPassword.specialization || null,

        shift: userWithoutPassword.shift || null,
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
