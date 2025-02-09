import { z } from "zod";
import { ObjectId } from "mongodb";

// ✅ Item Category Schema
export const ItemCategorySchema = z.object({
  _id: z.instanceof(ObjectId).optional(), // Ensure ObjectId compatibility
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  type: z.enum(["FOOD", "DRINK", "OTHER"]),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// ✅ Item Schema
export const ItemSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  categoryId: z
    .union([z.string(), z.instanceof(ObjectId)])
    .refine((id) => ObjectId.isValid(id.toString()), { message: "Invalid category ID" }),
  price: z.number().min(0, "Price must be non-negative"),
  imageUrl: z.string().url().optional(),
  requiredStock: z.array(
    z.object({
      stockId: z.union([z.string(), z.instanceof(ObjectId)]).refine((id) => ObjectId.isValid(id.toString()), {
        message: "Invalid stock ID",
      }),
      quantity: z.number().min(0, "Quantity must be non-negative"),
    })
  ),
  nutritionalInfo: z
    .object({
      calories: z.number().optional(),
      protein: z.number().optional(),
      carbohydrates: z.number().optional(),
      fat: z.number().optional(),
    })
    .optional(),
  preparationTime: z.number().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

// ✅ Export types
export type ItemCategory = z.infer<typeof ItemCategorySchema>;
export type Item = z.infer<typeof ItemSchema>;

// ✅ Validation functions
export function validateItemData(rawData: any) {
  return ItemSchema.parse(rawData);
}

export function validateItemCategoryData(rawData: any) {
  return ItemCategorySchema.parse(rawData);
}
