/**
 * components/shared/status-badge.tsx
 *
 * Renders a coloured badge for OrderStatus, DeliveryStatus, and PaymentStatus.
 */

import { Badge } from "@/components/ui/badge";
import type { OrderStatus, DeliveryStatus, PaymentStatus } from "@prisma/client";

// ── Order status ─────────────────────────────────────────────────────────────

const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PLACED:            { label: "Placed",            variant: "secondary" },
  AWAITING_PAYMENT:  { label: "Awaiting Payment",  variant: "outline" },
  CONFIRMED:         { label: "Confirmed",          variant: "default" },
  PREPARING:         { label: "Preparing",          variant: "default" },
  READY_FOR_DISPATCH:{ label: "Ready for Dispatch", variant: "default" },
  ASSIGNED_TO_RIDER: { label: "Assigned to Rider",  variant: "default" },
  OUT_FOR_DELIVERY:  { label: "Out for Delivery",   variant: "default" },
  DELIVERED:         { label: "Delivered",          variant: "default" },
  COMPLETED:         { label: "Completed",          variant: "default" },
  FAILED_DELIVERY:   { label: "Failed Delivery",    variant: "destructive" },
  CANCELLED:         { label: "Cancelled",          variant: "destructive" },
  ON_HOLD:           { label: "On Hold",            variant: "outline" },
};

const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  PLACED:             "bg-slate-100 text-slate-700 border-slate-300",
  AWAITING_PAYMENT:   "bg-amber-50 text-amber-700 border-amber-300",
  CONFIRMED:          "bg-blue-50 text-blue-700 border-blue-300",
  PREPARING:          "bg-blue-100 text-blue-800 border-blue-300",
  READY_FOR_DISPATCH: "bg-indigo-50 text-indigo-700 border-indigo-300",
  ASSIGNED_TO_RIDER:  "bg-violet-50 text-violet-700 border-violet-300",
  OUT_FOR_DELIVERY:   "bg-cyan-50 text-cyan-700 border-cyan-300",
  DELIVERED:          "bg-emerald-50 text-emerald-700 border-emerald-300",
  COMPLETED:          "bg-green-100 text-green-800 border-green-300",
  FAILED_DELIVERY:    "bg-red-50 text-red-700 border-red-300",
  CANCELLED:          "bg-red-100 text-red-800 border-red-300",
  ON_HOLD:            "bg-orange-50 text-orange-700 border-orange-300",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label } = ORDER_STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${ORDER_STATUS_CLASS[status]}`}
    >
      {label}
    </span>
  );
}

// ── Delivery status ───────────────────────────────────────────────────────────

const DELIVERY_STATUS_CLASS: Record<DeliveryStatus, string> = {
  NOT_SCHEDULED:          "bg-slate-100 text-slate-600 border-slate-300",
  SCHEDULED:              "bg-blue-50 text-blue-700 border-blue-300",
  ASSIGNED:               "bg-violet-50 text-violet-700 border-violet-300",
  PICKED_UP:              "bg-cyan-50 text-cyan-700 border-cyan-300",
  IN_TRANSIT:             "bg-cyan-100 text-cyan-800 border-cyan-300",
  ARRIVED:                "bg-teal-50 text-teal-700 border-teal-300",
  PENDING_OTP_CONFIRMATION:"bg-amber-50 text-amber-700 border-amber-300",
  DELIVERED:              "bg-emerald-50 text-emerald-700 border-emerald-300",
  DELIVERY_ATTEMPTED:     "bg-orange-50 text-orange-700 border-orange-300",
  FAILED:                 "bg-red-50 text-red-700 border-red-300",
  RETURNED:               "bg-red-100 text-red-800 border-red-300",
};

const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  NOT_SCHEDULED:           "Not Scheduled",
  SCHEDULED:               "Scheduled",
  ASSIGNED:                "Assigned",
  PICKED_UP:               "Picked Up",
  IN_TRANSIT:              "In Transit",
  ARRIVED:                 "Arrived",
  PENDING_OTP_CONFIRMATION:"Pending OTP",
  DELIVERED:               "Delivered",
  DELIVERY_ATTEMPTED:      "Attempted",
  FAILED:                  "Failed",
  RETURNED:                "Returned",
};

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${DELIVERY_STATUS_CLASS[status]}`}
    >
      {DELIVERY_STATUS_LABELS[status]}
    </span>
  );
}

// ── Payment status ────────────────────────────────────────────────────────────

const PAYMENT_STATUS_CLASS: Record<PaymentStatus, string> = {
  UNPAID:               "bg-red-50 text-red-700 border-red-300",
  PENDING_VERIFICATION: "bg-amber-50 text-amber-700 border-amber-300",
  PARTIALLY_PAID:       "bg-orange-50 text-orange-700 border-orange-300",
  PAID:                 "bg-green-100 text-green-800 border-green-300",
  FAILED:               "bg-red-100 text-red-800 border-red-300",
  CREDIT_APPLIED:       "bg-teal-50 text-teal-700 border-teal-300",
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID:               "Unpaid",
  PENDING_VERIFICATION: "Pending Verification",
  PARTIALLY_PAID:       "Partially Paid",
  PAID:                 "Paid",
  FAILED:               "Failed",
  CREDIT_APPLIED:       "Credit Applied",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${PAYMENT_STATUS_CLASS[status]}`}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}

// ── Pricing band badge ────────────────────────────────────────────────────────

export function PricingBandBadge({ band }: { band: string }) {
  const config: Record<string, string> = {
    BAND_1: "bg-green-50 text-green-700 border-green-300",
    BAND_2: "bg-blue-50 text-blue-700 border-blue-300",
    BAND_3: "bg-purple-50 text-purple-700 border-purple-300",
  };
  const labels: Record<string, string> = {
    BAND_1: "Band 1",
    BAND_2: "Band 2",
    BAND_3: "Band 3",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config[band] ?? "bg-slate-100 text-slate-600"}`}
    >
      {labels[band] ?? band}
    </span>
  );
}
