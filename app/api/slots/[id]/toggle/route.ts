/**
 * app/api/slots/[id]/toggle/route.ts
 *
 * PATCH /api/slots/:id/toggle
 * Admin enables or disables a delivery slot.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, notFound, serverError } from "@/lib/auth/api-auth";
import { log } from "@/lib/audit/audit-logger";
import type { UserRole } from "@prisma/client";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireRole("ADMIN" as UserRole, "SUPER_ADMIN" as UserRole);
  if (authResult instanceof NextResponse) return authResult;
  const sessionUser = authResult;

  try {
    const slot = await db.deliverySlot.findUnique({ where: { id } });
    if (!slot) return notFound("Slot");

    const updated = await db.deliverySlot.update({
      where: { id },
      data: { isActive: !slot.isActive },
    });

    await log({
      action: slot.isActive ? "slot.disabled" : "slot.enabled",
      entityType: "DeliverySlot",
      entityId: id,
      userId: sessionUser.id,
      before: { isActive: slot.isActive },
      after: { isActive: updated.isActive },
    });

    return NextResponse.json({ isActive: updated.isActive });
  } catch (err) {
    console.error("[PATCH /api/slots/:id/toggle]", err);
    return serverError();
  }
}
