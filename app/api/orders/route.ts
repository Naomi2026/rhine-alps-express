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
import { Prisma } from "@prisma/client";
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
import { validateSlotSelection, suggestNextSlot } from "@/lib/slots/slot-validator";
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

    // Validate slot (active check)
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

    // Calculate pricing (gives us the band needed for slot capacity lookup)
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

    // §3.3, §3.4, §2.2, §2.3 — Validate slot: lead time, same-day cutoff, capacity
    const deliveryDateObj = new Date(input.deliveryDate);
    const slotCapacities = await db.slotCapacity.findMany({
      where: { slotId: input.slotId },
    });

    const slotValidation = validateSlotSelection({
      slot,
      deliveryDate: deliveryDateObj,
      band: pricing.band,
      capacities: slotCapacities,
    });

    if (!slotValidation.valid) {
      const errorMessages: Record<string, string> = {
        slot_inactive: "Selected delivery slot is not available.",
        insufficient_lead_time: "Please select a slot at least 30 minutes from now.",
        slot_at_capacity: "Selected slot is fully booked for your delivery area.",
        same_day_not_eligible:
          "Same-day delivery is not available for your area after 6:30 PM. Please choose a future date.",
        after_order_cutoff:
          "Orders cannot be placed after 8:00 PM. Please try again tomorrow.",
      };

      // Suggest the next available slot (§3.3)
      const allSlots = await db.deliverySlot.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
      const allCapacities = await db.slotCapacity.findMany();
      const suggestion = suggestNextSlot({ slots: allSlots, band: pricing.band, capacities: allCapacities });

      return NextResponse.json(
        {
          error: errorMessages[slotValidation.reason] ?? "Invalid slot selection.",
          suggestedSlot: suggestion.found
            ? { slotId: suggestion.slot.id, label: suggestion.slot.label, date: suggestion.deliveryDate }
            : null,
        },
        { status: 400 }
      );
    }

    // Check loyalty reward eligibility
    const loyaltyTarget = LOYALTY.QUALIFYING_ORDERS_REQUIRED;
    const isLoyaltyReward = customer.loyaltyCount > 0 && customer.loyaltyCount % loyaltyTarget === 0;

    // Calculate totals without credit first
    const totals = calculateOrderTotals(pricing, input.quantity, 0);

    // §BUG-004 — Retry up to 3 times on orderRef unique collision
    let order: Awaited<ReturnType<typeof db.order.create>> | null = null;
    let refRetries = 0;
    const MAX_REF_RETRIES = 3;

    while (!order && refRetries < MAX_REF_RETRIES) {
      const orderCount = await db.order.count();
      const orderRef = generateOrderRef(orderCount + 1 + refRetries);

      try {
        order = await db.$transaction(async (tx) => {
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
              deliveryDate: deliveryDateObj,
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

          // §3.4 — Increment slot capacity atomically with order creation
          await tx.slotCapacity.upsert({
            where: {
              slotId_pricingBand_date: {
                slotId: input.slotId,
                pricingBand: pricing.band,
                date: deliveryDateObj,
              },
            },
            update: { bookedOrders: { increment: 1 } },
            create: {
              slotId: input.slotId,
              pricingBand: pricing.band,
              date: deliveryDateObj,
              maxOrders: 20,
              bookedOrders: 1,
            },
          });

          return newOrder;
        });
      } catch (err) {
        // P2002 = unique constraint violation on orderRef — retry with a new ref
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002" &&
          (err.meta?.target as string[] | undefined)?.includes("orderRef")
        ) {
          refRetries++;
          continue;
        }
        throw err; // re-throw unrelated errors
      }
    }

    if (!order) {
      return NextResponse.json(
        { error: "Could not generate a unique order reference. Please try again." },
        { status: 422 }
      );
    }

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
    // customer.userId is the User.id FK — required by Notification.userId
    notifyOrderPlaced({
      userId: customer.userId,
      customerName: sessionUser.name,
      orderRef: order.orderRef,
      totalAmount: totals.totalAmount,
      deliveryAddress: input.deliveryAddress,
      slotLabel: slotForNotif?.label,
    }).catch(console.error);

    if (otpResult.success) {
      notifyOTPSent({
        userId: customer.userId,
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
        orderRef: order.orderRef,
        pricingBand: pricing.band,
        totalAmount: totals.totalAmount,
        paymentMethod: input.paymentMethod,
        deliveryAddress: input.deliveryAddress,
      },
    });

    return NextResponse.json(
      { id: order.id, orderRef: order.orderRef, isProvisional: order.isProvisionalPrice },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/orders]", err);
    return serverError();
  }
}
