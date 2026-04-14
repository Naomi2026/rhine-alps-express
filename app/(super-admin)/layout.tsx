/**
 * app/(super-admin)/layout.tsx
 *
 * Guards all /super-admin/* routes.
 * Only SUPER_ADMIN role is permitted.
 * Dashboards and nav shell are added in Phase 3.
 */

import { requireSuperAdminSession } from "@/lib/auth/session";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdminSession();

  return <>{children}</>;
}
