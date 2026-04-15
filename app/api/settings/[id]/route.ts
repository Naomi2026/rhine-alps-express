/**
 * app/api/settings/[id]/route.ts
 *
 * PATCH /api/settings/:id
 * Super Admin updates a system setting value.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole, badRequest, notFound, serverError } from "@/lib/auth/api-auth";
import { log } from "@/lib/audit/audit-logger";
import type { UserRole } from "@prisma/client";

const schema = z.object({
  value: z.string().min(1, "Value cannot be empty"),
  updatedById: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireRole("SUPER_ADMIN" as UserRole);
  if (authResult instanceof NextResponse) return authResult;
  const sessionUser = authResult;

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON");

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { value } = parsed.data;

  try {
    const setting = await db.systemSetting.findUnique({ where: { id } });
    if (!setting) return notFound("Setting");

    const prevValue = setting.value;

    await db.systemSetting.update({
      where: { id },
      data: { value, updatedById: sessionUser.id },
    });

    await log({
      action: "system.setting.updated",
      entityType: "SystemSetting",
      entityId: id,
      userId: sessionUser.id,
      before: { key: setting.key, value: prevValue },
      after: { key: setting.key, value },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/settings/:id]", err);
    return serverError();
  }
}
