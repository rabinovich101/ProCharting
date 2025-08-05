'use client';

import { useEffect, useRef, useState } from 'react';
import type { CandleData } from '@/services/binanceApi';
import { BinanceWebSocket, type BinanceWsKline } from '@/services/binanceWebSocket';

interface TradingViewStyleChartProps {
  data: CandleData[];
  width?: number;
  height?: number;
  interval: string;
}

export default function TradingViewStyleChart({ data: initialData, width = 1200, height = 600, interval }: TradingViewStyleChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<CandleData[]>(initialData);
  const wsRef = useRef<BinanceWebSocket | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // TradingView-like view state
  const [viewState, setViewState] = useState({
    candlesVisible: 150, // TradingView default is around 150 candles
    rightOffset: 10, // Space on the right for incoming candles
    priceScale: 1,
    priceOffset: 0,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    lastOffset: { x: 0, y: 0 },
  });

  // TradingView-style layout
  const rightAxisWidth = 80;
  const bottomAxisHeight = 30;
  const topPadding = 20;
  const chartWidth = width - rightAxisWidth;
  const chartHeight = height - bottomAxisHeight - topPadding;

  // TradingView color scheme
  const colors = {
    background: '#131722',
    grid: '#1e222d',
    text: '#9598a1',
    textStrong: '#d1d4dc',
    green: '#26a69a',
    red: '#ef5350',
    currentPrice: '#4285f4',
    crosshair: '#9598a1',
    volumeGreen: 'rgba(38, 166, 154, 0.5)',
    volumeRed: 'rgba(239, 83, 80, 0.5)',
  };

  // Calculate candle width based on visible candles (TradingView style)
  const getCandleWidth = () => {
    const totalWidth = chartWidth - 20; // Leave some padding
    const candleWidth = totalWidth / viewState.candlesVisible;
    return {
      total: candleWidth,
      body: candleWidth * 0.8, // 80% for body
      spacing: candleWidth * 0.2, // 20% spacing
    };
  };

  // Handle mouse wheel for zoom (TradingView style)
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    if (mouseX > chartWidth) return;
    
    // TradingView-like zoom behavior
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    const newCandlesVisible = Math.round(viewState.candlesVisible * zoomFactor);
    
    // TradingView limits: 10-300 candles
    setViewState(prev => ({
      ...prev,
      candlesVisible: Math.max(10, Math.min(300, newCandlesVisible)),
    }));
  };

  // Handle mouse drag (TradingView style)
  const handleMouseDown = (e: MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    if (mouseX > chartWidth || mouseY > chartHeight + topPadding) return;
    
    setViewState(prev => ({
      ...prev,
      isDragging: true,
      dragStart: { x: e.clientX, y: e.clientY },
      lastOffset: { x: prev.rightOffset, y: prev.priceOffset },
    }));
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!viewState.isDragging) return;
    
    const deltaX = e.clientX - viewState.dragStart.x;
    const deltaY = e.clientY - viewState.dragStart.y;
    
    // Calculate how many candles to shift
    const { total: candleWidth } = getCandleWidth();
    const candlesShift = deltaX / candleWidth;
    
    setViewState(prev => ({
      ...prev,
      rightOffset: Math.max(0, prev.lastOffset.x - candlesShift),
      priceOffset: prev.lastOffset.y + deltaY,
    }));
  };

  const handleMouseUp = () => {
    setViewState(prev => ({ ...prev, isDragging: false }));
  };

  // Draw chart (TradingView style)
  const drawChart = () => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas with TradingView background
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, width, height);

    // Calculate visible data range
    const endIndex = Math.max(0, data.length - Math.floor(viewState.rightOffset));
    const startIndex = Math.max(0, endIndex - viewState.candlesVisible);
    const visibleData = data.slice(startIndex, endIndex);

    if (visibleData.length === 0) return;

    // Calculate price range (with padding like TradingView)
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;
    
    visibleData.forEach(candle => {
      minPrice = Math.min(minPrice, candle.low);
      maxPrice = Math.max(maxPrice, candle.high);
      maxVolume = Math.max(maxVolume, candle.volume);
    });

    const priceRange = maxPrice - minPrice;
    const pricePadding = priceRange * 0.1; // 10% padding like TradingView
    minPrice -= pricePadding;
    maxPrice += pricePadding;

    // Apply manual price offset
    const priceShift = (maxPrice - minPrice) * viewState.priceOffset / chartHeight;
    minPrice -= priceShift;
    maxPrice -= priceShift;

    const priceScale = chartHeight / (maxPrice - minPrice);
    const { total: candleWidth, body: bodyWidth } = getCandleWidth();

    // Draw grid (TradingView style - subtle)
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    // Horizontal price grid (5-7 lines like TradingView)
    const priceGridCount = 7;
    for (let i = 0; i <= priceGridCount; i++) {
      const y = topPadding + (chartHeight / priceGridCount) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
    }

    // Vertical time grid (adaptive like TradingView)
    const timeGridStep = Math.ceil(viewState.candlesVisible / 10);
    for (let i = startIndex; i < endIndex; i += timeGridStep) {
      const x = (i - startIndex) * candleWidth + candleWidth / 2;
      if (x > 0 && x < chartWidth) {
        ctx.beginPath();
        ctx.moveTo(x, topPadding);
        ctx.lineTo(x, topPadding + chartHeight);
        ctx.stroke();
      }
    }

    // Draw volume bars (bottom 20% of chart like TradingView)
    const volumeHeight = chartHeight * 0.2;
    const volumeScale = volumeHeight / maxVolume;
    
    visibleData.forEach((candle, i) => {
      const x = i * candleWidth;
      const volHeight = candle.volume * volumeScale;
      const isGreen = candle.close >= candle.open;
      
      ctx.fillStyle = isGreen ? colors.volumeGreen : colors.volumeRed;
      ctx.fillRect(x + candleWidth * 0.1, topPadding + chartHeight - volHeight, bodyWidth, volHeight);
    });

    // Draw candles
    visibleData.forEach((candle, i) => {
      const x = i * candleWidth + candleWidth / 2;
      const openY = topPadding + chartHeight - (candle.open - minPrice) * priceScale;
      const closeY = topPadding + chartHeight - (candle.close - minPrice) * priceScale;
      const highY = topPadding + chartHeight - (candle.high - minPrice) * priceScale;
      const lowY = topPadding + chartHeight - (candle.low - minPrice) * priceScale;

      const isGreen = candle.close >= candle.open;
      const color = isGreen ? colors.green : colors.red;

      // Draw thin wick (1px like TradingView)
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw body
      const bodyHeight = Math.abs(closeY - openY) || 1;
      const bodyY = Math.min(openY, closeY);

      if (isGreen) {
        // Green candle - hollow like TradingView
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - bodyWidth / 2, bodyY, bodyWidth, bodyHeight);
      } else {
        // Red candle - filled
        ctx.fillStyle = color;
        ctx.fillRect(x - bodyWidth / 2, bodyY, bodyWidth, bodyHeight);
      }
    });

    // Draw price axis (right side)
    ctx.fillStyle = colors.background;
    ctx.fillRect(chartWidth, 0, rightAxisWidth, height);
    
    // Price axis border
    ctx.strokeStyle = colors.grid;
    ctx.beginPath();
    ctx.moveTo(chartWidth, 0);
    ctx.lineTo(chartWidth, height);
    ctx.stroke();

    // Price labels
    ctx.fillStyle = colors.text;
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    
    for (let i = 0; i <= priceGridCount; i++) {
      const price = maxPrice - (maxPrice - minPrice) * (i / priceGridCount);
      const y = topPadding + (chartHeight / priceGridCount) * i;
      ctx.fillText(price.toFixed(2), chartWidth + 8, y + 3);
    }

    // Current price (blue line like TradingView)
    if (data.length > 0) {
      const currentPrice = data[data.length - 1].close;
      const currentY = topPadding + chartHeight - (currentPrice - minPrice) * priceScale;
      
      if (currentY >= topPadding && currentY <= topPadding + chartHeight) {
        // Price line
        ctx.strokeStyle = colors.currentPrice;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, currentY);
        ctx.lineTo(chartWidth, currentY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Price label
        ctx.fillStyle = colors.currentPrice;
        ctx.fillRect(chartWidth + 1, currentY - 10, rightAxisWidth - 1, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillText(currentPrice.toFixed(2), chartWidth + 8, currentY + 3);
      }
    }

    // Draw time axis (bottom)
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, height - bottomAxisHeight, width, bottomAxisHeight);
    
    // Time axis border
    ctx.strokeStyle = colors.grid;
    ctx.beginPath();
    ctx.moveTo(0, height - bottomAxisHeight);
    ctx.lineTo(width, height - bottomAxisHeight);
    ctx.stroke();

    // Time labels
    ctx.fillStyle = colors.text;
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    
    const timeLabels = 5;
    for (let i = 0; i <= timeLabels; i++) {
      const dataIndex = startIndex + Math.floor((visibleData.length / timeLabels) * i);
      if (data[dataIndex]) {
        const x = (i * chartWidth) / timeLabels;
        const time = new Date(data[dataIndex].time);
        const timeStr = viewState.candlesVisible < 50 ? 
          time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) :
          time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        ctx.fillText(timeStr, x, height - 10);
      }
    }

    // Symbol and timeframe (top left like TradingView)
    ctx.fillStyle = colors.textStrong;
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`BTCUSDT ${interval.toUpperCase()}`, 10, 15);

    // Current price info (top like TradingView)
    if (visibleData.length > 0) {
      const lastCandle = visibleData[visibleData.length - 1];
      const change = lastCandle.close - lastCandle.open;
      const changePercent = (change / lastCandle.open) * 100;
      const changeColor = change >= 0 ? colors.green : colors.red;
      
      ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = colors.text;
      ctx.fillText(`O ${lastCandle.open.toFixed(2)}`, 150, 15);
      ctx.fillText(`H ${lastCandle.high.toFixed(2)}`, 250, 15);
      ctx.fillText(`L ${lastCandle.low.toFixed(2)}`, 350, 15);
      ctx.fillText(`C`, 450, 15);
      
      ctx.fillStyle = changeColor;
      ctx.fillText(`${lastCandle.close.toFixed(2)} ${change >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`, 465, 15);
    }
  };

  // Animation loop
  const animate = () => {
    drawChart();
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Handle WebSocket updates
  useEffect(() => {
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
          newData[existingIndex] = updatedCandle;
        } else {
          newData.push(updatedCandle);
          if (newData.length > 5000) {
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
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseleave', handleMouseUp);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [viewState]);

  // Update initial data
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Start animation
  useEffect(() => {
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [data, viewState]);

  return (
    <div className="relative bg-[#131722] rounded-lg shadow-xl overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="cursor-crosshair"
        style={{ display: 'block' }}
      />
      <div className="absolute bottom-2 right-24 text-xs text-gray-500">
        <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></span>
        Live
      </div>
    </div>
  );
}