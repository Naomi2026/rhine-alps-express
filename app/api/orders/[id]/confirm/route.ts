/**
 * app/api/orders/[id]/confirm/route.ts
 *
 * POST /api/orders/:id/confirm
 *
 * Admin confirms the order, which:
 * - Sets isAdminConfirmed = true
 * - Advances order status to CONFIRMED
 * - Locks the order against further customer edits (§8.6)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, badRequest, notFound, serverError } from "@/lib/auth/api-auth";
import { logOrderStatusChange } from "@/lib/audit/audit-logger";
import type { UserRole } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireRole("ADMIN" as UserRole, "SUPER_ADMIN" as UserRole);
  if (authResult instanceof NextResponse) return authResult;
  const sessionUser = authResult;

  try {
    const order = await db.order.findUnique({ where: { id } });
    if (!order) return notFound("Order");

    if (order.isAdminConfirmed) return badRequest("Order is already confirmed.");
    if (order.status === "CANCELLED") return badRequest("Cannot confirm a cancelled order.");

    await db.order.update({
      where: { id },
      data: {
        isAdminConfirmed: true,
        status: "CONFIRMED",
      },
    });

    await logOrderStatusChange({
      orderId: id,
      fromStatus: order.status,
      toStatus: "CONFIRMED",
      userId: sessionUser.id,
      note: "Admin confirmed",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/orders/:id/confirm]", err);
    return serverError();
  }
}
