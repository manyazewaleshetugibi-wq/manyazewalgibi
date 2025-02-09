import { z } from "zod";

// Blog Schema (Fixed)
export const BlogSchema = z.object({
  _id: z.string().optional(),  // Allow MongoDB to generate _id
  title: z.string().min(1, "Blog title is required"),
  content: z.string().min(1, "Blog content is required"),
  category: z.enum(["NEWS", "EVENTS", "COURSE", "PROMOTION", "OTHER"]),
  tags: z.array(z.string()).default([]),
  Image: z.string().optional(),
  publishedAt: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date().optional()), // Convert string to Date
  isActive: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

export type Blog = z.infer<typeof BlogSchema>;


