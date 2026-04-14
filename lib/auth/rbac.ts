/**
 * lib/auth/rbac.ts
 *
 * Role-based access control utilities.
 * Used in server components, server actions, and API routes
 * to enforce permission rules.
 */

import { UserRole } from "@prisma/client";
import type { SessionUser } from "@/lib/types";

// ── Role hierarchy helpers ───────────────────────────────────────────────────

export function isCustomer(user: SessionUser | null | undefined): boolean {
  return user?.role === UserRole.CUSTOMER;
}

export function isRider(user: SessionUser | null | undefined): boolean {
  return user?.role === UserRole.RIDER;
}

export function isAdmin(user: SessionUser | null | undefined): boolean {
  return (
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN
  );
}

export function isSuperAdmin(user: SessionUser | null | undefined): boolean {
  return user?.role === UserRole.SUPER_ADMIN;
}

// ── Protected-action permissions (§17.3) ────────────────────────────────────

/** Only Super Admin can override pricing. */
export function canOverridePricing(user: SessionUser): boolean {
  return isSuperAdmin(user);
}

/** Only Super Admin can override duplicate M-Pesa codes. */
export function canOverrideDuplicateMpesa(user: SessionUser): boolean {
  return isSuperAdmin(user);
}

/** Admin or Super Admin can force-complete an order. */
export function canForceCompleteOrder(user: SessionUser): boolean {
  return isAdmin(user);
}

/** Only authorised admins can confirm delivery without OTP. */
export function canOverrideOTP(user: SessionUser): boolean {
  return isAdmin(user);
}

/** Only Super Admin can create or reverse credit above threshold. */
export function canManageCredit(user: SessionUser): boolean {
  return isAdmin(user);
}

/** Super Admin approval required for credit above threshold (§10.4). */
export function requiresSuperAdminCreditApproval(
  user: SessionUser,
  amountKes: number,
  thresholdKes: number
): boolean {
  return !isSuperAdmin(user) && amountKes > thresholdKes;
}

/** Only admin can cancel a paid order (§17.3). */
export function canCancelPaidOrder(user: SessionUser): boolean {
  return isAdmin(user);
}

/** Reassign rider after pickup — admin override only (§18.6). */
export function canReassignRiderAfterPickup(user: SessionUser): boolean {
  return isAdmin(user);
}

/** Reopen a completed order (§17.3). */
export function canReopenCompletedOrder(user: SessionUser): boolean {
  return isAdmin(user);
}

/** Edit delivery address after dispatch (§17.3). */
export function canEditAddressAfterDispatch(user: SessionUser): boolean {
  return isAdmin(user);
}

// ── Admin account management (§17.1) ────────────────────────────────────────

/** Only Super Admin can create admin accounts. */
export function canCreateAdminAccount(user: SessionUser): boolean {
  return isSuperAdmin(user);
}

/** Password reset for admins/riders requires Super Admin approval (§4.5). */
export function canApprovePasswordReset(user: SessionUser): boolean {
  return isSuperAdmin(user);
}

// ── Generic route guard ──────────────────────────────────────────────────────

/**
 * Throws an error if user does not have one of the required roles.
 * Use inside Server Actions and API route handlers.
 */
export function requireRole(
  user: SessionUser | null | undefined,
  ...allowed: UserRole[]
): asserts user is SessionUser {
  if (!user) {
    throw new Error("Unauthenticated");
  }
  if (!allowed.includes(user.role)) {
    throw new Error(
      `Forbidden: role ${user.role} is not permitted for this action`
    );
  }
}

/**
 * Throws if user is not an admin (ADMIN or SUPER_ADMIN).
 */
export function requireAdmin(user: SessionUser | null | undefined): asserts user is SessionUser {
  requireRole(user, UserRole.ADMIN, UserRole.SUPER_ADMIN);
}

/**
 * Throws if user is not a Super Admin.
 */
export function requireSuperAdmin(user: SessionUser | null | undefined): asserts user is SessionUser {
  requireRole(user, UserRole.SUPER_ADMIN);
}
