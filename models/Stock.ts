import { z } from "zod";

export const StockCategorySubschema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  createdAt: z.date().default(() => new Date()), 
  updatedAt: z.date().default(() => new Date()),
});

export const StockSchema = z.object({
  name: z.string().min(1, "Stock name is required"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category ID is required"),
  unit: z.enum(["kg", "g", "liter", "ml", "piece", "box", "pack", "tray", "bottle", "can"]),
  minimumStock: z.number().default(0),
  currentStock: z.number().default(0),
  currentUnitPrice: z.number().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()), 
  updatedAt: z.date().default(() => new Date()),
});

export const PurchaseSchema = z.object({
  stockId: z.string().min(1, "Stock ID is required"),
  purchaseDate: z.string().transform((dateStr) => new Date(dateStr)),  // Accept string and transform it to a Date
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  supplier: z.string().optional(),
});
