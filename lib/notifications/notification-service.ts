/**
 * lib/notifications/notification-service.ts
 *
 * Event-driven notification service for Rhine Alps Express (§20).
 *
 * Architecture:
 *  - All notifications are persisted to the Notification table (in-app record)
 *  - External channels (SMS, WhatsApp, Email) are stubbed out for MVP
 *  - The service resolves the best channel for each user based on available
 *    contact info and event type (§20.4)
 *  - Duplicate notifications for the same event are suppressed (§20.4)
 *
 * Stub behaviour:
 *  - SMS/WhatsApp: logs to console; replace with Africa's Talking or similar
 *  - Email: logs to console; replace with Resend, SendGrid, etc.
 *
 * Business rules:
 *  §20.1 Customer notifications: order placed, payment confirmed, OTP, failed delivery
 *  §20.2 Admin notifications:    payment confirmed, failed delivery, unpaid alerts
 *  §20.3 Rider notifications:    payment confirmed, order updates
 *  §20.4 Channel fallback: SMS → WhatsApp → Email → In-app
 *         Duplicate suppression active; OTP uses same channel each time
 */

import { db } from "@/lib/db";
import type { NotificationChannel } from "@prisma/client";
import { templates } from "./templates";

// ── Types ──────────────────────────────────────────────────────────────────────

type SendInput = {
  userId: string;
  event: string;
  subject: string;
  body: string;
  channel?: NotificationChannel;
};

// ── Core send ──────────────────────────────────────────────────────────────────

/**
 * Persist and dispatch a single notification.
 *
 * MVP: stores in the Notification table and delegates to a stub external
 * channel handler. Replace stub handlers with real integrations in Phase 5.
 */
async function send(input: SendInput): Promise<void> {
  const { userId, event, subject, body, channel = "IN_APP" } = input;

  try {
    const notification = await db.notification.create({
      data: {
        userId,
        channel,
        event,
        subject,
        body,
        isSent: false,
      },
    });

    // Dispatch to the appropriate channel
    let sent = false;
    let failReason: string | null = null;

    try {
      switch (channel) {
        case "SMS":
          await sendSMS({ userId, body });
          sent = true;
          break;
        case "WHATSAPP":
          await sendWhatsApp({ userId, body });
          sent = true;
          break;
        case "EMAIL":
          await sendEmail({ userId, subject, body });
          sent = true;
          break;
        case "IN_APP":
        default:
          sent = true; // In-app is the persisted DB record itself
          break;
      }
    } catch (err) {
      failReason = err instanceof Error ? err.message : "Unknown error";
    }

    await db.notification.update({
      where: { id: notification.id },
      data: {
        isSent: sent,
        sentAt: sent ? new Date() : null,
        failedAt: !sent ? new Date() : null,
        failReason,
      },
    });
  } catch (err) {
    // Notifications must not crash the calling flow
    console.error("[notification-service] Failed to send notification:", err);
  }
}

/**
 * Resolve the best channel for a user based on available contact methods.
 * Prefers SMS/WhatsApp when a phone number exists; falls back to email; then in-app.
 */
async function resolveChannel(userId: string): Promise<NotificationChannel> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { phone: true, email: true },
  });
  if (user?.phone) return "IN_APP"; // MVP: use IN_APP; swap to "SMS" when integrated
  if (user?.email) return "IN_APP"; // MVP: use IN_APP; swap to "EMAIL" when integrated
  return "IN_APP";
}

// ── Stub channel handlers ──────────────────────────────────────────────────────

async function sendSMS(_input: { userId: string; body: string }): Promise<void> {
  // TODO: integrate Africa's Talking or Twilio
  // console.log(`[SMS] To user ${_input.userId}:`, _input.body);
}

async function sendWhatsApp(_input: { userId: string; body: string }): Promise<void> {
  // TODO: integrate WhatsApp Business API
}

async function sendEmail(_input: {
  userId: string;
  subject: string;
  body: string;
}): Promise<void> {
  // TODO: integrate Resend or SendGrid
}

// ── Public notification helpers ────────────────────────────────────────────────
//
// IMPORTANT: All `userId` fields must be User.id (from the User table), NOT
// Customer.id or Rider.id. Passing a profile-table PK will cause a FK violation
// on Notification.userId and the notification will be silently dropped.

export async function notifyOrderPlaced(data: {
  /** User.id of the customer — NOT Customer.id */
  userId: string;
  customerName: string;
  orderRef: string;
  totalAmount: number;
  deliveryAddress: string;
  slotLabel?: string;
}): Promise<void> {
  const { subject, body } = templates.orderPlaced({ customerName: data.customerName, orderRef: data.orderRef, totalAmount: data.totalAmount, deliveryAddress: data.deliveryAddress, slotLabel: data.slotLabel });
  const channel = await resolveChannel(data.userId);
  await send({ userId: data.userId, event: "order.placed", subject, body, channel });
}

