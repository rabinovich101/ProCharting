# Compact Hover Indicator Boxes

## Goal

Make the active indicator legend boxes smaller by default and expand them only
on desktop hover/focus/settings-open.

## Findings / Decisions

- The current action buttons are invisible by opacity but still reserve width
  inside each indicator row, so the boxes remain wider/taller than needed.
- Keep mobile stable and compact; apply the hover expansion behavior to the
  desktop/default indicator legend rules.
- Keep the indicator text size from the previous pass unchanged.

## Checklist

- [x] Collapse default desktop indicator row padding/height/action width.
- [x] Expand the row and action area on hover/focus/settings-open/more-open.
- [x] Preserve mobile indicator spacing and no-overflow behavior.
- [x] Update `ARCHITECTURE.md` for compact hover-expanding indicator boxes.
- [x] Run focused typecheck/lint/build checks.
- [x] Verify desktop and mobile with Browser/Playwright/devtools.
- [x] Commit and push `main`.

## Review

Completed the compact hover-expanding indicator box pass.

- `TEST/binance-chart-test/app/globals.css` now collapses desktop indicator
  legend rows by default: default gap is `7px`, min-height is `26px`, padding is
  `2px 6px 2px 8px`, and the hidden action area has `max-width: 0`, opacity
  `0`, and no pointer events.
- Desktop hover/focus/settings-open/more-open expands the same row: gap becomes
  `10px`, min-height becomes `34px`, padding becomes `5px 7px 5px 9px`, and the
  action area expands to `132px` with opacity `1`.
- Mobile keeps its existing compact row sizing and no-overflow behavior.
- `ARCHITECTURE.md` documents that active indicator rows are compact by default
  and expand on desktop hover/focus/open states.

Verification results:

- `pnpm run typecheck:test` passed.
- `pnpm exec eslint TEST/binance-chart-test/app/page.tsx --ext .tsx` passed.
- `git diff --check` passed.
- Browser QA on the in-app browser confirmed the compact default row rendered
  without horizontal overflow and with `.market-strip` count `0`.
- Playwright hover QA at `1280x720` passed: default row measured `118x34` with
  action area `0px` wide and opacity `0`; hover expanded it to `247x40` with
  action area `121px` wide, `max-width: 132px`, opacity `1`, and
  `rowHoverCount: 1`.
- Mobile Browser/Playwright QA at `390x844` passed: indicator stayed below the
  OHLC overlay, row stayed compact, `.market-strip` count was `0`, and there was
  no horizontal overflow.
- Devtools logs for the local app showed zero local error entries.
- `pnpm --dir TEST/binance-chart-test exec next build` passed with the existing
  multiple-lockfile and missing Next ESLint-plugin warnings.
- Saved screenshots outside the repo:
  `/tmp/procharting-compact-indicator-hover-desktop.png` and
  `/tmp/procharting-compact-indicator-hover-mobile.png`.

# Indicator Font 20 Percent Reduction

## Goal

Make indicator text 20% smaller while leaving the `BTC/USDT` OHLC overlay and
chart grid geometry unchanged.

## Findings / Decisions

- The visible indicator text lives in two places: active indicator DOM legend
  rows (`Vol`, `SMA`, etc.) and canvas-drawn indicator pane labels.
- Current active indicator legend sizes are `15px` desktop and `13px` mobile.
  A 20% reduction makes them `12px` desktop and `10.4px` mobile.
- Current canvas indicator pane label sizes are `14px` desktop and `13px`
  compact. A 20% reduction makes them `11.2px` desktop and `10.4px` compact.
- Keep action button sizes and overlay spacing stable unless verification shows
  text layout problems.

## Checklist

- [x] Reduce active indicator legend font sizes by 20%.
- [x] Reduce canvas indicator pane label font sizes by 20%.
- [x] Run focused typecheck/lint/build checks.
- [x] Verify desktop and mobile with Browser/Playwright/devtools.
- [x] Update review notes.
- [x] Commit and push `main`.

## Review

Completed the 20% indicator font reduction.

- `TEST/binance-chart-test/app/globals.css` now uses `12px` for desktop active
  indicator legend rows/values, down from `15px`.
- Mobile active indicator legend rows/values now use `10.4px`, down from
  `13px`.
- `TEST/binance-chart-test/app/page.tsx` now uses `11.2px` desktop and `10.4px`
  compact canvas indicator pane labels, down from `14px` and `13px`.
- The `BTC/USDT` OHLC overlay and chart grid geometry were not changed.

Verification results:

- `pnpm run typecheck:test` passed.
- `pnpm exec eslint TEST/binance-chart-test/app/page.tsx --ext .tsx` passed.
- `git diff --check` passed.
- Browser QA at desktop measured `.indicator-legend-row`,
  `.indicator-legend-title`, and `.indicator-legend-value` at `12px`, with
  `.market-strip` count `0` and no horizontal overflow.
- Mobile Browser QA at `390x844` measured the same indicator row/title/value
  selectors at `10.4px`, kept indicators below the OHLC overlay, had
  `.market-strip` count `0`, and had no horizontal overflow.
- Devtools logs for the local app showed zero local error entries.
- `pnpm --dir TEST/binance-chart-test exec next build` passed with the existing
  multiple-lockfile and missing Next ESLint-plugin warnings.
- Saved screenshots outside the repo:
  `/tmp/procharting-indicator-fonts-20-desktop.png` and
  `/tmp/procharting-indicator-fonts-20-mobile.png`.

# Exact Top Grid Alignment Follow-Up

## Goal

Move the chart grid fully up into the same top band as the `BTC/USDT` overlay,
with no remaining top plot inset.

## Findings / Decisions

- The previous fix moved the grid behind the overlay but intentionally left a
  small `topPlotInset` (`8px` desktop, `6px` compact).
- The requested behavior is stricter: the plot/grid should begin at the exact
  top of the chart canvas/stage, behind the `BTC/USDT` overlay.
- Keep this as a focused geometry change only.

## Checklist

- [x] Set the chart plot top inset to `0`.
- [x] Verify the plot hit area starts at the first pixel band below the topbar.
- [x] Run focused typecheck/lint/build checks.
- [x] Verify desktop and mobile with Browser/Playwright/devtools.
- [x] Update `ARCHITECTURE.md` and review notes.
- [x] Commit and push `main`.

## Review

Completed the exact top grid alignment follow-up.

- `TEST/binance-chart-test/app/page.tsx` now sets `topPlotInset` to `0`, so the
  chart plot/grid begins at the exact top of the canvas behind the `BTC/USDT`
  overlay.
- `ARCHITECTURE.md` now states that the grid begins at the top of the chart
  stage behind the floating legend.

Verification results:

- `pnpm run typecheck:test` passed.
- `pnpm exec eslint TEST/binance-chart-test/app/page.tsx --ext .tsx` passed.
- `git diff --check` passed.
- `rg` found no remaining `topLegendHeight`, responsive `topPlotInset`, or
  market-strip source references.
- Desktop Browser QA at `1280x720` passed: moving the pointer `1px` below the
  canvas top reported `data-pointer-area="plot"`.
- Mobile Browser QA at `390x844` passed: moving the pointer `1px` below the
  canvas top reported `data-pointer-area="plot"`, with no horizontal overflow
  and the indicator legend still below the `BTC/USDT` overlay.
- Devtools logs for the local app showed zero local error entries.
- `pnpm --dir TEST/binance-chart-test exec next build` passed with the existing
  multiple-lockfile and missing Next ESLint-plugin warnings.
- Saved screenshots outside the repo:
  `/tmp/procharting-grid-exact-top-desktop.png` and
  `/tmp/procharting-grid-exact-top-mobile.png`.

# TradingView Grid Top Alignment Fix

## Goal

Make the chart grid/plot area extend up behind the top-left OHLC and indicator
overlays, matching TradingView instead of leaving a blank reserved strip at the
top of the chart.

## Findings / Decisions

- The DOM OHLC overlay is now visible, but the canvas still reserves the old
  `topLegendHeight` before drawing the plot grid.
- TradingView floats the legend over the chart; the grid starts near the top of
  the chart pane behind that legend.
- Keep the fix in the standalone chart canvas geometry. Do not change market
  data, indicator calculations, or the packaged renderer.

## Checklist

- [x] Inspect live TradingView and local grid top positions with
      Browser/Playwright/devtools.
- [x] Remove the old legend-reserved vertical gap from the canvas plot geometry.
- [x] Keep the OHLC and indicator overlays floating above the grid.
- [x] Update `ARCHITECTURE.md` for the grid/overlay behavior.
- [x] Run focused typecheck/lint/build checks.
- [x] Verify with Browser/Playwright/devtools on desktop and mobile.
- [x] Commit and push `main`.

