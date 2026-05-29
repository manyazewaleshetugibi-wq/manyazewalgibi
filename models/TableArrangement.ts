// models/TableArrangement.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITable {
  id: string;
  number: number;
  capacity: number;
  shape: 'circle' | 'square' | 'rectangle' | 'round';
  x: number;
  y: number;
  width: number;
  height: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance';
  rotation?: number;
  location?: string;
  description?: string;
  tags?: string[];
  features?: string[];
  lastUpdated?: Date;
  section?: string;
  merged?: boolean;
  mergedWith?: string[];
  currentOrder?: string;
  waiterId?: string;
  reservationInfo?: {
    customerName: string;
    customerPhone: string;
    reservationTime: Date;
    partySize: number;
  };
}

export interface ITableArrangement extends Document {
  restaurantId: string;
  restaurantName: string;
  name: string;
  floor: string;
  layoutType: 'grid' | 'custom' | 'rows';
  totalTables: number;
  tables: ITable[];
  totalCapacity: number;
  availableTables: number;
  occupiedTables: number;
  reservedTables: number;
  cleaningTables: number;
  maintenanceTables: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isActive: boolean;
  dimensions: {
    width: number;
    height: number;
  };
  sections?: Array<{
    id: string;
    name: string;
    color: string;
    tables: string[];
  }>;
}

const TableSchema = new Schema({
  id: { type: String, required: true },
  number: { type: Number, required: true },
  capacity: { type: Number, required: true, min: 1, max: 20 },
  shape: { 
    type: String, 
    enum: ['circle', 'square', 'rectangle', 'round'],
    default: 'circle'
  },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  width: { type: Number, default: 80 },
  height: { type: Number, default: 80 },
  status: {
    type: String,
    enum: ['available', 'occupied', 'reserved', 'cleaning', 'maintenance'],
    default: 'available'
  },
  rotation: { type: Number, default: 0 },
  location: { type: String, default: '' },
  description: { type: String, default: '' },
  tags: [{ type: String }],
  features: [{ type: String }],
  lastUpdated: { type: Date, default: Date.now },
  section: { type: String },
  merged: { type: Boolean, default: false },
  mergedWith: [{ type: String }],
  currentOrder: { type: Schema.Types.ObjectId, ref: 'Order' },
  waiterId: { type: String },
  reservationInfo: {
    customerName: String,
    customerPhone: String,
    reservationTime: Date,
    partySize: Number
  }
});

const TableArrangementSchema = new Schema({
  restaurantId: { type: String, required: true, index: true },
  restaurantName: { type: String, required: true },
  name: { type: String, required: true },
  floor: { type: String, required: true },
  layoutType: {
    type: String,
    enum: ['grid', 'custom', 'rows'],
    default: 'custom'
  },
  totalTables: { type: Number, default: 0 },
  tables: [TableSchema],
  totalCapacity: { type: Number, default: 0 },
  availableTables: { type: Number, default: 0 },
  occupiedTables: { type: Number, default: 0 },
  reservedTables: { type: Number, default: 0 },
  cleaningTables: { type: Number, default: 0 },
  maintenanceTables: { type: Number, default: 0 },
  createdBy: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  dimensions: {
    width: { type: Number, default: 1200 },
    height: { type: Number, default: 800 }
  },
  sections: [{
    id: String,
    name: String,
    color: String,
    tables: [String]
  }]
}, {
  timestamps: true
});

// Compound index for quick lookups
TableArrangementSchema.index({ restaurantId: 1, floor: 1, isActive: 1 });

export const TableArrangement = mongoose.models.TableArrangement || 
  mongoose.model<ITableArrangement>('TableArrangement', TableArrangementSchema);
