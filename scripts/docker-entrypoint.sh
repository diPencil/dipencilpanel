#!/bin/sh
set -eu
cd /app

# First boot on VPS: empty Postgres → no users until migrations + seed run.
pnpm exec prisma migrate deploy
pnpm exec prisma db seed

exec node server.js
