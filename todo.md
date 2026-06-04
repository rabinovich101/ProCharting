# PR Merge Conflict Resolution Plan

## Goal

Merge the current PR branch `codex/tradingview-chart-scale` with
`origin/main`, resolve the pull-request conflict cleanly, preserve the new
TradingView-scale chart behavior, and push the resolved branch.

## Context

- Current branch: `codex/tradingview-chart-scale`.
- Base branch: `origin/main`.
- Read-only merge preview shows conflicts in `ARCHITECTURE.md`,
  `TEST/binance-chart-test/app/page.tsx`, and `todo.md`.
- `origin/main` adds broader packaged Canvas2D/grid runtime work, including
  price-scale drag behavior, logical future bars, grid diagnostics, and
  architecture/todo notes.
- The PR branch adds the Binance test app's timeframe-specific visible density,
  semantic timeline ticks, nice price ticks, current-price marker/countdown, and
  wheel zoom/pan behavior.

## Checklist

- [x] Confirm branch and working tree state.
- [x] Fetch `origin/main`.
- [x] Preview merge conflicts before editing files.
- [ ] Merge `origin/main` into the PR branch.
- [ ] Resolve `ARCHITECTURE.md` by keeping both main's packaged renderer/grid
      architecture notes and this branch's chart-test scale behavior notes.
- [ ] Resolve `TEST/binance-chart-test/app/page.tsx` by combining main's
      manual price-scale/logical-bar interaction model with this branch's
      timeline tick, price tick, current-price marker, and wheel behavior.
- [ ] Resolve `todo.md` by preserving both task histories and this conflict
      resolution review.
- [ ] Run typecheck/lint/build and browser verification for the chart app.
- [ ] Commit the merge resolution, push, and confirm the working tree is clean.

## Review

Pending merge resolution and verification.

# TradingView Timeline, Price Axis, And Wheel Behavior Plan

## Goal

Make the `TEST/binance-chart-test` canvas chart place its timeline, price
grid/labels, current price line, and mouse-wheel behavior closer to TradingView
while keeping the existing Binance data flow and direct Canvas 2D renderer.

## TradingView Findings

- TradingView paints the plot, price axis, and time axis as stacked canvases.
  At a 1280x720 viewport, the main plot canvas is roughly 1090px wide, the
  right price axis is 80-86px wide, and the bottom time axis is 28px high.
- Price grid lines target a visual cadence around 33-42px apart, choosing nice
  price increments from the visible range. Examples observed on BTCUSDT:
  `1m` uses about 100-point price steps, `5m` uses about 400-point steps, `1D`
  uses about 2,500-point steps, and `1M` uses about 10,000-point steps.
- Timeline labels are semantic, not just every N candles. Intraday charts label
  readable hour/day boundaries; daily charts label months; weekly/monthly
  charts label years. Labels are spaced roughly 90-180px apart and grid lines
  align with those labels.
- The current price is a dotted horizontal guide with a filled right-axis price
  marker. The marker color follows the active candle direction and includes a
  small countdown/secondary line on TradingView.
- Default visible density is a stable pixel-per-bar relationship rather than a
  hard fixed candle count. Observed BTCUSDT views land near 7-12px per bar on
  a desktop-width plot, with larger spacing on higher intervals.
- Browser wheel primitives showed TradingView reacting reliably to modifier
  wheel/scale gestures and horizontal wheel gestures. For this app, implement
  normal wheel as cursor-anchored time zoom, and horizontal or Shift+wheel as
  timeline pan so ordinary mouse-wheel testing is deterministic.

## Scope / Decisions

- Keep changes focused on `TEST/binance-chart-test/app/page.tsx`,
  `ARCHITECTURE.md`, and this `todo.md`.
- Do not refactor the package renderer architecture; this chart route draws its
  own Canvas 2D chart and is documented as the live UX/QA harness.
- Preserve existing timeframes, symbol controls, chart styles, moving average,
  volume, websocket, and API behavior.
- Add small helper functions for interval metadata, visible range calculation,
  semantic time ticks, and price ticks instead of introducing dependencies.
- No blocking product question remains. Assumption: normal wheel zooms around
  the cursor; horizontal/Shift wheel pans. This keeps the requested mouse-wheel
  test useful while matching TradingView-style scale behavior.

## Checklist

- [x] Inspect CodeGraph context for chart rendering and interaction paths.
- [x] Read the existing chart app, API route, CSS, QA docs, and architecture
      notes.
- [x] Use Browser/Playwright on TradingView across `1m`, `5m`, `15m`, `30m`,
      `1h`, `4h`, `1d`, `1w`, and `1M`.
- [x] Test TradingView wheel/scale behavior with browser scroll gestures.
- [x] Add TradingView-style interval metadata and visible-range defaults.
- [x] Replace fixed time-label cadence with semantic timeline ticks.
- [x] Replace price-label cadence with pixel-targeted nice price ticks.
- [x] Tune candle spacing, current-price marker, and time/price labels.
- [x] Update wheel handling so vertical wheel zooms around the cursor and
      horizontal/Shift wheel pans the timeline.
- [x] Update `ARCHITECTURE.md` for the discovered/changed chart interaction
      architecture.
- [x] Run typecheck/lint/build checks for the touched app.
- [x] Start the local app and verify with Browser/Playwright, including
      timeframe switching and mouse-wheel scroll behavior.
- [x] Add review notes with changed files, verification, and any residual
      limitations.

## Review

Completed the TradingView-style timeline, price-axis, and wheel behavior pass
for the standalone `TEST/binance-chart-test` chart app.

- Added interval metadata for the supported `1m`, `5m`, `15m`, `30m`, `1h`,
  `4h`, `1d`, `1w`, and `1M` chart periods.
- Reset now uses a TradingView-like pixel-per-bar density and a small right-side
  future offset instead of a fixed `60-140` candle window.
- Timeline grid/labels are now semantic: intraday views prefer readable
  minute/hour/day boundaries, daily views label month/day transitions, and
  weekly/monthly views label broader calendar periods.
- Price grid/labels now target about 40px visual spacing using nice increments
  such as `100`, `400`, `2,500`, and `10,000` depending on the visible range.
- The current price line is now a dotted guide with a colored right-axis marker
  and countdown where the current interval has a remaining time.
- Mouse wheel now zooms around the cursor; horizontal wheel and Shift+wheel pan
  the timeline while keeping the visible bar count stable.
- Updated `ARCHITECTURE.md` with the chart test app's new scale/interaction
  behavior.

TradingView reference checks:

- Browser/Playwright inspected TradingView's public BINANCE:BTCUSDT chart across
  all app timeframes.
- Observed stacked plot/price/time canvases, right price axis around 80-86px,
  bottom time axis around 28px, 33-42px price-grid cadence, semantic time labels,
  current-price dotted guide/marker, and modifier/horizontal wheel scale/pan
  behavior.

Verification results:

- `pnpm run typecheck:test` passed.
- `pnpm exec eslint TEST/binance-chart-test/app --ext .ts,.tsx` passed.
- `npm run build` in `TEST/binance-chart-test` passed. It still reports the
  preexisting multiple-lockfile and missing Next ESLint plugin warnings.
- `git diff --check` passed.
- Browser/Playwright QA at 1280x720 passed with no local dev-log errors or
  warnings. Default `1m` density showed `169 bars visible`.
- Wheel QA passed: vertical wheel changed `169 bars visible` to `105` on zoom-in
  and back to `170` on zoom-out; Shift+wheel preserved `170 bars visible` and
  changed the canvas hash, confirming timeline pan.
- Timeframe QA passed for `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`, `1w`, and
  `1M`, with each interval loading nonblank canvas data.
- Mobile QA passed at `430x932` and `360x800` with no horizontal overflow and
  responsive visible-bar counts of `51` and `42`.
- Playwright screenshot captures succeeded through the dedicated screenshot
  tool. The in-app browser could inspect DOM/dev logs, but its direct screenshot
  capture timed out on the animated canvas, so Playwright was used for visual
  screenshots.

