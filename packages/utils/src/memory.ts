export class MemoryPool<T> {
  private readonly pool: T[] = [];
  private readonly factory: () => T;
  private readonly reset?: (item: T) => void;
  private readonly maxSize: number;

  constructor(options: {
    factory: () => T;
    reset?: (item: T) => void;
    maxSize?: number;
  }) {
    this.factory = options.factory;
    this.reset = options.reset;
    this.maxSize = options.maxSize ?? 100;
  }

  acquire(): T {
    return this.pool.pop() ?? this.factory();
  }

  release(item: T): void {
    if (this.pool.length < this.maxSize) {
      this.reset?.(item);
      this.pool.push(item);
    }
  }

  clear(): void {
    this.pool.length = 0;
  }
}

export class RingBuffer {
  private readonly buffer: ArrayBuffer;
  private writeOffset = 0;
  private readOffset = 0;
  private size = 0;

  constructor(capacity: number) {
    this.buffer = new ArrayBuffer(capacity);
  }

  get capacity(): number {
    return this.buffer.byteLength;
  }

  get length(): number {
    return this.size;
  }

  get available(): number {
    return this.capacity - this.size;
  }

  write(data: ArrayBuffer): boolean {
    if (data.byteLength > this.available) {
      return false;
    }

    const bytes = new Uint8Array(data);
    const writeView = new Uint8Array(this.buffer);

    for (let i = 0; i < bytes.length; i++) {
      writeView[this.writeOffset] = bytes[i]!;
      this.writeOffset = (this.writeOffset + 1) % this.capacity;
    }

    this.size += data.byteLength;
    return true;
  }

  read(length: number): ArrayBuffer | null {
    if (length > this.size) {
      return null;
    }

    const result = new ArrayBuffer(length);
    const resultView = new Uint8Array(result);
    const readView = new Uint8Array(this.buffer);

    for (let i = 0; i < length; i++) {
      resultView[i] = readView[this.readOffset]!;
      this.readOffset = (this.readOffset + 1) % this.capacity;
    }

    this.size -= length;
    return result;
  }

  peek(length: number): ArrayBuffer | null {
    if (length > this.size) {
      return null;
    }

    const result = new ArrayBuffer(length);
    const resultView = new Uint8Array(result);
    const readView = new Uint8Array(this.buffer);
    let offset = this.readOffset;

    for (let i = 0; i < length; i++) {
      resultView[i] = readView[offset]!;
      offset = (offset + 1) % this.capacity;
    }

    return result;
  }

  clear(): void {
    this.writeOffset = 0;
    this.readOffset = 0;
    this.size = 0;
  }
}

export function createSharedBuffer(size: number): SharedArrayBuffer | ArrayBuffer {
  if (typeof SharedArrayBuffer !== 'undefined') {
    try {
      return new SharedArrayBuffer(size);
    } catch {
      // SharedArrayBuffer might be disabled due to security headers
    }
  }
  return new ArrayBuffer(size);
}

export function transferArrayBuffer(buffer: ArrayBuffer): ArrayBuffer {
  if ('transfer' in buffer && typeof buffer.transfer === 'function') {
    return buffer.transfer();
  }
  // Fallback for browsers without ArrayBuffer.transfer()
  const newBuffer = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(newBuffer).set(new Uint8Array(buffer));
  return newBuffer;
}