import type { ChartGridControlId, ChartGridOptions } from '@procharting/types';

export const TRADING_VIEW_GRID3_PRICE_SCALE_WIDTH_PX = 80;
export const TRADING_VIEW_GRID3_MIN_PRICE_SCALE_WIDTH_PX = 72;
export const TRADING_VIEW_PRICE_SCALE_WIDTH_PX = TRADING_VIEW_GRID3_PRICE_SCALE_WIDTH_PX;
export const TRADING_VIEW_TIME_SCALE_HEIGHT_PX = 28;
export const TRADING_VIEW_MIN_PLOT_WIDTH_PX = 120;
export const TRADING_VIEW_MIN_PLOT_HEIGHT_PX = 160;
export const TRADING_VIEW_RIGHT_OFFSET_BARS = 10;
export const TRADING_VIEW_HORIZONTAL_GRIDLINE_SPACING_PX = 36;

export type GridHitArea = 'plot' | 'price-scale' | 'time-scale' | 'axis-corner' | 'bottom-control' | 'outside';

export interface GridRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface GridControlRect extends GridRect {
  readonly id: ChartGridControlId;
}

export interface ResolvedGridOptions {
  readonly priceScaleWidth: number;
  readonly minPriceScaleWidth: number;
  readonly timeScaleHeight: number;
  readonly minPlotWidth: number;
  readonly minPlotHeight: number;
  readonly rightOffsetBars: number;
  readonly horizontalGridLineSpacing: number;
  readonly bottomControls: boolean;
  readonly legend: boolean;
}

export interface CssGridLayout {
  readonly width: number;
  readonly height: number;
  readonly plot: GridRect;
  readonly priceScale: GridRect;
  readonly timeScale: GridRect;
  readonly axisCorner: GridRect;
  readonly priceScaleWidth: number;
  readonly timeScaleHeight: number;
}

export function resolveGridOptions(options?: ChartGridOptions): ResolvedGridOptions {
  const priceScaleWidth = positiveNumber(options?.priceScaleWidth, TRADING_VIEW_GRID3_PRICE_SCALE_WIDTH_PX);

  return {
    priceScaleWidth,
    minPriceScaleWidth: Math.min(
      priceScaleWidth,
      positiveNumber(options?.minPriceScaleWidth, TRADING_VIEW_GRID3_MIN_PRICE_SCALE_WIDTH_PX),
    ),
    timeScaleHeight: positiveNumber(options?.timeScaleHeight, TRADING_VIEW_TIME_SCALE_HEIGHT_PX),
    minPlotWidth: positiveNumber(options?.minPlotWidth, TRADING_VIEW_MIN_PLOT_WIDTH_PX),
    minPlotHeight: positiveNumber(options?.minPlotHeight, TRADING_VIEW_MIN_PLOT_HEIGHT_PX),
    rightOffsetBars: positiveNumber(options?.rightOffsetBars, TRADING_VIEW_RIGHT_OFFSET_BARS),
    horizontalGridLineSpacing: positiveNumber(
      options?.horizontalGridLineSpacing,
      TRADING_VIEW_HORIZONTAL_GRIDLINE_SPACING_PX,
    ),
    bottomControls: options?.bottomControls !== false,
    legend: options?.legend !== false,
  };
}

export function createCssGridLayout(width: number, height: number, options?: ChartGridOptions): CssGridLayout {
  const grid = resolveGridOptions(options);
  const preferredPriceScaleWidth = width < 480
    ? grid.minPriceScaleWidth
    : grid.priceScaleWidth;
  const priceScaleWidth = width >= preferredPriceScaleWidth + grid.minPlotWidth
    ? preferredPriceScaleWidth
    : Math.min(width, Math.max(grid.minPriceScaleWidth, Math.min(preferredPriceScaleWidth, width * 0.32)));
  const timeScaleHeight = height >= grid.timeScaleHeight + grid.minPlotHeight
    ? grid.timeScaleHeight
    : Math.max(22, Math.min(grid.timeScaleHeight, height * 0.12));
  const plotWidth = Math.max(0, width - priceScaleWidth);
  const plotHeight = Math.max(0, height - timeScaleHeight);

  return {
    width,
    height,
    plot: { x: 0, y: 0, width: plotWidth, height: plotHeight },
    priceScale: { x: plotWidth, y: 0, width: priceScaleWidth, height: plotHeight },
    timeScale: { x: 0, y: plotHeight, width: plotWidth, height: timeScaleHeight },
    axisCorner: { x: plotWidth, y: plotHeight, width: priceScaleWidth, height: timeScaleHeight },
    priceScaleWidth,
    timeScaleHeight,
  };
}

export function getGridArea(x: number, y: number, layout: CssGridLayout, options?: ChartGridOptions): GridHitArea {
  if (resolveGridOptions(options).bottomControls && getBottomControlAt(x, y, layout.plot)) {
    return 'bottom-control';
  }
  if (isInsideRect(x, y, layout.plot)) {
    return 'plot';
  }
  if (isInsideRect(x, y, layout.priceScale)) {
    return 'price-scale';
  }
  if (isInsideRect(x, y, layout.timeScale)) {
    return 'time-scale';
  }
  if (isInsideRect(x, y, layout.axisCorner)) {
    return 'axis-corner';
  }

  return 'outside';
}

export function getBottomControlAt(x: number, y: number, plot: GridRect, scale = 1): ChartGridControlId | null {
  return getBottomControlRects(plot, scale).find((rect) => isInsideRect(x, y, rect))?.id ?? null;
}

export function getBottomControlRects(plot: GridRect, scale = 1): GridControlRect[] {
  const controlSize = 24 * scale;
  const gap = 8 * scale;
  const y = clamp(plot.y + plot.height - 52 * scale, plot.y + 8 * scale, plot.y + plot.height - controlSize - 8 * scale);
  const centeredIds: ChartGridControlId[] = ['zoom-out', 'zoom-in', 'scroll-left', 'scroll-right', 'reset'];
  const groupWidth = centeredIds.length * controlSize + (centeredIds.length - 1) * gap;
  const groupX = clamp(
    plot.x + (plot.width - groupWidth) / 2,
    plot.x + 8 * scale,
    plot.x + Math.max(8 * scale, plot.width - groupWidth - 8 * scale),
  );
  const rects = centeredIds.map((id, index) => ({
    id,
    x: groupX + index * (controlSize + gap),
    y,
    width: controlSize,
    height: controlSize,
  }));

  rects.push({
    id: 'latest',
    x: clamp(
      plot.x + plot.width - controlSize - 20 * scale,
      plot.x + 8 * scale,
      plot.x + Math.max(8 * scale, plot.width - controlSize - 8 * scale),
    ),
    y,
    width: controlSize,
    height: controlSize,
  });

  return rects;
}

function isInsideRect(x: number, y: number, rect: GridRect): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function positiveNumber(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}
