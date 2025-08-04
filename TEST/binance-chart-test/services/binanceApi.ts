import axios from 'axios';

export interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
  ignore: string;
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const BINANCE_API_URL = 'https://api.binance.com/api/v3/klines';

export async function fetchBTCUSDT(interval: string = '1h', limit: number = 100): Promise<CandleData[]> {
  try {
    const response = await axios.get(BINANCE_API_URL, {
      params: {
        symbol: 'BTCUSDT',
        interval,
        limit
      }
    });

    // Transform Binance kline data to our chart format
    return response.data.map((kline: any[]): CandleData => ({
      time: kline[0], // Open time in milliseconds
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5])
    }));
  } catch (error) {
    console.error('Error fetching Binance data:', error);
    throw error;
  }
}

export const INTERVALS = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w',
  '1M': '1M'
} as const;

export type IntervalType = keyof typeof INTERVALS;