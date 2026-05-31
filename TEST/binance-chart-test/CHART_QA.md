# Chart Browser QA Checklist

Use this checklist when changing `TEST/binance-chart-test/app/page.tsx` or chart
styling.

## Local Run

- Start the app from `TEST/binance-chart-test`:
  `npm run dev -- --hostname 0.0.0.0 --port 3001`
- Open `http://host.docker.internal:3001` from Playwright MCP, or
  `http://localhost:3001` in a local browser.
- Camoufox MCP currently blocks local/private addresses in this environment, so
  use Playwright for localhost verification unless that policy changes.

## Required Checks

- Desktop `1440x900`: page loads, canvas fills the chart stage, no horizontal
  overflow, and console has no new errors after load.
- Tablet `1024x768` and `768x900`: controls wrap cleanly, axes remain readable,
  and the chart stays nonblank.
- Mobile `430x932`, `390x844`, and `360x800`: toolbar does not overflow, canvas
  remains usable, and time/price labels stay inside the viewport.
- Switch `1m`, `5m`, `15m`, `1h`, and `1d`; data reloads and the live status
  returns to `LIVE`.
- Switch symbols between `BTC/USDT`, `ETH/USDT`, and `SOL/USDT`; candles update
  without console errors.
- Toggle Candle, Line, Area, MA, Vol, and Light/Dark; the canvas redraws and
  active states match the selected controls.
- Use wheel zoom, drag pan, Reset, and crosshair hover; the price label, time
  label, and OHLC legend remain readable.
- Verify error handling through an invalid API request such as
  `/api/binance?symbol=BAD&interval=1m&limit=1000`.
