#!/bin/sh
set -e

cd /app/packages/api

echo "Applying database schema..."
npx prisma db push

if [ "$RUN_SEED" = "true" ]; then
  echo "Seeding database..."
  npx tsx prisma/seed.ts
fi

exec "$@"
