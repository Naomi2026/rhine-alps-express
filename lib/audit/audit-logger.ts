/**
 * lib/audit/audit-logger.ts
 *
 * Append-only audit logger for all critical system actions.
 *
 * Business rules:
 *   §17.4  Every protected/override action requires: reason code, free-text
 *          note, acting user identity, timestamp, audit trail entry
 *   §24.1  Log all: status changes, payment code entry, cash collection,
 *          OTP submissions, delivery attempts, failed delivery reasons,
 *          overrides, and timestamps of each action
 *   §24.2  Riders and admins cannot delete audit history
 *   §24.3  Audit logs retained for 1 month in MVP
 *   §24.4  Deleted users remain visible in audit history
 *   §24.7  Every edit or override creates a new audit record while
 *          preserving the old value
 *
 * Implementation notes:
 *   - AuditLog rows are never updated or deleted in the application layer
 *   - `before` and `after` are stored as JSON snapshots of relevant fields
 *   - `action` uses dot-notation: "<entity>.<verb>" e.g. "order.status.changed"
 *   - All functions are async and return void; callers fire-and-forget or
 *     await depending on whether audit failure should block the operation
 *     (recommended: await in server actions, fire-and-forget in background jobs)
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// ── Core log input ────────────────────────────────────────────────────────────

export type AuditLogInput = {
  /** Dot-notated action identifier, e.g. "order.status.changed" */
  action: string;
  /** Prisma model name: "Order" | "Payment" | "User" | "Delivery" | "OTPRecord" | … */
  entityType: string;
  /** Primary key of the affected record */
  entityId: string;
  /** userId of the actor; null for system-triggered events */
  userId?: string | null;
  /** Denormalised orderId for fast order-centric queries */
  orderId?: string | null;
  /** State snapshot before the change */
  before?: Record<string, unknown> | null;
  /** State snapshot after the change */
  after?: Record<string, unknown> | null;
  /** Controlled reason code from REASON_CODES constants */
  reason?: string | null;
  /** Free-text note from the acting user */
  note?: string | null;
  /** Request IP address */
  ipAddress?: string | null;
};

/**
 * Core append-only log writer.
 *
 * All other helpers in this module delegate here.
 * Never update or delete AuditLog rows — this is the single write path.
 */
export async function log(input: AuditLogInput): Promise<void> {
  await db.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      userId: input.userId ?? null,
      orderId: input.orderId ?? null,
      before: (input.before ?? undefined) as Prisma.InputJsonValue | undefined,
      after: (input.after ?? undefined) as Prisma.InputJsonValue | undefined,
      reason: input.reason ?? null,
      note: input.note ?? null,
      ipAddress: input.ipAddress ?? null,
    },
  });
}

// ── Order status change ───────────────────────────────────────────────────────

/**
 * Log an order status transition.
 *
 * §24.1 — Status changes must be logged.
 * §24.7 — Before and after values preserved.
 */
export async function logOrderStatusChange(input: {
  orderId: string;
  fromStatus: string;
  toStatus: string;
  userId?: string | null;
  reason?: string | null;
  note?: string | null;
  ipAddress?: string | null;
}): Promise<void> {
  await log({
    action: "order.status.changed",
    entityType: "Order",
    entityId: input.orderId,
    orderId: input.orderId,
    userId: input.userId,
    before: { status: input.fromStatus },
    after: { status: input.toStatus },
    reason: input.reason,
    note: input.note,
    ipAddress: input.ipAddress,
  });
}

// ── Delivery status change ────────────────────────────────────────────────────

export async function logDeliveryStatusChange(input: {
  deliveryId: string;
  orderId?: string | null;
  fromStatus: string;
  toStatus: string;
  userId?: string | null;
  reason?: string | null;
  note?: string | null;
  ipAddress?: string | null;
}): Promise<void> {
  await log({
    action: "delivery.status.changed",
    entityType: "Delivery",
    entityId: input.deliveryId,
    orderId: input.orderId,
    userId: input.userId,
    before: { status: input.fromStatus },
    after: { status: input.toStatus },
    reason: input.reason,
    note: input.note,
    ipAddress: input.ipAddress,
  });
}

// ── Payment status change ─────────────────────────────────────────────────────

