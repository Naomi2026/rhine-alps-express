/**
 * app/(rider)/rider/deliveries/[id]/page.tsx
 *
 * Delivery detail page: full order info, status update buttons, OTP entry.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRider } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatKES } from "@/lib/utils";
import {
  DeliveryStatusBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MapPin, Phone, Package, CreditCard, ChevronLeft } from "lucide-react";
import { DeliveryActions } from "./delivery-actions";

export const dynamic = "force-dynamic";

export default async function RiderDeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRider();

  const rider = await db.rider.findUnique({ where: { userId: user.id } });
  if (!rider) notFound();

  const delivery = await db.delivery.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          customer: { include: { user: true } },
          slot: true,
          items: true,
          payments: true,
          otp: true,
        },
      },
    },
  });

  if (!delivery || delivery.riderId !== rider.id) notFound();

  const { order } = delivery;
  const customer = order.customer.user;
  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/rider/dashboard" className="flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <PageHeader
        title={order.orderRef}
        description={`${totalQty} bottle${totalQty !== 1 ? "s" : ""}`}
      />

      {/* Status badges */}
      <div className="flex flex-wrap gap-2">
        <DeliveryStatusBadge status={delivery.status} />
        <OrderStatusBadge status={order.status} />
        <PaymentStatusBadge status={order.paymentStatus} />
      </div>

      {/* Customer */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Customer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{customer.name}</p>
              {customer.phone && (
                <p className="text-xs text-muted-foreground">{customer.phone}</p>
              )}
            </div>
            {customer.phone && (
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${customer.phone}`} className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Call
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4" />
            Delivery Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{order.deliveryAddress}</p>
          {order.deliveryLat && order.deliveryLng && (
            <Button variant="link" size="sm" asChild className="px-0 mt-1">
              <a
                href={`https://maps.google.com/?q=${order.deliveryLat},${order.deliveryLng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs"
              >
                Open in Maps
              </a>
            </Button>
          )}
          {order.slot && (
            <p className="text-xs text-muted-foreground mt-1">Slot: {order.slot.label}</p>
          )}
          {order.deliveryNotes && (
            <p className="text-xs text-muted-foreground mt-1">
              Note: {order.deliveryNotes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4" />
            Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.productName}
                {item.isExchange && (
                  <span className="ml-1 text-xs text-muted-foreground">(exchange)</span>
                )}
              </span>
              <span className="font-medium">×{item.quantity}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between text-sm font-semibold">
            <span>Amount Due</span>
            <span>{formatKES(order.amountDue)}</span>
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
        <CardContent className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Method</span>
            <span>{order.paymentMethod === "MPESA" ? "M-Pesa" : "Cash on Delivery"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
        </CardContent>
      </Card>

      {/* Delivery action controls */}
      <DeliveryActions
        deliveryId={delivery.id}
        orderId={order.id}
        currentStatus={delivery.status}
        paymentStatus={order.paymentStatus}
        paymentMethod={order.paymentMethod}
        amountDue={Number(order.amountDue)}
        otpUsed={order.otp?.isUsed ?? false}
        riderId={rider.id}
      />
    </div>
  );
}
