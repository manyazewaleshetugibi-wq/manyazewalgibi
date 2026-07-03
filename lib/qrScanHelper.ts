// lib/qrScanHelper.ts
import QRHistory from '@/models/QRHistory';
import clientPromise from '@/lib/mongodb';
import mongoose from 'mongoose';

async function ensureConnection() {
    if (mongoose.connection.readyState === 0) {
        const client = await clientPromise;
        await mongoose.connect(process.env.MONGODB_URI!);
    }
    return mongoose.connection;
}

export async function incrementQRScan(
    restaurantId: string,
    floor: string,
    tableId: string
) {
    try {
        await ensureConnection();
        
        // Find the QR history entry
        const history = await QRHistory.findOne({
            restaurantId,
            floor,
            tableId
        });
        
        if (!history) {
            // Create a new entry if it doesn't exist (shouldn't happen normally)
            return { success: false, error: 'QR history not found' };
        }
        
        // Increment scan count
        history.scans += 1;
        history.lastScanned = new Date();
        await history.save();
        
        return { 
            success: true, 
            data: history,
            message: `QR scan recorded for table ${history.tableNumber}`
        };
    } catch (error) {
        console.error('Error incrementing QR scan:', error);
        return { success: false, error: 'Failed to record QR scan' };
    }
}

export async function getQRScanStats(restaurantId?: string) {
    try {
        await ensureConnection();
        
        const stats = await QRHistory.getScanStats(restaurantId);
        const topTables = await QRHistory.getMostScannedTables(10);
        
        return {
            success: true,
            data: {
                ...stats,
                topTables
            }
        };
    } catch (error) {
        console.error('Error getting QR scan stats:', error);
        return { success: false, error: 'Failed to get QR scan stats' };
    }
}