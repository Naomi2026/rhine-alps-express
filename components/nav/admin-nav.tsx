/**
 * components/nav/admin-nav.tsx
 *
 * Sidebar navigation for admin and super-admin.
 * On mobile, collapses to a horizontal top bar with icon links.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Bike,
  CalendarDays,
  BarChart2,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const ADMIN_NAV: NavItem[] = [
  { href: "/admin/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { href: "/admin/orders",     label: "Orders",     icon: ShoppingBag },
  { href: "/admin/customers",  label: "Customers",  icon: Users },
  { href: "/admin/riders",     label: "Riders",     icon: Bike },
  { href: "/admin/slots",      label: "Slots",      icon: CalendarDays },
  { href: "/admin/reports",    label: "Reports",    icon: BarChart2 },
];

export function AdminNav({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 border-r bg-background z-40">
        <div className="flex h-14 items-center px-4 border-b shrink-0">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <span className="font-bold text-primary">Rhine Alps</span>
          </Link>
          <span className="ml-auto rounded bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary capitalize">
            {role.toLowerCase().replace("_", " ")}
          </span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
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
        <Link href="/admin/dashboard" className="font-bold text-primary text-sm">
          Rhine Alps Admin
        </Link>
        <nav className="flex items-center gap-1">
          {ADMIN_NAV.map(({ href, icon: Icon }) => (
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
            className="p-2 rounded-md text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </nav>
      </header>
    </>
  );
}
