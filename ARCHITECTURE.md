# ProCharting Architecture

## Recent Chart Interaction Note

Oscillator indicator panes are separate stacked canvases below the main
price canvas. Their mouse hover events feed the same ref-backed pane hover
state as the main chart canvas, keeping the TradingView-style vertical
crosshair synchronized across the full pane stack while horizontal value
guides remain scoped to the hovered canvas.

Visible oscillator indicator legend rows are portalled into each chart pane
stack and positioned from their lower-pane row refs. This keeps the compact
TradingView-style name/value/action label pinned to the top-left of the
indicator pane instead of floating inside the price pane legend layer.

## Overview

ProCharting is a next-generation financial charting library built for extreme performance. It leverages WebGPU compute shaders, multi-threading, and GPU-accelerated data processing to achieve 10x better performance than existing solutions.

## Core Architecture

### 1. Monorepo Structure

```
ProCharting/
├── packages/
│   ├── core/          # Main API and renderer orchestration
│   ├── prices/        # Provider-based market price client
│   ├── webgpu/        # WebGPU renderer with compute shaders
│   ├── webgl/         # WebGL 2.0 fallback renderer
│   ├── data/          # Data management and streaming
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Shared utilities
├── TEST/              # Standalone chart application and QA harnesses
└── benchmarks/        # Performance tests
```
















The runnable product app is `TEST/binance-chart-test`, a standalone Next.js
live-market chart application outside the pnpm workspace. It owns the browser
UI used for local QA and for the public VM deployment. The old
Vite package demo has been removed so it cannot be mistaken for the product
app.

The standalone app's root Next.js layout owns the browser analytics boundary.
It loads Google Analytics through Next's `Script` lifecycle with measurement ID
`G-HW6ZYLMS7C`, so site-wide page loads initialize `gtag` from the app shell
without coupling analytics to chart rendering or market-data code.

The standalone app also owns Symbol search metadata for Binance spot pairs.
Curated pairs and dynamically fetched `/api/binance/tickers` pairs are
normalized into `SymbolSearchOption` records in `app/page.tsx`. The
`/api/binance/tickers` route joins Binance exchangeInfo symbols with Binance's
public asset metadata so fetched pairs carry the base asset's official
`logoUrl`/`fullLogoUrl` when Binance publishes one. Those Binance image URLs
are exposed to the browser through the same-origin `/api/binance/asset-logo`
proxy, which only accepts `https://bin.bnbstatic.com/*` image sources. The
Symbol trigger and Symbol search result rows render that proxied logo when
available, fall back to the CoinCap slug URL pattern when needed, and keep the
generated color/initial badge as the final fallback for missing or failed icon
assets. The Symbol search exchange column also uses the same proxy to render
Binance's hosted exchange favicon instead of a generated letter badge, with
the letter kept as the fallback.

Canvas drawings in the standalone app are browser-local chart annotations, not
saved-layout state. `app/page.tsx` persists the `ChartDrawing[]` collection under
the standalone `procharting.drawings` localStorage key, hydrates it on page load,
and flushes the latest state during normal edits and browser refresh/pagehide.
Drawing anchors store price plus a market timestamp when candle data is
available; rendering and hit-testing remap that timestamp into the active
timeframe's candle index so annotations stay on the same levels when switching
intervals. Legacy anchors without timestamps still fall back to their saved
logical index and are upgraded once pane candles load.
Magnet mode is browser-local drawing interaction preference under
`procharting.drawingMagnetMode`. It does not create drawing records; it
snaps newly placed or edited anchors to visible candle OHLC values before
those anchors enter the existing `ChartDrawing` model. Weak magnet only snaps
near price bars, Strong magnet snaps to the nearest visible candle OHLC value,
and Ctrl/Cmd temporarily toggles magnet behavior while drawing or editing.
Saved chart layouts continue to own panes, symbols, intervals, indicators,
settings, theme, and view ranges, but they do not write or apply drawings. Older
layout JSON may still contain a legacy `drawings` snapshot; the app migrates
those drawings into `procharting.drawings` only when the standalone key does not
already exist, so deleted drawings are not resurrected from old layouts.

Active saved layout id is stored separately under
`procharting.activeChartLayoutId` so refresh restores same saved layout
snapshot. Layout indicators may carry optional `paneIndex`; missing
`paneIndex` remains legacy/global and renders on every pane, while newly
added indicators attach to active chart pane and are saved back into the
active layout immediately.

### 1.1 VM Deployment

The public app deployment for `procharts.thefiscalwire.com` serves the
standalone `TEST/binance-chart-test` Next.js app from the VM on
`127.0.0.1:3000`. Cloudflare Tunnel publishes that local service to the
subdomain without requiring inbound VM ports.

