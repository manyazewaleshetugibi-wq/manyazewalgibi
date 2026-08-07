// lib/qrScanHelper.ts
import { prisma } from '@/lib/prisma';

export async function incrementQRScan(
    restaurantId: string,
    floor: string,
    tableId: string
) {
    try {
        // Find the QR history entry
        const history = await prisma.qRHistory.findFirst({
            where: {
                restaurantId,
                floor,
                tableId
            }
        });

        if (!history) {
            // Create a new entry if it doesn't exist (shouldn't happen normally)
            return { success: false, error: 'QR history not found' };
        }

        // Increment scan count
        const updated = await prisma.qRHistory.update({
            where: { id: history.id },
            data: {
                scans: (history.scans || 0) + 1,
                lastUpdated: new Date(),
                updatedAt: new Date()
            }
        });

        return {
            success: true,
            data: updated,
            message: `QR scan recorded for table ${updated.tableNumber}`
        };
    } catch (error) {
        console.error('Error incrementing QR scan:', error);
        return { success: false, error: 'Failed to record QR scan' };
    }
}

export async function getQRScanStats(restaurantId?: string) {
    try {
        const where = restaurantId ? { restaurantId } : undefined;

        const agg = await prisma.qRHistory.aggregate({
            where,
            _sum: { scans: true },
            _count: true,
            _avg: { scans: true },
            _max: { scans: true }
        });

        const topTables = await prisma.qRHistory.groupBy({
            by: ['restaurantId', 'restaurantName', 'tableNumber', 'tableId', 'floor'],
            where,
            _sum: { scans: true },
            _max: { lastUpdated: true },
            _count: true,
            orderBy: { _sum: { scans: 'desc' } },
            take: 10
        });

        return {
            success: true,
            data: {
                totalScans: agg._sum.scans || 0,
                totalQRCodes: agg._count,
                avgScans: agg._avg.scans || 0,
                maxScans: agg._max.scans || 0,
                topTables: topTables.map((t) => ({
                    restaurantId: t.restaurantId,
                    restaurantName: t.restaurantName,
                    tableNumber: t.tableNumber,
                    tableId: t.tableId,
                    floor: t.floor,
                    totalScans: t._sum.scans || 0,
                    lastScanned: t._max.lastUpdated,
                    count: t._count
                }))
            }
        };
    } catch (error) {
        console.error('Error getting QR scan stats:', error);
        return { success: false, error: 'Failed to get QR scan stats' };
    }
}
