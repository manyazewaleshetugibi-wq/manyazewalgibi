import { z } from "zod";
import { ObjectId } from "mongodb";

// Feedback Schema for Restaurant
export const FeedbackSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  message: z.string().min(1, "Feedback message is required"),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PRIVATE"),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type Feedback = z.infer<typeof FeedbackSchema>;
