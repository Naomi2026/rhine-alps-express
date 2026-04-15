/**
 * app/(customer)/orders/page.tsx
 *
 * Order history list for the logged-in customer.
 */

import Link from "next/link";
import { requireCustomer } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatKES } from "@/lib/utils";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomerOrdersPage() {
  const user = await requireCustomer();

  const customer = await db.customer.findUnique({
    where: { userId: user.id },
  });

  const orders = customer
    ? await db.order.findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: "desc" },
        include: { slot: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Orders"
        description={`${orders.length} order${orders.length !== 1 ? "s" : ""} total`}
        action={
          <Button asChild size="sm">
            <Link href="/customer/orders/new">New Order</Link>
          </Button>
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Place your first order to get started."
          action={
            <Button asChild size="sm">
              <Link href="/customer/orders/new">Order Water</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-mono text-xs text-muted-foreground">{order.orderRef}</p>
                    <p className="truncate text-sm">{order.deliveryAddress}</p>
                    {order.slot && (
                      <p className="text-xs text-muted-foreground">{order.slot.label}</p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <OrderStatusBadge status={order.status} />
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-sm font-semibold">{formatKES(order.amountDue)}</p>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/customer/orders/${order.id}`} className="flex items-center gap-1">
                        View <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
