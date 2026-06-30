import { z } from "zod";

// Define the Item schema with validation
export const ItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  description: z.string().min(1, "Description is required").max(500, "Description must be less than 500 characters"),
  categoryId: z.string().min(1, "Category is required"),
  price: z.number().min(0, "Price must be positive").max(999999, "Price is too high"),
  cost: z.number().min(0, "Cost must be positive").optional(),
  imageUrl: z.string().nullable().optional(),
  cloudinaryData: z.object({
    publicId: z.string(),
    url: z.string(),
    format: z.string(),
    bytes: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
  }).nullable().optional(),
  requiredStock: z.array(
    z.object({
      stockId: z.string(),
      quantity: z.number().min(0, "Quantity must be positive"),
    })
  ).optional(),
  nutritionalInfo: z.object({
    calories: z.number().min(0, "Calories must be positive").max(10000, "Calories too high"),
    protein: z.number().min(0, "Protein must be positive").max(1000, "Protein too high"),
    carbohydrates: z.number().min(0, "Carbohydrates must be positive").max(1000, "Carbohydrates too high"),
    fat: z.number().min(0, "Fat must be positive").max(1000, "Fat too high"),
  }).optional(),
  preparationTime: z.number().min(0, "Preparation time must be positive").max(1440, "Preparation time cannot exceed 24 hours").optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isFasting: z.boolean().optional(), // ADDED
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type MenuItem = z.infer<typeof ItemSchema>;

// Validation function for item data
export function validateItemData(data: any) {
  try {
    // Validate with Zod
    const validatedData = ItemSchema.parse(data);
    return validatedData;
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format Zod errors for better response
      const errors = error.errors.reduce((acc: any, curr) => {
        const path = curr.path.join('.');
        acc[path] = curr.message;
        return acc;
      }, {});
      throw new Error(JSON.stringify({ errors, message: "Validation failed" }));
    }
    throw error;
  }
}