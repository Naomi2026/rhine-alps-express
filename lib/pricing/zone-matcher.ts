/**
 * lib/pricing/zone-matcher.ts
 *
 * Band 2 area name matching against the ServiceZone registry.
 * Business rules §7.2, §7.4, §7.5
 *
 * Band 2 zones are admin-managed in the DB (ServiceZone table).
 * Each zone has a canonical name and an array of aliases for fuzzy matching.
 * Matching is case-insensitive and trims whitespace.
 *
 * Precedence (§7.4): Band 1 radius check happens first (in pricing-engine.ts).
 * This module is called only when the location is outside Band 1 radius.
 */

import type { ServiceZone } from "@prisma/client";
import { PRICING } from "@/lib/constants";

/**
 * Normalise a string for comparison: lowercase, trimmed, collapse inner spaces.
 */
function normalise(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Check whether a free-text address string matches any active Band 2 service zone.
 *
 * Matching strategy (in order):
 * 1. Exact normalised match against zone name
 * 2. Exact normalised match against any alias
 * 3. Substring: zone name or alias is contained in the address
 * 4. Substring: address token is contained in zone name or alias
 *
 * The function returns the first matching zone, or null if none match.
 *
 * @param address - Free-text delivery address entered by the customer
 * @param zones   - Active ServiceZone records fetched from the database
 */
export function matchBand2Zone(
  address: string,
  zones: ServiceZone[]
): ServiceZone | null {
  const normAddress = normalise(address);

  for (const zone of zones) {
    if (!zone.isActive) continue;
    if (zone.pricingBand !== "BAND_2") continue;

    const candidates = [zone.name, ...zone.aliases].map(normalise);

    // 1. Exact match
    if (candidates.some((c) => c === normAddress)) return zone;

    // 2. Zone name/alias fully contained in address
    if (candidates.some((c) => normAddress.includes(c))) return zone;

    // 3. Address word(s) fully contained in any candidate
    const addressTokens = normAddress.split(/[\s,/]+/).filter(Boolean);
    if (
      candidates.some((c) =>
        addressTokens.some((token) => token.length >= 4 && c.includes(token))
      )
    ) {
      return zone;
    }
  }

  return null;
}

/**
 * Fallback: check the hardcoded PRICING.BAND_2.AREAS list when the DB is not
 * available (e.g. during static generation or in tests without a DB connection).
 *
 * Production code should prefer matchBand2Zone() with live DB zones.
 */
export function matchBand2Static(address: string): boolean {
  const normAddress = normalise(address);
  return PRICING.BAND_2.AREAS.some(
    (area) =>
      normAddress.includes(normalise(area)) ||
      normalise(area).includes(normAddress)
  );
}
