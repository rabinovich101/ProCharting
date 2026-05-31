import { NextResponse } from 'next/server';

const ALLOWED_INTERVALS = new Set(['1m', '5m', '15m', '30m', '1h', '4h', '1d']);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') || 'BTCUSDT').toUpperCase();
  const interval = searchParams.get('interval') || '1m';
  const limit = searchParams.get('limit') || '100';

  if (!/^[A-Z0-9]{6,16}$/.test(symbol)) {
    return NextResponse.json({ error: 'Invalid Binance symbol.' }, { status: 400 });
  }

  if (!ALLOWED_INTERVALS.has(interval)) {
    return NextResponse.json({ error: 'Unsupported Binance interval.' }, { status: 400 });
  }

  try {
    const url = new URL('https://api.binance.com/api/v3/klines');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('interval', interval);
    url.searchParams.set('limit', limit);

    const response = await fetch(url, { cache: 'no-store' });
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.msg || 'Binance returned an error response.' },
        { status: response.status }
      );
    }

    if (!Array.isArray(data)) {
      return NextResponse.json({ error: 'Binance returned an unexpected payload.' }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
