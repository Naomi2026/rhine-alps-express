/**
 * lib/pricing/pricing-engine.ts
 *
 * Calculates pricing band, bottle unit price, delivery fee, subtotal, and
 * final amounts for an order.
 *
 * Business rules:
 *   §7.1  Band 1 — 0–2 km radius, KES 150/bottle, no delivery fee
 *   §7.2  Band 2 — predefined areas, KES 200/bottle, no delivery fee
 *   §7.3  Band 3 — all else ≤30 km, KES 150/bottle + KES 30/km (per order)
 *   §7.4  Pricing precedence: Band 1 radius → Band 2 area → Band 3
 *   §7.5  Geo-location takes precedence over typed area name on conflict
 *   §5.7  Admin may approve far-away locations (>30 km) manually
 *   §5.8  Orders may proceed with provisional pricing when location is ambiguous
 *   §7.7  Outside mapped areas → provisional Band 3, not blocked
 */

import type { ServiceZone } from "@prisma/client";
import type { PricingResult } from "@/lib/types";
import { DISPATCH_LOCATION, MAX_SERVICE_RADIUS_KM, PRICING } from "@/lib/constants";
import { matchBand2Zone, matchBand2Static } from "./zone-matcher";

// ── Haversine distance ────────────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate straight-line distance in kilometres between two lat/lng points
 * using the Haversine formula.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Distance from the dispatch location to the given coordinates.
 */
export function distanceFromDispatch(lat: number, lng: number): number {
  return haversineKm(DISPATCH_LOCATION.lat, DISPATCH_LOCATION.lng, lat, lng);
}

// ── Pricing inputs ────────────────────────────────────────────────────────────

export type PricingInput = {
  /** Delivery coordinates — required for Band 1 radius check */
  lat?: number | null;
  lng?: number | null;
  /** Free-text delivery address — used for Band 2 area matching */
  address?: string | null;
  /** Number of bottles ordered */
  quantity: number;
  /**
   * Active Band 2 zones from the database.
   * If not provided, falls back to the static PRICING.BAND_2.AREAS list.
   */
  serviceZones?: ServiceZone[];
};

// ── Band resolution ───────────────────────────────────────────────────────────

export type BandResolution = {
  band: "BAND_1" | "BAND_2" | "BAND_3";
  distanceKm: number | null;
  /** True when the location could not be fully validated */
  isProvisional: boolean;
  /** True when the location is outside the 30 km service radius */
  isOutsideServiceArea: boolean;
};

/**
 * Resolve the pricing band for a delivery location.
 *
 * Precedence (§7.4):
 *   1. Band 1 — coordinates available AND distance ≤ 2 km from dispatch
 *   2. Band 2 — address text matches a named Band 2 area
 *   3. Band 3 — everything else within service radius
 *
 * When coordinates are missing, Band 1 cannot be checked by distance; the
 * engine falls back to address matching and marks the result provisional if
 * neither Band 1 (coordinate-based) nor Band 2 can be confirmed.
 */
export function resolvePricingBand(input: {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  serviceZones?: ServiceZone[];
}): BandResolution {
  const { lat, lng, address, serviceZones } = input;

  let distanceKm: number | null = null;
  let isOutsideServiceArea = false;

  // ── Step 1: Band 1 (requires coordinates) ──────────────────────────────────
  if (lat != null && lng != null) {
    distanceKm = distanceFromDispatch(lat, lng);

    if (distanceKm > MAX_SERVICE_RADIUS_KM) {
      isOutsideServiceArea = true;
      // Still assign Band 3 provisionally — admin must approve (§5.7)
      return {
        band: "BAND_3",
        distanceKm,
        isProvisional: true,
        isOutsideServiceArea: true,
      };
    }

    if (distanceKm <= PRICING.BAND_1.RADIUS_KM) {
      return { band: "BAND_1", distanceKm, isProvisional: false, isOutsideServiceArea: false };
    }
  }

  // ── Step 2: Band 2 (address matching) ─────────────────────────────────────
  if (address) {
    const band2Match =
      serviceZones && serviceZones.length > 0
        ? matchBand2Zone(address, serviceZones)
        : matchBand2Static(address)
        ? { name: address } // placeholder — caller only checks truthiness
        : null;

    if (band2Match) {
      return {
        band: "BAND_2",
        distanceKm,
        isProvisional: lat == null || lng == null, // provisional if no geo confirmation
        isOutsideServiceArea: false,
      };
    }
  }

  // ── Step 3: Band 3 ─────────────────────────────────────────────────────────
  // Provisional when we have no coordinates to confirm the distance.
  return {
    band: "BAND_3",
    distanceKm,
    isProvisional: lat == null || lng == null,
    isOutsideServiceArea,
  };
}

