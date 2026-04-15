/**
 * app/(admin)/admin/orders/[id]/page.tsx
 *
 * Full order detail for admin: status controls, rider assignment,
 * payment verification, and protected overrides.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdminSession } from "@/lib/auth/session";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, MapPin, Package, CreditCard, Truck, FileText } from "lucide-react";
import { AdminOrderActions } from "./admin-order-actions";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAdminSession();

  const [order, riders] = await Promise.all([
    db.order.findUnique({
      where: { id },
      include: {
        customer: { include: { user: true } },
        slot: true,
        items: true,
        delivery: {
          include: {
            rider: { include: { user: true } },
            attempts: { orderBy: { attemptedAt: "desc" } },
          },
        },
        payments: { orderBy: { createdAt: "desc" } },
        otp: true,
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { user: true },
        },
      },
    }),
    db.rider.findMany({
      include: { user: true },
      where: { user: { isActive: true } },
    }),
  ]);

  if (!order) notFound();

  const customerUser = order.customer.user;
  const rider = order.delivery?.rider ?? null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/orders" className="flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" />
            Orders
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={order.orderRef}
          description={`Created ${new Date(order.createdAt).toLocaleString("en-KE")}`}
        />
        {order.isProvisionalPrice && (
          <span className="self-start rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
            Provisional Pricing
          </span>
        )}
      </div>

      {/* Status row */}
      <div className="flex flex-wrap gap-2">
        <OrderStatusBadge status={order.status} />
        <PaymentStatusBadge status={order.paymentStatus} />
        <PricingBandBadge band={order.pricingBand} />
        {order.delivery && <DeliveryStatusBadge status={order.delivery.status} />}
        {order.isAdminConfirmed && (
          <span className="inline-flex items-center rounded-full border border-green-300 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
            Admin Confirmed
          </span>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{customerUser.name}</p>
            {customerUser.phone && (
              <p className="text-muted-foreground">{customerUser.phone}</p>
            )}
            {customerUser.email && (
              <p className="text-muted-foreground">{customerUser.email}</p>
            )}
            <Button variant="link" size="sm" asChild className="px-0 h-auto">
              <Link href={`/admin/customers/${order.customer.id}`}>
                View customer profile
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Delivery location */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="h-4 w-4" />
              Delivery Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{order.deliveryAddress}</p>
            {order.distanceKm && (
              <p className="text-muted-foreground">{order.distanceKm.toFixed(1)} km from dispatch</p>
            )}
            {order.slot && (
              <p className="text-muted-foreground">Slot: {order.slot.label}</p>
            )}
            {order.deliveryDate && (
              <p className="text-muted-foreground">
                Date:{" "}
                {new Date(order.deliveryDate).toLocaleDateString("en-KE", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}
            {order.deliveryNotes && (
              <p className="text-muted-foreground italic">{order.deliveryNotes}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items & pricing */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Package className="h-4 w-4" />
            Items & Pricing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>
                {item.productName}{" "}
                {item.isExchange && (
                  <span className="text-xs text-muted-foreground">(exchange)</span>
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
              <span>Total</span>
              <span>{formatKES(order.totalAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Amount Due</span>
              <span>{formatKES(order.amountDue)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments */}
      {order.payments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CreditCard className="h-4 w-4" />
              Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Method</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">M-Pesa Code</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs">
                      {p.method === "MPESA" ? "M-Pesa" : "Cash"}
                    </TableCell>
                    <TableCell className="text-sm">{formatKES(p.amount)}</TableCell>
                    <TableCell className="font-mono text-xs">{p.mpesaCode ?? "—"}</TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString("en-KE")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Rider */}
      {rider && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Truck className="h-4 w-4" />
              Assigned Rider
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">{rider.user.name}</p>
            {rider.user.phone && (
              <p className="text-muted-foreground">{rider.user.phone}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Admin actions */}
      <AdminOrderActions
        orderId={order.id}
        orderStatus={order.status}
        paymentStatus={order.paymentStatus}
        paymentMethod={order.paymentMethod}
        isAdminConfirmed={order.isAdminConfirmed}
        deliveryStatus={order.delivery?.status ?? null}
        deliveryId={order.delivery?.id ?? null}
        currentRiderId={order.delivery?.riderId ?? null}
        pricingBand={order.pricingBand}
        otpUsed={order.otp?.isUsed ?? false}
        actingUserId={user.id}
        actingUserRole={user.role}
        riders={riders.map((r) => ({ id: r.id, name: r.user.name }))}
      />

      {/* Audit log */}
      {order.auditLogs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" />
              Audit Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {order.auditLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between gap-4 text-xs">
                  <div>
                    <span className="font-medium">{log.action}</span>
                    {log.note && (
                      <span className="ml-2 text-muted-foreground">— {log.note}</span>
                    )}
                    {log.user && (
                      <span className="ml-2 text-muted-foreground">by {log.user.name}</span>
                    )}
                  </div>
                  <span className="shrink-0 text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString("en-KE", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
