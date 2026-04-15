/**
 * app/(auth)/register/register-form.tsx
 *
 * Client component: customer registration form.
 *
 * Business rules enforced:
 *   §4.1 — initial delivery location is mandatory
 *   §4.3 — at least one valid contact method (email or phone)
 *   §4.2 — saved address becomes the default for future orders
 *
 * Flow: POST /api/auth/register → signIn("credentials") → redirect to dashboard
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const schema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z
      .string()
      .email("Enter a valid email address")
      .optional()
      .or(z.literal("")),
    phone: z
      .string()
      .regex(
        /^(?:\+254|0)?[17]\d{8}$/,
        "Enter a valid Kenyan phone number (e.g. 0712 345 678)"
      )
      .optional()
      .or(z.literal("")),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    deliveryAddress: z
      .string()
      .min(5, "Enter your delivery address (at least 5 characters)"),
  })
  .refine((d) => d.email || d.phone, {
    message: "Provide at least one: email address or phone number",
    path: ["email"],
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      deliveryAddress: "",
    },
  });

  function onSubmit(data: FormValues) {
    setServerError("");
    startTransition(async () => {
      // Step 1: Create the account
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        // Surface field errors from the API if present
        if (json.fieldErrors) {
          const firstError = Object.values(json.fieldErrors as Record<string, string[]>)
            .flat()[0];
          setServerError(firstError ?? json.error ?? "Registration failed.");
        } else {
          setServerError(json.error ?? "Registration failed. Please try again.");
        }
        return;
      }

      // Step 2: Auto sign-in with the new credentials
      const isPhone = data.phone && !data.email;
      const signInResult = await signIn("credentials", {
        ...(isPhone
          ? { phone: data.phone }
          : { email: data.email }),
        password: data.password,
        redirect: false,
      });

      if (!signInResult?.ok) {
        // Account was created but auto-sign-in failed — send to login
        router.push("/login");
        return;
      }

      // Step 3: Redirect to dashboard (middleware resolves role-based path)
      router.push("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          placeholder="Jane Kamau"
          autoComplete="name"
          disabled={isPending}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email">
          Email Address{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (email or phone required)
          </span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="name@example.com"
          autoComplete="email"
          disabled={isPending}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="0712 345 678"
          autoComplete="tel"
          disabled={isPending}
          {...register("phone")}
        />
        {errors.phone && (
          <p className="text-xs text-destructive">{errors.phone.message}</p>
        )}
      </div>

      {/* Delivery address — mandatory (§4.1) */}
      <div className="space-y-1.5">
        <Label htmlFor="deliveryAddress">
          Delivery Address{" "}
          <span className="text-xs font-normal text-muted-foreground">(required)</span>
        </Label>
        <Textarea
          id="deliveryAddress"
          placeholder="e.g. House 14, Kiambu Road, Ruaka"
          rows={2}
          disabled={isPending}
          {...register("deliveryAddress")}
        />
        {errors.deliveryAddress && (
          <p className="text-xs text-destructive">{errors.deliveryAddress.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="Min. 8 characters"
          autoComplete="new-password"
          disabled={isPending}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {/* Confirm password */}
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Repeat your password"
          autoComplete="new-password"
          disabled={isPending}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>

      {serverError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating account…" : "Create Account"}
      </Button>
    </form>
  );
}
