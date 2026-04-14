/**
 * app/(customer)/layout.tsx
 *
 * Guards all /customer/* routes.
 * Middleware is the first layer; this is the server-component second layer.
 * Dashboards and nav shell are added in Phase 3.
 */

import { requireCustomer } from "@/lib/auth/session";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Throws + redirects if unauthenticated or wrong role
  await requireCustomer();

  return <>{children}</>;
}
