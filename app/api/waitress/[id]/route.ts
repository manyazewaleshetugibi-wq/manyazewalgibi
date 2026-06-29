



// app/api/waitress/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const COLLECTION_NAME = "waitresses";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        if (!id || !ObjectId.isValid(id)) {
            return NextResponse.json({ 
                success: false,
                message: "Invalid ID format" 
            }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("gold");
        
        // Get waitress WITHOUT email field
        const waitress = await db.collection(COLLECTION_NAME)
            .findOne(
                { _id: new ObjectId(id) },
                { projection: { email: 0 } } // Exclude email
            );

        if (!waitress) {
            return NextResponse.json({ 
                success: false,
                message: "Waitress not found" 
            }, { status: 404 });
        }

        return NextResponse.json({ 
            success: true,
            data: waitress,
            message: "Waitress data retrieved successfully" 
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error fetching waitress:', error);
        return NextResponse.json(
            { 
                success: false,
                message: "Error fetching waitress" 
            }, 
            { status: 500 }
        );
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ 
                success: false,
                message: "Invalid ID format" 
            }, { status: 400 });
        }

        const body = await req.json();
        
        // Remove email from update if present (prevent updating email)
        delete body.email;
        
        body.updatedAt = new Date();

        const client = await clientPromise;
        const db = client.db("gold");
        const result = await db.collection(COLLECTION_NAME).updateOne(
            { _id: new ObjectId(id) },
            { $set: body }
        );

        if (!result.modifiedCount) {
            const message = result.matchedCount ? "No changes applied" : "Waitress not found";
            return NextResponse.json({ 
                success: result.matchedCount,
                message 
            }, { status: result.matchedCount ? 200 : 404 });
        }

        // Get the updated waitress WITHOUT email
        const updatedWaitress = await db.collection(COLLECTION_NAME)
            .findOne(
                { _id: new ObjectId(id) },
                { projection: { email: 0 } } // Exclude email
            );

        return NextResponse.json({ 
            success: true,
            data: updatedWaitress,
            message: "Waitress updated successfully" 
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error updating waitress:', error);
        return NextResponse.json(
            { 
                success: false,
                message: "Error updating waitress" 
            }, 
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ 
                success: false,
                message: "Invalid ID format" 
            }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db("gold");
        
        // Get waitress to check if it exists and get userId
        const waitress = await db.collection(COLLECTION_NAME)
            .findOne(
                { _id: new ObjectId(id) },
                { projection: { userId: 1 } } // Only get userId
            );

        if (!waitress) {
            return NextResponse.json({ 
                success: false,
                message: "Waitress not found" 
            }, { status: 404 });
        }

        const result = await db.collection(COLLECTION_NAME).deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount && waitress.userId) {
            await db.collection("users").deleteOne({ _id: new ObjectId(waitress.userId) });
        }

        return NextResponse.json({ 
            success: true,
            message: "Waitress deleted successfully" 
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error deleting waitress:', error);
        return NextResponse.json(
            { 
                success: false,
                message: "Error deleting waitress" 
            }, 
            { status: 500 }
        );
    }
}
