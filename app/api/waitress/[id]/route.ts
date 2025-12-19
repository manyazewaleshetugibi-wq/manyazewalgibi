import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";


const COLLECTION_NAME = "waitresses";

export async function GET(req: NextRequest) {
    try {
        // Extract id from the request URL
        const id = req.nextUrl.pathname.split("/").pop();

        if (!id || !ObjectId.isValid(id)) {
            return NextResponse.json({ message: "Invalid ID format" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("gold");
        const waitress = await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });

        if (!waitress) {
            return NextResponse.json({ message: "Waitress not found" }, { status: 404 });
        }

        return NextResponse.json(waitress, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Error fetching waitress", error }, { status: 500 });
    }
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: "Invalid ID format" }, { status: 400 });
        }

        const body = await req.json();
        body.updatedAt = new Date();

        const client = await clientPromise;
        const db = client.db("gold");
        const result = await db.collection(COLLECTION_NAME).updateOne(
            { _id: new ObjectId(id) },
            { $set: body }
        );

        if (!result.modifiedCount) {
            return NextResponse.json({ message: "Waitress not found or no changes applied" }, { status: 404 });
        }

        return NextResponse.json({ message: "Waitress updated successfully" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Error updating waitress", error }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: "Invalid ID format" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("gold");
        const waitress = await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(id) });

        if (!waitress) {
            return NextResponse.json({ message: "Waitress not found" }, { status: 404 });
        }

        const result = await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount && waitress.userId) {
            await db.collection("users").deleteOne({ _id: new ObjectId(waitress.userId) });
        }

        return NextResponse.json({ message: "Waitress deleted successfully" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Error deleting waitress", error }, { status: 500 });
    }
}
