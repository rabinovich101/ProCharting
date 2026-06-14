import { NextResponse } from 'next/server';

const BINANCE_EXCHANGE_INFO_URL = 'https://api.binance.com/api/v3/exchangeInfo';
const BINANCE_ASSET_METADATA_URL = 'https://www.binance.com/bapi/asset/v2/public/asset/asset/get-all-asset';
const CACHE_SECONDS = 60 * 60;

let tickerCache: { expiresAt: number; tickers: BinanceTicker[] } | null = null;

interface BinanceTicker {
  symbol: string;
  base: string;
  quote: string;
  iconUrl?: string;
}

export async function GET() {
  const now = Date.now();

  if (tickerCache && tickerCache.expiresAt > now) {
    return createTickerResponse(tickerCache.tickers);
  }

  try {
    const [response, assetIcons] = await Promise.all([
      fetch(BINANCE_EXCHANGE_INFO_URL, {
        cache: 'no-store',
      }),
      fetchBinanceAssetIcons(),
    ]);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.msg || 'Binance returned an error response.' },
        { status: response.status }
      );
    }

    const tickers = normalizeBinanceTickers(data, assetIcons);
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

const normalizeBinanceTickers = (payload: unknown, assetIcons = new Map<string, string>()): BinanceTicker[] => {
  if (!isRecord(payload) || !Array.isArray(payload.symbols)) {
    throw new Error('Binance returned an unexpected exchangeInfo payload.');
  }

  return payload.symbols
    .filter(isTradingSpotSymbol)
    .map((entry) => {
      const iconUrl = assetIcons.get(entry.baseAsset);

      return {
        symbol: entry.symbol,
        base: entry.baseAsset,
        quote: entry.quoteAsset,
        ...(iconUrl ? { iconUrl } : {}),
      };
    })
    .sort((a, b) => a.symbol.localeCompare(b.symbol));
};

const fetchBinanceAssetIcons = async (): Promise<Map<string, string>> => {
  try {
    const response = await fetch(BINANCE_ASSET_METADATA_URL, {
      cache: 'no-store',
    });
    const data = await response.json();

    if (!response.ok) {
      return new Map();
    }

    return normalizeBinanceAssetIcons(data);
  } catch {
    return new Map();
  }
};

const normalizeBinanceAssetIcons = (payload: unknown): Map<string, string> => {
  const icons = new Map<string, string>();

  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    return icons;
  }

  for (const asset of payload.data) {
    if (!isBinanceAssetMetadata(asset)) {
      continue;
    }

    const iconUrl = getHttpUrl(asset.fullLogoUrl) ?? getHttpUrl(asset.logoUrl);

    if (iconUrl) {
      icons.set(asset.assetCode, createAssetLogoProxyUrl(iconUrl));
    }
  }

  return icons;
};

const createAssetLogoProxyUrl = (sourceUrl: string) =>
  `/api/binance/asset-logo?url=${encodeURIComponent(sourceUrl)}`;

interface BinanceExchangeInfoSymbol {
  symbol: string;
  status: string;
  baseAsset: string;
  quoteAsset: string;
  isSpotTradingAllowed?: boolean;
  permissions?: unknown[];
  permissionSets?: unknown[];
}

interface BinanceAssetMetadata {
  assetCode: string;
  logoUrl?: string;
  fullLogoUrl?: string;
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

const isBinanceAssetMetadata = (value: unknown): value is BinanceAssetMetadata =>
  isRecord(value) &&
  typeof value.assetCode === 'string' &&
  value.assetCode.length > 0 &&
  (value.logoUrl === undefined || typeof value.logoUrl === 'string') &&
  (value.fullLogoUrl === undefined || typeof value.fullLogoUrl === 'string');

const getHttpUrl = (value: string | undefined) => {
  if (!value) return null;

  try {
    const url = new URL(value);

    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
