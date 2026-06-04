import type { RenderScene, RenderableSeries, Renderer, RendererType, Viewport } from '@procharting/types';
import { Platform } from '@procharting/utils';
import { getBottomControlRects, resolveGridOptions } from './grid-layout';

type NumericRecord = Record<string, unknown>;

type PlotArea = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  axisWidth: number;
  timeAxisHeight: number;
  dpr: number;
  cssWidth: number;
  cssHeight: number;
  horizontalGridLineSpacing: number;
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

const VOLUME_HEIGHT_SHARE = 0.16;
const MIN_VOLUME_HEIGHT_PX = 60;
const MAX_VOLUME_HEIGHT_PX = 132;
const TRADING_VIEW_BULL = '#089981';
const TRADING_VIEW_BEAR = '#f23645';
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const TIME_INTERVALS_MS = [
  MINUTE_MS,
  5 * MINUTE_MS,
  15 * MINUTE_MS,
  30 * MINUTE_MS,
  HOUR_MS,
  2 * HOUR_MS,
  4 * HOUR_MS,
  8 * HOUR_MS,
  12 * HOUR_MS,
  DAY_MS,
  WEEK_MS,
  MONTH_MS,
  3 * MONTH_MS,
  6 * MONTH_MS,
  12 * MONTH_MS,
];

export const RendererFactory = {
  create(type: RendererType): Renderer {
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
  },

  detectBestRenderer(): RendererType {
    return 'canvas2d';
  },

  createWebGPUWrapper(): Renderer {
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
  },

  createWebGL2Renderer(): Renderer {
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
  },

  createCanvas2DRenderer(): Renderer {
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
  },
};

function renderCanvasScene(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, scene: RenderScene): void {
  const width = canvas.width;
  const height = canvas.height;
  const dpr = getCanvasPixelRatio(canvas);
  const plot = createPlotArea(width, height, dpr, scene);

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

  drawCurrentPrice(ctx, scene, plot);
  drawPaneLegend(ctx, scene, plot);
  drawCrosshair(ctx, scene, plot);
  drawBottomControls(ctx, scene, plot);
  ctx.restore();
}

function getCanvasPixelRatio(canvas: HTMLCanvasElement): number {
  const cssWidth = canvas.clientWidth || canvas.width;
  if (cssWidth <= 0) {
    return 1;
  }

  return Math.max(1, canvas.width / cssWidth);
}

function createPlotArea(width: number, height: number, dpr: number, scene: RenderScene): PlotArea {
  const grid = resolveGridOptions(scene.grid);
  const targetAxisWidth = grid.priceScaleWidth * dpr;
  const minAxisWidth = grid.minPriceScaleWidth * dpr;
  const targetTimeAxisHeight = grid.timeScaleHeight * dpr;
  const minPlotWidth = grid.minPlotWidth * dpr;
  const minPlotHeight = grid.minPlotHeight * dpr;
  const preferredAxisWidth = width / dpr < 480 ? minAxisWidth : targetAxisWidth;
  const axisWidth = width >= preferredAxisWidth + minPlotWidth
    ? preferredAxisWidth
    : Math.min(width, Math.max(minAxisWidth, Math.min(preferredAxisWidth, width * 0.32)));
  const timeAxisHeight = height >= targetTimeAxisHeight + minPlotHeight
    ? targetTimeAxisHeight
    : Math.max(22 * dpr, Math.min(targetTimeAxisHeight, height * 0.12));
  const plotWidth = Math.max(0, width - axisWidth);
  const plotHeight = Math.max(0, height - timeAxisHeight);

  return {
    left: 0,
    top: 0,
    right: plotWidth,
    bottom: plotHeight,
    width: plotWidth,
    height: plotHeight,
    axisWidth,
    timeAxisHeight,
    dpr,
    cssWidth: width / dpr,
    cssHeight: height / dpr,
    horizontalGridLineSpacing: grid.horizontalGridLineSpacing,
  };
}

