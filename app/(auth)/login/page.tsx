/**
 * app/(auth)/login/page.tsx
 *
 * Login page. Public route — middleware redirects authenticated users away.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign In — Rhine Alps Express" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl bg-card p-8 shadow-md">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Rhine Alps Express</h1>
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <LoginForm />

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  );
}
