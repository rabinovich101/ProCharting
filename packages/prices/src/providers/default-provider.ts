import { PriceClientError, ProviderConfigurationError, ProviderRequestError } from '../errors.js';
import { latestPriceFromCandles, normalizePriceCandles, normalizeTimestamp } from '../normalize.js';
import type {
  DefaultProviderOptions,
  FetchLike,
  LatestPrice,
  PriceCandle,
  PriceProvider,
  PriceRequest
} from '../types.js';

const DEFAULT_STOOQ_BASE_URL = 'https://stooq.com/q/d/l/';

export class DefaultPriceProvider implements PriceProvider {
  readonly source: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;
  private readonly symbolMap: Record<string, string>;

  constructor(options: DefaultProviderOptions = {}) {
    const fetchImpl = options.fetch ?? globalThis.fetch?.bind(globalThis);

    if (fetchImpl === undefined) {
      throw new ProviderConfigurationError(
        'Default provider requires fetch. Use Node.js 18+, a browser runtime, or pass defaultProvider.fetch.'
      );
    }

    this.fetchImpl = fetchImpl;
    this.baseUrl = options.baseUrl ?? DEFAULT_STOOQ_BASE_URL;
    this.source = options.source ?? 'stooq';
    this.symbolMap = options.symbolMap ?? {};
  }

  async getPrices(request: PriceRequest): Promise<PriceCandle[]> {
    const url = this.buildUrl(request);
    const text = await this.fetchCsv(url, request.symbol);
    const candles = normalizePriceCandles(parseStooqCsv(text), this.source);
    return applyQueryWindow(candles, request);
  }

  async getLatestPrice(request: PriceRequest): Promise<LatestPrice> {
    const candles = await this.getPrices(request);
    return latestPriceFromCandles(candles, request.symbol, this.source);
  }

  private buildUrl(request: PriceRequest): URL {
    const url = new URL(this.baseUrl);
    url.searchParams.set('s', this.toProviderSymbol(request.symbol));
    url.searchParams.set('i', toStooqInterval(request.interval));

    if (request.from !== undefined) {
      url.searchParams.set('d1', toStooqDate(request.from));
    }

    if (request.to !== undefined) {
      url.searchParams.set('d2', toStooqDate(request.to));
    }

    return url;
  }

  private toProviderSymbol(symbol: string): string {
    const mapped = this.symbolMap[symbol];

    if (mapped !== undefined) {
      return mapped;
    }

    if (/^[A-Z]{1,5}$/.test(symbol)) {
      return `${symbol.toLowerCase()}.us`;
    }

    return symbol.toLowerCase();
  }

  private async fetchCsv(url: URL, symbol: string): Promise<string> {
    try {
      const response = await this.fetchImpl(url.toString());

      if (!response.ok) {
        throw new ProviderRequestError(
          `Default provider request failed for ${symbol}: ${response.status} ${response.statusText}.`
        );
      }

      return await response.text();
    } catch (error) {
      if (error instanceof PriceClientError) {
        throw error;
      }

      throw new ProviderRequestError(`Default provider request failed for ${symbol}.`, error);
    }
  }
}

function toStooqInterval(interval: string | undefined): string {
  switch (interval ?? '1d') {
    case '1d':
      return 'd';
    case '1wk':
    case '1w':
      return 'w';
    case '1mo':
    case '1M':
      return 'm';
    default:
      throw new ProviderConfigurationError(
        'Default provider supports daily, weekly, and monthly candles only. Use a custom provider for intraday data.'
      );
  }
}

function parseStooqCsv(csv: string): unknown[] {
  const trimmed = csv.trim();

  if (trimmed.length === 0 || /no data/i.test(trimmed)) {
    throw new ProviderRequestError('Default provider returned no data.');
  }

  const [headerLine, ...rows] = trimmed.split(/\r?\n/);

  if (headerLine === undefined || rows.length === 0) {
    throw new ProviderRequestError('Default provider returned an invalid CSV response.');
  }

  const headers = headerLine.split(',').map((header) => header.trim());

  return rows
    .filter((row) => row.trim().length > 0)
    .map((row) => {
      const columns = row.split(',');
      const record: Record<string, unknown> = {};

      headers.forEach((header, index) => {
        record[header.toLowerCase()] = columns[index]?.trim();
      });

      return record;
    });
}

function applyQueryWindow(candles: readonly PriceCandle[], request: PriceRequest): PriceCandle[] {
  let result = [...candles];

  if (request.from !== undefined) {
    const from = normalizeTimestamp(request.from, 'from');
    result = result.filter((candle) => candle.timestamp >= from);
  } else if (request.timeframe !== undefined && request.timeframe !== 'max') {
    const cutoff = timeframeCutoff(result, request.timeframe);
    result = result.filter((candle) => candle.timestamp >= cutoff);
  }

  if (request.to !== undefined) {
    const to = normalizeTimestamp(request.to, 'to');
    result = result.filter((candle) => candle.timestamp <= to);
  }

  if (request.limit !== undefined) {
    result = result.slice(-request.limit);
  }

  return result;
}

function timeframeCutoff(candles: readonly PriceCandle[], timeframe: string): number {
  const latest = candles[candles.length - 1];

  if (latest === undefined) {
    return 0;
  }

  const date = new Date(latest.timestamp);

  switch (timeframe) {
    case '1d':
      date.setUTCDate(date.getUTCDate() - 1);
      break;
    case '5d':
      date.setUTCDate(date.getUTCDate() - 5);
      break;
    case '1mo':
      date.setUTCMonth(date.getUTCMonth() - 1);
      break;
    case '3mo':
      date.setUTCMonth(date.getUTCMonth() - 3);
      break;
    case '6mo':
      date.setUTCMonth(date.getUTCMonth() - 6);
      break;
    case '1y':
      date.setUTCFullYear(date.getUTCFullYear() - 1);
      break;
    case '2y':
      date.setUTCFullYear(date.getUTCFullYear() - 2);
      break;
    case '5y':
      date.setUTCFullYear(date.getUTCFullYear() - 5);
      break;
    default:
      throw new ProviderConfigurationError(`Unsupported timeframe "${timeframe}".`);
  }

  return date.getTime();
}

function toStooqDate(value: Date | number | string): string {
  const date = new Date(normalizeTimestamp(value));
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}
