/**
 * app/(super-admin)/super-admin/users/page.tsx
 *
 * All system users across roles. Super admin can unlock accounts here.
 */

import Link from "next/link";
import { requireSuperAdminSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
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
import { UserPlus } from "lucide-react";
import { UnlockUserButton } from "./unlock-button";

export const dynamic = "force-dynamic";

export default async function SuperAdminUsersPage() {
  await requireSuperAdminSession();

  const users = await db.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN", "RIDER"] } },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="System Users"
        description="Admins, super admins, and riders"
        action={
          <Button asChild size="sm">
            <Link href="/super-admin/users/new" className="flex items-center gap-1.5">
              <UserPlus className="h-4 w-4" />
              New User
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Phone</TableHead>
                  <TableHead className="text-xs">Account</TableHead>
                  <TableHead className="text-xs">Failed Logins</TableHead>
                  <TableHead className="text-xs" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className={u.isLocked ? "bg-red-50/40" : ""}>
                    <TableCell className="text-sm font-medium">{u.name}</TableCell>
                    <TableCell>
                      <span className="text-xs capitalize rounded border px-1.5 py-0.5 text-muted-foreground">
                        {u.role.toLowerCase().replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.phone ?? "—"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium ${
                          u.isLocked
                            ? "text-destructive"
                            : u.isActive
                            ? "text-green-700"
                            : "text-muted-foreground"
                        }`}
                      >
                        {u.isLocked ? "Locked" : u.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{u.failedLogins}</TableCell>
                    <TableCell>
                      {u.isLocked && <UnlockUserButton userId={u.id} />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
