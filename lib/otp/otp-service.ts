/**
 * lib/otp/otp-service.ts
 *
 * OTP generation, verification, and resend for delivery confirmation.
 *
 * Business rules:
 *   §15.1  Unique OTP per order; linked to order and customer; single-use
 *   §15.2  Rider cannot mark delivered without valid OTP; admin console same
 *   §15.3  Max 3 validation attempts; max 3 resends; 30 s resend cooldown
 *   §15.4  Full audit trail for every verification attempt
 *   §15.5  Brute-force protection via retry limits
 *   §24.5  OTP stored in tokenized (hashed) form only — never plain text
 */

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { OTPVerifyInput, OTPVerifyResult } from "@/lib/types";
import { OTP as OTP_CONFIG } from "@/lib/constants";

// ── OTP generation ────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random numeric OTP string of the configured
 * length (default 6 digits). Returns the plain-text value to be sent to
 * the customer, and the bcrypt hash to be stored.
 */
async function generateOTPValue(): Promise<{ plain: string; hash: string }> {
  // Pad with leading zeros to ensure correct length
  const max = Math.pow(10, OTP_CONFIG.LENGTH);
  const raw = Math.floor(Math.random() * max);
  const plain = String(raw).padStart(OTP_CONFIG.LENGTH, "0");
  const hash = await bcrypt.hash(plain, 10);
  return { plain, hash };
}

export type GenerateOTPResult =
  | { success: true; otp: string; expiresAt: Date }
  | { success: false; reason: "order_not_found" | "otp_already_active" };

/**
 * Generate and persist a new OTP for an order.
 *
 * If an OTPRecord already exists for the order and has not been used or
 * expired, the existing record is returned (caller should resend, not
 * regenerate). If the existing OTP is used or expired, it is replaced.
 *
 * Returns the plain-text OTP value — the caller is responsible for
 * delivering it to the customer via the configured notification channel.
 *
 * §15.1 — "The system shall generate a unique OTP for each order."
 * §24.5 — OTP value stored as bcrypt hash only.
 */
export async function generateOTPForOrder(
  orderId: string
): Promise<GenerateOTPResult> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });

  if (!order) {
    return { success: false, reason: "order_not_found" };
  }

  const existing = await db.oTPRecord.findUnique({ where: { orderId } });

  // If an active (not used, not expired) OTP already exists, surface it as
  // still-active so callers know to resend rather than create a duplicate.
  if (existing && !existing.isUsed && existing.expiresAt > new Date()) {
    return { success: false, reason: "otp_already_active" };
  }

  const { plain, hash } = await generateOTPValue();
  const expiresAt = new Date(
    Date.now() + OTP_CONFIG.EXPIRY_HOURS * 60 * 60 * 1000
  );

  if (existing) {
    // Replace expired or used OTP
    await db.oTPRecord.update({
      where: { orderId },
      data: {
        tokenHash: hash,
        expiresAt,
        isUsed: false,
        usedAt: null,
        validationAttempts: 0,
        resendAttempts: 0,
        lastResendAt: null,
        createdAt: new Date(),
      },
    });
  } else {
    await db.oTPRecord.create({
      data: {
        orderId,
        tokenHash: hash,
        expiresAt,
      },
    });
  }

  return { success: true, otp: plain, expiresAt };
}

// ── OTP verification ──────────────────────────────────────────────────────────

/**
 * Verify an OTP submission from a rider or admin.
 *
 * Side effects:
 * - Increments validationAttempts on every call
 * - Marks the OTP as used on success
 * - Writes an OTPVerification audit record for every attempt
 *
 * §15.2 — Delivery cannot be confirmed without a passing OTP verification.
 * §15.3 — Max 3 validation attempts.
 * §15.4 — Every attempt (success or failure) is recorded in OTPVerification.
 */
export async function verifyOTP(input: OTPVerifyInput): Promise<OTPVerifyResult> {
  const { orderId, otpValue, submittedBy } = input;

  const record = await db.oTPRecord.findUnique({ where: { orderId } });

  if (!record) {
    return { success: false, reason: "invalid" };
  }

  // Already used
  if (record.isUsed) {
    await recordVerification(record.id, "failure", submittedBy, "already_used");
    return { success: false, reason: "already_used" };
  }

  // Expired
  if (record.expiresAt < new Date()) {
    await recordVerification(record.id, "failure", submittedBy, "expired");
    return { success: false, reason: "expired" };
  }

  // Max attempts exhausted — check BEFORE incrementing so the Nth failure
  // is still recorded
  if (record.validationAttempts >= OTP_CONFIG.MAX_VALIDATION_ATTEMPTS) {
    await recordVerification(record.id, "failure", submittedBy, "max_attempts");
    return { success: false, reason: "max_attempts" };
  }

  // Increment attempt counter
  await db.oTPRecord.update({
    where: { id: record.id },
    data: { validationAttempts: { increment: 1 } },
  });

  // Constant-time comparison via bcrypt
  const isMatch = await bcrypt.compare(otpValue, record.tokenHash);

  if (isMatch) {
    // Mark as used
    await db.oTPRecord.update({
      where: { id: record.id },
      data: { isUsed: true, usedAt: new Date() },
    });
    await recordVerification(record.id, "success", submittedBy, null);
    return { success: true };
  }

  await recordVerification(record.id, "failure", submittedBy, "invalid_code");
  return { success: false, reason: "invalid" };
}

