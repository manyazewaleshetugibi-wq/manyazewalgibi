// models/QRHistory.ts
import mongoose from 'mongoose';

const QRHistorySchema = new mongoose.Schema({
    restaurantId: {
        type: String,
        required: true,
        index: true
    },
    restaurantName: {
        type: String,
        required: true
    },
    floor: {
        type: String,
        required: true,
        index: true
    },
    tableNumber: {
        type: Number,
        required: true
    },
    tableId: {
        type: String,
        required: true,
        index: true
    },
    qrCode: {
        type: String,
        required: true
    },
    scans: {
        type: Number,
        default: 0,
        min: 0
    },
    lastScanned: {
        type: Date
    },
    generatedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    // Additional metadata
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Compound indexes for faster queries
QRHistorySchema.index({ restaurantId: 1, floor: 1, tableId: 1 });
QRHistorySchema.index({ restaurantId: 1, generatedAt: -1 });
QRHistorySchema.index({ generatedAt: -1 });

// Virtual for age in days
QRHistorySchema.virtual('ageInDays').get(function() {
    return Math.floor((Date.now() - this.generatedAt.getTime()) / (1000 * 60 * 60 * 24));
});

// Middleware to update lastUpdated on save
QRHistorySchema.pre('save', function(next) {
    this.lastUpdated = new Date();
    next();
});

// Static method to get scan statistics
QRHistorySchema.statics.getScanStats = async function(restaurantId?: string) {
    const matchStage = restaurantId ? { restaurantId } : {};
    
    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalScans: { $sum: '$scans' },
                totalQRCodes: { $sum: 1 },
                avgScans: { $avg: '$scans' },
                maxScans: { $max: '$scans' }
            }
        }
    ]);
    
    return stats[0] || { totalScans: 0, totalQRCodes: 0, avgScans: 0, maxScans: 0 };
};

// Static method to get most scanned tables
QRHistorySchema.statics.getMostScannedTables = async function(limit: number = 10) {
    return this.aggregate([
        {
            $group: {
                _id: {
                    restaurantId: '$restaurantId',
                    restaurantName: '$restaurantName',
                    tableNumber: '$tableNumber',
                    tableId: '$tableId',
                    floor: '$floor'
                },
                totalScans: { $sum: '$scans' },
                lastScanned: { $max: '$lastScanned' },
                count: { $sum: 1 }
            }
        },
        { $sort: { totalScans: -1 } },
        { $limit: limit },
        {
            $project: {
                _id: 0,
                restaurantId: '$_id.restaurantId',
                restaurantName: '$_id.restaurantName',
                tableNumber: '$_id.tableNumber',
                tableId: '$_id.tableId',
                floor: '$_id.floor',
                totalScans: 1,
                lastScanned: 1,
                count: 1
            }
        }
    ]);
};

export default mongoose.models.QRHistory || mongoose.model('QRHistory', QRHistorySchema);