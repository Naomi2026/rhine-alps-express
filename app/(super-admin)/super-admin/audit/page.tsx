/**
 * app/(super-admin)/super-admin/audit/page.tsx
 *
 * Full audit log viewer with date filter.
 */

import { requireSuperAdminSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
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
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

interface SearchParams {
  from?: string;
  to?: string;
  action?: string;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireSuperAdminSession();
  const params = await searchParams;

  const where: Record<string, unknown> = {};
  if (params.from || params.to) {
    where.createdAt = {
      ...(params.from ? { gte: new Date(params.from) } : {}),
      ...(params.to ? { lte: new Date(`${params.to}T23:59:59`) } : {}),
    };
  }
  if (params.action) {
    where.action = { contains: params.action, mode: "insensitive" };
  }

  const entries = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: true },
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title="Audit Log"
        description={`${entries.length} entries`}
      />

      {/* Date filter form */}
      <form className="flex flex-wrap gap-3" method="GET">
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">From</label>
          <input
            type="date"
            name="from"
            defaultValue={params.from}
            className="rounded border border-input px-2 py-1 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">To</label>
          <input
            type="date"
            name="to"
            defaultValue={params.to}
            className="rounded border border-input px-2 py-1 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            name="action"
            placeholder="Filter by action..."
            defaultValue={params.action}
            className="rounded border border-input px-2 py-1 text-xs w-48"
          />
        </div>
        <Button type="submit" size="sm" variant="outline" className="text-xs">
          Filter
        </Button>
        <Button type="reset" size="sm" variant="ghost" className="text-xs" asChild>
          <Link href="/super-admin/audit">Clear</Link>
        </Button>
      </form>

      {entries.length === 0 ? (
        <EmptyState title="No audit entries found" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Time</TableHead>
                    <TableHead className="text-xs">Action</TableHead>
                    <TableHead className="text-xs">Entity</TableHead>
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs">Reason</TableHead>
                    <TableHead className="text-xs">Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-muted/50">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString("en-KE", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-xs font-medium font-mono">
                        {entry.action}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="text-muted-foreground">{entry.entityType}</span>
                        <span className="ml-1 font-mono text-xs">
                          {entry.entityId.slice(0, 8)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {entry.user?.name ?? <span className="text-muted-foreground">system</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {entry.reason ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {entry.note ?? "—"}
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
