import { NextResponse } from 'next/server';

const BYBIT_INSTRUMENTS_INFO_URL = 'https://api.bybit.com/v5/market/instruments-info?category=spot';
const CACHE_SECONDS = 60 * 60;

let tickerCache: { expiresAt: number; tickers: BybitTicker[] } | null = null;

interface BybitTicker {
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
    const response = await fetch(BYBIT_INSTRUMENTS_INFO_URL, {
      cache: 'no-store',
    });
    const data = await response.json();

    if (!response.ok || data?.retCode !== 0) {
      return NextResponse.json(
        { error: data?.retMsg || 'Bybit returned an error response.' },
        { status: response.ok ? 502 : response.status }
      );
    }

    const tickers = normalizeBybitInstruments(data);
    tickerCache = {
      expiresAt: now + CACHE_SECONDS * 1000,
      tickers,
    };

    return createTickerResponse(tickers);
  } catch {
    if (tickerCache) {
      return createTickerResponse(tickerCache.tickers);
    }

    return NextResponse.json({ error: 'Failed to fetch Bybit tickers.' }, { status: 500 });
  }
}

const createTickerResponse = (tickers: BybitTicker[]) =>
  NextResponse.json(
    { tickers },
    {
      headers: {
        'Cache-Control': `s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
      },
    }
  );

const normalizeBybitInstruments = (payload: unknown): BybitTicker[] => {
  if (!isRecord(payload) || !isRecord(payload.result) || !Array.isArray(payload.result.list)) {
    throw new Error('Bybit returned an unexpected instruments-info payload.');
  }

  return payload.result.list
    .filter(isTradingSpotInstrument)
    .map((entry) => ({
      symbol: entry.symbol,
      base: entry.baseCoin,
      quote: entry.quoteCoin,
    }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
};

interface BybitInstrument {
  symbol: string;
  status: string;
  baseCoin: string;
  quoteCoin: string;
}

const isTradingSpotInstrument = (value: unknown): value is BybitInstrument =>
  isRecord(value) &&
  typeof value.symbol === 'string' &&
  typeof value.status === 'string' &&
  typeof value.baseCoin === 'string' &&
  typeof value.quoteCoin === 'string' &&
  value.status === 'Trading';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
