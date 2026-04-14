/**
 * middleware.ts
 *
 * Runs on the Edge runtime for every matched request.
 * Uses the edge-safe authConfig (no Prisma / bcrypt).
 *
 * Responsibilities:
 *  - Redirect unauthenticated users to /login
 *  - Redirect authenticated users away from auth pages to their dashboard
 *  - Enforce role-based route access
 */

import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  /*
   * Match every path except:
   *   - _next/static  (Next.js build assets)
   *   - _next/image   (Image Optimisation API)
   *   - favicon.ico
   *   - Static file extensions
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};
