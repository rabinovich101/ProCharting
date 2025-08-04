import type { Renderer, RendererCapabilities, RenderScene } from '@procharting/types';
import { GPUResourceManager } from './resources';
import { createPipeline } from './pipeline';
import { CandlestickShader } from './shaders/candlestick';

export class WebGPURenderer implements Renderer {
  readonly type = 'webgpu' as const;
  readonly capabilities: RendererCapabilities;
  
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private resources!: GPUResourceManager;
  private pipelines = new Map<string, GPURenderPipeline | GPUComputePipeline>();
  private format!: GPUTextureFormat;
  private depthTexture!: GPUTexture;
  private multisampleTexture!: GPUTexture;
  private canvas!: HTMLCanvasElement;

  constructor() {
    this.capabilities = {
      maxTextureSize: 8192,
      maxVertices: 16777216,
      maxDrawCalls: 100000,
      supportsComputeShaders: true,
      supportsMultisampling: true,
      supportsInstancing: true,
      supportsFloat32Textures: true,
    };
  }

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported');
    }

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });

    if (!adapter) {
      throw new Error('No WebGPU adapter found');
    }

    this.device = await adapter.requestDevice({
      requiredFeatures: ['timestamp-query'],
      requiredLimits: {
        maxBufferSize: 1024 * 1024 * 1024, // 1GB
        maxStorageBufferBindingSize: 1024 * 1024 * 1024,
        maxComputeWorkgroupStorageSize: 32768,
        maxComputeInvocationsPerWorkgroup: 1024,
      },
    });

    const context = canvas.getContext('webgpu');
    if (!context) {
      throw new Error('Failed to get WebGPU context');
    }

    this.context = context;
    this.format = navigator.gpu.getPreferredCanvasFormat();
    
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied',
    });

    this.resources = new GPUResourceManager(this.device);
    
    // Create depth texture
    this.createDepthTexture();
    
    // Create multisample texture for MSAA
    this.createMultisampleTexture();
    
    // Initialize pipelines
    await this.initializePipelines();
  }

  private createDepthTexture(): void {
    this.depthTexture = this.device.createTexture({
      size: [this.canvas.width, this.canvas.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount: 4,
    });
  }

  private createMultisampleTexture(): void {
    this.multisampleTexture = this.device.createTexture({
      size: [this.canvas.width, this.canvas.height],
      format: this.format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      sampleCount: 4,
    });
  }

  private async initializePipelines(): Promise<void> {
    // Create candlestick pipeline
    const candlestickPipeline = await createPipeline(this.device, {
      vertex: CandlestickShader.vertex,
      fragment: CandlestickShader.fragment,
      format: this.format,
      topology: 'triangle-list',
      multisample: {
        count: 4,
      },
    });
    
    this.pipelines.set('candlestick', candlestickPipeline);
    
    // Create compute pipeline for data decimation
    const decimationModule = this.device.createShaderModule({
      code: CandlestickShader.compute,
    });
    
    const decimationPipeline = await this.device.createComputePipelineAsync({
      layout: 'auto',
      compute: {
        module: decimationModule,
        entryPoint: 'main',
      },
    });
    
    this.pipelines.set('decimation', decimationPipeline);
  }

  render(scene: RenderScene): void {
    const commandEncoder = this.device.createCommandEncoder();
    
    // Run compute passes first
    this.runComputePasses(commandEncoder, scene);
    
    // Render pass
    const textureView = this.context.getCurrentTexture().createView();
    
    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [{
        view: this.multisampleTexture.createView(),
        resolveTarget: textureView,
        clearValue: this.parseColor(scene.theme.backgroundColor),
        loadOp: 'clear',
        storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    };
    
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    
    // Render each series
    for (const series of scene.series) {
      if (!series.visible) continue;
      
      const pipeline = this.pipelines.get(series.type);
      if (pipeline && pipeline instanceof GPURenderPipeline) {
        this.renderSeries(passEncoder, pipeline, series, scene);
      }
    }
    
    passEncoder.end();
    
    this.device.queue.submit([commandEncoder.finish()]);
  }

  private runComputePasses(encoder: GPUCommandEncoder, _scene: RenderScene): void {
    const computePass = encoder.beginComputePass();
    
    // TODO: Run decimation compute shader
    
    computePass.end();
  }

  private renderSeries(
    passEncoder: GPURenderPassEncoder,
    pipeline: GPURenderPipeline,
    _series: any,
    _scene: RenderScene,
  ): void {
    passEncoder.setPipeline(pipeline);
    
    // TODO: Set bind groups and draw
    
    passEncoder.draw(6); // Placeholder
  }

  private parseColor(color: string): GPUColor {
    // Simple hex color parser
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return { r, g, b, a: 1 };
    }
    return { r: 1, g: 1, b: 1, a: 1 };
  }

  resize(_width: number, _height: number): void {
    // Recreate depth and multisample textures
    this.depthTexture.destroy();
    this.multisampleTexture.destroy();
    
    this.createDepthTexture();
    this.createMultisampleTexture();
  }

  destroy(): void {
    this.depthTexture.destroy();
    this.multisampleTexture.destroy();
    this.resources.releaseAll();
    this.pipelines.clear();
  }
}