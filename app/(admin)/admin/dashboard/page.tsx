/**
 * app/(admin)/admin/dashboard/page.tsx
 *
 * Admin overview: order stats, unpaid order alerts, recent orders.
 */

import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/session";
import { formatKES } from "@/lib/utils";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdminSession();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalOrders,
    activeOrders,
    completedToday,
    unpaidOrders,
    recentOrders,
    todayRevenue,
  ] = await Promise.all([
    db.order.count(),
    db.order.count({
      where: {
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
    }),
    db.order.count({
      where: { status: "COMPLETED", updatedAt: { gte: today } },
    }),
    db.order.findMany({
      where: {
        paymentStatus: { in: ["UNPAID", "PENDING_VERIFICATION", "PARTIALLY_PAID"] },
        status: { notIn: ["CANCELLED"] },
      },
      include: {
        customer: { include: { user: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        customer: { include: { user: true } },
        delivery: true,
      },
    }),
    db.order.aggregate({
      where: {
        status: "COMPLETED",
        updatedAt: { gte: today },
      },
      _sum: { totalAmount: true },
    }),
  ]);

  const revenue = Number(todayRevenue._sum.totalAmount ?? 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader title="Dashboard" description="Operational overview" />

      {/* Unpaid alert */}
      {unpaidOrders.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {unpaidOrders.length} unpaid order{unpaidOrders.length !== 1 ? "s" : ""} require
            attention.{" "}
            <Link href="/admin/orders?payment=unpaid" className="font-medium underline">
              View all
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{activeOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completed Today
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{completedToday}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Today&apos;s Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{formatKES(revenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Unpaid orders list */}
      {unpaidOrders.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium">Unpaid Orders</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/orders?payment=unpaid" className="flex items-center gap-1">
                All <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Ref</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {unpaidOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.orderRef}</TableCell>
                    <TableCell className="text-sm">{order.customer.user.name}</TableCell>
                    <TableCell className="text-sm">{formatKES(order.amountDue)}</TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={order.paymentStatus} />
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
          </CardContent>
        </Card>
      )}

      {/* Recent orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-medium">Recent Orders</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/orders" className="flex items-center gap-1">
              All orders <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Ref</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Amount</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">{order.orderRef}</TableCell>
                  <TableCell className="text-sm">{order.customer.user.name}</TableCell>
                  <TableCell className="text-sm">{formatKES(order.totalAmount)}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
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
        </CardContent>
      </Card>
    </div>
  );
}
