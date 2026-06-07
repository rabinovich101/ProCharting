# ProCharting Supabase Microservice

This directory creates a Docker-only Supabase boundary for user-owned chart
state. It does not change the current chart app behavior; the Next.js chart app
can keep using localStorage until a later integration step moves save/load calls
to Supabase.

## Layout

```text
infra/supabase/
├── migrations/          # ProCharting-owned database schema
├── scripts/             # Thin wrappers around the Supabase Docker runtime
└── runtime/             # Ignored generated copy of upstream supabase/docker
```

`runtime/` is intentionally gitignored because it contains generated secrets in
`.env` and upstream Docker files that are fetched at install time.

## Install

```sh
sh infra/supabase/scripts/supabase.sh install
```

The installer:

- fetches the official Supabase `docker/` bundle into `infra/supabase/runtime`;
- copies `.env.example` to `runtime/.env`;
- generates local JWT/API/dashboard/Postgres secrets;
- sets local URLs for this project:
  - Supabase/Kong: `http://localhost:8000`
  - ProCharting app site URL: `http://localhost:3000`

Do not commit `infra/supabase/runtime` or any generated `.env` file.

## Operate

```sh
sh infra/supabase/scripts/supabase.sh start
sh infra/supabase/scripts/supabase.sh status
sh infra/supabase/scripts/supabase.sh migrate
sh infra/supabase/scripts/supabase.sh logs
sh infra/supabase/scripts/supabase.sh stop
```

After `start`, access self-hosted Supabase through the local gateway at
`http://localhost:8000`. Studio credentials are generated in
`infra/supabase/runtime/.env`; print the important local secrets with:

```sh
sh infra/supabase/scripts/supabase.sh secrets
```

## Registration Email Delivery

Supabase Auth sends signup confirmation, invite, recovery, and email-change
messages through the SMTP settings in the ignored runtime `.env`. To send those
messages through Resend, keep `RESEND_API_KEY` in a local/server-only env file
and import the SMTP settings:

```sh
sh infra/supabase/scripts/supabase.sh import-resend-smtp
```

The helper reads `RESEND_API_KEY` from the repo root `.env` by default, or from
the exported environment. It writes the runtime mailer settings without
printing the API key:

```sh
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=<resend-api-key>
SMTP_ADMIN_EMAIL=noreply@thefiscalwire.com
SMTP_SENDER_NAME=ProCharts
```

For the production VM runtime, run it from the VM checkout with the production
runtime selected:

```sh
PROCHARTING_SUPABASE_RUNTIME_DIR=/home/ooo/procharts-supabase/runtime \
  sh infra/supabase/scripts/supabase.sh import-resend-smtp
```

Then recreate Auth so it receives the new SMTP values:

```sh
cd /home/ooo/procharts-supabase/runtime
docker compose up -d --force-recreate --no-deps auth
```

## OAuth Provider Status

Check the non-secret Auth settings payload, including enabled social providers,
with:

```sh
sh infra/supabase/scripts/supabase.sh oauth-status
```

For the production VM runtime, run the helper from the VM checkout with the
production runtime selected:

```sh
PROCHARTING_SUPABASE_RUNTIME_DIR=/home/ooo/procharts-supabase/runtime \
  sh infra/supabase/scripts/supabase.sh oauth-status
```

If Google returns `Unsupported provider: provider is not enabled`, update the
VM-local `/home/ooo/procharts-supabase/runtime/.env` with the production Google
OAuth values:

```sh
GOOGLE_ENABLED=true
GOOGLE_CLIENT_ID=<google-web-client-id>
GOOGLE_SECRET=<google-client-secret>
```

If you have the downloaded Google client-secret JSON on the server, import it
without printing the secret:

```sh
PROCHARTING_SUPABASE_RUNTIME_DIR=/home/ooo/procharts-supabase/runtime \
  sh infra/supabase/scripts/supabase.sh import-google-oauth ./client_secret_*.json
```

Then recreate the Auth container from `/home/ooo/procharts-supabase/runtime`:

```sh
docker compose up -d --force-recreate --no-deps auth
```

The matching Docker Compose passthrough must include
`GOTRUE_EXTERNAL_GOOGLE_ENABLED`, `GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID`,
`GOTRUE_EXTERNAL_GOOGLE_SECRET`, and
`GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI`. The Google Cloud OAuth client must allow
`https://procharts.thefiscalwire.com/auth/v1/callback`.

For GitHub OAuth, the runtime uses the same public callback boundary. Set the
ignored runtime `.env` values:

```sh
GITHUB_ENABLED=true
GITHUB_CLIENT_ID=<github-oauth-client-id>
GITHUB_SECRET=<github-oauth-client-secret>
```

The matching Docker Compose passthrough must include
`GOTRUE_EXTERNAL_GITHUB_ENABLED`, `GOTRUE_EXTERNAL_GITHUB_CLIENT_ID`,
`GOTRUE_EXTERNAL_GITHUB_SECRET`, and
`GOTRUE_EXTERNAL_GITHUB_REDIRECT_URI`. The GitHub OAuth App must allow
`https://procharts.thefiscalwire.com/auth/v1/callback`; if GitHub shows
`The redirect_uri is not associated with this application` while Supabase
reports `external.github: true`, update the GitHub OAuth App callback URL or
use the GitHub client ID/secret from the app that already allows that callback.

## Chart State Schema

`migrations/001_chart_layouts.sql` creates `public.chart_layouts`:

- `user_id` references `auth.users(id)`;
- `snapshot jsonb` stores the existing chart layout snapshot shape;
- `is_autosave` supports one current autosave row per user;
- Row Level Security policies restrict select/insert/update/delete to the
  authenticated owner.

Candles and live feed data should stay out of this table. They are market data
and should continue to reload from the price-data flow.

## Signup/Login Schema

Supabase Auth owns signup, login, credentials, sessions, password reset, email
verification, and identity-provider records in the `auth` schema.

`migrations/002_user_profiles.sql` creates `public.user_profiles`:

- `user_id` is the primary key and references `auth.users(id)`;
- an `auth.users` insert trigger creates a profile row automatically after
  signup;
- `display_name` and `avatar_url` hold minimal app-owned profile data;
- Row Level Security restricts profile select/insert/update to the
  authenticated owner.
