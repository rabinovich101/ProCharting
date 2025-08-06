'use client';

import { useEffect, useRef, useState } from 'react';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MousePosition {
  x: number;
  y: number;
  dataX: number;
  dataY: number;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('1m');
  const [mousePos, setMousePos] = useState<MousePosition | null>(null);
  const animationRef = useRef<number>();

  // Chart dimensions and data bounds
  const chartBounds = useRef({
    minPrice: 0,
    maxPrice: 0,
    padding: 0,
    chartArea: { left: 10, top: 10, width: 0, height: 0 }
  });

  // Fetch historical data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/binance?symbol=BTCUSDT&interval=${timeframe}&limit=100`
        );
        const data = await response.json();
        
        const formattedCandles: Candle[] = data.map((candle: any[]) => ({
          time: candle[0],
          open: parseFloat(candle[1]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[3]),
          close: parseFloat(candle[4]),
          volume: parseFloat(candle[5])
        }));
        
        setCandles(formattedCandles);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [timeframe]);

  // Draw chart
  const drawChart = () => {
    if (!canvasRef.current || candles.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Calculate bounds
    const prices = candles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.1;

    // Store bounds for mouse calculations
    chartBounds.current = {
      minPrice: minPrice - padding,
      maxPrice: maxPrice + padding,
      padding,
      chartArea: {
        left: 10,
        top: 10,
        width: rect.width - 80,
        height: rect.height - 60
      }
    };

    const { chartArea } = chartBounds.current;

    // Draw grid lines
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines (price)
    for (let i = 0; i <= 10; i++) {
      const y = chartArea.top + (i / 10) * chartArea.height;
      ctx.beginPath();
      ctx.moveTo(chartArea.left, y);
      ctx.lineTo(chartArea.left + chartArea.width, y);
      ctx.stroke();
    }

    // Vertical grid lines (time)
    for (let i = 0; i <= 10; i++) {
      const x = chartArea.left + (i / 10) * chartArea.width;
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.top + chartArea.height);
      ctx.stroke();
    }

    // Draw candles
    const candleWidth = Math.max(1, (chartArea.width / candles.length) * 0.8);
    const spacing = chartArea.width / candles.length;

    candles.forEach((candle, i) => {
      const x = chartArea.left + i * spacing + spacing / 2;
      
      // Calculate Y positions
      const highY = chartArea.top + ((maxPrice + padding - candle.high) / (priceRange + padding * 2)) * chartArea.height;
      const lowY = chartArea.top + ((maxPrice + padding - candle.low) / (priceRange + padding * 2)) * chartArea.height;
      const openY = chartArea.top + ((maxPrice + padding - candle.open) / (priceRange + padding * 2)) * chartArea.height;
      const closeY = chartArea.top + ((maxPrice + padding - candle.close) / (priceRange + padding * 2)) * chartArea.height;

      const isBullish = candle.close >= candle.open;

      // Draw wick
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw body
      ctx.fillStyle = isBullish ? '#26a69a' : '#ef5350';
      const bodyHeight = Math.abs(closeY - openY) || 1;
      const bodyY = Math.min(openY, closeY);
      ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
    });

    // Draw price axis
    ctx.fillStyle = '#999';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 5; i++) {
      const price = minPrice - padding + (priceRange + padding * 2) * (1 - i / 5);
      const y = chartArea.top + (i / 5) * chartArea.height;
      ctx.fillText(price.toFixed(2), rect.width - 5, y);
    }

    // Draw time axis
    ctx.textAlign = 'center';
    ctx.fillStyle = '#999';
    
    // Show 5 time labels
    for (let i = 0; i < 5; i++) {
      const candleIndex = Math.floor((i / 4) * (candles.length - 1));
      const candle = candles[candleIndex];
      if (candle) {
        const x = chartArea.left + candleIndex * spacing + spacing / 2;
        const date = new Date(candle.time);
        const timeStr = timeframe.includes('d') 
          ? date.toLocaleDateString() 
          : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        ctx.fillText(timeStr, x, rect.height - 5);
      }
    }

    // Draw crosshair if mouse is over chart
    if (mousePos && mousePos.x >= chartArea.left && mousePos.x <= chartArea.left + chartArea.width
        && mousePos.y >= chartArea.top && mousePos.y <= chartArea.top + chartArea.height) {
      
      // Vertical line
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(mousePos.x, chartArea.top);
      ctx.lineTo(mousePos.x, chartArea.top + chartArea.height);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(chartArea.left, mousePos.y);
      ctx.lineTo(chartArea.left + chartArea.width, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price label
      const price = mousePos.dataY;
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(rect.width - 75, mousePos.y - 10, 70, 20);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.fillText(`$${price.toFixed(2)}`, rect.width - 5, mousePos.y + 3);

      // Time label
      const candleIndex = Math.floor(((mousePos.x - chartArea.left) / chartArea.width) * candles.length);
      const hoveredCandle = candles[candleIndex];
      if (hoveredCandle) {
        const date = new Date(hoveredCandle.time);
        const timeStr = date.toLocaleString();
        const textWidth = ctx.measureText(timeStr).width;
        
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(mousePos.x - textWidth/2 - 5, rect.height - 35, textWidth + 10, 20);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(timeStr, mousePos.x, rect.height - 20);

        // Show candle info
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(10, 10, 200, 80);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(`O: ${hoveredCandle.open.toFixed(2)}`, 20, 30);
        ctx.fillText(`H: ${hoveredCandle.high.toFixed(2)}`, 20, 45);
        ctx.fillText(`L: ${hoveredCandle.low.toFixed(2)}`, 20, 60);
        ctx.fillText(`C: ${hoveredCandle.close.toFixed(2)}`, 20, 75);
        ctx.fillStyle = hoveredCandle.close >= hoveredCandle.open ? '#26a69a' : '#ef5350';
        ctx.fillText(`${((hoveredCandle.close - hoveredCandle.open) / hoveredCandle.open * 100).toFixed(2)}%`, 120, 45);
      }
    }
  };

  // Animation loop for smooth crosshair
  useEffect(() => {
    const animate = () => {
      drawChart();
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [candles, mousePos]);

  // Handle mouse movement
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const { chartArea, minPrice, maxPrice, padding } = chartBounds.current;
    const priceRange = maxPrice - minPrice;
    
    // Calculate data coordinates
    const dataY = maxPrice - ((y - chartArea.top) / chartArea.height) * priceRange;
    
    setMousePos({ x, y, dataX: 0, dataY });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
  };

  // Connect to WebSocket for live updates
  useEffect(() => {
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/btcusdt@kline_${timeframe}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.k) {
        const newCandle: Candle = {
          time: data.k.t,
          open: parseFloat(data.k.o),
          high: parseFloat(data.k.h),
          low: parseFloat(data.k.l),
          close: parseFloat(data.k.c),
          volume: parseFloat(data.k.v)
        };

        setCandles(prev => {
          const updated = [...prev];
          const lastCandle = updated[updated.length - 1];
          
          if (lastCandle && lastCandle.time === newCandle.time) {
            updated[updated.length - 1] = newCandle;
          } else if (!lastCandle || newCandle.time > lastCandle.time) {
            updated.push(newCandle);
            if (updated.length > 100) updated.shift();
          }
          
          return updated;
        });
      }
    };

    return () => {
      ws.close();
    };
  }, [timeframe]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">BTC/USDT Live Chart</h1>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-gray-800 text-white px-4 py-2 rounded"
          >
            <option value="1m">1m</option>
            <option value="5m">5m</option>
            <option value="15m">15m</option>
            <option value="30m">30m</option>
            <option value="1h">1h</option>
            <option value="4h">4h</option>
            <option value="1d">1d</option>
          </select>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-[600px]">
            <p className="text-gray-400">Loading chart data...</p>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="w-full h-[600px] bg-gray-800 rounded cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
        )}
      </div>
    </div>
  );
}