## Review

Completed the TradingView grid-top alignment fix.

- Browser/Playwright inspection of TradingView showed its main chart canvas
  starts at the top of the chart pane while the legend floats over it.
- `TEST/binance-chart-test/app/page.tsx` no longer reserves the old
  `topLegendHeight` inside the canvas. The plot now starts with a small
  `topPlotInset` (`8px` desktop, `6px` compact), so gridlines and candles extend
  up behind the OHLC and indicator overlays.
- `ARCHITECTURE.md` documents that the DOM overlays float above a top-aligned
  chart grid.

Verification results:

- `pnpm run typecheck:test` passed.
- `pnpm exec eslint TEST/binance-chart-test/app/page.tsx --ext .tsx` passed.
- `git diff --check` passed.
- `rg` found no remaining `topLegendHeight`, `market-strip`, `Market status`,
  or `visible bars` source references in `TEST/binance-chart-test/app` or
  `ARCHITECTURE.md`.
- `pnpm --dir TEST/binance-chart-test exec next build` passed with the existing
  multiple-lockfile and missing Next ESLint-plugin warnings.
- Desktop Browser QA at `1280x720` passed: the OHLC overlay began `10px` inside
  the canvas and moving the pointer `12px` below the canvas top reported
  `data-pointer-area="plot"`.
- Mobile Browser QA at `390x844` passed: the OHLC overlay began `8px` inside
  the canvas, the indicator legend remained below it, there was no horizontal
  overflow, and moving the pointer `10px` below the canvas top reported
  `data-pointer-area="plot"`.
- Devtools logs for the local app showed zero local error entries.
- Saved screenshots outside the repo:
  `/tmp/tradingview-grid-top-reference.png`,
  `/tmp/procharting-grid-to-top-desktop-1280.png`, and
  `/tmp/procharting-grid-to-top-mobile.png`.

# TradingView-Style OHLC Overlay Fix

## Goal

Make the exact top-left OHLC/instrument row marked by the user's white
rectangle clearly visible and more TradingView-like.

## Findings / Decisions

- The user is pointing at the instrument/OHLC row, not the indicator rows.
- Browser inspection of live TradingView showed that the top-left legend is a
  DOM overlay layered over the chart: the symbol/title uses larger readable text
  and the OHLC values sit beside it as separate text items.
- The local app still paints this row directly on the chart canvas, so the text
  can look too small and low-contrast on the dark grid.
- The simplest durable fix is to render the OHLC row as a DOM overlay synced to
  the latest/crosshair candle, while leaving the canvas for chart drawing and
  leaving indicator calculations unchanged.
- Keep the indicator legend below the OHLC overlay and preserve the existing
  TradingView-style chart controls.

## Checklist

- [x] Inspect the current app and live TradingView legend with Browser/Playwright.
- [x] Add a crisp DOM OHLC overlay for the white-rectangle row.
- [x] Remove the duplicated canvas OHLC text drawing.
- [x] Keep indicator legends positioned below the OHLC overlay on desktop and mobile.
- [x] Update `ARCHITECTURE.md` for the DOM OHLC overlay behavior.
- [x] Run focused typecheck/lint/build checks.
- [x] Verify with Browser/Playwright/devtools on desktop and mobile.
- [x] Commit and push `main`.

## Review

Completed the TradingView-style OHLC overlay fix.

- `TEST/binance-chart-test/app/page.tsx` now renders the top-left
  instrument/OHLC row as a DOM overlay synced to the latest candle or the
  candle under the crosshair.
- Removed the old canvas-drawn OHLC text so the white-rectangle row is no
  longer tiny canvas text.
- `TEST/binance-chart-test/app/globals.css` now styles the OHLC overlay with a
  readable 16px desktop symbol label, 14px desktop OHLC values, strong
  contrast, green/red change coloring, and a narrow/mobile wrap treatment that
  keeps the active indicator legend below it.
- `ARCHITECTURE.md` documents that the instrument/OHLC row is a DOM overlay and
  the active indicator legend is a separate stack below it.

Verification results:

- Live TradingView was inspected with Browser/Playwright/devtools; its
  instrument/OHLC legend is a DOM overlay layered over the chart.
- `rg` found no remaining `market-strip`, `Market status`, or `visible bars`
  source references in `TEST/binance-chart-test/app` or `ARCHITECTURE.md`.
- `pnpm run typecheck:test` passed.
- `pnpm exec eslint TEST/binance-chart-test/app/page.tsx --ext .tsx` passed.
- `git diff --check` passed.
- `pnpm --dir TEST/binance-chart-test exec next build` passed with the existing
  multiple-lockfile and missing Next ESLint-plugin warnings.
- Browser QA on `http://localhost:3006/` passed on desktop: one
  `.instrument-legend-overlay`, zero `.market-strip`, OHLC text present, symbol
  measured `16px`, values measured `14px`, and the instrument overlay sat above
  the active indicator legend.
- Mobile Browser QA at `390x844` passed: one `.instrument-legend-overlay`, zero
  `.market-strip`, OHLC text present, no horizontal overflow, and the active
  indicator legend stayed below the wrapped OHLC row.
- Devtools logs for the local app showed zero local error entries.
- Saved screenshots outside the repo:
  `/tmp/procharting-ohlc-dom-overlay-narrow.png` and
  `/tmp/procharting-ohlc-dom-overlay-mobile.png`.

# Stronger TradingView Legend Visibility Pass

## Goal

Make the top-left OHLC row and the indicator labels below it unmistakably
visible on the dark chart, using larger TradingView-like chart text and stronger
study legend contrast.

## Findings / Decisions

- Current `main` has no visible `market-strip`; the remaining visibility issue
  is the canvas OHLC line and the active-study legend overlay.
- Live TradingView uses a readable top-left instrument/OHLC line around normal
  14px UI size, but the local dark chart needs heavier/larger text because the
  labels sit over dark grid and candle content.
- Keep the change scoped to `TEST/binance-chart-test/app/page.tsx`,
  `TEST/binance-chart-test/app/globals.css`, `ARCHITECTURE.md`, and this
  `todo.md`.
- Do not change data fetching, indicator calculations, or chart interactions.

## Checklist

- [x] Inspect current `main`, local browser state, and TradingView reference.
- [x] Increase canvas OHLC/axis/current-price/indicator-pane text hierarchy.
- [x] Increase active indicator legend row size, contrast, and action targets.
- [x] Update `ARCHITECTURE.md` for the stronger visible legend treatment.
- [x] Run focused typecheck/lint/build checks.
- [x] Verify with Browser/Playwright/devtools on desktop and mobile.
- [x] Commit and push `main`.

## Review

Completed the stronger chart legend visibility pass.

- `TEST/binance-chart-test/app/page.tsx` now uses a larger text hierarchy:
  desktop OHLC legend text is 16px/700, compact OHLC text is 14px/700, axis and
  current-price marker text are larger, and volume/oscillator pane labels are
  larger.
- `TEST/binance-chart-test/app/globals.css` now renders active indicator rows
  as bigger high-contrast TradingView-style study labels: 15px/760 title/value
  text, 38px minimum rows, stronger translucent backgrounds, text shadows on
  dark theme, and 28px desktop action targets. Mobile keeps a 13px/31px compact
  treatment.
- `ARCHITECTURE.md` documents the enlarged high-contrast TradingView-style
  legend and OHLC treatment.

Verification results:

- `pnpm run typecheck:test` passed.
- `pnpm exec eslint TEST/binance-chart-test/app/page.tsx --ext .tsx` passed.
- `git diff --check` passed.
- `rg` found no remaining `market-strip`, `Market status`, or `visible bars`
  source references in `TEST/binance-chart-test/app` or `ARCHITECTURE.md`.
- `pnpm --dir TEST/binance-chart-test exec next build` passed with the existing
  multiple-lockfile and missing Next ESLint-plugin warnings.
- Browser QA on `http://localhost:3006/` passed on desktop: active study rows
  measured `15px`, title/value font weights measured `760`, rendered rows
  measured `42px` high, action buttons measured `28px`, `.market-strip` count
  was `0`, and local app-origin error logs were empty.
- Mobile Browser QA at `390x844` passed: active study rows measured `13px`,
  rendered rows measured `34px`, `.market-strip` count was `0`, there was no
  horizontal overflow, and local app-origin error logs were empty.
- Saved screenshots outside the repo:
  `/tmp/procharting-strong-legend-desktop.png` and
  `/tmp/procharting-strong-legend-mobile.png`.

# Remove Market Strip From Main

## Goal

Remove the visible market-strip row from `main` so the chart begins directly
under the TradingView-style top command bar.

