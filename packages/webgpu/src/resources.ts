import type { GPUResources } from '@procharting/types';

export class GPUResourceManager implements GPUResources {
  readonly buffers = new Map<string, GPUBuffer>();
  readonly textures = new Map<string, GPUTexture>();
  readonly pipelines = new Map<string, GPURenderPipeline | GPUComputePipeline>();
  
  constructor(private readonly device: GPUDevice) {}

  allocateBuffer(key: string, size: number, usage: GPUBufferUsageFlags): GPUBuffer {
    // Release existing buffer if any
    this.releaseBuffer(key);
    
    const buffer = this.device.createBuffer({
      size,
      usage,
      mappedAtCreation: false,
    });
    
    this.buffers.set(key, buffer);
    return buffer;
  }

  releaseBuffer(key: string): void {
    const buffer = this.buffers.get(key);
    if (buffer) {
      buffer.destroy();
      this.buffers.delete(key);
    }
  }

  allocateTexture(key: string, descriptor: GPUTextureDescriptor): GPUTexture {
    // Release existing texture if any
    this.releaseTexture(key);
    
    const texture = this.device.createTexture(descriptor);
    this.textures.set(key, texture);
    return texture;
  }

  releaseTexture(key: string): void {
    const texture = this.textures.get(key);
    if (texture) {
      texture.destroy();
      this.textures.delete(key);
    }
  }

  releaseAll(): void {
    // Release all buffers
    for (const buffer of this.buffers.values()) {
      buffer.destroy();
    }
    this.buffers.clear();
    
    // Release all textures
    for (const texture of this.textures.values()) {
      texture.destroy();
    }
    this.textures.clear();
    
    // Pipelines don't need explicit cleanup
    this.pipelines.clear();
  }

  // Helper methods for common buffer types
  createVertexBuffer(key: string, data: Float32Array): GPUBuffer {
    const buffer = this.allocateBuffer(
      key,
      data.byteLength,
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    );
    
    this.device.queue.writeBuffer(buffer, 0, data.buffer, data.byteOffset, data.byteLength);
    return buffer;
  }

  createIndexBuffer(key: string, data: Uint16Array | Uint32Array): GPUBuffer {
    const buffer = this.allocateBuffer(
      key,
      data.byteLength,
      GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    );
    
    this.device.queue.writeBuffer(buffer, 0, data.buffer, data.byteOffset, data.byteLength);
    return buffer;
  }

  createUniformBuffer(key: string, size: number): GPUBuffer {
    return this.allocateBuffer(
      key,
      size,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    );
  }

  createStorageBuffer(key: string, size: number, readable = false): GPUBuffer {
    let usage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
    if (readable) {
      usage |= GPUBufferUsage.COPY_SRC;
    }
    
    return this.allocateBuffer(key, size, usage);
  }

  updateBuffer(key: string, data: ArrayBuffer | ArrayBufferView, offset = 0): void {
    const buffer = this.buffers.get(key);
    if (!buffer) {
      throw new Error(`Buffer ${key} not found`);
    }
    
    if (data instanceof ArrayBuffer) {
      this.device.queue.writeBuffer(buffer, offset, data);
    } else {
      this.device.queue.writeBuffer(buffer, offset, data.buffer, data.byteOffset, data.byteLength);
    }
  }
}