#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="${PROCHARTS_APP_DIR:-TEST/binance-chart-test}"
APP_NAME="${PROCHARTS_APP_NAME:-procharts-app}"
LEGACY_APP_NAME="procharts-demo"
HOST="${PROCHARTS_HOST:-127.0.0.1}"
PORT="${PROCHARTS_PORT:-3000}"
ENV_FILE="${PROCHARTS_ENV_FILE:-/etc/procharts/app.env}"

cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required before deployment." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required before deployment." >&2
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 is required before deployment." >&2
  exit 1
fi

cd "$ROOT_DIR/$APP_DIR"

if [[ ! -f package-lock.json ]]; then
  echo "Expected npm lockfile at $ROOT_DIR/$APP_DIR/package-lock.json" >&2
  exit 1
fi

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

for local_env_file in .env.local .env.production.local; do
  if [[ -f "$local_env_file" ]]; then
    mv "$local_env_file" "${local_env_file}.ignored-by-vm-deploy"
    echo "Moved $APP_DIR/$local_env_file aside for VM deployment; $ENV_FILE is authoritative."
  fi
done

npm ci
npm run build

# GitHub Actions marks spawned processes for cleanup; PM2 apps must outlive the
# deploy job that starts them.
unset RUNNER_TRACKING_ID

for process_name in "$APP_NAME" "$LEGACY_APP_NAME"; do
  if pm2 describe "$process_name" >/dev/null 2>&1; then
    pm2 delete "$process_name"
  fi
done

pm2 start npm \
  --name "$APP_NAME" \
  --time \
  -- start -- -H "$HOST" -p "$PORT"

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
