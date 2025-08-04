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