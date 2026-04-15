/**
 * app/(super-admin)/super-admin/settings/setting-row.tsx
 *
 * Inline edit row for a single system setting.
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Pencil, X } from "lucide-react";

interface Props {
  settingId: string;
  settingKey: string;
  value: string;
  description: string;
  actingUserId: string;
}

export function SettingRow({ settingId, settingKey, value, description, actingUserId }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function save() {
    setError("");
    startTransition(async () => {
      const res = await fetch(`/api/settings/${settingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: draft, updatedById: actingUserId }),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save.");
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-mono text-muted-foreground">{settingKey}</p>
        <p className="text-sm text-foreground">{description}</p>
        {error && <p className="text-xs text-destructive mt-0.5">{error}</p>}
      </div>
      {editing ? (
        <div className="flex items-center gap-2 shrink-0">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-32 text-sm h-8"
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-green-700"
            disabled={isPending}
            onClick={save}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            disabled={isPending}
            onClick={() => { setEditing(false); setDraft(value); setError(""); }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-medium w-28 text-right">{value}</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
