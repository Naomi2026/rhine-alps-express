/**
 * lib/validations/user.ts
 *
 * Zod schemas for user management request bodies.
 */

import { z } from "zod";

export const createUserSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    phone: z
      .string()
      .regex(/^(?:\+254|0)?[17]\d{8}$/, "Invalid Kenyan phone number")
      .optional()
      .or(z.literal("")),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(["ADMIN", "RIDER"]),
    createdById: z.string(),
  })
  .refine((d) => d.email || d.phone, {
    message: "At least one of email or phone is required",
    path: ["email"],
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z
    .string()
    .regex(/^(?:\+254|0)?[17]\d{8}$/, "Invalid Kenyan phone number")
    .optional()
    .or(z.literal("")),
  defaultAddress: z.string().min(5).optional().or(z.literal("")),
  defaultLat: z.number().optional(),
  defaultLng: z.number().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
