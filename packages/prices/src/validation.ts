import { InvalidPriceQueryError, InvalidSymbolError } from './errors.js';
import type { PriceQueryOptions } from './types.js';

const SYMBOL_PATTERN = /^[A-Z0-9](?:[A-Z0-9._:-]{0,30}[A-Z0-9])?$/;

export function normalizeSymbolInput(symbol: unknown): string {
  if (typeof symbol !== 'string') {
    throw new InvalidSymbolError('A market symbol is required.');
  }

  const normalized = symbol.trim().toUpperCase();

  if (normalized.length === 0) {
    throw new InvalidSymbolError('A market symbol is required.');
  }

  if (!SYMBOL_PATTERN.test(normalized)) {
    throw new InvalidSymbolError(
      `Invalid market symbol "${symbol}". Use letters, numbers, dots, dashes, underscores, or colons.`
    );
  }

  return normalized;
}

export function validatePriceQueryOptions(options: PriceQueryOptions): void {
  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit <= 0)) {
    throw new InvalidPriceQueryError('Price query limit must be a positive integer.');
  }
}
