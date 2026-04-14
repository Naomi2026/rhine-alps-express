/**
 * app/api/auth/[...nextauth]/route.ts
 *
 * Auth.js v5 catch-all handler.
 * Handles GET (session, CSRF) and POST (sign-in, sign-out) requests.
 */

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
