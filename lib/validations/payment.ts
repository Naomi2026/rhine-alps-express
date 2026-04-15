/**
 * lib/validations/payment.ts
 *
 * Zod schemas for payment-related request bodies.
 */

import { z } from "zod";

export const verifyMpesaSchema = z.object({
  mpesaCode: z
    .string()
    .min(8, "M-Pesa code must be at least 8 characters")
    .max(20, "M-Pesa code too long")
    .regex(/^[A-Z0-9]+$/, "M-Pesa code should be uppercase alphanumeric"),
  mpesaPhone: z.string().optional(),
  notes: z.string().max(500).optional(),
  actingUserId: z.string(),
});

export type VerifyMpesaInput = z.infer<typeof verifyMpesaSchema>;

export const verifyOtpSchema = z.object({
  otpValue: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must be numeric"),
  submittedBy: z.string().optional(),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const advanceDeliveryStatusSchema = z.object({
  toStatus: z.enum([
    "NOT_SCHEDULED",
    "SCHEDULED",
    "ASSIGNED",
    "PICKED_UP",
    "IN_TRANSIT",
    "ARRIVED",
    "PENDING_OTP_CONFIRMATION",
    "DELIVERED",
    "DELIVERY_ATTEMPTED",
    "FAILED",
    "RETURNED",
  ]),
  failReason: z.string().optional(),
  failNote: z.string().max(500).optional(),
  cashCollected: z.number().min(0).optional(),
  recipientName: z.string().optional(),
  arrivalLat: z.number().optional(),
  arrivalLng: z.number().optional(),
});

export type AdvanceDeliveryStatusInput = z.infer<typeof advanceDeliveryStatusSchema>;
