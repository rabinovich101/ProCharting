'use client';

import { useEffect, useRef, useState } from 'react';
import type { CandleData } from '@/services/binanceApi';
import { BinanceWebSocket, type BinanceWsKline } from '@/services/binanceWebSocket';

interface FloatingCanvasChartProps {
  data: CandleData[];
  width?: number;
  height?: number;
  interval: string;
}

export default function FloatingCanvasChart({ data: initialData, width = 1000, height = 600, interval }: FloatingCanvasChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<CandleData[]>(initialData);
  const wsRef = useRef<BinanceWebSocket | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // View state for full 2D navigation
  const [viewState, setViewState] = useState({
    zoom: 1, // 1 = 100%, 2 = 200% (zoomed in), 0.5 = 50% (zoomed out)
    offsetX: 0, // Horizontal pan in pixels
    offsetY: 0, // Vertical pan in pixels
    priceRange: { min: 0, max: 0 }, // Custom price range
    autoScale: true, // Auto-scale to fit data
  });

  // Layout constants
  const rightAxisWidth = 100;
  const bottomAxisHeight = 40;
  const chartWidth = width - rightAxisWidth;
  const chartHeight = height - bottomAxisHeight;

  // Mouse interaction state
  const mouseState = useRef({
    isDragging: false,
    isPanning: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
  });

  // Handle mouse wheel for zoom
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Only zoom if mouse is in chart area
    if (mouseX > chartWidth || mouseY > chartHeight) return;
    
    // Zoom based on mouse position
    const zoomSpeed = 0.001;
    const delta = 1 - e.deltaY * zoomSpeed;
    
    setViewState(prev => {
      const newZoom = Math.max(0.1, Math.min(10, prev.zoom * delta));
      
      // Adjust offset to zoom towards mouse position
      const zoomRatio = newZoom / prev.zoom;
      const newOffsetX = mouseX - (mouseX - prev.offsetX) * zoomRatio;
      const newOffsetY = mouseY - (mouseY - prev.offsetY) * zoomRatio;
      
      return {
        ...prev,
        zoom: newZoom,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      };
    });
  };

  // Handle mouse drag for pan
  const handleMouseDown = (e: MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Only pan if mouse is in chart area
    if (mouseX > chartWidth || mouseY > chartHeight) return;
    
    mouseState.current = {
      isDragging: true,
      isPanning: true,
      startX: e.clientX,
      startY: e.clientY,
      lastX: viewState.offsetX,
      lastY: viewState.offsetY,
    };
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!mouseState.current.isDragging) return;
    
    const deltaX = e.clientX - mouseState.current.startX;
    const deltaY = e.clientY - mouseState.current.startY;
    
    setViewState(prev => ({
      ...prev,
      offsetX: mouseState.current.lastX + deltaX,
      offsetY: mouseState.current.lastY + deltaY,
      autoScale: false, // Disable auto-scale when manually panning
    }));
  };

  const handleMouseUp = () => {
    mouseState.current.isDragging = false;
    mouseState.current.isPanning = false;
  };

  // Handle double-click to reset view
  const handleDoubleClick = () => {
    setViewState({
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      priceRange: { min: 0, max: 0 },
      autoScale: true,
    });
  };

  // Draw chart with fixed axes
  const drawChart = () => {
    if (!canvasRef.current || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Create clipping region for chart area
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, chartWidth, chartHeight);
    ctx.clip();

    // Apply transformations for chart content
    ctx.translate(viewState.offsetX, viewState.offsetY);
    ctx.scale(viewState.zoom, viewState.zoom);

    // Calculate visible data range
    const candleWidth = 10; // Base candle width
    const candleSpacing = 2;
    const totalCandleWidth = (candleWidth + candleSpacing);
    
    // Calculate which candles are visible
    const visibleStartIndex = Math.max(0, Math.floor(-viewState.offsetX / (totalCandleWidth * viewState.zoom)));
    const visibleEndIndex = Math.min(data.length, Math.ceil((chartWidth - viewState.offsetX) / (totalCandleWidth * viewState.zoom)));
    const visibleData = data.slice(visibleStartIndex, visibleEndIndex);

    if (visibleData.length === 0) {
      ctx.restore();
      return;
    }

    // Calculate price bounds
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    
    if (viewState.autoScale) {
      // Auto-scale to visible data
      visibleData.forEach(candle => {
        minPrice = Math.min(minPrice, candle.low);
        maxPrice = Math.max(maxPrice, candle.high);
      });
    } else {
      // Use full data range
      data.forEach(candle => {
        minPrice = Math.min(minPrice, candle.low);
        maxPrice = Math.max(maxPrice, candle.high);
      });
    }

    // Add padding
    const pricePadding = (maxPrice - minPrice) * 0.1;
    minPrice -= pricePadding;
    maxPrice += pricePadding;

    const priceScale = (chartHeight / viewState.zoom) / (maxPrice - minPrice);

    // Draw grid (in world coordinates)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1 / viewState.zoom;
    
    // Price grid lines
    const priceStep = (maxPrice - minPrice) / 10;
    for (let price = minPrice; price <= maxPrice; price += priceStep) {
      const y = (chartHeight / viewState.zoom) - (price - minPrice) * priceScale;
      ctx.beginPath();
      ctx.moveTo(-viewState.offsetX / viewState.zoom, y);
      ctx.lineTo((chartWidth - viewState.offsetX) / viewState.zoom, y);
      ctx.stroke();
    }

    // Time grid lines
    const timeStep = 50; // Every 50 candles
    for (let i = 0; i < data.length; i += timeStep) {
      const x = i * totalCandleWidth;
      ctx.beginPath();
      ctx.moveTo(x, -viewState.offsetY / viewState.zoom);
      ctx.lineTo(x, (chartHeight - viewState.offsetY) / viewState.zoom);
      ctx.stroke();
    }

    // Draw candles
    data.forEach((candle, index) => {
      const x = index * totalCandleWidth;
      const openY = (chartHeight / viewState.zoom) - (candle.open - minPrice) * priceScale;
      const closeY = (chartHeight / viewState.zoom) - (candle.close - minPrice) * priceScale;
      const highY = (chartHeight / viewState.zoom) - (candle.high - minPrice) * priceScale;
      const lowY = (chartHeight / viewState.zoom) - (candle.low - minPrice) * priceScale;

      // Skip if outside visible area
      if (x + candleWidth < -viewState.offsetX / viewState.zoom || 
          x > (chartWidth - viewState.offsetX) / viewState.zoom) {
        return;
      }

      // Determine color
      const isGreen = candle.close >= candle.open;
      const color = isGreen ? '#00ff88' : '#ff3366';

      // Draw wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1 / viewState.zoom;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Draw body
      const bodyHeight = Math.abs(closeY - openY) || (1 / viewState.zoom);
      const bodyY = Math.min(openY, closeY);

      ctx.fillStyle = color;
      ctx.fillRect(x, bodyY, candleWidth, bodyHeight);
      
      // Add glow for last candle
      if (index === data.length - 1) {
        ctx.shadowBlur = 20 / viewState.zoom;
        ctx.shadowColor = color;
        ctx.fillRect(x, bodyY, candleWidth, bodyHeight);
        ctx.shadowBlur = 0;
      }
    });

    // Restore context (remove clipping)
    ctx.restore();

    // Draw fixed axes (outside clipping region)
    // Right price axis
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(chartWidth, 0, rightAxisWidth, height);
    
    // Draw price axis border
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartWidth, 0);
    ctx.lineTo(chartWidth, height);
    ctx.stroke();

    // Draw price labels
    ctx.fillStyle = '#cccccc';
    ctx.font = '12px system-ui';
    ctx.textAlign = 'left';
    
    for (let i = 0; i <= 10; i++) {
      const price = maxPrice - (maxPrice - minPrice) * (i / 10);
      const y = viewState.offsetY + (i * (chartHeight / 10)) * viewState.zoom;
      
      if (y >= 0 && y <= chartHeight) {
        ctx.fillText(`$${price.toFixed(2)}`, chartWidth + 10, y + 4);
      }
    }

    // Bottom time axis
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, chartHeight, width, bottomAxisHeight);
    
    // Draw time axis border
    ctx.beginPath();
    ctx.moveTo(0, chartHeight);
    ctx.lineTo(width, chartHeight);
    ctx.stroke();

    // Draw time labels
    ctx.fillStyle = '#cccccc';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    
    const visibleTimeSteps = Math.floor(chartWidth / (100 * viewState.zoom));
    for (let i = 0; i <= visibleTimeSteps; i++) {
      const candleIndex = visibleStartIndex + Math.floor((visibleEndIndex - visibleStartIndex) * (i / visibleTimeSteps));
      if (data[candleIndex]) {
        const x = viewState.offsetX + (candleIndex * totalCandleWidth * viewState.zoom);
        if (x >= 0 && x <= chartWidth) {
          const time = new Date(data[candleIndex].time);
          const timeFormat = viewState.zoom > 2 ? 
            time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) :
            time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          ctx.fillText(timeFormat, x, chartHeight + 20);
        }
      }
    }

    // Draw current price line
    if (data.length > 0) {
      const currentPrice = data[data.length - 1].close;
      const currentY = viewState.offsetY + ((chartHeight / viewState.zoom) - (currentPrice - minPrice) * priceScale) * viewState.zoom;
      
      if (currentY >= 0 && currentY <= chartHeight) {
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, currentY);
        ctx.lineTo(chartWidth, currentY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Price label
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(chartWidth + 5, currentY - 15, 90, 30);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`$${currentPrice.toFixed(2)}`, chartWidth + 50, currentY + 5);
      }
    }

    // Draw info panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 10, 250, 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui';
    ctx.textAlign = 'left';
    ctx.fillText('BTCUSDT - LIVE', 20, 30);
    
    ctx.font = '12px system-ui';
    ctx.fillStyle = '#999999';
    ctx.fillText(`Zoom: ${(viewState.zoom * 100).toFixed(0)}%`, 20, 50);
    ctx.fillText(`Candles visible: ${visibleData.length}`, 20, 70);
    ctx.fillText(`Price range: $${minPrice.toFixed(0)} - $${maxPrice.toFixed(0)}`, 20, 90);

    // Draw controls hint
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, chartHeight - 70, 350, 60);
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#cccccc';
    ctx.fillText('🖱️ Drag to move chart • Scroll to zoom • Double-click to reset', 20, chartHeight - 45);
    ctx.fillText('Price axis (right) and time axis (bottom) stay fixed', 20, chartHeight - 25);
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
          if (newData.length > 2000) {
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
    canvas.addEventListener('dblclick', handleDoubleClick);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('dblclick', handleDoubleClick);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [viewState, chartWidth, chartHeight]);

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
    <div className="relative">
      <canvas 
        ref={canvasRef} 
        className="border-2 border-purple-500 rounded-lg bg-gray-900 cursor-move shadow-2xl"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
        <div>
          <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse mr-1"></span>
          Live WebSocket streaming
        </div>
        <div className="text-purple-400">
          🎮 Full chart navigation with fixed axes - Professional trading experience!
        </div>
      </div>
    </div>
  );
}