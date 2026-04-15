/**
 * app/api/deliveries/[id]/status/route.ts
 *
 * PATCH /api/deliveries/:id/status
 *
 * Rider advances delivery status through the logistics lifecycle (§13).
 * Enforces OTP requirement before DELIVERED (§15.2).
 * Records GPS timestamps, cash collected, failure reasons (§18.5).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  requireRole,
  badRequest,
  notFound,
  serverError,
} from "@/lib/auth/api-auth";
import { advanceDeliveryStatusSchema } from "@/lib/validations/payment";
import {
  canTransitionDeliveryStatus,
  canMarkDelivered,
} from "@/lib/orders/status-guards";
import {
  logDeliveryStatusChange,
  logDeliveryAttempt,
  logCashCollection,
} from "@/lib/audit/audit-logger";
import { creditFromChangeOwed } from "@/lib/credit/credit-service";
import type { UserRole, DeliveryStatus } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireRole("RIDER" as UserRole, "ADMIN" as UserRole, "SUPER_ADMIN" as UserRole);
  if (authResult instanceof NextResponse) return authResult;
  const sessionUser = authResult;

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON");

  const parsed = advanceDeliveryStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { toStatus, failReason, failNote, cashCollected, recipientName, arrivalLat, arrivalLng } =
    parsed.data;

  try {
    const delivery = await db.delivery.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            customer: true,
            otp: true,
          },
        },
      },
    });

    if (!delivery) return notFound("Delivery");

    // Riders may only manage their own assigned deliveries
    if (sessionUser.role === "RIDER") {
      const rider = await db.rider.findUnique({ where: { userId: sessionUser.id } });
      if (!rider || delivery.riderId !== rider.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const prevStatus = delivery.status;

    // Guard: check transition is allowed
    if (toStatus === "DELIVERED") {
      const otpVerified = delivery.order.otp?.isUsed ?? false;
      const guard = canMarkDelivered({ status: prevStatus, otpVerified });
      if (!guard.allowed) return badRequest(guard.reason);
    } else {
      const guard = canTransitionDeliveryStatus(prevStatus, toStatus as DeliveryStatus);
      if (!guard.allowed) return badRequest(guard.reason);
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status: toStatus,
    };

    if (toStatus === "ARRIVED") {
      updateData.arrivedAt = new Date();
      if (arrivalLat) updateData.arrivalLat = arrivalLat;
      if (arrivalLng) updateData.arrivalLng = arrivalLng;
    }

    if (toStatus === "DELIVERED") {
      updateData.deliveredAt = new Date();
      if (recipientName) updateData.recipientName = recipientName;
    }

    if (toStatus === "PICKED_UP") {
      updateData.pickedUpAt = new Date();
    }

    if (failReason) {
      updateData.failedReason = failReason;
      updateData.failedNote = failNote ?? null;
    }

    if (cashCollected !== undefined) {
      updateData.cashCollected = cashCollected;
    }

    await db.delivery.update({ where: { id }, data: updateData });

    // Record delivery attempt for DELIVERY_ATTEMPTED / FAILED / RETURNED
    if (["DELIVERY_ATTEMPTED", "FAILED", "RETURNED"].includes(toStatus)) {
      await db.deliveryAttempt.create({
        data: {
          deliveryId: id,
          result: toStatus === "DELIVERY_ATTEMPTED" ? "attempted" : "failed",
          reason: failReason ?? null,
          note: failNote ?? null,
          riderId: delivery.riderId ?? null,
        },
      });
    }

    // Handle cash collection (§9.8)
    if (toStatus === "DELIVERED" && cashCollected !== undefined) {
      const order = delivery.order;
      const amountDue = Number(order.amountDue);

      // Mark COD payment
      const payment = await db.payment.create({
        data: {
          orderId: order.id,
          method: "CASH_ON_DELIVERY",
          amount: Math.min(cashCollected, amountDue),
          status: cashCollected >= amountDue ? "PAID" : "PARTIALLY_PAID",
          cashReceivedAmount: cashCollected,
          notes: `Cash collected by rider at delivery`,
        },
      });

      await db.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: cashCollected >= amountDue ? "PAID" : "PARTIALLY_PAID",
          status: "DELIVERED",
        },
      });

      // If rider couldn't give change, record as customer credit (§9.8)
      if (cashCollected > amountDue) {
        const changeOwed = cashCollected - amountDue;
        await creditFromChangeOwed({
          customerId: order.customerId,
          orderId: order.id,
          changeAmount: changeOwed,
          createdByUserId: sessionUser.id,
        });
      }

      const rider = await db.rider.findUnique({ where: { userId: sessionUser.id } });
      if (rider) {
        await logCashCollection({
          deliveryId: id,
          orderId: order.id,
          riderId: rider.id,
          cashAmount: cashCollected,
        });
      }
    } else if (toStatus === "DELIVERED") {
      // Non-COD delivery — advance order status to DELIVERED
      await db.order.update({
        where: { id: delivery.orderId },
        data: { status: "DELIVERED" },
      });
    }

    await logDeliveryStatusChange({
      deliveryId: id,
      orderId: delivery.orderId,
      fromStatus: prevStatus,
      toStatus,
      userId: sessionUser.id,
      reason: failReason ?? null,
      note: failNote ?? null,
    });

    if (["DELIVERY_ATTEMPTED", "FAILED"].includes(toStatus)) {
      const rider = await db.rider.findUnique({ where: { userId: sessionUser.id } });
      await logDeliveryAttempt({
        deliveryId: id,
        orderId: delivery.orderId,
        riderId: rider?.id ?? sessionUser.id,
        result: toStatus === "DELIVERY_ATTEMPTED" ? "attempted" : "failed",
        reason: failReason ?? null,
        note: failNote ?? null,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/deliveries/:id/status]", err);
    return serverError();
  }
}
