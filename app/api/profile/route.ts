import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

import { auth } from "@/auth";
import bcrypt from 'bcrypt';

// Define profile update schema
interface ProfileUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  avatar?: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(session.user.id) },
      { 
        projection: { 
          password: 0, // Exclude password
          resetToken: 0,
          resetTokenExpiry: 0 
        }
      }
    );

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        user 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const body: ProfileUpdateData = await req.json();

    // Validate required fields
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    const existingUser = await db.collection("users").findOne({
      email: body.email,
      _id: { $ne: new ObjectId(session.user.id) }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email is already taken" },
        { status: 400 }
      );
    }

    // Get current user for password validation
    const currentUser = await db.collection("users").findOne(
      { _id: new ObjectId(session.user.id) }
    );

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      name: body.name,
      email: body.email,
      updatedAt: new Date()
    };

    // Add optional fields if provided
    if (body.phone) updateData.phone = body.phone;
    if (body.address) updateData.address = body.address;
    if (body.avatar) updateData.avatar = body.avatar;

    // Handle password change if provided
    if (body.currentPassword && body.newPassword && body.confirmPassword) {
      // Validate password requirements
      if (body.newPassword.length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters long" },
          { status: 400 }
        );
      }

      if (body.newPassword !== body.confirmPassword) {
        return NextResponse.json(
          { error: "New password and confirmation do not match" },
          { status: 400 }
        );
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        body.currentPassword,
        currentUser.password
      );

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }

      // Hash new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(body.newPassword, saltRounds);
      updateData.password = hashedPassword;
      updateData.passwordChangedAt = new Date();
    }

    // Update user in database
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Fetch updated user data (excluding sensitive fields)
    const updatedUser = await db.collection("users").findOne(
      { _id: new ObjectId(session.user.id) },
      { 
        projection: { 
          password: 0,
          resetToken: 0,
          resetTokenExpiry: 0 
        }
      }
    );

    return NextResponse.json(
      { 
        success: true, 
        message: "Profile updated successfully",
        user: updatedUser,
        passwordChanged: !!body.newPassword
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const dbClient = await clientPromise;
    const db = dbClient.db("gold");
    const body = await req.json();

    // Validate request body
    if (!body.field || !body.value) {
      return NextResponse.json(
        { error: "Field and value are required" },
        { status: 400 }
      );
    }

    // Define allowed fields for partial updates
    const allowedFields = ["name", "email", "phone", "address", "avatar"];
    
    if (!allowedFields.includes(body.field)) {
      return NextResponse.json(
        { error: "Invalid field for update" },
        { status: 400 }
      );
    }

    // Special validation for email
    if (body.field === "email") {
      // Check if email is already taken by another user
      const existingUser = await db.collection("users").findOne({
        email: body.value,
        _id: { $ne: new ObjectId(session.user.id) }
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email is already taken" },
          { status: 400 }
        );
      }
    }

    // Update specific field
    const updateData = {
      [body.field]: body.value,
      updatedAt: new Date()
    };

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Fetch updated user data
    const updatedUser = await db.collection("users").findOne(
      { _id: new ObjectId(session.user.id) },
      { 
        projection: { 
          password: 0,
          resetToken: 0,
          resetTokenExpiry: 0 
        }
      }
    );

    return NextResponse.json(
      { 
        success: true, 
        message: `${body.field} updated successfully`,
        user: updatedUser
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating profile field:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
