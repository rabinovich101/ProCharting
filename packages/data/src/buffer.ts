import type { DataBuffer as IDataBuffer, TimeRange } from '@procharting/types';
import { RingBuffer } from '@procharting/utils';

export class DataBuffer implements IDataBuffer {
  private ringBuffer: RingBuffer;
  private _length = 0;
  
  constructor(public readonly capacity: number) {
    this.ringBuffer = new RingBuffer(capacity);
  }
  
  get length(): number {
    return this._length;
  }
  
  get data(): ArrayBuffer {
    return this.slice();
  }
  
  append(data: ArrayBuffer): void {
    if (!this.ringBuffer.write(data)) {
      throw new Error('Buffer overflow');
    }
    this._length += data.byteLength;
  }
  
  clear(): void {
    this.ringBuffer.clear();
    this._length = 0;
  }
  
  slice(range?: TimeRange): ArrayBuffer {
    if (!range) {
      // Return all data
      const buffer = new ArrayBuffer(this._length);
      const view = new Uint8Array(buffer);
      let offset = 0;
      
      // Read all data from ring buffer
      while (offset < this._length) {
        const chunk = this.ringBuffer.read(Math.min(1024, this._length - offset));
        if (!chunk) break;
        
        view.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }
      
      return buffer;
    }
    
    // TODO: Implement time-based slicing
    throw new Error('Time-based slicing not implemented');
  }
}