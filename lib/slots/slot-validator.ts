/**
 * lib/slots/slot-validator.ts
 *
 * Delivery slot selection and availability logic.
 *
 * Business rules:
 *   §2    Operating hours and order timing
 *   §3    Delivery slot structure, availability, capacity, reservation
 *   §3.3  Min lead time 30 minutes; auto-suggest next available slot
 *   §3.4  Slot capacity is per-zone (pricing band proxy) per slot per date
 *   §3.5  Admin may overbook; unpaid orders hold capacity for 4 hours
 */

import type { DeliverySlot, SlotCapacity, PricingBand } from "@prisma/client";
import {
  OPERATING_HOURS,
  SLOT_MIN_LEAD_TIME_MINUTES,
} from "@/lib/constants";

// ── Time helpers (Nairobi = UTC+3) ────────────────────────────────────────────

const NAIROBI_OFFSET_HOURS = 3;

/** Return the current Date adjusted to Nairobi local time. */
export function nowNairobi(): Date {
  const utc = new Date();
  return new Date(utc.getTime() + NAIROBI_OFFSET_HOURS * 60 * 60 * 1000);
}

/**
 * Parse a "HH:MM" 24-hour time string into { hours, minutes }.
 */
function parseTime(hhmm: string): { hours: number; minutes: number } {
  const [h, m] = hhmm.split(":").map(Number);
  return { hours: h, minutes: m };
}

/**
 * Given a date and a "HH:MM" slot time, return a Date object for that moment
 * on that date (in local/server time — same timezone as `date`).
 */
