/**
 * lib/credit/credit-service.ts
 *
 * Customer credit ledger management and automatic order application.
 *
 * Business rules:
 *   §10.1  No cash refunds — all approved balances become customer credit
 *   §10.2  Credit sources: cancelled paid orders, overpayments, change owed,
 *          manual adjustments
 *   §10.3  Credit auto-applied to the next eligible order; customer cannot
 *          opt out; if credit > order total, remainder stays as credit
 *   §10.4  Credit does not expire; admin cannot reduce credit; Super Admin
 *          approval required above threshold; credit applied to final
 *          payable balance after pricing and fees
 *   §9.11  Mixed settlement: credit + cash or credit + M-Pesa
 *   §11.1  Loyalty reward and credit cannot be used on the same order
 *
 * Implementation notes:
 *   - CreditTransaction is an immutable ledger (append-only, §24)
 *   - Customer.creditBalance is the running total, updated in the same
 *     transaction as each ledger entry
 *   - All writes use Prisma transactions for consistency
 */

import { db } from "@/lib/db";
import type { CreditReason } from "@prisma/client";
import { CREDIT } from "@/lib/constants";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AddCreditInput = {
  customerId: string;
  amount: number; // must be positive
  reason: CreditReason;
  relatedOrderId?: string;
  createdByUserId?: string;
  note?: string;
};

export type ConsumeCreditInput = {
  customerId: string;
  amount: number; // must be positive — stored as negative in ledger
  relatedOrderId?: string;
  createdByUserId?: string;
  note?: string;
};

export type CreditApplicationResult = {
  creditApplied: number;
  amountDue: number;
  remainingCredit: number;
};

// ── Add credit ────────────────────────────────────────────────────────────────

/**
 * Add credit to a customer's account.
 *
 * Creates a positive CreditTransaction ledger entry and increments
 * Customer.creditBalance atomically.
 *
 * §10.4 — Callers must enforce Super Admin approval gate when amount exceeds
 *          CREDIT.SUPER_ADMIN_THRESHOLD_KES (1000 KES). This function does not
 *          enforce the gate itself — that belongs in the server action / API layer.
 */
export async function addCredit(input: AddCreditInput): Promise<void> {
  const { customerId, amount, reason, relatedOrderId, createdByUserId, note } =
    input;

  if (amount <= 0) {
    throw new Error("addCredit: amount must be positive");
  }

  await db.$transaction([
    db.creditTransaction.create({
      data: {
        customerId,
        amount,
        reason,
        relatedOrderId: relatedOrderId ?? null,
        createdByUserId: createdByUserId ?? null,
        note: note ?? null,
      },
    }),
    db.customer.update({
      where: { id: customerId },
      data: { creditBalance: { increment: amount } },
    }),
  ]);
}

// ── Consume credit ────────────────────────────────────────────────────────────

/**
 * Consume (deduct) credit from a customer's account.
 *
 * Creates a negative CreditTransaction ledger entry and decrements
 * Customer.creditBalance atomically.
 *
 * Throws if the customer does not have sufficient credit.
 * Callers should call calculateCreditApplication() first to determine the
 * amount to consume before calling this.
 */
export async function consumeCredit(input: ConsumeCreditInput): Promise<void> {
  const { customerId, amount, relatedOrderId, createdByUserId, note } = input;

  if (amount <= 0) {
    throw new Error("consumeCredit: amount must be positive");
  }

  // Guard: ensure customer has sufficient balance
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: { creditBalance: true },
  });

  if (!customer) {
    throw new Error(`consumeCredit: customer ${customerId} not found`);
  }

  const balance = Number(customer.creditBalance);
  if (balance < amount) {
    throw new Error(
      `consumeCredit: insufficient credit (have ${balance}, need ${amount})`
    );
  }

  await db.$transaction([
    db.creditTransaction.create({
      data: {
        customerId,
        amount: -amount, // negative = consumed
        reason: "CREDIT_USED",
        relatedOrderId: relatedOrderId ?? null,
        createdByUserId: createdByUserId ?? null,
        note: note ?? null,
      },
    }),
    db.customer.update({
      where: { id: customerId },
      data: { creditBalance: { decrement: amount } },
    }),
  ]);
}

// ── Credit application ────────────────────────────────────────────────────────

/**
 * Calculate how much customer credit to apply to an order.
 *
 * §10.3 rules:
 *   - Credit is applied automatically; customer cannot opt out
 *   - Applied to final payable balance (after pricing + delivery fee)
 *   - If credit ≥ order total → amountDue = 0; remainder stays as credit
 *   - If credit < order total → creditApplied = full balance; amountDue = remainder
 *
 * §11.1 — If the order uses a loyalty reward, credit must NOT be applied.
 *          Callers are responsible for passing isLoyaltyReward correctly.
 *
 * This function is pure (no DB access) — it calculates amounts only.
 * To actually apply the credit, call applyAndConsumeCredit().
 */