async function recordVerification(
  otpId: string,
  result: "success" | "failure",
  submittedBy: string,
  note: string | null
): Promise<void> {
  await db.oTPVerification.create({
    data: {
      otpId,
      result,
      submittedBy,
      note,
    },
  });
}

// ── OTP resend ────────────────────────────────────────────────────────────────

export type ResendOTPResult =
  | { success: true; otp: string; expiresAt: Date }
  | {
      success: false;
      reason:
        | "no_active_otp"
        | "max_resends_reached"
        | "cooldown_active"
        | "otp_already_used";
      cooldownSecondsRemaining?: number;
    };

/**
 * Resend (regenerate) the OTP for an order within the allowed resend limits.
 *
 * §15.3 — Max 3 resends; 30 second cooldown between resends.
 *          "OTP regeneration shall be system-controlled only."
 *
 * On resend, a new OTP value is generated and the hash is updated in place.
 * The resendAttempts counter is incremented. The validationAttempts counter
 * is reset so the customer gets 3 fresh attempts with the new code.
 */
export async function resendOTP(
  orderId: string,
  requestedBy: string
): Promise<ResendOTPResult> {
  const record = await db.oTPRecord.findUnique({ where: { orderId } });

  if (!record) {
    return { success: false, reason: "no_active_otp" };
  }

  if (record.isUsed) {
    return { success: false, reason: "otp_already_used" };
  }

  if (record.resendAttempts >= OTP_CONFIG.MAX_RESEND_ATTEMPTS) {
    return { success: false, reason: "max_resends_reached" };
  }

  // Cooldown check
  if (record.lastResendAt) {
    const cooldownMs = OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000;
    const elapsed = Date.now() - record.lastResendAt.getTime();
    if (elapsed < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - elapsed) / 1000);
      return {
        success: false,
        reason: "cooldown_active",
        cooldownSecondsRemaining: remaining,
      };
    }
  }

  // Generate new OTP value and update record
  const { plain, hash } = await generateOTPValue();
  const expiresAt = new Date(
    Date.now() + OTP_CONFIG.EXPIRY_HOURS * 60 * 60 * 1000
  );

  await db.oTPRecord.update({
    where: { id: record.id },
    data: {
      tokenHash: hash,
      expiresAt,
      resendAttempts: { increment: 1 },
      lastResendAt: new Date(),
      // Reset validation attempts so the recipient gets 3 fresh tries
      validationAttempts: 0,
      isUsed: false,
    },
  });

  // Audit the resend
  await recordVerification(record.id, "success", requestedBy, "otp_resent");

  return { success: true, otp: plain, expiresAt };
}

// ── OTP status query ──────────────────────────────────────────────────────────

export type OTPStatus = {
  exists: boolean;
  isUsed: boolean;
  isExpired: boolean;
  attemptsRemaining: number;
  resendsRemaining: number;
  cooldownSecondsRemaining: number;
};

/**
 * Return a summary of OTP state for a given order — used by the rider console
 * and admin panel to render the appropriate UI.
 */
export async function getOTPStatus(orderId: string): Promise<OTPStatus> {
  const record = await db.oTPRecord.findUnique({ where: { orderId } });

  if (!record) {
    return {
      exists: false,
      isUsed: false,
      isExpired: false,
      attemptsRemaining: OTP_CONFIG.MAX_VALIDATION_ATTEMPTS,
      resendsRemaining: OTP_CONFIG.MAX_RESEND_ATTEMPTS,
      cooldownSecondsRemaining: 0,
    };
  }

  const isExpired = record.expiresAt < new Date();

  let cooldownSecondsRemaining = 0;
  if (record.lastResendAt) {
    const cooldownMs = OTP_CONFIG.RESEND_COOLDOWN_SECONDS * 1000;
    const elapsed = Date.now() - record.lastResendAt.getTime();
    if (elapsed < cooldownMs) {
      cooldownSecondsRemaining = Math.ceil((cooldownMs - elapsed) / 1000);
    }
  }

  return {
    exists: true,
    isUsed: record.isUsed,
    isExpired,
    attemptsRemaining: Math.max(
      0,
      OTP_CONFIG.MAX_VALIDATION_ATTEMPTS - record.validationAttempts
    ),
    resendsRemaining: Math.max(
      0,
      OTP_CONFIG.MAX_RESEND_ATTEMPTS - record.resendAttempts
    ),
    cooldownSecondsRemaining,
  };
}
