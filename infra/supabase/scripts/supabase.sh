#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SUPABASE_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
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

  if grep -q "^$key=" .env; then
    sed -i.bak "s|^$key=.*$|$key=$value|" .env
    rm -f .env.bak
  else
    printf '\n%s=%s\n' "$key" "$value" >> .env
  fi
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
  config             Print resolved Docker Compose config.
  secrets            Print local Supabase credentials from runtime/.env.
  migrate            Apply project-owned SQL migrations to the running database.

Environment:
  SUPABASE_DOCKER_REPO      Override upstream repo.
  SUPABASE_DOCKER_REF       Override upstream branch/tag/commit. Default: master.
  PROCHARTING_SITE_URL      Auth site URL. Default: http://localhost:3000.
  SUPABASE_PUBLIC_URL       Public Supabase URL. Default: http://localhost:8000.
  API_EXTERNAL_URL          Auth/API external URL. Default: http://localhost:8000.
EOF
    ;;
  *)
    die "Unknown command: $1"
    ;;
esac
