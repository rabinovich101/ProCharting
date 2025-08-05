'use client';

import { useEffect, useState } from 'react';
import { fetchBTCUSDT, type CandleData, INTERVALS, type IntervalType } from '@/services/binanceApi';
import FloatingCanvasChart from '@/components/FloatingCanvasChart';

export default function FloatingPage() {
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
        const candleData = await fetchBTCUSDT(interval, 500); // Get more data for exploration
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
    <div className="p-4 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 min-h-screen text-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Floating Chart - Full 2D Freedom
          </h1>
          <p className="text-gray-300 mt-2">Move the chart in any direction - up, down, left, right!</p>
        </div>

        <div className="mb-4 flex justify-center">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 flex gap-4 items-center">
            <label htmlFor="interval" className="text-sm font-medium text-gray-300">
              Interval:
            </label>
            <select
              id="interval"
              value={interval}
              onChange={(e) => setInterval(e.target.value as IntervalType)}
              className="px-3 py-1 bg-gray-700 border border-gray-600 rounded-md text-white"
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
          <div className="mb-4 p-4 bg-red-900/50 backdrop-blur-sm border border-red-700 text-red-200 rounded-lg text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-[600px]">
            <div className="text-lg text-gray-400">Loading chart data...</div>
          </div>
        ) : data.length > 0 ? (
          <div className="relative">
            <FloatingCanvasChart 
              data={data} 
              width={1200} 
              height={600} 
              interval={interval}
            />
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold mb-3 text-purple-400">🎮 Navigation Controls</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• <strong>Click & Drag:</strong> Move in ANY direction</li>
                  <li>• <strong>Scroll Wheel:</strong> Zoom in/out at mouse position</li>
                  <li>• <strong>Double Click:</strong> Reset to default view</li>
                </ul>
              </div>
              
              <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold mb-3 text-pink-400">🚀 Features</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Full 2D freedom - move anywhere!</li>
                  <li>• Zoom up to 1000% (10x)</li>
                  <li>• Real-time position tracking</li>
                  <li>• Smooth 60 FPS rendering</li>
                </ul>
              </div>
              
              <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold mb-3 text-blue-400">📊 Chart Info</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Total candles: {data.length}</li>
                  <li>• Live WebSocket updates</li>
                  <li>• No boundaries - explore freely!</li>
                  <li>• Professional trading experience</li>
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}