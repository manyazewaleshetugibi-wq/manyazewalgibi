import { z } from "zod";
import { ObjectId } from "mongodb";

// Order Status Enum - Rename this to avoid conflict
export const OrderStatusEnum = z.enum([
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "PICKUP",  
  "SERVED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED"
]);

// Order Item Subschema
const OrderItemSchema = z.object({
  itemId: z.string().min(1, "Item ID is required").refine((val) => ObjectId.isValid(val), {
    message: "Item ID must be a valid MongoDB ObjectId",
  }),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be non-negative").optional(),
  subtotal: z.number().min(0, "Subtotal must be non-negative").optional(),
  specialInstructions: z.string().optional(),
  status: z.enum(["PENDING", "PREPARING", "READY", "SERVED"]).default("PENDING").optional(),
  itemName: z.string().optional()
});

// Delivery Info Schema
const DeliveryInfoSchema = z.object({
  fullName: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  landmark: z.string().optional(),
  deliveryInstructions: z.string().optional()
});

// Delivery Order Schema
export const DeliveryOrderSchema = z.object({
  _id: z.string().optional(),
  userId: z.string().optional().nullable(),
  orderNumber: z.string().min(1, "Order number is required"),
  waiterId: z.string().optional().nullable(),
  deliveryAddress: z.string().optional().nullable(),
  deliveryInfo: DeliveryInfoSchema.optional().nullable(),
  note: z.string().optional().nullable(),
  specialRequirements: z.string().optional().nullable(),
  items: z.array(OrderItemSchema).min(1, "At least one item is required"),
  status: OrderStatusEnum.default("PENDING"),  // Use OrderStatusEnum here
  totalAmount: z.number().min(0, "Total amount must be non-negative"),
  subtotal: z.number().optional().nullable(),
  deliveryFee: z.number().optional().nullable(),
  discount: z.number().min(0, "Discount must be non-negative").default(0),
  tax: z.number().min(0, "Tax must be non-negative"),
  finalAmount: z.number().min(0, "Final amount must be non-negative"),
  paymentMethod: z.string(),
  transactionId: z.string().optional().nullable(),
  paymentScreenshotUrl: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  delivery: z.boolean().default(true),
  inTable: z.boolean().default(false),
  tableNumber: z.string().optional().nullable(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  completedAt: z.date().optional().nullable()
});

// Export types
export type OrderStatus = z.infer<typeof OrderStatusEnum>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type DeliveryOrder = z.infer<typeof DeliveryOrderSchema>;

// Export the array of status options for validation
export const OrderStatusOptions = OrderStatusEnum.options;