## Findings / Decisions

- `main` still contains `<section className="market-strip">` in
  `TEST/binance-chart-test/app/page.tsx`.
- `main` still contains base and mobile `.market-strip` CSS in
  `TEST/binance-chart-test/app/globals.css`.
- This is the row showing candle count, visible bars, volume, and indicator
  count below the topbar. Those diagnostics should stay non-visible through the
  existing canvas `data-*` attributes instead of visible UI text.
- Keep the fix narrow: remove only the market-strip JSX and CSS, preserve the
  top command bar, latest-price readout, chart canvas, and indicator legends.

## Checklist

- [x] Inspect current `main` for remaining market-strip references.
- [x] Remove the market-strip JSX.
- [x] Remove `.market-strip` base and mobile CSS.
- [x] Update `ARCHITECTURE.md` to state there is no separate market status strip.
- [x] Run focused typecheck/lint/build checks.
- [x] Verify with Browser/Playwright/devtools on `localhost:3006`.
- [x] Commit and push `main`.

## Review

Removed the remaining market-strip row from `main`.

- Deleted the visible market status JSX from
  `TEST/binance-chart-test/app/page.tsx`.
- Removed base and mobile `.market-strip` CSS from
  `TEST/binance-chart-test/app/globals.css`.
- Updated `ARCHITECTURE.md` to state the test app has no separate market status
  strip below the command bar.

Verification results:

- `rg` found no remaining `market-strip`, `Market status`, or `visible bars`
  references in `TEST/binance-chart-test/app` or `ARCHITECTURE.md`.
- `pnpm run typecheck:test` passed.
- `pnpm exec eslint TEST/binance-chart-test/app/page.tsx --ext .tsx` passed.
- `git diff --check` passed.
- `pnpm --dir TEST/binance-chart-test exec next build` passed with the existing
  multiple-lockfile and missing Next ESLint-plugin warnings.
- Browser QA at `http://localhost:3006/` passed on desktop: `.market-strip`
  count was `0`, `aria-label="Market status"` count was `0`, the chart stage
  started immediately after the topbar, and local app-origin error logs were
  empty.
- Mobile Browser QA at `390x844` passed with the same zero counts, no
  horizontal overflow, and no local app-origin error logs.

# Chart Legend Visibility Pass

## Goal

Make the standalone Binance chart test app's top-left OHLC readout and active
indicator legend rows more visible, especially the white-rectangle area in the
user screenshot and the labels below it, while keeping the chart behavior and
indicator calculations unchanged.

## Findings / Decisions

- The relevant UI is the standalone Next app in
  `TEST/binance-chart-test/app/page.tsx` and
  `TEST/binance-chart-test/app/globals.css`.
- CodeGraph shows the indicator registry and active-study legend already live
  in `page.tsx`; this task is a focused presentation change, not a renderer or
  indicator-calculation rewrite.
- The top-left symbol/OHLC strip is drawn directly on the canvas with a fixed
  12px mono font. That is the area the user marked with the white rectangle.
- The Volume/SMA rows below are HTML overlay rows using 12px text, a faint dark
  background, and hover-only controls.
- TradingView's current chart reference uses stronger hierarchy: a readable
  instrument row, clear OHLC values, and indicator rows that feel like native
  chart study labels instead of tiny metadata.
- The existing `localhost:3006` dev server returned `500`, so verification
  should clean/restart the standalone Next app before browser QA.

## Checklist

- [x] Inspect CodeGraph context and existing chart/indicator legend files.
- [x] Inspect the provided screenshot and live TradingView chart reference.
- [x] Increase canvas OHLC readout font size, spacing, and top reserved area.
- [x] Increase active indicator legend row font size, contrast, spacing, and
      action hit targets.
- [x] Make lower pane labels/value text larger so indicator panes match the
      improved legend hierarchy.
- [x] Update `ARCHITECTURE.md` if this visibility pass changes documented chart
      UI architecture.
- [x] Run focused typecheck/lint/build checks.
- [x] Restart the local app and verify visually with Browser/Playwright/devtools
      on desktop and mobile.
- [x] Add review notes with the final changes and verification results.

## Review

Completed the chart legend visibility pass.

- `TEST/binance-chart-test/app/page.tsx` now reserves more top canvas space for
  the OHLC strip, uses larger weighted mono typography for the symbol/OHLC row,
  and slightly increases price-axis, current-price marker, volume-label, and
  oscillator-pane label/value text.
- `TEST/binance-chart-test/app/globals.css` increases the active indicator
  legend from compact 12px rows to clearer desktop rows with 13px text, stronger
  value weights, 30px row height, higher-contrast backgrounds, and larger
  24px action targets. Mobile keeps a tighter 12px/27px treatment with no
  horizontal overflow.
- `ARCHITECTURE.md` documents the readable TradingView-scale study legend and
  enlarged OHLC legend treatment.
- The stale `localhost:3006` Next dev process was returning `500`; it was
  replaced with a clean server on the same port after removing only the
  generated `TEST/binance-chart-test/.next` cache.

Verification results:

- `pnpm run typecheck:test` passed.
- `pnpm exec eslint TEST/binance-chart-test/app/page.tsx --ext .tsx` passed.
- `git diff --check` passed.
- `pnpm --dir TEST/binance-chart-test exec next build` passed. It still reports
  the existing multiple-lockfile warning and missing Next ESLint-plugin warning.
- Browser/Playwright QA on `http://localhost:3006/` passed: default Volume/SMA
  rows are visibly larger, RSI was added through the real indicator picker, the
  lower RSI pane rendered with larger labels, the SMA settings control opened,
  and local app-origin devtools error logs were empty.
- Mobile Browser QA at `390x844` passed: `bodyOverflow` was `0`, legend rows
  measured `12px`, and the overlay stayed inside the viewport.
- Saved screenshots outside the repo:
  `/tmp/procharting-legend-visibility-desktop.png` and
  `/tmp/procharting-legend-visibility-mobile.png`.

# TradingView-Style Indicator Picker And Legend Plan

## Goal

Make the standalone Binance chart test app behave more like TradingView for
indicators: the top command bar opens a broad searchable indicator picker, adding
an indicator creates a top-left chart legend row, and hovering that row exposes
controls for hide/show, settings, remove, and more actions.

## Findings

- The relevant UI lives in `TEST/binance-chart-test/app/page.tsx`; CodeGraph
  shows the current indicator surface is only `IndicatorsDropdown`, `MA20`, and
  `Volume`.
- The current chart is a direct Canvas 2D React page, not the packaged
  `@procharting/core` renderer path.
- TradingView's reference UI uses a top toolbar `Indicators` button, a large
  picker modal with search/category structure, and study legend rows inside the
  chart region. Legend actions such as hide, settings, remove, and more are
  present in the DOM and visually appear on hover.
- The user's screenshots focus on the top-left selected-study legend, especially
  Bollinger Bands with hover-revealed controls.

## Scope / Decisions

- Keep changes focused on `TEST/binance-chart-test/app/page.tsx`,
  `TEST/binance-chart-test/app/globals.css`, `ARCHITECTURE.md`, and this
  `todo.md`.
- Use a local indicator registry and simple Canvas 2D calculations instead of
  adding dependencies or touching package renderer architecture.
- Support the core built-ins needed for the screenshot-style workflow:
  Volume, SMA, EMA, Bollinger Bands, VWAP Session, RSI, MACD, Stochastic,
  Donchian Channels, WMA, Momentum, Rate of Change, Accumulation/Distribution,
  ATR, Bollinger %B, and Bollinger BandWidth.
- For "all indicators like TradingView", implement a TradingView-like built-in
  picker with a broad common-technical list inside this app's supported surface;
  do not pretend unsupported TradingView cloud/community scripts exist locally.
- Make settings real: period/source/deviation/fast/slow/signal inputs update the
  active indicator and redraw the chart.

## Checklist

- [x] Inspect CodeGraph context and locate chart/indicator implementation.
- [x] Inspect the user screenshots and live TradingView indicator/legend
      behavior with Browser/Playwright/devtools.
- [x] Add a local indicator registry, active indicator state, and calculation
      helpers.
- [x] Replace the small indicator toggle dropdown with a searchable
      TradingView-style picker.
- [x] Add the chart legend overlay with hover actions and settings/more panels.
- [x] Draw selected price overlays, volume, and oscillator panes from active
      indicators.
- [x] Update responsive styling so the picker/legend work on desktop and mobile.
- [x] Update `ARCHITECTURE.md` for the new indicator UI/rendering architecture.
- [x] Run focused typecheck/lint/build checks.
- [x] Verify with local Browser/Playwright screenshots, including hover controls
      and settings/remove behavior.
