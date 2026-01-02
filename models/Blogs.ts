// models/Blogs.ts
import { z } from "zod";

// Blog Schema (Updated with video support)
export const BlogSchema = z.object({
  _id: z.string().optional(),
  title: z.string().min(1, "Blog title is required"),
  content: z.string().min(1, "Blog content is required"),
  category: z.enum(["NEWS", "EVENTS", "COURSE", "PROMOTION", "OTHER"]),
  tags: z.array(z.string()).default([]),
  Image: z.string().optional(),
  Video: z.string().optional(),
  mediaType: z.enum(["image", "video", "none"]).default("none"),
  fileUrl: z.string().optional(),
  publishedAt: z.preprocess((val) => {
    if (typeof val === "string") return new Date(val);
    if (val instanceof Date) return val;
    return new Date();
  }, z.date().default(() => new Date())),
  isActive: z.boolean().default(true),
  excerpt: z.string().optional(),
  views: z.number().default(0),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

export type Blog = z.infer<typeof BlogSchema>;