export function calculateCreditApplication(
  orderTotal: number,
  availableCredit: number,
  isLoyaltyReward = false
): CreditApplicationResult {
  if (isLoyaltyReward || availableCredit <= 0 || orderTotal <= 0) {
    return {
      creditApplied: 0,
      amountDue: orderTotal,
      remainingCredit: availableCredit,
    };
  }

  const creditApplied = Math.min(availableCredit, orderTotal);
  const amountDue = Math.max(0, orderTotal - creditApplied);
  const remainingCredit = availableCredit - creditApplied;

  return { creditApplied, amountDue, remainingCredit };
}

/**
 * Apply and consume credit against an order in one operation.
 *
 * Updates the Order record (creditApplied, amountDue) and creates a negative
 * CreditTransaction ledger entry — all in a single DB transaction.
 *
 * Returns the updated CreditApplicationResult.
 *
 * §10.3 — "Available customer credit shall be deducted automatically."
 * §10.4 — "Customer credit shall not be disabled for a specific order."
 */
export async function applyAndConsumeCredit(input: {
  orderId: string;
  customerId: string;
  orderTotal: number;
  isLoyaltyReward?: boolean;
}): Promise<CreditApplicationResult> {
  const { orderId, customerId, orderTotal, isLoyaltyReward = false } = input;

  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: { creditBalance: true },
  });

  if (!customer) {
    throw new Error(`applyAndConsumeCredit: customer ${customerId} not found`);
  }

  const availableCredit = Number(customer.creditBalance);
  const result = calculateCreditApplication(
    orderTotal,
    availableCredit,
    isLoyaltyReward
  );

  if (result.creditApplied <= 0) {
    return result;
  }

  // Consume credit and update order atomically
  await db.$transaction([
    db.creditTransaction.create({
      data: {
        customerId,
        amount: -result.creditApplied,
        reason: "CREDIT_USED",
        relatedOrderId: orderId,
        note: "Auto-applied at order creation",
      },
    }),
    db.customer.update({
      where: { id: customerId },
      data: { creditBalance: { decrement: result.creditApplied } },
    }),
    db.order.update({
      where: { id: orderId },
      data: {
        creditApplied: result.creditApplied,
        amountDue: result.amountDue,
        paymentStatus:
          result.amountDue === 0 ? "CREDIT_APPLIED" : undefined,
      },
    }),
  ]);

  return result;
}

// ── Credit from cancellation ──────────────────────────────────────────────────

/**
 * Convert a paid cancelled order's amount into customer credit.
 *
 * §10.2 — "Customer credit may be created from cancelled paid orders."
 * §21.3 — "If a paid order is cancelled, the paid amount shall be converted
 *           to customer credit."
 *
 * The amount credited is the total paid amount (not just amountDue) since
 * the customer has already paid in full or partially.
 */
export async function creditFromCancelledOrder(input: {
  customerId: string;
  orderId: string;
  paidAmount: number;
  createdByUserId: string;
  note?: string;
}): Promise<void> {
  const { customerId, orderId, paidAmount, createdByUserId, note } = input;

  if (paidAmount <= 0) return;

  await addCredit({
    customerId,
    amount: paidAmount,
    reason: "CANCELLED_ORDER",
    relatedOrderId: orderId,
    createdByUserId,
    note: note ?? `Credit issued for cancellation of order ${orderId}`,
  });
}

// ── Credit from change owed ───────────────────────────────────────────────────

/**
 * Record credit owed to a customer when a COD rider cannot make change.
 *
 * §9.8 — "If change cannot be returned in cash, the remaining amount shall
 *          be recorded as customer credit."
 */
export async function creditFromChangeOwed(input: {
  customerId: string;
  orderId: string;
  changeAmount: number;
  createdByUserId: string;
}): Promise<void> {
  const { customerId, orderId, changeAmount, createdByUserId } = input;

  await addCredit({
    customerId,
    amount: changeAmount,
    reason: "CHANGE_OWED",
    relatedOrderId: orderId,
    createdByUserId,
    note: `Change owed from COD order ${orderId}`,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Determine whether a credit adjustment requires Super Admin approval.
 * §10.4 — "Super Admin approval shall be required above an approved credit
 *           threshold defined in system settings."
 */
export function requiresSuperAdminApproval(amount: number): boolean {
  return amount > CREDIT.SUPER_ADMIN_THRESHOLD_KES;
}
