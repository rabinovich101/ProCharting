# TradingView Desktop Axis Font Benchmark

Date: 2026-06-06

Reference checked: `https://www.tradingview.com/chart/?symbol=BINANCE%3ABTCUSDT`

Viewport: `1440 x 900`

## Summary

TradingView's desktop chart uses compact but readable chart text:

- Top toolbar/control text: `14px`, system UI font stack.
- Chart legend/OHLC values: `13px`, system UI font stack.
- Volume legend: `13px`, system UI font stack.
- Price-axis and time-axis labels are canvas-rendered. Screenshot measurement
  shows about `8-9px` visible glyph height, which maps practically to an
  approximately `12-13px` canvas font in TradingView's system UI font stack.

ProCharting currently declares desktop chart axis text as `13px`, but the
actual rendered result is smaller because the canvas font string uses CSS
variables:

```ts
ctx.font = `${axisFontSize}px var(--font-geist-mono), ui-monospace, monospace`;
```

Chrome rejects that canvas font string and falls back to `10px sans-serif`.
The measured ProCharting desktop price-axis glyphs are mostly about `6px`
tall in the screenshot, versus TradingView's `8-9px`.

## Recommendation

For desktop price and date/time labels, ProCharting should target:

- Price-axis labels: `13px` minimum, preferably `14px` if keeping a mono font.
- Time/date-axis labels: `13px` minimum, preferably `14px` on desktop.
- Current-price marker: same size as the price axis, `13-14px`, with contrast
  fixed separately.

Most important implementation detail: use a valid canvas font string with no
CSS custom properties. For a TradingView-like feel, use the same system-style
family:

```ts
const CHART_AXIS_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';
ctx.font = `${axisFontSize}px ${CHART_AXIS_FONT_FAMILY}`;
```

If ProCharting wants a more financial-terminal mono feel, use an explicit mono
stack instead of `var(...)`:

```ts
const CHART_AXIS_MONO_FONT_FAMILY =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';
ctx.font = `${axisFontSize}px ${CHART_AXIS_MONO_FONT_FAMILY}`;
```

With the current visual design, the best practical target is:

```ts
const axisFontSize = compactChart ? 13 : 14;
const indicatorPaneFontSize = compactChart ? 12 : 13;
```

This is slightly larger than TradingView's apparent axis text, but it matches
the user's desktop readability feedback and keeps important prices/dates
faster to scan.

## Evidence

- TradingView full screenshot:
  `screenshots/tradingview-1440x900-clean.png`
- TradingView price axis crop:
  `screenshots/crops/tradingview-price-axis-1440.png`
- TradingView time axis crop:
  `screenshots/crops/tradingview-time-axis-1440.png`
- ProCharting price axis crop:
  `screenshots/crops/procharting-price-axis-1440.png`
- ProCharting time axis crop:
  `screenshots/crops/procharting-time-axis-1440.png`

Measured visible glyph heights from screenshots:

| Surface | Price-axis glyph height | Time-axis glyph height |
|---|---:|---:|
| TradingView `1440x900` | `8-9px` | `8px` |
| ProCharting `1440x900` current | mostly `6px` | `7px` |

Canvas font parsing check in Chrome:

| Input font string | Canvas actual font |
|---|---|
| `13px var(--font-geist-mono), ui-monospace, monospace` | `10px sans-serif` |
| `13px ui-monospace, monospace` | `13px ui-monospace, monospace` |
| `14px ui-monospace, monospace` | `14px ui-monospace, monospace` |
| `13px -apple-system, system-ui, Trebuchet MS, Roboto, Ubuntu, sans-serif` | valid `13px` system stack |
