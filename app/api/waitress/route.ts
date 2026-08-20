// app/api/waitress/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { ShiftType } from "@/models/Waitress";

export async function GET(req: NextRequest) {
    try {
        // Get all waitresses (with optional sync of POS users)
        const allWaitresses = await prisma.waitress.findMany({
            orderBy: { name: 'asc' },
        });

        return NextResponse.json({ 
            success: true,
            data: allWaitresses.map((w: any) => ({ ...w, _id: w.id })),
            message: "Waitress data retrieved successfully",
            count: allWaitresses.length
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
