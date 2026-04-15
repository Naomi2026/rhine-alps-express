/**
 * app/(customer)/dashboard/page.tsx
 *
 * Customer home: active order preview, loyalty progress, credit balance.
 */

import Link from "next/link";
import { requireCustomer } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatKES } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LOYALTY } from "@/lib/constants";
import { Droplets, Gift, Wallet, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardPage() {
  const user = await requireCustomer();

  const customer = await db.customer.findUnique({
    where: { userId: user.id },
    include: {
      orders: {
        where: {
          status: {
            notIn: ["COMPLETED", "CANCELLED"],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          slot: true,
          delivery: true,
        },
      },
    },
  });

  if (!customer) return null;

  const activeOrder = customer.orders[0] ?? null;
  const loyaltyCount = customer.loyaltyCount;
  const loyaltyTarget = LOYALTY.QUALIFYING_ORDERS_REQUIRED;
  const loyaltyRemaining = loyaltyTarget - (loyaltyCount % loyaltyTarget);
  const loyaltyPct = ((loyaltyCount % loyaltyTarget) / loyaltyTarget) * 100;
  const creditBalance = Number(customer.creditBalance);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hello, {user.name.split(" ")[0]}</h1>
        <p className="text-sm text-muted-foreground">Welcome to Rhine Alps Express</p>
      </div>

      {/* Place order CTA */}
      <Button asChild className="w-full" size="lg">
        <Link href="/customer/orders/new">
          <Droplets className="mr-2 h-4 w-4" />
          Order Water Now
        </Link>
      </Button>

      {/* Active order */}
      {activeOrder && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Order
              </CardTitle>
              <OrderStatusBadge status={activeOrder.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-mono text-xs text-muted-foreground">{activeOrder.orderRef}</p>
            <p className="text-sm">{activeOrder.deliveryAddress}</p>
            {activeOrder.slot && (
              <p className="text-xs text-muted-foreground">
                Slot: {activeOrder.slot.label}
              </p>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-semibold">
                {formatKES(activeOrder.amountDue)}
              </span>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/customer/orders/${activeOrder.id}`} className="flex items-center gap-1">
                  Track <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loyalty progress */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">Loyalty Reward</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {loyaltyCount % loyaltyTarget} / {loyaltyTarget} orders
            </span>
            <span className="font-medium">
              {loyaltyCount % loyaltyTarget === 0 && loyaltyCount > 0
                ? "🎉 Reward ready!"
                : `${loyaltyRemaining} to go`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${loyaltyPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Earn 1 free bottle after every {loyaltyTarget} completed orders.
          </p>
        </CardContent>
      </Card>

      {/* Credit balance */}
      {creditBalance > 0 && (
        <Card className="border-teal-200 bg-teal-50">
          <CardContent className="flex items-center gap-3 py-4">
            <Wallet className="h-5 w-5 text-teal-600" />
            <div>
              <p className="text-sm font-medium text-teal-800">
                You have {formatKES(creditBalance)} in credit
              </p>
              <p className="text-xs text-teal-600">
                Applied automatically to your next order.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent orders shortcut */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Recent Orders</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/customer/orders" className="flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
