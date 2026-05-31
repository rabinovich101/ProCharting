import type { RenderScene, RenderableSeries, Renderer, RendererType, Viewport } from '@procharting/types';
import { Platform } from '@procharting/utils';

type NumericRecord = Record<string, unknown>;

type PlotArea = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type CanvasSeriesStyle = {
  color?: string;
  lineWidth?: number;
  fillOpacity?: number;
  strokeOpacity?: number;
  upColor?: string;
  downColor?: string;
  wickUpColor?: string;
  wickDownColor?: string;
};

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
            const nextRenderer = new WebGPURenderer();
            await nextRenderer.initialize(canvas);
            renderer = nextRenderer;
          })();
        }
        await initPromise;
      },
      
      render(scene): void {
        if (!renderer) {
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
            const nextRenderer = new WebGL2Renderer();
            await nextRenderer.initialize(canvas);
            renderer = nextRenderer;
          })();
        }
        await initPromise;
      },
      
      render(scene): void {
        if (!renderer) {
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
    let canvas: HTMLCanvasElement | null = null;
    let context: CanvasRenderingContext2D | null = null;

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
      
      initialize(nextCanvas: HTMLCanvasElement): Promise<void> {
        const ctx = nextCanvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get 2D context');
        }
        canvas = nextCanvas;
        context = ctx;
        return Promise.resolve();
      },
      
      render(scene): void {
        if (!canvas || !context) {
          return;
        }

        renderCanvasScene(context, canvas, scene);
      },
      
      resize(_width: number, _height: number): void {
        // Canvas2D doesn't need special resize handling
      },
      
      destroy(): void {
        // Canvas2D doesn't need cleanup
      },
    };
  }
}

function renderCanvasScene(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, scene: RenderScene): void {
  const width = canvas.width;
  const height = canvas.height;
  const plot = createPlotArea(width, height);

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = scene.theme.backgroundColor;
  ctx.fillRect(0, 0, width, height);

  drawGrid(ctx, scene, plot);

  for (const series of scene.series) {
    if (!series.visible) {
      continue;
    }

    switch (series.type) {
      case 'candlestick':
        drawCandlestickSeries(ctx, series, scene.viewport, plot);
        break;
      case 'line':
        drawLineSeries(ctx, series, scene.viewport, plot, false);
        break;
      case 'area':
        drawLineSeries(ctx, series, scene.viewport, plot, true);
        break;
      case 'bar':
      case 'volume':
        drawBarSeries(ctx, series, scene.viewport, plot);
        break;
    }
  }

  drawCrosshair(ctx, scene, plot);
  ctx.restore();
}

function createPlotArea(width: number, height: number): PlotArea {
  const axisWidth = Math.min(84, Math.max(58, width * 0.12));
  const timeAxisHeight = Math.min(34, Math.max(24, height * 0.05));

  return {
    left: 0,
    top: 0,
    right: width - axisWidth,
    bottom: height - timeAxisHeight,
    width: width - axisWidth,
    height: height - timeAxisHeight,
  };
}

function drawGrid(ctx: CanvasRenderingContext2D, scene: RenderScene, plot: PlotArea): void {
  const xSteps = 5;
  const ySteps = 5;

  ctx.save();
  ctx.strokeStyle = scene.theme.gridColor;
  ctx.lineWidth = 1;
  ctx.font = `${Math.max(11, scene.theme.fontSize)}px ${scene.theme.fontFamily}`;
  ctx.fillStyle = scene.theme.textColor;
  ctx.textBaseline = 'middle';

  for (let i = 0; i <= ySteps; i++) {
    const ratio = i / ySteps;
    const y = plot.top + ratio * plot.height;
    const value = scene.viewport.dataMaxY - ratio * (scene.viewport.dataMaxY - scene.viewport.dataMinY);

    ctx.globalAlpha = i === 0 || i === ySteps ? 0.45 : 0.28;
    ctx.beginPath();
    ctx.moveTo(plot.left, y);
    ctx.lineTo(plot.right, y);
    ctx.stroke();

    ctx.globalAlpha = 0.85;
    ctx.fillText(formatPrice(value), plot.right + 8, y);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= xSteps; i++) {
    const ratio = i / xSteps;
    const x = plot.left + ratio * plot.width;
    const time = scene.viewport.dataMinX + ratio * (scene.viewport.dataMaxX - scene.viewport.dataMinX);

    ctx.globalAlpha = i === 0 || i === xSteps ? 0.45 : 0.24;
    ctx.beginPath();
    ctx.moveTo(x, plot.top);
    ctx.lineTo(x, plot.bottom);
    ctx.stroke();

    if (i > 0 && i < xSteps) {
      ctx.globalAlpha = 0.85;
      ctx.fillText(formatTime(time), x, plot.bottom + 8);
    }
  }

  ctx.globalAlpha = 1;
  ctx.strokeStyle = scene.theme.textColor;
  ctx.globalAlpha = 0.24;
  ctx.beginPath();
  ctx.moveTo(plot.right, plot.top);
  ctx.lineTo(plot.right, plot.bottom);
  ctx.lineTo(plot.left, plot.bottom);
  ctx.stroke();
  ctx.restore();
}

