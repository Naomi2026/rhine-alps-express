/**
 * lib/orders/status-guards.ts
 *
 * Status transition guards for the three independent lifecycles:
 *   - Order status     (§12, §27)
 *   - Delivery status  (§13, §27)
 *   - Payment status   (§14, §27)
 *
 * Each guard returns a typed result so callers can surface the exact reason
 * a transition is blocked — not just a boolean.
 *
 * Key rules enforced here:
 *   §16.1  "Delivered" and "Completed" are separate states
 *   §16.2  Order cannot be completed unless payment is settled
 *   §15.2  Delivery cannot move to DELIVERED without valid OTP
 *   §9.6   Unpaid Band 3 M-Pesa orders cannot be assigned to a rider
 *   §8.6   Customer cannot edit after admin confirmation
 *   §13.2  Rider may only move delivery through approved sequential states
 *
 * All transition maps are sourced from lib/constants/index.ts so they remain
 * the single source of truth.
 */

import type {
  OrderStatus,
  DeliveryStatus,
  PaymentStatus,
  PricingBand,
  PaymentMethod,
} from "@prisma/client";
import {
  ORDER_STATUS_TRANSITIONS,
  DELIVERY_STATUS_TRANSITIONS,
} from "@/lib/constants";

// ── Generic transition check ──────────────────────────────────────────────────

export type TransitionResult =
  | { allowed: true }
  | { allowed: false; reason: string };

function checkTransition(
  map: Record<string, string[]>,
  from: string,
  to: string
): TransitionResult {
  const allowed = map[from] ?? [];
  if (allowed.includes(to)) return { allowed: true };
  return {
    allowed: false,
    reason: `Transition from ${from} to ${to} is not permitted`,
  };
}

// ── Order status transitions ──────────────────────────────────────────────────

/**
 * Check whether an order status transition is allowed.
 *
 * Uses the ORDER_STATUS_TRANSITIONS map from constants, which encodes the
 * full business lifecycle defined in §12.
 */
export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus
): TransitionResult {
  return checkTransition(ORDER_STATUS_TRANSITIONS, from, to);
}

// ── Delivery status transitions ───────────────────────────────────────────────

/**
 * Check whether a delivery status transition is allowed.
 *
 * §13.2 — "The rider shall be allowed to move an order only through approved
 *           delivery states. Mandatory workflow steps shall not be skipped."
 */
export function canTransitionDeliveryStatus(
  from: DeliveryStatus,
  to: DeliveryStatus
): TransitionResult {
  return checkTransition(DELIVERY_STATUS_TRANSITIONS, from, to);
}

// ── Payment status transitions ────────────────────────────────────────────────

/**
 * Valid payment status progressions.
 *
 * §14 — Payment statuses are not a linear chain; multiple paths exist
 *        depending on payment method and settlement type.
 */
const PAYMENT_STATUS_TRANSITIONS: Record<string, PaymentStatus[]> = {
  UNPAID: ["PENDING_VERIFICATION", "PARTIALLY_PAID", "PAID", "FAILED", "CREDIT_APPLIED"],
  PENDING_VERIFICATION: ["PAID", "FAILED", "PARTIALLY_PAID"],
  PARTIALLY_PAID: ["PAID", "FAILED"],
  PAID: [], // terminal
  FAILED: ["UNPAID", "PENDING_VERIFICATION"],
  CREDIT_APPLIED: ["PAID"], // credit covered the order fully or remainder needs payment
};

export function canTransitionPaymentStatus(
  from: PaymentStatus,
  to: PaymentStatus
): TransitionResult {
  const allowed = PAYMENT_STATUS_TRANSITIONS[from] ?? [];
  if (allowed.includes(to)) return { allowed: true };
  return {
    allowed: false,
    reason: `Payment status transition from ${from} to ${to} is not permitted`,
  };
}

// ── Order completion guard ────────────────────────────────────────────────────

type OrderForCompletion = {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
};

/**
 * Guard: can this order be moved to COMPLETED?
 *
 * §16.2 — "Admin shall not mark the order as fully completed unless the
 *           payment status is confirmed as paid or otherwise validly settled."
 * §9.8  — COD orders must have payment confirmed by rider before completion.
 */
export function canCompleteOrder(order: OrderForCompletion): TransitionResult {
  if (order.status !== "DELIVERED") {
    return {
      allowed: false,
      reason: "Order must be in DELIVERED status before it can be completed",
    };
  }

  const settledStatuses: PaymentStatus[] = ["PAID", "CREDIT_APPLIED"];
  if (!settledStatuses.includes(order.paymentStatus)) {
    return {
      allowed: false,
      reason: `Order cannot be completed: payment status is ${order.paymentStatus}. Payment must be PAID or CREDIT_APPLIED`,
    };
  }

  return { allowed: true };
}

// ── Delivery confirmation (OTP) guard ─────────────────────────────────────────

type DeliveryForOTPGuard = {
  status: DeliveryStatus;
  otpVerified: boolean;
};

/**
 * Guard: can delivery status be moved to DELIVERED?
 *
 * §15.2 — "The rider shall not be able to mark an order as delivered unless
 *           the valid system-generated OTP has been entered and verified."
 * §16.1 — Delivered = OTP-verified handoff.
 */
export function canMarkDelivered(delivery: DeliveryForOTPGuard): TransitionResult {
  const transitionCheck = canTransitionDeliveryStatus(
    delivery.status,
    "DELIVERED"
  );
  if (!transitionCheck.allowed) return transitionCheck;

  if (!delivery.otpVerified) {
    return {
      allowed: false,
      reason: "Delivery cannot be marked as DELIVERED until OTP has been verified",
    };
  }

  return { allowed: true };
}

