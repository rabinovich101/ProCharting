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

## Chart State Schema

`migrations/001_chart_layouts.sql` creates `public.chart_layouts`:

- `user_id` references `auth.users(id)`;
- `snapshot jsonb` stores the existing chart layout snapshot shape;
- `is_autosave` supports one current autosave row per user;
- Row Level Security policies restrict select/insert/update/delete to the
  authenticated owner.

Candles and live feed data should stay out of this table. They are market data
and should continue to reload from the price-data flow.
