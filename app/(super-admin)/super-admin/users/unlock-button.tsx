/**
 * app/(super-admin)/super-admin/users/unlock-button.tsx
 */

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function UnlockUserButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function unlock() {
    startTransition(async () => {
      await fetch(`/api/users/${userId}/unlock`, { method: "PATCH" });
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={unlock} className="text-xs">
      {isPending ? "Unlocking..." : "Unlock"}
    </Button>
  );
}
