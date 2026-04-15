/**
 * app/(auth)/login/login-form.tsx
 *
 * Client component: email-or-phone + password sign-in form.
 * Calls next-auth signIn("credentials") and redirects to the user's dashboard.
 * Handles locked accounts, bad credentials, and 3-attempt lockout (§4.5).
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidKenyanPhone } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier || !password) {
      setError("Enter your email or phone number and your password.");
      return;
    }
    setError("");

    // Determine whether the user typed an email or a phone number
    const isPhone = isValidKenyanPhone(identifier);
    const credentials = isPhone
      ? { phone: identifier, password }
      : { email: identifier, password };

    startTransition(async () => {
      const result = await signIn("credentials", {
        ...credentials,
        redirect: false,
      });

      if (!result?.ok || result.error) {
        setError(
          "Incorrect credentials or your account is locked. " +
            "Contact support if you need assistance."
        );
        return;
      }

      // Let the middleware resolve the correct role-based dashboard
      router.push("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="identifier">Email or Phone Number</Label>
        <Input
          id="identifier"
          type="text"
          placeholder="name@example.com or 0712 345 678"
          autoComplete="username"
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value);
            setError("");
          }}
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError("");
          }}
          disabled={isPending}
        />
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign In"}
      </Button>
    </form>
  );
}