export async function logPaymentStatusChange(input: {
  paymentId: string;
  orderId?: string | null;
  fromStatus: string;
  toStatus: string;
  userId?: string | null;
  reason?: string | null;
  note?: string | null;
  ipAddress?: string | null;
}): Promise<void> {
  await log({
    action: "payment.status.changed",
    entityType: "Payment",
    entityId: input.paymentId,
    orderId: input.orderId,
    userId: input.userId,
    before: { status: input.fromStatus },
    after: { status: input.toStatus },
    reason: input.reason,
    note: input.note,
    ipAddress: input.ipAddress,
  });
}

// ── M-Pesa code entry ─────────────────────────────────────────────────────────

/**
 * Log when an admin enters an M-Pesa transaction code against an order.
 *
 * §9.7  — "The system shall store: transaction code, related order, admin
 *           user who entered it, date and time entered."
 * §24.6 — Payment references shall not be editable after entry — this log
 *          entry is the immutable record of that action.
 */
export async function logMpesaCodeEntry(input: {
  paymentId: string;
  orderId: string;
  mpesaCode: string;
  enteredByUserId: string;
  ipAddress?: string | null;
}): Promise<void> {
  await log({
    action: "payment.mpesa_code.entered",
    entityType: "Payment",
    entityId: input.paymentId,
    orderId: input.orderId,
    userId: input.enteredByUserId,
    after: { mpesaCode: input.mpesaCode },
    ipAddress: input.ipAddress,
  });
}

// ── Cash collection ───────────────────────────────────────────────────────────

/**
 * Log when a rider records cash received from a customer.
 *
 * §9.8  — "The rider must record the amount of cash received against the order."
 * §22   — End-of-day rider cash reconciliation entries feed from these logs.
 * §24.1 — Cash collection acknowledgement must be logged.
 */
export async function logCashCollection(input: {
  deliveryId: string;
  orderId: string;
  riderId: string;
  cashAmount: number;
  note?: string | null;
}): Promise<void> {
  await log({
    action: "delivery.cash.collected",
    entityType: "Delivery",
    entityId: input.deliveryId,
    orderId: input.orderId,
    userId: input.riderId,
    after: { cashCollected: input.cashAmount },
    note: input.note,
  });
}

// ── OTP submission ────────────────────────────────────────────────────────────

/**
 * Log an OTP verification attempt (success or failure).
 *
 * §15.4 — "The system shall record OTP verification history, including:
 *           verification result, date and time, rider or admin user."
 * §24.1 — OTP submissions must be logged.
 *
 * Note: OTPVerification table records individual attempts at the DB level.
 * This audit entry provides the order-centric view required by admin reporting.
 */
export async function logOTPAttempt(input: {
  otpRecordId: string;
  orderId: string;
  submittedBy: string;
  result: "success" | "failure";
  failureReason?: string | null;
}): Promise<void> {
  await log({
    action: `otp.verification.${input.result}`,
    entityType: "OTPRecord",
    entityId: input.otpRecordId,
    orderId: input.orderId,
    userId: input.submittedBy,
    after: {
      result: input.result,
      reason: input.failureReason ?? null,
    },
  });
}

// ── OTP override ──────────────────────────────────────────────────────────────

/**
 * Log an authorized admin override of OTP confirmation.
 *
 * §15.4 — "Any manual override of OTP confirmation shall be restricted to
 *           authorized admin users and shall require: mandatory reason, admin
 *           identity, date and time, supporting note where applicable."
 * §17.3 — "manually confirm delivery without OTP" is a protected action.
 * §17.4 — All protected override actions require audit trail entry.
 */
export async function logOTPOverride(input: {
  orderId: string;
  otpRecordId: string;
  adminUserId: string;
  reason: string;
  note?: string | null;
  ipAddress?: string | null;
}): Promise<void> {
  await log({
    action: "otp.override.applied",
    entityType: "OTPRecord",
    entityId: input.otpRecordId,
    orderId: input.orderId,
    userId: input.adminUserId,
    reason: input.reason,
    note: input.note,
    ipAddress: input.ipAddress,
  });
}

// ── Delivery attempt ──────────────────────────────────────────────────────────

/**
 * Log a delivery attempt (successful, failed, or returned).
 *
 * §24.1 — Delivery attempts and failed delivery reasons must be logged.
 */
export async function logDeliveryAttempt(input: {
  deliveryId: string;
  orderId: string;
  riderId: string;
  result: "attempted" | "failed" | "successful";
  reason?: string | null;
  note?: string | null;
}): Promise<void> {
  await log({
    action: `delivery.attempt.${input.result}`,
    entityType: "Delivery",
    entityId: input.deliveryId,
    orderId: input.orderId,
    userId: input.riderId,
    reason: input.reason,
    note: input.note,
  });
}

