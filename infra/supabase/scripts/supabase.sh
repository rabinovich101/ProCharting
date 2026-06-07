#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SUPABASE_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SUPABASE_DIR/../.." && pwd)
RUNTIME_DIR="${PROCHARTING_SUPABASE_RUNTIME_DIR:-$SUPABASE_DIR/runtime}"
MIGRATIONS_DIR="$SUPABASE_DIR/migrations"
UPSTREAM_REPO="${SUPABASE_DOCKER_REPO:-https://github.com/supabase/supabase.git}"
UPSTREAM_REF="${SUPABASE_DOCKER_REF:-master}"

die() {
  echo "ERROR: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is required."
}

ensure_runtime() {
  [ -f "$RUNTIME_DIR/docker-compose.yml" ] || die "Supabase runtime is missing. Run: sh infra/supabase/scripts/supabase.sh install"
}

set_env_value() {
  key="$1"
  value="$2"
  tmp_file=$(mktemp)

  if [ -f .env ]; then
    awk -v key="$key" -v value="$value" '
      BEGIN { updated = 0 }
      index($0, key "=") == 1 {
        print key "=" value
        updated = 1
        next
      }
      { print }
      END {
        if (updated == 0) {
          print ""
          print key "=" value
        }
      }
    ' .env > "$tmp_file"
  else
    printf '%s=%s\n' "$key" "$value" > "$tmp_file"
  fi

  mv "$tmp_file" .env
}

read_env_value() {
  key="$1"
  file="$2"

  [ -f "$file" ] || return 1

  awk -v key="$key" '
    $0 ~ "^[[:space:]]*#" { next }
    index($0, key "=") == 1 {
      sub(/^[^=]*=/, "")
      print
      exit
    }
  ' "$file"
}

oauth_status() {
  base_url="${1:-}"
  anon_key="${2:-}"

  if [ -z "$base_url" ] || [ -z "$anon_key" ]; then
    ensure_runtime
    env_file="$RUNTIME_DIR/.env"

    if [ -z "$base_url" ]; then
      base_url="$(read_env_value SUPABASE_PUBLIC_URL "$env_file")"
      [ -n "$base_url" ] || base_url="$(read_env_value API_EXTERNAL_URL "$env_file")"
    fi

    if [ -z "$anon_key" ]; then
      anon_key="$(read_env_value ANON_KEY "$env_file")"
      [ -n "$anon_key" ] || anon_key="$(read_env_value SUPABASE_PUBLISHABLE_KEY "$env_file")"
    fi
  fi

  [ -n "$base_url" ] || die "Missing Supabase URL. Pass it as: sh infra/supabase/scripts/supabase.sh oauth-status <url> <anon-key>"
  [ -n "$anon_key" ] || die "Missing Supabase anon/publishable key. Pass it as the second oauth-status argument."

  require_cmd curl

  settings_url="${base_url%/}/auth/v1/settings"
  echo "Checking Supabase Auth settings at $settings_url"
  curl -fsS \
    -H "apikey: $anon_key" \
    -H "Authorization: Bearer $anon_key" \
    "$settings_url"
  printf '\n'
}

