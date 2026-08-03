


// app/api/waitress/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { ShiftType, Waitress } from "@/models/Waitress";

const COLLECTION_NAME = "waitresses";
const USERS_COLLECTION_NAME = "users";

// Define the shape of the User document we expect from the 'users' collection
interface PosUser {
    _id: ObjectId;
    name: string;
    email: string;
    phone?: string;
    shift?: string;
    role: string;
    status: 'active' | 'inactive' | 'suspended';
    waitresses?: boolean;
}

// Define the response type without email
interface WaitressResponse {
    _id: ObjectId;
    name: string;
    phone: string;
    shift: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    userId?: ObjectId;
    role?: string;
    registeredFromUser?: boolean;
    registrationDate?: Date;
    // email is EXCLUDED from response
}

export async function GET(req: NextRequest) {
    try {
        const client = await clientPromise;
        const db = client.db("gold");

        // --- Automatic registration of POS users as waitresses ---
        // 1. Get all users with "pos" role
        const posUsers = await db.collection<PosUser>(USERS_COLLECTION_NAME)
            .find({ role: "pos", waitresses: { $ne: true } })
            .project({ password: 0, __v: 0 })
            .limit(1000)
            .toArray();

        // 2. Get all existing waitresses who were registered from a user account
        const existingWaitresses = await db.collection<Waitress>(COLLECTION_NAME)
            .find({ userId: { $exists: true } })
            .project({ userId: 1 })
            .toArray();
        
        const existingWaitressUserIds = new Set(existingWaitresses.map(w => w.userId!.toString()));

        const newWaitressesToRegister: Waitress[] = [];
        const userIdsToUpdate: ObjectId[] = [];

        // 3. Check which POS users are not yet registered as waitresses
        for (const user of posUsers) {
            if (!existingWaitressUserIds.has(user._id.toString())) {
                const userShift = user.shift?.toUpperCase() as ShiftType;
                const newWaitress: Waitress = {
                    _id: new ObjectId(),
                    name: user.name,
                    phone: user.phone || "N/A",
                    shift: Object.values(ShiftType).includes(userShift) ? userShift : ShiftType.MORNING,
                    isActive: user.status === 'active',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    userId: user._id,
                    email: user.email,
                    role: user.role,
                    registeredFromUser: true,
                    registrationDate: new Date(),
                };
                newWaitressesToRegister.push(newWaitress);
                userIdsToUpdate.push(user._id);
            } else {
                userIdsToUpdate.push(user._id);
            }
        }

        // 4. Batch insert new waitresses if any
        if (newWaitressesToRegister.length > 0) {
            await db.collection<Waitress>(COLLECTION_NAME).insertMany(newWaitressesToRegister, {
                ordered: false
            });
        }

        // 5. Batch update users in smaller chunks if needed
        if (userIdsToUpdate.length > 0) {
            const chunkSize = 500;
            for (let i = 0; i < userIdsToUpdate.length; i += chunkSize) {
                const chunk = userIdsToUpdate.slice(i, i + chunkSize);
                await db.collection(USERS_COLLECTION_NAME).updateMany(
                    { _id: { $in: chunk } },
                    { $set: { waitresses: true } }
                );
            }
        }

        // 6. Get all waitresses
        const allWaitresses = await db.collection<Waitress>(COLLECTION_NAME)
            .find({})
            .sort({ name: 1 })
            .toArray();

        // 7. Return success with data
        return NextResponse.json({ 
            success: true,
            data: allWaitresses,
            message: "Waitress data retrieved and synchronized successfully",
            count: newWaitressesToRegister.length
        }, { status: 200 });
        
    } catch (error) {
        console.error('Error fetching waitresses:', error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return NextResponse.json(
            { 
                success: false, 
                message: "Error fetching waitresses", 
                error: errorMessage,
                data: [] 
            }, 
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, phone, shift, isActive } = body;

        if (!name || !phone || !shift) {
            return NextResponse.json(
                { 
                    success: false,
                    message: "Missing required fields", 
                    required: ["name", "phone", "shift"] 
                }, 
                { status: 400 }
            );
        }

        const newWaitress: Waitress = {
            _id: new ObjectId(),
            name: name.trim(),
            phone: phone.trim(),
            shift,
            isActive: isActive ?? true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const client = await clientPromise;
        const db = client.db("gold");
        
        // Check for duplicate before inserting
        const existing = await db.collection(COLLECTION_NAME).findOne({ 
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
            phone: phone.trim()
        });
        
        if (existing) {
            return NextResponse.json(
                { 
                    success: false,
                    message: "Waitress with this name and phone already exists" 
                }, 
                { status: 409 }
            );
        }
        
        const result = await db.collection(COLLECTION_NAME).insertOne(newWaitress);

        // Get the created waitress WITHOUT email
        const createdWaitress = await db.collection(COLLECTION_NAME)
            .findOne(
                { _id: result.insertedId },
                { projection: { email: 0 } } // Exclude email
            );

        return NextResponse.json(
            { 
                success: true,
                data: createdWaitress,
                message: "Waitress added successfully" 
            }, 
            { status: 201 }
        );
        
    } catch (error) {
        console.error('Error adding waitress:', error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return NextResponse.json(
            { 
                success: false,
                message: "Error adding waitress", 
                error: errorMessage 
            }, 
            { status: 500 }
        );
    }
}