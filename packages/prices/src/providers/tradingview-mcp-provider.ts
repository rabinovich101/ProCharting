import { PriceClientError, ProviderConfigurationError, ProviderRequestError } from '../errors.js';
import {
  latestPriceFromCandles,
  normalizePriceCandles,
  normalizeTimestamp,
  readOptionalNumber,
  isRecord
} from '../normalize.js';
import type {
  LatestPrice,
  PriceCandle,
  PriceProvider,
  PriceRequest,
  TradingViewMcpClient
} from '../types.js';

export class TradingViewMcpProvider implements PriceProvider {
  readonly source: string;
  private readonly client: TradingViewMcpClient;

  constructor(client: TradingViewMcpClient, source = 'tradingview-mcp') {
    if (!isRecord(client)) {
      throw new ProviderConfigurationError(
        'TradingView MCP provider requires an MCP-compatible client adapter.'
      );
    }

    this.client = client;
    this.source = source;
  }

  async getPrices(request: PriceRequest): Promise<PriceCandle[]> {
    if (this.client.getCandles === undefined) {
      throw new ProviderConfigurationError(
        'TradingView MCP is not exposed as a stable package runtime candle API. Pass an adapter with getCandles or use a custom provider.'
      );
    }

    const payload = await this.callProvider(() => this.client.getCandles?.(request), request.symbol);
    return normalizePriceCandles(payload, this.source);
  }

  async getLatestPrice(request: PriceRequest): Promise<LatestPrice> {
    if (this.client.yahooPrice !== undefined) {
      const payload = await this.callProvider(() => this.client.yahooPrice?.({ symbol: request.symbol }), request.symbol);
      return normalizeTradingViewQuote(payload, request.symbol, this.source);
    }

    const candles = await this.getPrices(request);
    return latestPriceFromCandles(candles, request.symbol, this.source);
  }

  private async callProvider(load: () => Promise<unknown> | undefined, symbol: string): Promise<unknown> {
    try {
      const payload = await load();

      if (payload === undefined) {
        throw new ProviderConfigurationError(`TradingView MCP adapter returned no data for ${symbol}.`);
      }

      return payload;
    } catch (error) {
      if (error instanceof PriceClientError) {
        throw error;
      }

      throw new ProviderRequestError(`TradingView MCP adapter failed for ${symbol}.`, error);
    }
  }
}

function normalizeTradingViewQuote(payload: unknown, symbol: string, source: string): LatestPrice {
  if (!isRecord(payload)) {
    throw new ProviderRequestError('TradingView MCP adapter returned an invalid quote response.');
  }

  const price = readOptionalNumber(payload, [
    'price',
    'regularMarketPrice',
    'regular_market_price',
    'close'
  ]);

  if (price === undefined) {
    throw new ProviderRequestError('TradingView MCP adapter returned a quote without a numeric price.');
  }

  const timestampValue =
    payload['timestamp'] ??
    payload['time'] ??
    payload['regularMarketTime'] ??
    payload['regular_market_time'] ??
    Date.now();

  return {
    symbol,
    price,
    timestamp: normalizeTimestamp(timestampValue),
    source
  };
}
