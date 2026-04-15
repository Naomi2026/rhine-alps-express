/**
 * app/(super-admin)/layout.tsx
 *
 * Guards all /super-admin/* routes. Only SUPER_ADMIN role is permitted.
 */

import { requireSuperAdminSession } from "@/lib/auth/session";
import { SuperAdminNav } from "@/components/nav/super-admin-nav";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSuperAdminSession();

  return (
    <div className="min-h-screen bg-background">
      <SuperAdminNav name={user.name} />
      <div className="md:pl-56">
        <main className="px-4 py-6 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
