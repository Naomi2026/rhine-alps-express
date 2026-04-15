/**
 * app/(admin)/admin/customers/page.tsx
 *
 * Customer list with credit balance and loyalty progress.
 */

import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/session";
import { formatKES } from "@/lib/utils";
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
import { LOYALTY } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  await requireAdminSession();

  const customers = await db.customer.findMany({
    include: {
      user: true,
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const loyaltyTarget = LOYALTY.QUALIFYING_ORDERS_REQUIRED;

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Customers"
        description={`${customers.length} registered customer${customers.length !== 1 ? "s" : ""}`}
      />

      {customers.length === 0 ? (
        <EmptyState title="No customers yet" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Phone</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Orders</TableHead>
                    <TableHead className="text-xs">Credit</TableHead>
                    <TableHead className="text-xs">Loyalty</TableHead>
                    <TableHead className="text-xs" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => {
                    const progress = c.loyaltyCount % loyaltyTarget;
                    const hasReward = c.loyaltyCount > 0 && c.loyaltyCount % loyaltyTarget === 0;
                    return (
                      <TableRow key={c.id} className="hover:bg-muted/50">
                        <TableCell className="text-sm font-medium">{c.user.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.user.phone ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.user.email ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">{c._count.orders}</TableCell>
                        <TableCell className="text-sm font-medium text-teal-700">
                          {Number(c.creditBalance) > 0
                            ? formatKES(c.creditBalance)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {hasReward ? (
                            <span className="text-green-700 font-medium">🎉 Reward!</span>
                          ) : (
                            `${progress}/${loyaltyTarget}`
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/customers/${c.id}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