function getPriceTickTarget(plot: PlotArea): number {
  const targetSpacing = plot.horizontalGridLineSpacing * plot.dpr;
  return Math.round(clamp(plot.height / Math.max(1, targetSpacing) + 2, 4, 40));
}

function getTimeTickTarget(plot: PlotArea): number {
  if (plot.cssWidth < 480) {
    return 3;
  }
  if (plot.cssWidth < 1024) {
    return 6;
  }

  return 8;
}

function createPriceTicks(min: number, max: number, targetCount: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [];
  }
  if (min === max) {
    return [min];
  }

  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const step = calculateNiceStep((high - low) / Math.max(1, targetCount - 1));
  const ticks: number[] = [];
  const start = Math.ceil(low / step) * step;

  for (let value = start; value <= high + step * 0.5 && ticks.length < targetCount * 2; value += step) {
    ticks.push(roundTick(value, step));
  }

  return ticks;
}

function createTimeTicks(min: number, max: number, targetCount: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [];
  }
  if (min === max) {
    return [min];
  }

  const low = Math.min(min, max);
  const high = Math.max(min, max);
  const timeScale = getTimeScale(low, high);
  const lowMs = low * timeScale;
  const highMs = high * timeScale;
  const stepMs = chooseTimeInterval((highMs - lowMs) / Math.max(1, targetCount - 1));
  const ticks: number[] = [];
  const startMs = Math.ceil(lowMs / stepMs) * stepMs;

  for (let valueMs = startMs; valueMs <= highMs + stepMs * 0.5 && ticks.length < targetCount * 2; valueMs += stepMs) {
    ticks.push(valueMs / timeScale);
  }

  return ticks;
}

function calculateNiceStep(rawStep: number): number {
  if (!Number.isFinite(rawStep) || rawStep <= 0) {
    return 1;
  }

  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;

  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 2.5) return 2.5 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function chooseTimeInterval(targetMs: number): number {
  if (!Number.isFinite(targetMs) || targetMs <= 0) {
    return MINUTE_MS;
  }

  return TIME_INTERVALS_MS.find((interval) => interval >= targetMs) ?? 12 * MONTH_MS;
}

function roundTick(value: number, step: number): number {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)) + 2);
  return Number(value.toFixed(decimals));
}

