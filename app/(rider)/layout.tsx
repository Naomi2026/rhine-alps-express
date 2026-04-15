/**
 * app/(rider)/layout.tsx
 */

import { requireRider } from "@/lib/auth/session";
import { RiderNav } from "@/components/nav/rider-nav";

export default async function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRider();

  return (
    <div className="min-h-screen bg-background">
      <RiderNav name={user.name} />
      <main className="mx-auto max-w-2xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
