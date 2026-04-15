/**
 * lib/validations/order.ts
 *
 * Zod schemas for order-related request bodies.
 */

import { z } from "zod";
import { ORDER_QUANTITY, REASON_CODES } from "@/lib/constants";

export const placeOrderSchema = z.object({
  deliveryAddress: z
    .string()
    .min(5, "Delivery address must be at least 5 characters"),
  deliveryLat: z.number().optional(),
  deliveryLng: z.number().optional(),
  locationRef: z.string().optional(),
  slotId: z.string().cuid("Invalid slot"),
  deliveryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Delivery date must be YYYY-MM-DD"),
  quantity: z
    .number()
    .int()
    .min(ORDER_QUANTITY.MIN, `Minimum quantity is ${ORDER_QUANTITY.MIN}`)
    .max(ORDER_QUANTITY.MAX, `Maximum quantity is ${ORDER_QUANTITY.MAX}`),
  isExchange: z.boolean().default(false),
  paymentMethod: z.enum(["MPESA", "CASH_ON_DELIVERY"]),
  deliveryNotes: z.string().max(500).optional(),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export const cancelOrderSchema = z.object({
  reason: z.enum(
    Object.values(REASON_CODES.CANCELLED) as [string, ...string[]]
  ),
  note: z.string().max(500).optional(),
  actingUserId: z.string().optional(),
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

export const advanceOrderStatusSchema = z.object({
  toStatus: z.enum([
    "PLACED",
    "AWAITING_PAYMENT",
    "CONFIRMED",
    "PREPARING",
    "READY_FOR_DISPATCH",
    "ASSIGNED_TO_RIDER",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "COMPLETED",
    "FAILED_DELIVERY",
    "CANCELLED",
    "ON_HOLD",
  ]),
  reason: z.string().optional(),
  note: z.string().max(500).optional(),
  actingUserId: z.string(),
});

export type AdvanceOrderStatusInput = z.infer<typeof advanceOrderStatusSchema>;

export const assignRiderSchema = z.object({
  riderId: z.string().cuid("Invalid rider ID"),
  actingUserId: z.string(),
});

export type AssignRiderInput = z.infer<typeof assignRiderSchema>;

export const forceCompleteSchema = z.object({
  reason: z.enum(
    Object.values(REASON_CODES.MANUAL_OVERRIDE) as [string, ...string[]]
  ),
  note: z.string().max(500).optional(),
  actingUserId: z.string(),
});

export type ForceCompleteInput = z.infer<typeof forceCompleteSchema>;
