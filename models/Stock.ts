import { z } from "zod";

export const StockCategorySubschema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  createdAt: z.date().default(() => new Date()), 
  updatedAt: z.date().default(() => new Date()),
});

export const ReorderFrequencyEnum = z.enum([
  "daily",
  "3days",
  "5days",
  "weekly",
  "9days",
  "11days",
  "2weeks",
  "monthly",
  "2months",
  "3months",
  "6months",
  "yearly"
]);

export type ReorderFrequency = z.infer<typeof ReorderFrequencyEnum>;

export const StockSchema = z.object({
  name: z.string().min(1, "Stock name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category ID is required"),
  unit: z.enum(["kg", "g", "liter", "ml", "piece", "box", "pack", "tray", "bottle", "can"]),
  minimumStock: z.number().min(0, "Minimum stock must be 0 or greater").default(0),
  currentStock: z.number().min(0, "Current stock cannot be negative").default(0),
  currentUnitPrice: z.number().optional(),
  reorderFrequency: ReorderFrequencyEnum.default("monthly"),
  requiredAmount: z.number().min(0, "Required amount must be 0 or greater").default(0),
  isActive: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()), 
  updatedAt: z.date().default(() => new Date()),
});

export const PurchaseSchema = z.object({
  stockId: z.string().min(1, "Stock ID is required"),
  purchaseDate: z.string().transform((dateStr) => new Date(dateStr)),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  supplier: z.string().optional(),
});

// ✅ NEW: Wastage Schema
export const WastageSchema = z.object({
  stockId: z.string().min(1, "Stock ID is required"),
  quantity: z.number()
    .min(0.01, "Quantity must be greater than 0")
    .positive("Quantity must be positive"),
  reason: z.string()
    .min(1, "Reason is required")
    .max(500, "Reason must be less than 500 characters"),
  date: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// ✅ NEW: Wastage Schema for API (without auto fields)
export const WastageCreateSchema = z.object({
  stockId: z.string().min(1, "Stock ID is required"),
  quantity: z.number()
    .min(0.01, "Quantity must be greater than 0")
    .positive("Quantity must be positive"),
  reason: z.string()
    .min(1, "Reason is required")
    .max(500, "Reason must be less than 500 characters"),
  date: z.string().optional(),
});

// Export types
export type StockCategory = z.infer<typeof StockCategorySubschema>;
export type Stock = z.infer<typeof StockSchema>;
export type Purchase = z.infer<typeof PurchaseSchema>;
export type Wastage = z.infer<typeof WastageSchema>;
export type WastageCreate = z.infer<typeof WastageCreateSchema>;