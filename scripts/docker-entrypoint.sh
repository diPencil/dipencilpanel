#!/bin/sh
set -eu
cd /app

# First boot on VPS: empty Postgres → no users until migrations + seed run.
pnpm exec prisma migrate deploy

# Keep startup resilient: seed helps bootstrap data, but must not take down
# the app on later boots if it hits duplicate/constraint issues.
if [ "${RUN_SEED_ON_STARTUP:-true}" = "true" ]; then
	pnpm exec prisma db seed || echo "[entrypoint] Seed failed; continuing startup."
fi

exec node server.js
