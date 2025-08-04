/// <reference lib="webworker" />

import type { WorkerMessage, WorkerResponse } from '@procharting/utils';

declare const self: DedicatedWorkerGlobalScope;

// OffscreenCanvas for rendering
let offscreenCanvas: OffscreenCanvas | null = null;
let renderContext: GPUCanvasContext | WebGL2RenderingContext | null = null;
let renderer: 'webgpu' | 'webgl2' | null = null;

self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
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
});

async function handleInit(data: any, transfer?: Transferable[]): Promise<void> {
  const { canvas, rendererType } = data;
  
  if (!transfer || !transfer[0]) {
    throw new Error('No canvas transferred');
  }
  
  offscreenCanvas = transfer[0] as OffscreenCanvas;
  renderer = rendererType;
  
  if (renderer === 'webgpu') {
    await initWebGPU();
  } else if (renderer === 'webgl2') {
    initWebGL2();
  }
}

async function initWebGPU(): Promise<void> {
  if (!navigator.gpu) {
    throw new Error('WebGPU not supported in worker');
  }
  
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error('No WebGPU adapter found');
  }
  
  const device = await adapter.requestDevice();
  
  const context = offscreenCanvas!.getContext('webgpu');
  if (!context) {
    throw new Error('Failed to get WebGPU context');
  }
  
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
    alphaMode: 'premultiplied',
  });
  
  renderContext = context;
}

function initWebGL2(): void {
  const gl = offscreenCanvas!.getContext('webgl2', {
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

function handleRender(data: any): void {
  if (!renderContext || !offscreenCanvas) {
    throw new Error('Renderer not initialized');
  }
  
  const { scene } = data;
  
  if (renderer === 'webgpu') {
    renderWebGPU(scene);
  } else if (renderer === 'webgl2') {
    renderWebGL2(scene);
  }
}

function renderWebGPU(scene: any): void {
  const context = renderContext as GPUCanvasContext;
  
  // TODO: Implement WebGPU rendering in worker
  // This would require porting the WebGPU renderer to work with OffscreenCanvas
}

function renderWebGL2(scene: any): void {
  const gl = renderContext as WebGL2RenderingContext;
  
  // Clear
  gl.clearColor(0.1, 0.1, 0.1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  // TODO: Implement WebGL2 rendering in worker
  // This would require porting the WebGL2 renderer to work with OffscreenCanvas
}

function handleResize(data: any): void {
  const { width, height } = data;
  
  if (offscreenCanvas) {
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
  }
}