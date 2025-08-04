/// <reference lib="webworker" />

import type { WorkerMessage, WorkerResponse } from '@procharting/utils';
import { BinaryDecoder, BinaryEncoder, douglasPeucker, Vec2 } from '@procharting/utils';

declare const self: DedicatedWorkerGlobalScope;

// Shared memory for zero-copy data transfer
let sharedDataBuffer: SharedArrayBuffer | null = null;
let sharedDataView: DataView | null = null;
let sharedMetadata: Int32Array | null = null;

// Message handlers
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { id, type, data } = event.data;
  
  try {
    let result: unknown;
    
    switch (type) {
      case 'init':
        result = handleInit(data);
        break;
      case 'process':
        result = handleProcess(data);
        break;
      case 'decimate':
        result = handleDecimate(data);
        break;
      case 'aggregate':
        result = handleAggregate(data);
        break;
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
    const response: WorkerResponse = {
      id,
      type: 'success',
      data: result,
    };
    
    self.postMessage(response);
  } catch (error) {
    const response: WorkerResponse = {
      id,
      type: 'error',
      data: null,
      error: error as Error,
    };
    
    self.postMessage(response);
  }
});

function handleInit(data: any): void {
  const { bufferSize } = data;
  
  // Create shared buffers
  if (typeof SharedArrayBuffer !== 'undefined') {
    sharedDataBuffer = new SharedArrayBuffer(bufferSize);
    sharedDataView = new DataView(sharedDataBuffer);
    
    // Metadata: [writeOffset, readOffset, dataCount, isProcessing]
    const metadataBuffer = new SharedArrayBuffer(16);
    sharedMetadata = new Int32Array(metadataBuffer);
    
    return {
      dataBuffer: sharedDataBuffer,
      metadataBuffer,
    };
  }
  
  throw new Error('SharedArrayBuffer not available');
}

function handleProcess(data: any): ArrayBuffer {
  const { input, format } = data;
  
  if (format === 'binary') {
    // Process binary data
    const decoder = new BinaryDecoder(input);
    const points: Array<{ time: number; value: number }> = [];
    
    while (decoder.hasMore) {
      const time = decoder.readFloat32();
      const value = decoder.readFloat32();
      points.push({ time, value });
    }
    
    // Sort by time
    points.sort((a, b) => a.time - b.time);
    
    // Encode back
    const encoder = new BinaryEncoder(points.length * 8);
    for (const point of points) {
      encoder.writeFloat32(point.time);
      encoder.writeFloat32(point.value);
    }
    
    return encoder.getBuffer();
  }
  
  return input;
}

function handleDecimate(data: any): ArrayBuffer {
  const { input, targetPoints, algorithm } = data;
  
  // Decode points
  const decoder = new BinaryDecoder(input);
  const points: Vec2[] = [];
  
  while (decoder.hasMore) {
    const x = decoder.readFloat32();
    const y = decoder.readFloat32();
    points.push({ x, y });
  }
  
  if (points.length <= targetPoints) {
    return input;
  }
  
  let decimated: Vec2[];
  
  switch (algorithm) {
    case 'douglas-peucker': {
      // Calculate tolerance based on data range
      const minY = Math.min(...points.map(p => p.y));
      const maxY = Math.max(...points.map(p => p.y));
      const tolerance = (maxY - minY) / 100;
      
      decimated = douglasPeucker(points, tolerance);
      break;
    }
    
    case 'nth-point': {
      // Simple nth-point decimation
      const step = Math.ceil(points.length / targetPoints);
      decimated = points.filter((_, i) => i % step === 0);
      break;
    }
    
    case 'lttb': {
      // TODO: Implement LTTB algorithm
      decimated = points;
      break;
    }
    
    default:
      decimated = points;
  }
  
  // Encode decimated points
  const encoder = new BinaryEncoder(decimated.length * 8);
  for (const point of decimated) {
    encoder.writeFloat32(point.x);
    encoder.writeFloat32(point.y);
  }
  
  return encoder.getBuffer();
}

function handleAggregate(data: any): ArrayBuffer {
  const { input, interval, method } = data;
  
  // Decode OHLC data
  const decoder = new BinaryDecoder(input);
  const candles: Array<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }> = [];
  
  while (decoder.hasMore) {
    candles.push({
      time: decoder.readFloat32(),
      open: decoder.readFloat32(),
      high: decoder.readFloat32(),
      low: decoder.readFloat32(),
      close: decoder.readFloat32(),
      volume: decoder.readFloat32(),
    });
  }
  
  // Group by interval
  const grouped = new Map<number, typeof candles>();
  
  for (const candle of candles) {
    const key = Math.floor(candle.time / interval) * interval;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(candle);
  }
  
  // Aggregate each group
  const aggregated: typeof candles = [];
  
  for (const [time, group] of grouped) {
    if (group.length === 0) continue;
    
    const open = group[0]!.open;
    const close = group[group.length - 1]!.close;
    const high = Math.max(...group.map(c => c.high));
    const low = Math.min(...group.map(c => c.low));
    const volume = group.reduce((sum, c) => sum + c.volume, 0);
    
    aggregated.push({ time, open, high, low, close, volume });
  }
  
  // Sort by time
  aggregated.sort((a, b) => a.time - b.time);
  
  // Encode result
  const encoder = new BinaryEncoder(aggregated.length * 24);
  for (const candle of aggregated) {
    encoder.writeFloat32(candle.time);
    encoder.writeFloat32(candle.open);
    encoder.writeFloat32(candle.high);
    encoder.writeFloat32(candle.low);
    encoder.writeFloat32(candle.close);
    encoder.writeFloat32(candle.volume);
  }
  
  return encoder.getBuffer();
}