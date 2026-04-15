# ─────────────────────────────────────────────────────────────────────────────
# Rhine Alps Express — multi-stage Dockerfile
#
# Stages:
#   deps    — install production + dev dependencies
#   builder — generate Prisma client, run next build (standalone output)
#   runner  — minimal runtime image (~200 MB)
#
# Requires next.config.ts to have output: "standalone"
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: install dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps

# openssl is required by Prisma client on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts


# ── Stage 2: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

# Copy deps from stage 1
COPY --from=deps /app/node_modules ./node_modules

# Copy source
COPY . .

# Generate Prisma client against the production schema
RUN npx prisma generate

# Build the Next.js app (produces .next/standalone)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build


# ── Stage 3: minimal runtime image ────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copy standalone server output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public

# Copy Prisma schema and migrations so the entrypoint can run migrate deploy
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Copy generated Prisma client
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Copy seed script + its transitive runtime deps (tsx, bcryptjs)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/tsx      ./node_modules/tsx
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin/tsx ./node_modules/.bin/tsx

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
