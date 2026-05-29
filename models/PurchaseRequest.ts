import { z } from "zod";

export const PurchaseRequestSchema = z.object({
  stockId: z.string().min(1, "Stock ID is required"),
  stockName: z.string().min(1, "Stock name is required"),
  categoryId: z.string().min(1, "Category ID is required"),
  unit: z.string().min(1, "Unit is required"),
  reorderFrequency: z.string().default("monthly"),
  
  // Required amount reference (from stock)
  requiredAmount: z.number().default(0),
  
  // Date tracking
  requestDate: z.string(), // Format: YYYY-MM-DD
  requestDateTime: z.date().default(() => new Date()),
  lastGeneratedAt: z.date().optional(),
  
  // Request Details
  requestedQuantity: z.number().min(0.01, "Quantity must be greater than 0"),
  currentStock: z.number().default(0),
  minimumStock: z.number().default(0),
  
  // Financial Details
  estimatedUnitPrice: z.number().default(0),
  estimatedTotalCost: z.number().default(0),
  actualUnitPrice: z.number().optional(),
  actualTotalCost: z.number().optional(),
  
  // Toggle Statuses
  isDelivered: z.boolean().default(false),
  isPurchased: z.boolean().default(false),
  isConfirmed: z.boolean().default(false),
  
  // Timestamps
  deliveredAt: z.date().optional(),
  deliveredBy: z.string().optional(),
  purchasedAt: z.date().optional(),
  purchasedBy: z.string().optional(),
  confirmedAt: z.date().optional(),
  confirmedBy: z.string().optional(),
  
  // Request Reason
  reason: z.enum(['minimum_stock_reached', 'reorder_frequency_due', 'manual']),
  lastPurchaseDate: z.string().optional(),
  daysSinceLastPurchase: z.number().optional(),
  
  // Status
  status: z.enum(['pending', 'delivered', 'purchased', 'completed']).default('pending'),
  
  // Metadata
  notes: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type PurchaseRequest = z.infer<typeof PurchaseRequestSchema>;
