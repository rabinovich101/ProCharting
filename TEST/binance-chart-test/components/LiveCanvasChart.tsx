'use client';

import { useEffect, useRef, useState } from 'react';
import type { CandleData } from '@/services/binanceApi';
import { BinanceWebSocket, type BinanceWsKline } from '@/services/binanceWebSocket';

interface LiveCanvasChartProps {
  data: CandleData[];
  width?: number;
  height?: number;
  interval: string;
}

export default function LiveCanvasChart({ data: initialData, width = 800, height = 400, interval }: LiveCanvasChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<CandleData[]>(initialData);
  const wsRef = useRef<BinanceWebSocket | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Zoom and pan state
  const [visibleCandles, setVisibleCandles] = useState(100); // Number of candles to show
  const [offsetCandles, setOffsetCandles] = useState(0); // How many candles to skip from the end
  const minCandles = 20;
  const maxCandles = 300;

  // Convert WebSocket kline to CandleData
  const convertKlineToCandle = (kline: BinanceWsKline): Partial<CandleData> => ({
    time: kline.t,
    open: parseFloat(kline.o),
    high: parseFloat(kline.h),
    low: parseFloat(kline.l),
    close: parseFloat(kline.c),
    volume: parseFloat(kline.v),
  });

  // Handle mouse wheel for zoom
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    
    const zoomSpeed = 0.1;
    const delta = e.deltaY > 0 ? 1 + zoomSpeed : 1 - zoomSpeed;
    
    setVisibleCandles(prev => {
      const newValue = Math.round(prev * delta);
      return Math.max(minCandles, Math.min(maxCandles, newValue));
    });
  };

  // Handle mouse drag for pan
  const handleMouseDrag = (() => {
    let isDragging = false;
    let startX = 0;
    let startOffset = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startX = e.clientX;
      startOffset = offsetCandles;
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const candlesMoved = Math.round(-deltaX / 10); // Adjust sensitivity
      
      setOffsetCandles(prev => {
        const newOffset = startOffset + candlesMoved;
        return Math.max(0, Math.min(data.length - visibleCandles, newOffset));
      });
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    return { handleMouseDown, handleMouseMove, handleMouseUp };
  })();

  // Draw chart
  const drawChart = () => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);

    // Get visible data based on zoom and offset
    const endIndex = data.length - offsetCandles;
    const startIndex = Math.max(0, endIndex - visibleCandles);
    const visibleData = data.slice(startIndex, endIndex);

    if (visibleData.length === 0) return;

    // Calculate data bounds
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    
    visibleData.forEach(candle => {
      minPrice = Math.min(minPrice, candle.low);
      maxPrice = Math.max(maxPrice, candle.high);
    });

    // Add padding
    const padding = (maxPrice - minPrice) * 0.1;
    minPrice -= padding;
    maxPrice += padding;

    // Reserve space for price label on the right
    const rightPadding = 100;
    const chartWidth = width - rightPadding;
    
    // Calculate scales
    const priceScale = height / (maxPrice - minPrice);
    const timeScale = chartWidth / visibleData.length;

    // Draw grid
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
      
      // Price labels on the right side
      const price = maxPrice - (maxPrice - minPrice) * (i / 5);
      ctx.fillStyle = '#999999';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`$${price.toFixed(2)}`, chartWidth + 10, y + 4);
    }
    
    // Vertical grid lines (time)
    const gridCount = Math.min(5, visibleData.length);
    for (let i = 0; i <= gridCount; i++) {
      const x = (chartWidth / gridCount) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height - 20);
      ctx.stroke();
      
      // Time labels
      const dataIndex = Math.floor((visibleData.length / gridCount) * i);
      if (visibleData[dataIndex]) {
        const time = new Date(visibleData[dataIndex].time);
        ctx.fillStyle = '#999999';
        ctx.font = '10px system-ui';
        ctx.textAlign = 'center';
        const timeFormat = visibleCandles > 100 ? 
          { month: 'short', day: 'numeric' } : 
          { hour: '2-digit', minute: '2-digit' };
        ctx.fillText(time.toLocaleString('en-US', timeFormat as any), x, height - 5);
      }
    }

    // Draw candles
    visibleData.forEach((candle, index) => {
      const x = index * timeScale + timeScale / 2;
      const openY = height - (candle.open - minPrice) * priceScale;
      const closeY = height - (candle.close - minPrice) * priceScale;
      const highY = height - (candle.high - minPrice) * priceScale;
      const lowY = height - (candle.low - minPrice) * priceScale;

      // Determine color
      const isGreen = candle.close >= candle.open;
      const color = isGreen ? '#00ff88' : '#ff3366';

      // Draw wick
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, timeScale * 0.1);
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw body
      const bodyHeight = Math.abs(closeY - openY) || 1;
      const bodyY = Math.min(openY, closeY);
      const bodyWidth = Math.max(1, timeScale * 0.8);

      ctx.fillStyle = color;
      ctx.fillRect(x - bodyWidth / 2, bodyY, bodyWidth, bodyHeight);
      
      // Add glow effect for the last candle if not offset
      if (index === visibleData.length - 1 && offsetCandles === 0) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fillRect(x - bodyWidth / 2, bodyY, bodyWidth, bodyHeight);
        ctx.shadowBlur = 0;
      }
    });

    // Draw current price line only if showing latest data
    if (offsetCandles === 0 && visibleData.length > 0) {
      const currentPrice = data[data.length - 1].close;
      const currentY = height - (currentPrice - minPrice) * priceScale;
      
      // Only draw if price is in visible range
      if (currentY >= 0 && currentY <= height) {
        // Extend line across full width for current price
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, currentY);
        ctx.lineTo(width, currentY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Price label box on the right
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(chartWidth + 5, currentY - 12, 90, 24);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 13px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`$${currentPrice.toFixed(2)}`, chartWidth + 50, currentY + 5);
        ctx.textAlign = 'left';
      }
    }

    // Draw title with zoom info
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui';
    ctx.fillText('BTCUSDT - LIVE', 10, 25);
    
    // Draw zoom level
    ctx.fillStyle = '#999999';
    ctx.font = '12px system-ui';
    ctx.fillText(`Candles: ${visibleCandles} | Scroll to zoom, Drag to pan`, 10, 45);
    
    // Draw update indicator
    if (offsetCandles === 0) {
      const now = Date.now();
      const lastUpdate = data[data.length - 1]?.time || 0;
      const secondsSinceUpdate = Math.floor((now - lastUpdate) / 1000);
      
      ctx.fillStyle = secondsSinceUpdate < 2 ? '#00ff88' : '#999999';
      ctx.font = '12px system-ui';
      ctx.fillText(`Updated ${secondsSinceUpdate}s ago`, 10, 65);
    }
  };

  // Animation loop
  const animate = () => {
    drawChart();
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Handle WebSocket updates
  useEffect(() => {
    // Start WebSocket connection
    wsRef.current = new BinanceWebSocket('btcusdt', interval);
    
    wsRef.current.connect((kline) => {
      setData(prevData => {
        const newData = [...prevData];
        const candleTime = kline.t;
        const existingIndex = newData.findIndex(c => c.time === candleTime);
        
        const updatedCandle = {
          time: candleTime,
          open: parseFloat(kline.o),
          high: parseFloat(kline.h),
          low: parseFloat(kline.l),
          close: parseFloat(kline.c),
          volume: parseFloat(kline.v),
        };
        
        if (existingIndex >= 0) {
          // Update existing candle
          newData[existingIndex] = updatedCandle;
        } else {
          // Add new candle
          newData.push(updatedCandle);
          // Keep only last 1000 candles
          if (newData.length > 1000) {
            newData.shift();
          }
        }
        
        return newData;
      });
    });

    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect();
      }
    };
  }, [interval]);

  // Setup canvas events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel);
    canvas.addEventListener('mousedown', handleMouseDrag.handleMouseDown);
    window.addEventListener('mousemove', handleMouseDrag.handleMouseMove);
    window.addEventListener('mouseup', handleMouseDrag.handleMouseUp);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDrag.handleMouseDown);
      window.removeEventListener('mousemove', handleMouseDrag.handleMouseMove);
      window.removeEventListener('mouseup', handleMouseDrag.handleMouseUp);
    };
  }, [data.length, visibleCandles, offsetCandles]);

  // Update initial data when it changes
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Start animation loop
  useEffect(() => {
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [data, visibleCandles, offsetCandles]);

  // Reset view button
  const resetView = () => {
    setVisibleCandles(100);
    setOffsetCandles(0);
  };

  return (
    <div className="relative">
      <canvas 
        ref={canvasRef} 
        className="border border-gray-700 rounded bg-gray-900 cursor-grab active:cursor-grabbing"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      <div className="absolute top-2 right-2 flex gap-2">
        <button
          onClick={resetView}
          className="px-3 py-1 bg-gray-800 text-white text-sm rounded hover:bg-gray-700"
        >
          Reset View
        </button>
      </div>
      <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
        <div>
          <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse mr-1"></span>
          Live streaming via WebSocket
        </div>
        <div>
          Use mouse wheel to zoom • Drag to pan
        </div>
      </div>
    </div>
  );
}