// ── Rider assignment guard ────────────────────────────────────────────────────

type OrderForAssignment = {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  pricingBand: PricingBand;
};

/**
 * Guard: can this order be assigned to a rider?
 *
 * §9.6 — "An unpaid M-Pesa Band 3 order shall not be assigned to a rider
 *          until payment conditions are satisfied."
 *       — "An unpaid M-Pesa order may still be assigned to a rider for
 *          Band 1 and Band 2."
 */
export function canAssignRider(order: OrderForAssignment): TransitionResult {
  const assignableStatuses: OrderStatus[] = [
    "CONFIRMED",
    "PREPARING",
    "READY_FOR_DISPATCH",
  ];

  if (!assignableStatuses.includes(order.status)) {
    return {
      allowed: false,
      reason: `Order must be in CONFIRMED, PREPARING, or READY_FOR_DISPATCH to assign a rider (currently ${order.status})`,
    };
  }

  const isUnpaid =
    order.paymentStatus === "UNPAID" ||
    order.paymentStatus === "PENDING_VERIFICATION";

  if (
    isUnpaid &&
    order.paymentMethod === "MPESA" &&
    order.pricingBand === "BAND_3"
  ) {
    return {
      allowed: false,
      reason:
        "Unpaid M-Pesa Band 3 orders cannot be assigned to a rider until payment is confirmed",
    };
  }

  return { allowed: true };
}

// ── Order edit guard ──────────────────────────────────────────────────────────

type OrderForEdit = {
  isAdminConfirmed: boolean;
  status: OrderStatus;
};

/**
 * Guard: can the customer still edit this order?
 *
 * §8.6 — "Once an order has been confirmed by admin, the customer shall no
 *          longer be allowed to change the order."
 * §8.3–8.5 — Before admin confirmation, location, slot, and payment method
 *             edits are allowed.
 */
export function canCustomerEditOrder(order: OrderForEdit): TransitionResult {
  if (order.isAdminConfirmed) {
    return {
      allowed: false,
      reason: "Order has been confirmed by admin and can no longer be edited",
    };
  }

  const nonEditableStatuses: OrderStatus[] = [
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "COMPLETED",
    "CANCELLED",
  ];

  if (nonEditableStatuses.includes(order.status)) {
    return {
      allowed: false,
      reason: `Order in status ${order.status} cannot be edited`,
    };
  }

  return { allowed: true };
}

// ── Reschedule guard ──────────────────────────────────────────────────────────

type OrderForReschedule = {
  hasBeenRescheduled: boolean;
  status: OrderStatus;
  isAdminConfirmed: boolean;
};

/**
 * Guard: can this order be rescheduled?
 *
 * §8.9 — "An order may be rescheduled only once."
 *       — "A customer may request reschedule from the app."
 *       — "Admin may reschedule an order after failed delivery."
 * §8.9 — Customer cannot reschedule dispatched/delivered/completed orders.
 */
export function canRescheduleOrder(
  order: OrderForReschedule,
  requestedBy: "customer" | "admin"
): TransitionResult {
  if (order.hasBeenRescheduled) {
    return {
      allowed: false,
      reason: "Order has already been rescheduled once and cannot be rescheduled again",
    };
  }

  const blockedForCustomer: OrderStatus[] = [
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "COMPLETED",
    "CANCELLED",
    "FAILED_DELIVERY", // customer cannot; admin can after failed delivery
  ];

  if (requestedBy === "customer" && blockedForCustomer.includes(order.status)) {
    return {
      allowed: false,
      reason: `Customer cannot reschedule an order in status ${order.status}`,
    };
  }

  const blockedForAdmin: OrderStatus[] = ["DELIVERED", "COMPLETED", "CANCELLED"];
  if (requestedBy === "admin" && blockedForAdmin.includes(order.status)) {
    return {
      allowed: false,
      reason: `Order in status ${order.status} cannot be rescheduled`,
    };
  }

  return { allowed: true };
}

// ── Cancellation guard ────────────────────────────────────────────────────────

type OrderForCancellation = {
  status: OrderStatus;
};

/**
 * Guard: can a customer cancel this order through self-service?
 *
 * §21.1 — "A customer may cancel an order before dispatch."
 * §21.2 — "Admin may cancel an order in approved edge cases."
 *        — "Riders shall not cancel dispatched or in-transit orders."
 */
export function canCustomerCancelOrder(
  order: OrderForCancellation
): TransitionResult {
  const dispatchedOrLater: OrderStatus[] = [
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "COMPLETED",
    "CANCELLED",
  ];

  if (dispatchedOrLater.includes(order.status)) {
    return {
      allowed: false,
      reason: `Order in status ${order.status} can no longer be cancelled by the customer`,
    };
  }

  return { allowed: true };
}

// ── Payment method eligibility ────────────────────────────────────────────────

/**
 * Guard: is Cash on Delivery allowed for this order?
 *
 * §9.5 — "Cash on Delivery shall not be allowed for Band 3 orders."
 */
export function isCODPermitted(band: PricingBand): TransitionResult {
  if (band === "BAND_3") {
    return {
      allowed: false,
      reason: "Cash on Delivery is not available for Band 3 deliveries",
    };
  }
  return { allowed: true };
}

/**
 * Guard: is pay-later (M-Pesa after submission) allowed for this order?
 *
 * §9.4 — "Pay-later shall be allowed only for Band 1 and Band 2 orders."
 */
export function isPayLaterPermitted(band: PricingBand): TransitionResult {
  if (band === "BAND_3") {
    return {
      allowed: false,
      reason: "Pay-later is not available for Band 3 deliveries. Payment must be completed before dispatch",
    };
  }
  return { allowed: true };
}