function drawCandlestickSeries(
  ctx: CanvasRenderingContext2D,
  series: RenderableSeries,
  viewport: Viewport,
  plot: PlotArea,
): void {
  const points = getVisibleRecords(series, viewport);
  if (points.length === 0) {
    return;
  }

  const style = series.style as CanvasSeriesStyle;
  const candleWidth = Math.max(2, Math.min(18, (plot.width / points.length) * 0.65));
  const upColor = style.upColor ?? '#26a69a';
  const downColor = style.downColor ?? '#ef5350';
  const wickUpColor = style.wickUpColor ?? upColor;
  const wickDownColor = style.wickDownColor ?? downColor;

  ctx.save();
  ctx.lineWidth = Math.max(1, Math.floor(candleWidth * 0.12));

  for (const point of points) {
    const time = readNumber(point, 'time');
    const open = readNumber(point, 'open');
    const high = readNumber(point, 'high');
    const low = readNumber(point, 'low');
    const close = readNumber(point, 'close');

    if (time === null || open === null || high === null || low === null || close === null) {
      continue;
    }

    const x = toCanvasX(time, viewport, plot);
    const openY = toCanvasY(open, viewport, plot);
    const closeY = toCanvasY(close, viewport, plot);
    const highY = toCanvasY(high, viewport, plot);
    const lowY = toCanvasY(low, viewport, plot);
    const isUp = close >= open;

    ctx.strokeStyle = isUp ? wickUpColor : wickDownColor;
    ctx.beginPath();
    ctx.moveTo(x, highY);
    ctx.lineTo(x, lowY);
    ctx.stroke();

    ctx.fillStyle = isUp ? upColor : downColor;
    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.max(1, Math.abs(closeY - openY));
    ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
  }

  ctx.restore();
}

