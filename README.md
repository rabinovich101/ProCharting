# ProCharting

High-performance financial charting primitives for browser applications.
ProCharting provides a TypeScript chart API, renderer selection across WebGPU,
WebGL2, and Canvas 2D, and a separate price-data client package for normalized
market candles.

The chart package is currently developed as a pnpm monorepo. The public npm
scope is not published yet, so the supported ways to try it today are cloning
the repository, linking it locally, or installing the GitHub facade package.

## Features

- TypeScript chart API centered on `createChart`.
- Candlestick, line, bar, and volume series types.
- Renderer factory with WebGPU, WebGL2, and Canvas 2D fallback paths.
- Mouse wheel zoom, drag pan, Y-axis scaling, crosshair events, and resize
  handling.
- Real-time series helpers: `appendData` and `updateLast`.
- Optional `@procharting/prices` package for normalized OHLC price data.

## Installation From GitHub Clone

Use pnpm for repository development because this project uses pnpm workspaces.

```bash
git clone https://github.com/rabinovich101/ProCharting.git
cd ProCharting
corepack enable pnpm
pnpm install
pnpm build
```

Run the basic browser example:

```bash
cd examples/basic
pnpm dev
```

Then open the local Vite URL printed by the command.

## How To Use In Another Project

### Option 1: Local Link

Use this while actively editing ProCharting and testing it in another local app.

```bash
cd ProCharting
pnpm install
pnpm build
npm link
```

Then in your application:

```bash
npm link procharting
```

Application code can import the root GitHub facade:

```ts
import { createChart } from 'procharting';
```

### Option 2: Install Directly From GitHub

Use this when you want to consume the current GitHub repository without waiting
for npm publication.

```bash
pnpm add github:rabinovich101/ProCharting
```

Then import the chart API from the installed facade package:

```ts
import { createChart } from 'procharting';
```

The direct GitHub package runs the repository build during installation so the
compiled chart entry points are available to your app. The `@procharting/*`
workspace packages remain unpublished on npm until the npm scope is available.

## Basic Usage

Plain browser or Vite application:

```ts
import { createChart, type CandlestickData } from 'procharting';

const data: CandlestickData[] = [
  {
    time: 1735689600,
    open: 100,
    high: 110,
    low: 95,
    close: 105,
    volume: 1200000,
  },
];

const chart = createChart('#chart', {
  renderer: 'auto',
  theme: 'dark',
  width: 900,
  height: 500,
  interactions: {
    enableZoom: true,
    enablePan: true,
    enableCrosshair: true,
    enableYAxisScale: true,
  },
});

const candles = chart.addSeries({
  type: 'candlestick',
  data,
  upColor: '#26a69a',
  downColor: '#ef5350',
});

candles.appendData({
  time: 1735776000,
  open: 105,
  high: 112,
  low: 101,
  close: 109,
  volume: 980000,
});
```

React or Next.js client component:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { createChart, type CandlestickData, type Chart } from 'procharting';

const data: CandlestickData[] = [
  { time: 1735689600, open: 100, high: 110, low: 95, close: 105, volume: 1200000 },
];

export function ChartExample() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      renderer: 'auto',
      theme: 'dark',
      height: 500,
    });

    chart.addSeries({ type: 'candlestick', data });
    chartRef.current = chart;

    return () => {
      chart.destroy();
      chartRef.current = null;
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: 500 }} />;
}
```

## Props / API

`createChart(container, options)` accepts an HTMLElement or CSS selector and a
`ChartOptions` object.

| Option | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `renderer` | `'auto' | 'webgpu' | 'webgl2' | 'canvas2d'` | No | `'auto'` | Selects the renderer or lets ProCharting choose the best supported renderer. |
| `width` | `number` | No | Container width | Initial canvas width. |
| `height` | `number` | No | Container height | Initial canvas height. |
| `pixelRatio` | `number` | No | `window.devicePixelRatio` | Pixel ratio for high-DPI rendering. |
| `theme` | `'light' | 'dark' | ChartTheme` | No | Renderer default | Built-in theme name or custom theme object. |
| `interactions` | `InteractionOptions` | No | Enabled defaults | Controls zoom, pan, crosshair, and Y-axis scaling. |
| `performance` | `PerformanceOptions` | No | None | Optional worker, GPU preference, FPS, and memory hints. |

Main `Chart` methods:

| Method | Description |
| --- | --- |
| `addSeries(options)` | Adds candlestick, line, bar, or volume data. |
| `removeSeries(series)` | Removes a series returned by `addSeries`. |
| `resize(width, height)` | Resizes the chart canvas. |
| `setVisibleRange(from, to)` | Sets the visible X/time range. |
| `setYAxisRange(min, max)` | Sets the visible Y/price range. |
| `zoomIn(factor)` / `zoomOut(factor)` | Programmatic zoom controls. |
| `pan(offset)` | Programmatic horizontal pan. |
| `resetView()` | Resets the visible chart range. |
| `on(event, handler)` / `off(event, handler)` | Subscribes to chart events. |
| `destroy()` | Cleans up canvas, listeners, and renderer resources. |

## Data Format

Candlestick data uses Unix time in seconds.

```ts
type CandlestickData = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};
```

Line data:

```ts
type LineData = {
  time: number;
  value: number;
};
```

Volume data:

```ts
type VolumeData = {
  time: number;
  value: number;
  color?: string;
};
```

## Price Data

The price client can be imported from the GitHub facade subpath:

```ts
import { createPriceClient } from 'procharting/prices';

const client = createPriceClient({
  symbol: 'AAPL',
  provider: 'default',
});

const candles = await client.getPrices({ interval: '1d', limit: 30 });
```

The default provider uses no-key Stooq historical CSV data for daily, weekly,
and monthly candles. Use a custom provider for production market data,
authenticated APIs, or real-time feeds.

## Development

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

`pnpm lint` currently reports legacy lint debt outside the package-readiness
changes. The build, tests, and typecheck are the primary verification commands.

## Build

Build all workspace packages:

```bash
pnpm build
```

Build only the chart package:

```bash
pnpm --filter @procharting/core build
```

Create a local tarball for the GitHub facade:

```bash
pnpm pack --pack-destination /tmp/procharting-pack
```

## Folder Structure

```bash
packages/
  core/      # createChart API and renderer orchestration
  prices/    # optional normalized price-data client
  types/     # shared TypeScript interfaces
  utils/     # shared utilities
  webgl/     # WebGL2 renderer
  webgpu/    # WebGPU renderer
examples/
  basic/     # Vite browser example using createChart
TEST/
  binance-chart-test/ # standalone Next.js live-chart QA app
README.md
ARCHITECTURE.md
```

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `Cannot find module 'procharting'` | Run `pnpm build` before linking, or reinstall from GitHub after the latest commit is pushed. |
| `Cannot find module '@procharting/*'` | Use the root `procharting` GitHub facade, not a `packages/core` GitHub subdirectory install. |
| `workspace:* dependency not found` | Do not install `#path:/packages/core` directly; install the repository root with `pnpm add github:rabinovich101/ProCharting`. |
| CSS is not loading | The core package does not ship a required stylesheet. Ensure the chart container has explicit width and height. |
| Build failed because `pnpm` is missing | Run `corepack enable pnpm`, then rerun `pnpm install` and `pnpm build`. |
| TypeScript cannot find DOM types | Browser chart consumers need DOM libs enabled in `tsconfig.json`. |

## License

MIT