# TradingView Top Command Bar Plan

## Goal

Make the `TEST/binance-chart-test` ProCharting toolbar match the TradingView
top command line more closely: one compact horizontal strip with the symbol,
timeframe, chart style, Indicators, and utility controls arranged in the same
visual order, while preserving the existing chart data flow and canvas
rendering.

## Reference / Decisions

- Camoufox loaded TradingView's generic `/chart/` route successfully, and the
  attached screenshot shows the desired top-line pattern.
- Implement only controls backed by current app behavior: symbol, timeframe,
  chart style, indicators, theme, reset/latest view, live status, and price
  change.
- Do not add nonfunctional TradingView controls such as Alert, Replay, Publish,
  or Trading unless they are backed by real app behavior.
- Keep this scoped to `TEST/binance-chart-test/app/page.tsx`,
  `TEST/binance-chart-test/app/globals.css`, and architecture/todo docs.
- Preserve the existing Binance REST route and websocket subscription logic
  unless browser QA exposes a root-cause bug.

## Checklist

- [x] Inspect the existing chart test app toolbar and current architecture notes.
- [x] Use Camoufox to inspect the TradingView chart reference.
- [x] Convert the topbar markup into a TradingView-style single command bar.
- [x] Restyle controls into compact bordered cells and icon-sized actions.
- [x] Keep mobile/tablet responsive behavior without horizontal overflow.
- [x] Update `ARCHITECTURE.md` if the toolbar architecture changes.
- [x] Run typecheck/lint/build checks relevant to the touched files.
- [x] Run Camoufox or Playwright browser QA, including desktop and mobile
      screenshots plus dropdown interactions.
- [x] Add review notes with changed files and verification results.

## Review

Completed the TradingView-style top command bar pass for
`TEST/binance-chart-test`.

- Replaced the split instrument/control header with one compact command bar
  containing Symbol, live-feed dot, Timeframe, chart-style icon, Indicators,
  theme, reset, and latest price/change.
- Converted the native symbol select into the same accessible dropdown pattern
  as the timeframe/chart/indicator controls.
- Restyled toolbar controls into flatter TradingView-like cells and converted
  theme/reset from text buttons into icon-sized actions with accessible labels.
- Kept the app behavior scoped to existing capabilities; no fake Alert, Replay,
  Trading, or Publish controls were added.
- Updated `ARCHITECTURE.md` to document the current single command-bar control
  architecture.

Browser QA:

| Viewport | Result |
| --- | --- |
| 1440x900 | Pass; 42px single command row, no horizontal overflow. |
| 430x932 | Pass; one compact mobile row, no horizontal overflow. |
| 360x800 | Pass; controls fit within 360px and dropdowns stay inside viewport. |

Interaction QA passed for opening Symbol, Timeframe, Chart type, and Indicators
menus; selecting `ETHUSDT`, selecting `1H`, selecting Line chart style, toggling
MA20 and Volume, toggling theme, and resetting the chart view. Camoufox was used
for the TradingView reference; its local/private URL policy blocked local app
access, so local app QA used Playwright at `http://host.docker.internal:3002`.

Verification results:

- `pnpm run typecheck:test` passed.
- `pnpm exec eslint TEST/binance-chart-test/app --ext .ts,.tsx` passed.
- `npm run build` in `TEST/binance-chart-test` passed. Next still reports the
  preexisting multiple-lockfile and missing Next ESLint plugin warnings.
- `git diff --check` passed.

# Compact Chart Toolbar Plan

## Goal

Redesign the `TEST/binance-chart-test` chart toolbar into a compact,
TradingView-inspired control row that groups timeframe, chart type, and
indicators into polished dropdown controls while preserving the existing Binance
data loading, websocket updates, chart rendering, and indicator state.

## Reference / Constraints

- The pasted task references an attached TradingView screenshot, but no image
  file exists in the provided attachment folder or broader Codex attachments
  directory. Use the pasted description as the visual reference.
- Keep the scope inside the standalone Next chart QA app:
  `TEST/binance-chart-test/app/page.tsx`, its route validation, and CSS.
- Do not add heavy dependencies. Use React state, semantic buttons, ARIA, and
  existing CSS patterns.
- Add weekly/monthly timeframes only if the local Binance proxy accepts them.
- Do not add unsupported chart styles unless their canvas rendering is fully
  implemented.

## Checklist

- [x] Inspect attached task text, available attachments, CodeGraph context, and
      current chart toolbar implementation.
- [x] Replace native toolbar selects/details with compact accessible dropdown
      components for timeframe, chart type, and indicators.
- [x] Add common timeframe options `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, `1d`,
      `1w`, and `1M`, and update Binance route validation to match.
- [x] Preserve existing chart style support and indicator toggles without
      changing chart data flow.
- [x] Tighten responsive CSS so the toolbar remains one compact row where
      possible and avoids horizontal scrolling down to 360px.
- [x] Update `ARCHITECTURE.md` only for the discovered/current chart-app control
      architecture.
- [x] Run typecheck/build/lint verification relevant to touched files.
- [x] Run Playwright browser QA at 1440px, 1024px, 768px, 430px, 390px, and
      360px, including dropdown interaction checks.
- [x] Add review summary with changed files, limitations, and verification
      results.

## Review

Completed the compact chart toolbar pass for the standalone
`TEST/binance-chart-test` app.

- Replaced native timeframe/chart-style selects and the `<details>` indicators
  menu with custom compact dropdown controls that support Escape closing,
  outside-click closing, radio/checkbox ARIA roles, active states, and keyboard
  arrow navigation inside menus.
- Added `1w` and `1M` timeframe options and updated the Binance proxy interval
  allow-list so the UI and API route remain aligned.
- Kept supported chart styles limited to Candles, Line, and Area. Bars and
  Heikin Ashi remain intentionally hidden because they are not part of the
  current chart rendering contract.
- Tightened the toolbar CSS from the older tall control block into a compact
  row on desktop/tablet and icon/count-sized controls on mobile. Dropdowns are
  constrained to the viewport at 430px, 390px, and 360px.
- Updated `ARCHITECTURE.md` with the current chart-app toolbar architecture.

Browser QA:

| Viewport | Result |
| --- | --- |
| 1440x900 | Pass; 46px toolbar, no horizontal overflow, menus inside viewport. |
| 1024x768 | Pass; 46px toolbar, no horizontal overflow, menus inside viewport. |
| 768x900 | Pass after fixing tablet menu alignment; no overflow. |
| 430x932 | Pass; mobile fixed-width dropdowns stay inside viewport. |
| 390x844 | Pass; no horizontal overflow. |
| 360x800 | Pass; no horizontal overflow and chart remains usable. |

Interaction QA passed for opening/closing all three dropdowns, selecting every
timeframe, selecting every supported chart style, toggling MA20 and Volume down
to zero active indicators and restoring them, Escape close, and outside-click
close. Browser console/dev logs returned no warnings or errors.

Verification results:

- `pnpm run typecheck` passed.
- `pnpm exec eslint TEST/binance-chart-test/app --ext .ts,.tsx` passed.
- `npm run build` in `TEST/binance-chart-test` passed. Next still warns about
  multiple lockfiles and the local test app ESLint plugin setup, both preexisting
  project/tooling warnings rather than this toolbar change.
- `git diff --check` passed.

# TradingView-Style Chart UX Improvement Plan

## Goal

Improve the live BTC/USDT chart experience in `TEST/binance-chart-test` so it
feels closer to a professional TradingView-style charting surface while keeping
the existing data flow, routes, and chart interactions simple and stable.

## Project Map

- Chart UI route: `TEST/binance-chart-test/app/page.tsx`.
- Data route: `TEST/binance-chart-test/app/api/binance/route.ts`, which proxies
  Binance klines for `symbol`, `interval`, and `limit`.
- Styling entry point: `TEST/binance-chart-test/app/globals.css`.
- App metadata/layout: `TEST/binance-chart-test/app/layout.tsx`.
- Current chart display is a client-rendered Canvas 2D implementation, not the
  `@procharting/core` renderer path.
- Existing chart controls: fixed `BTCUSDT` symbol, `1m/5m/15m/30m/1h/4h/1d`
  timeframes, mouse-wheel zoom, drag pan, crosshair, live Binance websocket.
- Existing states: loading text only; error/empty states are not clearly handled.
- Core library architecture remains under `packages/core`, `packages/webgl`,
  `packages/webgpu`, `packages/types`, and should not be refactored for this UI
  pass.

## Expert Decisions

- Treat “like TradingView” as: denser chart chrome, stronger financial visual
  hierarchy, readable axes/legend, volume pane, price marker, theme controls,
  polished loading/error/empty states, and responsive desktop/mobile behavior.
- Keep the scope centered on `TEST/binance-chart-test` because that is the real
  chart page surfaced by this task.
- Preserve Binance API usage and websocket behavior unless a root-cause bug
  requires a small fix.
- Avoid adding a new charting library; the existing hand-drawn canvas is already
  the chart under test.

## Checklist

- [x] Attempt Camoufox baseline and capture a Playwright fallback baseline for
      the local chart route.
- [x] Improve chart state handling for loading, error, and empty data.
- [x] Add TradingView-style chart chrome: symbol stats, status, grouped controls,
      theme toggle, and viewport-aware toolbar layout.
- [x] Improve canvas rendering: chart padding, axis readability, current price
      marker, OHLC legend, crosshair labels, volume bars, and better colors.
- [x] Improve responsive behavior for desktop, tablet, and mobile chart heights.
- [x] Add or document reusable browser QA coverage for the chart route.
- [x] Update `ARCHITECTURE.md` with the discovered chart-test-app architecture.
- [x] Run typecheck/build/test verification relevant to the touched files.
- [x] Run Camoufox/Playwright visual QA across desktop, tablet, and mobile.
- [x] Add this task review summary.

## Review

Completed the TradingView-style chart UX pass for the standalone
`TEST/binance-chart-test` Next app.

- Camoufox MCP is installed, but its local/private address policy blocked
  `127.0.0.1` access, so visual QA used Playwright against
  `http://host.docker.internal:3001`.