CI/CD is VM-local through a GitHub Actions self-hosted runner labelled
`procharts-vm`. Pushes to `main` run `.github/workflows/deploy-vm.yml` on that
runner, checkout the repository on the VM, and execute `scripts/deploy-vm.sh`.
The VM checkout uses `clean: false` because the production PM2 app serves from
the same worktree; deleting untracked runtime files such as `node_modules`
before the deploy script stops PM2 can break live requests mid-deploy.
The deploy script runs `npm ci` and `npm run build` inside
`TEST/binance-chart-test`, then restarts the `procharts-app` pm2 process with
`npm start -- -H 127.0.0.1 -p 3000`.
On the VM, `scripts/deploy-vm.sh` optionally sources
`/etc/procharts/app.env` before the build and PM2 restart. That file is
server-local and gitignored by location; it is reserved for app process
configuration such as `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. It must
not contain Supabase server secrets such as service-role keys, JWT secrets,
Postgres passwords, or OAuth client secrets.
The file is owned by `root:ooo` with mode `0640` so the self-hosted Actions
runner user can source it during deploy while other local users cannot read it.
VM deployment applies project Supabase migrations before PM2 is stopped when a
Supabase runtime exists at `PROCHARTING_SUPABASE_RUNTIME_DIR`, defaulting to
`/home/ooo/procharts-supabase/runtime`. App-only deployments without that runtime
skip this step by default; set `PROCHARTS_SUPABASE_MIGRATIONS=required` to fail
the deploy when the runtime is missing, or `false` to skip explicitly.
During VM deploy, app-local `.env.local` and `.env.production.local` files are
moved aside before the Next.js build so stale ignored dotenv files cannot
override `/etc/procharts/app.env` in production.
The deploy script stops the existing PM2 app before `npm ci` mutates
`node_modules`; this creates a short deployment interruption but avoids serving
requests from a process whose Next.js dependencies are being replaced.
It removes the app `node_modules`, runs `npm ci --prefer-online`, and fails the
deploy if the installed Next.js package is missing its server sandbox module.
The deploy script clears GitHub Actions' process-tracking environment before
starting PM2 so runner cleanup does not terminate the production app it just
launched.

The repository also has a root Docker packaging boundary for the standalone
Next.js chart app. `Dockerfile` builds `TEST/binance-chart-test` with the app's
existing package scripts and runs the production Next server on container port
`3000`; `docker-compose.yml` maps that service to host port `3000` for local
evaluation or self-hosted deployment. The container boundary is app-only: it
does not replace the internal `packages/*` library boundaries or the VM-local
pm2 deployment. Compose passes through only public Supabase browser
configuration variables so the app keeps the existing signed-out behavior when
account infrastructure is not connected.

The public README now documents Docker as the only setup path for repository
evaluation and self-hosting. Iframe embedding targets either the hosted
`https://procharts.thefiscalwire.com` app or an HTTPS URL in front of the
Docker-served app, and remains governed by the proprietary license.

### 1.2 Supabase Microservice Boundary

ProCharting now has a Docker-only Supabase infrastructure boundary under
`infra/supabase`. This is intentionally separate from the chart runtime so the
standalone Next.js app can keep its existing behavior until save/load calls are
explicitly migrated.

The Supabase runtime is generated into `infra/supabase/runtime`, which is
gitignored because it contains upstream Docker Compose files and generated local
secrets. The project-owned control surface is
`infra/supabase/scripts/supabase.sh`; it fetches the official Supabase
self-hosted Docker bundle, generates local secrets, and delegates operation to
the generated runtime's `run.sh`.

Project schema lives outside the generated runtime in
`infra/supabase/migrations`. The migration helper applies these SQL files to the
selected runtime database and sends `notify pgrst, 'reload schema';` afterward
so PostgREST refreshes table metadata after DDL. The first migration creates
`public.chart_layouts` for authenticated user-owned chart state. Layout
snapshots are stored as `jsonb` so the existing chart layout shape can evolve
without prematurely normalizing every UI setting. Candles and live feed data
remain outside this table and continue to come from the market-data flow.

Supabase Auth owns signup, login, credentials, identity-provider records,
sessions, password reset, and email verification in the `auth` schema. The
project-owned public auth surface is `public.user_profiles`, created by the
second migration. Each profile row is keyed to `auth.users(id)`, is created
automatically by an `auth.users` insert trigger, and stores only minimal
application profile data: display name, avatar URL, and timestamps.
Registration, invite, password recovery, and email-change messages are sent by
the Supabase Auth container through its `GOTRUE_SMTP_*` environment boundary.
Production uses Resend SMTP (`smtp.resend.com`, user `resend`, API key as the
SMTP password) with a verified `@thefiscalwire.com` sender. The Resend API key
is operational runtime state in the ignored Supabase `.env` as `SMTP_PASS`; it
is not exposed to the Next.js browser app or committed to the repository.

The `user_profiles` table enables Row Level Security and allows authenticated
users to select, insert, and update only their own profile row. User deletion
continues to be driven by Supabase Auth; public profile rows cascade when the
owning `auth.users` row is deleted.

The `chart_layouts` table references `auth.users(id)`, enables Row Level
Security, and adds owner-scoped select, insert, update, and delete policies.
The table also supports one `is_autosave` row per user for future current-state
autosave while still allowing named saved layouts.

The `user_session_activity` table records admin-visible session telemetry for
authenticated chart users. It references `auth.users(id)`, enables Row Level
Security, revokes direct browser-role grants, and is written only by the
server-side `/api/user-tracking` route after Supabase bearer-token validation.
It stores request IP/user-agent metadata, limited browser context, session
timestamps, and a HMAC fingerprint hash derived from a clearable browser device
marker instead of storing the raw marker.

The standalone `TEST/binance-chart-test` app now has a narrow browser auth
entry boundary for this Supabase-owned identity model. The header creates a
Supabase browser client only when `NEXT_PUBLIC_SUPABASE_URL` and either
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are
present. When those public env vars are absent, the app remains safely
signed-out and the auth dialogs report that accounts are not connected on that
deployment.

For the public VM deployment, the app domain also acts as the browser-facing
Supabase gateway. `TEST/binance-chart-test/next.config.ts` rewrites
`/auth/v1/*`, `/rest/v1/*`, `/storage/v1/*`, `/functions/v1/*`, and
`/realtime/v1/*` to the local Supabase Kong service at
`PROCHARTS_SUPABASE_PROXY_TARGET`, defaulting to `http://127.0.0.1:8000`.
This lets Cloudflare Tunnel continue publishing a single
`https://procharts.thefiscalwire.com` origin while Supabase Auth callbacks use
the same public domain. Production Supabase must therefore set its public auth
URL values to that HTTPS app origin, and Google/GitHub OAuth must allow
`https://procharts.thefiscalwire.com/auth/v1/callback`.
If `/auth/v1/settings` reports `external.github: true` and `/auth/v1/authorize`
redirects to GitHub with that callback URL, GitHub's
`redirect_uri is not associated with this application` page is owned by the
GitHub OAuth App callback setting, not by the Next.js auth dialog or the
Supabase runtime.
The generated production Supabase runtime lives outside the GitHub Actions
runner checkout at `/home/ooo/procharts-supabase/runtime`. Keeping Docker-owned
volumes out of the repository worktree prevents `actions/checkout` cleanup from
touching root-owned runtime files during VM deploys.
Social provider enablement for that production runtime is operational state in
`/home/ooo/procharts-supabase/runtime/.env` plus the generated runtime's Auth
container environment passthrough. A production
`Unsupported provider: provider is not enabled` response from
`/auth/v1/authorize` means the same-domain Supabase proxy is reachable, but the
requested provider is disabled or missing inside the Auth container. The
repository helper `infra/supabase/scripts/supabase.sh oauth-status` checks the
non-secret `/auth/v1/settings` payload so VM changes can verify that Google or
GitHub is enabled before browser OAuth testing.

The auth dialogs support email/password plus Supabase OAuth entry points for
Google and GitHub. Social signup and login share Supabase's
`signInWithOAuth` provider flow, so Google/GitHub buttons appear in both dialog
modes and redirect through the configured Supabase Auth provider when the
deployment has the public Supabase env vars and provider credentials.
The standalone app also has a server-rendered owner admin boundary. `/admin`
renders the visible username/password entry page. `/admin/login` validates
credentials server-side, rate-limits repeated failures by client/username, and
sets a signed HTTP-only admin session cookie scoped to `/admin` on success.
`PROCHARTS_ADMIN_USERNAME` and `PROCHARTS_ADMIN_PASSWORD` remain the bootstrap
credential source. After an admin changes the password from
`/admin/settings`, the app writes a salted scrypt password hash to a
server-only credential file, defaulting to
`$HOME/.procharts/admin-credentials.json` unless
`PROCHARTS_ADMIN_CREDENTIALS_FILE` points elsewhere. Once that file exists, it
is the active password source and the env password is no longer accepted by the
login form. Private admin pages and admin route handlers verify the signed
session server-side against the active credential source, while middleware only
adds no-store cache headers for `/admin/*`; this keeps mutable password state in
Node server code instead of middleware. `/admin/settings` provides the
authenticated password-change form and refreshes the session cookie after a
successful change. `/admin/users` lists Supabase Auth users through
`supabase.auth.admin.listUsers` with a server-only service-role key, then joins
matching `public.user_profiles`, `public.chart_layouts`, and recent
`public.user_session_activity` rows for profile, saved-layout, and login/session
activity. `user_session_activity` is created by the third project migration and
records Supabase session identifiers, login IP, last IP, IP header source,
user-agent, limited browser context, sign-in/sign-out timestamps, and a
server-side HMAC fingerprint hash. The browser sends a clearable local device
marker to `/api/user-tracking`; that route validates the Supabase bearer token,
captures IP/user-agent metadata on the server, hashes the marker with
`PROCHARTS_TRACKING_SALT` when configured or the service-role key fallback, and
writes through the service-role boundary. The raw device marker is not stored in
Postgres, and the tracking table has RLS enabled with direct anon/authenticated
grants revoked. If the telemetry table is missing from PostgREST's schema cache,
the admin users page keeps account rows visible and shows a migration-needed
warning instead of raw Supabase internals. The users route is disabled until the app runtime has valid
admin credentials, `SUPABASE_SERVICE_ROLE_KEY`, and either `SUPABASE_URL` or
`NEXT_PUBLIC_SUPABASE_URL`. The privileged key remains server runtime state; it
must not be copied into `NEXT_PUBLIC_*` variables or exposed to browser code.
The admin panel presentation now uses a shared server-component shell in
`TEST/binance-chart-test/app/admin/admin-shell.tsx`. Authenticated admin pages
compose that shell with a reusable top navigation and page hero, while the
login page reuses the same visual design tokens without rendering protected
navigation. This keeps future admin sections aligned to the same chrome without
moving admin auth or Supabase service-role logic into client-side code.
On the production VM, `/etc/procharts/app.env` sets the admin route's
server-only `SUPABASE_URL` to the local Supabase Kong gateway at
`http://127.0.0.1:8000`, while browser auth keeps using the public same-domain
Supabase URL through `NEXT_PUBLIC_*` variables.
For the local Docker Supabase runtime, the browser app reads
`NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_ANON_KEY` or
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the standalone app's ignored
`.env.local`, while Google/GitHub provider credentials stay in the ignored
`infra/supabase/runtime/.env` file and are passed into the Supabase Auth
container through the matching `GOTRUE_EXTERNAL_*` Docker Compose environment
entries.
Provider brand icons for those auth buttons are static public app assets under
`TEST/binance-chart-test/public/auth`, served by Next.js as `/auth/*.svg`.
They are presentation-only assets and do not change the Supabase auth boundary
or provider configuration.

The auth dialogs also own the browser-only password UX guardrail before
signup is sent to Supabase Auth. Signup shows a password standard declaration,
live missing-rule checklist, show/hide password control, and a Web
Crypto-backed generated-password button. This client-side validation blocks
weak signup submissions early for usability, but Supabase Auth remains the
credential authority for server-side account creation, password storage,
hashing, sessions, email verification, reset flows, and OAuth identity state.
Login stays permissive beyond non-empty email/password so existing users are
not locked out by newer signup policy.

Signed-out users are allowed to use the public chart exploration surface:
loading charts, changing/searching pairs, changing timeframe, switching chart
type, using indicators, panning/zooming, fullscreen, and resetting view.
Account-dependent productivity and sharing actions remain gated behind a
Supabase session: indicator templates, layout setup and saved layouts, chart
settings, snapshots, alerts, bar replay, save, broker trading, and publishing.

### 1.3 Repository Licensing

ProCharting is proprietary software and is not open-source or free-to-use. The
root repository license is the source-of-truth all-rights-reserved notice.
The root GitHub install facade and each distributable `@procharting/*`
workspace package use `SEE LICENSE IN LICENSE` package metadata and carry a
package-local `LICENSE` file so packed artifacts retain the proprietary terms.
Private harness packages, such as the standalone Next.js QA app and benchmarks,
use `UNLICENSED` metadata to avoid implying public reuse rights.

Installation instructions describe package mechanics only. Production use,
commercial use, redistribution, SaaS use, hosted use, or embedding ProCharting
inside another product or service requires prior written permission and a valid
paid license from Oleg Rabinovich.

### 2. Verification Tooling

The root TypeScript config is a solution-style project that references the package
projects and does not include generated outputs as root source files. Root verification
uses package-level TypeScript configs for library packages, the standalone Next test app
config for `TEST/binance-chart-test`, and typed ESLint only over package `src` folders
plus the test app `app` folder.

GitHub Actions pins pnpm to the repository package-manager version. Install, build, and
test are blocking CI checks. Typecheck and lint currently run as audit checks because
the legacy source has known issues that are tracked in `todo.md`.

Source typechecking resolves workspace package imports to `packages/*/src` through
the root TypeScript path aliases. Generated `dist/` outputs and `.tsbuildinfo` files
are build artifacts, not source-of-truth architecture inputs. The current source
baseline passes `pnpm typecheck`; lint still surfaces broader legacy cleanup debt.

Workspace packages are local source packages until they are explicitly published.
As of May 31, 2026, npm registry lookups for `@procharting/core` and
`@procharting/prices` return `E404`, so public registry install commands are
post-publication instructions rather than the current development path.
Authenticated publish attempts also require the `@procharting` npm scope to
exist and be writable by the publishing account; npm currently returns
`E404 Scope not found` for package publish attempts and `E403` for org/team
inspection with the current `.env` npm token.

The repository root also acts as a narrow GitHub-install facade named
`procharting`. Package managers install the repository root for a dependency
like `github:rabinovich101/ProCharting`, so the root package builds a
self-contained ESM chart facade under `dist/` for `procharting` and exposes the
built price client at `procharting/prices`. This facade is intentionally
separate from the internal workspace package names: workspace development and
eventual npm publishing still use the `@procharting/*` package boundaries, while
direct GitHub consumers use the root `procharting` import. Installing only
`#path:/packages/core` is not a supported direct GitHub path because the
subpackage depends on sibling workspace packages through `workspace:*`.

`@procharting/core` builds its runtime ESM output with Vite and then removes the
package `.tsbuildinfo` file before emitting TypeScript declarations with
`tsc --emitDeclarationOnly`. This keeps Vite's cleaned runtime output and the
package `types` entry in sync for npm publication.

The core renderer factory lazy-loads WebGPU and WebGL packages when those
renderers are explicitly requested. The wrappers do not expose the concrete
renderer to the render loop until their async `initialize(canvas)` call
completes, so explicit GPU renderers cannot be called while their
device/context fields are still unset.

The standalone `TEST/binance-chart-test` app owns its own Playwright e2e
harness under `tests/e2e`. The harness runs the Next dev server on
`127.0.0.1:3100`, forces Supabase public env vars empty for deterministic
signed-out auth coverage, mocks `/api/binance` candle responses, and replaces
the browser Binance WebSocket with a local no-op socket before the app boots.
This keeps signup/login entry tests and public chart-control tests independent
from live Binance and external Supabase projects. The Playwright web server
starts plain `next dev` directly rather than the app's Turbopack `npm run dev`
script because local Turbopack startup can fail before tests with transient
`.next` manifest files missing.

As of May 31, 2026, the automatic renderer path selects Canvas2D because it is
the complete package-rendering path used by the runnable chart app. The WebGPU
and WebGL packages remain available behind explicit renderer selection while
their full data upload and draw paths continue to mature.

### 3. Renderer Architecture

The library uses a pluggable renderer architecture with three implementations:

#### WebGPU Renderer (Primary)
- Compute shaders for data decimation
- GPU-based viewport culling
- Multi-sample anti-aliasing (MSAA)
- Parallel data processing

#### WebGL 2.0 Renderer (Fallback)
- Instanced rendering
- Transform feedback
- Vertex array objects
- Texture atlases
- Multisample color renderbuffers match the default framebuffer alpha/format
  choice so MSAA resolves can blit without WebGL format-mismatch warnings.

#### Canvas2D Renderer (Compatibility)
- Software rendering fallback
- Draws candlestick, line/area, and bar/volume series from the render scene's
  source data.
- Draws a TradingView `grid3`-style single-pane chart grid using an 80px
  preferred right price axis that can compact to 72px, a 28px bottom time axis,
  32-40px target horizontal gridline spacing, nice price/time ticks, clipped
  plot-pane series drawing, candle volume overlay, current-price dotted line
  with right-axis marker, plot-only crosshair price/time axis labels, a
  top-left OHLC/volume legend, and hover-revealed bottom
  zoom/scroll/reset/latest controls.
- Uses shared grid geometry in `packages/core/src/grid-layout.ts` so Canvas2D
  drawing and pointer hit-testing agree on plot, price-scale, time-scale,
  bottom-control, and axis-corner areas.
- Plot and time-axis drags pan the time range without mutating pane geometry.
  Price-axis vertical drags scale the Y range without resizing the chart pane.
- Honors light, dark, and custom chart theme tokens when building the render
  scene for the Canvas2D path.
- Maximum compatibility

`tradingview_grid3.json` is the current external reference for TradingView-like
chart-grid behavior and now drives the Canvas2D single-pane runtime contract for
the measured areas: right price-scale auto sizing between 72px and 80px,
horizontal no-op price-axis drags, mouse-anchored vertical price-axis scale
drags, plot-only crosshair labels, denser horizontal gridline spacing, candle
body sizing from logical bar spacing, volume overlay height, current-price
marker alignment, and pixel/price/time formulas.

`ChartOptions.grid` exposes the implemented grid knobs for consumers:
`priceScaleWidth`, `minPriceScaleWidth`, `timeScaleHeight`, minimum plot
dimensions, `rightOffsetBars`, `horizontalGridLineSpacing`, bottom controls,
and legend visibility. The defaults follow the verified `tradingview_grid3.json`
single-pane measurements. Multi-pane splitters and pane maximize/minimize
remain intentionally outside the runtime contract until the JSON's
live-inspection-only areas are verified.

### 4. Data Pipeline

```
Raw Data → Binary Encoding → GPU Buffer → Compute Shader → Decimation → Rendering
```

**Key Components:**

1. **Binary Encoding**: Compact data representation (< 100 bytes/point)
2. **Ring Buffers**: Zero-copy streaming updates
3. **GPU Decimation**: Douglas-Peucker algorithm in compute shaders
4. **LOD System**: Automatic level-of-detail based on zoom

The public chart `CandlestickData` contract uses six numeric fields: `time`,
`open`, `high`, `low`, `close`, and `volume`. The binary chart pipeline writes
all six fields into fixed-width candle records, so consumers should pass
`volume: 0` when their market data source has no volume.

Canvas2D time-axis rendering accepts millisecond Unix timestamps as the primary
contract and still normalizes legacy second-based timestamps for compatibility.
The standalone chart app consumes millisecond timestamps from its Binance data
flow so the public data contract is exercised directly.

`@procharting/core` render scenes currently carry both `sourceData` and binary
series buffers. Canvas2D renders directly from `sourceData` to preserve
timestamp precision and keep the runnable chart app usable, while the binary
buffer remains the handoff shape for GPU-oriented renderer work.

### 5. Price Data Package

`@procharting/prices` is a publishable package boundary for market data access.
It is intentionally separate from the rendering packages and from
`@procharting/data`, which remains focused on binary buffers, decimation,
encoding, and streaming internals.

The public API is centered on:

```typescript
import { createPriceClient } from '@procharting/prices';

const client = createPriceClient({
  symbol: 'AAPL',
  provider: 'default',
});

const candles = await client.getPrices({ interval: '1d', limit: 30 });
```

Provider architecture:

- `CustomPriceProvider` wraps user-supplied `pricesApi` functions.
- `DefaultPriceProvider` uses a no-key Stooq CSV adapter for daily, weekly, and
  monthly historical candles.
- `TradingViewMcpProvider` is an adapter-only integration. TradingView MCP tools
  may exist in Codex or another MCP runtime, but they are not a stable npm
  runtime dependency for all end users.

The default provider keeps its public fetch override portable by passing request
URLs as strings. This avoids leaking DOM-only `URL` or `RequestInit` globals into
the published TypeScript declarations, so Node-style consumers can import the
package without enabling DOM libs just for package types.

All providers normalize to:

```typescript
type PriceCandle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type LatestPrice = {
  symbol: string;
  price: number;
  timestamp: number;
  source: string;
};
```

The package builds ESM, CommonJS, and TypeScript declaration outputs under
`packages/prices/dist`. The CommonJS output includes a nested package metadata
file so `require('@procharting/prices')` works even though the package root is
`type: module`.

When verifying repacked local tarballs with Yarn 1, use a fresh tarball path or
clear the Yarn cache. Yarn 1 may reuse a cached `file:` tarball when the package
name, version, and filename are unchanged, which can make declaration checks read
stale package contents even after `npm pack` produced a correct tarball.

### 6. Chart Test App

`TEST/binance-chart-test` is a standalone Next.js app used for visual browser
verification of a live Binance market chart. Its main chart route lives in
`TEST/binance-chart-test/app/page.tsx`, the Binance REST candle proxy lives in
`TEST/binance-chart-test/app/api/binance/route.ts`, and the live spot ticker
universe is exposed through `TEST/binance-chart-test/app/api/binance/tickers/route.ts`.

As of May 31, 2026, this app draws its chart directly with Canvas 2D inside the
client component. It does not instantiate `@procharting/core` or the WebGPU/WebGL
renderer factory path. The app is therefore a live chart UX and QA harness rather
than a direct example of the packaged renderer architecture.

The standalone app's TradingView-style desktop Layout setup control is also a
local QA-harness feature. The right-side layout panel defines grouped split
layouts in `app/page.tsx`; selecting one applies the same grid definition to the
chart stage. Every visible layout cell renders through the shared `ChartPane`
component and owns an indexed chart session: symbol, timeframe, candles,
loading/error state, live-feed status, crosshair, drag state, logical view
range, and manual price range. Clicking any pane makes it the active pane; the
top command-bar symbol and timeframe controls then update that pane only unless
the corresponding layout sync toggle is enabled. New panes still start as copies
of the active pane, then diverge independently after selection. A single Binance
websocket subscribes to the unique streams required by visible panes and routes
incoming klines to matching pane sessions. Indicator legend popovers remain
targeted by pane index and indicator id so shared overlay controls do not open
the same menu in every pane. These split-pane behaviors remain local to the QA
harness and do not change packaged renderer contracts.

The chart app supports:

- Binance spot symbols loaded from Binance `exchangeInfo`, filtered to trading
  spot symbols, with curated favorites retained as labels/colors and offline
  fallback.
- Binance spot symbols selected from a compact top command-bar dropdown.
- Timeframes `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`, `1w`, and `1M`,
  exposed through a compact custom toolbar dropdown that keeps the selected
  value short on mobile.
- Candlestick, line, and area drawing modes, exposed through a compact custom
  toolbar dropdown with icon-style glyphs. Unsupported chart types are not
  shown.
- A TradingView-style Indicators picker with search, built-in category filters,
  active count, and support for the app's local technical-indicator registry:
  Volume, SMA, EMA, Bollinger Bands, VWAP Session, RSI, MACD, Stochastic,
  Donchian Channels, WMA, Momentum, Rate of Change, Accumulation/Distribution,
  ATR, Bollinger %B, and Bollinger BandWidth.
- Header command SVG icons are registered in the local `HeaderIcon` map in
  `app/page.tsx`; shared toolbar, left-rail, and icon-picker styling in
  `app/globals.css` standardizes stroke weight, hover plates, and active states
  around that local map plus `lucide-react` controls. Chart-style selector
  glyphs remain CSS-drawn per option in `app/globals.css`.
- The drawing Icons tab catalog in `app/icon-data.ts` is generated by
  `scripts/gen-icon-data.mjs` from `@phosphor-icons/core` regular SVG
  assets. The generator scales Phosphor's 256 viewBox paths into the app's
  existing 0 0 24 SVG contract and preserves stable `icon:` glyph ids for
  saved drawings.
- Header modals, including Symbol search, are fixed descendants of the top
  command bar. The top bar's stacking context intentionally sits above
  chart-stage controls so modal backdrops cover the authenticated drawing-tool
  rail instead of allowing left-side tools to paint over dialogs.
- The chart stage owns a TradingView-style top-left DOM instrument/OHLC overlay
  synced to the latest candle or the candle under the crosshair. The canvas no
  longer paints that instrument row directly, which keeps the white-rectangle
  OHLC area crisp and readable over the dark grid. The canvas plot/grid begins
  at the top of the chart stage behind this overlay instead of reserving a blank
  legend strip, matching TradingView's floating-legend layout.
- Chart canvas layout keeps an internal left plot gutter inside the chart layer
  so moving candle, grid, drawing, volume, indicator, and crosshair lines start
  away from the drawing-tool rail boundary, matching TradingView's visual
  separation without making the outer rail/chart CSS layers overlap.
- The chart stage also owns the authenticated TradingView-style drawing-tool
  rail. As of June 23, 2026, that rail is a dedicated chart-stage CSS grid
  column: signed-in chart grids render beside it instead of underneath it,
  while signed-out chart grids keep a single full-width column. Logged-in users
  get the recorded Cursor group with Cross/Dot modes and
  the Trend Line Tools group with implemented Trendline, Ray, Info line,
  Extended line, Trend angle, Horizontal line, Horizontal ray, Vertical line,
  Cross line, Parallel channel, Regression trend, Flat top/bottom, and Disjoint
  channel tools, plus a Brushes/Arrows/Shapes group with Brush, Highlighter,
  Arrow marker, Arrow, Arrow mark up/down, Rectangle, Rotated rectangle, Path,
  Circle, Ellipse, Polyline, Triangle, Arc, Curve, and Double curve. Enabled
  drawing tools can also be activated from their advertised keyboard shortcuts
  when focus is not in an editable field. Drawing anchors are stored as logical
  bar index plus price plus an optional candle timestamp; timestamped anchors are
  remapped to the active timeframe before drawing, hit-testing, statistics,
  VWAP/profile calculations, and coordinate labels. Horizontal line,
  Horizontal ray,
  Vertical line, and Cross line use one anchor; Trendline, Ray, Info line,
  Extended line, and Trend angle use two anchors; Parallel channel, Regression
  trend, and Flat top/bottom use three anchors; Disjoint channel uses four
  anchors. Shape tools use the same anchor model: Brush/Highlighter sample
  anchors while dragging, Path/Polyline collect variable anchors until Escape,
  double-click, or their cap, marker arrows use one anchor, Arrow,
  Rectangle/Circle/Ellipse use two anchors, Rotated rectangle/Triangle/Arc/Curve
  use three anchors, and Double curve uses four anchors. Ray renders from its
  origin through the second anchor and extends to
  the chart boundary in that direction without storing an extra synthetic
  endpoint. Extended line renders the same two anchors infinitely in both
  directions, while one-anchor line tools render full-width/full-height guide
  segments from their anchor. Channel drawings render their rails from shared
  segment geometry and shape drawings use shared canvas-space polygon, curve,
  ellipse, and polyline hit-test helpers so canvas drawing, hit-testing, text
  placement, and body drag agree on the same visible shape.
  The left drawing rail also has a TradingView-style Icons group after the Text
  and notes / Content annotation tools. Its menu keeps the emoji-first
  bottom-tab pattern for Emojis, Stickers, and Icons, and creates a one-anchor
  `emoji` drawing whose selected glyph is stored in the existing drawing `text`
  field. Emoji drawings reuse the text drawing render, hit-test, selection,
  floating-toolbar, and browser-local persistence paths rather than introducing
  a separate storage boundary.
  A standalone Measure ruler button follows the Icons group in the left
  rail. A same-slot Zoom in button follows Measure, enters a one-shot
  marquee mode, zooms the active pane to the dragged box on release, clears
  its active state, then shows a left-rail Zoom out button underneath while
  a pre-zoom view is available to restore. Magnet mode follows Zoom in on the
  left rail and opens a menu with Off, Weak magnet, and Strong magnet choices
  without changing selected drawing tool.
  Measure creates a two-anchor
  `measure` drawing that reuses the same logical-index,
  price, timestamp, persistence, hit-test, and drag infrastructure as the other
  drawing objects, while rendering with a TradingView-like blue measured range:
  translucent rectangle, dashed endpoint guides, price/time axis labels, and a
  compact readout for price change, percent, bar/time span, and range volume.
  Drawings are rendered in the main price-pane canvas pass, and selected
  drawings show a DOM floating toolbar with working TradingView-like quick
  controls for templates, line color, opacity, text, line width, line style,
  arrow ends, settings, local alert state, lock/unlock, delete, and more
  actions. For two-anchor drawings, the Settings action opens a TradingView-like
  floating object dialog with Style, Text, Coordinates, and Visibility tabs; the
  Style tab owns Trendline extension, midpoint, price-label, and stats controls,
  while Coordinates edits anchor price before bar to match TradingView's
  property dialog. Drawing text uses the saved vertical alignment as a
  line-relative placement: Top and Bottom offset the label along the rendered
  segment's perpendicular direction and clamp it inside the plot area, so text
  entered in the Text tab can sit above a sloped Trendline or Ray instead of
  only moving upward on the screen. Pointer hover state also records unlocked
  drawing body and handle hits, showing a hand cursor over a movable line body,
  a pointer over movable handles, and a grabbing cursor during the active move.
  The abstract
  selected-toolbar glyphs use Lucide React icons so actions like lock, delete,
  alert, settings, and overflow read as familiar tool icons instead of bespoke
  CSS drawings. The More action opens a TradingView-style context menu with
  grouped rows for visual order, interval visibility, clone/copy shortcuts,
  mutually exclusive sync scope, and hide/show; visual order and interval
  visibility use flyout submenus so the top-level dots menu stays compact. The
  selected-object toolbar is positioned near the top of the plot pane by
  default, can be moved by dragging its far-left handle, and does not follow the
  selected drawing as it is dragged or resized. Drawing objects store
  visibility, interval and per-timeframe visibility, line style, opacity,
  Trendline extension, arrow-end choices, formatted text, middle-point,
  price-label, stats-label, alert configuration, and local sync flags in
  addition to anchors/color/width. Hidden or interval-filtered drawings
  do not render or participate in hit-testing, while the currently selected
  object can still keep its toolbar open for correction. Locked drawings stay
  visually solid and remain selectable, but do not respond to drag/resize
  gestures and cannot be deleted until unlocked again. Signed-out users do not
  render the rail, drawing pixels, selected-object toolbar, or drawing
  hit-testing. Drawings are scoped to pane index and do not alter candle,
  indicator, or renderer package contracts.
- Active indicators are stored as registry-backed instances with mutable
  settings. HTML legend/action rows mirror the canvas visual layout: price
  overlays sit under the instrument/OHLC row, volume controls sit over the
  main price pane's lower volume overlay band, and oscillator controls sit
  over their lower panes. Rows stay
  compact by default and expand on desktop hover/focus/open states to expose
  controls for hide/show, settings, remove, duplicate, and ordering actions.
  Ordering actions are scoped to the row's current visible legend group, so
  lower-pane indicators move relative to other oscillator panes instead of
  stepping invisibly through price/volume indicators. The price-overlay legend
  stack is height-bounded and scrollable so many active overlays cannot cover
  lower-pane indicator controls.
  Settings such as length, source, standard deviation, MACD fast/slow/signal,
  MACD oscillator/signal MA type, primary/secondary/tertiary series colors,
  Bollinger fill color, Stochastic %D color, volume down color, and MACD
  histogram positive/negative colors update the active instance and redraw the
  chart. Indicator series are cached per pane by candle-array reference and
  active-indicator state, so hover-only `mousePos` updates can refresh legend
  values for the snapped candle without recomputing every indicator from the
  full candle history.
- Selected price overlays participate in automatic Y-range fitting and draw on
  the main price pane. Volume draws in a TradingView-style bottom overlay band
  inside the main price pane and does not reserve a separate row; oscillator
  indicators draw in compact lower panes with guide lines and right-side value
  labels. Lower-pane headers are DOM legend/action rows that reuse the same
  per-candle legend-value extraction, so MACD line, signal, and histogram
  values update to the candle under the crosshair without recalculating the
  indicator series during hover.
- Oscillator indicators now render as separate stacked indicator canvases
  below the main price canvas inside each standalone chart layout cell. Thin
  row-resize handles adjust adjacent stack percentages locally, so lower
  indicators can be resized TradingView-style without changing saved layout
  schema, chart drawing storage, or package renderer contracts. Lower-pane
  indicator canvases reuse the main chart time scale and draw the shared time
  axis on the bottom indicator pane when oscillator panes are present.
- Dark/light UI themes.
- TradingView-style chart scale behavior: interval-specific default bar density,
  a small right-side future offset, semantic time-axis ticks, pixel-targeted
  nice price ticks, a dotted current-price guide with a right-axis marker,
  cursor-anchored wheel zoom, center-anchored left-rail zoom button,
  horizontal/Shift-wheel timeline pan, reset, crosshair, DOM-rendered
  high-contrast OHLC overlay, and responsive desktop/tablet/mobile
  layouts.
- TradingView-style right price-scale interaction: the right axis is a distinct
  pointer hit area, vertical axis drags create a manual Y range anchored to the
  pointer price, and plot drags can pan that manual price range vertically until
  reset or market reload re-enables automatic Y fitting.
- TradingView-style future time panning: the chart view is modeled as logical
  bar slots rather than only `candles.slice(start, end)`, so horizontal pan and
  wheel zoom can preserve empty future slots to the right of the latest candle
  while candles, gridlines, crosshair labels, and time labels stay aligned.
  Wheel and drag gestures may leave the logical range on fractional slots, so
  timeline tick generation converts slot positions into interpolated candle
  timestamps instead of indexing the candle array directly.
- TradingView-style mobile touch navigation: the chart canvas owns touch
  gestures with `touch-action: none`. One-finger touches on the plot or bottom
  time scale pan the existing logical `viewRange` horizontally, while
  two-finger pinches update `candlesPerView` around the pinch midpoint so
  candles get visually larger or smaller without handing the gesture to page
  scroll or browser zoom.
- Pane-aware crosshair geometry: `drawChart` records the main price pane,
  volume band, oscillator panes, and bottom time scale in each pane's
  interaction bounds. Pointer hit testing treats visible lower panes as chart
  plot areas, so the dotted vertical crosshair follows the cursor through every
  visible canvas pane while the horizontal price guide and price label remain
  scoped to the main price pane.
- TradingView-style magnet hover: raw pointer coordinates are kept in a
  ref-backed pane hover state, then re-snapped against the latest chart
  bounds/view range when the canvas or DOM legends read them. The canvas
  animation loop reads that ref directly for crosshair drawing, while React
  receives a coalesced legend refresh only when the snapped candle index
  changes. This keeps crosshair movement fast and lets the OHLC row, indicator
  legend, and volume-pane label use the same candle under the crosshair without
  mutating `chartPanes` on every pointer event. Pan, wheel zoom, and price-scale
  drag continue to use continuous pointer deltas because those gestures change
  chart view/range state.
- The canvas exposes non-visible `data-*` diagnostics for browser QA/devtools
  inspection of pointer area, drag mode, logical view range, and manual price
  bounds. These attributes are not part of the end-user visual surface, and
  logical range counters are not painted into the chart canvas.

As of June 4, 2026, the chart test app uses a TradingView-style single top
command bar rather than separate instrument and control blocks. That command
bar owns the symbol search trigger/dialog, live-feed dot, timeframe dropdown,
chart-style icon dropdown, Indicators menu, indicator-template button, Alert/Replay
buttons, disabled undo/redo placeholders, and a desktop right-side control
cluster for layout, save/menu, quick search, settings, fullscreen, snapshot,
Trade, and Publish. The header no longer duplicates latest price/change data;
market values live in the chart legend and current-price axis marker. There is
no separate market status strip below the command bar; chart diagnostics remain
in non-visible `data-*` attributes for QA/devtools inspection.

The command bar's desktop icon tools implement TradingView-like local behavior:
the symbol trigger opens a centered TradingView-style symbol search dialog with
focused query input, category pills, Binance-market rows, and click-to-select
updates against the active chart pane's `symbol` state; indicator templates first
open the compact TradingView-style Save/Open menu and
then route to persisted template save/apply surfaces, layout setup is a fixed
right-side panel with chart-count/sync options, the save caret opens a layout
management menu with local saved chart layouts, quick search opens a command
dialog that can route to toolbar menus and actions, chart settings expose local
status-line/grid/current-price/crosshair/theme/volume toggles plus Symbol rows
for candle body/borders/wick/data/precision/timezone/template, fullscreen is a
direct document fullscreen toggle, and snapshot opens a menu for download,
clipboard, link, new-tab, and Tweet actions. Alert and Replay open
TradingView-like feature/sign-in dialogs, Save opens a persisted chart-layout
dialog, Trade opens a broker-selection dialog, and Publish opens the compact
idea/video/note menu. Undo and redo intentionally remain disabled in the
clean-chart state, matching TradingView before chart history is created.

Saved chart layouts in the standalone QA app persist to browser `localStorage`
under `procharting.chartLayouts`. Each saved layout stores the selected split
grid, active pane index, layout sync toggles, chart style, theme, chart settings,
active indicator instances, authenticated drawing objects, and per-pane symbol,
interval, manual price range, and logical view range. Authenticated drawing
snapshots include anchors, lock/visibility, line color/opacity/width/style,
arrow ends, text formatting, price-label and stats-label settings, alert
configuration, interval/per-timeframe visibility, and local sync flags. Candles,
live feed status, pointer/crosshair state, drawing rail/menu/cursor mode,
selected-toolbar popover state, drawing-toolbar position, pending drawing state,
and drag state are intentionally excluded so restoring a layout recreates fresh
pane sessions and reloads market data through the existing Binance REST and
websocket pipeline. This keeps the client-side store small while preserving a
plain JSON snapshot shape that can move to a server-backed chart-layout table
later.
When the saved-layout store is missing or corrupt, the app seeds a first-run
saved layout named `Default` and makes it active. That default snapshot uses the
single-chart grid, the light canvas theme, candlestick style, existing indicator
and chart-setting defaults, `BTCUSDT`, and the `1d` timeframe.

Historical candles are loaded through the local API route, which validates symbol
and interval inputs before proxying Binance klines. Live updates use a persistent
Binance websocket with `SUBSCRIBE` and `UNSUBSCRIBE` messages so changing symbols
or timeframes does not churn browser websocket connections.

The reusable browser QA checklist for this app is
`TEST/binance-chart-test/CHART_QA.md`.

The test app owns a local ESLint config so `next build` resolves its TypeScript
project from `TEST/binance-chart-test` instead of inheriting root workspace
parser paths relative to the wrong working directory.

### 7. Multi-Threading Strategy

```
Main Thread          Render Thread         Data Thread         Network Thread
    │                     │                     │                    │
    ├─ UI Events          ├─ GPU Commands       ├─ Processing       ├─ WebSocket
    ├─ API Calls          ├─ Draw Calls         ├─ Aggregation      ├─ Streaming
    └─ Coordination       └─ OffscreenCanvas   └─ Decimation       └─ Compression
```

### 8. Memory Management

- **SharedArrayBuffer**: Zero-copy data sharing between threads
- **Memory Pools**: Object recycling to minimize GC pressure
- **Ring Buffers**: Efficient streaming data management
- **GPU Memory**: Direct buffer management with resource pooling

## Performance Optimizations

### 1. GPU Compute Shaders

```wgsl
// Example: Parallel data decimation
@compute @workgroup_size(64)
fn decimate(@builtin(global_invocation_id) id: vec3<u32>) {
  // Process data points in parallel
  let index = id.x;
  if (index >= params.inputSize) { return; }
  
  // Apply decimation algorithm
  // ...
}
```

### 2. Data Structures

- **Columnar Storage**: Cache-friendly memory layout
- **Binary Format**: Compact representation
- **Typed Arrays**: Direct memory access
- **Bit Packing**: Maximize data density

### 3. Rendering Pipeline

1. **Frustum Culling**: Skip off-screen data
2. **Occlusion Culling**: Skip hidden elements
3. **Batch Rendering**: Minimize draw calls
4. **Instancing**: Render repeated elements efficiently

## API Design

### TypeScript-First

```typescript
// Perfect type inference
const chart = createChart<MyDataType>(container, {
  series: [{
    type: 'candlestick',
    data: [] as CandlestickData[], // Full type safety
  }]
});

// Event handling with discriminated unions
chart.on('click', (event) => {
  event.series; // Fully typed based on series type
});
```

### Developer Experience

- Zero configuration required
- Automatic renderer selection
- Progressive enhancement
- Tree-shakeable architecture

## Future Enhancements

### Phase 1: Core Features (Current)
- ✅ Functional Canvas2D renderer for the chart app
- [ ] Complete WebGPU/WebGL2 data upload and draw paths
- ✅ Basic chart types
- ✅ Type-safe API
- ✅ Performance benchmarks

### Phase 2: Advanced Features
- [ ] Real-time WebSocket integration
- [ ] AI pattern recognition
- [ ] Advanced gesture support
- [ ] Custom series API

### Phase 3: Optimization
- [ ] WebAssembly modules
- [ ] SIMD optimizations
- [ ] Advanced caching
- [ ] Predictive rendering

### Phase 4: Ecosystem
- [ ] Plugin system
- [ ] Theme marketplace
- [ ] Cloud integration
- [ ] Mobile SDKs

## Technical Decisions

### Why WebGPU?
- Compute shaders enable GPU-based data processing
- Direct memory access reduces overhead
- Parallel processing for millions of points
- Future-proof technology

### Why TypeScript?
- Type safety prevents runtime errors
- Better developer experience
- Self-documenting code
- Tree-shaking optimization

### Why Monorepo?
- Shared dependencies
- Atomic commits
- Easier refactoring
- Consistent tooling

### Why Zero Dependencies?
- Smaller bundle size
- No version conflicts
- Better performance
- Full control

## Benchmarking

Current performance vs TradingView lightweight-charts:

| Operation | ProCharting | lightweight-charts | Improvement |
|-----------|-------------|--------------------|-------------|
| Initial Render | < 16ms | ~80ms | 5x |
| Pan/Zoom | < 0.5ms | ~5ms | 10x |
| Updates/sec | 10,000 | 1,000 | 10x |
| Memory/point | < 100B | ~200B | 50% |

## Security Considerations

- No eval() or Function() usage
- Content Security Policy compatible
- CORS-aware networking
- Sandboxed worker execution

## Canvas Rasterization Note

`TEST/binance-chart-test/app/page.tsx` sizes chart canvas backing stores with ceiling device-pixel dimensions and derives draw-space dimensions from that backing store. Plot clips are aligned to device pixels, vertical time-grid/crosshair strokes are filtered away from plot edges, and the crosshair is suppressed while chart-pan dragging is active so fractional horizontal panning cannot expose a one-pixel boundary flash.
