/**
 * app/(customer)/layout.tsx
 *
 * Guards all customer routes and injects the customer nav shell.
 */

import { requireCustomer } from "@/lib/auth/session";
import { CustomerNav } from "@/components/nav/customer-nav";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireCustomer();

  return (
    <div className="min-h-screen bg-background">
      <CustomerNav name={user.name} />
      <main className="mx-auto max-w-2xl px-4 pt-6 pb-24 md:pb-8">
        {children}
      </main>
    </div>
  );
}