- Reworked the chart screen into a denser market terminal with symbol selection,
  live status, price/change stats, timeframe controls, Candle/Line/Area modes,
  MA20, volume, light/dark theme, and reset.
- Improved Canvas 2D rendering with a better chart background, readable axes,
  current price marker, OHLC legend, crosshair labels, MA20 line, volume pane,
  clamped time labels, and responsive chart sizing.
- Added robust REST payload parsing and user-visible loading/error/empty states.
- Tightened the Binance proxy route with symbol/interval validation, no-store
  fetches, upstream error forwarding, and unexpected-payload handling.
- Replaced reconnect-on-control-change websocket behavior with one persistent
  Binance websocket plus `SUBSCRIBE`/`UNSUBSCRIBE`, avoiding console errors when
  switching symbols/timeframes.
- Added `TEST/binance-chart-test/CHART_QA.md` as the reusable browser QA
  checklist.
- Added a local test-app ESLint config so `next build` resolves the test app
  TypeScript project from the correct directory.
- Updated `ARCHITECTURE.md` with the discovered chart-test-app architecture.

Browser QA:

| Viewport | Result |
| --- | --- |
| 1440x900 | Pass; canvas filled stage, no overflow, live status. |
| 1280x800 | Pass; no overflow, chart nonblank. |
| 1024x768 | Pass; controls stayed in one row, chart nonblank. |
| 768x900 | Pass; controls wrapped cleanly, chart nonblank. |
| 430x932 | Pass; mobile toolbar and labels stayed inside viewport. |
| 390x844 | Pass; no horizontal overflow, chart nonblank. |
| 360x800 | Pass; no horizontal overflow, chart remained usable. |

Interaction QA passed for timeframe switching, symbol switching, Candle/Line/Area,
MA, Vol, Light/Dark, wheel zoom, drag pan, Reset, and invalid API responses.

Verification results:

- `pnpm run typecheck` passed.
- `pnpm test` passed.
- `npm run build` in `TEST/binance-chart-test` passed.
- `pnpm exec eslint TEST/binance-chart-test/app --ext .ts,.tsx` passed.
- `git diff --check` passed.

# Verification Cleanup Plan

## Goal

Make the repository verification commands target the real source files and avoid stale generated outputs, without changing runtime behavior or product UI.

## Checklist

- [x] Add this approved cleanup plan.
- [x] Prevent root TypeScript from treating every generated file as root source.
- [x] Point ESLint at package TypeScript projects and the standalone test app TypeScript project.
- [x] Point root lint/typecheck scripts at the intended verification targets.
- [x] Document the verification tooling layout in ARCHITECTURE.md.
- [x] Run verification commands and capture the remaining real source issues.
- [x] Add a review summary.

## Review

Completed the approved verification cleanup without changing runtime behavior or UI.

- Root `typecheck` now runs package source checks through package-level tsconfigs and then the standalone Next test app check.
- Root `lint` now targets `packages/*/src` and `TEST/binance-chart-test/app`, avoiding generated outputs and package config files that are outside typed lint projects.
- Root `tsconfig.json` now has `files: []` and broader generated-output excludes so stale `dist` declarations are not treated as root source.
- `.eslintrc.json` now points typed linting at the package tsconfigs and the test app tsconfig.
- `ARCHITECTURE.md` now documents the verification tooling layout.

Verification results:

- `pnpm typecheck` runs the intended checks and now fails on real source errors, mainly in `packages/core/src/chart.ts`, `packages/core/src/workers/*`, and related core files.
- `pnpm typecheck:test` fails on `TEST/binance-chart-test/app/page.tsx:54` because `useRef<number>()` is called without an initial value.
- `pnpm lint` runs without typed-project parse errors and reports 306 existing lint problems across source files.
- `git diff --check` passes.

# Phase 1 Source Verification Plan

## Goal

Make the source verification baseline trustworthy by aligning TypeScript
resolution and source contracts without changing runtime behavior, UI behavior,
routes, APIs, or feature semantics.

## Checklist

- [x] Confirm why package typechecking reads stale generated declarations.
- [x] Point source verification at source package contracts instead of stale local outputs.
- [x] Align `ChartImpl` typing with the current public source API without changing behavior.
- [x] Fix worker and helper type-only issues that block `pnpm typecheck`.
- [x] Keep existing lint debt visible without broad cosmetic cleanup.
- [x] Update `ARCHITECTURE.md` with the source-verification finding.
- [x] Run `pnpm typecheck`.
- [x] Run relevant build/test checks.
- [x] Run browser/Playwright smoke verification if an app can be served.
- [x] Add a review summary.

## Review

Completed the approved Phase 1 source verification cleanup without changing
runtime behavior, UI behavior, routes, API contracts, database behavior, or
feature semantics.

- Package source imports resolve to `packages/*/src`; generated `dist/` outputs
  are untracked build artifacts and are not the source of truth.
- `ChartImpl` now uses an internal event payload map while preserving the public
  `chart.on(event, handler)` and `chart.off(event, handler)` API.
- Internal series storage is typed as the existing `SeriesImpl` so current data
  access compiles without exposing implementation details publicly.
- Worker stubs and helper modules had unused/type-only blockers removed or typed
  locally, preserving their current behavior.
- The standalone Next test app animation ref now has the same initial value with
  an explicit TypeScript type.
- `ARCHITECTURE.md` documents the source-verification baseline.

Verification results:

- `pnpm typecheck` passes.
- `pnpm build` passes.
- `pnpm test` passes.
- `git diff --check` passes.
- Browser smoke test for `TEST/binance-chart-test` at `http://127.0.0.1:3001`
  passed: page shell rendered `BTC/USDT`, timeframe buttons were present, one
  canvas existed, `/api/binance` returned 200, and browser dev logs had no
  errors.
- `pnpm lint` still fails as an audit with 270 existing problems; this was kept
  out of scope to avoid broad cosmetic or behavior-risky cleanup.

# CI Install Error Fix Plan