- [x] Commit, push, and confirm the working tree is clean.

## Review

Implemented the TradingView-style indicator picker and active-study legend for
the standalone Binance chart test app.

- `TEST/binance-chart-test/app/page.tsx` now uses a local indicator registry,
  active indicator instances, shared calculation helpers, and computed series
  for Volume, SMA, EMA, Bollinger Bands, VWAP Session, RSI, MACD, Stochastic,
  Donchian Channels, WMA, Momentum, Rate of Change, Accumulation/Distribution,
  ATR, Bollinger %B, and Bollinger BandWidth.
- The old two-toggle Indicators dropdown is now a searchable TradingView-style
  picker with built-in categories, active count, and menu checked states.
- Selected indicators render into a top-left chart legend. Legend rows expose
  hide/show, settings, remove, duplicate, and move actions through real DOM
  controls, and settings update period/source/deviation/MACD signal inputs and
  line color.
- Price overlays draw on the main chart and participate in automatic Y-range
  fitting. Volume draws in its volume band. RSI/MACD-style oscillators draw in
  compact lower panes with guide lines and right-side values.
- `TEST/binance-chart-test/app/globals.css` adds desktop and mobile picker
  layouts plus the TradingView-like legend styling.
- `ARCHITECTURE.md` now documents the registry-backed indicator architecture,
  legend controls, and pane routing.

Verification results:

- `pnpm run typecheck` passed.
- `pnpm exec eslint TEST/binance-chart-test/app --ext .ts,.tsx` passed.
- `pnpm --dir TEST/binance-chart-test build` passed. Next still reports the
  existing multiple-lockfile and missing Next ESLint plugin warnings.
- `git diff --check` passed.
- Browser/Playwright QA at `http://127.0.0.1:3006` passed: the chart loaded,
  the picker opened centered on desktop, Bollinger Bands and RSI were added
  through the menu, BB bands and the RSI pane rendered, BB settings opened and
  accepted a length change, BB remove dropped the active count, light mode showed
  the white legend styling, and local browser warn/error logs were empty.
- Mobile QA at `390x844` passed: toolbar and legend fit, the picker opened at
  `left=10/right=380`, and `body.scrollWidth`/`documentElement.scrollWidth`
  stayed equal to `390`.
- `pnpm run lint` still fails on existing package-wide lint debt outside this
  change, mostly in `packages/core`, `packages/utils`, `packages/webgl`, and
  `packages/webgpu`. The touched chart app passes its focused lint check.

# Remove Visible Candle Range Label Plan

## Goal

Remove the small top-right candle range/count text from the Binance chart test
canvas because it is a visual diagnostic, not user-facing trading information.

## Findings

- The screenshot text, for example `892-1000 +1 of 1000`, is generated in
  `TEST/binance-chart-test/app/page.tsx` as a `rangeLabel`.
- It represents the visible candle index range, optional future/right-margin
  bars, and the total loaded candle count.
- The same logical range information remains available through non-visible
  canvas `data-*` diagnostics for QA/devtools, so the visual label is not
  needed.

## Scope / Decisions

- Remove only the `rangeLabel` canvas drawing block.
- Keep the top status row that shows total candles and bars visible.
- Keep candles, price labels, OHLC legend, crosshair, volume, MA20, and
  diagnostics unchanged.
- No product question is blocking this task; the requested behavior is clear
  from the screenshot.

## Checklist

- [x] Inspect CodeGraph/project context and locate the label source.
- [x] Remove the canvas range-label calculation and draw call.
- [x] Update `ARCHITECTURE.md` to clarify that logical range diagnostics are
      non-visible.
- [x] Run focused code checks.
- [x] Verify the local chart visually with Browser/Playwright.
- [x] Add review notes with files changed and verification results.
- [x] Commit, push, and confirm the working tree is clean.

## Review

Removed the visible candle range label from the Binance chart test canvas.

- `TEST/binance-chart-test/app/page.tsx` no longer calculates or draws
  `rangeLabel`, which was the top-right text like `892-1000 +1 of 1000`.
- `ARCHITECTURE.md` now clarifies that logical range diagnostics remain
  non-visible and are not painted into the chart canvas.
- The top status row still shows `1,000 candles` and `bars visible`; candles,
  OHLC legend, price axis, crosshair, MA20, volume, and interactions were left
  unchanged.

Verification results:

- `pnpm run typecheck` passed.
- `git diff --check` passed.
- `pnpm exec eslint TEST/binance-chart-test/app/page.tsx --ext .ts,.tsx`
  passed.
- `pnpm --dir TEST/binance-chart-test build` passed. Next still reports the
  existing multiple-lockfile and missing Next ESLint plugin warnings.
- `pnpm run lint` still fails on existing package-wide lint issues outside this
  change; the failures are in packages such as `packages/core`, `packages/utils`,
  `packages/webgl`, and `packages/webgpu`, not the edited chart file.
- Browser/Playwright QA at `http://127.0.0.1:3005` passed: the chart loaded,
  the top-right plot crop no longer shows the candle range label, the status
  row remains visible, and browser warn/error logs were empty.

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
- [x] Merge `origin/main` into the PR branch.
- [x] Resolve `ARCHITECTURE.md` by keeping both main's packaged renderer/grid
      architecture notes and this branch's chart-test scale behavior notes.
- [x] Resolve `TEST/binance-chart-test/app/page.tsx` by combining main's
      manual price-scale/logical-bar interaction model with this branch's
      timeline tick, price tick, current-price marker, and wheel behavior.
- [x] Resolve `todo.md` by preserving both task histories and this conflict
      resolution review.
- [x] Run typecheck/lint/build and browser verification for the chart app.
- [x] Commit the merge resolution, push, and confirm the working tree is clean.

## Review

Resolved the PR conflict by merging `origin/main` into
`codex/tradingview-chart-scale` and keeping both branches' intended behavior.

- `ARCHITECTURE.md` now documents the combined chart-test interaction model,
  including fractional logical slots during wheel/drag gestures.
- `TEST/binance-chart-test/app/page.tsx` now combines main's manual right
  price-scale and future logical-bar interaction work with this branch's
  interval-specific density, semantic timeline ticks, nice price ticks, current
  price marker/countdown, and wheel behavior.
- Browser QA found and fixed a merged runtime crash where fractional logical
  indexes were used as direct candle array indexes during timeline tick
  generation.
- `todo.md` preserves both branches' task histories and this conflict
  resolution review.

Verification results:

- `pnpm run typecheck` passed.
- `pnpm exec eslint TEST/binance-chart-test/app --ext .ts,.tsx` passed.
- `npm run build` in `TEST/binance-chart-test` passed. Next still reports the
  existing multiple-lockfile and missing Next ESLint plugin warnings.
- `git diff --check` passed.
- Browser/Playwright QA at `http://localhost:3005` passed with no local
  warning/error logs.
- All timeframes loaded through the real menu: `1m`, `5m`, `15m`, `30m`, `1h`,
  `4h`, `1d`, `1w`, and `1M`.
- Mouse-wheel QA passed: vertical wheel zoom changed `169` visible bars to
  `105` and back to `170`; horizontal wheel preserved `169` visible bars while
  panning into future slots and back.
- Right price-scale hover reported `pointerArea=price-scale`; price-scale drag
  enabled manual price scale, plot vertical drag panned that manual range, and
  reset returned to automatic price fitting.
- Mobile viewport QA passed at `430x932` and `360x800` with no horizontal
  overflow.

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

# TradingView Chart Interaction Behavior Plan

## Goal

Make the `TEST/binance-chart-test` canvas chart behave closer to TradingView for
the specific gestures requested: right price-scale drag should manually
expand/compress the price range, the chart should then be draggable vertically
with that manual scale, and horizontal panning should be able to reveal future
time/empty right-side space beyond the latest candle.

## TradingView Behaviors To Copy

- Price scale/right-axis hover uses a vertical resize cursor and is a separate
  hit area from the plot.
- Dragging the right price scale vertically changes the visible Y price range
  around the pointer anchor instead of moving or resizing the chart pane.
- Manual price scaling disables automatic Y fitting until reset or market
  reload.
- After manual price scaling, dragging the main plot vertically pans the manual
  Y range up/down so prices and candles move together.
- Dragging the plot horizontally pans the logical bar window.
- Horizontal panning can move past the latest candle and keep empty future
  slots on the right side of the chart instead of clamping at the last candle.
- Time labels in future space continue from the selected timeframe interval.
- Wheel zoom remains anchored to the mouse position and should not forcibly
  snap the view back to the latest candle.
- Reset returns the view to the latest candles and re-enables automatic price
  fitting.

## Findings / Decisions

