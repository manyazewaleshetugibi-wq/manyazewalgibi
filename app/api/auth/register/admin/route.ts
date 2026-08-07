import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"
import bcrypt from "bcrypt"
import { requireAdmin } from "@/lib/api-auth"

export async function POST(request: Request) {
  try {
    const { response: adminResponse } = await requireAdmin()
    if (adminResponse) return adminResponse

    const body = await request.json()
    const { email, password, name, role } = body

    const allowedRoles = ["admin", "kitchen", "fb", "marketing", "finance", "stock_manager", "pos", "delivery", "barista", "coffee_maker", "other"]
    if (!role || !allowedRoles.includes(String(role).toLowerCase())) {
      return NextResponse.json(
        { message: "Invalid role" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }
    
    const user = await prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        password: hashedPassword,
        name,
        role,
      },
    })

    return NextResponse.json({ message: "User created successfully", user: user.id }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: "Something went wrong", error }, { status: 500 })
  }
}
