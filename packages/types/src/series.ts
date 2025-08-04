import type { CandlestickData, LineData, BarData } from './data';

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