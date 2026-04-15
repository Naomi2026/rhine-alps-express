/**
 * app/api/users/route.ts
 *
 * POST /api/users
 * Super Admin creates a new admin or rider account (§17.1).
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireRole, badRequest, conflict, serverError } from "@/lib/auth/api-auth";
import { createUserSchema } from "@/lib/validations/user";
import { normaliseKenyanPhone } from "@/lib/utils";
import { log } from "@/lib/audit/audit-logger";
import type { UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  const authResult = await requireRole("SUPER_ADMIN" as UserRole);
  if (authResult instanceof NextResponse) return authResult;
  const sessionUser = authResult;

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON");

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { name, email, phone, password, role, createdById } = parsed.data;

  try {
    const normPhone = phone ? normaliseKenyanPhone(phone) : undefined;

    // Uniqueness checks
    if (email) {
      const exists = await db.user.findUnique({ where: { email } });
      if (exists) return conflict("An account with this email already exists.");
    }
    if (normPhone) {
      const exists = await db.user.findUnique({ where: { phone: normPhone } });
      if (exists) return conflict("An account with this phone number already exists.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email: email || null,
          phone: normPhone ?? null,
          passwordHash,
          role: role as UserRole,
          isActive: true,
          createdById: createdById ?? null,
        },
      });

      // Create the role-specific profile record
      if (role === "RIDER") {
        await tx.rider.create({ data: { userId: newUser.id } });
      }

      return newUser;
    });

    await log({
      action: "user.created",
      entityType: "User",
      entityId: user.id,
      userId: sessionUser.id,
      after: { name, role, email: email || null, phone: normPhone ?? null },
    });

    return NextResponse.json(
      { id: user.id, name: user.name, role: user.role },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/users]", err);
    return serverError();
  }
}
