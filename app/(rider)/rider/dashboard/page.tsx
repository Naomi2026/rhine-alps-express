/**
 * app/(rider)/rider/dashboard/page.tsx
 *
 * Rider's delivery queue: shows today's assigned deliveries in order status.
 */

import Link from "next/link";
import { requireRider } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatKES } from "@/lib/utils";
import { DeliveryStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, ArrowRight, CheckCircle2, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RiderDashboardPage() {
  const user = await requireRider();

  const rider = await db.rider.findUnique({ where: { userId: user.id } });
  if (!rider) return null;

  const deliveries = await db.delivery.findMany({
    where: {
      riderId: rider.id,
      status: {
        notIn: ["DELIVERED", "FAILED", "RETURNED"],
      },
    },
    include: {
      order: {
        include: {
          customer: { include: { user: true } },
          slot: true,
          items: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const completedToday = await db.delivery.count({
    where: {
      riderId: rider.id,
      status: "DELIVERED",
      deliveredAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Deliveries"
        description={`${deliveries.length} active · ${completedToday} completed today`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="flex flex-col items-center py-4">
            <Clock className="h-5 w-5 text-primary mb-1" />
            <p className="text-2xl font-bold">{deliveries.length}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center py-4">
            <CheckCircle2 className="h-5 w-5 text-green-600 mb-1" />
            <p className="text-2xl font-bold">{completedToday}</p>
            <p className="text-xs text-muted-foreground">Done Today</p>
          </CardContent>
        </Card>
      </div>

      {deliveries.length === 0 ? (
        <EmptyState
          title="No active deliveries"
          description="Check back when orders are assigned to you."
        />
      ) : (
        <div className="space-y-3">
          {deliveries.map(({ id, status, order }) => {
            const customer = order.customer.user;
            const totalQty = order.items.reduce((sum, i) => sum + i.quantity, 0);
            return (
              <Card key={id} className="hover:border-primary/30 transition-colors">
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-muted-foreground">{order.orderRef}</p>
                      <p className="font-medium text-sm">{customer.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{order.deliveryAddress}</span>
                      </div>
                    </div>
                    <DeliveryStatusBadge status={status} />
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{totalQty} bottle{totalQty !== 1 ? "s" : ""}</span>
                    {order.slot && <span>Slot: {order.slot.label}</span>}
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {customer.phone && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`tel:${customer.phone}`} className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            Call
                          </a>
                        </Button>
                      )}
                    </div>
                    <Button size="sm" asChild>
                      <Link href={`/rider/deliveries/${id}`} className="flex items-center gap-1">
                        Open <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
