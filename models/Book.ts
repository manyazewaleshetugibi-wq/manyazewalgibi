import { z } from "zod";

export const BookSchema = z.object({
  _id: z.string().optional(),
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  price: z.number().min(0, "Price must be positive").max(999999, "Price is too high"),
  category: z.string().min(1, "Category is required").max(100, "Category must be less than 100 characters"),
  quantity: z.number().min(0, "Quantity must be 0 or more").max(99999, "Quantity is too high"),
  imageUrl: z.string().nullable().optional(),
  cloudinaryData: z.object({
    publicId: z.string(),
    url: z.string(),
    format: z.string(),
    bytes: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
  }).nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Book = z.infer<typeof BookSchema>;

export function validateBookData(data: any) {
  try {
    const validatedData = BookSchema.parse(data);
    return validatedData;
  } catch (error) {
    if (error instanceof z.ZodError) {
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
