/**
 * lib/auth/session.ts
 *
 * Server-side session helpers.
 * Call these from Server Components, Server Actions, and API routes.
 */

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { getDashboardPath } from "@/auth.config";
import type { SessionUser } from "@/lib/types";

/**
 * Returns the current session user, or null if not authenticated.
 * Safe to call from any Server Component.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user as SessionUser;
}

/**
 * Returns the current session user and redirects to /login if not authenticated.
 * Use in page-level Server Components that require authentication.
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Requires authentication AND a specific role.
 * Redirects to /login if unauthenticated, or to the user's own dashboard
 * if they have the wrong role.
 */
export async function requireAuthWithRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    redirect(getDashboardPath(user.role));
  }
  return user;
}

/** Convenience: require CUSTOMER role. */
export async function requireCustomer(): Promise<SessionUser> {
  return requireAuthWithRole(UserRole.CUSTOMER);
}

/** Convenience: require RIDER role. */
export async function requireRider(): Promise<SessionUser> {
  return requireAuthWithRole(UserRole.RIDER);
}

/** Convenience: require ADMIN or SUPER_ADMIN role. */
export async function requireAdminSession(): Promise<SessionUser> {
  return requireAuthWithRole(UserRole.ADMIN, UserRole.SUPER_ADMIN);
}

/** Convenience: require SUPER_ADMIN role. */
export async function requireSuperAdminSession(): Promise<SessionUser> {
  return requireAuthWithRole(UserRole.SUPER_ADMIN);
}
