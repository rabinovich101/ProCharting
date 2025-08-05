'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchBTCUSDT, type CandleData } from '@/services/binanceApi';

// Import from the built library
let createChart: any;
if (typeof window !== 'undefined') {
  // Dynamic import to avoid SSR issues
  import('/Users/olegrabinovich/Documents/ooo/ProCharting/packages/core/dist/index2.js').then(module => {
    createChart = module.createChart;
  });
}

export default function ProChartingDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Loading ProCharting library...');

  useEffect(() => {
    let chart: any;

    const initChart = async () => {
      try {
        // Wait for library to load
        let attempts = 0;
        while (!createChart && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!createChart) {
          setStatus('Failed to load ProCharting library');
          return;
        }

        setStatus('Fetching data from Binance...');
        
        // Fetch initial data
        const data = await fetchBTCUSDT('1m', 500);
        
        setStatus('Creating chart...');

        // Create chart with all interactive features
        chart = createChart(containerRef.current!, {
          renderer: 'auto',
          theme: 'dark',
          interactions: {
            enableZoom: true,
            enablePan: true,
            enableCrosshair: true,
            enableYAxisScale: true,
            snapToCandle: true,
            zoomSpeed: 0.1,
            panSpeed: 1.0,
            yAxisScaleSpeed: 0.01
          }
        });

        // Add candlestick series
        const series = chart.addSeries({
          type: 'candlestick',
          data: data.map(d => ({
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
            volume: d.volume
          }))
        });

        chartRef.current = { chart, series };
        
        setLoading(false);
        setStatus('Chart loaded successfully!');

        // Setup WebSocket for real-time updates
        const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@kline_1m');
        
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          if (message.k) {
            const kline = message.k;
            const candle = {
              time: kline.t,
              open: parseFloat(kline.o),
              high: parseFloat(kline.h),
              low: parseFloat(kline.l),
              close: parseFloat(kline.c),
              volume: parseFloat(kline.v)
            };

            // Update or append candle
            if (kline.x) {
              // Candle closed, append new
              series.appendData(candle);
            } else {
              // Update current candle
              series.updateLast(candle);
            }
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        return () => {
          ws.close();
        };

      } catch (error) {
        console.error('Chart initialization error:', error);
        setStatus(`Error: ${error.message}`);
      }
    };

    initChart();

    return () => {
      if (chart) {
        chart.destroy();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">ProCharting Library Demo</h1>
        <p className="text-gray-400 mb-6">Testing all the new interactive features implemented in the core library</p>
        
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h2 className="text-xl font-semibold mb-2">Interactive Features:</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-green-400">✅ Mouse Wheel Zoom</div>
              <div className="text-gray-500">Scroll to zoom in/out</div>
            </div>
            <div>
              <div className="text-green-400">✅ Click & Drag Pan</div>
              <div className="text-gray-500">Drag to move the chart</div>
            </div>
            <div>
              <div className="text-green-400">✅ Y-Axis Scale</div>
              <div className="text-gray-500">Drag on price axis to scale vertically</div>
            </div>
            <div>
              <div className="text-green-400">✅ TradingView Crosshair</div>
              <div className="text-gray-500">Hover to see crosshair with snap</div>
            </div>
          </div>
        </div>

        <div className="bg-black rounded-lg overflow-hidden" style={{ height: '600px' }}>
          <div ref={containerRef} className="w-full h-full relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl mb-4">⏳</div>
                  <div>{status}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-800 rounded-lg">
          <h3 className="font-semibold mb-2">How to test:</h3>
          <ul className="text-sm space-y-1 text-gray-400">
            <li>🖱️ <strong>Scroll</strong> on the chart to zoom in/out</li>
            <li>🖱️ <strong>Click and drag</strong> on the chart to pan around</li>
            <li>🖱️ <strong>Hover over the right price axis</strong> - cursor changes to ↕</li>
            <li>🖱️ <strong>Click and drag up/down on price axis</strong> to scale prices</li>
            <li>🖱️ <strong>Move mouse</strong> to see the crosshair snap to candles</li>
          </ul>
        </div>

        <div className="mt-4 flex gap-4">
          <button
            onClick={() => chartRef.current?.chart?.resetView()}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            Reset View
          </button>
          <button
            onClick={() => chartRef.current?.chart?.zoomIn(0.8)}
            className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
          >
            Zoom In
          </button>
          <button
            onClick={() => chartRef.current?.chart?.zoomOut(1.2)}
            className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
          >
            Zoom Out
          </button>
        </div>
      </div>
    </div>
  );
}