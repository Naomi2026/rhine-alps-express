/**
 * app/api/orders/[id]/force-complete/route.ts
 *
 * POST /api/orders/:id/force-complete
 *
 * Protected action: Admin force-completes a delivered order (§17.3).
 * Requires mandatory reason code and note. Every call is audited (§17.4).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, badRequest, notFound, serverError } from "@/lib/auth/api-auth";
import { forceCompleteSchema } from "@/lib/validations/order";
import { logProtectedAction, logOrderStatusChange } from "@/lib/audit/audit-logger";
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

  const parsed = forceCompleteSchema.safeParse({ ...body, actingUserId: sessionUser.id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { reason, note } = parsed.data;

  try {
    const order = await db.order.findUnique({ where: { id } });
    if (!order) return notFound("Order");

    if (order.status === "COMPLETED") {
      return badRequest("Order is already completed.");
    }

    const prevStatus = order.status;

    await db.order.update({
      where: { id },
      data: { status: "COMPLETED" },
    });

    // Increment loyalty on force-complete (§11.1 qualifying rules still apply)
    if (order.countsForLoyalty && !order.isLoyaltyReward) {
      await db.customer.update({
        where: { id: order.customerId },
        data: { loyaltyCount: { increment: 1 } },
      });
    }

    await logProtectedAction({
      action: "order.force_completed",
      entityType: "Order",
      entityId: id,
      orderId: id,
      actingUserId: sessionUser.id,
      reason,
      note: note ?? null,
      before: { status: prevStatus },
      after: { status: "COMPLETED" },
    });

    await logOrderStatusChange({
      orderId: id,
      fromStatus: prevStatus,
      toStatus: "COMPLETED",
      userId: sessionUser.id,
      reason,
      note,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/orders/:id/force-complete]", err);
    return serverError();
  }
}
