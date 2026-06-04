/// <reference lib="webworker" />

import type { WorkerMessage, WorkerResponse } from '@procharting/utils';

declare const self: DedicatedWorkerGlobalScope;

type WorkerGPUAdapter = {
  requestDevice(): Promise<unknown>;
};

type WorkerGPU = {
  requestAdapter(): Promise<WorkerGPUAdapter | null>;
  getPreferredCanvasFormat(): string;
};

type WorkerNavigator = Navigator & {
  gpu?: WorkerGPU;
};

type WorkerGPUCanvasContext = {
  configure(options: {
    device: unknown;
    format: string;
    alphaMode: 'premultiplied';
  }): void;
};

type RendererKind = 'webgpu' | 'webgl2';

type InitData = {
  rendererType: RendererKind;
};

type RenderData = {
  scene: unknown;
};

type ResizeData = {
  width: number;
  height: number;
};

// OffscreenCanvas for rendering
let offscreenCanvas: OffscreenCanvas | null = null;
let renderContext: WorkerGPUCanvasContext | WebGL2RenderingContext | null = null;
let renderer: RendererKind | null = null;

self.addEventListener('message', (event: MessageEvent<WorkerMessage<unknown>>) => {
  void handleWorkerMessage(event);
});

async function handleWorkerMessage(event: MessageEvent<WorkerMessage<unknown>>): Promise<void> {
  const { id, type, data, transfer } = event.data;
  
  try {
    let result: unknown;
    
    switch (type) {
      case 'init':
        result = await handleInit(data, transfer);
        break;
      case 'render':
        result = handleRender(data);
        break;
      case 'resize':
        result = handleResize(data);
        break;
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
    const response: WorkerResponse = {
      id,
      type: 'success',
      data: result,
    };
    
    self.postMessage(response);
  } catch (error) {
    const response: WorkerResponse = {
      id,
      type: 'error',
      data: null,
      error: error as Error,
    };
    
    self.postMessage(response);
  }
}

async function handleInit(data: unknown, transfer?: Transferable[]): Promise<void> {
  const { rendererType } = readInitData(data);
  
  const canvas = transfer?.[0];
  if (!(canvas instanceof OffscreenCanvas)) {
    throw new Error('No canvas transferred');
  }
  
  offscreenCanvas = canvas;
  renderer = rendererType;
  
  if (renderer === 'webgpu') {
    await initWebGPU();
  } else if (renderer === 'webgl2') {
    initWebGL2();
  }
}

async function initWebGPU(): Promise<void> {
  const gpu = (navigator as WorkerNavigator).gpu;
  if (!gpu) {
    throw new Error('WebGPU not supported in worker');
  }
  
  const adapter = await gpu.requestAdapter();
  if (!adapter) {
    throw new Error('No WebGPU adapter found');
  }
  
  const device = await adapter.requestDevice();
  
  const context = getOffscreenCanvas().getContext('webgpu') as WorkerGPUCanvasContext | null;
  if (!context) {
    throw new Error('Failed to get WebGPU context');
  }
  
  const format = gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
    alphaMode: 'premultiplied',
  });
  
  renderContext = context;
}

function initWebGL2(): void {
  const gl = getOffscreenCanvas().getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: true,
    stencil: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
    premultipliedAlpha: true,
    desynchronized: true,
  });
  
  if (!gl) {
    throw new Error('Failed to get WebGL2 context');
  }
  
  renderContext = gl;
}

function handleRender(data: unknown): void {
  if (!renderContext || !offscreenCanvas) {
    throw new Error('Renderer not initialized');
  }
  
  const { scene } = readRenderData(data);
  
  if (renderer === 'webgpu') {
    renderWebGPU(scene);
  } else if (renderer === 'webgl2') {
    renderWebGL2(scene);
  }
}

function renderWebGPU(_scene: unknown): void {
  // TODO: Implement WebGPU rendering in worker
  // This would require porting the WebGPU renderer to work with OffscreenCanvas
}

function renderWebGL2(_scene: unknown): void {
  const gl = renderContext as WebGL2RenderingContext;
  
  // Clear
  gl.clearColor(0.1, 0.1, 0.1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  // TODO: Implement WebGL2 rendering in worker
  // This would require porting the WebGL2 renderer to work with OffscreenCanvas
}

function handleResize(data: unknown): void {
  const { width, height } = readResizeData(data);
  
  if (offscreenCanvas) {
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
  }
}

function getOffscreenCanvas(): OffscreenCanvas {
  if (!offscreenCanvas) {
    throw new Error('Renderer canvas not initialized');
  }
  return offscreenCanvas;
}

function readInitData(data: unknown): InitData {
  const record = readRecord(data);
  const rendererType = record['rendererType'];
  if (rendererType !== 'webgpu' && rendererType !== 'webgl2') {
    throw new Error('Worker rendererType must be webgpu or webgl2');
  }

  return { rendererType };
}

function readRenderData(data: unknown): RenderData {
  const record = readRecord(data);
  return { scene: record['scene'] };
}

function readResizeData(data: unknown): ResizeData {
  const record = readRecord(data);
  return {
    width: readNumber(record, 'width'),
    height: readNumber(record, 'height'),
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Worker payload must be an object');
  }
  return value as Record<string, unknown>;
}

function readNumber(record: Record<string, unknown>, field: string): number {
  const value = record[field];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Worker payload ${field} must be a finite number`);
  }
  return value;
}
