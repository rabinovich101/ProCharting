'use client';

import { useEffect, useState } from 'react';
import { fetchBTCUSDT, type CandleData, INTERVALS, type IntervalType } from '@/services/binanceApi';
import LiveCanvasChart from '@/components/LiveCanvasChart';

export default function LivePage() {
  const [data, setData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<IntervalType>('1m');

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        const candleData = await fetchBTCUSDT(interval, 200);
        setData(candleData);
      } catch (err) {
        setError('Failed to fetch initial data from Binance');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [interval]);

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Live Bitcoin Chart</h1>
            <p className="text-gray-400 mt-1">Real-time candlestick updates via WebSocket</p>
          </div>
          <div className="flex gap-2 items-center">
            <label htmlFor="interval" className="text-sm font-medium text-gray-300">
              Interval:
            </label>
            <select
              id="interval"
              value={interval}
              onChange={(e) => setInterval(e.target.value as IntervalType)}
              className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-md text-white"
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="30m">30m</option>
              <option value="1h">1h</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-900 border border-red-700 text-red-200 rounded">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-96">
            <div className="text-lg text-gray-400">Loading chart data...</div>
          </div>
        ) : data.length > 0 ? (
          <div>
            <LiveCanvasChart 
              data={data} 
              width={1000} 
              height={500} 
              interval={interval}
            />
            
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-gray-800 p-4 rounded">
                <h3 className="text-sm text-gray-400 mb-1">24h High</h3>
                <p className="text-xl font-bold text-green-400">
                  ${Math.max(...data.slice(-24).map(d => d.high)).toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-800 p-4 rounded">
                <h3 className="text-sm text-gray-400 mb-1">24h Low</h3>
                <p className="text-xl font-bold text-red-400">
                  ${Math.min(...data.slice(-24).map(d => d.low)).toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-800 p-4 rounded">
                <h3 className="text-sm text-gray-400 mb-1">24h Volume</h3>
                <p className="text-xl font-bold text-blue-400">
                  {data.slice(-24).reduce((sum, d) => sum + d.volume, 0).toFixed(0)} BTC
                </p>
              </div>
            </div>
            
            <div className="mt-6 text-sm text-gray-500">
              <p>• Chart updates automatically in real-time</p>
              <p>• No refresh button needed - candles move as new data arrives</p>
              <p>• WebSocket connection provides instant updates</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}