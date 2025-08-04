'use client';

import { useEffect, useState, useRef } from 'react';

export default function DebugChart() {
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const testChart = async () => {
      try {
        addLog('Starting chart test...');
        
        // Test 1: Check if container exists
        if (!containerRef.current) {
          addLog('ERROR: Container ref is null');
          return;
        }
        addLog('Container found');

        // Test 2: Try to import the library
        addLog('Importing @procharting/core...');
        const core = await import('@procharting/core');
        addLog(`Core module loaded. Available exports: ${Object.keys(core).join(', ')}`);

        // Test 3: Check if createChart exists
        if (!core.createChart) {
          addLog('ERROR: createChart function not found');
          return;
        }
        addLog('createChart function found');

        // Test 4: Try to create a chart
        addLog('Creating chart...');
        const chart = core.createChart(containerRef.current, {
          renderer: 'canvas2d',
          width: 600,
          height: 400,
        });
        addLog('Chart created successfully');

        // Test 5: Check chart properties
        addLog(`Chart container: ${chart.container ? 'exists' : 'missing'}`);
        addLog(`Chart renderer: ${chart.renderer}`);

        // Test 6: Try to add a series
        addLog('Adding test series...');
        const testData = [
          { time: Date.now() - 300000, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
          { time: Date.now() - 240000, open: 105, high: 115, low: 95, close: 110, volume: 1500 },
          { time: Date.now() - 180000, open: 110, high: 120, low: 100, close: 115, volume: 2000 },
          { time: Date.now() - 120000, open: 115, high: 125, low: 105, close: 120, volume: 1800 },
          { time: Date.now() - 60000, open: 120, high: 130, low: 110, close: 125, volume: 2200 },
        ];

        const series = chart.addSeries({
          type: 'candlestick',
          name: 'Test Series',
          data: testData,
          upColor: '#00ff00',
          downColor: '#ff0000',
        });
        addLog('Series added successfully');
        addLog(`Series ID: ${series.id}`);
        addLog(`Series type: ${series.type}`);

        // Test 7: Check canvas
        const canvas = containerRef.current.querySelector('canvas');
        if (canvas) {
          addLog(`Canvas found: ${canvas.width}x${canvas.height}`);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            addLog('2D context available');
          }
        } else {
          addLog('WARNING: No canvas element found');
        }

        // Clean up
        setTimeout(() => {
          addLog('Cleaning up chart...');
          chart.destroy();
          addLog('Chart destroyed');
        }, 5000);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        addLog(`ERROR: ${errorMessage}`);
        setError(errorMessage);
        console.error(err);
      }
    };

    testChart();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Chart Debug Test</h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      <div className="mb-4">
        <h3 className="font-bold mb-2">Debug Logs:</h3>
        <div className="bg-gray-100 p-2 rounded text-sm font-mono h-64 overflow-y-auto">
          {logs.map((log, i) => (
            <div key={i} className={log.includes('ERROR') ? 'text-red-600' : log.includes('WARNING') ? 'text-yellow-600' : ''}>
              {log}
            </div>
          ))}
        </div>
      </div>

      <div 
        ref={containerRef} 
        className="border-2 border-gray-300 rounded"
        style={{ width: '600px', height: '400px' }}
      />
    </div>
  );
}