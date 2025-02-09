import { z } from "zod"

export const ItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().min(0, "Price must be positive"),
  category: z.string().min(1, "Category is required"),
  image: z.string().optional(),
})

export type MenuItem = z.infer<typeof ItemSchema>

export type ItemCategory = {
  id: string
  name: string
}

export type Stock = {
  id: string
  name: string
}

export type ViewMode = "card" | "list"