## Goal

Fix the GitHub Actions install failure caused by CI using pnpm 8 with a `lockfileVersion: '9.0'` lockfile.

## Checklist

- [x] Confirm the failing GitHub Actions step and root cause.
- [x] Pin CI to a pnpm version compatible with the current lockfile.
- [x] Record the package manager version in package metadata.
- [x] Run local install/build checks that mirror CI as far as possible.
- [x] Make empty Vitest packages pass CI until tests are added.
- [x] Keep known legacy typecheck/lint debt visible in CI without blocking install/build/test.
- [x] Commit and push the CI fix.

## Review

Completed the CI install/test fix.

- Latest GitHub Actions failure was in `Install dependencies`: CI used pnpm 8, while `pnpm-lock.yaml` is `lockfileVersion: '9.0'`.
- `.github/workflows/ci.yml` now installs pnpm `10.17.0`, matching the root `packageManager`.
- Root `package.json` now records `packageManager: pnpm@10.17.0` and requires pnpm `>=10.0.0`.
- Package test scripts now use `vitest run --passWithNoTests`, so packages without test files do not fail CI.
- CI still surfaces typecheck/lint debt as warning audit steps, while install/build/test remain blocking.

Verification results:

- `pnpm install --frozen-lockfile` passed locally with pnpm `10.17.0`.
- `pnpm build` passed locally.
- `pnpm test` passed locally.
- `pnpm typecheck` still fails on known legacy source errors, primarily in `packages/core/src/chart.ts` and worker files.
- `git diff --check` passes.

# Local Chart Run Plan

## Goal

Run the local chart app so the BTC/USDT chart can be inspected in a browser.

## Checklist

- [x] Identify the intended chart app and local dev command.
- [x] Start the chart app locally on an available port.
- [x] Open the chart route in the in-app browser.
- [x] Verify the chart canvas renders and key controls are present.
- [x] Add a review summary with the local URL and verification result.

## Review

Started the standalone Next chart app from `TEST/binance-chart-test` on port
`3001` because port `3000` was already in use by an existing Node process. The
server is running in detached `screen` session `procharting-chart`.

Verification result:

- Local URL: `http://localhost:3001/`.
- Browser title: `ProCharting Market Desk`.
- Chart canvas rendered at 1280x615 CSS pixels with 2560x1230 backing pixels.
- Visible chart content included BTC/USDT candles, MA line, volume bars, live
  status, symbol controls, timeframe controls, chart mode controls, and reset.
- Browser console returned no warnings or errors for the chart tab.
- Post-detach Playwright smoke passed at `http://host.docker.internal:3001/`
  with canvas, BTC/USDT label, timeframe controls, mode controls, and zero
  console warnings/errors.

# README Accuracy Review Plan

## Goal

Review `README.md` against the actual repository source, examples, benchmarks, package metadata, and supporting documentation. Produce a clear accuracy/readability report and a safer README draft without changing library functionality.

## Checklist

- [x] Map repository packages, examples, benchmarks, build files, public APIs, and supporting documentation.
- [x] Verify README installation, package names, imports, usage examples, and development commands.
- [x] Verify implemented chart, renderer, interaction, WebSocket, and data features against source files.
- [x] Verify benchmark, bundle-size, performance, and browser-support claims against repo evidence.
- [x] Review README readability, structure, tone, and onboarding clarity for new developers.
- [x] Produce a section-by-section report with claim statuses, evidence, and recommended fixes.
- [x] Provide a revised README draft while leaving source functionality unchanged.

## Review

Completed the README accuracy review without changing library functionality or source files.

- `@procharting/core` exists as a workspace package and exports `createChart`, but `npm view @procharting/core` returned 404 on 2026-05-31, so public npm install instructions are not currently verified.
- `pnpm build`, `pnpm test`, `pnpm typecheck`, and `pnpm bench` run; `pnpm test` currently finds no test files, and `pnpm lint` still fails with existing lint audit debt.
- README performance and TradingView comparison claims are not supported by the benchmark files. The basic benchmark measures synthetic typed-array processing and prints targets, not chart rendering comparisons.
- Browser smoke test of `examples/basic` at `http://localhost:3000/` loaded the page and showed one canvas, but the canvas was blank and dev logs included WebGPU renderer initialization/rendering errors.
- Source inspection found renderer and interaction scaffolding, but chart series data is currently passed to renderers as an empty `ArrayBuffer`, streaming is TODO, and WebSocket updates are parsed/logged rather than applied to series data.
- The final report recommends safer README wording that separates implemented API scaffolding from experimental/planned performance work.

# Price Package Readiness Plan

## Goal

Add a reusable TypeScript/JavaScript package that lets end users configure a
market symbol and fetch normalized price data, while keeping the existing chart
rendering packages stable.

## Findings

- CodeGraph is not initialized in this checkout, so structural inspection used
  direct file reads and repository metadata instead of the CodeGraph MCP index.
- The repository is a pnpm TypeScript monorepo with package workspaces under
  `packages/*`.
- Existing packages are chart/rendering/data-buffer focused. `@procharting/data`
  contains binary buffers, decimation, encoding, and streaming helpers, not a
  user-facing market data client.
- Existing package outputs are ESM-oriented. A focused price package can add
  dual ESM/CommonJS output without changing the rendering packages.
- TradingView MCP tools are available in this Codex environment, but MCP tools
  are not a stable npm package runtime dependency for end users. A package
  should expose an adapter interface instead of pretending the MCP server exists
  inside consumer applications.

## Proposed Architecture

- Add `@procharting/prices` as a new workspace package.
- Export a clean public API centered on `createPriceClient`.
- Implement provider-based internals:
  - `CustomPriceProvider` for user-supplied API functions.
  - `DefaultPriceProvider` for a bundled no-key daily/weekly/monthly provider.
  - `TradingViewMcpProvider` as an adapter that only works when the consuming
    app supplies an MCP-compatible bridge.
- Normalize all providers to:
  - `PriceCandle`
  - `LatestPrice`
- Validate symbols and query inputs at runtime with clear custom errors.
- Build ESM, CommonJS, and TypeScript declarations from the package.
- Document installation, usage, provider behavior, TradingView MCP limitations,
  publishing readiness, and provider extension points.

## Checklist

- [x] Create `@procharting/prices` package metadata and TypeScript build configs.
- [x] Add price types, symbol validation, custom errors, and normalization logic.
- [x] Implement custom, default, and TradingView MCP adapter providers.
- [x] Implement `createPriceClient` and the public package exports.
- [x] Add unit tests for symbol validation, custom provider behavior, default
      provider fallback, price normalization, error handling, and a mocked
      integration-style API flow.
- [x] Update root TypeScript project references and path aliases.
- [x] Update `README.md` with installation, API examples, TypeScript usage,
      error handling, TradingView MCP notes, and publishing guidance.
- [x] Update `ARCHITECTURE.md` with the price package architecture.
- [x] Run install/build/typecheck/test verification.
- [x] Run a Playwright package smoke check for ESM and CommonJS consumption.
- [x] Add a review summary.

## Review

Completed the price package readiness implementation.

- Added `@procharting/prices` as a workspace package with ESM, CommonJS, and
  TypeScript declaration outputs.
- Added a provider-based public API centered on `createPriceClient`.
- Added runtime symbol validation, query validation, custom error classes, and
  price normalization for candles and latest price responses.
- Added `CustomPriceProvider`, `DefaultPriceProvider`, and
  `TradingViewMcpProvider`.
- The default provider uses no-key Stooq CSV historical data for daily, weekly,
  and monthly candles. It is documented as delayed historical data, not a
  guaranteed real-time trading feed.
- TradingView MCP was not used as the default runtime provider because MCP tools
  are environment/tooling integrations, not a stable npm dependency available to
  every package consumer. A `TradingViewMcpProvider` adapter is exported for
  applications that explicitly supply an MCP-compatible bridge.
- Added mocked tests for symbol validation, custom provider behavior, default
  provider latest-price fallback, normalization, error handling, and an
  integration-style custom API flow.
