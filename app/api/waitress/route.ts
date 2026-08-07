// app/api/waitress/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { ShiftType } from "@/models/Waitress";

export async function GET(req: NextRequest) {
    try {
        // --- Automatic registration of POS users as waitresses ---
        // 1. Get all users with "pos" role
        const posUsers = await prisma.user.findMany({
            where: { role: "pos" },
            take: 1000,
        });

        // 2. Get all existing waitresses who were registered from a user account
        const existingWaitresses = await prisma.waitress.findMany({
            where: { userId: { not: null } },
            select: { userId: true },
        });
        
        const existingWaitressUserIds = new Set(existingWaitresses.map(w => w.userId).filter(Boolean));

        const newWaitressesToRegister: any[] = [];

        // 3. Check which POS users are not yet registered as waitresses
        for (const user of posUsers) {
            if (!existingWaitressUserIds.has(user.id)) {
                const userShift = (user.shift || "").toUpperCase() as ShiftType;
                const newWaitress = {
                    id: randomUUID(),
                    name: user.name || "",
                    phone: user.phone || "N/A",
                    shift: Object.values(ShiftType).includes(userShift) ? userShift : ShiftType.MORNING,
                    isActive: user.status === 'active',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                    registeredFromUser: true,
                    registrationDate: new Date(),
                };
                newWaitressesToRegister.push(newWaitress);
            }
        }

        // 4. Batch insert new waitresses if any
        if (newWaitressesToRegister.length > 0) {
            await prisma.waitress.createMany({
                data: newWaitressesToRegister,
            });
        }

        // 5. Get all waitresses
        const allWaitresses = await prisma.waitress.findMany({
            orderBy: { name: 'asc' },
        });

        // 6. Return success with data
        return NextResponse.json({ 
            success: true,
            data: allWaitresses.map((w: any) => ({ ...w, _id: w.id })),
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

        // Check for duplicate before inserting
        const existing = await prisma.waitress.findFirst({ 
            where: { 
                name: { equals: name.trim(), mode: 'insensitive' },
                phone: phone.trim()
            }
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

        // Get the created waitress WITHOUT email
        const { email, ...createdWaitress } = await prisma.waitress.create({
            data: {
                id: randomUUID(),
                name: name.trim(),
                phone: phone.trim(),
                shift,
                isActive: isActive ?? true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        });

        return NextResponse.json(
            { 
                success: true,
                data: { ...createdWaitress, _id: createdWaitress.id },
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
