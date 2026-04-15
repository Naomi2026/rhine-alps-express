/**
 * auth.config.ts
 *
 * Edge-safe Auth.js configuration.
 * MUST NOT import @prisma/client, bcryptjs, or any Node.js-only module.
 * Used by both auth.ts (server) and middleware.ts (edge).
 */

import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";

/** Returns the default dashboard path for a given role. */
export function getDashboardPath(role: UserRole | string | undefined): string {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return "/super-admin/dashboard";
    case UserRole.ADMIN:
      return "/admin/dashboard";
    case UserRole.RIDER:
      return "/rider/dashboard";
    case UserRole.CUSTOMER:
      return "/customer/dashboard";
    default:
      return "/login";
  }
}

/** Route prefix → allowed roles (empty = public). */
const PROTECTED_ROUTES: Record<string, UserRole[]> = {
  "/customer": [UserRole.CUSTOMER],
  "/rider": [UserRole.RIDER],
  "/admin": [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  "/super-admin": [UserRole.SUPER_ADMIN],
};

const PUBLIC_ROUTES = ["/login", "/register", "/api/auth"];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role as UserRole | undefined;
      const { pathname } = nextUrl;

      // Always allow API auth routes
      if (pathname.startsWith("/api/auth")) return true;

      // Root redirect
      if (pathname === "/") {
        if (!isLoggedIn) {
          return NextResponse.redirect(new URL("/login", nextUrl.origin));
        }
        return NextResponse.redirect(
          new URL(getDashboardPath(role), nextUrl.origin)
        );
      }

      // Auth pages: redirect logged-in users to their dashboard
      if (pathname === "/login" || pathname === "/register") {
        if (isLoggedIn) {
          return NextResponse.redirect(
            new URL(getDashboardPath(role), nextUrl.origin)
          );
        }
        return true;
      }

      // Public routes
      if (isPublic(pathname)) return true;

      // All other routes require authentication.
      // For API routes, return 401 JSON instead of the NextAuth redirect (which
      // sends an HTML 307 that non-browser clients cannot parse — BUG-003).
      if (!isLoggedIn) {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return false; // triggers redirect to signIn page for page routes
      }

      // Role-based route protection
      for (const [prefix, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
        if (pathname.startsWith(prefix)) {
          if (!role || !allowedRoles.includes(role)) {
            // Wrong role — redirect to their own dashboard instead of 403
            return NextResponse.redirect(
              new URL(getDashboardPath(role), nextUrl.origin)
            );
          }
          return true;
        }
      }

      // Unknown protected path — require login
      return isLoggedIn;
    },

    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: UserRole }).role;
      }
      return token;
    },

    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },

  // Providers are declared in auth.ts (not here — bcrypt is Node-only)
  providers: [],
} satisfies NextAuthConfig;
