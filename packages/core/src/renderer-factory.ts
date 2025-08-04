import type { Renderer, RendererType } from '@procharting/types';
import { Platform } from '@procharting/utils';

export class RendererFactory {
  static create(type: RendererType): Renderer {
    if (type === 'auto') {
      type = this.detectBestRenderer();
    }

    switch (type) {
      case 'webgpu':
        if (!Platform.isWebGPUSupported()) {
          console.warn('WebGPU not supported, falling back to WebGL2');
          return this.create('webgl2');
        }
        return this.createWebGPUWrapper();
        
      case 'webgl2':
        if (!Platform.isWebGL2Supported()) {
          console.warn('WebGL2 not supported, falling back to Canvas2D');
          return this.create('canvas2d');
        }
        return this.createWebGL2Renderer();
        
      case 'canvas2d':
        return this.createCanvas2DRenderer();
        
      default:
        throw new Error(`Unknown renderer type: ${type}`);
    }
  }

  private static detectBestRenderer(): RendererType {
    if (Platform.isWebGPUSupported()) {
      return 'webgpu';
    }
    if (Platform.isWebGL2Supported()) {
      return 'webgl2';
    }
    return 'canvas2d';
  }

  private static createWebGPUWrapper(): Renderer {
    let renderer: Renderer | null = null;
    let initPromise: Promise<void> | null = null;
    
    return {
      type: 'webgpu',
      capabilities: {
        maxTextureSize: 8192,
        maxVertices: 16777216,
        maxDrawCalls: 100000,
        supportsComputeShaders: true,
        supportsMultisampling: true,
        supportsInstancing: true,
        supportsFloat32Textures: true,
      },
      
      async initialize(canvas: HTMLCanvasElement): Promise<void> {
        if (!initPromise) {
          initPromise = (async (): Promise<void> => {
            const { WebGPURenderer } = await import('@procharting/webgpu');
            renderer = new WebGPURenderer();
            await renderer.initialize(canvas);
          })();
        }
        await initPromise;
      },
      
      render(scene): void {
        if (!renderer) {
          console.warn('WebGPU renderer not initialized');
          return;
        }
        renderer.render(scene);
      },
      
      resize(width: number, height: number): void {
        renderer?.resize(width, height);
      },
      
      destroy(): void {
        renderer?.destroy();
      },
    };
  }

  private static createWebGL2Renderer(): Renderer {
    let renderer: Renderer | null = null;
    let initPromise: Promise<void> | null = null;
    
    return {
      type: 'webgl2',
      capabilities: {
        maxTextureSize: 4096,
        maxVertices: 1048576,
        maxDrawCalls: 10000,
        supportsComputeShaders: false,
        supportsMultisampling: true,
        supportsInstancing: true,
        supportsFloat32Textures: true,
      },
      
      async initialize(canvas: HTMLCanvasElement): Promise<void> {
        if (!initPromise) {
          initPromise = (async (): Promise<void> => {
            const { WebGL2Renderer } = await import('@procharting/webgl');
            renderer = new WebGL2Renderer();
            await renderer.initialize(canvas);
          })();
        }
        await initPromise;
      },
      
      render(scene): void {
        if (!renderer) {
          console.warn('WebGL2 renderer not initialized');
          return;
        }
        renderer.render(scene);
      },
      
      resize(width: number, height: number): void {
        renderer?.resize(width, height);
      },
      
      destroy(): void {
        renderer?.destroy();
      },
    };
  }

  private static createCanvas2DRenderer(): Renderer {
    return {
      type: 'canvas2d',
      capabilities: {
        maxTextureSize: 4096,
        maxVertices: 65536,
        maxDrawCalls: 1000,
        supportsComputeShaders: false,
        supportsMultisampling: false,
        supportsInstancing: false,
        supportsFloat32Textures: false,
      },
      
      async initialize(canvas: HTMLCanvasElement): Promise<void> {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get 2D context');
        }
      },
      
      render(scene): void {
        // Basic Canvas2D rendering for fallback
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Clear canvas
        ctx.fillStyle = scene.theme.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // TODO: Implement actual rendering
      },
      
      resize(width: number, height: number): void {
        // Canvas2D doesn't need special resize handling
      },
      
      destroy(): void {
        // Canvas2D doesn't need cleanup
      },
    };
  }
}