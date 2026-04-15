/**
 * app/(super-admin)/super-admin/users/new/create-user-form.tsx
 *
 * Form to create a new admin or rider account (§17.1).
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^(?:\+254|0)?[17]\d{8}$/, "Enter a valid Kenyan phone number")
    .optional()
    .or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "RIDER"]),
}).refine((d) => d.email || d.phone, {
  message: "Provide at least one contact: email or phone",
  path: ["email"],
});

type FormValues = z.infer<typeof schema>;

export function CreateUserForm({ createdById }: { createdById: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", password: "", role: "ADMIN" },
  });

  const { register, handleSubmit, setValue, formState: { errors } } = form;

  function onSubmit(data: FormValues) {
    setServerError("");
    startTransition(async () => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, createdById }),
      });
      if (res.ok) {
        router.push("/super-admin/users");
      } else {
        const json = await res.json().catch(() => ({}));
        setServerError(json.error ?? "Failed to create user.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role">Role</Label>
        <Select defaultValue="ADMIN" onValueChange={(v) => setValue("role", v as "ADMIN" | "RIDER")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="RIDER">Rider</SelectItem>
          </SelectContent>
        </Select>
        {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" type="tel" placeholder="07XX XXX XXX" {...register("phone")} />
        {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Temporary Password</Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        <p className="text-xs text-muted-foreground">
          Share this with the user. They should change it on first login.
        </p>
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating..." : "Create Account"}
      </Button>
    </form>
  );
}
