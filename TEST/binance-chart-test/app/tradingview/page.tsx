'use client';

import { useEffect, useState } from 'react';
import { fetchBTCUSDT, type CandleData, INTERVALS, type IntervalType } from '@/services/binanceApi';
import TradingViewStyleChart from '@/components/TradingViewStyleChart';

export default function TradingViewPage() {
  const [data, setData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<IntervalType>('1h');

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        const candleData = await fetchBTCUSDT(interval, 500);
        setData(candleData);
      } catch (err) {
        setError('Failed to fetch data from Binance');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [interval]);

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <div className="border-b border-gray-800 bg-[#131722]">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-xl font-semibold">TradingView Style Chart</h1>
              <div className="flex items-center gap-2">
                {Object.entries(INTERVALS).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => setInterval(key as IntervalType)}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      interval === key 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    {value.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-sm text-gray-400">
              Professional Trading Chart Experience
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="p-4 bg-red-900/20 border border-red-900 text-red-400 rounded">
            {error}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-[600px]">
          <div className="text-lg text-gray-400">Loading chart data...</div>
        </div>
      ) : data.length > 0 ? (
        <div className="p-4">
          <TradingViewStyleChart 
            data={data} 
            width={window.innerWidth - 32} 
            height={600} 
            interval={interval}
          />
          
          <div className="mt-4 max-w-7xl mx-auto grid grid-cols-4 gap-4 text-sm">
            <div className="bg-[#1e222d] p-4 rounded">
              <div className="text-gray-500 mb-1">24h Volume</div>
              <div className="text-lg font-semibold">
                {data.slice(-24).reduce((sum, d) => sum + d.volume, 0).toFixed(2)} BTC
              </div>
            </div>
            <div className="bg-[#1e222d] p-4 rounded">
              <div className="text-gray-500 mb-1">24h High</div>
              <div className="text-lg font-semibold text-green-400">
                ${Math.max(...data.slice(-24).map(d => d.high)).toFixed(2)}
              </div>
            </div>
            <div className="bg-[#1e222d] p-4 rounded">
              <div className="text-gray-500 mb-1">24h Low</div>
              <div className="text-lg font-semibold text-red-400">
                ${Math.min(...data.slice(-24).map(d => d.low)).toFixed(2)}
              </div>
            </div>
            <div className="bg-[#1e222d] p-4 rounded">
              <div className="text-gray-500 mb-1">Controls</div>
              <div className="text-xs text-gray-400">
                Scroll: Zoom | Drag: Pan | Like TradingView!
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}