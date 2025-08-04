import { MemoryPool } from '@procharting/utils';
import { createBuffer, createIndexBuffer } from './utils';

export class BufferManager {
  private buffers = new Map<string, WebGLBuffer>();
  private vertexArrays = new Map<string, WebGLVertexArrayObject>();
  private bufferPool: MemoryPool<WebGLBuffer>;
  private vaoPool: MemoryPool<WebGLVertexArrayObject>;
  
  constructor(private gl: WebGL2RenderingContext) {
    this.bufferPool = new MemoryPool({
      factory: () => this.gl.createBuffer()!,
      reset: (_buffer) => {
        // Buffers don't need reset, just reuse
      },
      maxSize: 100,
    });
    
    this.vaoPool = new MemoryPool({
      factory: () => this.gl.createVertexArray()!,
      reset: (_vao) => {
        // VAOs don't need reset
      },
      maxSize: 50,
    });
  }
  
  createVertexBuffer(key: string, data: Float32Array, dynamic = false): WebGLBuffer {
    this.deleteBuffer(key);
    
    const usage = dynamic ? this.gl.DYNAMIC_DRAW : this.gl.STATIC_DRAW;
    const buffer = createBuffer(this.gl, data, usage);
    this.buffers.set(key, buffer);
    return buffer;
  }
  
  createIndexBuffer(key: string, data: Uint16Array | Uint32Array): WebGLBuffer {
    this.deleteBuffer(key);
    
    const buffer = createIndexBuffer(this.gl, data);
    this.buffers.set(key, buffer);
    return buffer;
  }
  
  updateBuffer(key: string, data: ArrayBufferView, offset = 0): void {
    const buffer = this.buffers.get(key);
    if (!buffer) {
      throw new Error(`Buffer ${key} not found`);
    }
    
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, offset, data);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
  
  getBuffer(key: string): WebGLBuffer | undefined {
    return this.buffers.get(key);
  }
  
  deleteBuffer(key: string): void {
    const buffer = this.buffers.get(key);
    if (buffer) {
      this.gl.deleteBuffer(buffer);
      this.buffers.delete(key);
    }
  }
  
  createVertexArray(key: string): WebGLVertexArrayObject {
    this.deleteVertexArray(key);
    
    const vao = this.vaoPool.acquire();
    this.vertexArrays.set(key, vao);
    return vao;
  }
  
  getVertexArray(key: string): WebGLVertexArrayObject | undefined {
    return this.vertexArrays.get(key);
  }
  
  deleteVertexArray(key: string): void {
    const vao = this.vertexArrays.get(key);
    if (vao) {
      this.vaoPool.release(vao);
      this.vertexArrays.delete(key);
    }
  }
  
  // Optimized buffer allocation for streaming data
  allocateStreamingBuffer(size: number): WebGLBuffer {
    const buffer = this.bufferPool.acquire();
    const gl = this.gl;
    
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, size, gl.STREAM_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
    return buffer;
  }
  
  releaseStreamingBuffer(buffer: WebGLBuffer): void {
    this.bufferPool.release(buffer);
  }
  
  destroy(): void {
    // Delete all buffers
    for (const buffer of this.buffers.values()) {
      this.gl.deleteBuffer(buffer);
    }
    this.buffers.clear();
    
    // Delete all VAOs
    for (const vao of this.vertexArrays.values()) {
      this.gl.deleteVertexArray(vao);
    }
    this.vertexArrays.clear();
    
    // Clear pools
    this.bufferPool.clear();
    this.vaoPool.clear();
  }
}