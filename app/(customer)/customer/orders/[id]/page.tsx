/**
 * app/(customer)/orders/[id]/page.tsx
 *
 * Order detail page for a customer: status timeline, pricing breakdown,
 * rider info, payment info, and cancel action.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { requireCustomer } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatKES } from "@/lib/utils";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
  DeliveryStatusBadge,
  PricingBandBadge,
} from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Truck, Package, CreditCard, ChevronLeft } from "lucide-react";
import { CancelOrderButton } from "./cancel-button";

export const dynamic = "force-dynamic";

export default async function CustomerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireCustomer();

  const customer = await db.customer.findUnique({ where: { userId: user.id } });
  if (!customer) notFound();

  const order = await db.order.findUnique({
    where: { id },
    include: {
      slot: true,
      items: true,
      delivery: {
        include: {
          rider: { include: { user: true } },
        },
      },
      payments: true,
      otp: true,
    },
  });

  if (!order || order.customerId !== customer.id) notFound();

  const canCancel =
    order.status === "PLACED" ||
    order.status === "AWAITING_PAYMENT" ||
    order.status === "CONFIRMED" ||
    order.status === "PREPARING";

  const rider = order.delivery?.rider ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/customer/orders" className="flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Orders
          </Link>
        </Button>
      </div>

      <PageHeader
        title={order.orderRef}
        description={`Placed ${new Date(order.createdAt).toLocaleDateString("en-KE", {
          day: "numeric", month: "long", year: "numeric",
        })}`}
      />

      {/* Status row */}
      <div className="flex flex-wrap gap-2">
        <OrderStatusBadge status={order.status} />
        <PaymentStatusBadge status={order.paymentStatus} />
        <PricingBandBadge band={order.pricingBand} />
        {order.delivery && <DeliveryStatusBadge status={order.delivery.status} />}
      </div>

      {/* Delivery location */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4" />
            Delivery Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{order.deliveryAddress}</p>
          {order.slot && (
            <p className="mt-1 text-xs text-muted-foreground">
              Slot: {order.slot.label}
            </p>
          )}
          {order.deliveryDate && (
            <p className="text-xs text-muted-foreground">
              Date:{" "}
              {new Date(order.deliveryDate).toLocaleDateString("en-KE", {
                weekday: "short", day: "numeric", month: "short",
              })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Order items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4" />
            Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span>
                {item.productName}
                {item.isExchange && (
                  <span className="ml-1 text-xs text-muted-foreground">(exchange)</span>
                )}
              </span>
              <span>
                {item.quantity} × {formatKES(item.unitPrice)} = {formatKES(item.lineTotal)}
              </span>
            </div>
          ))}
          <Separator />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatKES(order.subtotal)}</span>
            </div>
            {Number(order.deliveryFee) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery fee</span>
                <span>{formatKES(order.deliveryFee)}</span>
              </div>
            )}
            {Number(order.creditApplied) > 0 && (
              <div className="flex justify-between text-teal-700">
                <span>Credit applied</span>
                <span>-{formatKES(order.creditApplied)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Amount Due</span>
              <span>{formatKES(order.amountDue)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CreditCard className="h-4 w-4" />
            Payment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Method</span>
            <span>
              {order.paymentMethod === "MPESA" ? "M-Pesa" : "Cash on Delivery"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
          {order.payments.length > 0 && (
            <div className="mt-2 space-y-1">
              {order.payments.map((p) => (
                <div key={p.id} className="flex justify-between text-xs text-muted-foreground">
                  <span>{p.mpesaCode ?? (p.method === "CASH_ON_DELIVERY" ? "Cash" : "—")}</span>
                  <span>{formatKES(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rider info */}
      {rider && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Truck className="h-4 w-4" />
              Your Rider
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{rider.user.name}</p>
              {rider.user.phone && (
                <p className="text-xs text-muted-foreground">{rider.user.phone}</p>
              )}
            </div>
            {rider.user.phone && (
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${rider.user.phone}`} className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Call
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* OTP note */}
      {order.otp && !order.otp.isUsed && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">Delivery OTP Required</p>
          <p className="mt-1 text-xs text-amber-700">
            Your rider will ask for your delivery code when they arrive. Keep it ready.
          </p>
        </div>
      )}

      {/* Cancel */}
      {canCancel && <CancelOrderButton orderId={order.id} />}
    </div>
  );
}
