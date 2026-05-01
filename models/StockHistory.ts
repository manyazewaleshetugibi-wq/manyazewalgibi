// models/StockHistory.ts
import { z } from "zod";

export const StockHistorySchema = z.object({
  stockId: z.string(),
  transactionType: z.enum(["IN", "OUT"]),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0).optional(),
  totalCost: z.number().min(0).optional(),
  reason: z.string(),
  reference: z.string().optional(),
  performedBy: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.date(),
});

export type StockHistory = z.infer<typeof StockHistorySchema>;