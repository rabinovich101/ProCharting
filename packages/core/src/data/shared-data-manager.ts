import { Platform, createSharedBuffer } from '@procharting/utils';
import type { CandlestickData } from '@procharting/types';

export interface SharedDataConfig {
  maxDataPoints: number;
  seriesCount: number;
  useSharedMemory: boolean;
}

export class SharedDataManager {
  private dataBuffer: SharedArrayBuffer | ArrayBuffer;
  private metadataBuffer: SharedArrayBuffer | ArrayBuffer;
  private dataView: DataView;
  private metadata: Int32Array;
  private readonly pointSize = 24; // 6 floats: time, open, high, low, close, volume
  
  constructor(private config: SharedDataConfig) {
    const bufferSize = config.maxDataPoints * config.seriesCount * this.pointSize;
    
    // Create shared or regular buffers based on availability
    if (config.useSharedMemory && Platform.isSharedArrayBufferSupported()) {
      this.dataBuffer = new SharedArrayBuffer(bufferSize);
      this.metadataBuffer = new SharedArrayBuffer(config.seriesCount * 16); // 4 ints per series
    } else {
      this.dataBuffer = new ArrayBuffer(bufferSize);
      this.metadataBuffer = new ArrayBuffer(config.seriesCount * 16);
    }
    
    this.dataView = new DataView(this.dataBuffer);
    this.metadata = new Int32Array(this.metadataBuffer);
  }
  
  appendData(seriesIndex: number, data: CandlestickData[]): void {
    if (seriesIndex >= this.config.seriesCount) {
      throw new Error('Series index out of bounds');
    }
    
    const metadataOffset = seriesIndex * 4;
    const writeOffset = Atomics.load(this.metadata, metadataOffset);
    const dataCount = Atomics.load(this.metadata, metadataOffset + 1);
    
    const seriesOffset = seriesIndex * this.config.maxDataPoints * this.pointSize;
    const maxOffset = seriesOffset + this.config.maxDataPoints * this.pointSize;
    
    let currentOffset = seriesOffset + writeOffset;
    
    for (const point of data) {
      if (currentOffset + this.pointSize > maxOffset) {
        // Wrap around (ring buffer)
        currentOffset = seriesOffset;
      }
      
      // Write data point
      this.dataView.setFloat32(currentOffset, point.time, true);
      this.dataView.setFloat32(currentOffset + 4, point.open, true);
      this.dataView.setFloat32(currentOffset + 8, point.high, true);
      this.dataView.setFloat32(currentOffset + 12, point.low, true);
      this.dataView.setFloat32(currentOffset + 16, point.close, true);
      this.dataView.setFloat32(currentOffset + 20, point.volume, true);
      
      currentOffset += this.pointSize;
    }
    
    // Update metadata atomically
    const newWriteOffset = currentOffset - seriesOffset;
    const newDataCount = Math.min(dataCount + data.length, this.config.maxDataPoints);
    
    Atomics.store(this.metadata, metadataOffset, newWriteOffset);
    Atomics.store(this.metadata, metadataOffset + 1, newDataCount);
    
    // Notify waiting threads
    Atomics.notify(this.metadata, metadataOffset + 1);
  }
  
  getData(seriesIndex: number, startIndex: number, count: number): ArrayBuffer {
    if (seriesIndex >= this.config.seriesCount) {
      throw new Error('Series index out of bounds');
    }
    
    const metadataOffset = seriesIndex * 4;
    const dataCount = Atomics.load(this.metadata, metadataOffset + 1);
    
    if (startIndex >= dataCount) {
      return new ArrayBuffer(0);
    }
    
    const actualCount = Math.min(count, dataCount - startIndex);
    const result = new ArrayBuffer(actualCount * this.pointSize);
    const resultView = new Uint8Array(result);
    
    const seriesOffset = seriesIndex * this.config.maxDataPoints * this.pointSize;
    const sourceView = new Uint8Array(this.dataBuffer);
    
    for (let i = 0; i < actualCount; i++) {
      const pointIndex = (startIndex + i) % this.config.maxDataPoints;
      const sourceOffset = seriesOffset + pointIndex * this.pointSize;
      const destOffset = i * this.pointSize;
      
      // Copy point data
      for (let j = 0; j < this.pointSize; j++) {
        resultView[destOffset + j] = sourceView[sourceOffset + j]!;
      }
    }
    
    return result;
  }
  
  waitForData(seriesIndex: number, minCount: number, timeout = 5000): Promise<void> {
    if (!this.isSharedMemory()) {
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      const metadataOffset = seriesIndex * 4;
      const startTime = Date.now();
      
      const checkData = (): void => {
        const dataCount = Atomics.load(this.metadata, metadataOffset + 1);
        
        if (dataCount >= minCount) {
          resolve();
          return;
        }
        
        if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for data'));
          return;
        }
        
        // Wait for notification
        const result = Atomics.wait(this.metadata, metadataOffset + 1, dataCount, 100);
        
        if (result === 'timed-out') {
          setTimeout(checkData, 0);
        } else {
          checkData();
        }
      };
      
      checkData();
    });
  }
  
  clear(seriesIndex: number): void {
    const metadataOffset = seriesIndex * 4;
    Atomics.store(this.metadata, metadataOffset, 0); // writeOffset
    Atomics.store(this.metadata, metadataOffset + 1, 0); // dataCount
    Atomics.notify(this.metadata, metadataOffset + 1);
  }
  
  getBuffers(): { dataBuffer: ArrayBuffer | SharedArrayBuffer; metadataBuffer: ArrayBuffer | SharedArrayBuffer } {
    return {
      dataBuffer: this.dataBuffer,
      metadataBuffer: this.metadataBuffer,
    };
  }
  
  isSharedMemory(): boolean {
    return this.dataBuffer instanceof SharedArrayBuffer;
  }
  
  getDataCount(seriesIndex: number): number {
    const metadataOffset = seriesIndex * 4;
    return Atomics.load(this.metadata, metadataOffset + 1);
  }
}