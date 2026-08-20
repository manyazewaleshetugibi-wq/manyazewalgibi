// app/api/waitress/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/api-auth";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        // Get waitress WITHOUT email field
        let waitress = await prisma.waitress.findUnique({
            where: { id }
        });

        if (!waitress) {
            waitress = await prisma.waiter.findUnique({
                where: { id }
            }) as any;
        }

        if (!waitress) {
            return NextResponse.json({ 
                success: false,
                message: "Waitress not found" 
            }, { status: 404 });
        }

        const { email, ...waitressWithoutEmail } = waitress;

        return NextResponse.json({ 
            success: true,
            data: { ...waitressWithoutEmail, _id: waitress.id },
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
        const { response } = await requireRole(["admin"]);
        if (response) return response;
        
        const { id } = await params;

        const body = await req.json();
        
        // Remove email from update if present (prevent updating email)
        delete body.email;
        
        body.updatedAt = new Date();

        const result = await prisma.waitress.updateMany({ where: { id }, data: body });

        if (result.count === 0) {
            return NextResponse.json({ 
                success: false,
                message: "Waitress not found" 
            }, { status: 404 });
        }

        // Get the updated waitress WITHOUT email
        const updatedWaitress = await prisma.waitress.findUnique({
            where: { id }
        });

        if (updatedWaitress) {
            const { email, ...updatedWaitressWithoutEmail } = updatedWaitress;
            return NextResponse.json({ 
                success: true,
                data: { ...updatedWaitressWithoutEmail, _id: updatedWaitress.id },
                message: "Waitress updated successfully" 
            }, { status: 200 });
        }

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
        const { response } = await requireRole(["admin"]);
        if (response) return response;
        
        const { id } = await params;

        // Get waitress to check if it exists and get userId
        const waitress = await prisma.waitress.findUnique({
            where: { id }
        });

        if (!waitress) {
            return NextResponse.json({ 
                success: false,
                message: "Waitress not found" 
            }, { status: 404 });
        }

        const result = await prisma.waitress.deleteMany({ where: { id } });

        if (result.count && waitress.userId) {
            await prisma.user.deleteMany({ where: { id: waitress.userId } });
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
