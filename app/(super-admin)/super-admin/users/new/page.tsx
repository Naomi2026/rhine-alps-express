/**
 * app/(super-admin)/super-admin/users/new/page.tsx
 *
 * Create a new admin or rider account (Super Admin only).
 */

import { requireSuperAdminSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CreateUserForm } from "./create-user-form";

export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  const user = await requireSuperAdminSession();

  return (
    <div className="space-y-6 max-w-lg">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/super-admin/users" className="flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" />
          Users
        </Link>
      </Button>
      <PageHeader
        title="Create User"
        description="Add a new admin or rider account to the system."
      />
      <CreateUserForm createdById={user.id} />
    </div>
  );
}
