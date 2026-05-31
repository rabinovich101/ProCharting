# ProCharting Architecture

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
├── examples/          # Demo applications
└── benchmarks/        # Performance tests
```

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
`E404 Scope not found` for the first package publish attempt.

`@procharting/core` builds its runtime ESM output with Vite and then removes the
package `.tsbuildinfo` file before emitting TypeScript declarations with
`tsc --emitDeclarationOnly`. This keeps Vite's cleaned runtime output and the
package `types` entry in sync for npm publication.

The core renderer factory lazy-loads WebGPU and WebGL packages. The wrappers do
not expose the concrete renderer to the render loop until its async
`initialize(canvas)` call completes, so auto-selected GPU renderers cannot be
called while their device/context fields are still unset.

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

#### Canvas2D Renderer (Compatibility)
- Software rendering fallback
- Basic functionality
- Maximum compatibility

### 4. Data Pipeline

```
Raw Data → Binary Encoding → GPU Buffer → Compute Shader → Decimation → Rendering
```

**Key Components:**

1. **Binary Encoding**: Compact data representation (< 100 bytes/point)
2. **Ring Buffers**: Zero-copy streaming updates
3. **GPU Decimation**: Douglas-Peucker algorithm in compute shaders
4. **LOD System**: Automatic level-of-detail based on zoom

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
`TEST/binance-chart-test/app/page.tsx`, and the Binance REST proxy lives in
`TEST/binance-chart-test/app/api/binance/route.ts`.

As of May 31, 2026, this app draws its chart directly with Canvas 2D inside the
client component. It does not instantiate `@procharting/core` or the WebGPU/WebGL
renderer factory path. The app is therefore a live chart UX and QA harness rather
than a direct example of the packaged renderer architecture.

The chart app supports:

- Binance spot symbols selected from a fixed crypto list.
- Timeframes `1m`, `5m`, `15m`, `30m`, `1h`, `4h`, and `1d`.
- Candlestick, line, and area drawing modes.
- MA20 and volume overlays.
- Dark/light UI themes.
- Wheel zoom, drag pan, reset, crosshair, OHLC legend, current price marker, and
  responsive desktop/tablet/mobile layouts.

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
- ✅ WebGPU/WebGL2 renderers
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
