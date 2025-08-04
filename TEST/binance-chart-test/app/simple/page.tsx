'use client';

import { useEffect, useState } from 'react';
import { fetchBTCUSDT, type CandleData } from '@/services/binanceApi';

export default function SimplePage() {
  const [data, setData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const candleData = await fetchBTCUSDT('1h', 10);
        setData(candleData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Binance BTCUSDT Data Test</h1>
      
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      
      {data.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Latest {data.length} Candles:</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2">Time</th>
                  <th className="border border-gray-300 px-4 py-2">Open</th>
                  <th className="border border-gray-300 px-4 py-2">High</th>
                  <th className="border border-gray-300 px-4 py-2">Low</th>
                  <th className="border border-gray-300 px-4 py-2">Close</th>
                  <th className="border border-gray-300 px-4 py-2">Volume</th>
                </tr>
              </thead>
              <tbody>
                {data.map((candle, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-4 py-2">
                      {new Date(candle.time).toLocaleString()}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">${candle.open.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2">${candle.high.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2">${candle.low.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2">${candle.close.toFixed(2)}</td>
                    <td className="border border-gray-300 px-4 py-2">{candle.volume.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Current Price: ${data[data.length - 1].close.toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}