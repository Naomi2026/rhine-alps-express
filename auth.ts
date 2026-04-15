/**
 * auth.ts
 *
 * Full Auth.js v5 configuration (Node.js runtime only).
 * Imports bcryptjs and Prisma — do not import this in middleware.ts.
 *
 * Exports: handlers (GET/POST), auth (session getter), signIn, signOut
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";

const credentialsSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  // No adapter: using JWT strategy with Credentials only.
  // Users are looked up directly via Prisma in `authorize`.
  // The Account/Session/VerificationToken models in schema.prisma
  // remain for forward-compatibility when OAuth is added.
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, phone, password } = parsed.data;

        if (!email && !phone) return null;

        const user = await db.user.findFirst({
          where: email ? { email } : { phone },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
            role: true,
            passwordHash: true,
            isActive: true,
            isLocked: true,
            failedLogins: true,
          },
        });

        if (!user || !user.passwordHash) return null;

        // Locked accounts cannot log in (§4.5)
        if (user.isLocked || !user.isActive) return null;

        const passwordOk = await bcrypt.compare(password, user.passwordHash);

        if (!passwordOk) {
          // Increment failed login counter; lock at threshold
          const newCount = user.failedLogins + 1;
          const lockThreshold = 3; // matches FAILED_LOGIN_LOCKOUT_THRESHOLD system setting

          await db.user.update({
            where: { id: user.id },
            data: {
              failedLogins: newCount,
              isLocked: newCount >= lockThreshold,
            },
          });

          return null;
        }

        // Successful login — reset failed counter
        if (user.failedLogins > 0) {
          await db.user.update({
            where: { id: user.id },
            data: { failedLogins: 0 },
          });
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
});
