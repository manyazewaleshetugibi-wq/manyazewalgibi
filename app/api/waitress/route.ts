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

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db("gold");

        // --- Automatic registration of POS users as waitresses ---

        // 1. Get all users with "pos" role
        const posUsers = await db.collection<PosUser>(USERS_COLLECTION_NAME).find({ role: "pos", waitresses: { $ne: true } }).project({ password: 0 }).toArray();

        // 2. Get all existing waitresses who were registered from a user account
        const existingWaitresses = await db.collection<Waitress>(COLLECTION_NAME).find({ userId: { $exists: true } }).project({ userId: 1 }).toArray();
        const existingWaitressUserIds = new Set(existingWaitresses.map(w => w.userId!.toString()));

        const newWaitressesToRegister: Waitress[] = [];
        const userIdsToUpdate: ObjectId[] = [];

        // 3. Check which POS users are not yet registered as waitresses
        for (const user of posUsers) {
            if (!existingWaitressUserIds.has(user._id.toString())) {
                const userShift = user.shift?.toUpperCase() as keyof typeof ShiftType;
                const newWaitress: Waitress = {
                    _id: new ObjectId(),
                    name: user.name,
                    phone: user.phone || "N/A", // Provide a default if phone is not available
                    shift: Object.values(ShiftType).includes(userShift) ? userShift : ShiftType.MORNING, // Default shift
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

        // 4. If there are new waitresses to register, insert them
        if (newWaitressesToRegister.length > 0) {
            await db.collection<Waitress>(COLLECTION_NAME).insertMany(newWaitressesToRegister);
        }

        if (userIdsToUpdate.length > 0) {
            await db.collection(USERS_COLLECTION_NAME).updateMany(
                { _id: { $in: userIdsToUpdate } },
                { $set: { waitresses: true } }
            );
        }

        // 5. Fetch and return all waitresses, including the newly registered ones
        const allWaitresses = await db.collection<Waitress>(COLLECTION_NAME).find({}).toArray();

        return NextResponse.json(allWaitresses, { status: 200 });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return NextResponse.json({ message: "Error fetching waitresses", error: errorMessage }, { status: 500 });
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
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        return NextResponse.json({ message: "Error adding waitress", error: errorMessage }, { status: 500 });
    }
}
