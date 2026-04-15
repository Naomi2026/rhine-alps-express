/**
 * app/api/orders/[id]/verify-otp/route.ts
 *
 * POST /api/orders/:id/verify-otp
 *
 * Rider submits the customer's OTP at delivery point (§15.2).
 * On success, advances the delivery to DELIVERED and order to DELIVERED.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, badRequest, notFound, serverError } from "@/lib/auth/api-auth";
import { verifyOtpSchema } from "@/lib/validations/payment";
import { verifyOTP } from "@/lib/otp/otp-service";
import { logOTPAttempt, logDeliveryStatusChange, logOrderStatusChange } from "@/lib/audit/audit-logger";
import type { UserRole } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const authResult = await requireRole("RIDER" as UserRole, "ADMIN" as UserRole, "SUPER_ADMIN" as UserRole);
  if (authResult instanceof NextResponse) return authResult;
  const sessionUser = authResult;

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON");

  const parsed = verifyOtpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { otpValue } = parsed.data;

  try {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { delivery: true, otp: true },
    });

    if (!order) return notFound("Order");
    if (!order.delivery) return badRequest("No delivery record found for this order.");
    if (!order.otp) return badRequest("No OTP has been generated for this order.");

    const result = await verifyOTP({
      orderId,
      otpValue,
      submittedBy: sessionUser.id,
    });

    await logOTPAttempt({
      otpRecordId: order.otp.id,
      orderId,
      submittedBy: sessionUser.id,
      result: result.success ? "success" : "failure",
      failureReason: result.success ? null : result.reason,
    });

    if (!result.success) {
      const messages: Record<string, string> = {
        invalid: "Incorrect OTP. Please try again.",
        expired: "OTP has expired. Please request a new one.",
        already_used: "This OTP has already been used.",
        max_attempts: "Maximum OTP attempts reached. Admin review required.",
      };
      return NextResponse.json(
        { error: messages[result.reason] ?? "OTP verification failed." },
        { status: 400 }
      );
    }

    // Advance delivery to DELIVERED
    const prevDeliveryStatus = order.delivery.status;
    await db.delivery.update({
      where: { id: order.delivery.id },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
      },
    });

    // Advance order to DELIVERED
    const prevOrderStatus = order.status;
    await db.order.update({
      where: { id: orderId },
      data: { status: "DELIVERED" },
    });

    await logDeliveryStatusChange({
      deliveryId: order.delivery.id,
      orderId,
      fromStatus: prevDeliveryStatus,
      toStatus: "DELIVERED",
      userId: sessionUser.id,
      note: "OTP verified",
    });

    await logOrderStatusChange({
      orderId,
      fromStatus: prevOrderStatus,
      toStatus: "DELIVERED",
      userId: sessionUser.id,
      note: "OTP verified at delivery",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/orders/:id/verify-otp]", err);
    return serverError();
  }
}
