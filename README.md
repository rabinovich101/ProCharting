# ProCharting

High-performance financial charting for browser applications. ProCharting
provides a live market-chart application with candlesticks, indicators,
crosshair inspection, zooming, panning, saved-layout account boundaries, and
renderer support across WebGPU, WebGL2, and Canvas 2D paths.

The public hosted app is available at:

https://procharts.thefiscalwire.com

This repository documents Docker-based evaluation and self-hosting only.

## Licensing Notice

ProCharting is proprietary software and is not free to use. Cloning this
repository, building the Docker image, viewing the source, hosting the app,
embedding it, or using it inside another product or service does not grant
usage rights. Production use, commercial use, redistribution, SaaS use, hosted
use, and iframe embedding require prior written permission and a valid paid
license from Oleg Rabinovich.

## Features

- Live market chart app served by Docker or the hosted deployment.
- Candlestick, line, bar, and volume chart modes.
- Renderer selection across WebGPU, WebGL2, and Canvas 2D fallback paths.
- Mouse wheel zoom, drag pan, Y-axis scaling, crosshair events, and resize
  handling.
- Indicator and layout UI for chart exploration.
- Optional Supabase-backed account boundary when public Supabase environment
  variables are provided.

## Run With Docker

Requirements:

- Docker Engine or Docker Desktop with Docker Compose v2.

Start the chart app:

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

Stop the app:

```bash
docker compose down
```

The Docker image builds the standalone Next.js chart app in
`TEST/binance-chart-test` and serves it on container port `3000`. The root
`docker-compose.yml` maps that service to host port `3000`.

### Optional Supabase Environment

The app works in a public signed-out mode when Supabase public environment
variables are absent. To connect the account UI to a Supabase project, provide
the public URL and key before starting Docker:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co" \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-public-key" \
docker compose up --build
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported for deployments that still use
the older public anon-key name.

## Embed With An Iframe

Use the hosted app URL when you have a license for hosted embedding:

```html
<iframe
  src="https://procharts.thefiscalwire.com"
  title="ProCharting market chart"
  loading="lazy"
  allowfullscreen
  style="width: 100%; height: min(80vh, 760px); min-height: 520px; border: 0; display: block;"
></iframe>
```

For a self-hosted Docker deployment, replace `src` with the HTTPS URL that
points to your Docker-served ProCharting app:

```html
<iframe
  src="https://charts.your-domain.example"
  title="ProCharting market chart"
  loading="lazy"
  allowfullscreen
  style="width: 100%; height: min(80vh, 760px); min-height: 520px; border: 0; display: block;"
></iframe>
```

Recommended embedding notes:

- Serve production embeds over HTTPS.
- Give the iframe a stable height; the chart is an interactive application, not
  a small inline widget.
- Use a descriptive `title` for accessibility.
- If you add a restrictive `sandbox` attribute, test all interactions you need
  because authentication, popups, downloads, and fullscreen can be affected.
- Keep the iframe URL on an allowed licensed domain.

## Repository Layout

```text
Dockerfile                 # Docker build for the chart app
docker-compose.yml         # Local Docker run configuration
TEST/binance-chart-test/   # Standalone Next.js chart app
packages/core/             # createChart API and renderer orchestration
packages/prices/           # Optional normalized price-data client
packages/types/            # Shared TypeScript interfaces
packages/utils/            # Shared utilities
packages/webgl/            # WebGL2 renderer
packages/webgpu/           # WebGPU renderer
infra/supabase/            # Docker-only Supabase helper boundary
ARCHITECTURE.md            # Architecture notes
```

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Docker Compose is not available | Install Docker Desktop or Docker Engine with the Compose v2 plugin, then rerun `docker compose up --build`. |
| Host port `3000` is already in use | Change the host-side port in `docker-compose.yml`, for example `3001:3000`, then open `http://localhost:3001`. |
| Account buttons show that accounts are not connected | Provide `NEXT_PUBLIC_SUPABASE_URL` and either `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| Iframe is too short or clipped | Increase the iframe height or use a responsive wrapper with a minimum height of at least `520px`. |

## Support The Project

If you want to contribute to ProCharting by supporting the project, you can use
one of these crypto addresses:

| Network | Address |
| --- | --- |
| Bitcoin | `bc1qfk3wug57fqt42m7ghtvuvlghwk9v6h4x28uryw` |
| Solana | `GV64YGniKMgrk8v992hkuNVzvt7soGQL9vqWtDGge8ry` |
| Ethereum | `0x88C8cAfd5D0163994A9C4099640ebDF1db604F11` |
| BNB Smart Chain | `0x88C8cAfd5D0163994A9C4099640ebDF1db604F11` |

Voluntary support does not grant a license, usage rights, redistribution
rights, or permission to embed ProCharting without prior written approval.

## License

Proprietary. See [LICENSE](LICENSE). ProCharting is not open-source software
and is not free to use without a written paid license from Oleg Rabinovich.
