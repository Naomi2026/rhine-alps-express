/**
 * app/api/users/[id]/unlock/route.ts
 *
 * PATCH /api/users/:id/unlock
 * Super Admin unlocks a locked account (§4.5).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, notFound, serverError } from "@/lib/auth/api-auth";
import { logAccountUnlocked } from "@/lib/audit/audit-logger";
import type { UserRole } from "@prisma/client";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireRole("SUPER_ADMIN" as UserRole);
  if (authResult instanceof NextResponse) return authResult;
  const sessionUser = authResult;

  try {
    const user = await db.user.findUnique({ where: { id } });
    if (!user) return notFound("User");

    await db.user.update({
      where: { id },
      data: {
        isLocked: false,
        failedLogins: 0,
      },
    });

    await logAccountUnlocked({
      userId: id,
      unlockedByUserId: sessionUser.id,
      note: "Unlocked by Super Admin",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/users/:id/unlock]", err);
    return serverError();
  }
}
