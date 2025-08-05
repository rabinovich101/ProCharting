export type RendererType = 'webgpu' | 'webgl2' | 'canvas2d' | 'auto';

export interface RenderingHints {
  readonly antialiasing?: 'none' | 'msaa-2x' | 'msaa-4x' | 'msaa-8x' | 'msaa-16x';
  readonly powerPreference?: 'low-power' | 'high-performance' | 'default';
  readonly preserveDrawingBuffer?: boolean;
  readonly premultipliedAlpha?: boolean;
  readonly desynchronized?: boolean;
}

export interface Renderer {
  readonly type: RendererType;
  readonly capabilities: RendererCapabilities;
  
  initialize(canvas: HTMLCanvasElement): Promise<void>;
  render(scene: RenderScene): void;
  resize(width: number, height: number): void;
  destroy(): void;
}

export interface RendererCapabilities {
  readonly maxTextureSize: number;
  readonly maxVertices: number;
  readonly maxDrawCalls: number;
  readonly supportsComputeShaders: boolean;
  readonly supportsMultisampling: boolean;
  readonly supportsInstancing: boolean;
  readonly supportsFloat32Textures: boolean;
}

export interface RenderScene {
  readonly viewport: Viewport;
  readonly series: RenderableSeries[];
  readonly overlays: RenderableOverlay[];
  readonly theme: RenderTheme;
  readonly mouseState?: MouseState;
}

export interface MouseState {
  readonly position: { x: number; y: number };
  readonly dataPosition: { x: number; y: number };
  readonly showCrosshair: boolean;
  readonly isOverChart: boolean;
}

export interface Viewport {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly dataMinX: number;
  readonly dataMaxX: number;
  readonly dataMinY: number;
  readonly dataMaxY: number;
}

export interface RenderableSeries {
  readonly type: string;
  readonly data: ArrayBuffer;
  readonly style: SeriesStyle;
  readonly visible: boolean;
}

export interface RenderableOverlay {
  readonly type: 'crosshair' | 'selection' | 'annotation';
  readonly data: unknown;
  readonly style: OverlayStyle;
}

export interface SeriesStyle {
  readonly color?: string;
  readonly lineWidth?: number;
  readonly fillOpacity?: number;
  readonly strokeOpacity?: number;
}

export interface OverlayStyle {
  readonly color: string;
  readonly lineWidth: number;
  readonly lineDash?: number[];
}

export interface RenderTheme {
  readonly backgroundColor: string;
  readonly gridColor: string;
  readonly textColor: string;
  readonly fontFamily: string;
  readonly fontSize: number;
}

export interface GPUResources {
  readonly buffers: Map<string, unknown>;
  readonly textures: Map<string, unknown>;
  readonly pipelines: Map<string, unknown>;
  
  allocateBuffer(key: string, size: number, usage: number): unknown;
  releaseBuffer(key: string): void;
  releaseAll(): void;
}