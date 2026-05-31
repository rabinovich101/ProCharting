const { mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');

const distDir = join(__dirname, '..', 'dist');

mkdirSync(distDir, { recursive: true });

writeFileSync(
  join(distDir, 'index.d.ts'),
  `export type RendererType = 'webgpu' | 'webgl2' | 'canvas2d' | 'auto';

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
  readonly position: Point;
  readonly dataPosition: Point;
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

export interface DataPoint {
  readonly time: number;
  readonly value: number;
}

export interface OHLC {
  readonly time: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
}

export interface OHLCWithVolume extends OHLC {
  readonly volume: number;
}

export interface CandlestickData extends OHLCWithVolume {}

export interface BarData extends DataPoint {
  readonly color?: string;
}

export interface LineData extends DataPoint {}

export interface StreamingOptions {
  readonly mode: 'append' | 'replace';
  readonly data: AsyncIterable<DataPoint[]> | ReadableStream<ArrayBuffer>;
  readonly bufferSize?: number;
  readonly aggregation?: AggregationOptions;
}

export interface AggregationOptions {
  readonly enabled: boolean;
  readonly levels: number[];
  readonly method: 'ohlc' | 'average' | 'sum' | 'first' | 'last';
}

export type TimeRange = {
  readonly from: number;
  readonly to: number;
};

export interface DataBuffer {
  readonly capacity: number;
  readonly length: number;
  readonly data: ArrayBuffer;
  append(data: ArrayBuffer): void;
  clear(): void;
  slice(range?: TimeRange): ArrayBuffer;
}

export interface DataDecimator {
  decimate(data: ArrayBuffer, targetPoints: number): ArrayBuffer;
}

export type DataFormat = 'binary' | 'json' | 'msgpack' | 'protobuf';

export interface DataEncoder<T> {
  encode(data: T[]): ArrayBuffer;
  decode(buffer: ArrayBuffer): T[];
}

export type SeriesType = 'candlestick' | 'line' | 'bar' | 'area' | 'heikinashi' | 'renko' | 'volume';

export interface BaseSeriesOptions {
  readonly type: SeriesType;
  readonly data: unknown[];
  readonly name?: string;
  readonly visible?: boolean;
  readonly color?: string | ColorFunction;
  readonly priceScaleId?: string;
}

export interface CandlestickSeriesOptions extends BaseSeriesOptions {
  readonly type: 'candlestick';
  readonly data: CandlestickData[];
  readonly upColor?: string;
  readonly downColor?: string;
  readonly wickUpColor?: string;
  readonly wickDownColor?: string;
  readonly borderUpColor?: string;
  readonly borderDownColor?: string;
  readonly borderVisible?: boolean;
  readonly wickVisible?: boolean;
}

export interface LineSeriesOptions extends BaseSeriesOptions {
  readonly type: 'line';
  readonly data: LineData[];
  readonly lineWidth?: number;
  readonly lineStyle?: LineStyle;
  readonly lineType?: LineType;
  readonly crosshairMarkerVisible?: boolean;
  readonly crosshairMarkerRadius?: number;
}

export interface BarSeriesOptions extends BaseSeriesOptions {
  readonly type: 'bar';
  readonly data: BarData[];
  readonly upColor?: string;
  readonly downColor?: string;
  readonly openVisible?: boolean;
  readonly thinBars?: boolean;
}

export interface VolumeSeriesOptions extends BaseSeriesOptions {
  readonly type: 'volume';
  readonly data: Array<{ time: number; value: number; color?: string }>;
  readonly upColor?: string;
  readonly downColor?: string;
}

export type SeriesOptions =
  | CandlestickSeriesOptions
  | LineSeriesOptions
  | BarSeriesOptions
  | VolumeSeriesOptions;

export type LineStyle = 'solid' | 'dashed' | 'dotted';
export type LineType = 'simple' | 'curved' | 'step';
export type ColorFunction = (data: unknown, index: number) => string;

export interface CustomSeriesRenderer<T> {
  readonly gpu?: {
    readonly vertexShader: string;
    readonly fragmentShader: string;
    readonly compute?: string;
  };
  readonly cpu: {
    readonly fallbackRenderer: (ctx: CanvasRenderingContext2D, data: T[], viewport: unknown) => void;
  };
}

export interface PatternRecognitionOptions {
  readonly types: PatternType[];
  readonly confidence: number;
  readonly gpu?: boolean;
}

export type PatternType =
  | 'head-shoulders'
  | 'inverse-head-shoulders'
  | 'triangle'
  | 'wedge'
  | 'flag'
  | 'pennant'
  | 'double-top'
  | 'double-bottom'
  | 'cup-handle';

export interface Pattern {
  readonly type: PatternType;
  readonly startTime: number;
  readonly endTime: number;
  readonly confidence: number;
  readonly points: Array<{ time: number; value: number }>;
}

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
  readonly enableYAxisScale?: boolean;
  readonly zoomSpeed?: number;
  readonly panSpeed?: number;
  readonly yAxisScaleSpeed?: number;
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
  setVisibleRange(from: number, to: number): void;
  setYAxisRange(min: number, max: number): void;
  zoomIn(factor?: number): void;
  zoomOut(factor?: number): void;
  pan(offset: number): void;
  resetView(): void;
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

export interface GestureEvent {
  readonly type: GestureType;
  readonly touches: Touch[];
  readonly center: Point;
  readonly scale?: number;
  readonly rotation?: number;
  readonly velocity?: Vector;
  readonly pressure?: number;
}

export type GestureType =
  | 'tap'
  | 'double-tap'
  | 'long-press'
  | 'pan'
  | 'pinch'
  | 'rotate'
  | 'swipe'
  | 'two-finger-rotate';

export interface Touch {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly pressure?: number;
  readonly radiusX?: number;
  readonly radiusY?: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Vector {
  readonly x: number;
  readonly y: number;
}

export interface KeyboardShortcut {
  readonly key: string;
  readonly ctrl?: boolean;
  readonly alt?: boolean;
  readonly shift?: boolean;
  readonly meta?: boolean;
  readonly action: () => void;
}

export interface MouseEvent {
  readonly x: number;
  readonly y: number;
  readonly button: number;
  readonly buttons: number;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
}

export interface WheelEvent extends MouseEvent {
  readonly deltaX: number;
  readonly deltaY: number;
  readonly deltaZ: number;
  readonly deltaMode: number;
}

export interface PerformanceMetrics {
  readonly fps: number;
  readonly frameTime: number;
  readonly renderTime: number;
  readonly updateTime: number;
  readonly memoryUsage: MemoryUsage;
  readonly gpuMetrics?: GPUMetrics;
}

export interface MemoryUsage {
  readonly jsHeapUsed: number;
  readonly jsHeapTotal: number;
  readonly gpuMemoryUsed?: number;
  readonly dataPointCount: number;
  readonly bytesPerDataPoint: number;
}

export interface GPUMetrics {
  readonly commandsPerFrame: number;
  readonly drawCallsPerFrame: number;
  readonly trianglesPerFrame: number;
  readonly textureMemory: number;
  readonly bufferMemory: number;
}

export interface PerformanceMonitor {
  start(): void;
  stop(): void;
  reset(): void;
  getMetrics(): PerformanceMetrics;
  onFrame(callback: (metrics: PerformanceMetrics) => void): void;
}

export interface PerformanceBenchmark {
  readonly name: string;
  readonly description: string;
  setup(): Promise<void>;
  run(): Promise<BenchmarkResult>;
  teardown(): Promise<void>;
}

export interface BenchmarkResult {
  readonly name: string;
  readonly duration: number;
  readonly operations: number;
  readonly opsPerSecond: number;
  readonly metrics: Record<string, number>;
}

export interface PerformanceTarget {
  readonly minFPS: number;
  readonly maxFrameTime: number;
  readonly maxMemoryPerPoint: number;
  readonly maxInitTime: number;
  readonly maxUpdateLatency: number;
}

export declare function createChart(container: HTMLElement | string, options?: ChartOptions): Chart;

export declare class RendererFactory {
  static create(type: RendererType): Renderer;
}
`,
);
