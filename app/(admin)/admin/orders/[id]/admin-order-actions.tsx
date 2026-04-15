/**
 * app/(admin)/admin/orders/[id]/admin-order-actions.tsx
 *
 * Client component for admin-level order controls:
 * confirm, advance status, assign rider, enter M-Pesa code, override actions.
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus, DeliveryStatus, PaymentStatus, PaymentMethod, PricingBand, UserRole } from "@prisma/client";
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
import { ORDER_STATUS_TRANSITIONS, REASON_CODES, PAYMENT } from "@/lib/constants";

interface Rider {
  id: string;
  name: string;
}

interface Props {
  orderId: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  isAdminConfirmed: boolean;
  deliveryStatus: DeliveryStatus | null;
  deliveryId: string | null;
  currentRiderId: string | null;
  pricingBand: PricingBand;
  otpUsed: boolean;
  actingUserId: string;
  actingUserRole: UserRole;
  riders: Rider[];
}

export function AdminOrderActions({
  orderId,
  orderStatus,
  paymentStatus,
  paymentMethod,
  isAdminConfirmed,
  deliveryId,
  currentRiderId,
  pricingBand,
  otpUsed,
  actingUserId,
  riders,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Rider assignment
  const [selectedRider, setSelectedRider] = useState(currentRiderId ?? "");

  // Payment verification
  const [mpesaCode, setMpesaCode] = useState("");
  const [mpesaNote, setMpesaNote] = useState("");

  // Override reason
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideNote, setOverrideNote] = useState("");

  const allowedNextStatuses = (ORDER_STATUS_TRANSITIONS[orderStatus] ?? []) as OrderStatus[];
  const canConfirm = !isAdminConfirmed && orderStatus === "PLACED";
  const canAssignRider =
    orderStatus === "READY_FOR_DISPATCH" || orderStatus === "ASSIGNED_TO_RIDER";
  const canVerifyMpesa =
    paymentMethod === "MPESA" &&
    (paymentStatus === "UNPAID" || paymentStatus === "PENDING_VERIFICATION");
  const canForceComplete =
    orderStatus === "DELIVERED" && paymentStatus !== "UNPAID";
  const isBand3 = pricingBand === "BAND_3";

  function call(path: string, body: Record<string, unknown>) {
    setError("");
    setSuccess("");
    startTransition(async () => {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, actingUserId }),
      });
      if (res.ok) {
        setSuccess("Done.");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Action failed.");
      }
    });
  }

  function advanceOrderStatus(toStatus: OrderStatus) {
    call(`/api/orders/${orderId}/status`, { toStatus });
  }

  return (
    <div className="space-y-4">
      <Separator />
      <h3 className="text-sm font-semibold">Admin Actions</h3>

      {/* Confirm order */}
      {canConfirm && (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => call(`/api/orders/${orderId}/confirm`, {})}
            disabled={isPending}
          >
            Confirm Order
          </Button>
        </div>
      )}

      {/* Advance order status */}
      {allowedNextStatuses.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Advance Order Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {allowedNextStatuses.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === "CANCELLED" || s === "ON_HOLD" ? "outline" : "default"}
                disabled={isPending}
                onClick={() => advanceOrderStatus(s)}
                className="text-xs"
              >
                → {s.toLowerCase().replace(/_/g, " ")}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Rider assignment */}
      {canAssignRider && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Assign Rider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedRider} onValueChange={setSelectedRider}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select a rider" />
              </SelectTrigger>
              <SelectContent>
                {riders.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="text-sm">
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={isPending || !selectedRider}
              onClick={() =>
                call(`/api/orders/${orderId}/assign-rider`, { riderId: selectedRider })
              }
            >
              Assign
            </Button>
          </CardContent>
        </Card>
      )}

      {/* M-Pesa verification */}
      {canVerifyMpesa && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verify M-Pesa Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">M-Pesa Transaction Code</Label>
              <Input
                placeholder="e.g. QKA123DEFG"
                value={mpesaCode}
                onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Note (optional)</Label>
              <Input
                placeholder="e.g. Customer paid from different number"
                value={mpesaNote}
                onChange={(e) => setMpesaNote(e.target.value)}
                className="text-sm"
              />
            </div>
            <Button
              size="sm"
              disabled={isPending || !mpesaCode}
              onClick={() =>
                call(`/api/orders/${orderId}/verify-payment`, {
                  mpesaCode,
                  notes: mpesaNote,
                })
              }
            >
              Mark as Paid
            </Button>
            {isBand3 && (
              <p className="text-xs text-amber-700">
                Band 3 order — payment required before rider dispatch.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Force complete */}
      {canForceComplete && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">
              Force Complete Order
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Use only when delivery is confirmed and payment is settled.
              This action is audited.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Override Reason</Label>
              <Select onValueChange={setOverrideReason}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(REASON_CODES.MANUAL_OVERRIDE).map((r) => (
                    <SelectItem key={r} value={r} className="text-sm capitalize">
                      {r.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Note</Label>
              <Textarea
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-400 text-amber-800 hover:bg-amber-50"
              disabled={isPending || !overrideReason}
              onClick={() =>
                call(`/api/orders/${orderId}/force-complete`, {
                  reason: overrideReason,
                  note: overrideNote,
                })
              }
            >
              Force Complete
            </Button>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-700">{success}</p>}
    </div>
  );
}