- Updated root TypeScript path aliases/references, `README.md`,
  `ARCHITECTURE.md`, and `pnpm-lock.yaml`.

Verification results:

- `pnpm install --lockfile-only` passed and added the new workspace importer.
- `pnpm --filter @procharting/prices test` passed with 9 tests.
- `pnpm --filter @procharting/prices exec tsc -p tsconfig.json --noEmit --pretty false` passed.
- `pnpm --filter @procharting/prices build` passed.
- `pnpm exec eslint packages/prices/src --ext .ts` passed.
- `pnpm build` passed.
- `pnpm test` passed.
- `pnpm typecheck` passed.
- ESM runtime import from `dist/esm/index.js` passed.
- CommonJS `require('./packages/prices')` passed.
- `npm pack --dry-run` passed and showed only package metadata, README, and
  built `dist` output in the tarball.
- Browser smoke verification passed at `http://127.0.0.1:4187/browser-smoke.html`:
  the built ESM package imported successfully, rendered the expected latest
  price JSON, and browser dev logs contained no errors.
- `git diff --check` passed.
- `pnpm lint` still fails on pre-existing legacy lint debt outside the new
  package. The new `packages/prices/src` code is lint-clean.

# Price Package End-User Readiness Review Plan

## Goal

Review the completed `@procharting/prices` implementation as an installable
end-user package. Verify package metadata, public API ergonomics, provider
architecture, symbol handling, normalized price formats, documentation, security,
build outputs, tests, and clean consumer installs across npm, pnpm, yarn, and
bun where the local toolchain is available. Fix package-readiness issues with
small scoped changes only.

## Findings

- CodeGraph was initialized with `codegraph init -i`; the index reports 71
  indexed files, 787 nodes, and 1,563 edges.
- `@procharting/prices` is already separated from chart rendering packages and
  exposes `createPriceClient`, provider classes, normalization helpers, typed
  errors, and public data types.
- Package metadata currently declares ESM, CommonJS, TypeScript declarations,
  an export map, and a `files` allowlist.
- The default provider is documented as Stooq historical CSV data rather than
  live TradingView MCP support.
- Clean TypeScript consumer verification found that the public `FetchLike` type
  leaked DOM-only `URL` and `RequestInit` globals. The fetch override now accepts
  URL strings, avoiding DOM type requirements for Node-style consumers.
- `npm view @procharting/prices version` returned 404 on 2026-05-31, so the
  package is package-ready locally but not publicly installable from the npm
  registry until it is published.

## Checklist

- [x] Review package metadata, workspace wiring, publish allowlist, and exports.
- [x] Review public API, symbol handling, custom/default/TradingView MCP provider behavior, and price normalization.
- [x] Review README/package documentation for install commands, examples, provider honesty, and publishing safety.
- [x] Run package build, test, typecheck, lint, and tarball verification.
- [x] Simulate clean consumer installs/imports with npm, pnpm, yarn, and bun when available.
- [x] Verify TypeScript and JavaScript consumers can call custom/default provider flows without live external API dependencies.
- [x] Add or adjust focused tests/docs/code if verification exposes package-readiness gaps.
- [x] Update `ARCHITECTURE.md` if the review changes or clarifies architecture.
- [x] Run final verification, including Playwright/browser smoke if a local browser check is relevant.
- [x] Commit, push, and clean the repository state after successful verification.
- [x] Add a review summary with what works, what failed, and any remaining risks.

## Review

Completed the end-user package readiness review and made one scoped
package-readiness fix.

What works:

- `packages/prices/package.json` has a valid package name, version,
  description, MIT license, keywords, `files` allowlist, `main`, `module`,
  `types`, and conditional `exports`.
- The package builds ESM, CommonJS, and TypeScript declarations. CommonJS works
  through the nested `dist/cjs/package.json` with `type: commonjs`.
- `createPriceClient` supports the requested custom provider shape and default
  provider shape. Symbols are normalized and validated with clear typed errors.
- Custom, default, and TradingView MCP providers stay separated behind the
  provider interface. TradingView MCP is documented and implemented as an
  adapter-only option, not as a fake default runtime dependency.
- Price candles and latest prices normalize to the documented formats.
- Documentation includes npm, pnpm, yarn, and bun install commands, custom and
  default examples, CommonJS usage, error handling, TradingView MCP limitations,
  and safe publish guidance.
- No hardcoded secrets or API keys were found by repository scan.

Fixes made:

- Changed the public `FetchLike` override from DOM-dependent `URL`/`RequestInit`
  parameters to a string URL parameter. This keeps package declarations usable
  in Node-style TypeScript consumers without DOM libs.
- Added a focused test proving async custom provider failures are wrapped as a
  `ProviderRequestError` with code `PROVIDER_REQUEST_FAILED`.
- Updated `ARCHITECTURE.md` with the fetch-override portability detail.
- Initialized CodeGraph for this repository and kept local database files
  ignored.

Verification results:

- `pnpm --filter @procharting/prices build` passed.
- `pnpm --filter @procharting/prices test` passed with 10 tests.
- `pnpm --filter @procharting/prices exec tsc -p tsconfig.json --noEmit --pretty false` passed.
- `pnpm exec eslint packages/prices/src --ext .ts` passed.
- `npm pack --dry-run --json` and `npm pack --pack-destination /tmp/procharting-prices-review --json` passed; the tarball contains only package metadata, README, and built `dist` output.
- Clean npm, pnpm, and yarn consumers installed the local tarball and passed ESM
  import, CommonJS require, custom provider runtime, mocked default provider
  runtime, and TypeScript declaration checks.
- Bun verification was skipped because `bun` is not installed in this
  environment.
- `pnpm build`, `pnpm test`, and `pnpm typecheck` passed at the repository root.
- Playwright browser smoke passed at
  `http://host.docker.internal:4187/browser-smoke.html`: the built ESM package
  imported in a browser, rendered normalized price JSON, and console checks had
  no warnings or errors after adding a temporary test favicon.
- `pnpm lint` still fails with 270 pre-existing lint problems outside
  `@procharting/prices`. The price package source is lint-clean.

Remaining risks:

- `@procharting/prices` is not published to npm yet; `npm view` returned 404 on
  2026-05-31. It is ready for local tarball installation and publish flow
  testing, but end users cannot install it from the public registry until
  publication.
- Root lint debt remains outside the package reviewed here and should be handled
  separately to avoid broad unrelated changes.

# Price Package Re-Verification Plan

## Goal

Re-review the completed `@procharting/prices` package against the current source
tree and verify that it is installable, importable, documented honestly, and safe
for end users across supported JavaScript and TypeScript consumption paths.

## Checklist

- [x] Load the actual package prompt and identify the target package.
- [x] Check CodeGraph health and use it to inspect the price-client architecture.
- [x] Review package metadata, exports, build configs, README, tests, and architecture notes.
- [x] Run package build, tests, typecheck, lint, and tarball verification.
- [x] Simulate clean consumer installs/imports with available package managers.
- [x] Verify JavaScript, CommonJS, ESM, and TypeScript consumer examples without live external APIs.
- [x] Run repository-level verification commands relevant to package readiness.
- [x] Run a browser/Playwright smoke test for the built ESM package.
- [x] Fix any package-readiness bugs found with minimal scoped changes.
- [x] Update `ARCHITECTURE.md` if this review changes or clarifies architecture.
- [x] Add this review's results, remaining risks, and final status.

## Review

Completed the re-verification pass against the current source and built package.

What works:

- `@procharting/prices` has a valid package boundary with `main`, `module`,
  `types`, conditional `exports`, MIT license, keywords, and a `files`
  allowlist.
- `createPriceClient` supports the requested custom-provider usage and the
  documented default-provider usage.
- Symbol validation accepts common symbols including `AAPL`, `MSFT`, `SPY`,
  `QQQ`, `BTCUSD`, and `ETHUSD`, and invalid/missing symbols use typed errors.
- Custom, default, and TradingView MCP providers remain separated behind a clean
  provider interface. TradingView MCP is adapter-only and is not presented as a
  guaranteed npm runtime dependency.
