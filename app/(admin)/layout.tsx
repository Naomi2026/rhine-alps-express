/**
 * app/(admin)/layout.tsx
 *
 * Guards all /admin/* routes. Both ADMIN and SUPER_ADMIN roles are permitted.
 */

import { requireAdminSession } from "@/lib/auth/session";
import { AdminNav } from "@/components/nav/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAdminSession();

  return (
    <div className="min-h-screen bg-background">
      <AdminNav name={user.name} role={user.role} />
      {/* Offset for desktop sidebar */}
      <div className="md:pl-56">
        <main className="px-4 py-6 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
