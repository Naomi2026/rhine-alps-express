/**
 * app/api/orders/[id]/assign-rider/route.ts
 *
 * POST /api/orders/:id/assign-rider
 *
 * Admin assigns a rider to an order (§18.6).
 * Creates a Delivery record if one doesn't exist, or updates the riderId.
 * Validates payment eligibility for Band 3 (§9.6).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, badRequest, notFound, serverError } from "@/lib/auth/api-auth";
import { assignRiderSchema } from "@/lib/validations/order";
import { canAssignRider } from "@/lib/orders/status-guards";
import { logDeliveryStatusChange, log } from "@/lib/audit/audit-logger";
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

  const parsed = assignRiderSchema.safeParse({ ...body, actingUserId: sessionUser.id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { riderId } = parsed.data;

  try {
    const [order, rider] = await Promise.all([
      db.order.findUnique({
        where: { id },
        include: { delivery: true },
      }),
      db.rider.findUnique({ where: { id: riderId } }),
    ]);

    if (!order) return notFound("Order");
    if (!rider) return notFound("Rider");

    // Check assignment is allowed
    const guard = canAssignRider({
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      pricingBand: order.pricingBand,
    });
    if (!guard.allowed) return badRequest(guard.reason);

    if (order.delivery) {
      // Update existing delivery record
      const prevRiderId = order.delivery.riderId;
      await db.delivery.update({
        where: { id: order.delivery.id },
        data: {
          riderId,
          status: "ASSIGNED",
        },
      });

      await log({
        action: "delivery.rider.assigned",
        entityType: "Delivery",
        entityId: order.delivery.id,
        orderId: id,
        userId: sessionUser.id,
        before: { riderId: prevRiderId },
        after: { riderId },
      });
    } else {
      // Create delivery record
      const delivery = await db.delivery.create({
        data: {
          orderId: id,
          riderId,
          status: "ASSIGNED",
        },
      });

      await logDeliveryStatusChange({
        deliveryId: delivery.id,
        orderId: id,
        fromStatus: "NOT_SCHEDULED",
        toStatus: "ASSIGNED",
        userId: sessionUser.id,
      });
    }

    // Advance order to ASSIGNED_TO_RIDER if it's READY_FOR_DISPATCH
    if (order.status === "READY_FOR_DISPATCH") {
      await db.order.update({
        where: { id },
        data: { status: "ASSIGNED_TO_RIDER" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/orders/:id/assign-rider]", err);
    return serverError();
  }
}