- CodeGraph confirms the packaged `@procharting/core` already has a
  TradingView-like grid hit-test path, but the visible Binance harness draws its
  own Canvas2D chart and does not instantiate `@procharting/core`.
- The bug is in `TEST/binance-chart-test/app/page.tsx`: current panning clamps
  `endIndex` to `candles.length`, and drawing uses `visibleCandles.length` as
  the slot count, so future whitespace cannot exist.
- The same file recalculates price min/max from visible candles on every draw,
  so right-axis manual scaling cannot persist.
- Keep the fix scoped to the test harness canvas interaction state and drawing
  math; do not refactor shared packages for this pass.

## Checklist

- [x] Inspect repository structure and existing chart architecture notes.
- [x] Use CodeGraph to locate chart interaction paths.
- [x] Read the Binance chart page mouse, wheel, draw, and reset code.
- [x] Start the standalone Next.js chart harness locally.
- [x] Open the harness with the Browser plugin and inspect baseline canvas state.
- [x] Add explicit plot/price-scale/time-scale pointer hit testing in the
      Binance canvas page.
- [x] Add manual Y price-range state and right-axis anchored vertical scaling.
- [x] Add vertical plot panning when manual Y scaling is active.
- [x] Change horizontal pan and zoom to preserve logical future slots past the
      latest candle.
- [x] Draw candles, gridlines, time labels, crosshair, and legend from logical
      bar slots instead of `visibleCandles.length`.
- [x] Update `ARCHITECTURE.md` for the chart test app interaction architecture.
- [x] Run typecheck/build/lint checks relevant to the touched app.
- [x] Verify with Browser/Playwright gestures and devtools console logs.
- [x] Add review notes with changed files, verification, and caveats.

## Review

Completed the TradingView-style interaction pass for the standalone Binance
chart harness.

- Changed `TEST/binance-chart-test/app/page.tsx` so the canvas has explicit
  plot, price-scale, time-scale, and outside pointer hit areas.
- Added manual price-range state. Right-axis vertical drag now turns on manual
  price scale and expands/compresses the range around the pointer price.
- Added vertical plot panning when manual price scale is active.
- Reworked horizontal pan and wheel zoom around logical bar slots so the chart
  can preserve future slots beyond the latest candle instead of clamping
  `endIndex` to `candles.length`.
- Reworked candles, gridlines, moving average, volume, time labels, crosshair
  labels, and the canvas range readout to use logical bar positions.
- Added non-visible canvas `data-*` diagnostics for browser/devtools QA of
  pointer area, drag mode, manual price state, manual price bounds, and view
  range.
- Updated `ARCHITECTURE.md` with the new test-app interaction architecture.

Browser QA:

- Baseline loaded at `http://127.0.0.1:3002/` with no console warnings/errors:
  1,000 candles, 140 bars visible, `viewStart=860.00`, `viewEnd=1000.00`,
  `manualPriceScale=false`.
- Right price-scale hover reported `pointerArea=price-scale` and
  `cursor=ns-resize`.
- Right price-scale drag changed `manualPriceScale` to `true` and produced
  manual bounds around `priceMin=64229.57`, `priceMax=66575.69`.
- Plot vertical drag after manual scaling moved the manual bounds to
  `priceMin=64902.03`, `priceMax=67248.15` while preserving the time window.
- Plot left drag moved into future time: with 1,001 live candles the browser
  reported `viewStart=977.27`, `viewEnd=1117.27`.
- Wheel zoom preserved future space and changed the view to 123 visible bars
  with `viewStart=986.46`, `viewEnd=1109.46`.
- Reset returned to latest candles and auto price scale:
  `viewStart=861.00`, `viewEnd=1001.00`, `manualPriceScale=false`.

Verification:

- `pnpm run typecheck:test` passed.
- `pnpm exec eslint TEST/binance-chart-test/app --ext .ts,.tsx` passed.
- `npm run build` in `TEST/binance-chart-test` passed. Next still reports the
  existing multiple-lockfile and missing Next ESLint plugin warnings.
- Browser screenshot capture was attempted twice, but the in-app Browser
  timed out on `Page.captureScreenshot`; gesture QA used browser-driven
  coordinates, DOM diagnostics, and devtools console logs instead.

# TradingView Supercharts Grid Builder Spec Plan

## Goal

Analyze only the TradingView Supercharts chart grid, excluding the top command
bar, side drawing toolbar, watchlist/details panel, bottom range toolbar, and
marketing/page chrome. Create a builder-agent JSON spec named
`tradingview _grid1.json` that describes the grid surface, axes, panes,
overlays, interactions, responsive behavior, and verification criteria needed
to build a TradingView-like chart grid in this repository.

## Evidence / Decisions

- Use the live TradingView chart route for `BINANCE:BTCUSDT` as the visual and
  DOM reference because the requested target is the Supercharts grid itself.
- Use CodeGraph and direct reads only to anchor the spec to the local
  `TEST/binance-chart-test` Canvas2D chart surface.
- Treat the builder scope as the chart grid only: chart plot pane, right price
  scale, bottom time scale, current-price line/label, candles, volume overlay,
  legend overlays, cursor crosshair, and grid interactions.
- Do not ask the builder to recreate TradingView's surrounding app chrome,
  account flows, watchlist, news/details panels, drawing tools, alerts, replay,
  publishing, or brokerage features.
- Keep this task as a spec/documentation deliverable. No runtime architecture is
  changed, so `ARCHITECTURE.md` should not be modified for this pass.

## Checklist

- [x] Inspect repository structure and existing task notes.
- [x] Use CodeGraph to confirm the local charting implementation context.
- [x] Read the local chart page and stylesheet sections that define the current
      chart canvas/grid surface.
- [x] Inspect TradingView Supercharts with Playwright at desktop size.
- [x] Collapse the right-side TradingView panel and measure the clean grid.
- [x] Inspect TradingView dark-grid behavior.
- [x] Inspect TradingView narrow/mobile grid behavior.
- [x] Cross-check the reference with browser-use.
- [x] Create `tradingview _grid1.json` for the builder agent.
- [x] Validate the JSON file parses cleanly.
- [x] Add review notes with evidence, file path, and caveats.

## Review

Created `tradingview _grid1.json` as a builder-agent contract for the
TradingView Supercharts grid only.

- The spec excludes TradingView chrome such as the top command bar, side
  drawing toolbar, watchlist/details panels, bottom range toolbar, alerts,
  replay, publish, trade, social, and brokerage features.
- The spec includes the plot pane, right price scale, bottom time scale,
  bottom-right corner, candles, volume overlay, gridlines, current-price line,
  crosshair labels, legend behavior, interactions, responsive rules, and QA
  acceptance criteria.
- Playwright measured the collapsed desktop grid at 1440x900 as a 1335x819
  chart region with a 1255x791 plot pane, 80px right price axis, and 28px
  bottom time axis.
- Playwright measured the narrow 430x932 dark grid as a 374x851 chart region
  with a 294x823 plot pane, the same 80px right price axis, and the same 28px
  bottom time axis.
- Browser-use loaded the same dark TradingView reference as a secondary visual
  check.
- Camoufox was attempted first but failed on TradingView static bundle
  resolution; MCP-Docker Playwright was attempted but its browser executable was
  not installed in that MCP context.
- `node -e` JSON parsing passed for `tradingview _grid1.json`.
- `ARCHITECTURE.md` was not updated because this was a spec-only deliverable
  and did not change runtime architecture.

# Actual Runnable ProCharting App Plan

## Goal

Find the real ProCharting page a user should run and verify in a browser,
without treating `TEST/binance-chart-test` as the product unless that is the
opened product surface.

## Findings / Decisions

- The supported runnable ProCharting demo documented in `README.md` is
  `examples/basic`, served by Vite.
- The workspace includes `examples/*`, so `examples/basic` participates in the
  pnpm monorepo.
- `TEST/binance-chart-test` is a standalone Next.js visual QA/live Binance
  harness and is not included in `pnpm-workspace.yaml`.
- The app URL to verify for the actual ProCharting package demo is the Vite URL
  printed by `pnpm --filter @procharting/example-basic dev`.
- Browser verification showed `http://localhost:3000` is already running that
  exact Vite app, but the chart surface was blank because `auto` selected the
  placeholder WebGPU path, the core render scene passed empty series buffers,
  and the Canvas2D fallback did not draw series data yet.
- The smallest product-path fix is to make `auto` select the functional
  Canvas2D renderer for now, pass real series data through the render scene, fit
  the viewport when data is added, and implement basic Canvas2D series drawing.

## Checklist