function drawGrid(ctx: CanvasRenderingContext2D, scene: RenderScene, plot: PlotArea): void {
  const fontSize = Math.max(11 * plot.dpr, scene.theme.fontSize * plot.dpr);
  const priceTicks = createPriceTicks(
    scene.viewport.dataMinY,
    scene.viewport.dataMaxY,
    getPriceTickTarget(plot),
  );
  const timeTicks = createTimeTicks(
    scene.viewport.dataMinX,
    scene.viewport.dataMaxX,
    getTimeTickTarget(plot),
  );
  const timeRangeMs = getTimeRangeMs(scene.viewport.dataMinX, scene.viewport.dataMaxX);
  const labelPadding = 10 * plot.dpr;
  const timeLabelY = plot.bottom + 8 * plot.dpr;
  const axisLineWidth = Math.max(1, plot.dpr);

  ctx.save();
  ctx.strokeStyle = scene.theme.gridColor;
  ctx.lineWidth = axisLineWidth;
  ctx.font = `${fontSize}px ${scene.theme.fontFamily}`;
  ctx.fillStyle = scene.theme.textColor;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  for (const value of priceTicks) {
    const y = toCanvasY(value, scene.viewport, plot);
    if (y < plot.top || y > plot.bottom) {
      continue;
    }

    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(plot.left, alignStroke(y));
    ctx.lineTo(plot.right, alignStroke(y));
    ctx.stroke();

    if (y >= plot.top + fontSize / 2 && y <= plot.bottom - fontSize / 2) {
      ctx.globalAlpha = 0.86;
      ctx.fillText(formatPrice(value), plot.right + labelPadding, y);
    }
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  let lastTimeLabelRight = -Infinity;
  for (const time of timeTicks) {
    const x = toCanvasX(time, scene.viewport, plot);
    if (x < plot.left || x > plot.right) {
      continue;
    }

    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(alignStroke(x), plot.top);
    ctx.lineTo(alignStroke(x), plot.bottom);
    ctx.stroke();

    const label = formatTime(time, timeRangeMs);
    const labelWidth = ctx.measureText(label).width;
    const labelLeft = x - labelWidth / 2;
    const labelRight = x + labelWidth / 2;
    if (
      labelLeft >= plot.left + 2 * plot.dpr &&
      labelRight <= plot.right - 2 * plot.dpr &&
      labelLeft > lastTimeLabelRight + 12 * plot.dpr
    ) {
      ctx.globalAlpha = 0.85;
      ctx.fillText(label, x, timeLabelY);
      lastTimeLabelRight = labelRight;
    }
  }

  ctx.globalAlpha = 1;
  ctx.strokeStyle = scene.theme.gridColor;
  ctx.beginPath();
  ctx.moveTo(alignStroke(plot.right), plot.top);
  ctx.lineTo(alignStroke(plot.right), plot.bottom + plot.timeAxisHeight);
  ctx.moveTo(plot.left, alignStroke(plot.bottom));
  ctx.lineTo(plot.right + plot.axisWidth, alignStroke(plot.bottom));
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
  const candleWidth = getSeriesBarWidth(plot, points, viewport, 0.65, 1, 12);
  const upColor = style.upColor ?? TRADING_VIEW_BULL;
  const downColor = style.downColor ?? TRADING_VIEW_BEAR;
  const wickUpColor = style.wickUpColor ?? upColor;
  const wickDownColor = style.wickDownColor ?? downColor;

  ctx.save();
  clipToPlot(ctx, plot);
  drawVolumeOverlay(ctx, points, viewport, plot, upColor, downColor);
  ctx.lineWidth = Math.max(plot.dpr, Math.floor(candleWidth * 0.12));

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
  const lineWidth = (style.lineWidth ?? 2) * plot.dpr;

  ctx.save();
  clipToPlot(ctx, plot);
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
  const barWidth = getSeriesBarWidth(plot, points, viewport, 0.55, 1, 12);
  const baseline = viewport.dataMinY <= 0 && viewport.dataMaxY >= 0 ? 0 : viewport.dataMinY;
  const baselineY = toCanvasY(baseline, viewport, plot);

  ctx.save();
  clipToPlot(ctx, plot);
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

function drawVolumeOverlay(
  ctx: CanvasRenderingContext2D,
  points: NumericRecord[],
  viewport: Viewport,
  plot: PlotArea,
  upColor: string,
  downColor: string,
): void {
  const volumePoints = points
    .map((point) => {
      const time = readNumber(point, 'time');
      const volume = readNumber(point, 'volume');
      const open = readNumber(point, 'open');
      const close = readNumber(point, 'close');
      return time === null || volume === null || volume <= 0
        ? null
        : { time, volume, isUp: close === null || open === null || close >= open };
    })
    .filter((point): point is { time: number; volume: number; isUp: boolean } => point !== null);

  if (volumePoints.length === 0) {
    return;
  }

  const maxVolume = Math.max(...volumePoints.map((point) => point.volume));
  if (!Number.isFinite(maxVolume) || maxVolume <= 0) {
    return;
  }

  const minVolumeHeight = MIN_VOLUME_HEIGHT_PX * plot.dpr;
  const maxVolumeHeight = MAX_VOLUME_HEIGHT_PX * plot.dpr;
  const volumeHeight = Math.min(
    Math.max(plot.height * VOLUME_HEIGHT_SHARE, minVolumeHeight),
    Math.min(maxVolumeHeight, plot.height * 0.34),
  );
  const barWidth = getSeriesBarWidth(plot, points, viewport, 0.65, 1, 12);

  for (const point of volumePoints) {
    const x = toCanvasX(point.time, viewport, plot);
    const height = Math.max(1, (point.volume / maxVolume) * volumeHeight);
    ctx.fillStyle = hexToRgba(point.isUp ? upColor : downColor, 0.35);
    ctx.fillRect(x - barWidth / 2, plot.bottom - height, barWidth, height);
  }
}

function drawCurrentPrice(ctx: CanvasRenderingContext2D, scene: RenderScene, plot: PlotArea): void {
  const latest = getLatestPricePoint(scene.series);
  if (!latest) {
    return;
  }

  const y = toCanvasY(latest.price, scene.viewport, plot);
  if (y < plot.top || y > plot.bottom) {
    return;
  }

  const lineWidth = Math.max(1, plot.dpr);
  const markerHeight = 22 * plot.dpr;
  const markerPadding = 8 * plot.dpr;
  const text = formatPrice(latest.price);

  ctx.save();
  ctx.strokeStyle = latest.color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([plot.dpr, 3 * plot.dpr]);
  ctx.beginPath();
  ctx.moveTo(plot.left, alignStroke(y));
  ctx.lineTo(plot.right, alignStroke(y));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = `${Math.max(11 * plot.dpr, scene.theme.fontSize * plot.dpr)}px ${scene.theme.fontFamily}`;
  const markerWidth = Math.min(
    plot.axisWidth,
    Math.max(64 * plot.dpr, ctx.measureText(text).width + markerPadding * 2),
  );
  const markerY = clamp(y - markerHeight / 2, plot.top, plot.bottom - markerHeight);
  ctx.fillStyle = latest.color;
  ctx.fillRect(plot.right, markerY, markerWidth, markerHeight);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, plot.right + markerWidth / 2, markerY + markerHeight / 2);
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
  if (x === null || y === null) {
    return;
  }

  const canvasX = x * plot.dpr;
  const canvasY = y * plot.dpr;
  if (canvasX < plot.left || canvasX > plot.right || canvasY < plot.top || canvasY > plot.bottom) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = crosshair.style.color;
  ctx.lineWidth = Math.max(1, crosshair.style.lineWidth * plot.dpr);
  ctx.setLineDash((crosshair.style.lineDash ?? []).map((value) => value * plot.dpr));
  ctx.beginPath();
  ctx.moveTo(alignStroke(canvasX), plot.top);
  ctx.lineTo(alignStroke(canvasX), plot.bottom);
  ctx.moveTo(plot.left, alignStroke(canvasY));
  ctx.lineTo(plot.right, alignStroke(canvasY));
  ctx.stroke();

  const dataX = dataXAtCanvasX(canvasX, scene.viewport, plot);
  const dataY = dataYAtCanvasY(canvasY, scene.viewport, plot);
  drawHoverPriceMarker(ctx, scene, plot, dataY, canvasY);
  drawHoverTimeMarker(ctx, scene, plot, dataX, canvasX);
  ctx.restore();
}

function drawHoverPriceMarker(
  ctx: CanvasRenderingContext2D,
  scene: RenderScene,
  plot: PlotArea,
  price: number,
  y: number,
): void {
  const text = formatPrice(price);
  const markerHeight = 22 * plot.dpr;
  const markerWidth = plot.axisWidth;
  const markerY = clamp(y - markerHeight / 2, plot.top, plot.bottom - markerHeight);

  ctx.setLineDash([]);
  ctx.font = `${Math.max(11 * plot.dpr, scene.theme.fontSize * plot.dpr)}px ${scene.theme.fontFamily}`;
  ctx.fillStyle = getHoverMarkerBackground();
  ctx.fillRect(plot.right, markerY, markerWidth, markerHeight);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, plot.right + markerWidth / 2, markerY + markerHeight / 2);
}