- Price candles and latest prices normalize to the documented shapes with Unix
  millisecond timestamps.
- No hardcoded secrets, API keys, `.env` files, or obvious secret patterns were
  found in the package scan.

Verification results:

- `pnpm --filter @procharting/prices test` passed with 10 tests.
- `pnpm --filter @procharting/prices exec tsc -p tsconfig.json --noEmit --pretty false` passed.
- `pnpm exec eslint packages/prices/src --ext .ts` passed.
- `pnpm --filter @procharting/prices build` passed.
- `npm pack --pack-destination /tmp/procharting-prices-review --json` passed and
  produced a tarball containing package metadata, README, ESM output, CJS
  output, declarations, and source maps.
- Clean npm and pnpm consumers installed the local tarball and passed ESM import,
  CommonJS require, mocked custom provider runtime, mocked default provider
  runtime, and TypeScript declaration checks without DOM libs.
- Clean Yarn 1 verification passed after forcing a fresh tarball path and
  clearing cache. A stale Yarn 1 cache initially reused an older local tarball
  with the same filename/version, which is now documented in `ARCHITECTURE.md`.
- Bun verification was skipped because `bun` is not installed in this
  environment.
- `pnpm build`, `pnpm test`, and `pnpm typecheck` passed at the repository root.
- Browser/Playwright smoke passed at
  `http://127.0.0.1:4187/browser-smoke.html`: the built ESM package imported,
  rendered normalized `BTCUSD` output, and browser dev logs had no warnings or
  errors.
- `git diff --check` passed.

Remaining risks:

- `npm view @procharting/prices version` returned 404 on 2026-05-31, so the
  package is locally tarball-ready but not publicly installable from npm until
  it is published.
- Root `pnpm lint` still fails with 270 existing lint problems outside
  `@procharting/prices`. The reviewed package source is lint-clean.

# Current Price Package End-User Review Plan

## Goal

Review the current `@procharting/prices` source and built package as an
installable end-user package. Verify npm package metadata, public API behavior,
provider architecture, symbol validation, normalized price formats, TypeScript
declarations, documentation honesty, local tarball installs, and browser ESM
consumption. Fix only package-readiness defects that are proven by this pass.

## Checklist

- [x] Load the package-readiness request and confirm `@procharting/prices` is the target package.
- [x] Inspect the package structure, metadata, README, tests, build configs, and architecture notes.
- [x] Run package build, tests, typecheck, source lint, and tarball checks.
- [x] Simulate clean consumer installation/import checks with npm, pnpm, yarn, and bun when available.
- [x] Verify custom provider, default provider with mocked fetch, ESM, CommonJS, and TypeScript consumer paths.
- [x] Run browser/Playwright smoke verification for the built ESM package.
- [x] Fix any scoped package defects found during verification.
- [x] Update `ARCHITECTURE.md` only if this review changes or clarifies package architecture.
- [x] Add this pass's review summary, commands, results, and remaining risks.

## Review

Completed the current end-user readiness review for `@procharting/prices`.

Overall verdict:

- Almost ready. The package is correctly structured and works from local npm
  tarballs with npm, pnpm, and Yarn, but `npm view @procharting/prices version`
  returned 404 on May 31, 2026, so it is not publicly installable from the npm
  registry until it is published.

What works:

- `package.json` has a valid package name, version, description, MIT license,
  keywords, `files`, `main`, `module`, `types`, and conditional `exports`.
- ESM import and CommonJS `require` both work from a clean consumer project.
- The public API supports the requested custom-provider shape with
  `createPriceClient({ symbol, provider: 'custom', pricesApi })`.
- The documented default-provider shape works when fetch is mocked, and the
  default provider is documented honestly as delayed Stooq historical data.
- Symbols `AAPL`, `MSFT`, `SPY`, `QQQ`, `BTCUSD`, and `ETHUSD` are accepted.
  Invalid and missing symbols throw typed package errors.
- Custom, default, and TradingView MCP provider concerns are separated. TradingView
  MCP remains adapter-only and is not presented as a guaranteed npm runtime
  dependency.
- Price candles and latest prices normalize to the documented shapes with Unix
  millisecond timestamps.
- No hardcoded secrets, API keys, `.env` files, or obvious secret patterns were
  found in the price package scan.

Verification results:

- `pnpm --filter @procharting/prices build` passed.
- `pnpm --filter @procharting/prices test` passed with 10 tests.
- `pnpm --filter @procharting/prices exec tsc -p tsconfig.json --noEmit --pretty false` passed.
- `pnpm exec eslint packages/prices/src --ext .ts` passed.
- `npm pack --dry-run --json` passed and showed only package metadata, README,
  and built `dist` output in the tarball.
- `npm pack --pack-destination /tmp/procharting-prices-review --json` passed.
- Clean npm, pnpm, and Yarn consumers installed the local tarball and passed ESM
  import, CommonJS require, mocked custom provider runtime, mocked default
  provider runtime, common-symbol validation, invalid-symbol validation, and
  TypeScript declaration checks without DOM libs.
- Bun verification was skipped because `bun` is not installed in this environment.
- `pnpm build`, `pnpm test`, and `pnpm typecheck` passed at the repository root.
- Browser/Playwright smoke passed at
  `http://127.0.0.1:4187/browser-smoke.html`: the built ESM package imported,
  rendered normalized `BTCUSD` output, and browser dev logs had no warnings or
  errors.

Remaining risks:

- `@procharting/prices` is locally tarball-ready but not public-registry ready
  until the npm package is published.
- Root `pnpm lint` still fails with 270 existing lint problems outside
  `packages/prices`. The reviewed price package source is lint-clean.
- Yarn 4 Plug'n'Play installs the tarball, but plain `node` resolution requires
  Yarn's PnP loader. The Node-resolution smoke was verified with Yarn configured
  to `nodeLinker: node-modules`.

# NPM Publication Status Documentation Fix Plan

## Goal

Correct documentation that implies `@procharting/core` or `@procharting/prices`
can be installed from the public npm registry before those packages are
published.

## Checklist

- [x] Verify current npm registry status for `@procharting/core`.
- [x] Review README install and publishing wording for registry-install claims.
- [x] Update README to describe local workspace usage and mark npm commands as post-publication commands.
- [x] Update architecture notes with the current package publication status.
- [x] Run documentation-focused verification commands.
- [ ] Commit the documentation correction and attempt to push.

## Review

Completed the npm publication-status documentation correction.

Changes made:

- Updated `README.md` so the Quick Start says `@procharting/core` is not
  published to npm right now and points users to the local workspace flow.
- Updated the `@procharting/prices` install section so npm, pnpm, Yarn, and bun
  commands are clearly labeled as post-publication install commands.
- Added local `@procharting/prices` pack instructions for pre-publication
  verification.
- Updated `ARCHITECTURE.md` to record that `@procharting/core` and
  `@procharting/prices` currently return npm registry `E404` responses.

Verification results:

- `npm view @procharting/core version` returned `E404`, confirming the package
  is not currently public on npm.
- `rg` confirmed the README now marks both package install sections as
  not-yet-published/post-publication guidance.
- `git diff --check` passed.
- `pnpm typecheck` passed.
- `pnpm --filter @procharting/prices test` passed with 10 tests.
- Browser verification of the local README through `file://` was attempted, but
  the in-app Browser blocked the URL under its security policy. No workaround was
  attempted.

Remaining risks:

- The packages still need to be published before public npm install commands can
  work.

# NPM Publish Attempt Plan

## Goal

Publish the currently unpublished ProCharting workspace packages to npm if the
authenticated npm account has permission for the `@procharting` scope.

## Expert Decisions

- Do not publish the root package because it is a private monorepo wrapper.
- Treat all package manifests under `packages/*` as the intended npm packages:
  `@procharting/types`, `@procharting/utils`, `@procharting/webgl`,
  `@procharting/webgpu`, `@procharting/data`, `@procharting/core`, and
  `@procharting/prices`.
