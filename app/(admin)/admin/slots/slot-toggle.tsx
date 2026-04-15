/**
 * app/(admin)/admin/slots/slot-toggle.tsx
 */

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SlotToggleButton({
  slotId,
  isActive,
}: {
  slotId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await fetch(`/api/slots/${slotId}/toggle`, { method: "PATCH" });
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={toggle}
      className="text-xs"
    >
      {isActive ? "Disable" : "Enable"}
    </Button>
  );
}
