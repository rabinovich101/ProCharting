import type { StreamingOptions } from '@procharting/types';
import { EventEmitter } from '@procharting/utils';
import { DataBuffer } from './buffer';

type StreamingEvents = {
  data: ArrayBuffer;
  error: Error;
  end: void;
};

export class StreamingDataSource extends EventEmitter<StreamingEvents> {
  private buffer: DataBuffer;
  private isStreaming = false;
  
  constructor(private options: StreamingOptions) {
    super();
    this.buffer = new DataBuffer(options.bufferSize ?? 1_000_000);
  }
  
  async start(): Promise<void> {
    if (this.isStreaming) return;
    this.isStreaming = true;
    
    if (this.options.data instanceof ReadableStream) {
      await this.streamFromReadableStream(this.options.data);
    } else {
      await this.streamFromAsyncIterable(this.options.data);
    }
  }
  
  stop(): void {
    this.isStreaming = false;
  }
  
  private async streamFromReadableStream(stream: ReadableStream<ArrayBuffer>): Promise<void> {
    const reader = stream.getReader();
    
    try {
      while (this.isStreaming) {
        const { done, value } = await reader.read();
        
        if (done) {
          this.emit('end', undefined);
          break;
        }
        
        if (value) {
          this.processData(value);
        }
      }
    } catch (error) {
      this.emit('error', error as Error);
    } finally {
      reader.releaseLock();
    }
  }
  
  private async streamFromAsyncIterable(iterable: AsyncIterable<unknown[]>): Promise<void> {
    try {
      for await (const batch of iterable) {
        if (!this.isStreaming) break;
        
        // Convert data points to binary format
        const buffer = this.encodeBatch(batch);
        this.processData(buffer);
      }
      
      this.emit('end', undefined);
    } catch (error) {
      this.emit('error', error as Error);
    }
  }
  
  private processData(data: ArrayBuffer): void {
    if (this.options.mode === 'replace') {
      this.buffer.clear();
    }
    
    this.buffer.append(data);
    
    // Apply aggregation if enabled
    if (this.options.aggregation?.enabled) {
      // TODO: Implement aggregation
    }
    
    this.emit('data', data);
  }
  
  private encodeBatch(batch: unknown[]): ArrayBuffer {
    // Simple encoding - in production, use proper encoder
    const buffer = new ArrayBuffer(batch.length * 8);
    const view = new DataView(buffer);
    
    batch.forEach((item: any, i) => {
      const offset = i * 8;
      view.setFloat32(offset, item.time || 0, true);
      view.setFloat32(offset + 4, item.value || 0, true);
    });
    
    return buffer;
  }
}