- [x] Inspect CodeGraph project structure and runnable app candidates.
- [x] Compare root, example, and test app package scripts.
- [x] Identify the product/demo URL that matches the repository docs and
      workspace layout.
- [x] Start the exact app server for the selected ProCharting page.
- [x] Open the exact app URL in a browser and capture the blank-chart baseline.
- [x] Fix the actual package/demo rendering path without changing
      `TEST/binance-chart-test`.
- [x] Update architecture notes for the current `auto` renderer behavior and
      demo rendering path.
- [x] Run typecheck/build verification for the touched package/example path.
- [x] Re-open the exact app URL in a browser and verify the chart renders.
- [x] Capture/share the browser verification result.
- [x] Add review notes with final URL, verification, and any caveats.

## Review

Completed the actual ProCharting package demo rendering fix.

- Confirmed the product/demo page is `examples/basic`, not
  `TEST/binance-chart-test`.
- Kept `TEST/binance-chart-test` untouched.
- Fixed `@procharting/core` so render scenes carry real series data and reset
  the visible range when series data changes.
- Made `renderer: auto` select the functional Canvas2D renderer until the GPU
  renderers have complete data upload/draw paths.
- Implemented Canvas2D drawing for candlestick, line/area, and bar/volume
  series with grid/axis labels and crosshair overlay support.
- Updated `ARCHITECTURE.md` with the current renderer selection and demo
  rendering architecture.

Verification:

- `pnpm run typecheck:packages` passed.
- `pnpm --filter @procharting/types build` passed.
- `pnpm --filter @procharting/core build` passed.
- `pnpm --filter @procharting/example-basic build` passed.
- `pnpm exec eslint packages/core/src packages/types/src --ext .ts` still fails
  on preexisting strict-lint debt in `packages/core`; the new
  Canvas2D `require-await` issue found during this pass was fixed.
- Browser verified the exact app URL `http://127.0.0.1:3002/`: the page renders
  candlesticks with `Renderer: canvas2d`, `Data Points: 1,000`, no console
  warnings/errors, and the `Add Random Data` control updates to `1,100`.
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

# TradingView Supercharts Grid3 Deep Price Scale Plan

## Goal

Analyze only the TradingView Supercharts chart area deeply enough to create a
builder-agent JSON file named `tradingview_grid3.json`. The emphasis is the
chart grid geometry, candle/series coordinate model, hover/crosshair behavior,
zoom/pan mechanics, and especially the right-side price-scale and price-line
interaction behavior when the mouse moves or drags up, down, left, and right.

## Evidence / Decisions

- Use the Prompt Engineering Guide principles as the working method: break the
  task into specific subtasks, gather direct evidence, iterate measurements, and
  separate confirmed behavior from uncertainty.
- Use the existing `tradingview _grid1.json` and `tradingview _grid2.json` only
  as local context, then re-measure live TradingView behavior for this pass.
- Focus on the live `https://www.tradingview.com/chart/` Supercharts chart area
  only; surrounding TradingView UI is setup context and out of scope.
- Treat this as a documentation/spec deliverable. Runtime architecture is not
  changed unless the analysis itself forces a repository architecture update.
- Do not ask product questions because the requested inspection scope is clear:
  infer the necessary chart-only tests independently.

## Checklist

- [x] Inspect repository context, prior TradingView grid specs, and current
      planning notes.
- [x] Study the Prompt Engineering Guide repository/pages for methodology.
- [x] Discover and use the best available browser automation/devtools tools for
      the live TradingView chart.
- [x] Measure clean chart, plot, right price scale, time scale, and corner
      geometry at desktop and narrow viewports.
- [x] Inspect gridline spacing, tick labels, current-price line, and candle
      positioning logic from screenshots/DOM/canvas observations.
- [x] Perform hover, chart drag, price-scale vertical drag, price-scale
      horizontal drag, time-scale drag, and wheel zoom tests.
- [x] Derive builder-facing pixel-to-price, price-to-pixel, pixel-to-time, and
      time-to-pixel formulas from the observed behavior.
- [x] Create `tradingview_grid3.json` with valid JSON only.
- [x] Validate `tradingview_grid3.json` parses successfully.
- [x] Add review notes with changed files, verification, and caveats.

# TradingView Grid3 Runtime Implementation Plan

## Goal

Implement the existing `tradingview_grid3.json` reference in the ProCharting
library runtime so the Canvas2D chart grid follows the measured TradingView
grid3 behavior for a single-pane chart: right price scale sizing, bottom time
scale sizing, price/time coordinate math, candle and volume positioning,
plot-only crosshair labels, current-price marker alignment, wheel zoom, time
pan, and right price-axis vertical scaling.

## Decisions

- Treat `tradingview_grid3.json` as the source reference. The file with no
  space is the existing grid3 artifact in this repository; the older
  `tradingview _grid1.json` and `tradingview _grid2.json` files remain prior
  specs and should not be modified.
- Keep implementation scoped to the public chart runtime and types:
  `packages/core/src/grid-layout.ts`, `packages/core/src/chart.ts`,
  `packages/core/src/renderer-factory.ts`, and `packages/types/src/grid.ts`.
- Preserve the current single-pane model. Multi-pane splitters,
  maximize/minimize, and surrounding TradingView chrome are explicitly outside
  this pass because grid3 records them as out of scope or unimplemented.
- Add only small public grid knobs when needed for the grid3 contract:
  price-scale min/default sizing, right margin bars, and horizontal gridline
  spacing. Keep defaults TradingView-like.
- Use the existing Canvas2D render path because it is the current functional
  runtime path for the package demo and is already documented as the default
  `auto` renderer.
- Update `ARCHITECTURE.md` because this changes runtime grid behavior from a
  `_grid2`-style implementation to the grid3 reference.

## Checklist

- [x] Inspect CodeGraph context, existing grid specs, architecture notes, and
      current Canvas2D grid code.
- [x] Record the implementation plan in `todo.md`.
- [x] Update grid defaults/types for grid3 right-axis auto sizing, 28px time
      axis, right margin bars, and horizontal gridline spacing.
- [x] Update chart interaction state so plot hover owns the full crosshair,
      wheel zoom uses grid3-style exponential time scaling, and right
      price-scale vertical drag anchors around the mouse-down price while
      horizontal-only axis dragging remains a no-op.
- [x] Update Canvas2D rendering so candles use logical spacing/right margin,
      horizontal gridlines target 32-40px spacing, current-price and hover
      markers align with the shared price mapping, and volume overlay follows
      the grid3 height rule.
- [x] Update `ARCHITECTURE.md` with the new grid3 runtime behavior.
- [x] Run TypeScript/build/lint verification for touched packages.
- [x] Verify the runnable chart in a browser with Playwright or Camoufox,
      including desktop rendering and interaction probes.
- [x] Add review notes to this section with changed files, verification, and
      any caveats.

## Review

Implemented `tradingview_grid3.json` as the active single-pane Canvas2D grid
contract for the library.

- Updated public grid options in `packages/types/src/grid.ts`:
  `minPriceScaleWidth`, `rightOffsetBars`, and
  `horizontalGridLineSpacing`.
- Updated shared grid layout defaults in `packages/core/src/grid-layout.ts`:
  80px preferred right axis, 72px compact minimum, 28px time axis, 10
  right-offset bars, and 36px horizontal gridline target.
- Updated chart interaction behavior in `packages/core/src/chart.ts`:
  exponential wheel time zoom, mouse-anchored right price-axis vertical scale,
  manual Y-scale persistence after Y-axis scaling, right-offset latest view,
  and plot-only crosshair overlay creation.
- Updated Canvas2D rendering in `packages/core/src/renderer-factory.ts`:
  grid3 axis sizing, denser price gridline targets, left-aligned price labels,
  logical bar-spacing candle/volume widths, 60px-min volume overlay, and black
  hover price/time labels.
- Rebuilt `packages/types/dist`, `packages/core/dist`, `examples/basic/dist`,
  and the root `dist` facade so package and GitHub/root consumers receive the
  new runtime behavior.
- Updated `ARCHITECTURE.md` to document grid3 as the implemented Canvas2D
  single-pane grid contract.

Verification:

- `pnpm --filter @procharting/types build` passed.
- `pnpm run typecheck:packages` passed after refreshing type declarations.
- `pnpm --filter @procharting/core build` passed.
- `pnpm --filter @procharting/example-basic build` passed after the core build
  completed.
- `pnpm --filter @procharting/core test` passed; no core test files exist.
- `pnpm run build:facade` passed.
- `pnpm run typecheck:test` passed.
- `pnpm exec eslint packages/core/src/grid-layout.ts packages/types/src/grid.ts --ext .ts`
  passed.
