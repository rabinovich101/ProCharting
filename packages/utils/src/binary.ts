export class BinaryEncoder {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset = 0;

  constructor(initialSize = 1024) {
    this.buffer = new ArrayBuffer(initialSize);
    this.view = new DataView(this.buffer);
  }

  private ensureCapacity(bytes: number): void {
    if (this.offset + bytes > this.buffer.byteLength) {
      const newSize = Math.max(this.buffer.byteLength * 2, this.offset + bytes);
      const newBuffer = new ArrayBuffer(newSize);
      new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));
      this.buffer = newBuffer;
      this.view = new DataView(this.buffer);
    }
  }

  writeUint8(value: number): void {
    this.ensureCapacity(1);
    this.view.setUint8(this.offset, value);
    this.offset += 1;
  }

  writeUint16(value: number): void {
    this.ensureCapacity(2);
    this.view.setUint16(this.offset, value, true);
    this.offset += 2;
  }

  writeUint32(value: number): void {
    this.ensureCapacity(4);
    this.view.setUint32(this.offset, value, true);
    this.offset += 4;
  }

  writeFloat32(value: number): void {
    this.ensureCapacity(4);
    this.view.setFloat32(this.offset, value, true);
    this.offset += 4;
  }

  writeFloat64(value: number): void {
    this.ensureCapacity(8);
    this.view.setFloat64(this.offset, value, true);
    this.offset += 8;
  }

  writeString(value: string): void {
    const bytes = new TextEncoder().encode(value);
    this.writeUint32(bytes.length);
    this.ensureCapacity(bytes.length);
    new Uint8Array(this.buffer, this.offset).set(bytes);
    this.offset += bytes.length;
  }

  getBuffer(): ArrayBuffer {
    return this.buffer.slice(0, this.offset);
  }

  reset(): void {
    this.offset = 0;
  }
}

export class BinaryDecoder {
  private view: DataView;
  private offset = 0;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  readUint8(): number {
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  readUint16(): number {
    const value = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return value;
  }

  readUint32(): number {
    const value = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readFloat32(): number {
    const value = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readFloat64(): number {
    const value = this.view.getFloat64(this.offset, true);
    this.offset += 8;
    return value;
  }

  readString(): string {
    const length = this.readUint32();
    const bytes = new Uint8Array(this.view.buffer, this.offset, length);
    this.offset += length;
    return new TextDecoder().decode(bytes);
  }

  get hasMore(): boolean {
    return this.offset < this.view.byteLength;
  }

  reset(): void {
    this.offset = 0;
  }
}

export function encodeDataPoints(points: Array<{ time: number; value: number }>): ArrayBuffer {
  const encoder = new BinaryEncoder(points.length * 12 + 4);
  encoder.writeUint32(points.length);
  
  for (const point of points) {
    encoder.writeFloat32(point.time);
    encoder.writeFloat64(point.value);
  }
  
  return encoder.getBuffer();
}

export function decodeDataPoints(buffer: ArrayBuffer): Array<{ time: number; value: number }> {
  const decoder = new BinaryDecoder(buffer);
  const length = decoder.readUint32();
  const points: Array<{ time: number; value: number }> = [];
  
  for (let i = 0; i < length; i++) {
    points.push({
      time: decoder.readFloat32(),
      value: decoder.readFloat64(),
    });
  }
  
  return points;
}