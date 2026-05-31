import { PriceNormalizationError } from './errors.js';
import type { LatestPrice, PriceCandle } from './types.js';

type UnknownRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readOptionalNumber(record: UnknownRecord, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];

    if (value === undefined || value === null || value === '') {
      continue;
    }

    const numberValue = typeof value === 'number' ? value : Number(value);

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return undefined;
}

export function normalizeTimestamp(value: unknown, fieldName = 'timestamp'): number {
  if (value instanceof Date) {
    const timestamp = value.getTime();

    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }

  if (typeof value === 'number') {
    return normalizeNumericTimestamp(value, fieldName);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const numeric = Number(trimmed);

    if (trimmed.length > 0 && Number.isFinite(numeric)) {
      return normalizeNumericTimestamp(numeric, fieldName);
    }

    const parsed = Date.parse(trimmed);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw new PriceNormalizationError(`Invalid ${fieldName}; expected a Date, ISO date string, or Unix timestamp.`);
}

export function normalizePriceCandles(payload: unknown, source: string): PriceCandle[] {
  const records = extractCandleRecords(payload);

  if (records.length === 0) {
    throw new PriceNormalizationError(`No price candles were returned by ${source}.`);
  }

  return records.map(normalizePriceCandle).sort((left, right) => left.timestamp - right.timestamp);
}

export function normalizeLatestPrice(payload: unknown, symbol: string, source: string): LatestPrice {
  if (isRecord(payload) && isRecord(payload['latest'])) {
    return normalizeLatestRecord(payload['latest'], symbol, source);
  }

  const candles = tryNormalizeCandles(payload, source);

  if (candles.length > 0) {
    const latest = candles[candles.length - 1];

    if (latest === undefined) {
      throw new PriceNormalizationError(`No latest price was returned by ${source}.`);
    }

    return {
      symbol,
      price: latest.close,
      timestamp: latest.timestamp,
      source
    };
  }

  if (isRecord(payload)) {
    return normalizeLatestRecord(payload, symbol, source);
  }

  throw new PriceNormalizationError(`No latest price was returned by ${source}.`);
}

export function latestPriceFromCandles(candles: readonly PriceCandle[], symbol: string, source: string): LatestPrice {
  const latest = candles[candles.length - 1];

  if (latest === undefined) {
    throw new PriceNormalizationError(`No price candles were returned by ${source}.`);
  }

  return {
    symbol,
    price: latest.close,
    timestamp: latest.timestamp,
    source
  };
}

function normalizeNumericTimestamp(value: number, fieldName: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new PriceNormalizationError(`Invalid ${fieldName}; expected a positive Unix timestamp.`);
  }

  return value < 1_000_000_000_000 ? value * 1000 : value;
}

function extractCandleRecords(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  const arrayCandidate = payload['candles'] ?? payload['prices'] ?? payload['data'] ?? payload['values'];

  if (Array.isArray(arrayCandidate)) {
    return arrayCandidate;
  }

  if (hasCandleShape(payload)) {
    return [payload];
  }

  return [];
}

function tryNormalizeCandles(payload: unknown, source: string): PriceCandle[] {
  try {
    return normalizePriceCandles(payload, source);
  } catch (error) {
    if (error instanceof PriceNormalizationError) {
      return [];
    }

    throw error;
  }
}

function normalizePriceCandle(value: unknown): PriceCandle {
  if (!isRecord(value)) {
    throw new PriceNormalizationError('Each price candle must be an object.');
  }

  const timestampValue = value['timestamp'] ?? value['time'] ?? value['date'] ?? value['datetime'];
  const timestamp = normalizeTimestamp(timestampValue);
  const open = requiredNumber(value, ['open', 'o'], 'open');
  const high = requiredNumber(value, ['high', 'h'], 'high');
  const low = requiredNumber(value, ['low', 'l'], 'low');
  const close = requiredNumber(value, ['close', 'c', 'price'], 'close');
  const volume = readOptionalNumber(value, ['volume', 'v']);

  if (high < low) {
    throw new PriceNormalizationError('Invalid price candle; high cannot be lower than low.');
  }

  if (open > high || close > high || open < low || close < low) {
    throw new PriceNormalizationError('Invalid price candle; open and close must be inside the high/low range.');
  }

  if (volume !== undefined && volume < 0) {
    throw new PriceNormalizationError('Invalid price candle; volume cannot be negative.');
  }

  return volume === undefined
    ? { timestamp, open, high, low, close }
    : { timestamp, open, high, low, close, volume };
}

function normalizeLatestRecord(record: UnknownRecord, symbol: string, source: string): LatestPrice {
  const price = requiredNumber(record, ['price', 'close', 'regularMarketPrice'], 'price');
  const timestampValue =
    record['timestamp'] ??
    record['time'] ??
    record['date'] ??
    record['datetime'] ??
    record['regularMarketTime'];

  return {
    symbol: readSymbol(record) ?? symbol,
    price,
    timestamp: normalizeTimestamp(timestampValue),
    source: readSource(record) ?? source
  };
}

function requiredNumber(record: UnknownRecord, keys: readonly string[], fieldName: string): number {
  const value = readOptionalNumber(record, keys);

  if (value === undefined) {
    throw new PriceNormalizationError(`Invalid price data; missing numeric ${fieldName}.`);
  }

  return value;
}

function hasCandleShape(record: UnknownRecord): boolean {
  return (
    (record['timestamp'] !== undefined || record['time'] !== undefined || record['date'] !== undefined) &&
    (record['open'] !== undefined || record['o'] !== undefined) &&
    (record['high'] !== undefined || record['h'] !== undefined) &&
    (record['low'] !== undefined || record['l'] !== undefined) &&
    (record['close'] !== undefined || record['c'] !== undefined || record['price'] !== undefined)
  );
}

function readSymbol(record: UnknownRecord): string | undefined {
  const value = record['symbol'];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim().toUpperCase() : undefined;
}

function readSource(record: UnknownRecord): string | undefined {
  const value = record['source'];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}
