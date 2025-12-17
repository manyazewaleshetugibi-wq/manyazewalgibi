import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { ShiftType, Waitress } from "@/models/Waitress";

const COLLECTION_NAME = "waitresses";

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db("gold");
        const waitresses = await db.collection<Waitress>(COLLECTION_NAME).find({}).toArray();

        return NextResponse.json(waitresses, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Error fetching waitresses", error }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, phone, shift, isActive } = body;

        if (!name || !phone || !shift) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        const newWaitress: Waitress = {
            _id: new ObjectId(),
            name,
            phone,
            shift,
            isActive: isActive ?? true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const client = await clientPromise;
        const db = client.db("gold");
        await db.collection(COLLECTION_NAME).insertOne(newWaitress);

        return NextResponse.json({ message: "Waitress added successfully" }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: "Error adding waitress", error }, { status: 500 });
    }
}
