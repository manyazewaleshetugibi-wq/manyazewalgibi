import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
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

    const client = await clientPromise
    const db = client.db("gold")

    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }
    
    const user = await db.collection("users").insertOne({
      email,
      password: hashedPassword,
      name,
      role, 
    })

    return NextResponse.json({ message: "User created successfully", user: user.insertedId }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: "Something went wrong", error }, { status: 500 })
  }
}

