// app/api/qr-history/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { requireRole } from '@/lib/api-auth';

function mapQrBody(body: any): any {
  const data: any = {};
  if (body.restaurantId !== undefined) data.restaurantId = body.restaurantId;
  if (body.restaurantName !== undefined) data.restaurantName = body.restaurantName;
  if (body.floor !== undefined) data.floor = body.floor;
  if (body.tableNumber !== undefined) data.tableNumber = Number(body.tableNumber);
  if (body.tableId !== undefined) data.tableId = body.tableId;
  if (body.qrCode !== undefined) data.qrCode = body.qrCode;
  if (body.versionV !== undefined) data.versionV = Number(body.versionV);
  if (body.scans !== undefined) data.scans = Number(body.scans);
  return data;
}

export async function GET() {
    const { response } = await requireRole(["admin", "manager"]);
    if (response) return response;

    try {
        const history = await prisma.qRHistory.findMany({
            orderBy: { generatedAt: 'desc' },
            take: 100
        });
        
        return NextResponse.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error('Error fetching QR history:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch QR history' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const { response } = await requireRole(["admin", "manager"]);
    if (response) return response;

    try {
        const body = await request.json();
        
        // Validate required fields
        if (!body.restaurantId || !body.floor || !body.tableId) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: restaurantId, floor, tableId' },
                { status: 400 }
            );
        }
        
        // Check if QR already exists for this table
        const existing = await prisma.qRHistory.findFirst({
            where: {
                restaurantId: body.restaurantId,
                floor: body.floor,
                tableId: body.tableId
            }
        });

        if (existing) {
            // Update existing record - preserve scan count
            const updated = await prisma.qRHistory.update({
                where: { id: existing.id },
                data: {
                    ...mapQrBody(body),
                    generatedAt: new Date(),
                    scans: existing.scans || 0,
                    lastUpdated: new Date(),
                    updatedAt: new Date()
                }
            });
            
            return NextResponse.json({
                success: true,
                data: updated,
                message: 'QR history updated'
            });
        }

        // Create new record
        const history = await prisma.qRHistory.create({
            data: {
                id: randomUUID(),
                ...mapQrBody(body),
                generatedAt: new Date(),
                scans: 0,
                lastUpdated: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        
        return NextResponse.json({
            success: true,
            data: history,
            message: 'QR history created'
        });
    } catch (error) {
        console.error('Error saving QR history:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save QR history: ' + (error instanceof Error ? error.message : 'Unknown error') },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        
        if (!id) {
            return NextResponse.json(
                { success: false, error: 'ID required' },
                { status: 400 }
            );
        }

        const body = await request.json().catch(() => ({}));
        const incrementScans = body.incrementScans !== false; // Default to true
        
        const existing = await prisma.qRHistory.findUnique({ where: { id } });
        
        if (!existing) {
            return NextResponse.json(
                { success: false, error: 'QR history not found' },
                { status: 404 }
            );
        }
        
        const updateData: any = {
            lastUpdated: new Date(),
            updatedAt: new Date()
        };
        
        if (incrementScans) {
            updateData.scans = (existing.scans || 0) + 1;
        }
        
        if (body.scans !== undefined) {
            updateData.scans = Number(body.scans);
        }
        
        const updated = await prisma.qRHistory.update({
            where: { id },
            data: updateData
        });
        
        return NextResponse.json({
            success: true,
            data: updated,
            message: 'QR history updated'
        });
    } catch (error) {
        console.error('Error updating QR history:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update QR history' },
            { status: 500 }
        );
    }
}

// DELETE endpoint to clean up old records
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const olderThan = searchParams.get('olderThan'); // e.g., "30d" for 30 days
        
        if (id) {
            // Delete specific record
            const deleted = await prisma.qRHistory.deleteMany({ where: { id } });
            
            if (deleted.count === 0) {
                return NextResponse.json(
                    { success: false, error: 'QR history not found' },
                    { status: 404 }
                );
            }
            
            return NextResponse.json({
                success: true,
                message: 'QR history deleted'
            });
        }
        
        if (olderThan) {
            // Delete old records
            const days = parseInt(olderThan);
            if (isNaN(days)) {
                return NextResponse.json(
                    { success: false, error: 'Invalid olderThan parameter. Use number of days (e.g., "30d")' },
                    { status: 400 }
                );
            }
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            const result = await prisma.qRHistory.deleteMany({
                where: { generatedAt: { lt: cutoffDate } }
            });
            
            return NextResponse.json({
                success: true,
                message: `Deleted ${result.count} old QR history records`,
                deletedCount: result.count
            });
        }
        
        return NextResponse.json(
            { success: false, error: 'Either id or olderThan parameter required' },
            { status: 400 }
        );
    } catch (error) {
        console.error('Error deleting QR history:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete QR history' },
            { status: 500 }
        );
    }
}
