/**
 * lib/reporting/report-service.ts
 *
 * Reporting queries for Rhine Alps Express (§23).
 *
 * Supported reports:
 *   - Daily sales
 *   - Unpaid orders
 *   - Credit ledger
 *   - Rider performance
 *
 * All queries return plain data structures for rendering and CSV export.
 */

import { db } from "@/lib/db";
import type { DailySalesRow, UnpaidOrderRow } from "@/lib/types";

// ── Daily sales report ────────────────────────────────────────────────────────

export async function getDailySalesReport(params: {
  from: Date;
  to: Date;
}): Promise<DailySalesRow[]> {
  const { from, to } = params;

  const orders = await db.order.findMany({
    where: {
      status: "COMPLETED",
      updatedAt: { gte: from, lte: to },
    },
    select: {
      updatedAt: true,
      totalAmount: true,
      deliveryFee: true,
      pricingBand: true,
    },
  });

  // Group by date
  const byDate: Record<string, DailySalesRow> = {};

  for (const order of orders) {
    const date = order.updatedAt.toISOString().split("T")[0];
    if (!byDate[date]) {
      byDate[date] = {
        date,
        totalOrders: 0,
        completedOrders: 0,
        totalRevenue: 0,
        totalDeliveryFees: 0,
        band1Count: 0,
        band2Count: 0,
        band3Count: 0,
      };
    }
    const row = byDate[date];
    row.totalOrders += 1;
    row.completedOrders += 1;
    row.totalRevenue += Number(order.totalAmount);
    row.totalDeliveryFees += Number(order.deliveryFee);
    if (order.pricingBand === "BAND_1") row.band1Count += 1;
    else if (order.pricingBand === "BAND_2") row.band2Count += 1;
    else row.band3Count += 1;
  }

  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}

// ── Unpaid orders report ──────────────────────────────────────────────────────

export async function getUnpaidOrdersReport(): Promise<UnpaidOrderRow[]> {
  const orders = await db.order.findMany({
    where: {
      paymentStatus: { in: ["UNPAID", "PENDING_VERIFICATION", "PARTIALLY_PAID"] },
      status: { notIn: ["CANCELLED", "COMPLETED"] },
    },
    include: {
      customer: { include: { user: { select: { name: true, phone: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const now = Date.now();

  return orders.map((o) => ({
    orderId: o.id,
    orderRef: o.orderRef,
    customerName: o.customer.user.name,
    customerPhone: o.customer.user.phone,
    totalAmount: Number(o.totalAmount),
    amountDue: Number(o.amountDue),
    paymentStatus: o.paymentStatus,
    hoursOld: Math.floor((now - o.createdAt.getTime()) / (1000 * 60 * 60)),
    createdAt: o.createdAt,
  }));
}

// ── Credit ledger report ──────────────────────────────────────────────────────

export type CreditLedgerReportRow = {
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  totalCredited: number;
  totalConsumed: number;
  currentBalance: number;
  transactionCount: number;
};

export async function getCreditLedgerReport(): Promise<CreditLedgerReportRow[]> {
  const customers = await db.customer.findMany({
    where: {
      creditTransactions: { some: {} },
    },
    include: {
      user: { select: { name: true, phone: true } },
      creditTransactions: {
        select: { amount: true },
      },
    },
    orderBy: { creditBalance: "desc" },
  });

  return customers.map((c) => {
    const credited = c.creditTransactions
      .filter((t) => Number(t.amount) > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const consumed = c.creditTransactions
      .filter((t) => Number(t.amount) < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

    return {
      customerId: c.id,
      customerName: c.user.name,
      customerPhone: c.user.phone,
      totalCredited: credited,
      totalConsumed: consumed,
      currentBalance: Number(c.creditBalance),
      transactionCount: c.creditTransactions.length,
    };
  });
}

// ── Rider performance report ──────────────────────────────────────────────────

export type RiderPerformanceRow = {
  riderId: string;
  riderName: string;
  totalAssigned: number;
  totalDelivered: number;
  totalFailed: number;
  successRate: number; // 0–100
};

export async function getRiderPerformanceReport(params: {
  from: Date;
  to: Date;
}): Promise<RiderPerformanceRow[]> {
  const { from, to } = params;

  const deliveries = await db.delivery.findMany({
    where: {
      riderId: { not: null },
      createdAt: { gte: from, lte: to },
    },
    select: {
      riderId: true,
      status: true,
      rider: { select: { user: { select: { name: true } } } },
    },
  });

  const byRider: Record<
    string,
    { name: string; assigned: number; delivered: number; failed: number }
  > = {};

  for (const d of deliveries) {
    if (!d.riderId) continue;
    if (!byRider[d.riderId]) {
      byRider[d.riderId] = {
        name: d.rider?.user.name ?? "Unknown",
        assigned: 0,
        delivered: 0,
        failed: 0,
      };
    }
    const row = byRider[d.riderId];
    row.assigned += 1;
    if (d.status === "DELIVERED") row.delivered += 1;
    if (d.status === "FAILED" || d.status === "RETURNED") row.failed += 1;
  }

  return Object.entries(byRider).map(([riderId, r]) => ({
    riderId,
    riderName: r.name,
    totalAssigned: r.assigned,
    totalDelivered: r.delivered,
    totalFailed: r.failed,
    successRate: r.assigned > 0 ? Math.round((r.delivered / r.assigned) * 100) : 0,
  }));
}