function drawHoverTimeMarker(
  ctx: CanvasRenderingContext2D,
  scene: RenderScene,
  plot: PlotArea,
  time: number,
  x: number,
): void {
  const text = formatCrosshairTime(time);
  const markerHeight = 22 * plot.dpr;
  const markerPadding = 8 * plot.dpr;
  ctx.font = `${Math.max(11 * plot.dpr, scene.theme.fontSize * plot.dpr)}px ${scene.theme.fontFamily}`;
  const markerWidth = Math.min(plot.width, ctx.measureText(text).width + markerPadding * 2);
  const markerX = clamp(x - markerWidth / 2, plot.left, plot.right - markerWidth);
  const markerY = plot.bottom + Math.max(2 * plot.dpr, (plot.timeAxisHeight - markerHeight) / 2);

  ctx.setLineDash([]);
  ctx.fillStyle = getHoverMarkerBackground();
  ctx.fillRect(markerX, markerY, markerWidth, markerHeight);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, markerX + markerWidth / 2, markerY + markerHeight / 2);
}

function drawPaneLegend(ctx: CanvasRenderingContext2D, scene: RenderScene, plot: PlotArea): void {
  if (!resolveGridOptions(scene.grid).legend) {
    return;
  }

  const entry = getLegendEntry(scene);
  if (!entry) {
    return;
  }

  const padding = 8 * plot.dpr;
  const markerSize = 6 * plot.dpr;
  const fontSize = Math.max(11 * plot.dpr, scene.theme.fontSize * plot.dpr);
  const x = plot.left + padding;
  const y = plot.top + padding;
  const maxTextWidth = Math.max(0, plot.width - padding * 3 - markerSize);

  ctx.save();
  ctx.font = `${fontSize}px ${scene.theme.fontFamily}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = entry.color;
  ctx.fillRect(x, y + fontSize * 0.45, markerSize, markerSize);
  ctx.fillStyle = scene.theme.textColor;
  ctx.globalAlpha = 0.92;
  ctx.fillText(trimTextToWidth(ctx, entry.text, maxTextWidth), x + markerSize + padding * 0.75, y);
  ctx.restore();
}

function drawBottomControls(ctx: CanvasRenderingContext2D, scene: RenderScene, plot: PlotArea): void {
  if (!resolveGridOptions(scene.grid).bottomControls || !shouldShowBottomControls(scene, plot)) {
    return;
  }

  const mouseX = (scene.mouseState?.position.x ?? -Infinity) * plot.dpr;
  const mouseY = (scene.mouseState?.position.y ?? -Infinity) * plot.dpr;
  const controls = getBottomControlRects(
    {
      x: plot.left,
      y: plot.top,
      width: plot.width,
      height: plot.height,
    },
    plot.dpr,
  );
  const fontSize = 12 * plot.dpr;

  ctx.save();
  ctx.font = `${fontSize}px ${scene.theme.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(1, plot.dpr);

  for (const control of controls) {
    const hovered = isPointInsideRect(mouseX, mouseY, control);
    ctx.fillStyle = getControlBackground(scene.theme.backgroundColor, hovered);
    ctx.strokeStyle = hexToRgba(scene.theme.textColor, hovered ? 0.42 : 0.22);
    ctx.fillRect(control.x, control.y, control.width, control.height);
    ctx.strokeRect(alignStroke(control.x), alignStroke(control.y), control.width, control.height);
    ctx.fillStyle = scene.theme.textColor;
    ctx.globalAlpha = hovered ? 0.95 : 0.78;
    ctx.fillText(getControlLabel(control.id), control.x + control.width / 2, control.y + control.height / 2);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function shouldShowBottomControls(scene: RenderScene, plot: PlotArea): boolean {
  const mouse = scene.mouseState;
  if (!mouse?.isOverChart) {
    return false;
  }

  if (mouse.area === 'bottom-control' || mouse.area === 'time-scale') {
    return true;
  }

  return mouse.area === 'plot' && mouse.position.y * plot.dpr >= plot.bottom - 96 * plot.dpr;
}

function getLegendEntry(scene: RenderScene): { text: string; color: string } | null {
  const targetX = scene.mouseState?.showCrosshair && scene.mouseState.area === 'plot'
    ? scene.mouseState.dataPosition.x
    : null;

  for (const series of scene.series) {
    if (!series.visible || series.type === 'volume') {
      continue;
    }

    const records = getVisibleRecords(series, scene.viewport);
    if (records.length === 0) {
      continue;
    }

    const point = targetX === null ? records[records.length - 1] : getClosestRecordByTime(records, targetX);
    if (point) {
      return formatLegendEntry(series, point);
    }
  }

  return null;
}

function getClosestRecordByTime(records: NumericRecord[], targetX: number): NumericRecord | null {
  let closest: NumericRecord | null = null;
  let closestDistance = Infinity;

  for (const record of records) {
    const time = readNumber(record, 'time');
    if (time === null) {
      continue;
    }

    const distance = Math.abs(time - targetX);
    if (distance < closestDistance) {
      closest = record;
      closestDistance = distance;
    }
  }

  return closest;
}

function formatLegendEntry(series: RenderableSeries, point: NumericRecord): { text: string; color: string } {
  const style = series.style as CanvasSeriesStyle;
  const name = series.name ?? series.type;
  const open = readNumber(point, 'open');
  const high = readNumber(point, 'high');
  const low = readNumber(point, 'low');
  const close = readNumber(point, 'close');
  const value = readNumber(point, 'value');
  const volume = readNumber(point, 'volume');

  if (open !== null && high !== null && low !== null && close !== null) {
    const isUp = close >= open;
    const color = isUp
      ? style.upColor ?? style.color ?? TRADING_VIEW_BULL
      : style.downColor ?? style.color ?? TRADING_VIEW_BEAR;
    const volumeText = volume === null ? '' : ` Vol ${formatCompactNumber(volume)}`;

    return {
      color,
      text: `${name} O ${formatPrice(open)} H ${formatPrice(high)} L ${formatPrice(low)} C ${formatPrice(close)}${volumeText}`,
    };
  }

  const nextValue = value ?? close ?? 0;
  return {
    color: style.color ?? TRADING_VIEW_BULL,
    text: `${name} ${formatPrice(nextValue)}`,
  };
}

function getControlLabel(id: string): string {
  switch (id) {
    case 'zoom-out':
      return '-';
    case 'zoom-in':
      return '+';
    case 'scroll-left':
      return '<';
    case 'scroll-right':
      return '>';
    case 'reset':
      return 'R';
    case 'latest':
      return '>|';
    default:
      return '';
  }
}

function getLatestPricePoint(seriesList: readonly RenderableSeries[]): { price: number; color: string } | null {
  for (const series of seriesList) {
    if (!series.visible || series.type === 'volume') {
      continue;
    }

    const records = (series.sourceData ?? []).filter(isNumericRecord);
    const style = series.style as CanvasSeriesStyle;

    for (let index = records.length - 1; index >= 0; index--) {
      const point = records[index];
      const price = readNumber(point, 'close') ?? readNumber(point, 'value');
      if (price === null) {
        continue;
      }

      const open = readNumber(point, 'open');
      const isUp = open === null || price >= open;
      const color = isUp
        ? style.upColor ?? style.color ?? TRADING_VIEW_BULL
        : style.downColor ?? style.color ?? TRADING_VIEW_BEAR;
      return { price, color };
    }
  }

  return null;
}

function clipToPlot(ctx: CanvasRenderingContext2D, plot: PlotArea): void {
  ctx.beginPath();
  ctx.rect(plot.left, plot.top, plot.width, plot.height);
  ctx.clip();
}

function getSeriesBarWidth(
  plot: PlotArea,
  points: readonly NumericRecord[],
  viewport: Viewport,
  widthRatio: number,
  minWidthPx: number,
  maxWidthPx: number,
): number {
  const barSpacing = getLogicalBarSpacing(plot, points, viewport);
  const maxBodyWidth = Math.max(minWidthPx * plot.dpr, barSpacing - plot.dpr);
  const naturalWidth = Math.round(barSpacing * widthRatio);

  return clamp(naturalWidth, minWidthPx * plot.dpr, Math.min(maxWidthPx * plot.dpr, maxBodyWidth));
}

function getLogicalBarSpacing(plot: PlotArea, points: readonly NumericRecord[], viewport: Viewport): number {
  const timeRange = viewport.dataMaxX - viewport.dataMinX;
  const timeStep = estimateTimeStep(points) ?? (points.length > 0 ? timeRange / points.length : timeRange);
  if (!Number.isFinite(timeRange) || timeRange <= 0 || !Number.isFinite(timeStep) || timeStep <= 0) {
    return plot.dpr;
  }

  return plot.width / Math.max(1, timeRange / timeStep);
}

function estimateTimeStep(points: readonly NumericRecord[]): number | null {
  if (points.length < 2) {
    return null;
  }

  let previous: number | null = null;
  let minStep = Infinity;

  for (const point of points) {
    const time = readNumber(point, 'time');
    if (time === null) {
      continue;
    }

    if (previous !== null && time > previous) {
      minStep = Math.min(minStep, time - previous);
    }
    previous = time;
  }

  return Number.isFinite(minStep) ? minStep : null;
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

function dataXAtCanvasX(x: number, viewport: Viewport, plot: PlotArea): number {
  const range = viewport.dataMaxX - viewport.dataMinX || 1;
  return viewport.dataMinX + ((x - plot.left) / (plot.width || 1)) * range;
}

function dataYAtCanvasY(y: number, viewport: Viewport, plot: PlotArea): number {
  const range = viewport.dataMaxY - viewport.dataMinY || 1;
  return viewport.dataMaxY - ((y - plot.top) / (plot.height || 1)) * range;
}

function alignStroke(value: number): number {
  return Math.round(value) + 0.5;
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function getTimeRangeMs(min: number, max: number): number {
  return Math.abs(max - min) * getTimeScale(min, max);
}

function normalizeTimeToMs(time: number): number {
  return time * getTimeScale(time, time);
}

function getTimeScale(min: number, max: number): number {
  const largest = Math.max(Math.abs(min), Math.abs(max));
  return largest < 100_000_000_000 ? 1000 : 1;
}

function getHoverMarkerBackground(): string {
  return '#0f0f0f';
}

function getControlBackground(backgroundColor: string, hovered: boolean): string {
  const rgb = parseColorToRgb(backgroundColor);
  if (!rgb) {
    return backgroundColor;
  }

  const alpha = hovered ? 0.92 : 0.78;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function trimTextToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  const suffix = '...';
  if (ctx.measureText(suffix).width >= maxWidth) {
    return suffix;
  }

  let low = 0;
  let high = text.length;
  let best = suffix;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = `${text.slice(0, mid)}${suffix}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
}

function isPointInsideRect(x: number, y: number, rect: { x: number; y: number; width: number; height: number }): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function parseColorToRgb(color: string): { r: number; g: number; b: number } | null {
  if (color.startsWith('#')) {
    if (color.length === 4) {
      return {
        r: parseHexPair(color[1], color[1]),
        g: parseHexPair(color[2], color[2]),
        b: parseHexPair(color[3], color[3]),
      };
    }
    if (color.length === 7) {
      return {
        r: parseHexPair(color[1], color[2]),
        g: parseHexPair(color[3], color[4]),
        b: parseHexPair(color[5], color[6]),
      };
    }
  }

  const rgbMatch = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  if (!rgbMatch) {
    return null;
  }

  return {
    r: Number(rgbMatch[1]),
    g: Number(rgbMatch[2]),
    b: Number(rgbMatch[3]),
  };
}

function formatPrice(value: number): string {
  const abs = Math.abs(value);
  const decimals = abs >= 1 ? 2 : 4;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatTime(time: number, rangeMs: number = HOUR_MS): string {
  const date = new Date(normalizeTimeToMs(time));
  if (rangeMs >= 180 * DAY_MS) {
    return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  }
  if (rangeMs >= 2 * DAY_MS) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatCrosshairTime(time: number): string {
  const date = new Date(normalizeTimeToMs(time));
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatCompactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }

  return value.toFixed(0);
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
