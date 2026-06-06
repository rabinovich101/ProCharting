# Chart Axis Font Fix Verification

Date: 2026-06-06

## Scope

Verified the ProCharting canvas price axis, current-price badge, and time axis
after applying the TradingView-informed font fix.

## Code Change

- Replaced invalid canvas font strings using CSS custom properties with explicit
  canvas-safe font stacks.
- Desktop axis/current-price labels now use `14px`.
- Compact axis labels now use `13px`.
- Indicator pane labels now use `13px` desktop and `12px` compact.
- Right price-axis width is now `102px` desktop and `82px` compact.

## Evidence

- Full screenshot:
  `procharting-axis-fix-1440x900.png`
- Price-axis crop:
  `price-axis-crop-1440x900.png`
- Time-axis crop:
  `time-axis-crop-1440x900.png`

## Measurements

- Viewport: `1440x900`
- Canvas: `1440x861`
- Price-axis tick labels: `8-11px` visible glyph height, `10px` median
- Current-price badge main number: `9px` visible glyph height
- Time-axis labels: `10px` visible glyph height

The prior desktop price-axis screenshot measured around `6px` visible glyph
height because canvas rejected the `var(...)` font string and used its default
`10px sans-serif` fallback.

## Canvas Font Parsing Check

Headless Playwright confirmed:

```json
{
  "oldRejected": "10px sans-serif",
  "newAccepted": "14px -apple-system, \"system-ui\", \"Trebuchet MS\", Roboto, Ubuntu, sans-serif",
  "monoAccepted": "13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", monospace"
}
```

## Verification

- `npm run build` passed.
- `npm run test:e2e` passed: 3 Playwright tests.
- In-app browser verification at `1440x900` showed visible price and time labels
  with no local `127.0.0.1` warning/error logs.
