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

    // Remove sensitive data
    const { password, ...userWithoutPassword } = user;

    // Debug log
    console.log("User data fetched from DB:", {
      _id: userWithoutPassword._id,
      firstName: userWithoutPassword.firstName,
      lastName: userWithoutPassword.lastName,
      email: userWithoutPassword.email,
      phone: userWithoutPassword.phone,
      address: userWithoutPassword.address,
      location: userWithoutPassword.location,
    });

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
        // Mongo IDs
        _id: userWithoutPassword._id.toString(),
        id: userWithoutPassword._id.toString(),

        // Personal
        firstName: userWithoutPassword.firstName || "",
        lastName: userWithoutPassword.lastName || "",
        email: userWithoutPassword.email || "",
        phone: userWithoutPassword.phone || "",

        // Dates
        birthDate:
          userWithoutPassword.birthDate || null,

        // Gender
        gender: userWithoutPassword.gender || "",

        // Address
        address: userWithoutPassword.address || "",
        city: extractCityFromAddress(
          userWithoutPassword.address || ""
        ),

        // GeoJSON location
        location: userWithoutPassword.location || {
          type: "Point",
          coordinates: [0, 0],
        },

        // Account
        role: userWithoutPassword.role || "user",

        registrationSource:
          userWithoutPassword.registrationSource ||
          "website",

        locationConsent:
          userWithoutPassword.locationConsent || false,

        // Timestamps
        createdAt: userWithoutPassword.createdAt,
        updatedAt: userWithoutPassword.updatedAt,
        lastLogin:
          userWithoutPassword.lastLogin || null,

        // Security
        loginAttempts:
          userWithoutPassword.loginAttempts || 0,

        __v: userWithoutPassword.__v,

        // Additional optional fields
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

        // ============================================
        // 🔔 NOTIFICATION FIELDS - ADDED FOR FCM SUPPORT
        // ============================================
        
        // Array of FCM device tokens for push notifications
        fcmTokens: userWithoutPassword.fcmTokens || [],
        
        // User online status (true/false)
        online: userWithoutPassword.online || false,
        
        // Timestamp of last user activity
        lastSeen: userWithoutPassword.lastSeen || null,
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