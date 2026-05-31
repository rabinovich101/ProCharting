# @procharting/prices

Provider-based market price client for ProCharting applications.

## Installation

```bash
npm install @procharting/prices
pnpm add @procharting/prices
yarn add @procharting/prices
bun add @procharting/prices
```

## Default Provider

The default provider uses Stooq historical CSV data. It needs no API key and
supports daily, weekly, and monthly candles. Treat it as delayed historical data
for demos and lightweight applications, not as a guaranteed real-time trading
feed.

```ts
import { createPriceClient } from '@procharting/prices';

const client = createPriceClient({
  symbol: 'AAPL',
  provider: 'default'
});

const prices = await client.getPrices({ interval: '1d', limit: 30 });
const latest = await client.getLatestPrice();
```

## Custom Provider

Pass `provider: 'custom'` when you have your own API, paid market data account,
or backend proxy.

```ts
import { createPriceClient } from '@procharting/prices';

const client = createPriceClient({
  symbol: 'AAPL',
  provider: 'custom',
  pricesApi: async ({ symbol, timeframe, interval }) => {
    const res = await fetch(
      `https://my-api.com/prices?symbol=${symbol}&timeframe=${timeframe ?? '1mo'}&interval=${interval ?? '1d'}`
    );

    return res.json();
  }
});

const prices = await client.getPrices();
```

All providers normalize candles to:

```ts
type PriceCandle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};
```

`timestamp` is Unix epoch milliseconds. Numeric second-based timestamps from
custom APIs are converted to milliseconds during normalization.

Custom APIs may return:

```ts
type CustomPriceResponse =
  | PriceCandle[]
  | {
      candles?: PriceCandle[];
      prices?: PriceCandle[];
      data?: PriceCandle[];
      latest?: {
        symbol: string;
        price: number;
        timestamp: number | string | Date;
        source?: string;
      };
    };
```

## Error Handling

```ts
import {
  InvalidSymbolError,
  PriceNormalizationError,
  createPriceClient
} from '@procharting/prices';

try {
  const client = createPriceClient({ symbol: 'MSFT', provider: 'default' });
  await client.getPrices();
} catch (error) {
  if (error instanceof InvalidSymbolError) {
    console.error('Missing or invalid symbol.');
  } else if (error instanceof PriceNormalizationError) {
    console.error('Provider response could not be normalized.');
  }
}
```

## CommonJS

```js
const { createPriceClient } = require('@procharting/prices');
```

## TradingView MCP

TradingView MCP tools can exist in a Codex/MCP environment, but they are not a
normal npm runtime dependency for every end user. This package does not pretend
the MCP server is always available. Use `provider: 'tradingview-mcp'` only when
your application supplies an MCP-compatible adapter.

```ts
const client = createPriceClient({
  symbol: 'BTCUSD',
  provider: 'tradingview-mcp',
  mcpClient: {
    yahooPrice: async ({ symbol }) => bridgeToMcpYahooPrice({ symbol })
  }
});
```

For production-grade real-time or intraday data, use the custom provider with an
official market data API such as Twelve Data or Alpha Vantage.
