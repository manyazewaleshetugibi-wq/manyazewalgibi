// app/api/qr-history/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import mongoose from 'mongoose';
import QRHistory from '@/models/QRHistory';

// Ensure database connection
async function ensureConnection() {
  if (mongoose.connection.readyState === 0) {
    const client = await clientPromise;
    await mongoose.connect(process.env.MONGODB_URI!);
  }
  return mongoose.connection;
}

export async function GET() {
    try {
        await ensureConnection();
        
        const history = await QRHistory.find()
            .sort({ generatedAt: -1 })
            .limit(100)
            .lean();
        
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
    try {
        await ensureConnection();
        
        const body = await request.json();
        
        // Validate required fields
        if (!body.restaurantId || !body.floor || !body.tableId) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: restaurantId, floor, tableId' },
                { status: 400 }
            );
        }
        
        // Check if QR already exists for this table
        const existing = await QRHistory.findOne({
            restaurantId: body.restaurantId,
            floor: body.floor,
            tableId: body.tableId
        });

        if (existing) {
            // Update existing record - preserve scan count
            const updated = await QRHistory.findByIdAndUpdate(
                existing._id,
                { 
                    ...body,
                    generatedAt: new Date(),
                    scans: existing.scans || 0,
                    lastUpdated: new Date()
                },
                { new: true, runValidators: true }
            );
            
            return NextResponse.json({
                success: true,
                data: updated,
                message: 'QR history updated'
            });
        }

        // Create new record
        const history = new QRHistory({
            ...body,
            generatedAt: new Date(),
            scans: 0,
            lastUpdated: new Date()
        });
        
        await history.save();
        
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
        await ensureConnection();
        
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
        
        const updateData: any = {
            lastUpdated: new Date()
        };
        
        if (incrementScans) {
            updateData.$inc = { scans: 1 };
            updateData.lastScanned = new Date();
        }
        
        if (body.scans !== undefined) {
            updateData.scans = body.scans;
        }
        
        const updated = await QRHistory.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!updated) {
            return NextResponse.json(
                { success: false, error: 'QR history not found' },
                { status: 404 }
            );
        }
        
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
        await ensureConnection();
        
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const olderThan = searchParams.get('olderThan'); // e.g., "30d" for 30 days
        
        if (id) {
            // Delete specific record
            const deleted = await QRHistory.findByIdAndDelete(id);
            
            if (!deleted) {
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
            
            const result = await QRHistory.deleteMany({
                generatedAt: { $lt: cutoffDate }
            });
            
            return NextResponse.json({
                success: true,
                message: `Deleted ${result.deletedCount} old QR history records`,
                deletedCount: result.deletedCount
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