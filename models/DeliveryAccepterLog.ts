import { z } from "zod";
import { ObjectId } from "mongodb";

export const DeliveryAccepterLogSchema = z.object({
  _id: z.instanceof(ObjectId).optional(),
  orderId: z.instanceof(ObjectId),
  orderNumber: z.string(),
  previousStatus: z.string(),
  newStatus: z.enum(["accepted", "cancelled"]),
  accepterId: z.instanceof(ObjectId),
  accepterName: z.string(),
  accepterEmail: z.string().email(),
  accepterRole: z.enum(["admin", "manager", "staff", "delivery"]),
  notes: z.string().optional(),
  changeDate: z.date(),
  orderDetails: z.object({
    userId: z.instanceof(ObjectId),
    userName: z.string(),
    userEmail: z.string().email(),
    totalAmount: z.number(),
    finalAmount: z.number(),
    delivery: z.boolean(),
    intable: z.object({
      // Define your intable structure here
      tableNumber: z.string().optional(),
      seats: z.number().optional(),
      area: z.string().optional()
    }).optional(),
    itemCount: z.number()
  })
});

export type DeliveryAccepterLog = z.infer<typeof DeliveryAccepterLogSchema>;
