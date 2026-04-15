/**
 * app/api/orders/[id]/verify-payment/route.ts
 *
 * POST /api/orders/:id/verify-payment
 *
 * Admin enters and verifies an M-Pesa transaction code (§9.7).
 * Creates a Payment record and marks order payment as PAID.
 * Enforces the no-duplicate-code rule (§9.7).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  requireRole,
  badRequest,
  notFound,
  conflict,
  serverError,
} from "@/lib/auth/api-auth";
import { verifyMpesaSchema } from "@/lib/validations/payment";
import { logMpesaCodeEntry, logPaymentStatusChange } from "@/lib/audit/audit-logger";
import type { UserRole } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireRole("ADMIN" as UserRole, "SUPER_ADMIN" as UserRole);
  if (authResult instanceof NextResponse) return authResult;
  const sessionUser = authResult;

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON");

  const parsed = verifyMpesaSchema.safeParse({ ...body, actingUserId: sessionUser.id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { mpesaCode, mpesaPhone, notes } = parsed.data;

  try {
    const order = await db.order.findUnique({
      where: { id },
      include: { payments: true },
    });

    if (!order) return notFound("Order");
    if (order.paymentMethod !== "MPESA") {
      return badRequest("This order uses Cash on Delivery, not M-Pesa.");
    }
    if (order.paymentStatus === "PAID") {
      return badRequest("This order has already been marked as paid.");
    }

    // §9.7 — Duplicate M-Pesa code check
    const existingPayment = await db.payment.findUnique({
      where: { mpesaCode },
    });
    if (existingPayment) {
      return conflict(
        `M-Pesa code ${mpesaCode} has already been used on another order. ` +
          "Only Super Admin can override duplicate codes."
      );
    }

    const now = new Date();
    const payment = await db.payment.create({
      data: {
        orderId: id,
        method: "MPESA",
        amount: order.amountDue,
        status: "PAID",
        mpesaCode,
        mpesaPhone: mpesaPhone ?? null,
        enteredByUserId: sessionUser.id,
        enteredAt: now,
        notes: notes ?? null,
      },
    });

    await db.order.update({
      where: { id },
      data: { paymentStatus: "PAID" },
    });

    await logMpesaCodeEntry({
      paymentId: payment.id,
      orderId: id,
      mpesaCode,
      enteredByUserId: sessionUser.id,
    });

    await logPaymentStatusChange({
      paymentId: payment.id,
      orderId: id,
      fromStatus: order.paymentStatus,
      toStatus: "PAID",
      userId: sessionUser.id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/orders/:id/verify-payment]", err);
    return serverError();
  }
}
