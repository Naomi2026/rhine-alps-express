/**
 * app/(admin)/admin/riders/page.tsx
 *
 * Rider list with online status and delivery counts.
 */

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function AdminRidersPage() {
  await requireAdminSession();

  const riders = await db.rider.findMany({
    include: {
      user: true,
      _count: {
        select: {
          deliveries: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const activeDeliveries = await db.delivery.groupBy({
    by: ["riderId"],
    where: {
      riderId: { not: null },
      status: { notIn: ["DELIVERED", "FAILED", "RETURNED"] },
    },
    _count: { riderId: true },
  });

  const activeMap = Object.fromEntries(
    activeDeliveries.map((d) => [d.riderId, d._count.riderId])
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Riders"
        description={`${riders.length} rider${riders.length !== 1 ? "s" : ""}`}
      />

      {riders.length === 0 ? (
        <EmptyState title="No riders yet" description="Riders are created by Super Admin." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Phone</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Active Deliveries</TableHead>
                  <TableHead className="text-xs">Total Deliveries</TableHead>
                  <TableHead className="text-xs">Account</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riders.map((rider) => {
                  const active = activeMap[rider.id] ?? 0;
                  return (
                    <TableRow key={rider.id}>
                      <TableCell className="text-sm font-medium">{rider.user.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {rider.user.phone ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            rider.isOnline
                              ? "text-green-700"
                              : "text-muted-foreground"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              rider.isOnline ? "bg-green-500" : "bg-slate-300"
                            }`}
                          />
                          {rider.isOnline ? "Online" : "Offline"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{active}</TableCell>
                      <TableCell className="text-sm">{rider._count.deliveries}</TableCell>
                      <TableCell>
                        <span
                          className={`text-xs ${
                            rider.user.isActive ? "text-green-700" : "text-destructive"
                          }`}
                        >
                          {rider.user.isActive ? "Active" : "Suspended"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
