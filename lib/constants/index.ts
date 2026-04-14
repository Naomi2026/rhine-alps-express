/**
 * lib/constants/index.ts
 *
 * All controlled values sourced from business-rules.md.
 * These are the application-layer defaults. The system_settings table
 * mirrors these and allows Super Admin to adjust them at runtime.
 */

// ── Operating hours (24-hr strings, local Nairobi time) ────────────────────

export const OPERATING_HOURS = {
  OPEN: "09:00",
  STANDARD_CLOSE: "17:00",    // last standard delivery slot ends
  ORDER_CUTOFF: "20:00",      // last time orders are accepted same day
  FINAL_SLOT_END: "19:45",    // 5 PM – 7:45 PM slot
  SAME_DAY_CUTOFF: "18:30",   // standard same-day cutoff
} as const;

// ── Delivery slots (must match DB seed) ────────────────────────────────────

export const DELIVERY_SLOT_DEFINITIONS = [
  { label: "9:00 AM – 12:00 PM", startTime: "09:00", endTime: "12:00", sortOrder: 1 },
  { label: "12:00 PM – 3:00 PM", startTime: "12:00", endTime: "15:00", sortOrder: 2 },
  { label: "3:00 PM – 5:00 PM",  startTime: "15:00", endTime: "17:00", sortOrder: 3 },
  { label: "5:00 PM – 7:45 PM",  startTime: "17:00", endTime: "19:45", sortOrder: 4 },
] as const;

export const SLOT_MIN_LEAD_TIME_MINUTES = 30;
export const SLOT_RESERVATION_HOURS = 4;

// ── Dispatch location ───────────────────────────────────────────────────────

export const DISPATCH_LOCATION = {
  name: "Rhine Alps Limited — Infinity Industrial Park",
  lat: -1.1453,
  lng: 36.9613,
} as const;

// ── Service radius ──────────────────────────────────────────────────────────

export const MAX_SERVICE_RADIUS_KM = 30;

// ── Pricing ─────────────────────────────────────────────────────────────────

export const PRICING = {
  BAND_1: {
    RADIUS_KM: 2,
    BOTTLE_PRICE_KES: 150,
    DELIVERY_FEE_KES: 0,
  },
  BAND_2: {
    BOTTLE_PRICE_KES: 200,
    DELIVERY_FEE_KES: 0,
    /** Canonical Band 2 area names (matched case-insensitively in pricing engine) */
    AREAS: ["Kamakis", "Mwihoko", "Kahawa Sukari", "Githurai", "EasternVille"] as string[],
  },
  BAND_3: {
    BOTTLE_PRICE_KES: 150,
    DELIVERY_FEE_PER_KM_KES: 30,
  },
} as const;

// ── Products ────────────────────────────────────────────────────────────────

export const PRODUCTS = {
  NEW_BOTTLE: {
    name: "20L Bottle – New",
    sku: "20L-NEW",
    basePrice: 450, // one-off new bottle purchase price (§6.2)
  },
  REFILL: {
    name: "20L Bottle – Refill",
    sku: "20L-REFILL",
    // Price determined by pricing band — not a fixed constant
  },
} as const;

export const ORDER_QUANTITY = { MIN: 1, MAX: 20 } as const;

// ── Payment ─────────────────────────────────────────────────────────────────

export const PAYMENT = {
  /** Bands eligible for pay-later M-Pesa (§9.4) */
  PAY_LATER_ELIGIBLE_BANDS: ["BAND_1", "BAND_2"] as string[],
  /** Bands eligible for Cash on Delivery (§9.5 — Band 3 excluded) */
  COD_ELIGIBLE_BANDS: ["BAND_1", "BAND_2"] as string[],
  UNPAID_REMINDER_FIRST_HOURS: 12,
  UNPAID_REMINDER_SECOND_HOURS: 24,
} as const;

// ── OTP ─────────────────────────────────────────────────────────────────────

export const OTP = {
  MAX_VALIDATION_ATTEMPTS: 3,
  MAX_RESEND_ATTEMPTS: 3,
  RESEND_COOLDOWN_SECONDS: 30,
  LENGTH: 6,
  /** TTL in hours from generation */
  EXPIRY_HOURS: 4,
} as const;

// ── Loyalty ─────────────────────────────────────────────────────────────────

export const LOYALTY = {
  QUALIFYING_ORDERS_REQUIRED: 10,
  /** Loyalty reward is 1 free bottle */
  REWARD_QUANTITY: 1,
} as const;

// ── Credit ──────────────────────────────────────────────────────────────────

export const CREDIT = {
  /** Credit adjustments above this require Super Admin approval (§10.4) */
  SUPER_ADMIN_THRESHOLD_KES: 1000,
} as const;

// ── Auth & sessions ─────────────────────────────────────────────────────────

