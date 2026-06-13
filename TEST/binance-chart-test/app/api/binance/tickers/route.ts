import { NextResponse } from 'next/server';

const BINANCE_EXCHANGE_INFO_URL = 'https://api.binance.com/api/v3/exchangeInfo';
const CACHE_SECONDS = 60 * 60;

let tickerCache: { expiresAt: number; tickers: BinanceTicker[] } | null = null;

interface BinanceTicker {
  symbol: string;
  base: string;
  quote: string;
}

export async function GET() {
  const now = Date.now();

  if (tickerCache && tickerCache.expiresAt > now) {
    return createTickerResponse(tickerCache.tickers);
  }

  try {
    const response = await fetch(BINANCE_EXCHANGE_INFO_URL, {
      cache: 'no-store',
    });
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.msg || 'Binance returned an error response.' },
        { status: response.status }
      );
    }

    const tickers = normalizeBinanceTickers(data);
    tickerCache = {
      expiresAt: now + CACHE_SECONDS * 1000,
      tickers,
    };

    return createTickerResponse(tickers);
  } catch {
    if (tickerCache) {
      return createTickerResponse(tickerCache.tickers);
    }

    return NextResponse.json({ error: 'Failed to fetch Binance tickers.' }, { status: 500 });
  }
}

const createTickerResponse = (tickers: BinanceTicker[]) =>
  NextResponse.json(
    { tickers },
    {
      headers: {
        'Cache-Control': `s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
      },
    }
  );

const normalizeBinanceTickers = (payload: unknown): BinanceTicker[] => {
  if (!isRecord(payload) || !Array.isArray(payload.symbols)) {
    throw new Error('Binance returned an unexpected exchangeInfo payload.');
  }

  return payload.symbols
    .filter(isTradingSpotSymbol)
    .map((entry) => ({
      symbol: entry.symbol,
      base: entry.baseAsset,
      quote: entry.quoteAsset,
    }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
};

interface BinanceExchangeInfoSymbol {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  isSpotTradingAllowed?: boolean;
  permissions?: unknown[];
  permissionSets?: unknown[];
}

const isTradingSpotSymbol = (value: unknown): value is BinanceExchangeInfoSymbol => {
  if (!isRecord(value)) return false;

  const hasLegacySpotPermission = Array.isArray(value.permissions) && value.permissions.includes('SPOT');
  const hasPermissionSetSpot =
    Array.isArray(value.permissionSets) &&
    value.permissionSets.some((permissionSet) => Array.isArray(permissionSet) && permissionSet.includes('SPOT'));
  const hasSpotPermission = value.isSpotTradingAllowed === true || hasLegacySpotPermission || hasPermissionSetSpot;

  return (
    typeof value.symbol === 'string' &&
    typeof value.status === 'string' &&
    typeof value.baseAsset === 'string' &&
    typeof value.quoteAsset === 'string' &&
    value.status === 'TRADING' &&
    value.isSpotTradingAllowed !== false &&
    hasSpotPermission
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
