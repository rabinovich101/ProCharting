'use client';

import { useEffect, useRef } from 'react';
import type { CandleData } from '@/services/binanceApi';

interface SimpleCanvasChartProps {
  data: CandleData[];
  width?: number;
  height?: number;
}

export default function SimpleCanvasChart({ data, width = 800, height = 400 }: SimpleCanvasChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
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

    // Calculate data bounds
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    
    data.forEach(candle => {
      minPrice = Math.min(minPrice, candle.low);
      maxPrice = Math.max(maxPrice, candle.high);
    });

    // Add padding
    const padding = (maxPrice - minPrice) * 0.1;
    minPrice -= padding;
    maxPrice += padding;

    // Reserve space for price labels on the right
    const rightPadding = 80;
    const chartWidth = width - rightPadding;

    // Calculate scales
    const priceScale = height / (maxPrice - minPrice);
    const timeScale = chartWidth / data.length;

    // Draw grid
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
      
      // Price labels on the right
      const price = maxPrice - (maxPrice - minPrice) * (i / 5);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'left';
      ctx.fillText(`$${price.toFixed(0)}`, chartWidth + 5, y + 4);
    }

    // Draw candles
    data.forEach((candle, index) => {
      const x = index * timeScale + timeScale / 2;
      const openY = height - (candle.open - minPrice) * priceScale;
      const closeY = height - (candle.close - minPrice) * priceScale;
      const highY = height - (candle.high - minPrice) * priceScale;
      const lowY = height - (candle.low - minPrice) * priceScale;

      // Determine color
      const isGreen = candle.close >= candle.open;
      const color = isGreen ? '#00ff00' : '#ff0000';

      // Draw wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw body
      const bodyHeight = Math.abs(closeY - openY);
      const bodyY = Math.min(openY, closeY);
      const bodyWidth = timeScale * 0.8;

      ctx.fillStyle = color;
      ctx.fillRect(x - bodyWidth / 2, bodyY, bodyWidth, bodyHeight || 1);
    });

    // Draw title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px system-ui';
    ctx.fillText('BTCUSDT', 10, 25);

  }, [data, width, height]);

  return (
    <canvas 
      ref={canvasRef} 
      className="border border-gray-300 rounded"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}