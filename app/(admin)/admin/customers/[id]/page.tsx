/**
 * app/(admin)/admin/customers/[id]/page.tsx
 *
 * Customer detail: order history, credit ledger, loyalty status.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdminSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatKES } from "@/lib/utils";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, User, Wallet, Gift, ShoppingBag } from "lucide-react";
import { LOYALTY } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminSession();

  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      user: true,
      orders: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { slot: true },
      },
      creditTransactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!customer) notFound();

  const loyaltyTarget = LOYALTY.QUALIFYING_ORDERS_REQUIRED;
  const loyaltyProgress = customer.loyaltyCount % loyaltyTarget;

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/customers" className="flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" />
          Customers
        </Link>
      </Button>

      <PageHeader
        title={customer.user.name}
        description={`Customer since ${new Date(customer.createdAt).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {/* Contact */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>{customer.user.phone ?? <span className="text-muted-foreground">No phone</span>}</p>
            <p className="text-muted-foreground">{customer.user.email ?? "—"}</p>
            {customer.defaultAddress && (
              <p className="text-xs text-muted-foreground mt-1">{customer.defaultAddress}</p>
            )}
          </CardContent>
        </Card>

        {/* Credit */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" />
              Credit Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-teal-700">
              {formatKES(customer.creditBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Auto-applied to next order
            </p>
          </CardContent>
        </Card>

        {/* Loyalty */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Gift className="h-3.5 w-3.5" />
              Loyalty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{loyaltyProgress}/{loyaltyTarget}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Total qualifying: {customer.loyaltyCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Orders */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ShoppingBag className="h-4 w-4" />
            Order History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Ref</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Payment</TableHead>
                  <TableHead className="text-xs" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.orderRef}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("en-KE", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-sm">{formatKES(order.totalAmount)}</TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
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
          </div>
        </CardContent>
      </Card>

      {/* Credit ledger */}
      {customer.creditTransactions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Wallet className="h-4 w-4" />
              Credit Ledger
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {customer.creditTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-xs">
                <div>
                  <span className="capitalize">{tx.reason.toLowerCase().replace(/_/g, " ")}</span>
                  {tx.note && (
                    <span className="ml-2 text-muted-foreground">— {tx.note}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      Number(tx.amount) >= 0 ? "text-teal-700 font-medium" : "text-destructive"
                    }
                  >
                    {Number(tx.amount) >= 0 ? "+" : ""}
                    {formatKES(tx.amount)}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleDateString("en-KE")}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
