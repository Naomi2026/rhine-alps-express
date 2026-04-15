/**
 * lib/notifications/templates.ts
 *
 * Message templates for each notification event type (§20).
 * All amounts are formatted as KES. Templates return { subject, body } tuples.
 */

import { formatKES } from "@/lib/utils";

export type NotificationTemplate = {
  subject: string;
  body: string;
};

export const templates = {
  // ── Customer notifications (§20.1) ─────────────────────────────────────────

  orderPlaced(data: {
    customerName: string;
    orderRef: string;
    totalAmount: number;
    deliveryAddress: string;
    slotLabel?: string;
  }): NotificationTemplate {
    return {
      subject: `Order ${data.orderRef} received — Rhine Alps Express`,
      body:
        `Hi ${data.customerName}, your order ${data.orderRef} has been received.\n\n` +
        `Amount: ${formatKES(data.totalAmount)}\n` +
        `Delivery to: ${data.deliveryAddress}\n` +
        (data.slotLabel ? `Slot: ${data.slotLabel}\n` : "") +
        `\nWe'll confirm your order shortly.`,
    };
  },

  paymentConfirmed(data: {
    customerName: string;
    orderRef: string;
    amountPaid: number;
  }): NotificationTemplate {
    return {
      subject: `Payment confirmed — ${data.orderRef}`,
      body:
        `Hi ${data.customerName}, we've confirmed your payment of ${formatKES(data.amountPaid)} ` +
        `for order ${data.orderRef}. Your delivery is on its way!`,
    };
  },

  otpSent(data: {
    customerName: string;
    orderRef: string;
    otpValue: string;
  }): NotificationTemplate {
    return {
      subject: `Your delivery code — ${data.orderRef}`,
      body:
        `Hi ${data.customerName}, your delivery code for order ${data.orderRef} is:\n\n` +
        `🔐 ${data.otpValue}\n\n` +
        `Share this code with your rider when they arrive. Do not share it with anyone else.`,
    };
  },

  orderDelivered(data: {
    customerName: string;
    orderRef: string;
  }): NotificationTemplate {
    return {
      subject: `Delivered — ${data.orderRef}`,
      body:
        `Hi ${data.customerName}, your order ${data.orderRef} has been delivered. ` +
        `Thank you for choosing Rhine Alps Express!`,
    };
  },

  failedDelivery(data: {
    customerName: string;
    orderRef: string;
    reason?: string;
  }): NotificationTemplate {
    return {
      subject: `Delivery update — ${data.orderRef}`,
      body:
        `Hi ${data.customerName}, we were unable to deliver order ${data.orderRef}. ` +
        (data.reason ? `Reason: ${data.reason}. ` : "") +
        `Our team will be in touch to reschedule.`,
    };
  },

  paymentReminder(data: {
    customerName: string;
    orderRef: string;
    amountDue: number;
    hoursOld: number;
  }): NotificationTemplate {
    return {
      subject: `Payment reminder — ${data.orderRef}`,
      body:
        `Hi ${data.customerName}, this is a reminder that ${formatKES(data.amountDue)} ` +
        `is still outstanding on order ${data.orderRef} (placed ${data.hoursOld} hours ago). ` +
        `Please complete payment to avoid delays.`,
    };
  },

  orderCancelled(data: {
    customerName: string;
    orderRef: string;
    creditIssued?: number;
  }): NotificationTemplate {
    return {
      subject: `Order cancelled — ${data.orderRef}`,
      body:
        `Hi ${data.customerName}, your order ${data.orderRef} has been cancelled. ` +
        (data.creditIssued && data.creditIssued > 0
          ? `${formatKES(data.creditIssued)} has been added to your account credit.`
          : ""),
    };
  },

  slotReminder(data: {
    customerName: string;
    orderRef: string;
    slotLabel: string;
  }): NotificationTemplate {
    return {
      subject: `Delivery today — ${data.orderRef}`,
      body:
        `Hi ${data.customerName}, your order ${data.orderRef} is scheduled for delivery ` +
        `during the ${data.slotLabel} window today. Please ensure someone is available.`,
    };
  },

  creditAdded(data: {
    customerName: string;
    amount: number;
    newBalance: number;
  }): NotificationTemplate {
    return {
      subject: "Account credit added — Rhine Alps Express",
      body:
        `Hi ${data.customerName}, ${formatKES(data.amount)} has been added to your account. ` +
        `Your new credit balance is ${formatKES(data.newBalance)}. ` +
        `It will be automatically applied to your next order.`,
    };
  },

  // ── Rider notifications (§20.3) ─────────────────────────────────────────────

  orderAssigned(data: {
    riderName: string;
    orderRef: string;
    customerName: string;
    deliveryAddress: string;
    slotLabel?: string;
  }): NotificationTemplate {
    return {
      subject: `New delivery — ${data.orderRef}`,
      body:
        `Hi ${data.riderName}, you have been assigned order ${data.orderRef}.\n\n` +
        `Customer: ${data.customerName}\n` +
        `Deliver to: ${data.deliveryAddress}\n` +
        (data.slotLabel ? `Slot: ${data.slotLabel}` : ""),
    };
  },

  // ── Admin notifications (§20.2) ─────────────────────────────────────────────

  unpaidOrderAlert(data: {
    orderRef: string;
    customerName: string;
    customerPhone: string | null;
    amountDue: number;
    hoursOld: number;
  }): NotificationTemplate {
    return {
      subject: `Unpaid order alert — ${data.orderRef}`,
      body:
        `Order ${data.orderRef} from ${data.customerName} ` +
        `(${data.customerPhone ?? "no phone"}) remains unpaid.\n` +
        `Amount due: ${formatKES(data.amountDue)}\n` +
        `Age: ${data.hoursOld} hours`,
    };
  },
};
