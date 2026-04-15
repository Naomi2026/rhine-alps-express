/**
 * app/(admin)/admin/orders/order-filters.tsx
 *
 * Client-side filter controls that push URL search params.
 */

"use client";

import { useRouter, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTransition } from "react";

interface Props {
  currentStatus: string;
  currentPayment: string;
  currentSearch: string;
}

const ORDER_STATUSES = [
  { value: "all", label: "All statuses" },
  { value: "placed", label: "Placed" },
  { value: "awaiting_payment", label: "Awaiting Payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready_for_dispatch", label: "Ready for Dispatch" },
  { value: "assigned_to_rider", label: "Assigned to Rider" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
  { value: "failed_delivery", label: "Failed Delivery" },
  { value: "cancelled", label: "Cancelled" },
  { value: "on_hold", label: "On Hold" },
];

const PAYMENT_FILTERS = [
  { value: "all", label: "All payments" },
  { value: "unpaid", label: "Unpaid / Pending" },
  { value: "paid", label: "Paid" },
  { value: "partially_paid", label: "Partially Paid" },
  { value: "credit_applied", label: "Credit Applied" },
];

export function OrderFilters({ currentStatus, currentPayment, currentSearch }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  function update(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Search by ref, customer, or address..."
        defaultValue={currentSearch}
        className="max-w-xs text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            update("search", (e.target as HTMLInputElement).value);
          }
        }}
        onChange={(e) => {
          if (!e.target.value) update("search", "");
        }}
      />
      <Select value={currentStatus} onValueChange={(v) => update("status", v)}>
        <SelectTrigger className="w-44 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ORDER_STATUSES.map(({ value, label }) => (
            <SelectItem key={value} value={value} className="text-sm">
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={currentPayment} onValueChange={(v) => update("payment", v)}>
        <SelectTrigger className="w-44 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAYMENT_FILTERS.map(({ value, label }) => (
            <SelectItem key={value} value={value} className="text-sm">
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
