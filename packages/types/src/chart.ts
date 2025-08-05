import type { RendererType, RenderingHints } from './renderer';
import type { SeriesOptions } from './series';
import type { StreamingOptions } from './data';

export interface ChartOptions {
  readonly renderer?: RendererType;
  readonly renderingHints?: RenderingHints;
  readonly width?: number;
  readonly height?: number;
  readonly pixelRatio?: number;
  readonly theme?: 'light' | 'dark' | ChartTheme;
  readonly performance?: PerformanceOptions;
  readonly interactions?: InteractionOptions;
}

export interface InteractionOptions {
  readonly enableZoom?: boolean;
  readonly enablePan?: boolean;
  readonly enableCrosshair?: boolean;
  readonly zoomSpeed?: number;
  readonly panSpeed?: number;
  readonly snapToCandle?: boolean;
}

export interface PerformanceOptions {
  readonly workers?: number | 'auto';
  readonly gpuPowerPreference?: 'low-power' | 'high-performance' | 'default';
  readonly targetFPS?: number;
  readonly memoryLimit?: number;
}

export interface ChartTheme {
  readonly background: string;
  readonly text: string;
  readonly grid: string;
  readonly crosshair: string;
  readonly selection: string;
  readonly positive: string;
  readonly negative: string;
}

export interface Chart {
  readonly container: HTMLElement;
  readonly renderer: RendererType;
  
  resize(width: number, height: number): void;
  destroy(): void;
  
  addSeries<T extends SeriesOptions>(options: T): Series<T>;
  removeSeries(series: Series<SeriesOptions>): void;
  
  streamData(options: StreamingOptions): void;
  connect(options: ConnectionOptions): void;
  
  // Zoom and pan controls
  setVisibleRange(from: number, to: number): void;
  zoomIn(factor?: number): void;
  zoomOut(factor?: number): void;
  pan(offset: number): void;
  resetView(): void;
  
  // Update interaction settings
  updateInteractions(options: Partial<InteractionOptions>): void;
  
  on<K extends keyof ChartEventMap>(event: K, handler: ChartEventMap[K]): void;
  off<K extends keyof ChartEventMap>(event: K, handler: ChartEventMap[K]): void;
}

export interface Series<T extends SeriesOptions> {
  readonly type: T['type'];
  readonly id: string;
  
  setData(data: T['data']): void;
  update(options: Partial<T>): void;
  remove(): void;
  
  // Real-time update methods
  appendData(data: T['data'][0]): void;
  updateLast(data: Partial<T['data'][0]>): void;
}

export interface ConnectionOptions {
  readonly url: string;
  readonly protocol?: 'binary' | 'json';
  readonly compression?: 'none' | 'gzip' | 'zstd';
  readonly reconnect?: ReconnectOptions;
}

export interface ReconnectOptions {
  readonly attempts?: number;
  readonly delay?: number;
  readonly backoff?: 'linear' | 'exponential';
  readonly maxDelay?: number;
}

export interface ChartEventMap {
  click: (event: ChartClickEvent) => void;
  hover: (event: ChartHoverEvent) => void;
  zoom: (event: ChartZoomEvent) => void;
  pan: (event: ChartPanEvent) => void;
  resize: (event: ChartResizeEvent) => void;
}

export interface ChartClickEvent {
  readonly x: number;
  readonly y: number;
  readonly dataX: number;
  readonly dataY: number;
  readonly series?: Series<SeriesOptions>;
}

export interface ChartHoverEvent extends ChartClickEvent {}

export interface ChartZoomEvent {
  readonly level: number;
  readonly centerX: number;
  readonly centerY: number;
}

export interface ChartPanEvent {
  readonly deltaX: number;
  readonly deltaY: number;
}

export interface ChartResizeEvent {
  readonly width: number;
  readonly height: number;
}