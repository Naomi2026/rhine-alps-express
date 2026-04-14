/**
 * lib/types/index.ts
 *
 * Shared TypeScript types and interfaces for the Rhine Alps Express platform.
 * Prisma-generated types are used directly where possible; these extend them
 * with application-layer shapes (API payloads, form data, server action returns).
 */

import type {
  User,
  Customer,
  Rider,
  Order,
  OrderItem,
  Delivery,
  DeliverySlot,
  Payment,
  OTPRecord,
  CreditTransaction,
  AuditLog,
  ServiceZone,
} from "@prisma/client";
import type {
  OrderStatus,
  DeliveryStatus,
  PaymentStatus,
  PaymentMethod,
  PricingBand,
  UserRole,
} from "@prisma/client";

// ── Re-export Prisma enums for convenience ──────────────────────────────────

export type {
  OrderStatus,
  DeliveryStatus,
  PaymentStatus,
  PaymentMethod,
  PricingBand,
  UserRole,
};

// ── Session user (matches types/next-auth.d.ts augmentation) ────────────────

export type SessionUser = {
  id: string;
  name: string;
  email?: string | null;
  image?: string | null;
  role: UserRole;
};

// ── Pricing ─────────────────────────────────────────────────────────────────

export type PricingResult = {
  band: PricingBand;
  distanceKm: number | null;
  bottleUnitPrice: number;
  deliveryFee: number;
  isProvisional: boolean;
};

// ── Order shapes ─────────────────────────────────────────────────────────────

/** Minimal order card used in list views */
export type OrderSummary = Pick<
  Order,
  | "id"
  | "orderRef"
  | "status"
  | "paymentStatus"
  | "paymentMethod"
  | "totalAmount"
  | "amountDue"
  | "creditApplied"
  | "deliveryAddress"
  | "pricingBand"
  | "deliveryDate"
  | "createdAt"
> & {
  customer: Pick<Customer, "id" | "creditBalance" | "loyaltyCount"> & {
    user: Pick<User, "id" | "name" | "email" | "phone">;
  };
  slot: Pick<DeliverySlot, "id" | "label" | "startTime" | "endTime"> | null;
  delivery: Pick<Delivery, "id" | "status" | "riderId"> | null;
};

/** Full order detail — used on order detail pages */
export type OrderDetail = Order & {
  customer: Customer & { user: User };
  items: OrderItem[];
  delivery: (Delivery & { rider: (Rider & { user: User }) | null }) | null;
  slot: DeliverySlot | null;
  payments: Payment[];
  otp: OTPRecord | null;
  auditLogs: AuditLog[];
};

// ── Delivery ─────────────────────────────────────────────────────────────────

export type RiderDeliveryView = Delivery & {
  order: Order & {
    customer: Customer & { user: Pick<User, "name" | "phone" | "email"> };
    items: OrderItem[];
    slot: DeliverySlot | null;
  };
};

// ── Payment ──────────────────────────────────────────────────────────────────

export type PaymentEntry = {
  orderId: string;
  method: PaymentMethod;
  amount: number;
  mpesaCode?: string;
  mpesaPhone?: string;
  cashReceivedAmount?: number;
  notes?: string;
};

// ── OTP ──────────────────────────────────────────────────────────────────────

export type OTPVerifyInput = {
  orderId: string;
  otpValue: string;
  submittedBy: string; // userId
};

export type OTPVerifyResult =
  | { success: true }
  | { success: false; reason: "invalid" | "expired" | "already_used" | "max_attempts" };

// ── Credit ───────────────────────────────────────────────────────────────────

export type CreditLedgerEntry = CreditTransaction & {
  customer: Pick<Customer, "id"> & { user: Pick<User, "name" | "phone"> };
};

// ── Audit ────────────────────────────────────────────────────────────────────

export type AuditEntry = AuditLog & {
  user: Pick<User, "id" | "name" | "role"> | null;
};

/** Payload required for every protected/override action (§17.4) */
export type ProtectedActionContext = {
  actingUserId: string;
  reason: string;       // controlled reason code
  note?: string;        // free-text note
  ipAddress?: string;
};

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationPayload = {
  userId: string;
  event: string;
  body: string;
  subject?: string;
};

// ── Server Action return type ─────────────────────────────────────────────────

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// ── Forms ────────────────────────────────────────────────────────────────────

export type RegisterFormData = {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  confirmPassword: string;
  deliveryAddress: string;
  deliveryLat?: number;
  deliveryLng?: number;
};

export type LoginFormData = {
  identifier: string; // email or phone
  password: string;
};

export type PlaceOrderFormData = {
  deliveryAddress: string;
  deliveryLat?: number;
  deliveryLng?: number;
  locationRef?: string;
  slotId: string;
  deliveryDate: string; // ISO date string
  quantity: number;
  isExchange: boolean;
  paymentMethod: PaymentMethod;
};

// ── Reporting ─────────────────────────────────────────────────────────────────

export type DailySalesRow = {
  date: string;
  totalOrders: number;
  completedOrders: number;
  totalRevenue: number;
  totalDeliveryFees: number;
  band1Count: number;
  band2Count: number;
  band3Count: number;
};

export type UnpaidOrderRow = {
  orderId: string;
  orderRef: string;
  customerName: string;
  customerPhone: string | null;
  totalAmount: number;
  amountDue: number;
  paymentStatus: PaymentStatus;
  hoursOld: number;
  createdAt: Date;
};

// ── Service zone ──────────────────────────────────────────────────────────────

export type ServiceZoneWithBand = ServiceZone;
