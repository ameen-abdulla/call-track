#!/bin/sh
set -e

echo "[Call Track] Starting up..."

# Push schema to the database
echo "[Call Track] Setting up database..."
npx prisma db push --skip-generate

# Seed only on first run (flag file stored in the data volume)
if [ ! -f /data/.seeded ]; then
  echo "[Call Track] Seeding database with initial data..."
  npm run db:seed
  touch /data/.seeded
  echo "[Call Track] Seed complete."
fi

echo "[Call Track] Starting server on http://localhost:3000"
exec npm start
