import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    const user = await prisma.user.findUnique(
      { where: { id: session.user.id } }
    );

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const { password, ...userWithoutPassword } = user;

    return NextResponse.json(
      { 
        success: true, 
        user: { ...userWithoutPassword, _id: userWithoutPassword.id }
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

    const body: ProfileUpdateData = await req.json();

    // Validate required fields
    if (!body.name || !body.email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email: body.email,
        id: { not: session.user.id }
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email is already taken" },
        { status: 400 }
      );
    }

    // Get current user for password validation
    const currentUser = await prisma.user.findUnique(
      { where: { id: session.user.id } }
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
    if (body.avatar) updateData.image = body.avatar;

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
        currentUser.password || ""
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
    }

    // Update user in database
    const result = await prisma.user.updateMany({ where: { id: session.user.id }, data: updateData });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Fetch updated user data (excluding sensitive fields)
    const fetchedUser = await prisma.user.findUnique(
      { where: { id: session.user.id } }
    );
    const { password, ...userWithoutPassword } = (fetchedUser as any) || {};

    return NextResponse.json(
      { 
        success: true, 
        message: "Profile updated successfully",
        user: { ...userWithoutPassword, _id: userWithoutPassword.id },
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
      const existingUser = await prisma.user.findFirst({
        where: {
          email: body.value,
          id: { not: session.user.id }
        }
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email is already taken" },
          { status: 400 }
        );
      }
    }

    // Map legacy field names to Prisma model fields
    const fieldMap: Record<string, string> = { avatar: 'image' };
    const dbField = fieldMap[body.field] || body.field;

    // Update specific field
    const updateData: any = {
      [dbField]: body.value,
      updatedAt: new Date()
    };

    const result = await prisma.user.updateMany({ where: { id: session.user.id }, data: updateData });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Fetch updated user data
    const fetchedUser = await prisma.user.findUnique(
      { where: { id: session.user.id } }
    );
    const { password, ...userWithoutPassword } = (fetchedUser as any) || {};

    return NextResponse.json(
      { 
        success: true, 
        message: `${body.field} updated successfully`,
        user: { ...userWithoutPassword, _id: userWithoutPassword.id }
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
