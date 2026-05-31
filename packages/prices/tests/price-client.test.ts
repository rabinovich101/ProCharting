import { describe, expect, it } from 'vitest';
import {
  InvalidPriceQueryError,
  InvalidSymbolError,
  PriceNormalizationError,
  ProviderConfigurationError,
  createPriceClient,
  type CreatePriceClientOptions,
  type FetchLike,
  type PriceApiFunction
} from '../src/index.js';

const csvResponse = [
  'Date,Open,High,Low,Close,Volume',
  '2024-01-02,100,110,95,105,1000',
  '2024-01-03,105,115,101,112,1500'
].join('\n');

describe('createPriceClient', () => {
  it('validates and normalizes symbol input', async () => {
    const client = createPriceClient({
      symbol: ' aapl ',
      provider: 'custom',
      pricesApi: () => [
        { timestamp: 1_704_153_600, open: 100, high: 110, low: 95, close: 105 }
      ]
    });

    const candles = await client.getPrices();

    expect(client.symbol).toBe('AAPL');
    expect(candles[0]?.timestamp).toBe(1_704_153_600_000);
  });

  it('returns clear errors for missing or invalid symbols', () => {
    expect(() =>
      createPriceClient({ symbol: '', provider: 'custom', pricesApi: () => [] })
    ).toThrow(InvalidSymbolError);

    expect(() =>
      createPriceClient({ symbol: 'AAPL/USD', provider: 'custom', pricesApi: () => [] })
    ).toThrow(InvalidSymbolError);
  });

  it('passes request options to a custom price API and normalizes candles', async () => {
    const requests: string[] = [];
    const pricesApi: PriceApiFunction = ({ symbol, interval, timeframe }) => {
      requests.push(`${symbol}:${interval}:${timeframe}`);

      return {
        candles: [
          { time: '2024-01-02', o: '100', h: '110', l: '95', c: '105', v: '1000' }
        ]
      };
    };

    const client = createPriceClient({
      symbol: 'MSFT',
      provider: 'custom',
      interval: '1d',
      timeframe: '1mo',
      pricesApi
    });

    await expect(client.getPrices()).resolves.toEqual([
      {
        timestamp: Date.parse('2024-01-02'),
        open: 100,
        high: 110,
        low: 95,
        close: 105,
        volume: 1000
      }
    ]);
    expect(requests).toEqual(['MSFT:1d:1mo']);
  });

  it('derives latest price from default provider candles', async () => {
    const requestedUrls: string[] = [];
    const fetchMock: FetchLike = async (url) => {
      requestedUrls.push(url.toString());

      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => csvResponse
      };
    };

    const client = createPriceClient({
      symbol: 'AAPL',
      provider: 'default',
      defaultProvider: { fetch: fetchMock }
    });

    const candles = await client.getPrices({ limit: 1 });
    const latest = await client.getLatestPrice({ limit: 1 });

    expect(requestedUrls[0]).toContain('s=aapl.us');
    expect(candles).toEqual([
      {
        timestamp: Date.parse('2024-01-03'),
        open: 105,
        high: 115,
        low: 101,
        close: 112,
        volume: 1500
      }
    ]);
    expect(latest).toEqual({
      symbol: 'AAPL',
      price: 112,
      timestamp: Date.parse('2024-01-03'),
      source: 'stooq'
    });
  });

  it('throws normalization errors for malformed price candles', async () => {
    const client = createPriceClient({
      symbol: 'SPY',
      provider: 'custom',
      pricesApi: () => [
        { timestamp: Date.now(), open: 100, high: 90, low: 95, close: 98 }
      ]
    });

    await expect(client.getPrices()).rejects.toThrow(PriceNormalizationError);
  });

  it('validates query limits before provider calls', async () => {
    const client = createPriceClient({
      symbol: 'QQQ',
      provider: 'custom',
      pricesApi: () => []
    });

    await expect(client.getPrices({ limit: 0 })).rejects.toThrow(InvalidPriceQueryError);
  });

  it('returns clear configuration errors for missing custom APIs', () => {
    const options = {
      symbol: 'AAPL',
      provider: 'custom'
    } as unknown as CreatePriceClientOptions;

    expect(() => createPriceClient(options)).toThrow(ProviderConfigurationError);
  });

  it('runs an integration-style mocked price API flow', async () => {
    const mockedApi: PriceApiFunction = async ({ symbol }) => ({
      prices: [
        { date: '2024-01-02', open: 100, high: 102, low: 99, close: 101 },
        { date: '2024-01-03', open: 101, high: 104, low: 100, close: 103 }
      ],
      latest: {
        symbol,
        price: 103,
        timestamp: '2024-01-03T21:00:00.000Z',
        source: 'mocked-api'
      }
    });

    const client = createPriceClient({
      symbol: 'ETHUSD',
      provider: 'custom',
      pricesApi: mockedApi
    });

    await expect(client.getPrices()).resolves.toHaveLength(2);
    await expect(client.getLatestPrice()).resolves.toEqual({
      symbol: 'ETHUSD',
      price: 103,
      timestamp: Date.parse('2024-01-03T21:00:00.000Z'),
      source: 'mocked-api'
    });
  });

  it('supports a TradingView MCP quote adapter without making it the runtime default', async () => {
    const client = createPriceClient({
      symbol: 'BTCUSD',
      provider: 'tradingview-mcp',
      mcpClient: {
        yahooPrice: async () => ({ price: 65_000, timestamp: 1_704_153_600 })
      }
    });

    await expect(client.getLatestPrice()).resolves.toEqual({
      symbol: 'BTCUSD',
      price: 65_000,
      timestamp: 1_704_153_600_000,
      source: 'tradingview-mcp'
    });
  });
});