import_google_oauth() {
  json_file="${1:-}"
  [ -n "$json_file" ] || die "Missing Google OAuth client JSON path."

  case "$json_file" in
    /*) google_json="$json_file" ;;
    *) google_json="$(pwd)/$json_file" ;;
  esac

  [ -f "$google_json" ] || die "Google OAuth client JSON not found: $json_file"

  ensure_runtime
  require_cmd node

  env_file="$RUNTIME_DIR/.env"
  base_url="$(read_env_value API_EXTERNAL_URL "$env_file")"
  [ -n "$base_url" ] || base_url="$(read_env_value SUPABASE_PUBLIC_URL "$env_file")"
  [ -n "$base_url" ] || die "Missing API_EXTERNAL_URL or SUPABASE_PUBLIC_URL in $env_file."
  expected_callback="${base_url%/}/auth/v1/callback"

  google_data="$(
    node - "$google_json" "$expected_callback" <<'NODE'
const fs = require('fs');

const [jsonPath, expectedCallback] = process.argv.slice(2);
const payload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const client = payload.web || payload.installed;

if (!client) {
  throw new Error('Expected a Google OAuth JSON file with a "web" or "installed" client.');
}

if (!client.client_id || !client.client_secret) {
  throw new Error('Google OAuth JSON is missing client_id or client_secret.');
}

const redirectUris = Array.isArray(client.redirect_uris) ? client.redirect_uris : [];

console.log(`CLIENT_ID=${client.client_id}`);
console.log(`CLIENT_SECRET=${client.client_secret}`);
console.log(`HAS_EXPECTED_REDIRECT=${redirectUris.includes(expectedCallback) ? 'true' : 'false'}`);
NODE
  )"

  client_id="$(printf '%s\n' "$google_data" | awk -F= '/^CLIENT_ID=/ { sub(/^[^=]*=/, ""); print; exit }')"
  client_secret="$(printf '%s\n' "$google_data" | awk -F= '/^CLIENT_SECRET=/ { sub(/^[^=]*=/, ""); print; exit }')"
  has_expected_redirect="$(printf '%s\n' "$google_data" | awk -F= '/^HAS_EXPECTED_REDIRECT=/ { sub(/^[^=]*=/, ""); print; exit }')"

  [ -n "$client_id" ] || die "Google OAuth JSON did not provide a client ID."
  [ -n "$client_secret" ] || die "Google OAuth JSON did not provide a client secret."

  (
    cd "$RUNTIME_DIR"
    set_env_value GOOGLE_ENABLED true
    set_env_value GOOGLE_CLIENT_ID "$client_id"
    set_env_value GOOGLE_SECRET "$client_secret"
  )

  echo "Imported Google OAuth client into $env_file."
  echo "Client ID: $client_id"
  echo "Client secret: configured (not printed)."

  if [ "$has_expected_redirect" != "true" ]; then
    echo "WARNING: The Google OAuth JSON does not list $expected_callback in redirect_uris." >&2
    echo "Add that URI in Google Cloud Console before testing production Google sign-in." >&2
  fi

  echo "Recreate the Auth container for the change to take effect:"
  echo "  cd $RUNTIME_DIR && docker compose up -d --force-recreate --no-deps auth"
}

import_resend_smtp() {
  sender_email="${1:-${RESEND_FROM_EMAIL:-}}"
  sender_name="${2:-${RESEND_FROM_NAME:-}}"
  resend_key="${RESEND_API_KEY:-}"
  root_env_file="${RESEND_ENV_FILE:-$PROJECT_ROOT/.env}"

  ensure_runtime

  env_file="$RUNTIME_DIR/.env"

  if [ -z "$resend_key" ] && [ -f "$root_env_file" ]; then
    resend_key="$(read_env_value RESEND_API_KEY "$root_env_file")"
  fi

  if [ -z "$sender_email" ] && [ -f "$root_env_file" ]; then
    sender_email="$(read_env_value RESEND_FROM_EMAIL "$root_env_file")"
  fi

  if [ -z "$sender_email" ]; then
    current_sender="$(read_env_value SMTP_ADMIN_EMAIL "$env_file" || true)"
    case "$current_sender" in
      ""|admin@example.com|example@example.com)
        sender_email="noreply@thefiscalwire.com"
        ;;
      *)
        sender_email="$current_sender"
        ;;
    esac
  fi

  if [ -z "$sender_name" ] && [ -f "$root_env_file" ]; then
    sender_name="$(read_env_value RESEND_FROM_NAME "$root_env_file")"
  fi

  if [ -z "$sender_name" ]; then
    current_sender_name="$(read_env_value SMTP_SENDER_NAME "$env_file" || true)"
    case "$current_sender_name" in
      ""|fake_sender)
        sender_name="ProCharts"
        ;;
      *)
        sender_name="$current_sender_name"
        ;;
    esac
  fi

  [ -n "$resend_key" ] || die "Missing RESEND_API_KEY. Export it or add it to $root_env_file."
  [ -n "$sender_email" ] || die "Missing sender email."
  [ -n "$sender_name" ] || die "Missing sender name."

  (
    cd "$RUNTIME_DIR"
    set_env_value ENABLE_EMAIL_SIGNUP true
    set_env_value ENABLE_EMAIL_AUTOCONFIRM false
    set_env_value SMTP_ADMIN_EMAIL "$sender_email"
    set_env_value SMTP_HOST smtp.resend.com
    set_env_value SMTP_PORT 587
    set_env_value SMTP_USER resend
    set_env_value SMTP_PASS "$resend_key"
    set_env_value SMTP_SENDER_NAME "$sender_name"
  )

  echo "Imported Resend SMTP settings into $env_file."
  echo "SMTP host: smtp.resend.com"
  echo "SMTP port: 587"
  echo "SMTP user: resend"
  echo "SMTP sender: $sender_name <$sender_email>"
  echo "SMTP password: configured (not printed)."
  echo "Recreate the Auth container for the change to take effect:"
  echo "  cd $RUNTIME_DIR && docker compose up -d --force-recreate --no-deps auth"
}

fetch_official_docker_bundle() {
  tmp_dir=$(mktemp -d)
  repo_dir="$tmp_dir/supabase"

  mkdir -p "$repo_dir"
  (
    cd "$repo_dir"
    git init >/dev/null
    git remote add origin "$UPSTREAM_REPO"
    git config core.sparseCheckout true
    printf 'docker/*\n' > .git/info/sparse-checkout
    git pull --depth=1 origin "$UPSTREAM_REF"
  )

  mkdir -p "$RUNTIME_DIR"
  cp -R "$repo_dir/docker/." "$RUNTIME_DIR/"
  rm -rf "$tmp_dir"
}

install_runtime() {
  require_cmd git
  require_cmd openssl
  require_cmd docker
  docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is required."

  force_install=false
  if [ "${1:-}" = "--force" ]; then
    force_install=true
  fi

  if [ "$force_install" = true ] && [ -d "$RUNTIME_DIR" ]; then
    rm -rf "$RUNTIME_DIR"
  fi

  if [ ! -f "$RUNTIME_DIR/docker-compose.yml" ]; then
    echo "Fetching official Supabase Docker bundle from $UPSTREAM_REPO ($UPSTREAM_REF)..."
    fetch_official_docker_bundle
  else
    echo "Supabase runtime already exists at $RUNTIME_DIR"
  fi

  (
    cd "$RUNTIME_DIR"
    mkdir -p volumes/functions volumes/snippets

    if [ ! -f .env ]; then
      cp .env.example .env
    fi

    set_env_value SUPABASE_PUBLIC_URL "${SUPABASE_PUBLIC_URL:-http://localhost:8000}"
    set_env_value API_EXTERNAL_URL "${API_EXTERNAL_URL:-http://localhost:8000}"
    set_env_value SITE_URL "${PROCHARTING_SITE_URL:-http://localhost:3000}"
    set_env_value STUDIO_DEFAULT_ORGANIZATION "${STUDIO_DEFAULT_ORGANIZATION:-ProCharting}"
    set_env_value STUDIO_DEFAULT_PROJECT "${STUDIO_DEFAULT_PROJECT:-ProCharting Local}"
    set_env_value POOLER_TENANT_ID "${POOLER_TENANT_ID:-procharting-local}"

    if grep -q 'your-super-secret\|this_password_is_insecure' .env; then
      echo "Generating local Supabase secrets..."
      sh utils/generate-keys.sh --update-env >/dev/null
    fi

    if grep -q '^SUPABASE_PUBLISHABLE_KEY=$' .env || grep -q '^SUPABASE_SECRET_KEY=$' .env; then
      echo "Generating local Supabase auth keys..."
      sh utils/add-new-auth-keys.sh --update-env >/dev/null
    fi
  )

  echo "Supabase Docker runtime is ready at $RUNTIME_DIR"
  echo "Start it with: sh infra/supabase/scripts/supabase.sh start"
}

run_runtime() {
  ensure_runtime
  (
    cd "$RUNTIME_DIR"
    sh run.sh "$@"
  )
}

apply_migrations() {
  ensure_runtime
  require_cmd docker

  found=false
  for migration in "$MIGRATIONS_DIR"/*.sql; do
    [ -f "$migration" ] || continue
    found=true
    echo "Applying $(basename "$migration")..."
    (
      cd "$RUNTIME_DIR"
      docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$migration"
    )
  done

  [ "$found" = true ] || echo "No Supabase migrations found."
}

case "${1:-help}" in
  install)
    shift
    install_runtime "$@"
    ;;
  start)
    shift
    run_runtime start "$@"
    ;;
  stop)
    shift
    run_runtime stop "$@"
    ;;
  restart)
    shift
    run_runtime restart "$@"
    ;;
  status|ps)
    shift
    run_runtime status "$@"
    ;;
  logs)
    shift
    run_runtime logs "$@"
    ;;
  oauth-status)
    shift
    oauth_status "$@"
    ;;
  import-google-oauth)
    shift
    import_google_oauth "$@"
    ;;
  import-resend-smtp)
    shift
    import_resend_smtp "$@"
    ;;
  config)
    shift
    run_runtime compose-config "$@"
    ;;
  secrets)
    shift
    run_runtime secrets "$@"
    ;;
  migrate)
    shift
    apply_migrations "$@"
    ;;
  help|-h|--help)
    cat <<EOF
Usage: sh infra/supabase/scripts/supabase.sh <command>

Commands:
  install [--force]  Fetch official Supabase Docker files and generate local secrets.
  start              Start Supabase with Docker Compose.
  stop               Stop Supabase.
  restart            Restart the stack or selected services.
  status             Show service status.
  logs [service]     Follow logs.
  oauth-status [url] [anon-key]
                     Print non-secret Auth settings, including enabled providers.
  import-google-oauth <client-secret.json>
                     Import Google OAuth client ID/secret into runtime/.env.
  import-resend-smtp [sender-email] [sender-name]
                     Import Resend SMTP settings into runtime/.env.
  config             Print resolved Docker Compose config.
  secrets            Print local Supabase credentials from runtime/.env.
  migrate            Apply project-owned SQL migrations to the running database.

Environment:
  SUPABASE_DOCKER_REPO      Override upstream repo.
  SUPABASE_DOCKER_REF       Override upstream branch/tag/commit. Default: master.
  PROCHARTING_SITE_URL      Auth site URL. Default: http://localhost:3000.
  SUPABASE_PUBLIC_URL       Public Supabase URL. Default: http://localhost:8000.
  API_EXTERNAL_URL          Auth/API external URL. Default: http://localhost:8000.
  RESEND_API_KEY            Resend API key used as the SMTP password.
  RESEND_ENV_FILE           Env file to read RESEND_API_KEY from. Default: repo .env.
  RESEND_FROM_EMAIL         Optional default SMTP sender email.
  RESEND_FROM_NAME          Optional default SMTP sender name.
EOF
    ;;
  *)
    die "Unknown command: $1"
    ;;
esac