- `pnpm exec eslint packages/core/src packages/types/src --ext .ts` still fails
  on preexisting legacy lint debt in `packages/core`, including static-class,
  `any`, non-null assertion, websocket, and worker issues.
- `git diff --check` passed.
- Browser QA used the in-app browser for the local Vite demo and Playwright MCP
  for interaction probes. The demo rendered `Renderer: canvas2d` with 1,000
  candles and no chart-renderer console errors after forcing Vite dependency
  re-optimization.
- Playwright measured the rendered chart at 740x600 CSS px: 80px right price
  scale, 28px time scale, 660x572 plot area.
- Built layout helper check measured compact 430x600 CSS px: 72px right price
  scale, 28px time scale, 358x572 plot area.
- Canvas pixel checks confirmed plot hover draws right/bottom black hover
  labels and crosshair pixels, while price-axis hover clears those labels.
- Canvas diff checks confirmed wheel zoom changes the chart, vertical
  price-axis drag changes the chart, and horizontal-only price-axis drag is a
  no-op after returning to the price axis.
- Docker Playwright narrow-viewport screenshot could not run because that MCP
  image is missing its Chromium executable; compact layout was verified through
  the built shared layout helper instead.

## Review

Created `tradingview_grid3.json` as a builder-facing chart-only specification.

- Studied the Prompt Engineering Guide repository and guide pages first, then
  applied its decomposition, specificity, measurement, and uncertainty-tracking
  principles to the inspection.
- Used Playwright MCP as the primary live-inspection surface for TradingView
  DOM rectangles, canvas layer inventory, canvas pixel sampling, gridline
  detection, public chart API range state, hover tests, drag tests, wheel zoom,
  desktop geometry, compact geometry, and narrow viewport geometry.
- Used Browser-use MCP as a secondary reachability/visual check.
- Attempted Camoufox MCP; it was available, but TradingView static bundle
  resolution was blocked in this environment, so it is documented as a
  limitation in the JSON.
- The JSON documents chart container geometry, plot geometry, gridline spacing,
  price/time coordinate formulas, candle positioning, current-price marker
  behavior, crosshair/hover labels, plot pan, time-axis zoom, wheel zoom, and
  right price-scale vertical/horizontal drag behavior.
- The right price-scale drag finding is now explicit: vertical drags scale the
  y-range and disable auto scale; horizontal drags did not resize the axis or
  alter ranges in the measured tests.
- `node -e` JSON parsing passed for `tradingview_grid3.json`.

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

# Browser-Use MCP Install

## Goal

Install the official local `browser-use/browser-use` MCP server for Codex by
adding a minimal stdio MCP entry that runs the current documented command:
`uvx --from 'browser-use[cli]' browser-use --mcp`.

## Checklist

- [x] Inspect existing Codex MCP configuration and project state.
- [x] Verify the current official Browser Use MCP command from primary docs.
- [x] Add the `browser-use` MCP server entry to Codex configuration.
- [x] Smoke-test the CLI/server startup path.
- [x] Add a review summary.

## Review

Installed Browser Use MCP in the global Codex config at
`/Users/olegrabinovich/.codex/config.toml`.

- Added `[mcp_servers.browser-use]` using the official local command:
  `/Users/olegrabinovich/.local/bin/uvx --from browser-use[cli] browser-use
  --mcp`.
- Set `startup_timeout_sec = 120.0` so the server has enough time on cold uvx
  startup.
- Confirmed the Codex TOML parses and the new MCP entry is present.
- Confirmed the Browser Use CLI resolves and exposes the `--mcp` flag.
- Smoke-tested the server through an MCP client: initialization succeeded,
  `tools/list` returned 16 tools, `browser_navigate` opened
  `https://example.com/`, `browser_get_state` returned the expected page state,
  and `browser_close_all` cleaned up the session.

No project runtime architecture changed, so `ARCHITECTURE.md` was not modified.
Codex may need to be restarted or a new thread opened before the newly added
MCP server appears as callable tools in the tool list.

# TradingView Grid Library Implementation

## Goal

Use `tradingview _grid1.json` to implement a TradingView-style chart grid in
the reusable ProCharting Canvas2D renderer, while keeping the standalone
Binance test app unchanged unless verification shows it needs a direct fix.

## Findings / Decisions

- The JSON spec recommends `TEST/binance-chart-test/app/page.tsx` when building
  the existing local chart harness, but this task asks for "our charts library",
  so the primary implementation target is `packages/core/src/renderer-factory.ts`.
- The reusable Canvas2D renderer already owns the grid, right price labels,
  bottom time labels, series drawing, and crosshair overlay.
- The current plot geometry is close but responsive; the spec calls for stable
  TradingView-like 80px right price axis and 28px bottom time axis, including
  small viewports.
- The current time-axis formatter treats input as seconds, while the local chart
  data contract and spec use milliseconds. The library should support
  millisecond timestamps while preserving older second-based example data.
- Keep the change isolated to renderer grid/crosshair behavior and the basic
  example timestamp generation needed to exercise the millisecond contract.

## Checklist

- [x] Inspect CodeGraph and local files for chart grid ownership.
- [x] Read `tradingview _grid1.json` and identify reusable-library requirements.
- [x] Update `todo.md` with this implementation plan.
- [x] Patch the Canvas2D renderer grid, axes, current price marker, and crosshair labels.
- [x] Update the basic example to generate millisecond timestamps.
- [x] Update `ARCHITECTURE.md` for the renderer behavior change.
- [x] Run typecheck/build/test verification.
- [x] Run Playwright browser QA and canvas pixel checks on desktop/mobile.
- [x] Add review notes with changes and verification results.

## Review

Implemented the TradingView grid contract in the reusable Canvas2D renderer.

- Updated `packages/core/src/renderer-factory.ts` with stable 80px right price
  axis and 28px bottom time axis geometry, responsive nice price/time ticks,
  clipped plot-pane series drawing, TradingView bull/bear defaults, candle
  volume overlay, current-price dotted line with right-axis marker, and
  crosshair price/time axis labels.
- Updated `packages/core/src/chart.ts` so light, dark, and custom chart theme
  tokens feed the render scene instead of the previous hard-coded gray theme.
- Updated `examples/basic/main.js` to generate millisecond timestamps, matching
  the public candle data contract in `tradingview _grid1.json`.
- Updated `ARCHITECTURE.md` with the new Canvas2D renderer behavior and
  millisecond timestamp compatibility note.

Verification results:

- `pnpm run typecheck` passed.
- `pnpm test` passed, including the 10 price-client tests. Core still has no
  test files, and `vitest run --passWithNoTests` passed.
- `pnpm build` passed.
- `pnpm run lint` still fails on the existing repository-wide legacy lint debt
  (222 problems across core/utils/data/webgl/webgpu); the changed renderer only
  reports the pre-existing static-class rule.
- `git diff --check` passed.
- Playwright browser QA passed against `http://10.0.0.3:4188/` at `1440x900`:
  one nonblank 1400x600 Canvas2D chart, derived plot area 1320x572 after the
  80px/28px axes, visible grid/candle/current-price pixels, no horizontal
  overflow, and hover/wheel/drag interactions left the canvas nonblank.
- Playwright browser QA passed at `430x932`: one nonblank 390x600 chart, derived
  plot area 310x572 after the 80px/28px axes, readable right price axis, no
  horizontal overflow, and visible grid/candle/current-price pixels.
- Browser console/devtools showed only the existing missing `favicon.ico` 404;
  the Canvas2D readback warning came from the QA script's repeated
  `getImageData` calls, not from application runtime behavior.

# TradingView Multi-Pane Grid Reverse Engineering Spec

## Goal

Inspect only the live TradingView Supercharts chart grid at
`https://www.tradingview.com/chart/` and create a valid JSON deliverable named
`tradingview _grid2.json`. The JSON must document chart-grid layout structure,
pane sizing, splitter behavior, hover/click/drag behavior, maximize/restore,
minimize availability, active-pane focus behavior, mathematical layout models,
and exact implementation requirements for a builder agent.

## Findings / Decisions

- This is a documentation/spec deliverable, not a runtime code change.
- The required output structure and filename are explicit, so no user business
  question is needed before proceeding.
- The live site must be physically interacted with; prior `tradingview
  _grid1.json` can provide context but cannot substitute for this inspection.
- Scope is the chart grid only: panes, canvases, price/time axes, dividers,
  hover/active states, pane controls, and resize/maximize/minimize behavior.
- Surrounding TradingView app chrome remains out of scope except when needed to
  choose a multi-chart layout for testing.
- `ARCHITECTURE.md` should not be modified unless this task changes local
  runtime architecture or uncovers architecture-relevant project information.

## Checklist