// ── Full pricing calculation ──────────────────────────────────────────────────

/**
 * Calculate the full pricing breakdown for an order.
 *
 * Returns a PricingResult that is stored denormalised on the Order record
 * (bottleUnitPrice, deliveryFee, subtotal, totalAmount) as required by the
 * reporting rules (§23).
 *
 * Band 3 delivery fee is per-order, not per-bottle (§7.3).
 */
export function calculatePricing(input: PricingInput): PricingResult {
  const { lat, lng, address, quantity, serviceZones } = input;

  const { band, distanceKm, isProvisional } = resolvePricingBand({
    lat,
    lng,
    address,
    serviceZones,
  });

  let bottleUnitPrice: number;
  let deliveryFee: number;

  switch (band) {
    case "BAND_1":
      bottleUnitPrice = PRICING.BAND_1.BOTTLE_PRICE_KES;
      deliveryFee = 0;
      break;
    case "BAND_2":
      bottleUnitPrice = PRICING.BAND_2.BOTTLE_PRICE_KES;
      deliveryFee = 0;
      break;
    case "BAND_3":
    default:
      bottleUnitPrice = PRICING.BAND_3.BOTTLE_PRICE_KES;
      // Delivery fee uses the computed distance, or 0 when provisional
      // (provisional orders will be repriced once location is validated)
      deliveryFee =
        distanceKm != null
          ? Math.round(distanceKm * PRICING.BAND_3.DELIVERY_FEE_PER_KM_KES)
          : 0;
      break;
  }

  return {
    band,
    distanceKm: distanceKm ?? null,
    bottleUnitPrice,
    deliveryFee,
    isProvisional,
  };
}

/**
 * Calculate the full order totals from a PricingResult and quantity.
 *
 * subtotal     = bottleUnitPrice × quantity
 * totalAmount  = subtotal + deliveryFee
 * amountDue    = totalAmount − creditApplied  (credit applied separately)
 */
export function calculateOrderTotals(
  pricing: PricingResult,
  quantity: number,
  creditApplied: number = 0
): {
  subtotal: number;
  totalAmount: number;
  amountDue: number;
} {
  const subtotal = pricing.bottleUnitPrice * quantity;
  const totalAmount = subtotal + pricing.deliveryFee;
  const amountDue = Math.max(0, totalAmount - creditApplied);

  return { subtotal, totalAmount, amountDue };
}

/**
 * Determine whether Cash on Delivery is allowed for this pricing band.
 * §9.5 — COD not allowed for Band 3.
 */
export function isCODAllowed(band: "BAND_1" | "BAND_2" | "BAND_3"): boolean {
  return band !== "BAND_3";
}

/**
 * Determine whether pay-later (M-Pesa after order submission) is allowed.
 * §9.4 — pay-later only for Band 1 and Band 2.
 */
export function isPayLaterAllowed(band: "BAND_1" | "BAND_2" | "BAND_3"): boolean {
  return band !== "BAND_3";
}

/**
 * Determine whether an unpaid M-Pesa order may be assigned to a rider.
 * §9.6 — unpaid Band 3 orders must not be assigned until payment is confirmed.
 */
export function canAssignUnpaidOrder(band: "BAND_1" | "BAND_2" | "BAND_3"): boolean {
  return band !== "BAND_3";
}
