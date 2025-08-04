# Binance Chart Test

This is a test Next.js application that demonstrates the ProCharting library with live BTCUSDT data from Binance API.

## Features

- Real-time candlestick chart for BTCUSDT
- Multiple timeframe options (1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M)
- Auto-refresh every 60 seconds
- Manual refresh button
- Responsive design

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How It Works

1. **Binance API Service** (`services/binanceApi.ts`):
   - Fetches kline/candlestick data from Binance's public API
   - Transforms data to ProCharting format
   - No API key required

2. **BinanceCandleChart Component** (`components/BinanceCandleChart.tsx`):
   - Manages chart state and data fetching
   - Handles interval selection
   - Auto-refreshes every minute
   - Responsive to window resizing

3. **Main Page** (`app/page.tsx`):
   - Renders the candle chart component

## API Endpoint

The app uses Binance's public API endpoint:
```
https://api.binance.com/api/v3/klines
```

Parameters:
- `symbol`: BTCUSDT
- `interval`: Selected timeframe
- `limit`: Number of candles (default: 200)

## Built With

- Next.js 15.4.5
- ProCharting library (local)
- Axios for API calls
- Tailwind CSS for styling
- TypeScript