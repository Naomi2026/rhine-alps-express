/**
 * app/(super-admin)/super-admin/dashboard/page.tsx
 *
 * Super admin overview: user counts, locked accounts, pending password-reset
 * requests, and system health summary.
 */

import Link from "next/link";
import { requireSuperAdminSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
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
import { Users, ShieldAlert, ArrowRight, UserPlus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SuperAdminDashboardPage() {
  await requireSuperAdminSession();

  const [
    totalUsers,
    totalAdmins,
    totalRiders,
    totalCustomers,
    lockedUsers,
    recentAudit,
  ] = await Promise.all([
    db.user.count({ where: { isActive: true } }),
    db.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true } }),
    db.user.count({ where: { role: "RIDER", isActive: true } }),
    db.user.count({ where: { role: "CUSTOMER", isActive: true } }),
    db.user.findMany({
      where: { isLocked: true },
      select: { id: true, name: true, email: true, phone: true, role: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: true },
    }),
  ]);

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Super Admin"
        description="System overview and protected controls"
        action={
          <Button asChild size="sm">
            <Link href="/super-admin/users/new" className="flex items-center gap-1.5">
              <UserPlus className="h-4 w-4" />
              New User
            </Link>
          </Button>
        }
      />

      {/* Locked accounts alert */}
      {lockedUsers.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <ShieldAlert className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {lockedUsers.length} account{lockedUsers.length !== 1 ? "s" : ""} are locked due to
            failed login attempts.{" "}
            <Link href="/super-admin/users" className="font-medium underline">
              Review
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total Users", value: totalUsers, icon: Users },
          { label: "Admins", value: totalAdmins, icon: ShieldAlert },
          { label: "Riders", value: totalRiders, icon: Users },
          { label: "Customers", value: totalCustomers, icon: Users },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Locked accounts */}
      {lockedUsers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Locked Accounts</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs">Contact</TableHead>
                  <TableHead className="text-xs" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lockedUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="text-sm font-medium">{u.name}</TableCell>
                    <TableCell className="text-xs capitalize">
                      {u.role.toLowerCase().replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.phone ?? u.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/super-admin/users`}>Unlock</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent audit entries */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-medium">Recent Audit Activity</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/super-admin/audit" className="flex items-center gap-1">
              Full log <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentAudit.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between text-xs gap-4">
              <div className="min-w-0">
                <span className="font-medium">{entry.action}</span>
                {entry.user && (
                  <span className="ml-2 text-muted-foreground">by {entry.user.name}</span>
                )}
                {entry.note && (
                  <span className="ml-2 text-muted-foreground truncate">— {entry.note}</span>
                )}
              </div>
              <span className="shrink-0 text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString("en-KE", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
