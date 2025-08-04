import type { Renderer, RendererCapabilities, RenderScene } from '@procharting/types';
import { Mat4 } from '@procharting/utils';
import { ShaderManager } from './shaders/shader-manager';
import { BufferManager } from './buffer-manager';
import { CandlestickRenderer } from './renderers/candlestick';
import { LineRenderer } from './renderers/line';
import { BarRenderer } from './renderers/bar';

export class WebGL2Renderer implements Renderer {
  readonly type = 'webgl2' as const;
  readonly capabilities: RendererCapabilities;
  
  private gl!: WebGL2RenderingContext;
  private canvas!: HTMLCanvasElement;
  private shaderManager!: ShaderManager;
  private bufferManager!: BufferManager;
  private candlestickRenderer!: CandlestickRenderer;
  private lineRenderer!: LineRenderer;
  private barRenderer!: BarRenderer;
  private projectionMatrix!: Mat4;
  private msaaFramebuffer: WebGLFramebuffer | null = null;
  private msaaRenderbuffer: WebGLRenderbuffer | null = null;
  private depthRenderbuffer: WebGLRenderbuffer | null = null;
  private samples = 4; // MSAA samples

  constructor() {
    this.capabilities = {
      maxTextureSize: 4096,
      maxVertices: 1048576,
      maxDrawCalls: 10000,
      supportsComputeShaders: false, // WebGL2 doesn't have compute shaders
      supportsMultisampling: true,
      supportsInstancing: true,
      supportsFloat32Textures: true,
    };
  }

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false, // We'll use our own MSAA
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
      premultipliedAlpha: true,
      desynchronized: true,
    });

    if (!gl) {
      throw new Error('WebGL2 not supported');
    }

    this.gl = gl;
    
    // Update capabilities based on actual limits
    (this.capabilities as any).maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    (this.capabilities as any).maxVertices = gl.getParameter(gl.MAX_ELEMENTS_VERTICES);
    
    // Enable required extensions
    const extensions = [
      'EXT_color_buffer_float',
      'OES_texture_float_linear',
      'EXT_float_blend',
    ];
    
    for (const ext of extensions) {
      if (!gl.getExtension(ext)) {
        console.warn(`Extension ${ext} not available`);
      }
    }
    
    // Initialize managers
    this.shaderManager = new ShaderManager(gl);
    this.bufferManager = new BufferManager(gl);
    
    // Initialize renderers
    this.candlestickRenderer = new CandlestickRenderer(gl, this.shaderManager, this.bufferManager);
    this.lineRenderer = new LineRenderer(gl, this.shaderManager, this.bufferManager);
    this.barRenderer = new BarRenderer(gl, this.shaderManager, this.bufferManager);
    
    // Set initial GL state
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    // Initialize projection matrix
    this.updateProjectionMatrix();
    
    // Setup MSAA framebuffer
    this.setupMSAA();
  }

  private setupMSAA(): void {
    const gl = this.gl;
    
    // Check max samples
    const maxSamples = gl.getParameter(gl.MAX_SAMPLES);
    this.samples = Math.min(this.samples, maxSamples);
    
    if (this.samples <= 1) return; // No MSAA
    
    // Create framebuffer
    this.msaaFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.msaaFramebuffer);
    
    // Create multisample renderbuffer for color
    this.msaaRenderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.msaaRenderbuffer);
    gl.renderbufferStorageMultisample(
      gl.RENDERBUFFER,
      this.samples,
      gl.RGBA8,
      this.canvas.width,
      this.canvas.height
    );
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.RENDERBUFFER,
      this.msaaRenderbuffer
    );
    
    // Create depth renderbuffer
    this.depthRenderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthRenderbuffer);
    gl.renderbufferStorageMultisample(
      gl.RENDERBUFFER,
      this.samples,
      gl.DEPTH_COMPONENT24,
      this.canvas.width,
      this.canvas.height
    );
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER,
      this.depthRenderbuffer
    );
    
    // Check framebuffer completeness
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      console.warn('MSAA framebuffer incomplete:', status);
      this.cleanupMSAA();
    }
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private cleanupMSAA(): void {
    const gl = this.gl;
    
    if (this.msaaFramebuffer) {
      gl.deleteFramebuffer(this.msaaFramebuffer);
      this.msaaFramebuffer = null;
    }
    if (this.msaaRenderbuffer) {
      gl.deleteRenderbuffer(this.msaaRenderbuffer);
      this.msaaRenderbuffer = null;
    }
    if (this.depthRenderbuffer) {
      gl.deleteRenderbuffer(this.depthRenderbuffer);
      this.depthRenderbuffer = null;
    }
  }

  private updateProjectionMatrix(): void {
    // Create orthographic projection for 2D rendering
    this.projectionMatrix = Mat4.ortho(0, this.canvas.width, this.canvas.height, 0, -1, 1);
  }

  render(scene: RenderScene): void {
    const gl = this.gl;
    
    // Bind MSAA framebuffer if available
    if (this.msaaFramebuffer) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.msaaFramebuffer);
    }
    
    // Clear
    const color = this.parseColor(scene.theme.backgroundColor);
    gl.clearColor(color.r, color.g, color.b, color.a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // Set viewport
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    
    // Render each series
    for (const series of scene.series) {
      if (!series.visible) continue;
      
      switch (series.type) {
        case 'candlestick':
          this.candlestickRenderer.render(series, scene, this.projectionMatrix);
          break;
        case 'line':
          this.lineRenderer.render(series, scene, this.projectionMatrix);
          break;
        case 'bar':
          this.barRenderer.render(series, scene, this.projectionMatrix);
          break;
      }
    }
    
    // Resolve MSAA framebuffer to screen
    if (this.msaaFramebuffer) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.msaaFramebuffer);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      gl.blitFramebuffer(
        0, 0, this.canvas.width, this.canvas.height,
        0, 0, this.canvas.width, this.canvas.height,
        gl.COLOR_BUFFER_BIT,
        gl.NEAREST
      );
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Update projection matrix
    this.updateProjectionMatrix();
    
    // Recreate MSAA buffers
    this.cleanupMSAA();
    this.setupMSAA();
  }

  destroy(): void {
    this.cleanupMSAA();
    this.candlestickRenderer.destroy();
    this.lineRenderer.destroy();
    this.barRenderer.destroy();
    this.shaderManager.destroy();
    this.bufferManager.destroy();
  }

  private parseColor(color: string): { r: number; g: number; b: number; a: number } {
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
      return { r, g, b, a };
    }
    return { r: 1, g: 1, b: 1, a: 1 };
  }
}