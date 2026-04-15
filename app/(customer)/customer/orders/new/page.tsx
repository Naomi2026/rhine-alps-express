/**
 * app/(customer)/orders/new/page.tsx
 *
 * Place a new order. Fetches available slots and customer default address,
 * computes pricing preview live via the pricing engine, then submits.
 */

import { requireCustomer } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { PlaceOrderForm } from "./place-order-form";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const user = await requireCustomer();

  const [customer, slots] = await Promise.all([
    db.customer.findUnique({
      where: { userId: user.id },
      include: { user: true },
    }),
    db.deliverySlot.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Order"
        description="Order fresh 20L water delivered to your door."
      />
      <PlaceOrderForm
        defaultAddress={customer?.defaultAddress ?? ""}
        defaultLat={customer?.defaultLat ?? undefined}
        defaultLng={customer?.defaultLng ?? undefined}
        creditBalance={Number(customer?.creditBalance ?? 0)}
        loyaltyCount={customer?.loyaltyCount ?? 0}
        slots={slots.map((s) => ({
          id: s.id,
          label: s.label,
          startTime: s.startTime,
          endTime: s.endTime,
        }))}
      />
    </div>
  );
}