export const AUTH = {
  FAILED_LOGIN_LOCKOUT_THRESHOLD: 3,
  ADMIN_SESSION_MAX_HOURS: 9,
} as const;

// ── Audit ───────────────────────────────────────────────────────────────────

export const AUDIT_RETENTION_DAYS = 30;

// ── Reason codes (§26) ──────────────────────────────────────────────────────

export const REASON_CODES = {
  CANCELLED: {
    CUSTOMER_REQUEST: "customer_request",
    DUPLICATE_ORDER: "duplicate_order",
    PAYMENT_NOT_COMPLETED: "payment_not_completed",
    ADDRESS_ISSUE: "address_issue",
    ADMIN_CANCELLED: "admin_cancelled",
    FRAUD_SUSPECTED: "fraud_suspected",
  },
  FAILED_DELIVERY: {
    CUSTOMER_UNREACHABLE: "customer_unreachable",
    WRONG_LOCATION: "wrong_location",
    NO_OTP: "no_otp",
    OTP_FAILED: "otp_failed",
    CUSTOMER_REFUSED: "customer_refused",
    PAYMENT_ISSUE: "payment_issue",
    RIDER_ISSUE: "rider_issue",
    TECHNICAL_ISSUE: "technical_issue",
  },
  ON_HOLD: {
    PAYMENT_REVIEW: "payment_review",
    OTP_FAILURE: "otp_failure",
    PRICING_AMBIGUITY: "pricing_ambiguity",
    CUSTOMER_REQUESTED_HOLD: "customer_requested_hold",
    RIDER_INCIDENT: "rider_incident",
    TECHNICAL_ISSUE: "technical_issue",
  },
  RETURNED: {
    FAILED_DELIVERY_RETURN: "failed_delivery_return",
    CUSTOMER_COMPLAINT: "customer_complaint",
    WATER_QUALITY_ISSUE: "water_quality_issue",
    DAMAGED_GOODS: "damaged_goods",
    OTP_NOT_CONFIRMED: "otp_not_confirmed",
  },
  MANUAL_OVERRIDE: {
    OTP_OVERRIDE: "otp_override",
    PAYMENT_OVERRIDE: "payment_override",
    PRICING_OVERRIDE: "pricing_override",
    REASSIGNMENT_OVERRIDE: "reassignment_override",
    CLOSURE_OVERRIDE: "closure_override",
  },
  PAYMENT_FAILED: {
    MPESA_CODE_INVALID: "mpesa_code_invalid",
    PAYMENT_NOT_RECEIVED: "payment_not_received",
    DUPLICATE_REFERENCE: "duplicate_reference",
    PARTIAL_SETTLEMENT_ISSUE: "partial_settlement_issue",
    VERIFICATION_FAILED: "verification_failed",
  },
} as const;

// ── Order status transition map ─────────────────────────────────────────────
// Defines which statuses an order can transition TO from each source status.
// Phase 2 status-guard logic reads from this map.

export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  PLACED: ["AWAITING_PAYMENT", "CONFIRMED", "CANCELLED", "ON_HOLD"],
  AWAITING_PAYMENT: ["CONFIRMED", "CANCELLED", "ON_HOLD"],
  CONFIRMED: ["PREPARING", "CANCELLED", "ON_HOLD"],
  PREPARING: ["READY_FOR_DISPATCH", "ON_HOLD"],
  READY_FOR_DISPATCH: ["ASSIGNED_TO_RIDER", "ON_HOLD"],
  ASSIGNED_TO_RIDER: ["OUT_FOR_DELIVERY", "ON_HOLD"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED_DELIVERY", "ON_HOLD"],
  DELIVERED: ["COMPLETED"],
  COMPLETED: [], // terminal
  FAILED_DELIVERY: ["ON_HOLD", "CANCELLED"],
  CANCELLED: [], // terminal
  ON_HOLD: ["CONFIRMED", "CANCELLED", "PLACED"],
};

// ── Delivery status transition map ──────────────────────────────────────────

export const DELIVERY_STATUS_TRANSITIONS: Record<string, string[]> = {
  NOT_SCHEDULED: ["SCHEDULED"],
  SCHEDULED: ["ASSIGNED", "NOT_SCHEDULED"],
  ASSIGNED: ["PICKED_UP", "SCHEDULED"],
  PICKED_UP: ["IN_TRANSIT"],
  IN_TRANSIT: ["ARRIVED", "DELIVERY_ATTEMPTED", "FAILED"],
  ARRIVED: ["PENDING_OTP_CONFIRMATION"],
  PENDING_OTP_CONFIRMATION: ["DELIVERED", "DELIVERY_ATTEMPTED", "FAILED"],
  DELIVERED: [], // terminal
  DELIVERY_ATTEMPTED: ["IN_TRANSIT", "FAILED", "RETURNED"],
  FAILED: ["RETURNED"],
  RETURNED: [], // terminal
};
