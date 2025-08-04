'use client';

import { useEffect, useState } from 'react';
import { fetchBTCUSDT, type CandleData, INTERVALS, type IntervalType } from '@/services/binanceApi';
import SimpleCanvasChart from '@/components/SimpleCanvasChart';

export default function CanvasPage() {
  const [data, setData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<IntervalType>('1h');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const candleData = await fetchBTCUSDT(interval, 100);
      setData(candleData);
    } catch (err) {
      setError('Failed to fetch data from Binance');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [interval]);

  // Auto-refresh every minute
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchData();
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [interval]);

  return (
    <div className="p-8">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Simple Canvas Chart - BTCUSDT</h1>
        <div className="flex gap-2 items-center">
          <label htmlFor="interval" className="text-sm font-medium">
            Interval:
          </label>
          <select
            id="interval"
            value={interval}
            onChange={(e) => setInterval(e.target.value as IntervalType)}
            className="px-3 py-1 border border-gray-300 rounded-md"
          >
            {Object.entries(INTERVALS).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {loading && data.length === 0 ? (
        <div className="flex justify-center items-center h-96">
          <div className="text-lg">Loading chart data...</div>
        </div>
      ) : data.length > 0 ? (
        <div>
          <SimpleCanvasChart data={data} width={800} height={400} />
          <div className="mt-4 text-sm text-gray-600">
            <p>Last update: {new Date(data[data.length - 1].time).toLocaleString()}</p>
            <p>Current price: ${data[data.length - 1].close.toFixed(2)}</p>
            <p>Data points: {data.length}</p>
            <p>Auto-refresh: Every 60 seconds</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}