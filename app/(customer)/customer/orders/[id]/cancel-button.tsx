/**
 * app/(customer)/orders/[id]/cancel-button.tsx
 *
 * Client component: renders a cancel order dialog with mandatory reason.
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REASON_CODES } from "@/lib/constants";

const CANCEL_REASONS = Object.entries(REASON_CODES.CANCELLED).map(([, v]) => v);

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCancel() {
    if (!reason) {
      setError("Please select a cancellation reason.");
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, note }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to cancel order. Please try again.");
      }
    });
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
        onClick={() => setOpen(true)}
      >
        Cancel Order
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-4">
      <p className="text-sm font-medium text-destructive">Cancel this order?</p>

      <div className="space-y-2">
        <Label htmlFor="cancel-reason" className="text-xs">
          Reason (required)
        </Label>
        <Select onValueChange={setReason}>
          <SelectTrigger id="cancel-reason" className="text-sm">
            <SelectValue placeholder="Select a reason" />
          </SelectTrigger>
          <SelectContent>
            {CANCEL_REASONS.map((r) => (
              <SelectItem key={r} value={r} className="text-sm capitalize">
                {r.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cancel-note" className="text-xs">
          Additional note (optional)
        </Label>
        <Textarea
          id="cancel-note"
          placeholder="Any additional details..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="text-sm"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={handleCancel}
          className="flex-1"
        >
          {isPending ? "Cancelling..." : "Confirm Cancel"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => { setOpen(false); setError(""); }}
          className="flex-1"
        >
          Keep Order
        </Button>
      </div>
    </div>
  );
}
