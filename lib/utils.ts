/**
 * lib/utils.ts
 * Shared utility helpers.
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes without conflicts — used by shadcn/ui components. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a Decimal/number as Kenyan Shillings. */
export function formatKES(amount: number | string | { toNumber(): number }): string {
  const value =
    typeof amount === "object" && "toNumber" in amount
      ? amount.toNumber()
      : Number(amount);
  return `KES ${value.toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/** Generate a human-readable order reference: RAX-YYYYMMDD-NNN */
export function generateOrderRef(seq: number, date: Date = new Date()): string {
  const d = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `RAX-${d}-${String(seq).padStart(3, "0")}`;
}

/** Return true if a Kenyan phone number is in a broadly valid format. */
export function isValidKenyanPhone(phone: string): boolean {
  // Accepts +2547XXXXXXXX, 07XXXXXXXX, 7XXXXXXXX
  return /^(?:\+254|0)?[17]\d{8}$/.test(phone.replace(/\s/g, ""));
}

/** Normalise a phone number to E.164 +254 format. */
export function normaliseKenyanPhone(phone: string): string {
  const stripped = phone.replace(/\s/g, "");
  if (stripped.startsWith("+254")) return stripped;
  if (stripped.startsWith("0")) return "+254" + stripped.slice(1);
  if (stripped.startsWith("254")) return "+" + stripped;
  return "+254" + stripped;
}

/** Compute the haversine distance in km between two lat/lng points. */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
