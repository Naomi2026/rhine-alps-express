/**
 * app/(customer)/orders/new/place-order-form.tsx
 *
 * Client-side place-order form. Calls /api/orders to create the order.
 * Pricing preview is shown before submission; final price is set server-side.
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatKES } from "@/lib/utils";
import { LOYALTY, ORDER_QUANTITY } from "@/lib/constants";

interface Slot {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
}

interface Props {
  defaultAddress: string;
  defaultLat?: number;
  defaultLng?: number;
  creditBalance: number;
  loyaltyCount: number;
  slots: Slot[];
}

const schema = z.object({
  deliveryAddress: z.string().min(5, "Address must be at least 5 characters"),
  quantity: z
    .number({ invalid_type_error: "Enter a quantity" })
    .int()
    .min(ORDER_QUANTITY.MIN)
    .max(ORDER_QUANTITY.MAX),
  slotId: z.string().min(1, "Select a delivery slot"),
  deliveryDate: z.string().min(1, "Select a delivery date"),
  paymentMethod: z.enum(["MPESA", "CASH_ON_DELIVERY"]),
  isExchange: z.boolean(),
  deliveryNotes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function PlaceOrderForm({
  defaultAddress,
  creditBalance,
  loyaltyCount,
  slots,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState("");

  // Simple pricing preview (estimates shown to user; real price is server-validated)
  const [previewQty, setPreviewQty] = useState(1);

  const loyaltyTarget = LOYALTY.QUALIFYING_ORDERS_REQUIRED;
  const isLoyaltyReward = loyaltyCount > 0 && loyaltyCount % loyaltyTarget === 0;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      deliveryAddress: defaultAddress,
      quantity: 1,
      slotId: slots[0]?.id ?? "",
      deliveryDate: new Date().toISOString().split("T")[0],
      paymentMethod: "MPESA",
      isExchange: false,
      deliveryNotes: "",
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;
  const qty = watch("quantity");

  // Optimistic preview: assume Band 1 price (KES 150) for display
  // Real pricing is always computed server-side
  const estimatedUnitPrice = 150;
  const estimatedSubtotal = (qty || 1) * estimatedUnitPrice;
  const estimatedAfterCredit = Math.max(0, estimatedSubtotal - creditBalance);

  function onSubmit(data: FormValues) {
    setServerError("");
    startTransition(async () => {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        router.push(`/orders/${json.id}`);
      } else {
        const json = await res.json().catch(() => ({}));
        setServerError(json.error ?? "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Loyalty notice */}
      {isLoyaltyReward && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-medium text-green-800">
            🎉 You earned a free bottle reward!
          </p>
          <p className="text-xs text-green-700 mt-0.5">
            This order will apply your loyalty reward automatically.
          </p>
        </div>
      )}

      {/* Delivery address */}
      <div className="space-y-1.5">
        <Label htmlFor="deliveryAddress">Delivery Address</Label>
        <Textarea
          id="deliveryAddress"
          placeholder="e.g. House 14, Kiambu Road, Ruaka"
          rows={2}
          {...register("deliveryAddress")}
        />
        {errors.deliveryAddress && (
          <p className="text-xs text-destructive">{errors.deliveryAddress.message}</p>
        )}
      </div>

      {/* Quantity */}
      <div className="space-y-1.5">
        <Label htmlFor="quantity">Quantity (bottles)</Label>
        <Input
          id="quantity"
          type="number"
          min={ORDER_QUANTITY.MIN}
          max={ORDER_QUANTITY.MAX}
          {...register("quantity", {
            valueAsNumber: true,
            onChange: (e) => setPreviewQty(Number(e.target.value)),
          })}
        />
        {errors.quantity && (
          <p className="text-xs text-destructive">{errors.quantity.message}</p>
        )}
      </div>

      {/* Exchange */}
      <div className="flex items-center gap-2">
        <input
          id="isExchange"
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          {...register("isExchange")}
        />
        <Label htmlFor="isExchange" className="font-normal text-sm">
          I have an empty bottle to exchange
        </Label>
      </div>

      {/* Delivery slot */}
      <div className="space-y-1.5">
        <Label>Delivery Slot</Label>
        <Select
          defaultValue={slots[0]?.id}
          onValueChange={(v) => setValue("slotId", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a slot" />
          </SelectTrigger>
          <SelectContent>
            {slots.map((slot) => (
              <SelectItem key={slot.id} value={slot.id}>
                {slot.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.slotId && (
          <p className="text-xs text-destructive">{errors.slotId.message}</p>
        )}
      </div>

      {/* Delivery date */}
      <div className="space-y-1.5">
        <Label htmlFor="deliveryDate">Delivery Date</Label>
        <Input
          id="deliveryDate"
          type="date"
          min={new Date().toISOString().split("T")[0]}
          {...register("deliveryDate")}
        />
        {errors.deliveryDate && (
          <p className="text-xs text-destructive">{errors.deliveryDate.message}</p>
        )}
      </div>

      {/* Payment method */}
      <div className="space-y-1.5">
        <Label>Payment Method</Label>
        <Select
          defaultValue="MPESA"
          onValueChange={(v) => setValue("paymentMethod", v as "MPESA" | "CASH_ON_DELIVERY")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MPESA">M-Pesa</SelectItem>
            <SelectItem value="CASH_ON_DELIVERY">Cash on Delivery</SelectItem>
          </SelectContent>
        </Select>
        {errors.paymentMethod && (
          <p className="text-xs text-destructive">{errors.paymentMethod.message}</p>
        )}
      </div>

      {/* Delivery notes */}
      <div className="space-y-1.5">
        <Label htmlFor="deliveryNotes">Delivery Notes (optional)</Label>
        <Textarea
          id="deliveryNotes"
          placeholder="Gate code, landmark, instructions for rider..."
          rows={2}
          {...register("deliveryNotes")}
        />
      </div>

      {/* Pricing preview */}
      <Card>
        <CardContent className="pt-4 space-y-2 text-sm">
          <p className="text-xs text-muted-foreground">
            Estimated price (final price confirmed at checkout)
          </p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {previewQty || 1} × KES 150
            </span>
            <span>{formatKES(estimatedSubtotal)}</span>
          </div>
          {creditBalance > 0 && (
            <div className="flex justify-between text-teal-700">
              <span>Credit available</span>
              <span>-{formatKES(Math.min(creditBalance, estimatedSubtotal))}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Estimated Due</span>
            <span>{formatKES(estimatedAfterCredit)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            * Delivery fee added based on your location at checkout.
          </p>
        </CardContent>
      </Card>

      {serverError && (
        <p className="text-sm text-destructive">{serverError}</p>
      )}

      <Button type="submit" className="w-full" size="lg" disabled={isPending}>
        {isPending ? "Placing Order..." : "Place Order"}
      </Button>
    </form>
  );
}