- Use `pnpm publish` for packages with `workspace:*` dependencies so published
  manifests are resolved consistently with the workspace.
- Publish scoped packages with public access.

## Checklist

- [x] Confirm npm authentication and registry status for each workspace package.
- [x] Run package build and test verification before publishing.
- [x] Run package dry-run/pack verification for publish contents.
- [x] Fix any packaging blockers found during dry-run verification.
- [x] Attempt npm publication for unpublished packages in dependency order.
- [x] Update documentation only if publication succeeds or publish behavior
      requires a packaging change.
- [x] Fix browser smoke runtime blockers found before publication can be retried.
- [x] Run final verification, including browser/Playwright smoke QA where
      applicable.
- [x] Add a review summary with publish results and any follow-up needed.

## Review

Attempted npm publication for the unpublished ProCharting workspace packages.

- npm authentication is active as `oler_r`.
- Registry checks confirmed `@procharting/types`, `@procharting/utils`,
  `@procharting/webgl`, `@procharting/webgpu`, `@procharting/data`,
  `@procharting/core`, and `@procharting/prices` are not published.
- The root package remains private and was not treated as publishable.
- Dry-run/package verification found that `@procharting/core` advertised
  `dist/index.d.ts` but did not reliably include declaration files after Vite
  cleaned `dist`. The core build now removes `.tsbuildinfo` before declaration
  emission so the npm tarball includes TypeScript declarations.
- Browser smoke verification found an async renderer initialization race where
  lazy WebGPU/WebGL wrappers exposed a concrete renderer before initialization
  completed. The wrappers now assign the renderer only after `initialize(canvas)`
  resolves.
- The real publish attempt reached npm but failed before publishing the first
  package because npm requires two-factor authentication or a granular access
  token with 2FA bypass for publishing.
- A retry using the npm token from `.env` authenticated successfully as `oler_r`,
  but npm rejected `@procharting/prices` with `E404 Scope not found`. The
  `@procharting` npm scope must exist and be writable before these scoped
  package names can be published.
- After the user reported adding the npm scope, a manual dependency-ordered
  publish retry still failed on `@procharting/types` with `E404 Scope not
  found`. `npm org ls procharting` and `npm team ls procharting` with the same
  token returned `E403`, so the current token/account still cannot access or
  administer the `procharting` npm organization.
- A post-attempt registry check confirmed none of the workspace packages were
  published.

Verification results:

- `pnpm install --frozen-lockfile` passed.
- `pnpm build` passed.
- `pnpm test` passed.
- `pnpm typecheck` passed.
- `pnpm -r --filter './packages/*' publish --dry-run --access public
  --no-git-checks` passed after the packaging fix.
- Playwright smoke against `examples/basic` at `http://localhost:4173/` passed
  with one canvas, `webgpu` renderer selected, 1,000 data points shown, no page
  errors, and no `createCommandEncoder` runtime error. The only console error
  observed was the existing missing favicon 404.

Follow-up required:

- To publish, rerun the publish command with a current npm OTP or a granular npm
  automation token after creating or gaining publish access to the
  `@procharting` npm scope. If using a granular token, regenerate it after the
  npm organization membership/permissions are in place so it includes that
  organization.

# Direct GitHub Install Usage Plan

## Goal

Make the "Option 2: install directly from GitHub" usage path from the package
readiness brief accurate and usable for the chart package while preserving the
existing pnpm workspace architecture.

## Findings

- `pnpm add github:rabinovich101/ProCharting` currently installs the private
  monorepo wrapper as `@procharting/monorepo`, but importing it fails because
  the root package has no runtime entry point.
- `pnpm add github:rabinovich101/ProCharting#path:/packages/core` currently
  fails because `@procharting/core` depends on workspace packages via
  `workspace:*`, and those packages are not present when only the subdirectory
  is installed.
- The npm packages under `@procharting/*` are still unpublished because npm
  scope access is blocked, so GitHub install documentation must not pretend
  public npm registry install works today.
- The repository already builds the chart API through `@procharting/core`, whose
  public browser API is `createChart`, not a React `ProChart` component.

## Expert Decisions

- Treat the direct GitHub path as a root package facade named `procharting`,
  because package managers install the repository root when using
  `github:rabinovich101/ProCharting`.
- Keep the existing workspace packages and internal `@procharting/*` package
  boundaries unchanged for development and eventual npm publishing.
- Document pnpm as the supported direct GitHub installer for now because this
  repository is a pnpm workspace and the direct GitHub package must build from
  workspace sources before use.
- Keep README examples aligned with the implemented `createChart` API instead
  of inventing chart components that do not exist in the source.

## Checklist

- [x] Add root package metadata and export entries for the GitHub-installed
      `procharting` facade.
- [x] Add only the minimal internal package dependencies needed by the root
      facade at runtime.
- [x] Update README with clone/build instructions, local link usage, direct
      GitHub usage, API table, data format, folder structure, and troubleshooting.
- [x] Update `ARCHITECTURE.md` with the root GitHub-install facade details.
- [x] Run build, typecheck, tests, focused package checks, and package dry-run.
- [x] Verify direct GitHub-style installation from a clean consumer project.
- [x] Run Playwright/browser smoke verification for the chart example.
- [ ] Commit, push, and clean the worktree.
- [x] Add a review summary with verification results and remaining risks.

## Review

Implemented the direct GitHub usage path as a root `procharting` facade package.

Changes made:

- Renamed the root package facade from `@procharting/monorepo` to
  `procharting` while keeping it private to avoid accidental npm publication.
- Added root `main`, `module`, `types`, `exports`, package metadata, and a
  focused `files` allowlist.
- Added `vite.facade.config.ts` to build a self-contained root ESM facade from
  the existing `@procharting/core` source.
- Added `scripts/write-root-facade-types.cjs` to generate flat root
  declarations so GitHub/tarball consumers do not need unpublished internal
  `@procharting/types` packages.
- Changed `packages/core/src/index.ts` to re-export shared types with
  `export type *`, avoiding a type-only package as a runtime dependency.
- Added professional metadata to `packages/core/package.json`.
- Rewrote `README.md` around the actual `createChart` API, local link usage,
  direct GitHub usage, API tables, data formats, development commands, folder
  structure, and troubleshooting.
- Updated `ARCHITECTURE.md` with the root GitHub-install facade architecture.

Verification results:

- `pnpm install --frozen-lockfile` passed and ran the package-only prepare build.
- `pnpm build` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed, including 10 `@procharting/prices` tests.
- `pnpm exec eslint packages/core/src/index.ts --ext .ts` passed.
- `git diff --check` passed.
- `pnpm pack --pack-destination /tmp/procharting-root-pack-final --json` passed
  and showed the root tarball contains `dist/`, price-client dist files,
  package metadata, README, and LICENSE.
- Clean pnpm and npm consumers installed the packed `procharting-0.0.1.tgz` and
  successfully imported `procharting` and `procharting/prices`.
- Clean pnpm and npm TypeScript consumers passed `tsc` with
  `moduleResolution: NodeNext`, `strict: true`, and DOM libs enabled.
- A clean pnpm consumer installed the committed repository through
  `git+file:///Users/olegrabinovich/Documents/ooo/ProCharting`; the git
  dependency ran `prepare`, built the root facade, and successfully imported
  `procharting` and `procharting/prices`.
- Camoufox still blocked local/private addresses, so browser QA used Playwright
  against `http://host.docker.internal:4188/browser-smoke.html`.
- Playwright browser smoke passed: the packed `procharting` facade imported in
  the browser, `createChart` created one 720x420 canvas, `procharting/prices`
  returned two mocked candles, status rendered
  `{"renderer":"canvas2d","candles":2}`, and the second run had no console
  warnings/errors after adding a temporary favicon.

Remaining risks:

- `pnpm lint` still fails as a repository-wide audit with 223 pre-existing
  legacy lint problems outside this packaging change.
- The core Canvas 2D fallback still paints a blank canvas because actual Canvas
  series rendering is an existing TODO; this task did not change renderer
  behavior.
