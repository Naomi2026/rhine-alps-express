/**
 * app/api/orders/[id]/cancel/route.ts
 *
 * POST /api/orders/:id/cancel
 *
 * Customer may cancel before dispatch (§21.1).
 * If the order was paid, the paid amount is converted to customer credit (§21.3).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, badRequest, notFound, forbidden, serverError } from "@/lib/auth/api-auth";
import { cancelOrderSchema } from "@/lib/validations/order";
import { creditFromCancelledOrder } from "@/lib/credit/credit-service";
import { logOrderStatusChange } from "@/lib/audit/audit-logger";
import type { UserRole } from "@prisma/client";

// Statuses after which a customer can no longer self-cancel
const DISPATCH_STATUSES = new Set([
  "READY_FOR_DISPATCH",
  "ASSIGNED_TO_RIDER",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireRole("CUSTOMER" as UserRole, "ADMIN" as UserRole, "SUPER_ADMIN" as UserRole);
  if (authResult instanceof NextResponse) return authResult;
  const sessionUser = authResult;

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON");

  const parsed = cancelOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }
  const { reason, note } = parsed.data;

  try {
    const order = await db.order.findUnique({
      where: { id },
      include: {
        customer: true,
        payments: { where: { status: "PAID" } },
      },
    });

    if (!order) return notFound("Order");

    // Customers may only cancel their own orders
    if (sessionUser.role === "CUSTOMER") {
      const customer = await db.customer.findUnique({
        where: { userId: sessionUser.id },
      });
      if (!customer || order.customerId !== customer.id) return forbidden();
    }

    // §21.1 — Customer cannot freely cancel after dispatch
    if (sessionUser.role === "CUSTOMER" && DISPATCH_STATUSES.has(order.status)) {
      return badRequest("This order has already been dispatched and cannot be cancelled.");
    }

    if (order.status === "CANCELLED") {
      return badRequest("Order is already cancelled.");
    }
    if (order.status === "COMPLETED") {
      return badRequest("Completed orders cannot be cancelled.");
    }

    const prevStatus = order.status;

    // Update order status
    await db.order.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancellationReason: reason,
        cancellationNote: note ?? null,
      },
    });

    // §21.3 — Convert paid amount to customer credit
    const totalPaid = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    if (totalPaid > 0) {
      await creditFromCancelledOrder({
        customerId: order.customerId,
        orderId: order.id,
        paidAmount: totalPaid,
        createdByUserId: sessionUser.id,
      });
    }

    await logOrderStatusChange({
      orderId: id,
      fromStatus: prevStatus,
      toStatus: "CANCELLED",
      userId: sessionUser.id,
      reason,
      note,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/orders/:id/cancel]", err);
    return serverError();
  }
}
