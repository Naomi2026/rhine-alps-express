/**
 * app/page.tsx
 *
 * Root route. Middleware handles the actual redirect (to /login or role
 * dashboard), but we include a server-side fallback redirect here for safety.
 */

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDashboardPath } from "@/auth.config";

export default async function RootPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  redirect(getDashboardPath(user.role));
}