function slotDateTime(date: Date, hhmm: string): Date {
  const { hours, minutes } = parseTime(hhmm);
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/**
 * Return true if a delivery date string (YYYY-MM-DD or Date) represents today
 * in Nairobi time.
 */
export function isToday(deliveryDate: Date | string, now?: Date): boolean {
  const n = now ?? nowNairobi();
  const d = new Date(deliveryDate);
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

// ── Same-day eligibility ──────────────────────────────────────────────────────

export type SameDayEligibilityResult =
  | { eligible: true }
  | { eligible: false; reason: "after_order_cutoff" | "after_same_day_cutoff" | "band_not_eligible" };

/**
 * Determine whether a same-day delivery is still eligible based on current
 * Nairobi time and the order's pricing band.
 *
 * Rules (§2.2, §2.3):
 *   - After 8:00 PM → next-day only (all bands)
 *   - After 6:30 PM AND band is Band 2 or Band 3 → next-day only
 *   - After 6:30 PM AND band is Band 1 → still eligible (slot/capacity check follows)
 *   - Before 6:30 PM → all bands eligible (slot/capacity check follows)
 */
export function checkSameDayEligibility(
  band: PricingBand,
  now?: Date
): SameDayEligibilityResult {
  const n = now ?? nowNairobi();
  const { hours: cutoffH, minutes: cutoffM } = parseTime(OPERATING_HOURS.ORDER_CUTOFF);
  const { hours: sameDayH, minutes: sameDayM } = parseTime(OPERATING_HOURS.SAME_DAY_CUTOFF);

  const nowMinutes = n.getHours() * 60 + n.getMinutes();
  const orderCutoffMinutes = cutoffH * 60 + cutoffM;
  const sameDayCutoffMinutes = sameDayH * 60 + sameDayM;

  if (nowMinutes >= orderCutoffMinutes) {
    return { eligible: false, reason: "after_order_cutoff" };
  }

  if (nowMinutes >= sameDayCutoffMinutes) {
    if (band === "BAND_2" || band === "BAND_3") {
      return { eligible: false, reason: "band_not_eligible" };
    }
    // Band 1 remains eligible after 6:30 PM (§2.3)
  }

  return { eligible: true };
}

// ── Lead-time check ───────────────────────────────────────────────────────────

/**
 * Return true if the slot's start time is at least SLOT_MIN_LEAD_TIME_MINUTES
 * (30 minutes) from now for a same-day booking.
 *
 * For future-day bookings, lead time is always satisfied.
 *
 * §3.3 — "An order placed during an active slot may still be assigned to that
 *         slot if it meets the minimum lead-time rule."
 */
export function meetsLeadTime(
  slot: Pick<DeliverySlot, "startTime">,
  deliveryDate: Date | string,
  now?: Date
): boolean {
  const n = now ?? nowNairobi();
  if (!isToday(deliveryDate, n)) return true; // future date — always fine

  const slotStart = slotDateTime(n, slot.startTime);
  const leadTimeMs = SLOT_MIN_LEAD_TIME_MINUTES * 60 * 1000;
  return slotStart.getTime() - n.getTime() >= leadTimeMs;
}

// ── Capacity check ────────────────────────────────────────────────────────────

/**
 * Slot capacity is zone-specific. The zone proxy used in MVP is the pricing band.
 * §3.4 — capacity is maxOrders per zone per slot per date.
 * §3.5 — unpaid orders hold capacity during the 4-hour reservation window.
 *         Admin may overbook (enforced only by UI warning, not a hard block here).
 *
 * Returns the matching SlotCapacity record, or null if none exists yet.
 * When null, the slot is treated as available (default max = 20).
 */
export function getSlotCapacity(
  capacities: SlotCapacity[],
  slotId: string,
  band: PricingBand,
  date: Date | string
): SlotCapacity | null {
  const d = new Date(date);
  return (
    capacities.find(
      (c) =>
        c.slotId === slotId &&
        c.pricingBand === band &&
        new Date(c.date).toDateString() === d.toDateString()
    ) ?? null
  );
}

export function isSlotAtCapacity(
  capacity: SlotCapacity | null,
  defaultMax = 20
): boolean {
  if (!capacity) return false;
  return capacity.bookedOrders >= capacity.maxOrders;
}

// ── Slot validation ───────────────────────────────────────────────────────────

export type SlotValidationInput = {
  slot: DeliverySlot;
  deliveryDate: Date | string;
  band: PricingBand;
  capacities: SlotCapacity[];
  /** Override current time — useful for testing */
  now?: Date;
};

export type SlotValidationResult =
  | { valid: true }
  | {
      valid: false;
      reason:
        | "slot_inactive"
        | "insufficient_lead_time"
        | "slot_at_capacity"
        | "same_day_not_eligible"
        | "after_order_cutoff";
    };

/**
 * Validate whether a customer may select the given slot.
 *
 * Checks (in order):
 * 1. Slot is active
 * 2. Same-day eligibility (band + current time)
 * 3. Minimum lead time (30 min) for same-day
 * 4. Capacity available for the band on the date
 */
export function validateSlotSelection(
  input: SlotValidationInput
): SlotValidationResult {
  const { slot, deliveryDate, band, capacities, now } = input;
  const n = now ?? nowNairobi();

  // 1. Slot must be active
  if (!slot.isActive) {
    return { valid: false, reason: "slot_inactive" };
  }

  // 2. Same-day eligibility (only matters if delivery is today)
  if (isToday(deliveryDate, n)) {
    const sameDayCheck = checkSameDayEligibility(band, n);
    if (!sameDayCheck.eligible) {
      if (sameDayCheck.reason === "after_order_cutoff") {
        return { valid: false, reason: "after_order_cutoff" };
      }
      return { valid: false, reason: "same_day_not_eligible" };
    }

    // 3. Lead time
    if (!meetsLeadTime(slot, deliveryDate, n)) {
      return { valid: false, reason: "insufficient_lead_time" };
    }
  }

  // 4. Capacity
  const capacity = getSlotCapacity(capacities, slot.id, band, deliveryDate);
  if (isSlotAtCapacity(capacity)) {
    return { valid: false, reason: "slot_at_capacity" };
  }

  return { valid: true };
}

// ── Next-slot suggestion ──────────────────────────────────────────────────────

export type NextSlotSuggestion =
  | { found: true; slot: DeliverySlot; deliveryDate: Date }
  | { found: false; reason: "no_slots_available" };

/**
 * Given an ordered list of available slots and their capacities, return the
 * next valid slot for the given band and current time.
 *
 * First tries same-day slots (in sort order), then falls back to the first
 * available slot on the next operating day.
 *
 * §3.3 — "If the selected slot does not meet the minimum lead time or has no
 *          available capacity, the system shall offer the next available slot."
 */
export function suggestNextSlot(input: {
  slots: DeliverySlot[];
  band: PricingBand;
  capacities: SlotCapacity[];
  now?: Date;
}): NextSlotSuggestion {
  const { slots, band, capacities, now } = input;
  const n = now ?? nowNairobi();

  const sortedSlots = [...slots].sort((a, b) => a.sortOrder - b.sortOrder);

  // Try today first
  for (const slot of sortedSlots) {
    const result = validateSlotSelection({
      slot,
      deliveryDate: n,
      band,
      capacities,
      now: n,
    });
    if (result.valid) {
      const deliveryDate = new Date(n);
      deliveryDate.setHours(0, 0, 0, 0);
      return { found: true, slot, deliveryDate };
    }
  }

  // Try tomorrow
  const tomorrow = new Date(n);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  for (const slot of sortedSlots) {
    if (!slot.isActive) continue;
    const capacity = getSlotCapacity(capacities, slot.id, band, tomorrow);
    if (!isSlotAtCapacity(capacity)) {
      return { found: true, slot, deliveryDate: tomorrow };
    }
  }

  return { found: false, reason: "no_slots_available" };
}