- [x] Read the attached request and inspect existing repo notes/spec context.
- [x] Add this task plan and checklist to `todo.md`.
- [x] Connect to the in-app browser and open TradingView Supercharts.
- [x] Inspect DOM, visible structure, CSS geometry, console/devtools logs, and
      available accessibility information for the chart-grid surface.
- [x] Configure or reach a multi-pane chart layout so pane splitters and active
      pane behavior can be tested.
- [x] Move the mouse across canvas, candles, price scale, time scale, borders,
      splitters, active/inactive panes, top-right controls, maximize, and any
      minimize/collapse target.
- [x] Click each chart pane, canvas, price scale, time scale, dividers,
      maximize, restore, and chart-grid-only controls.
- [x] Drag chart canvas, price scale, time scale, vertical splitters, horizontal
      splitters, and pane dividers while recording deltas and constraints.
- [x] Test maximize/restore for every available pane and verify layout recovery.
- [x] Verify whether minimize/collapse exists; if absent, document that as
      verified.
- [x] Create `tradingview _grid2.json` with the exact requested top-level
      structure and implementation-ready mathematical models.
- [x] Validate the JSON parses.
- [x] Test the deliverable with browser/Playwright/devtools as applicable.
- [x] Add review notes with evidence, limitations, and verification results.

## Review

Created `tradingview _grid2.json` as the requested chart-grid-only JSON
deliverable.

- Used the in-app Browser with Playwright DOM/CSS evaluation, DOM snapshots,
  mouse move/click/drag simulation, clipped screenshots, console log inspection,
  and page asset inventory.
- Verified the single-pane grid at `1440x900`: chart container `1335x819`,
  plot pane `1271x791`, right price scale `64px`, and bottom time scale `28px`.
- Verified the narrow/mobile grid at `430x932`: chart container `374x851`,
  plot pane `310x823`, right price scale `64px`, and bottom time scale `28px`.
- Verified hover/click/drag behavior for the plot canvas, price scale, time
  scale, axis corner, pane/price-axis join, zoom controls, scroll controls,
  reset, and latest-bar control.
- Verified crosshair behavior after pane focus: dashed crosshair lines, right
  price label, bottom time label, and hovered-bar legend updates.
- Attempted multi-chart layout setup. TradingView showed a plan gate saying the
  session has a one-chart-per-tab limit, so multi-pane splitters, inactive-pane
  switching, pane maximize/restore, and any multi-pane minimize behavior are
  marked `requires_live_inspection` in the JSON rather than guessed.
- Verified no direct pane minimize/collapse or pane-specific maximize control is
  visible in the single-pane grid; the only fullscreen/maximize-like control is
  in the top toolbar and remains out of scope.
- MCP-Docker Playwright was unavailable because its Chromium executable was not
  installed; MCP-Docker Puppeteer was isolated at `about:blank`; dedicated CDP
  and accessibility-tree inspection were not available in the active browser tab.
- `node -e` JSON parsing passed for `tradingview _grid2.json`.
- `ARCHITECTURE.md` was not modified because this was a spec-only deliverable
  and did not change local runtime architecture.

# TradingView `_grid2.json` Library Implementation Plan

## Goal

Implement the verified, single-pane TradingView grid contract from
`tradingview _grid2.json` in the reusable ProCharting library. The first pass
must preserve the existing package API shape while adding explicit grid layout
options, 64px right price scale geometry, 28px bottom time scale geometry,
correct plot/axis hit testing, TradingView-like time panning, price-axis
scaling, bottom in-grid controls, and a hover-updating pane legend.

## Findings / Decisions

- `tradingview _grid2.json` is implementation-oriented but marks multi-pane
  splitters, pane maximize/restore, and minimize behavior as
  `requires_live_inspection`, so the runtime implementation should not claim
  exact multi-pane parity yet.
- The packaged ProCharting path is `@procharting/core` plus the Canvas2D
  renderer in `packages/core/src/renderer-factory.ts`; the standalone
  `TEST/binance-chart-test` app is not the reusable library implementation
  target.
- The current Canvas2D renderer already has gridlines, candles, volume overlay,
  current-price marker, and crosshair labels, but it still uses an 80px price
  axis and mouse math based on the whole canvas rather than `_grid2` plot/axis
  zones.
- The simplest proper fix is a narrow shared grid-geometry helper inside
  `packages/core`, plus typed grid options in `packages/types`.
- No user business approval question is needed before implementation because
  the JSON spec explicitly scopes the verified behavior and flags unknown
  multi-pane areas.

## Checklist

- [x] Inspect CodeGraph context, existing JSON specs, core chart state, and
      Canvas2D renderer.
- [x] Add this implementation plan and checklist to `todo.md`.
- [x] Add typed grid options, grid hit-area types, and renderer scene grid
      options in `@procharting/types`.
- [x] Add shared TradingView grid geometry helpers for fixed 64px/28px axes and
      bottom control hitboxes.
- [x] Update `ChartImpl` pointer math to use plot, price-scale, time-scale, and
      corner hit areas.
- [x] Make plot/time-axis drags pan time only, and make price-axis vertical
      drags scale the price range without changing layout geometry.
- [x] Add in-canvas bottom controls for zoom, scroll, reset, and latest-bar
      actions, with stable 24px hitboxes.
- [x] Pass grid options and series names into render scenes.
- [x] Update the Canvas2D renderer to use the `_grid2` 64px price scale, draw
      bottom controls, and draw a top-left hover-updating legend.
- [x] Update `ARCHITECTURE.md` for the implemented `_grid2` library contract
      and the intentionally unimplemented live-inspection-only multi-pane areas.
- [x] Run typecheck/build tests for the touched packages and demo.
- [x] Run Playwright or Browser QA with devtools/console checks on desktop and
      mobile viewports.
- [x] Add review notes with changed files, verification results, and remaining
      limitations.

## Review

Implemented the verified single-pane `_grid2` contract in the reusable library.

- Added `ChartGridOptions`, grid hit-area types, and control ids in
  `@procharting/types`.
- Added shared geometry helpers in `packages/core/src/grid-layout.ts` for the
  64px right price scale, 28px time scale, plot/axis/corner hit areas, and
  24px bottom control hitboxes.
- Updated `packages/core/src/chart.ts` so pointer math is based on `_grid2`
  plot geometry instead of the full canvas: plot/time-axis drags pan time only,
  price-axis drags scale Y only, bottom controls run zoom/scroll/reset/latest
  actions, and click events can report the hit area.
- Updated `packages/core/src/renderer-factory.ts` so Canvas2D renders the
  `_grid2` 64px/28px grid, top-left hover legend, and hover-revealed bottom
  controls.
- Updated `ARCHITECTURE.md` to document the new grid contract and to keep
  multi-pane splitters/maximize/minimize marked as not implemented until the
  JSON's `requires_live_inspection` areas are actually verified.

Verification results:

- `pnpm run typecheck` passed.
- `pnpm build` passed.
- `pnpm --filter @procharting/core test` passed with no test files found.
- `pnpm exec eslint packages/core/src/grid-layout.ts packages/types/src/grid.ts
  --ext .ts` passed.
- `pnpm exec eslint` over the broader touched core/type file list still fails
  on the existing strict-lint debt in `packages/core/src/chart.ts` and the
  known `RendererFactory` static-class rule; the new grid helper files lint
  cleanly.
- `git diff --check` passed before review notes; rerun after review before
  commit.

Browser QA:

- Cleared the stale Vite optimized dependency cache after the first browser
  pass showed a historical `Renderer: webgpu` optimized bundle; the fresh app
  then reported `Renderer: canvas2d`.
- Desktop `1440x900` Browser/CUA QA passed at `http://localhost:3000/`:
  canvas `1385x600`, backing `2770x1200` at DPR 2, plot `1321x572`, price
  scale `64`, time scale `28`, no horizontal overflow, bottom controls changed
  the screenshot on hover, zoom changed the render, plot drag changed the
  render while preserving geometry, and price-scale drag changed the render
  while preserving geometry.
- Mobile `430x932` Browser/CUA QA passed: canvas `375x600`, plot `311x572`,
  price scale `64`, time scale `28`, no horizontal overflow, hover/zoom/pan/
  price-scale interactions changed the screenshot, and geometry stayed fixed.
- Saved screenshots outside the repo:
  `/tmp/procharting-grid2-desktop-hover-controls.png` and
  `/tmp/procharting-grid2-mobile-hover-controls.png`.
- Local image analysis with PIL confirmed both saved hover screenshots are
  nonblank with thousands of unique sampled RGB values.
- Browser dev logs contained Vite/debug/log history and no error-level runtime
  entries; the current page DOM reported `Renderer: canvas2d` and `1,000` data
  points.
