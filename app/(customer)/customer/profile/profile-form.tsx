/**
 * app/(customer)/profile/profile-form.tsx
 *
 * Client component to update name, phone, and saved address.
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  userId: string;
  name: string;
  email: string;
  phone: string;
  defaultAddress: string;
}

export function ProfileForm({ userId, name, email, phone, defaultAddress }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fields, setFields] = useState({ name, phone, defaultAddress });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFields((f) => ({ ...f, [e.target.name]: e.target.value }));
    setSuccess(false);
    setError("");
  }

  function handleSave() {
    setError("");
    setSuccess(false);
    startTransition(async () => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        setSuccess(true);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          name="name"
          value={fields.name}
          onChange={handleChange}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          disabled
          className="bg-muted/50"
        />
        <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="0712 345 678"
          value={fields.phone}
          onChange={handleChange}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="defaultAddress">Default Delivery Address</Label>
        <Textarea
          id="defaultAddress"
          name="defaultAddress"
          placeholder="Your saved address"
          value={fields.defaultAddress}
          onChange={handleChange}
          rows={2}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-700">Profile saved.</p>}

      <Button onClick={handleSave} disabled={isPending} className="w-full">
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
