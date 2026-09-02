// app/api/order/checkin-staff/route.ts
// Returns kitchen-role users from the database for the check-in assignment dropdown
// in order management. Accessible to any authenticated user so staff can assign
// kitchen staff to orders.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: {
        status: "active",
        role: { equals: "kitchen", mode: "insensitive" },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: users.map((u) => ({
        id: u.id,
        _id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      })),
      count: users.length,
    });
  } catch (error: any) {
    console.error("Error fetching check-in (kitchen) staff:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
