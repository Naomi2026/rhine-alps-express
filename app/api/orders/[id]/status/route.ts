/**
 * app/api/orders/[id]/status/route.ts
 *
 * POST /api/orders/:id/status
 *
 * Admin advances order status through the business lifecycle (§12).
 * Uses status-guards to validate each transition.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, badRequest, notFound, serverError } from "@/lib/auth/api-auth";
import { advanceOrderStatusSchema } from "@/lib/validations/order";
import { canTransitionOrderStatus, canCompleteOrder } from "@/lib/orders/status-guards";
import { logOrderStatusChange } from "@/lib/audit/audit-logger";
import type { UserRole, OrderStatus } from "@prisma/client";

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

  const parsed = advanceOrderStatusSchema.safeParse({ ...body, actingUserId: sessionUser.id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { toStatus, reason, note } = parsed.data;

  try {
    const order = await db.order.findUnique({ where: { id } });
    if (!order) return notFound("Order");

    // Check transition is allowed
    const guard = canTransitionOrderStatus(order.status, toStatus as OrderStatus);
    if (!guard.allowed) return badRequest(guard.reason);

    // Extra check for COMPLETED — payment must be settled (§16.2)
    if (toStatus === "COMPLETED") {
      const completionGuard = canCompleteOrder({
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
      });
      if (!completionGuard.allowed) return badRequest(completionGuard.reason);
    }

    await db.order.update({
      where: { id },
      data: { status: toStatus as OrderStatus },
    });

    // Update loyalty count on completion
    if (toStatus === "COMPLETED" && order.countsForLoyalty && !order.isLoyaltyReward) {
      await db.customer.update({
        where: { id: order.customerId },
        data: { loyaltyCount: { increment: 1 } },
      });
    }

    await logOrderStatusChange({
      orderId: id,
      fromStatus: order.status,
      toStatus,
      userId: sessionUser.id,
      reason: reason ?? null,
      note: note ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/orders/:id/status]", err);
    return serverError();
  }
}
