import { NextResponse } from 'next/server';

const BINANCE_ICON_HOST = 'bin.bnbstatic.com';
const CACHE_SECONDS = 60 * 60 * 24 * 30;

export async function GET(request: Request) {
  const sourceUrl = getTrustedBinanceIconUrl(new URL(request.url).searchParams.get('url'));

  if (!sourceUrl) {
    return NextResponse.json({ error: 'Invalid Binance logo URL.' }, { status: 400 });
  }

  try {
    const response = await fetch(sourceUrl, {
      cache: 'force-cache',
    });

    if (!response.ok || !response.body) {
      return NextResponse.json({ error: 'Binance logo unavailable.' }, { status: 502 });
    }

    const contentType = response.headers.get('content-type') ?? 'image/png';

    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Binance logo response was not an image.' }, { status: 502 });
    }

    return new NextResponse(response.body, {
      headers: {
        'Cache-Control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
        'Content-Type': contentType,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch Binance logo.' }, { status: 502 });
  }
}

const getTrustedBinanceIconUrl = (value: string | null) => {
  if (!value) return null;

  try {
    const url = new URL(value);

    return url.protocol === 'https:' && url.hostname === BINANCE_ICON_HOST ? url.toString() : null;
  } catch {
    return null;
  }
};
