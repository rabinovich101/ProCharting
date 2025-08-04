'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createChart } from '@procharting/core';
import type { Chart, ChartTheme } from '@procharting/types';
import { fetchBTCUSDT, type CandleData, INTERVALS, type IntervalType } from '@/services/binanceApi';

export default function BinanceCandleChart() {
  const [data, setData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState<IntervalType>('1h');
  const [chartError, setChartError] = useState<string | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch data from Binance
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const candleData = await fetchBTCUSDT(interval, 200);
      setData(candleData);
    } catch (err) {
      setError('Failed to fetch data from Binance');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [interval]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    try {
      setChartError(null);
      
      // Clean up previous chart
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }

      // Define dark theme
      const darkTheme: ChartTheme = {
        background: '#1e1e1e',
        text: '#ffffff',
        grid: '#333333',
        crosshair: '#ffffff',
        selection: '#3b82f6',
        positive: '#00ff00',
        negative: '#ff0000',
      };

      // Create new chart - it will handle canvas creation and initialization
      const chart = createChart(containerRef.current, {
        renderer: 'canvas2d', // Use canvas2d for simplicity
        theme: darkTheme,
        width: containerRef.current.clientWidth,
        height: 600,
      });

      // Add candlestick series
      chart.addSeries({
        type: 'candlestick',
        name: 'BTCUSDT',
        data: data,
        upColor: '#00ff00',
        downColor: '#ff0000',
        borderUpColor: '#00ff00',
        borderDownColor: '#ff0000',
        wickUpColor: '#00ff00',
        wickDownColor: '#ff0000',
      });

      chartRef.current = chart;

      // Handle resize
      const handleResize = () => {
        if (chart && containerRef.current) {
          chart.resize(containerRef.current.clientWidth, 600);
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.destroy();
          chartRef.current = null;
        }
      };
    } catch (err) {
      console.error('Chart initialization error:', err);
      setChartError(err instanceof Error ? err.message : 'Failed to initialize chart');
    }
  }, [data]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every minute
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchData();
    }, 60000); // 60 seconds

    return () => window.clearInterval(intervalId);
  }, [fetchData]);

  return (
    <div className="w-full p-4">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">BTCUSDT Candle Chart</h1>
        <div className="flex gap-2 items-center">
          <label htmlFor="interval" className="text-sm font-medium">
            Interval:
          </label>
          <select
            id="interval"
            value={interval}
            onChange={(e) => setInterval(e.target.value as IntervalType)}
            className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {chartError && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          Chart Error: {chartError}
        </div>
      )}

      {loading && data.length === 0 ? (
        <div className="flex justify-center items-center h-96">
          <div className="text-lg">Loading chart data...</div>
        </div>
      ) : (
        <div 
          ref={containerRef} 
          className="w-full border border-gray-300 rounded-lg overflow-hidden bg-gray-900"
          style={{ height: '600px' }}
        />
      )}

      {data.length > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          <p>Last update: {new Date(data[data.length - 1].time).toLocaleString()}</p>
          <p>Auto-refresh: Every 60 seconds</p>
          <p>Data points: {data.length}</p>
        </div>
      )}
    </div>
  );
}