// ── Protected / override actions ──────────────────────────────────────────────

/**
 * Log any protected action that requires admin authorization.
 *
 * §17.3 / §17.4 — Protected actions include: pricing override, duplicate
 *   M-Pesa code override, force-complete, manual delivery confirmation,
 *   credit creation/reversal, paid order cancellation, reopen completed order,
 *   edit address after dispatch, rider reassignment after pickup.
 *
 * Use this for any action not covered by a more specific helper above.
 */
export async function logProtectedAction(input: {
  action: string;
  entityType: string;
  entityId: string;
  orderId?: string | null;
  actingUserId: string;
  reason: string;
  note?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ipAddress?: string | null;
}): Promise<void> {
  await log({
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    orderId: input.orderId,
    userId: input.actingUserId,
    before: input.before,
    after: input.after,
    reason: input.reason,
    note: input.note,
    ipAddress: input.ipAddress,
  });
}

// ── Credit transaction ────────────────────────────────────────────────────────

/**
 * Log a credit ledger entry (add or consume).
 *
 * §10.2–10.3 — Credit creation and consumption must be traceable.
 * §24.1       — Overrides (manual credit creation/reversal) must be logged.
 */
export async function logCreditTransaction(input: {
  transactionId: string;
  customerId: string;
  orderId?: string | null;
  amount: number; // positive = added, negative = consumed
  reason: string;
  actingUserId?: string | null;
  note?: string | null;
}): Promise<void> {
  await log({
    action: input.amount > 0 ? "credit.added" : "credit.consumed",
    entityType: "CreditTransaction",
    entityId: input.transactionId,
    orderId: input.orderId,
    userId: input.actingUserId,
    after: {
      customerId: input.customerId,
      amount: input.amount,
      reason: input.reason,
    },
    note: input.note,
  });
}

// ── User account events ───────────────────────────────────────────────────────

/**
 * Log account lock events (failed login threshold reached).
 *
 * §4.5 — "If rider, admin, or operations user fails login 3 times, the
 *          account shall be locked and a request sent to Super Admin."
 */
export async function logAccountLocked(input: {
  userId: string;
  triggeredByUserId?: string | null;
  reason?: string | null;
}): Promise<void> {
  await log({
    action: "user.account.locked",
    entityType: "User",
    entityId: input.userId,
    userId: input.triggeredByUserId,
    after: { isLocked: true },
    reason: input.reason ?? "failed_login_threshold",
  });
}

export async function logAccountUnlocked(input: {
  userId: string;
  unlockedByUserId: string;
  note?: string | null;
  ipAddress?: string | null;
}): Promise<void> {
  await log({
    action: "user.account.unlocked",
    entityType: "User",
    entityId: input.userId,
    userId: input.unlockedByUserId,
    after: { isLocked: false },
    note: input.note,
    ipAddress: input.ipAddress,
  });
}

// ── Order placed ──────────────────────────────────────────────────────────────

/**
 * Log the moment an order is placed.
 * Provides the creation-time snapshot used as the baseline for all subsequent
 * change diffs in the order's audit history.
 */
export async function logOrderPlaced(input: {
  orderId: string;
  customerId: string;
  snapshot: Record<string, unknown>;
}): Promise<void> {
  await log({
    action: "order.placed",
    entityType: "Order",
    entityId: input.orderId,
    orderId: input.orderId,
    userId: input.customerId,
    after: input.snapshot,
  });
}

// ── Order edit ────────────────────────────────────────────────────────────────

/**
 * Log a customer-initiated order edit (location, slot, or payment method).
 *
 * §8.3–8.5 — Allowed before admin confirmation.
 * §8.7     — Location/payment changes that affect price trigger repricing.
 * §24.7    — Old value preserved in `before`, new value in `after`.
 */
export async function logOrderEdit(input: {
  orderId: string;
  field: string;
  before: unknown;
  after: unknown;
  editedByUserId: string;
  repriced?: boolean;
  note?: string | null;
}): Promise<void> {
  await log({
    action: "order.edited",
    entityType: "Order",
    entityId: input.orderId,
    orderId: input.orderId,
    userId: input.editedByUserId,
    before: { [input.field]: input.before },
    after: {
      [input.field]: input.after,
      ...(input.repriced ? { repriced: true } : {}),
    },
    note: input.note,
  });
}
