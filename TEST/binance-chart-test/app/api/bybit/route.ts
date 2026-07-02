import { NextResponse } from 'next/server';

const OUR_TO_BYBIT_INTERVAL: Record<string, string> = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '4h': '240',
  '1d': 'D',
  '1w': 'W',
  '1M': 'M',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') || 'BTCUSDT').toUpperCase();
  const interval = searchParams.get('interval') || '1m';
  const limit = searchParams.get('limit') || '100';

  if (!/^[A-Z0-9]{6,16}$/.test(symbol)) {
    return NextResponse.json({ error: 'Invalid Bybit symbol.' }, { status: 400 });
  }

  const bybitInterval = OUR_TO_BYBIT_INTERVAL[interval];

  if (!bybitInterval) {
    return NextResponse.json({ error: 'Unsupported Bybit interval.' }, { status: 400 });
  }

  try {
    const url = new URL('https://api.bybit.com/v5/market/kline');
    url.searchParams.set('category', 'spot');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('interval', bybitInterval);
    url.searchParams.set('limit', limit);

    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();

    if (!response.ok || data?.retCode !== 0) {
      return NextResponse.json(
        { error: data?.retMsg || 'Bybit returned an error response.' },
        { status: response.ok ? 502 : response.status }
      );
    }

    const list = data?.result?.list;

    if (!Array.isArray(list)) {
      return NextResponse.json({ error: 'Bybit returned an unexpected payload.' }, { status: 502 });
    }

    return NextResponse.json([...list].reverse());
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
