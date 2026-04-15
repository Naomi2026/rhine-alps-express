#!/bin/sh
# docker-entrypoint.sh
#
# Runs on every container start before the Next.js server.
# Applies pending migrations and optionally seeds the database.
#
# Environment variables:
#   SEED_DB=true   — run the seed script on startup (dev/staging only)

set -e

echo "▶ Running Prisma migrations..."
npx prisma migrate deploy

if [ "$SEED_DB" = "true" ]; then
  echo "▶ Seeding database..."
  npx tsx prisma/seed.ts
fi

echo "▶ Starting Next.js server..."
exec node server.js
