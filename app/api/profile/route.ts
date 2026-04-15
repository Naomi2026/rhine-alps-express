/**
 * app/api/profile/route.ts
 *
 * PATCH /api/profile
 * Customer updates their name, phone, and default delivery address.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, badRequest, conflict, serverError } from "@/lib/auth/api-auth";
import { updateProfileSchema } from "@/lib/validations/user";
import { normaliseKenyanPhone } from "@/lib/utils";
import { log } from "@/lib/audit/audit-logger";
import type { UserRole } from "@prisma/client";

export async function PATCH(req: NextRequest) {
  const authResult = await requireRole("CUSTOMER" as UserRole);
  if (authResult instanceof NextResponse) return authResult;
  const sessionUser = authResult;

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON");

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { name, phone, defaultAddress, defaultLat, defaultLng } = parsed.data;

  try {
    const normPhone = phone ? normaliseKenyanPhone(phone) : undefined;

    // Check phone uniqueness if changing
    if (normPhone) {
      const existing = await db.user.findFirst({
        where: { phone: normPhone, NOT: { id: sessionUser.id } },
      });
      if (existing) return conflict("This phone number is already registered to another account.");
    }

    const userUpdates: Record<string, unknown> = {};
    if (name) userUpdates.name = name;
    if (normPhone !== undefined) userUpdates.phone = normPhone || null;

    const customerUpdates: Record<string, unknown> = {};
    if (defaultAddress !== undefined) customerUpdates.defaultAddress = defaultAddress || null;
    if (defaultLat !== undefined) customerUpdates.defaultLat = defaultLat;
    if (defaultLng !== undefined) customerUpdates.defaultLng = defaultLng;

    await db.$transaction([
      ...(Object.keys(userUpdates).length > 0
        ? [db.user.update({ where: { id: sessionUser.id }, data: userUpdates })]
        : []),
      ...(Object.keys(customerUpdates).length > 0
        ? [
            db.customer.update({
              where: { userId: sessionUser.id },
              data: customerUpdates,
            }),
          ]
        : []),
    ]);

    await log({
      action: "user.profile.updated",
      entityType: "User",
      entityId: sessionUser.id,
      userId: sessionUser.id,
      after: { ...userUpdates, ...customerUpdates },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/profile]", err);
    return serverError();
  }
}
