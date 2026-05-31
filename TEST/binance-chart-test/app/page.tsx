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

interface ViewRange {
  startIndex: number;
  endIndex: number;
  candlesPerView: number;
}

// TradingView color scheme
const COLORS = {
  background: '#161a25',
  grid: '#1f2937',
  text: '#9ca3af',
  textBright: '#d1d5db',
  crosshair: '#4a5568',
  green: '#26a69a',
  red: '#ef5350',
  greenLight: '#26a69a20',
  redLight: '#ef535020',
  wick: '#848e9c',
};

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('1m');
  const [mousePos, setMousePos] = useState<MousePosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [viewRange, setViewRange] = useState<ViewRange>({
    startIndex: 0,
    endIndex: 100,
    candlesPerView: 100
  });
  const animationRef = useRef<number | undefined>(undefined);

  // Chart dimensions and data bounds
  const chartBounds = useRef({
    minPrice: 0,
    maxPrice: 0,
    padding: 0,
    chartArea: { left: 60, top: 20, width: 0, height: 0 }
  });

  // Fetch historical data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/binance?symbol=BTCUSDT&interval=${timeframe}&limit=1000`
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
        // Set initial view to show last 100 candles
        setViewRange({
          startIndex: Math.max(0, formattedCandles.length - 100),
          endIndex: formattedCandles.length,
          candlesPerView: 100
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [timeframe]);

  // Format price for display
  const formatPrice = (price: number) => {
    return price.toFixed(2);
  };

  // Format time based on timeframe
  const formatTime = (timestamp: number, detailed = false) => {
    const date = new Date(timestamp);
    
    if (detailed) {
      return date.toLocaleString();
    }
    
    if (timeframe.includes('d')) {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } else if (timeframe.includes('h')) {
      return date.toLocaleString(undefined, { day: 'numeric', hour: '2-digit' });
    } else {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  // Handle mouse wheel for zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const zoomSpeed = 0.1;
    const delta = e.deltaY > 0 ? 1 + zoomSpeed : 1 - zoomSpeed;
    
    // Calculate new candles per view (zoom)
    let newCandlesPerView = Math.round(viewRange.candlesPerView * delta);
    newCandlesPerView = Math.max(10, Math.min(300, newCandlesPerView)); // Limit zoom range
    
    // Calculate mouse position relative to visible candles
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const chartWidth = rect.width - 65; // Account for right axis
    const mouseRatio = mouseX / chartWidth;
    
    // Adjust start index to keep mouse position stable
    const currentVisibleCandles = viewRange.endIndex - viewRange.startIndex;
    const candleDiff = newCandlesPerView - currentVisibleCandles;
    const leftShift = Math.round(candleDiff * mouseRatio);
    
    let newStartIndex = viewRange.startIndex - leftShift;
    let newEndIndex = newStartIndex + newCandlesPerView;
    
    // Ensure we stay within bounds
    if (newEndIndex > candles.length) {
      newEndIndex = candles.length;
      newStartIndex = Math.max(0, newEndIndex - newCandlesPerView);
    }
    if (newStartIndex < 0) {
      newStartIndex = 0;
      newEndIndex = Math.min(candles.length, newCandlesPerView);
    }
    
    setViewRange({
      startIndex: newStartIndex,
      endIndex: newEndIndex,
      candlesPerView: newCandlesPerView
    });
  };

  // Handle mouse down for drag
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  // Handle mouse up
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle mouse move for crosshair and drag
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Handle dragging
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const candleWidth = (rect.width - 65) / viewRange.candlesPerView;
      const candlesDelta = Math.round(deltaX / candleWidth);
      
      if (candlesDelta !== 0) {
        let newStartIndex = viewRange.startIndex - candlesDelta;
        let newEndIndex = viewRange.endIndex - candlesDelta;
        
        // Ensure we stay within bounds
        if (newStartIndex < 0) {
          newStartIndex = 0;
          newEndIndex = viewRange.candlesPerView;
        }
        if (newEndIndex > candles.length) {
          newEndIndex = candles.length;
          newStartIndex = Math.max(0, candles.length - viewRange.candlesPerView);
        }
        
        setViewRange({
          ...viewRange,
          startIndex: newStartIndex,
          endIndex: newEndIndex
        });
        
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    }
    
    // Update crosshair position
    const { chartArea, minPrice, maxPrice, padding } = chartBounds.current;
    const priceRange = maxPrice - minPrice;
    const dataY = maxPrice - ((y - chartArea.top) / chartArea.height) * priceRange;
    
    setMousePos({ x, y, dataX: 0, dataY });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
    setIsDragging(false);
  };

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
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Get visible candles
    const visibleCandles = candles.slice(viewRange.startIndex, viewRange.endIndex);
    if (visibleCandles.length === 0) return;

    // Calculate bounds
    const prices = visibleCandles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.05;

    // Store bounds for mouse calculations
    const rightAxisWidth = 65;
    const bottomAxisHeight = 25;
    chartBounds.current = {
      minPrice: minPrice - padding,
      maxPrice: maxPrice + padding,
      padding,
      chartArea: {
        left: 0,
        top: 0,
        width: rect.width - rightAxisWidth,
        height: rect.height - bottomAxisHeight
      }
    };

    const { chartArea } = chartBounds.current;

    // Draw grid lines
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    
    // Calculate nice price intervals
    const priceStep = calculateNiceInterval(priceRange);
    const startPrice = Math.floor(minPrice / priceStep) * priceStep;
    
    // Horizontal grid lines and price labels
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    
    for (let price = startPrice; price <= maxPrice + padding; price += priceStep) {
      const y = chartArea.top + ((maxPrice + padding - price) / (priceRange + padding * 2)) * chartArea.height;
      
      ctx.strokeStyle = COLORS.grid;
      ctx.beginPath();
      ctx.moveTo(chartArea.left, y);
      ctx.lineTo(chartArea.left + chartArea.width, y);
      ctx.stroke();
      
      ctx.fillStyle = COLORS.text;
      ctx.fillText(formatPrice(price), rect.width - 5, y + 3);
    }

    // Vertical grid lines and time labels
    const timeInterval = Math.max(1, Math.floor(visibleCandles.length / 10));
    ctx.textAlign = 'center';
    
    for (let i = 0; i < visibleCandles.length; i += timeInterval) {
      const x = chartArea.left + (i / visibleCandles.length) * chartArea.width;
      
      ctx.strokeStyle = COLORS.grid;
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.top + chartArea.height);
      ctx.stroke();
      
      if (visibleCandles[i]) {
        ctx.fillStyle = COLORS.text;
        ctx.fillText(formatTime(visibleCandles[i].time), x, rect.height - 5);
      }
    }

    // Draw candles
    const totalWidth = chartArea.width;
    const candleSpacing = totalWidth / visibleCandles.length;
    const candleWidth = Math.max(1, candleSpacing * 0.6);

    visibleCandles.forEach((candle, i) => {
      const x = chartArea.left + (i + 0.5) * candleSpacing;
      
      const highY = chartArea.top + ((maxPrice + padding - candle.high) / (priceRange + padding * 2)) * chartArea.height;
      const lowY = chartArea.top + ((maxPrice + padding - candle.low) / (priceRange + padding * 2)) * chartArea.height;
      const openY = chartArea.top + ((maxPrice + padding - candle.open) / (priceRange + padding * 2)) * chartArea.height;
      const closeY = chartArea.top + ((maxPrice + padding - candle.close) / (priceRange + padding * 2)) * chartArea.height;

      const isBullish = candle.close >= candle.open;

      // Draw wick
      ctx.strokeStyle = COLORS.wick;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw body
      const bodyHeight = Math.abs(closeY - openY) || 1;
      const bodyY = Math.min(openY, closeY);
      
      ctx.fillStyle = isBullish ? COLORS.green : COLORS.red;
      ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
    });

    // Draw axes borders
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.moveTo(chartArea.width, 0);
    ctx.lineTo(chartArea.width, chartArea.height);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(0, chartArea.height);
    ctx.lineTo(chartArea.width, chartArea.height);
    ctx.stroke();

    // Draw crosshair
    if (mousePos && mousePos.x >= chartArea.left && mousePos.x <= chartArea.left + chartArea.width
        && mousePos.y >= chartArea.top && mousePos.y <= chartArea.top + chartArea.height) {
      
      ctx.strokeStyle = COLORS.crosshair;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      
      ctx.beginPath();
      ctx.moveTo(mousePos.x, chartArea.top);
      ctx.lineTo(mousePos.x, chartArea.top + chartArea.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(chartArea.left, mousePos.y);
      ctx.lineTo(chartArea.left + chartArea.width, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price label
      const price = mousePos.dataY;
      ctx.fillStyle = COLORS.background;
      ctx.fillRect(chartArea.width + 1, mousePos.y - 10, 60, 20);
      
      ctx.fillStyle = COLORS.textBright;
      ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(formatPrice(price), chartArea.width + 5, mousePos.y + 4);

      // Time label and OHLC
      const candleIndex = Math.floor(((mousePos.x - chartArea.left) / chartArea.width) * visibleCandles.length);
      const hoveredCandle = visibleCandles[candleIndex];
      
      if (hoveredCandle) {
        const timeStr = formatTime(hoveredCandle.time, true);
        const timeLabelWidth = ctx.measureText(timeStr).width + 10;
        
        ctx.fillStyle = COLORS.background;
        ctx.fillRect(mousePos.x - timeLabelWidth/2, chartArea.height + 1, timeLabelWidth, 20);
        
        ctx.fillStyle = COLORS.textBright;
        ctx.textAlign = 'center';
        ctx.fillText(timeStr, mousePos.x, chartArea.height + 15);

        // OHLC display
        const info = [
          `O ${formatPrice(hoveredCandle.open)}`,
          `H ${formatPrice(hoveredCandle.high)}`,
          `L ${formatPrice(hoveredCandle.low)}`,
          `C ${formatPrice(hoveredCandle.close)}`
        ];
        
        const change = hoveredCandle.close - hoveredCandle.open;
        const changePercent = (change / hoveredCandle.open * 100).toFixed(2);
        const changeStr = `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${change >= 0 ? '+' : ''}${changePercent}%)`;
        
        ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        ctx.textAlign = 'left';
        
        ctx.fillStyle = COLORS.text;
        info.forEach((text, i) => {
          ctx.fillText(text, 10, 25 + i * 15);
        });
        
        ctx.fillStyle = change >= 0 ? COLORS.green : COLORS.red;
        ctx.fillText(changeStr, 10, 85);
      }
    }

    // Draw position indicator
    ctx.fillStyle = COLORS.text;
    ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${viewRange.startIndex + 1}-${viewRange.endIndex} of ${candles.length}`, rect.width - 70, 15);
  };

  // Calculate nice interval for grid lines
  const calculateNiceInterval = (range: number) => {
    const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
    const normalized = range / magnitude;
    
    if (normalized <= 1.5) return magnitude * 0.2;
    if (normalized <= 3) return magnitude * 0.5;
    if (normalized <= 7) return magnitude;
    return magnitude * 2;
  };

  // Animation loop
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
  }, [candles, mousePos, viewRange, isDragging]);

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
            // If we're viewing the latest candles, adjust view
            if (viewRange.endIndex === prev.length) {
              setViewRange(vr => ({
                ...vr,
                endIndex: updated.length
              }));
            }
          }
          
          return updated;
        });
      }
    };

    return () => {
      ws.close();
    };
  }, [timeframe, viewRange.endIndex]);

  return (
    <div className="min-h-screen bg-[#0c0e15] text-white">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#131722] border-b border-gray-800">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-medium">BTC/USDT</h1>
            <span className="text-sm text-gray-400">Binance</span>
          </div>
          
          {/* Timeframe selector */}
          <div className="flex space-x-1">
            {['1m', '5m', '15m', '30m', '1h', '4h', '1d'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  timeframe === tf 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        
        {/* Chart */}
        <div className="flex-1 bg-[#161a25]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">Loading chart data...</p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair"
              style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onWheel={handleWheel}
            />
          )}
        </div>
      </div>
    </div>
  );
}
