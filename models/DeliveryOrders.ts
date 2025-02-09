import { z } from "zod";
import { ObjectId } from "mongodb";

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

// Order Item Subschema
const OrderItemSchema = z.object({
  itemId: z.string().min(1, "Item ID is required").refine((val) => ObjectId.isValid(val), {
    message: "Item ID must be a valid MongoDB ObjectId",
  }),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  subtotal: z.number().min(0, "Subtotal must be non-negative"),
  specialInstructions: z.string().optional(),
  status: z.enum(["PENDING", "PREPARING", "READY", "SERVED"]).default("PENDING")
});

// Delivery Order Schema
export const DeliveryOrderSchema = z.object({
  _id: z.string().optional(),  // Make _id optional
  Userid: z.string(),
  orderNumber: z.string().min(1, "Order number is required"),
  deliveryAddress: z.string().min(1, "Delivery address is required"),
  note: z.string().optional(),
  items: z.array(OrderItemSchema).min(1, "At least one item is required"),
  status: OrderStatus.default("PENDING"),
  totalAmount: z.number().min(0, "Total amount must be non-negative"),
  discount: z.number().min(0, "Discount must be non-negative").default(0),
  tax: z.number().min(0, "Tax must be non-negative"),
  finalAmount: z.number().min(0, "Final amount must be non-negative"),
  paymentMethod: z.enum(["CASH", "CARD", "MOBILE_PAYMENT"]),
  isActive: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  completedAt: z.date().optional()
});

export type OrderStatus = z.infer<typeof OrderStatus>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type DeliveryOrder = z.infer<typeof DeliveryOrderSchema>;
