/**
 * app/(admin)/admin/orders/page.tsx
 *
 * Filterable orders table for admin.
 */

import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/session";
import { formatKES } from "@/lib/utils";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { OrderStatus, PaymentStatus } from "@prisma/client";
import { OrderFilters } from "./order-filters";

export const dynamic = "force-dynamic";

interface SearchParams {
  status?: string;
  payment?: string;
  search?: string;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminSession();
  const params = await searchParams;

  const where: Record<string, unknown> = {};

  if (params.status && params.status !== "all") {
    where.status = params.status.toUpperCase() as OrderStatus;
  }
  if (params.payment && params.payment !== "all") {
    if (params.payment === "unpaid") {
      where.paymentStatus = { in: ["UNPAID", "PENDING_VERIFICATION", "PARTIALLY_PAID"] };
    } else {
      where.paymentStatus = params.payment.toUpperCase() as PaymentStatus;
    }
  }
  if (params.search) {
    where.OR = [
      { orderRef: { contains: params.search, mode: "insensitive" } },
      { customer: { user: { name: { contains: params.search, mode: "insensitive" } } } },
      { deliveryAddress: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      customer: { include: { user: true } },
      delivery: { include: { rider: { include: { user: true } } } },
      slot: true,
    },
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title="Orders"
        description={`${orders.length} order${orders.length !== 1 ? "s" : ""}`}
      />

      <OrderFilters
        currentStatus={params.status ?? "all"}
        currentPayment={params.payment ?? "all"}
        currentSearch={params.search ?? ""}
      />

      {orders.length === 0 ? (
        <EmptyState title="No orders found" description="Try adjusting the filters." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Ref</TableHead>
                    <TableHead className="text-xs">Customer</TableHead>
                    <TableHead className="text-xs">Address</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Payment</TableHead>
                    <TableHead className="text-xs">Rider</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-xs">{order.orderRef}</TableCell>
                      <TableCell className="text-sm">{order.customer.user.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                        {order.deliveryAddress}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatKES(order.amountDue)}
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={order.paymentStatus} />
                      </TableCell>
                      <TableCell className="text-xs">
                        {order.delivery?.rider?.user.name ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString("en-KE", {
                          day: "numeric",
                          month: "short",
                        })}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/orders/${order.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
