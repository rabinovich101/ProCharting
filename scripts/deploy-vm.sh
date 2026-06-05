#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_FILTER="${PROCHARTS_APP_FILTER:-@procharting/example-basic}"
APP_DIR="${PROCHARTS_APP_DIR:-examples/basic}"
APP_NAME="${PROCHARTS_APP_NAME:-procharts-demo}"
HOST="${PROCHARTS_HOST:-127.0.0.1}"
PORT="${PROCHARTS_PORT:-3000}"
PNPM_VERSION="${PROCHARTS_PNPM_VERSION:-10.17.0}"

cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required before deployment." >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare "pnpm@${PNPM_VERSION}" --activate
  fi
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required before deployment." >&2
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 is required before deployment." >&2
  exit 1
fi

pnpm install --frozen-lockfile
pnpm build
pnpm --filter "$APP_FILTER" build

DIST_DIR="$ROOT_DIR/$APP_DIR/dist"
if [[ ! -f "$DIST_DIR/index.html" ]]; then
  echo "Expected built app at $DIST_DIR/index.html" >&2
  exit 1
fi

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 delete "$APP_NAME"
fi

pm2 start "$ROOT_DIR/scripts/static-server.mjs" \
  --name "$APP_NAME" \
  --time \
  -- "$DIST_DIR" "$HOST" "$PORT"

pm2 save

for attempt in {1..20}; do
  if curl -fsS "http://${HOST}:${PORT}/" >/dev/null; then
    echo "Deployment healthy at http://${HOST}:${PORT}/"
    exit 0
  fi

  sleep 1
done

echo "Deployment started, but health check failed at http://${HOST}:${PORT}/" >&2
pm2 logs "$APP_NAME" --lines 80 --nostream >&2 || true
exit 1
