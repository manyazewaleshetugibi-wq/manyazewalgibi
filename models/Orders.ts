import { z } from "zod";
import { ObjectId } from "mongodb";
 import mongoose from "mongoose";

// Order Status Enum
export const OrderStatus = z.enum([
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "PICKUP",  
  "SERVED",
  "COMPLETED",
  "CANCELLED"
]);

// Order Item Subschema - UPDATED with uneditable fields
const OrderItemSchema = z.object({
  itemId: z.string().min(1, "Item ID is required").refine((val) => ObjectId.isValid(val), {
    message: "Item ID must be a valid MongoDB ObjectId",
  }),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  subtotal: z.number().min(0, "Subtotal must be non-negative"),
  specialInstructions: z.string().optional(),
  status: z.enum(["PENDING", "PREPARING", "READY", "SERVED"]).default("PENDING"),
  // NEW FIELDS for marking items as uneditable
  isUneditable: z.boolean().default(false),
  uneditableAt: z.date().optional(),
  uneditableBy: z.string().optional()
});

// Table Order Schema - UPDATED to include orderItems for compatibility
export const TableOrderSchema = z.object({
  _id: z.string().optional(),
  orderNumber: z.string().min(1, "Order number is required"),
  tableNumber: z.string().min(1, "Table number is required"),
  waiterId: z.string().min(1, "Waiter ID is required"),
  waiterName: z.string().optional(),
  numberOfGuests: z.number().min(1, "Number of guests must be at least 1"),
  items: z.array(OrderItemSchema).min(1, "At least one item is required"),
  orderItems: z.array(OrderItemSchema).optional(), // For compatibility with existing code
  status: OrderStatus.default("PENDING"),
  totalAmount: z.number().min(0, "Total amount must be non-negative"),
  discount: z.number().min(0, "Discount must be non-negative").default(0),
  tax: z.number().min(0, "Tax must be non-negative"),
  finalAmount: z.number().min(0, "Final amount must be non-negative"),
  paymentMethod: z.enum(["CASH", "CARD", "MOBILE_PAYMENT"]),
  specialRequirements: z.string().optional(),
  notes: z.string().optional(), // Added for compatibility
  customerName: z.string().optional(), // Added for compatibility
  isActive: z.boolean().default(true),
  delivery: z.boolean().default(false),
  inTable: z.boolean().default(true),
  restaurantId: z.string().optional(),
  restaurantName: z.string().optional(),
  floor: z.string().optional(),
  paymentScreenshotUrl: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  completedAt: z.date().optional(),
  // Deletion related fields
  markedForDeletion: z.boolean().default(false),
  deletionRequestReason: z.string().optional(),
  deletionRequestedBy: z.string().optional(),
  deletionRequestedAt: z.date().optional(),
  deletedAt: z.date().optional(),
  deletedBy: z.string().optional(),
  deletionReason: z.string().optional()
});

export type OrderStatus = z.infer<typeof OrderStatus>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type TableOrder = z.infer<typeof TableOrderSchema>;

// Mongoose Model for Order (used by table sync)
const TableOrderMongooseSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true },
  tableNumber: { type: String, required: true },
  waiterId: { type: String, required: true },
  waiterName: { type: String },
  numberOfGuests: { type: Number },
  items: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    quantity: { type: Number },
    unitPrice: { type: Number },
    subtotal: { type: Number },
    status: { type: String }
  }],
  status: { type: String, default: "PENDING" },
  totalAmount: { type: Number },
  finalAmount: { type: Number },
  customerName: { type: String },
  notes: { type: String },
  isActive: { type: Boolean, default: true },
  restaurantId: { type: String },
  floor: { type: String },
  completedAt: { type: Date }
}, { timestamps: true });

export const TableOrder = mongoose.models.Order || mongoose.model('Order', TableOrderMongooseSchema);
