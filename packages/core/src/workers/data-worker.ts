/// <reference lib="webworker" />

import type { WorkerMessage, WorkerResponse, Vec2 } from '@procharting/utils';
import { BinaryDecoder, BinaryEncoder, douglasPeucker } from '@procharting/utils';

declare const self: DedicatedWorkerGlobalScope;

type InitData = {
  bufferSize: number;
};

type ProcessData = {
  input: ArrayBuffer;
  format: string;
};

type DecimateData = {
  input: ArrayBuffer;
  targetPoints: number;
  algorithm: string;
};

type AggregateData = {
  input: ArrayBuffer;
  interval: number;
};

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

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

function handleInit(data: unknown): { dataBuffer: SharedArrayBuffer; metadataBuffer: SharedArrayBuffer } {
  const { bufferSize } = readInitData(data);
  
  // Create shared buffers
  if (typeof SharedArrayBuffer !== 'undefined') {
    const dataBuffer = new SharedArrayBuffer(bufferSize);
    
    // Metadata: [writeOffset, readOffset, dataCount, isProcessing]
    const metadataBuffer = new SharedArrayBuffer(16);
    
    return {
      dataBuffer,
      metadataBuffer,
    };
  }
  
  throw new Error('SharedArrayBuffer not available');
}

function handleProcess(data: unknown): ArrayBuffer {
  const { input, format } = readProcessData(data);
  
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

function handleDecimate(data: unknown): ArrayBuffer {
  const { input, targetPoints, algorithm } = readDecimateData(data);
  
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

function handleAggregate(data: unknown): ArrayBuffer {
  const { input, interval } = readAggregateData(data);
  
  // Decode OHLC data
  const decoder = new BinaryDecoder(input);
  const candles: Candle[] = [];
  
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
  const grouped = new Map<number, Candle[]>();
  
  for (const candle of candles) {
    const key = Math.floor(candle.time / interval) * interval;
    const group = grouped.get(key);
    if (group) {
      group.push(candle);
    } else {
      grouped.set(key, [candle]);
    }
  }
  
  // Aggregate each group
  const aggregated: Candle[] = [];
  
  for (const [time, group] of grouped) {
    if (group.length === 0) continue;
    
    const first = group[0];
    const last = group[group.length - 1];
    if (!first || !last) continue;

    const open = first.open;
    const close = last.close;
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

function readInitData(data: unknown): InitData {
  const record = readRecord(data);
  return {
    bufferSize: readNumber(record, 'bufferSize'),
  };
}

function readProcessData(data: unknown): ProcessData {
  const record = readRecord(data);
  return {
    input: readArrayBuffer(record, 'input'),
    format: readString(record, 'format'),
  };
}

function readDecimateData(data: unknown): DecimateData {
  const record = readRecord(data);
  return {
    input: readArrayBuffer(record, 'input'),
    targetPoints: readNumber(record, 'targetPoints'),
    algorithm: readString(record, 'algorithm'),
  };
}

function readAggregateData(data: unknown): AggregateData {
  const record = readRecord(data);
  return {
    input: readArrayBuffer(record, 'input'),
    interval: readNumber(record, 'interval'),
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Worker payload must be an object');
  }
  return value as Record<string, unknown>;
}

function readArrayBuffer(record: Record<string, unknown>, field: string): ArrayBuffer {
  const value = record[field];
  if (!(value instanceof ArrayBuffer)) {
    throw new Error(`Worker payload ${field} must be an ArrayBuffer`);
  }
  return value;
}

function readNumber(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Worker payload ${field} must be a finite number`);
  }
  return value;
}

function readString(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== 'string') {
    throw new Error(`Worker payload ${field} must be a string`);
  }
  return value;
}