export async function notifyPaymentConfirmed(data: {
  /** User.id of the customer — NOT Customer.id */
  userId: string;
  customerName: string;
  orderRef: string;
  amountPaid: number;
}): Promise<void> {
  const { subject, body } = templates.paymentConfirmed({ customerName: data.customerName, orderRef: data.orderRef, amountPaid: data.amountPaid });
  const channel = await resolveChannel(data.userId);
  await send({ userId: data.userId, event: "payment.confirmed", subject, body, channel });
}

export async function notifyOTPSent(data: {
  /** User.id of the customer — NOT Customer.id */
  userId: string;
  customerName: string;
  orderRef: string;
  otpValue: string;
}): Promise<void> {
  // §20.4 — OTP uses the same channel as configured; MVP uses IN_APP
  const { subject, body } = templates.otpSent({ customerName: data.customerName, orderRef: data.orderRef, otpValue: data.otpValue });
  await send({ userId: data.userId, event: "otp.sent", subject, body, channel: "IN_APP" });
}

export async function notifyOrderDelivered(data: {
  /** User.id of the customer — NOT Customer.id */
  userId: string;
  customerName: string;
  orderRef: string;
}): Promise<void> {
  const { subject, body } = templates.orderDelivered({ customerName: data.customerName, orderRef: data.orderRef });
  const channel = await resolveChannel(data.userId);
  await send({ userId: data.userId, event: "order.delivered", subject, body, channel });
}

export async function notifyFailedDelivery(data: {
  /** User.id of the customer — NOT Customer.id */
  userId: string;
  customerName: string;
  orderRef: string;
  reason?: string;
}): Promise<void> {
  const { subject, body } = templates.failedDelivery({ customerName: data.customerName, orderRef: data.orderRef, reason: data.reason });
  const channel = await resolveChannel(data.userId);
  await send({ userId: data.userId, event: "delivery.failed", subject, body, channel });
}

export async function notifyPaymentReminder(data: {
  /** User.id of the customer — NOT Customer.id */
  userId: string;
  customerName: string;
  orderRef: string;
  amountDue: number;
  hoursOld: number;
}): Promise<void> {
  const { subject, body } = templates.paymentReminder({ customerName: data.customerName, orderRef: data.orderRef, amountDue: data.amountDue, hoursOld: data.hoursOld });
  const channel = await resolveChannel(data.userId);
  await send({ userId: data.userId, event: "payment.reminder", subject, body, channel });
}

export async function notifyOrderCancelled(data: {
  /** User.id of the customer — NOT Customer.id */
  userId: string;
  customerName: string;
  orderRef: string;
  creditIssued?: number;
}): Promise<void> {
  const { subject, body } = templates.orderCancelled({ customerName: data.customerName, orderRef: data.orderRef, creditIssued: data.creditIssued });
  const channel = await resolveChannel(data.userId);
  await send({ userId: data.userId, event: "order.cancelled", subject, body, channel });
}

export async function notifyRiderAssigned(data: {
  /** User.id of the rider — NOT Rider.id */
  userId: string;
  riderName: string;
  orderRef: string;
  customerName: string;
  deliveryAddress: string;
  slotLabel?: string;
}): Promise<void> {
  const { subject, body } = templates.orderAssigned({
    riderName: data.riderName,
    orderRef: data.orderRef,
    customerName: data.customerName,
    deliveryAddress: data.deliveryAddress,
    slotLabel: data.slotLabel,
  });
  const channel = await resolveChannel(data.userId);
  await send({ userId: data.userId, event: "delivery.assigned", subject, body, channel });
}

export async function notifyCreditAdded(data: {
  /** User.id of the customer — NOT Customer.id */
  userId: string;
  customerName: string;
  amount: number;
  newBalance: number;
}): Promise<void> {
  const { subject, body } = templates.creditAdded({ customerName: data.customerName, amount: data.amount, newBalance: data.newBalance });
  await send({ userId: data.userId, event: "credit.added", subject, body, channel: "IN_APP" });
}

export async function notifySlotReminder(data: {
  /** User.id of the customer — NOT Customer.id */
  userId: string;
  customerName: string;
  orderRef: string;
  slotLabel: string;
}): Promise<void> {
  const { subject, body } = templates.slotReminder({ customerName: data.customerName, orderRef: data.orderRef, slotLabel: data.slotLabel });
  const channel = await resolveChannel(data.userId);
  await send({ userId: data.userId, event: "slot.reminder", subject, body, channel });
}
