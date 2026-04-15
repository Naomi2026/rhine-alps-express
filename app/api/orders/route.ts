/**
 * app/api/orders/route.ts
 *
 * POST /api/orders — Customer places a new order.
 *
 * Flow:
 *   1. Validate input (Zod)
 *   2. Verify slot availability and lead time
 *   3. Calculate pricing (band, unit price, delivery fee)
 *   4. Validate payment method eligibility (COD/Band3 rules)
 *   5. Apply customer credit automatically (unless loyalty reward)
 *   6. Persist order + items in a transaction
 *   7. Generate OTP for the order
 *   8. Audit log
 *   9. Send placement notification
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, badRequest, serverError } from "@/lib/auth/api-auth";
import { notifyOrderPlaced, notifyOTPSent } from "@/lib/notifications/notification-service";
import { placeOrderSchema } from "@/lib/validations/order";
import { calculatePricing, calculateOrderTotals, isCODAllowed } from "@/lib/pricing/pricing-engine";
import { applyAndConsumeCredit } from "@/lib/credit/credit-service";
import { generateOTPForOrder } from "@/lib/otp/otp-service";
import { logOrderPlaced } from "@/lib/audit/audit-logger";
import { generateOrderRef } from "@/lib/utils";
import { LOYALTY } from "@/lib/constants";
import type { UserRole } from "@prisma/client";

export async function POST(req: NextRequest) {
  const authResult = await requireRole("CUSTOMER" as UserRole);
  if (authResult instanceof NextResponse) return authResult;
  const sessionUser = authResult;

  const body = await req.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON");

  const parsed = placeOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const input = parsed.data;

  try {
    const customer = await db.customer.findUnique({
      where: { userId: sessionUser.id },
    });

    if (!customer) return badRequest("Customer profile not found");

    // §4.3 — At least one contact method required before checkout
    const dbUser = await db.user.findUnique({ where: { id: sessionUser.id } });
    if (!dbUser?.phone && !dbUser?.email) {
      return badRequest("At least one contact method (phone or email) is required before checkout.");
    }

    // Validate slot
    const slot = await db.deliverySlot.findUnique({
      where: { id: input.slotId },
    });
    if (!slot || !slot.isActive) {
      return badRequest("Selected delivery slot is not available.");
    }

    // Fetch active service zones for Band 2 matching
    const serviceZones = await db.serviceZone.findMany({
      where: { isActive: true },
    });

    // Calculate pricing
    const pricing = calculatePricing({
      lat: input.deliveryLat,
      lng: input.deliveryLng,
      address: input.deliveryAddress,
      quantity: input.quantity,
      serviceZones,
    });

    // §9.5 — COD not allowed for Band 3
    if (input.paymentMethod === "CASH_ON_DELIVERY" && !isCODAllowed(pricing.band)) {
      return badRequest("Cash on Delivery is not available for your delivery area (Band 3).");
    }

    // Check loyalty reward eligibility
    const loyaltyTarget = LOYALTY.QUALIFYING_ORDERS_REQUIRED;
    const isLoyaltyReward = customer.loyaltyCount > 0 && customer.loyaltyCount % loyaltyTarget === 0;

    // Calculate totals without credit first
    const totals = calculateOrderTotals(pricing, input.quantity, 0);

    // Generate order ref (use order count as sequence)
    const orderCount = await db.order.count();
    const orderRef = generateOrderRef(orderCount + 1);

    // Create order in a transaction
    const order = await db.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderRef,
          customerId: customer.id,
          status: "PLACED",
          paymentStatus: "UNPAID",
          paymentMethod: input.paymentMethod,
          deliveryAddress: input.deliveryAddress,
          deliveryLat: input.deliveryLat ?? null,
          deliveryLng: input.deliveryLng ?? null,
          locationRef: input.locationRef ?? null,
          isLocationValid: true,
          isProvisionalPrice: pricing.isProvisional,
          slotId: input.slotId,
          deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : null,
          pricingBand: pricing.band,
          distanceKm: pricing.distanceKm,
          bottleUnitPrice: pricing.bottleUnitPrice,
          deliveryFee: pricing.deliveryFee,
          subtotal: totals.subtotal,
          totalAmount: totals.totalAmount,
          creditApplied: 0,
          amountDue: totals.totalAmount,
          isLoyaltyReward,
          countsForLoyalty: true,
          isAdminConfirmed: false,
          hasBeenRescheduled: false,
          deliveryNotes: input.deliveryNotes ?? null,
        },
      });

      // Create order item
      await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          productName: input.isExchange ? "20L Bottle – Refill" : "20L Bottle – New",
          productSku: input.isExchange ? "20L-REFILL" : "20L-NEW",
          quantity: input.quantity,
          unitPrice: pricing.bottleUnitPrice,
          lineTotal: pricing.bottleUnitPrice * input.quantity,
          isExchange: input.isExchange,
        },
      });

      return newOrder;
    });

    // Apply credit outside the transaction (uses own transaction internally)
    if (!isLoyaltyReward && Number(customer.creditBalance) > 0) {
      await applyAndConsumeCredit({
        orderId: order.id,
        customerId: customer.id,
        orderTotal: totals.totalAmount,
        isLoyaltyReward: false,
      });
    }

    // Generate OTP for delivery confirmation
    const otpResult = await generateOTPForOrder(order.id);

    // Fetch slot label for notifications
    const slotForNotif = await db.deliverySlot.findUnique({ where: { id: input.slotId }, select: { label: true } });

    // Fire notifications (non-blocking — failures don't break order placement)
    notifyOrderPlaced({
      customerId: customer.id,
      customerName: sessionUser.name,
      orderRef: order.orderRef,
      totalAmount: totals.totalAmount,
      deliveryAddress: input.deliveryAddress,
      slotLabel: slotForNotif?.label,
    }).catch(console.error);

    if (otpResult.success) {
      notifyOTPSent({
        customerId: customer.id,
        customerName: sessionUser.name,
        orderRef: order.orderRef,
        otpValue: otpResult.otp,
      }).catch(console.error);
    }

    // Audit log
    await logOrderPlaced({
      orderId: order.id,
      customerId: sessionUser.id,
      snapshot: {
        orderRef,
        pricingBand: pricing.band,
        totalAmount: totals.totalAmount,
        paymentMethod: input.paymentMethod,
        deliveryAddress: input.deliveryAddress,
      },
    });

    return NextResponse.json({ id: order.id, orderRef: order.orderRef }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/orders]", err);
    return serverError();
  }
}
