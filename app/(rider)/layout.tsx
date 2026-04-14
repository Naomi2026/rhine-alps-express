/**
 * app/(rider)/layout.tsx
 *
 * Guards all /rider/* routes.
 * Dashboards and nav shell are added in Phase 3.
 */

import { requireRider } from "@/lib/auth/session";

export default async function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRider();

  return <>{children}</>;
}