- Public npm install for `@procharting/*` packages remains blocked until the npm
  scope access issue is resolved.

# Package Readiness Test Pass - May 31, 2026

## Goal

Run a fresh verification pass for the current ProCharting repository so we know
whether users can install, build, test, import, and visually smoke-test the
package facade and example.

## Expert Decisions

- Treat pnpm as the authoritative repository package manager because the root
  manifest declares `packageManager: pnpm@10.17.0` and the workspace uses
  `pnpm-workspace.yaml`.
- Test npm only through clean consumer/package-install checks if needed, rather
  than pretending npm is the supported monorepo development installer.
- Use the existing root `procharting` facade and `examples/basic` app as the
  package/import/browser smoke surface.
- Avoid code changes unless verification exposes a real root-cause bug.
- Do not change `AGENTS.md`.

## Checklist

- [x] Confirm repository state, package scripts, and CodeGraph index health.
- [x] Run dependency verification with `pnpm install --frozen-lockfile`.
- [x] Run the full package build with `pnpm build`.
- [x] Run TypeScript verification with `pnpm typecheck`.
- [x] Run automated tests with `pnpm test`.
- [x] Run lint audit with `pnpm lint` and record any existing failures.
- [x] Verify package tarball/import behavior from a clean consumer when the
      build succeeds.
- [x] Run browser smoke verification for the basic example with Playwright.
- [x] Review whether `ARCHITECTURE.md` needs updates based on new findings.
- [x] Add final test results and any risks to this review section.

## Review

Fresh package-readiness test pass completed.

Changes made:

- Fixed the WebGL2 MSAA resolve path so the multisample color renderbuffer uses
  `RGB8` when the canvas context is opaque (`alpha: false`) and `RGBA8`
  otherwise. This removes repeated browser `GL_INVALID_OPERATION` warnings
  during WebGL2 smoke testing.
- Corrected README data-format documentation: chart `CandlestickData.volume` is
  required by the public type and binary renderer pipeline. Consumers without
  source volume should pass `volume: 0`.
- Updated `ARCHITECTURE.md` with the MSAA framebuffer format behavior and the
  six-field chart candle contract.

Verification results:

- CodeGraph index health confirmed: 74 indexed files, 808 nodes, 1,538 edges.
- `pnpm install --frozen-lockfile` passed and ran the prepare build.
- `pnpm build` passed after the WebGL fix.
- `pnpm typecheck` passed after the WebGL fix.
- `pnpm test` passed after the WebGL fix, including 10 price-client tests.
- `pnpm lint` still fails with the known repository-wide legacy lint debt: 223
  problems, mostly existing `any`, non-null assertion, and unsafe-access rules.
- `pnpm pack --pack-destination /tmp/procharting-test-pass-pack --json` passed.
- Fresh pnpm and npm scratch consumers installed the packed
  `procharting-0.0.1.tgz` and successfully imported `procharting` and
  `procharting/prices`.
- A strict TypeScript scratch consumer passed `tsc` with imports from
  `procharting` and `procharting/prices`.
- Camoufox could not browse `localhost` because local hostnames are blocked by
  its policy, so browser QA used Playwright against Vite's network URL
  `http://10.0.0.3:4188/`.
- Playwright smoke passed after restarting Vite with `--force`: page title
  `ProCharting - Basic Example`, one 740x600 canvas, renderer `webgl2`, data
  points `1,000`, FPS `60`, and 0 console errors/warnings.
- `git diff --check` passed.

Remaining risks:

- Repo-wide lint remains a known cleanup task before lint can be a blocking
  release gate.
- The example dev server required Vite `--force` after a renderer source change
  because optimized workspace dependencies can otherwise stay stale during the
  same session.

# Compact Chart Toolbar Plan

## Goal

Compact the `TEST/binance-chart-test` chart controls so timeframe, chart type,
and indicators use TradingView-style dropdowns instead of wide button groups.
The chart should keep the same behavior while saving horizontal space and
remaining usable on smaller screens.

## Project Map

- Main chart UI: `TEST/binance-chart-test/app/page.tsx`.
- Chart styling: `TEST/binance-chart-test/app/globals.css`.
- Architecture notes: `ARCHITECTURE.md`.
- Existing chart state already has the needed controls: `timeframe`,
  `chartStyle`, `showMovingAverage`, and `showVolume`.

## Expert Decisions

- Keep the existing chart data flow, canvas renderer, websocket behavior, and
  chart interactions unchanged.
- Replace only the toolbar chrome: timeframe becomes a compact select, chart
  style becomes a compact select, and MA/Volume move into one Indicators menu.
- Leave theme and reset as compact command buttons because they are chart
  actions, not chart configuration groups.
- Use native form controls and a small `details` dropdown for simple,
  accessible behavior without adding dependencies.

## Checklist

- [x] Add this compact-toolbar checklist.
- [x] Replace the wide timeframe and chart-style segmented controls with compact dropdowns.
- [x] Combine MA20 and Volume toggles into one Indicators dropdown.
- [x] Update responsive toolbar CSS so controls fit smaller screens without horizontal overflow.
- [x] Update `ARCHITECTURE.md` with the chart-test-app toolbar architecture note.
- [x] Run relevant typecheck/build verification.
- [x] Run Playwright/browser QA for desktop and small mobile viewports.
- [x] Add a review summary.

## Review

Completed the compact TradingView-style toolbar pass for
`TEST/binance-chart-test`.

- Replaced the wide timeframe button group with a compact `Timeframe` dropdown.
- Replaced the wide chart-style button group with a compact `Chart type`
  dropdown.
- Moved MA20 and Volume into one `Indicators` dropdown with checkbox toggles and
  an active count badge.
- Updated responsive toolbar CSS so desktop stays compact and small mobile
  widths use a two/three-column control grid without horizontal overflow.
- Updated `ARCHITECTURE.md` with the chart-test-app toolbar grouping.

Verification results:

- `pnpm run typecheck:test` passed.
- `npm run build` in `TEST/binance-chart-test` passed. Next.js repeated the
  existing multiple-lockfile warning but completed successfully.
- `pnpm exec eslint TEST/binance-chart-test/app --ext .ts,.tsx` passed.
- `git diff --check` passed.
- Playwright browser QA passed at `1440x900` and `360x800` against
  `http://host.docker.internal:3002/`: dropdowns rendered, chart canvas was
  visible, Indicators opened correctly, timeframe/chart-type selections worked,
  no horizontal overflow was visible, and browser console/devtools warnings were
  clean.

# Left-Aligned Chart Toolbar Follow-Up

## Goal

Move the compact timeframe, chart type, and indicators controls to the left side
of the top toolbar beside the symbol area, matching the TradingView screenshot.

## Checklist

- [x] Add this follow-up checklist.
- [x] Update the topbar flex layout so controls no longer sit on the far right.
- [x] Keep tablet/mobile wrapping behavior intact.
- [x] Update `ARCHITECTURE.md` with the left-aligned toolbar note.
- [x] Run focused verification and browser QA.
- [x] Commit, push, and clean.

## Review

Completed the left-alignment follow-up.

- Updated the topbar flex layout so the symbol block no longer consumes all
  available horizontal space.
- The compact timeframe, chart type, Indicators, Light, and Reset controls now
  start immediately beside the symbol/price area on desktop, like the supplied
  TradingView reference.
- Kept the existing small-screen grid behavior intact.
- Updated `ARCHITECTURE.md` to note the left-aligned toolbar grouping.

Verification results:

- `pnpm run typecheck:test` passed.
- `pnpm exec eslint TEST/binance-chart-test/app --ext .ts,.tsx` passed.
- `npm run build` in `TEST/binance-chart-test` passed. Next.js repeated the
  existing multiple-lockfile and ESLint-plugin warnings but completed
  successfully.
- `git diff --check` passed.
- Playwright QA passed at `1440x900` and `360x800` against
  `http://host.docker.internal:3002/`: desktop controls rendered on the left
  beside the symbol block, mobile controls stayed within the viewport, chart
  canvas rendered, and browser console/devtools warnings were clean.
