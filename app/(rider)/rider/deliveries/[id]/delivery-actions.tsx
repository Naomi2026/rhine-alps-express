/**
 * app/(rider)/rider/deliveries/[id]/delivery-actions.tsx
 *
 * Client component: delivery status progression buttons + OTP entry + cash collection.
 * Riders may only advance through allowed states (§18.3, §15.2).
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DeliveryStatus, PaymentStatus, PaymentMethod } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DELIVERY_STATUS_TRANSITIONS, REASON_CODES } from "@/lib/constants";

interface Props {
  deliveryId: string;
  orderId: string;
  currentStatus: DeliveryStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  amountDue: number;
  otpUsed: boolean;
  riderId: string;
}

const STATUS_LABELS: Partial<Record<DeliveryStatus, string>> = {
  PICKED_UP:               "Mark Picked Up",
  IN_TRANSIT:              "Start Transit",
  ARRIVED:                 "Mark Arrived",
  PENDING_OTP_CONFIRMATION:"Request OTP",
  DELIVERED:               "Confirm Delivered",
  DELIVERY_ATTEMPTED:      "Mark Attempted",
  FAILED:                  "Mark Failed",
  RETURNED:                "Mark Returned",
};

const FAILED_REASONS = Object.values(REASON_CODES.FAILED_DELIVERY);

export function DeliveryActions({
  deliveryId,
  orderId,
  currentStatus,
  paymentStatus,
  paymentMethod,
  amountDue,
  otpUsed,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // OTP entry state
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpPending, startOtpTransition] = useTransition();

  // Cash collection state
  const [cashAmount, setCashAmount] = useState(String(amountDue));

  // Failure/return state
  const [failReason, setFailReason] = useState("");
  const [failNote, setFailNote] = useState("");

  const allowedNextStatuses = (DELIVERY_STATUS_TRANSITIONS[currentStatus] ?? []) as DeliveryStatus[];

  const showOtpEntry = currentStatus === "PENDING_OTP_CONFIRMATION" && !otpUsed;
  const showCashEntry =
    paymentMethod === "CASH_ON_DELIVERY" &&
    (paymentStatus === "UNPAID" || paymentStatus === "PARTIALLY_PAID") &&
    currentStatus === "PENDING_OTP_CONFIRMATION";

  function advanceStatus(toStatus: DeliveryStatus) {
    setError("");
    startTransition(async () => {
      const body: Record<string, unknown> = { toStatus };
      if (
        (toStatus === "DELIVERY_ATTEMPTED" || toStatus === "FAILED" || toStatus === "RETURNED") &&
        failReason
      ) {
        body.failReason = failReason;
        body.failNote = failNote;
      }
      if (toStatus === "DELIVERED" && paymentMethod === "CASH_ON_DELIVERY") {
        body.cashCollected = Number(cashAmount);
      }

      const res = await fetch(`/api/deliveries/${deliveryId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to update status.");
      }
    });
  }

  function submitOtp() {
    if (otpValue.length !== 6) {
      setOtpError("Enter the 6-digit code.");
      return;
    }
    setOtpError("");
    startOtpTransition(async () => {
      const res = await fetch(`/api/orders/${orderId}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpValue }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setOtpError(data.error ?? "OTP verification failed.");
      }
    });
  }

  const needsFailReason =
    allowedNextStatuses.includes("DELIVERY_ATTEMPTED") ||
    allowedNextStatuses.includes("FAILED") ||
    allowedNextStatuses.includes("RETURNED");

  return (
    <div className="space-y-4">
      {/* OTP entry */}
      {showOtpEntry && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">Enter Delivery OTP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-amber-700">
              Ask the customer for their 6-digit delivery code.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="6-digit code"
                maxLength={6}
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))}
                className="text-center text-lg font-mono tracking-widest"
              />
              <Button
                onClick={submitOtp}
                disabled={otpPending || otpValue.length !== 6}
              >
                {otpPending ? "Verifying..." : "Verify"}
              </Button>
            </div>
            {otpError && <p className="text-xs text-destructive">{otpError}</p>}
          </CardContent>
        </Card>
      )}

      {/* Cash collection */}
      {showCashEntry && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cash Collection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="cashAmount" className="text-xs">
              Amount received (KES)
            </Label>
            <Input
              id="cashAmount"
              type="number"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              Amount due: KES {amountDue.toLocaleString()}. Record exact amount received.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Fail reason (when applicable) */}
      {needsFailReason && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failure / Return Reason</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Select onValueChange={setFailReason}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select reason (if marking failed/attempted)" />
              </SelectTrigger>
              <SelectContent>
                {FAILED_REASONS.map((r) => (
                  <SelectItem key={r} value={r} className="text-sm capitalize">
                    {r.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Additional note (optional)"
              value={failNote}
              onChange={(e) => setFailNote(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </CardContent>
        </Card>
      )}

      {/* Status progression buttons */}
      {allowedNextStatuses.length > 0 && (
        <div className="space-y-2">
          {allowedNextStatuses
            .filter((s) => STATUS_LABELS[s])
            .map((nextStatus) => {
              const isDelivered = nextStatus === "DELIVERED";
              const requiresOtp = isDelivered && !otpUsed;
              return (
                <Button
                  key={nextStatus}
                  className="w-full"
                  variant={
                    nextStatus === "FAILED" || nextStatus === "RETURNED" || nextStatus === "DELIVERY_ATTEMPTED"
                      ? "destructive"
                      : "default"
                  }
                  disabled={isPending || requiresOtp}
                  onClick={() => advanceStatus(nextStatus)}
                >
                  {isPending ? "Updating..." : STATUS_LABELS[nextStatus]}
                  {requiresOtp && " (OTP required first)"}
                </Button>
              );
            })}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {currentStatus === "DELIVERED" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
          <p className="text-sm font-medium text-green-800">Delivery Confirmed</p>
          <p className="text-xs text-green-700 mt-1">
            OTP verified. Awaiting admin to complete order.
          </p>
        </div>
      )}
    </div>
  );
}
