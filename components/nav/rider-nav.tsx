/**
 * components/nav/rider-nav.tsx
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

export function RiderNav({ name }: { name: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
      <Link href="/rider/dashboard" className="flex items-center gap-2">
        <span className="text-base font-bold text-primary">Rhine Alps</span>
        <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
          Rider
        </span>
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/rider/dashboard"
          className={cn(
            "flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary",
            pathname === "/rider/dashboard" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span className="hidden sm:inline">Deliveries</span>
        </Link>
        <span className="hidden text-sm text-muted-foreground sm:inline">{name}</span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
