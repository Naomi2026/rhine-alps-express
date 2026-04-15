/**
 * lib/auth/api-auth.ts
 *
 * Helpers for authenticating API route handlers.
 * Returns typed session users or a 401 NextResponse.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { UserRole } from "@prisma/client";
import type { SessionUser } from "@/lib/types";

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user as SessionUser;
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(resource = "Resource"): NextResponse {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}

export function conflict(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 409 });
}

export function serverError(message = "Internal server error"): NextResponse {
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Require a logged-in session with one of the given roles. */
export async function requireRole(
  ...roles: UserRole[]
): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!roles.includes(user.role as UserRole)) return forbidden();
  return user;
}
