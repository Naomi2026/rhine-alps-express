/**
 * app/(admin)/layout.tsx
 *
 * Guards all /admin/* routes.
 * Both ADMIN and SUPER_ADMIN roles are permitted here.
 * Dashboards and nav shell are added in Phase 3.
 */

import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return <>{children}</>;
}
