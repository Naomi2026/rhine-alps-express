/**
 * components/nav/customer-nav.tsx
 *
 * Top navigation bar for the customer portal.
 * Mobile-first layout with a simple icon-based bottom nav on small screens.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, User, Plus, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/customer/dashboard",   label: "Home",    icon: LayoutDashboard },
  { href: "/customer/orders",      label: "Orders",  icon: ShoppingBag },
  { href: "/customer/orders/new",  label: "Order",   icon: Plus },
  { href: "/customer/profile",     label: "Profile", icon: User },
];

export function CustomerNav({ name }: { name: string }) {
  const pathname = usePathname();

  return (
    <>
      {/* Top bar — visible on md+ */}
      <header className="hidden md:flex sticky top-0 z-40 h-14 items-center justify-between border-b bg-background/95 px-6 backdrop-blur">
        <Link href="/customer/dashboard" className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary">Rhine Alps</span>
          <span className="rounded bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
            Express
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          {NAV_ITEMS.slice(0, 2).map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname.startsWith(href) && href !== "/orders/new"
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{name}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t bg-background">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/orders/new" && pathname.startsWith(href) && href !== "/dashboard") || pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium text-muted-foreground"
        >
          <LogOut className="h-5 w-5" />
          Out
        </button>
      </nav>
    </>
  );
}
