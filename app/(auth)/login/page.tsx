/**
 * app/(auth)/login/page.tsx
 *
 * Login page stub.
 * Route is public — middleware redirects authenticated users away.
 * Full form implementation is built in Phase 3.
 */

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign In" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-card p-8 shadow-md">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Rhine Alps Express</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>
        {/* Form component added in Phase 3 */}
        <p className="text-center text-xs text-muted-foreground">
          Phase 1 scaffold — form coming in Phase 3
        </p>
      </div>
    </main>
  );
}
