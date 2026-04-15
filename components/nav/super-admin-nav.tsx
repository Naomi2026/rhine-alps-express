/**
 * components/nav/super-admin-nav.tsx
 *
 * Sidebar for the Super Admin portal. Extends admin nav with user management,
 * audit log, and settings links.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/super-admin/dashboard",  label: "Dashboard",     icon: LayoutDashboard },
  { href: "/super-admin/users",      label: "Users",         icon: Users },
  { href: "/super-admin/audit",      label: "Audit Log",     icon: FileText },
  { href: "/super-admin/settings",   label: "Settings",      icon: Settings },
];

export function SuperAdminNav({ name }: { name: string }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 border-r bg-background z-40">
        <div className="flex h-14 items-center px-4 border-b shrink-0">
          <Link href="/super-admin/dashboard" className="flex items-center gap-2">
            <span className="font-bold text-primary">Rhine Alps</span>
          </Link>
          <span className="ml-auto flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
            <ShieldCheck className="h-3 w-3" />
            Super
          </span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t px-4 py-3">
          <p className="text-xs font-medium truncate">{name}</p>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
        <Link href="/super-admin/dashboard" className="font-bold text-primary text-sm flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4" />
          Super Admin
        </Link>
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "p-2 rounded-md transition-colors",
                pathname.startsWith(href)
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
            </Link>
          ))}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2 rounded-md text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </nav>
      </header>
    </>
  );
}
