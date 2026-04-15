/**
 * app/api/auth/register/route.ts
 *
 * POST /api/auth/register
 *
 * Creates a new customer account with the required initial delivery location (§4.1).
 * At least one valid contact method (email or phone) is required (§4.3).
 * Returns { id } on success so the caller can immediately sign in.
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { normaliseKenyanPhone } from "@/lib/utils";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z
      .string()
      .email("Enter a valid email address")
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .regex(
        /^(?:\+254|0)?[17]\d{8}$/,
        "Enter a valid Kenyan phone number (e.g. 0712 345 678)"
      )
      .optional()
      .or(z.literal("")),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    deliveryAddress: z
      .string()
      .min(5, "Delivery address must be at least 5 characters"),
    deliveryLat: z.number().optional(),
    deliveryLng: z.number().optional(),
  })
  .refine((d) => d.email || d.phone, {
    message: "Provide at least one contact method: email or phone number",
    path: ["email"],
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { name, email, phone, password, deliveryAddress, deliveryLat, deliveryLng } =
    parsed.data;

  const normPhone = phone ? normaliseKenyanPhone(phone) : undefined;

  // Uniqueness checks
  if (email) {
    const exists = await db.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }
  }

  if (normPhone) {
    const exists = await db.user.findUnique({ where: { phone: normPhone } });
    if (exists) {
      return NextResponse.json(
        { error: "An account with this phone number already exists." },
        { status: 409 }
      );
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await db.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name,
        email: email || null,
        phone: normPhone ?? null,
        passwordHash,
        role: "CUSTOMER",
        isActive: true,
      },
    });

    await tx.customer.create({
      data: {
        userId: newUser.id,
        defaultAddress: deliveryAddress,
        defaultLat: deliveryLat ?? null,
        defaultLng: deliveryLng ?? null,
      },
    });

    return newUser;
  });

  return NextResponse.json(
    { id: user.id, email: user.email, phone: user.phone },
    { status: 201 }
  );
}