function drawLineSeries(
  ctx: CanvasRenderingContext2D,
  series: RenderableSeries,
  viewport: Viewport,
  plot: PlotArea,
  fillArea: boolean,
): void {
  const points = getVisibleRecords(series, viewport)
    .map((point) => {
      const time = readNumber(point, 'time');
      const value = readNumber(point, 'value') ?? readNumber(point, 'close');
      return time === null || value === null ? null : { time, value };
    })
    .filter((point): point is { time: number; value: number } => point !== null);

  if (points.length < 2) {
    return;
  }

  const style = series.style as CanvasSeriesStyle;
  const color = style.color ?? '#2563eb';
  const lineWidth = style.lineWidth ?? 2;

  ctx.save();
  ctx.beginPath();
  points.forEach((point, index) => {
    const x = toCanvasX(point.time, viewport, plot);
    const y = toCanvasY(point.value, viewport, plot);

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  if (fillArea) {
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];

    if (firstPoint && lastPoint) {
      ctx.lineTo(toCanvasX(lastPoint.time, viewport, plot), plot.bottom);
      ctx.lineTo(toCanvasX(firstPoint.time, viewport, plot), plot.bottom);
      ctx.closePath();
      ctx.fillStyle = hexToRgba(color, style.fillOpacity ?? 0.18);
      ctx.fill();
    }
  }

  ctx.beginPath();
  points.forEach((point, index) => {
    const x = toCanvasX(point.time, viewport, plot);
    const y = toCanvasY(point.value, viewport, plot);

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.globalAlpha = style.strokeOpacity ?? 1;
  ctx.stroke();
  ctx.restore();
}

function drawBarSeries(
  ctx: CanvasRenderingContext2D,
  series: RenderableSeries,
  viewport: Viewport,
  plot: PlotArea,
): void {
  const points = getVisibleRecords(series, viewport)
    .map((point) => {
      const time = readNumber(point, 'time');
      const value = readNumber(point, 'value') ?? readNumber(point, 'close');
      return time === null || value === null ? null : { time, value };
    })
    .filter((point): point is { time: number; value: number } => point !== null);

  if (points.length === 0) {
    return;
  }

  const style = series.style as CanvasSeriesStyle;
  const color = style.color ?? '#64748b';
  const barWidth = Math.max(1, Math.min(12, (plot.width / points.length) * 0.55));
  const baseline = viewport.dataMinY <= 0 && viewport.dataMaxY >= 0 ? 0 : viewport.dataMinY;
  const baselineY = toCanvasY(baseline, viewport, plot);

  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = style.fillOpacity ?? 0.75;

  for (const point of points) {
    const x = toCanvasX(point.time, viewport, plot);
    const y = toCanvasY(point.value, viewport, plot);
    const top = Math.min(y, baselineY);
    const height = Math.max(1, Math.abs(baselineY - y));

    ctx.fillRect(x - barWidth / 2, top, barWidth, height);
  }

  ctx.restore();
}

function drawCrosshair(ctx: CanvasRenderingContext2D, scene: RenderScene, plot: PlotArea): void {
  const crosshair = scene.overlays.find((overlay) => overlay.type === 'crosshair');
  if (!crosshair) {
    return;
  }

  const data = crosshair.data;
  if (typeof data !== 'object' || data === null) {
    return;
  }

  const x = readNumber(data, 'x');
  const y = readNumber(data, 'y');
  if (x === null || y === null || x < plot.left || x > plot.right || y < plot.top || y > plot.bottom) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = crosshair.style.color;
  ctx.lineWidth = crosshair.style.lineWidth;
  ctx.setLineDash(crosshair.style.lineDash ?? []);
  ctx.beginPath();
  ctx.moveTo(x, plot.top);
  ctx.lineTo(x, plot.bottom);
  ctx.moveTo(plot.left, y);
  ctx.lineTo(plot.right, y);
  ctx.stroke();
  ctx.restore();
}

function getVisibleRecords(series: RenderableSeries, viewport: Viewport): NumericRecord[] {
  return (series.sourceData ?? [])
    .filter(isNumericRecord)
    .filter((point) => {
      const time = readNumber(point, 'time');
      return time !== null && time >= viewport.dataMinX && time <= viewport.dataMaxX;
    });
}

function isNumericRecord(value: unknown): value is NumericRecord {
  return typeof value === 'object' && value !== null;
}

function readNumber(point: unknown, field: string): number | null {
  if (!isNumericRecord(point)) {
    return null;
  }

  const value = point[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toCanvasX(time: number, viewport: Viewport, plot: PlotArea): number {
  const range = viewport.dataMaxX - viewport.dataMinX || 1;
  return plot.left + ((time - viewport.dataMinX) / range) * plot.width;
}

function toCanvasY(value: number, viewport: Viewport, plot: PlotArea): number {
  const range = viewport.dataMaxY - viewport.dataMinY || 1;
  return plot.top + ((viewport.dataMaxY - value) / range) * plot.height;
}

function formatPrice(value: number): string {
  if (Math.abs(value) >= 1000) {
    return value.toFixed(0);
  }
  if (Math.abs(value) >= 10) {
    return value.toFixed(2);
  }
  return value.toFixed(4);
}

function formatTime(seconds: number): string {
  const date = new Date(seconds * 1000);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function hexToRgba(color: string, alpha: number): string {
  if (!color.startsWith('#') || (color.length !== 7 && color.length !== 4)) {
    return color;
  }

  if (color.length === 4) {
    const r = color[1];
    const g = color[2];
    const b = color[3];
    return `rgba(${parseHexPair(r, r)}, ${parseHexPair(g, g)}, ${parseHexPair(b, b)}, ${alpha})`;
  }

  return `rgba(${parseHexPair(color[1], color[2])}, ${parseHexPair(color[3], color[4])}, ${parseHexPair(color[5], color[6])}, ${alpha})`;
}

function parseHexPair(high: string | undefined, low: string | undefined): number {
  return parseInt(`${high ?? '0'}${low ?? '0'}`, 16);
}
