'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MousePosition {
  x: number;
  y: number;
  dataY: number;
}

interface ViewRange {
  startIndex: number;
  endIndex: number;
  candlesPerView: number;
}

interface PriceRange {
  minPrice: number;
  maxPrice: number;
}

interface TimeStep {
  unit: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
  step: number;
  durationMs: number;
}

interface Palette {
  canvasTop: string;
  canvasBottom: string;
  grid: string;
  gridStrong: string;
  text: string;
  textBright: string;
  crosshair: string;
  axisBg: string;
  axisBorder: string;
  green: string;
  red: string;
  greenSoft: string;
  redSoft: string;
  wick: string;
  line: string;
  ma: string;
  volume: string;
}

type BinanceKline = [number, string, string, string, string, string];
type ChartStyle = 'candles' | 'line' | 'area';
type ThemeName = 'dark' | 'light';
type FeedStatus = 'connecting' | 'live' | 'offline';
type MenuKey = 'symbol' | 'timeframe' | 'chartStyle' | 'indicators';
type ChartPointerArea = 'plot' | 'price-scale' | 'time-scale' | 'outside';
type ChartDragMode = 'none' | 'chart-pan' | 'price-scale';
type IndicatorPaneKind = 'price' | 'volume' | 'oscillator';
type IndicatorSource = 'open' | 'high' | 'low' | 'close' | 'hl2' | 'hlc3' | 'ohlc4';
type IndicatorFormula =
  | 'volume'
  | 'sma'
  | 'ema'
  | 'wma'
  | 'bb'
  | 'vwap'
  | 'rsi'
  | 'macd'
  | 'stochastic'
  | 'donchian'
  | 'momentum'
  | 'roc'
  | 'adl'
  | 'atr'
  | 'bb-percent'
  | 'bb-width';

interface ChartDragState {
  mode: ChartDragMode;
  startX: number;
  startY: number;
  startViewRange: ViewRange;
  startPriceRange: PriceRange | null;
  anchorPrice: number;
}

interface MenuOption<T extends string> {
  value: T;
  label: string;
  shortLabel?: string;
  description?: string;
}

interface IndicatorSettings {
  period?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  stdDev?: number;
  source?: IndicatorSource;
  color?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  fillColor?: string;
}

interface IndicatorDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: 'Volume' | 'Trend' | 'Momentum' | 'Volatility';
  pane: IndicatorPaneKind;
  formula: IndicatorFormula;
  defaults: IndicatorSettings;
  singleton?: boolean;
  featured?: boolean;
}

interface ActiveIndicator {
  id: string;
  definitionId: string;
  visible: boolean;
  settings: IndicatorSettings;
}

interface IndicatorLineSeries {
  label: string;
  color: string;
  values: Array<number | null>;
}

interface IndicatorComputedSeries {
  lines: IndicatorLineSeries[];
  histogram?: Array<number | null>;
  histogramPositive?: string;
  histogramNegative?: string;
  fillColor?: string;
  min?: number;
  max?: number;
  guideLines?: Array<{ value: number; label?: string }>;
}

const TIMEFRAME_OPTIONS: Array<MenuOption<string>> = [
  { value: '1m', label: '1m', description: '1 minute' },
  { value: '5m', label: '5m', description: '5 minutes' },
  { value: '15m', label: '15m', description: '15 minutes' },
  { value: '30m', label: '30m', description: '30 minutes' },
  { value: '1h', label: '1H', description: '1 hour' },
  { value: '4h', label: '4H', description: '4 hours' },
  { value: '1d', label: '1D', description: '1 day' },
  { value: '1w', label: '1W', description: '1 week' },
  { value: '1M', label: '1M', description: '1 month' },
];
const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'];
const SYMBOL_OPTIONS: Array<MenuOption<string>> = SYMBOLS.map((value) => ({
  value,
  label: value,
  description: `${value.slice(0, -4)}/${value.slice(-4)} Binance spot`,
}));
const CHART_STYLE_OPTIONS: Array<MenuOption<ChartStyle>> = [
  { value: 'candles', label: 'Candles', shortLabel: 'Candle', description: 'OHLC candles' },
  { value: 'line', label: 'Line', description: 'Close price line' },
  { value: 'area', label: 'Area', description: 'Filled close price line' },
];

const INDICATOR_DEFINITIONS: IndicatorDefinition[] = [
  {
    id: 'volume',
    name: 'Volume',
    shortName: 'Vol',
    description: 'Exchange volume bars',
    category: 'Volume',
    pane: 'volume',
    formula: 'volume',
    defaults: { color: '#26a69a', secondaryColor: '#ef5350' },
    singleton: true,
    featured: true,
  },
  {
    id: 'sma-20',
    name: 'Moving Average',
    shortName: 'SMA',
    description: 'Simple moving average',
    category: 'Trend',
    pane: 'price',
    formula: 'sma',
    defaults: { period: 20, source: 'close', color: '#f5c84b' },
    featured: true,
  },
  {
    id: 'sma-200',
    name: 'Moving Average 200',
    shortName: 'SMA',
    description: 'Long simple moving average',
    category: 'Trend',
    pane: 'price',
    formula: 'sma',
    defaults: { period: 200, source: 'close', color: '#2962ff' },
    featured: true,
  },
  {
    id: 'ema-7',
    name: 'Exponential Moving Average',
    shortName: 'EMA',
    description: 'Fast exponential moving average',
    category: 'Trend',
    pane: 'price',
    formula: 'ema',
    defaults: { period: 7, source: 'close', color: '#7e57c2' },
    featured: true,
  },
  {
    id: 'ema-20',
    name: 'EMA 20',
    shortName: 'EMA',
    description: 'Exponential moving average',
    category: 'Trend',
    pane: 'price',
    formula: 'ema',
    defaults: { period: 20, source: 'close', color: '#7e57c2' },
  },
  {
    id: 'bb-20',
    name: 'Bollinger Bands',
    shortName: 'BB',
    description: 'SMA envelope with standard deviation bands',
    category: 'Volatility',
    pane: 'price',
    formula: 'bb',
    defaults: {
      period: 20,
      source: 'close',
      stdDev: 2,
      color: '#2962ff',
      secondaryColor: '#f23645',
      tertiaryColor: '#089981',
      fillColor: 'rgba(41, 98, 255, 0.08)',
    },
    featured: true,
  },
  {
    id: 'vwap-session',
    name: 'VWAP Session',
    shortName: 'VWAP',
    description: 'Session volume weighted average price',
    category: 'Trend',
    pane: 'price',
    formula: 'vwap',
    defaults: { source: 'hlc3', color: '#ff9800' },
    singleton: true,
    featured: true,
  },
  {
    id: 'donchian-20',
    name: 'Donchian Channels',
    shortName: 'DC',
    description: 'High and low price channels',
    category: 'Volatility',
    pane: 'price',
    formula: 'donchian',
    defaults: { period: 20, color: '#26a69a', secondaryColor: '#ef5350', tertiaryColor: '#7c8da6' },
  },
  {
    id: 'wma-20',
    name: 'Weighted Moving Average',
    shortName: 'WMA',
    description: 'Weighted moving average',
    category: 'Trend',
    pane: 'price',
    formula: 'wma',
    defaults: { period: 20, source: 'close', color: '#00bcd4' },
  },
  {
    id: 'rsi-14',
    name: 'Relative Strength Index',
    shortName: 'RSI',
    description: 'Momentum oscillator',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'rsi',
    defaults: { period: 14, source: 'close', color: '#7e57c2', secondaryColor: '#f5c84b' },
    featured: true,
  },
  {
    id: 'macd',
    name: 'MACD',
    shortName: 'MACD',
    description: 'Moving average convergence divergence',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'macd',
    defaults: {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      source: 'close',
      color: '#2962ff',
      secondaryColor: '#ff6d00',
      tertiaryColor: '#7c8da6',
    },
    featured: true,
  },
  {
    id: 'stochastic',
    name: 'Stochastic',
    shortName: 'Stoch',
    description: 'Stochastic oscillator',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'stochastic',
    defaults: { period: 14, signalPeriod: 3, color: '#2962ff', secondaryColor: '#ff6d00' },
  },
  {
    id: 'momentum',
    name: 'Momentum',
    shortName: 'Mom',
    description: 'Close price momentum',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'momentum',
    defaults: { period: 10, source: 'close', color: '#00bcd4' },
  },
  {
    id: 'roc',
    name: 'Rate Of Change',
    shortName: 'ROC',
    description: 'Percent rate of change',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'roc',
    defaults: { period: 9, source: 'close', color: '#26a69a' },
  },
  {
    id: 'adl',
    name: 'Accumulation/Distribution',
    shortName: 'A/D',
    description: 'Volume accumulation distribution line',
    category: 'Volume',
    pane: 'oscillator',
    formula: 'adl',
    defaults: { color: '#2962ff' },
  },
  {
    id: 'atr',
    name: 'Average True Range',
    shortName: 'ATR',
    description: 'Average true range volatility',
    category: 'Volatility',
    pane: 'oscillator',
    formula: 'atr',
    defaults: { period: 14, color: '#ff9800' },
  },
  {
    id: 'bb-percent',
    name: 'Bollinger Bands %b',
    shortName: 'BB %b',
    description: 'Close position inside Bollinger Bands',
    category: 'Volatility',
    pane: 'oscillator',
    formula: 'bb-percent',
    defaults: { period: 20, source: 'close', stdDev: 2, color: '#2962ff' },
  },
  {
    id: 'bb-width',
    name: 'Bollinger BandWidth',
    shortName: 'BBW',
    description: 'Relative Bollinger Band width',
    category: 'Volatility',
    pane: 'oscillator',
    formula: 'bb-width',
    defaults: { period: 20, source: 'close', stdDev: 2, color: '#7e57c2' },
  },
];

const INDICATOR_SOURCE_OPTIONS: IndicatorSource[] = ['open', 'high', 'low', 'close', 'hl2', 'hlc3', 'ohlc4'];

const PALETTES: Record<ThemeName, Palette> = {
  dark: {
    canvasTop: '#101722',
    canvasBottom: '#080b11',
    grid: 'rgba(87, 101, 125, 0.18)',
    gridStrong: 'rgba(118, 132, 155, 0.28)',
    text: '#8f9bad',
    textBright: '#e7edf7',
    crosshair: 'rgba(183, 196, 216, 0.65)',
    axisBg: '#111923',
    axisBorder: '#223044',
    green: '#16b99a',
    red: '#f05662',
    greenSoft: 'rgba(22, 185, 154, 0.16)',
    redSoft: 'rgba(240, 86, 98, 0.16)',
    wick: '#738198',
    line: '#55a7ff',
    ma: '#f5c84b',
    volume: 'rgba(119, 135, 164, 0.28)',
  },
  light: {
    canvasTop: '#f6f8fb',
    canvasBottom: '#edf2f7',
    grid: 'rgba(88, 103, 124, 0.18)',
    gridStrong: 'rgba(80, 95, 116, 0.28)',
    text: '#607086',
    textBright: '#142033',
    crosshair: 'rgba(34, 48, 68, 0.66)',
    axisBg: '#eef3f8',
    axisBorder: '#ccd6e3',
    green: '#049981',
    red: '#dc3f4b',
    greenSoft: 'rgba(4, 153, 129, 0.15)',
    redSoft: 'rgba(220, 63, 75, 0.14)',
    wick: '#738198',
    line: '#0b72d9',
    ma: '#b57b00',
    volume: 'rgba(93, 112, 136, 0.24)',
  },
};

const MIN_VISIBLE_BARS = 18;
const MAX_VISIBLE_BARS = 420;
const MAX_FUTURE_BARS = 120;
const Y_AXIS_SCALE_SPEED = 1.7;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

const TIMEFRAME_INTERVAL_MS: Record<string, number> = {
  '1m': MINUTE_MS,
  '5m': 5 * MINUTE_MS,
  '15m': 15 * MINUTE_MS,
  '30m': 30 * MINUTE_MS,
  '1h': HOUR_MS,
  '4h': 4 * HOUR_MS,
  '1d': DAY_MS,
  '1w': WEEK_MS,
  '1M': MONTH_MS,
};

const TIMEFRAME_BAR_SPACING: Record<string, { spacing: number; minBars: number; maxBars: number }> = {
  '1m': { spacing: 7.0, minBars: 42, maxBars: 220 },
  '5m': { spacing: 7.4, minBars: 42, maxBars: 210 },
  '15m': { spacing: 7.8, minBars: 40, maxBars: 190 },
  '30m': { spacing: 8.2, minBars: 38, maxBars: 180 },
  '1h': { spacing: 8.5, minBars: 36, maxBars: 170 },
  '4h': { spacing: 8.8, minBars: 34, maxBars: 160 },
  '1d': { spacing: 7.8, minBars: 48, maxBars: 160 },
  '1w': { spacing: 8.8, minBars: 44, maxBars: 150 },
  '1M': { spacing: 10.8, minBars: 36, maxBars: 132 },
};

const TIMELINE_STEPS: TimeStep[] = [
  { unit: 'minute', step: 5, durationMs: 5 * MINUTE_MS },
  { unit: 'minute', step: 15, durationMs: 15 * MINUTE_MS },
  { unit: 'minute', step: 30, durationMs: 30 * MINUTE_MS },
  { unit: 'hour', step: 1, durationMs: HOUR_MS },
  { unit: 'hour', step: 2, durationMs: 2 * HOUR_MS },
  { unit: 'hour', step: 4, durationMs: 4 * HOUR_MS },
  { unit: 'hour', step: 6, durationMs: 6 * HOUR_MS },
  { unit: 'hour', step: 12, durationMs: 12 * HOUR_MS },
  { unit: 'day', step: 1, durationMs: DAY_MS },
  { unit: 'day', step: 2, durationMs: 2 * DAY_MS },
  { unit: 'week', step: 1, durationMs: WEEK_MS },
  { unit: 'month', step: 1, durationMs: MONTH_MS },
  { unit: 'month', step: 3, durationMs: 3 * MONTH_MS },
  { unit: 'month', step: 6, durationMs: 6 * MONTH_MS },
  { unit: 'year', step: 1, durationMs: YEAR_MS },
  { unit: 'year', step: 2, durationMs: 2 * YEAR_MS },
  { unit: 'year', step: 5, durationMs: 5 * YEAR_MS },
];

const getMaxStartIndex = (candleCount: number, candlesPerView: number) =>
  Math.max(0, candleCount + MAX_FUTURE_BARS - candlesPerView);

const timeframeToMilliseconds = (value: string) => TIMEFRAME_INTERVAL_MS[value] ?? MINUTE_MS;

const scalePriceRange = (range: PriceRange, anchorPrice: number, scaleFactor: number): PriceRange => {
  const factor = clamp(scaleFactor, 0.05, 20);

  return {
    minPrice: anchorPrice - (anchorPrice - range.minPrice) * factor,
    maxPrice: anchorPrice + (range.maxPrice - anchorPrice) * factor,
  };
};

const formatPrice = (price: number) => {
  if (!Number.isFinite(price)) return '-';
  return price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatCompact = (value: number) => {
  if (!Number.isFinite(value)) return '-';

  return Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
};

const parseCandles = (payload: unknown): Candle[] => {
  if (!Array.isArray(payload)) {
    throw new Error('The market data response was not a candle list.');
  }

  return payload.map((raw) => {
    if (!Array.isArray(raw) || raw.length < 6) {
      throw new Error('The market data response contained a malformed candle.');
    }

    const candle = raw as BinanceKline;
    const parsed = {
      time: Number(candle[0]),
      open: Number(candle[1]),
      high: Number(candle[2]),
      low: Number(candle[3]),
      close: Number(candle[4]),
      volume: Number(candle[5]),
    };

    if (Object.values(parsed).some((value) => !Number.isFinite(value))) {
      throw new Error('The market data response contained non-numeric values.');
    }

    return parsed;
  });
};

const formatSymbol = (symbol: string) => `${symbol.slice(0, -4)}/${symbol.slice(-4)}`;

const calculateNiceInterval = (range: number, targetTickCount = 8) => {
  if (!Number.isFinite(range) || range <= 0) return 1;

  const roughStep = range / Math.max(1, targetTickCount);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalized = roughStep / magnitude;
  const candidates = [1, 2, 2.5, 4, 5, 10];
  const closest = candidates.reduce((best, candidate) => {
    return Math.abs(candidate - normalized) < Math.abs(best - normalized) ? candidate : best;
  }, candidates[0]);

  return closest * magnitude;
};

const getRightOffsetBars = (chartWidth: number) =>
  Math.round(clamp(chartWidth / 140, 5, 12));

const getDefaultCandlesPerView = (timeframe: string, candleCount: number, chartWidth: number) => {
  const density = TIMEFRAME_BAR_SPACING[timeframe] ?? TIMEFRAME_BAR_SPACING['1m'];
  const maxVisibleBars = Math.max(
    density.minBars,
    Math.min(density.maxBars, Math.max(density.minBars, candleCount + getRightOffsetBars(chartWidth)))
  );

  return Math.round(clamp(chartWidth / density.spacing, density.minBars, maxVisibleBars));
};

const normalizeViewRange = (
  startIndex: number,
  candlesPerView: number,
  candleCount: number,
  futureBars = MAX_FUTURE_BARS
): ViewRange => {
  const maxVisibleBars = Math.max(MIN_VISIBLE_BARS, Math.min(MAX_VISIBLE_BARS, candleCount + futureBars));
  const visibleBars = Math.round(clamp(candlesPerView, MIN_VISIBLE_BARS, maxVisibleBars));
  const maxStartIndex = Math.max(0, candleCount + futureBars - visibleBars);
  const nextStartIndex = clamp(startIndex, 0, maxStartIndex);

  return {
    startIndex: nextStartIndex,
    endIndex: nextStartIndex + visibleBars,
    candlesPerView: visibleBars,
  };
};

const getTimeAtVirtualIndex = (index: number, candles: Candle[], intervalMs: number) => {
  if (candles.length === 0) return 0;

  if (index < 0) {
    return candles[0].time + index * intervalMs;
  }

  const wholeIndex = Math.floor(index);
  const fraction = index - wholeIndex;

  if (wholeIndex < candles.length) {
    const currentTime = candles[wholeIndex].time;
    const nextTime = candles[wholeIndex + 1]?.time ?? currentTime + intervalMs;

    return currentTime + (nextTime - currentTime) * fraction;
  }

  return candles[candles.length - 1].time + (index - candles.length + 1) * intervalMs;
};

const getTimelineBucket = (timestamp: number, step: TimeStep) => {
  const date = new Date(timestamp);

  if (step.unit === 'month') {
    const monthIndex = date.getUTCFullYear() * 12 + date.getUTCMonth();
    return Math.floor(monthIndex / step.step);
  }
  if (step.unit === 'year') {
    return Math.floor(date.getUTCFullYear() / step.step);
  }

  return Math.floor(timestamp / step.durationMs);
};

const formatTimelineLabel = (timestamp: number, step: TimeStep) => {
  const date = new Date(timestamp);

  if (step.unit === 'year') {
    return date.toLocaleDateString(undefined, { year: 'numeric' });
  }
  if (step.unit === 'month') {
    if (date.getUTCMonth() === 0 || step.step >= 6) {
      return date.toLocaleDateString(undefined, { year: 'numeric' });
    }
    return date.toLocaleDateString(undefined, { month: 'short' });
  }
  if (step.unit === 'week' || step.unit === 'day') {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const chooseTimelineStep = (visibleTimeRange: number, chartWidth: number) => {
  const targetTickCount = Math.max(3, Math.floor(chartWidth / 120));
  const targetDuration = visibleTimeRange / targetTickCount;

  return TIMELINE_STEPS.find((step) => step.durationMs >= targetDuration) ?? TIMELINE_STEPS[TIMELINE_STEPS.length - 1];
};

const createTimelineTicks = (
  viewRange: ViewRange,
  candles: Candle[],
  timeframe: string,
  chartWidth: number,
  compact: boolean
) => {
  const intervalMs = timeframeToMilliseconds(timeframe);
  const startTime = getTimeAtVirtualIndex(viewRange.startIndex, candles, intervalMs);
  const endTime = getTimeAtVirtualIndex(viewRange.endIndex - 1, candles, intervalMs);
  const step = chooseTimelineStep(Math.max(intervalMs, endTime - startTime), chartWidth);
  const minLabelSpacing = compact ? 74 : 96;
  const ticks: Array<{ index: number; time: number; label: string; major: boolean }> = [];
  let lastBucket: number | null = null;
  let lastX = -Infinity;

  for (let index = Math.floor(viewRange.startIndex); index < viewRange.endIndex; index += 1) {
    const time = getTimeAtVirtualIndex(index, candles, intervalMs);
    const bucket = getTimelineBucket(time, step);
    const x = ((index - viewRange.startIndex) / viewRange.candlesPerView) * chartWidth;

    if (bucket !== lastBucket && x - lastX >= minLabelSpacing) {
      const date = new Date(time);
      ticks.push({
        index,
        time,
        label: formatTimelineLabel(time, step),
        major: date.getUTCHours() === 0 && date.getUTCMinutes() === 0,
      });
      lastX = x;
    }

    lastBucket = bucket;
  }

  return ticks;
};

const createPriceTicks = (minPrice: number, maxPrice: number, chartHeight: number) => {
  const range = maxPrice - minPrice || 1;
  const targetTickCount = Math.max(4, Math.round(chartHeight / 40));
  const step = calculateNiceInterval(range, targetTickCount);
  const ticks: number[] = [];
  const startPrice = Math.floor(minPrice / step) * step;

  for (let price = startPrice; price <= maxPrice + step; price += step) {
    if (price >= minPrice - step * 0.1 && price <= maxPrice + step * 0.1) {
      ticks.push(price);
    }
  }

  return { step, ticks };
};

const formatCountdown = (timeframe: string, candleOpenTime: number) => {
  const remainingMs = candleOpenTime + timeframeToMilliseconds(timeframe) - Date.now();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return '';

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const sanitizePeriod = (value: number | undefined, fallback: number, min = 1, max = 500) =>
  Math.round(clamp(value ?? fallback, min, max));

const getIndicatorDefinition = (definitionId: string) =>
  INDICATOR_DEFINITIONS.find((definition) => definition.id === definitionId) ?? INDICATOR_DEFINITIONS[0];

const createActiveIndicator = (definitionId: string, suffix = `${Date.now()}`): ActiveIndicator => {
  const definition = getIndicatorDefinition(definitionId);

  return {
    id: `${definition.id}-${suffix}`,
    definitionId: definition.id,
    visible: true,
    settings: { ...definition.defaults },
  };
};

const DEFAULT_ACTIVE_INDICATORS: ActiveIndicator[] = [
  createActiveIndicator('volume', 'default'),
  createActiveIndicator('sma-20', 'default'),
];

const getSourceValue = (candle: Candle, source: IndicatorSource = 'close') => {
  switch (source) {
    case 'open':
      return candle.open;
    case 'high':
      return candle.high;
    case 'low':
      return candle.low;
    case 'hl2':
      return (candle.high + candle.low) / 2;
    case 'hlc3':
      return (candle.high + candle.low + candle.close) / 3;
    case 'ohlc4':
      return (candle.open + candle.high + candle.low + candle.close) / 4;
    case 'close':
    default:
      return candle.close;
  }
};

const getSourceValues = (candles: Candle[], source: IndicatorSource = 'close') =>
  candles.map((candle) => getSourceValue(candle, source));

const simpleMovingAverageValues = (values: number[], period: number) => {
  const result: Array<number | null> = new Array(values.length).fill(null);
  let rollingSum = 0;

  values.forEach((value, index) => {
    rollingSum += value;

    if (index >= period) {
      rollingSum -= values[index - period];
    }

    if (index >= period - 1) {
      result[index] = rollingSum / period;
    }
  });

  return result;
};

const simpleMovingAverageNullable = (values: Array<number | null>, period: number) => {
  const result: Array<number | null> = new Array(values.length).fill(null);
  const window: number[] = [];

  values.forEach((value, index) => {
    if (value === null) {
      window.length = 0;
      return;
    }

    window.push(value);
    if (window.length > period) window.shift();
    if (window.length === period) {
      result[index] = window.reduce((sum, item) => sum + item, 0) / period;
    }
  });

  return result;
};

const exponentialMovingAverageValues = (values: number[], period: number) => {
  const result: Array<number | null> = new Array(values.length).fill(null);
  const multiplier = 2 / (period + 1);
  let rollingSum = 0;
  let previous: number | null = null;

  values.forEach((value, index) => {
    if (previous === null) {
      rollingSum += value;
      if (index === period - 1) {
        previous = rollingSum / period;
        result[index] = previous;
      }
      return;
    }

    previous = (value - previous) * multiplier + previous;
    result[index] = previous;
  });

  return result;
};

const exponentialMovingAverageNullable = (values: Array<number | null>, period: number) => {
  const result: Array<number | null> = new Array(values.length).fill(null);
  const multiplier = 2 / (period + 1);
  let rollingSum = 0;
  let count = 0;
  let previous: number | null = null;

  values.forEach((value, index) => {
    if (value === null) return;

    if (previous === null) {
      rollingSum += value;
      count += 1;
      if (count === period) {
        previous = rollingSum / period;
        result[index] = previous;
      }
      return;
    }

    previous = (value - previous) * multiplier + previous;
    result[index] = previous;
  });

  return result;
};

const weightedMovingAverageValues = (values: number[], period: number) => {
  const result: Array<number | null> = new Array(values.length).fill(null);
  const denominator = (period * (period + 1)) / 2;

  for (let index = period - 1; index < values.length; index += 1) {
    let weightedSum = 0;

    for (let offset = 0; offset < period; offset += 1) {
      weightedSum += values[index - offset] * (period - offset);
    }

    result[index] = weightedSum / denominator;
  }

  return result;
};

const calculateBollingerBands = (values: number[], period: number, stdDev: number) => {
  const basis = simpleMovingAverageValues(values, period);
  const upper: Array<number | null> = new Array(values.length).fill(null);
  const lower: Array<number | null> = new Array(values.length).fill(null);

  for (let index = period - 1; index < values.length; index += 1) {
    const mean = basis[index];
    if (mean === null) continue;

    let variance = 0;
    for (let offset = 0; offset < period; offset += 1) {
      variance += Math.pow(values[index - offset] - mean, 2);
    }

    const deviation = Math.sqrt(variance / period) * stdDev;
    upper[index] = mean + deviation;
    lower[index] = mean - deviation;
  }

  return { basis, upper, lower };
};

const calculateVwapValues = (candles: Candle[], source: IndicatorSource) => {
  const result: Array<number | null> = new Array(candles.length).fill(null);
  let sessionKey = '';
  let cumulativePriceVolume = 0;
  let cumulativeVolume = 0;

  candles.forEach((candle, index) => {
    const date = new Date(candle.time);
    const nextSessionKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;

    if (nextSessionKey !== sessionKey) {
      sessionKey = nextSessionKey;
      cumulativePriceVolume = 0;
      cumulativeVolume = 0;
    }

    cumulativePriceVolume += getSourceValue(candle, source) * candle.volume;
    cumulativeVolume += candle.volume;
    result[index] = cumulativeVolume > 0 ? cumulativePriceVolume / cumulativeVolume : null;
  });

  return result;
};

const calculateRsiValues = (values: number[], period: number) => {
  const result: Array<number | null> = new Array(values.length).fill(null);
  let averageGain = 0;
  let averageLoss = 0;

  for (let index = 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    if (index <= period) {
      averageGain += gain;
      averageLoss += loss;

      if (index === period) {
        averageGain /= period;
        averageLoss /= period;
      } else {
        continue;
      }
    } else {
      averageGain = (averageGain * (period - 1) + gain) / period;
      averageLoss = (averageLoss * (period - 1) + loss) / period;
    }

    if (averageLoss === 0) {
      result[index] = 100;
    } else {
      const relativeStrength = averageGain / averageLoss;
      result[index] = 100 - 100 / (1 + relativeStrength);
    }
  }

  return result;
};

const calculateMacdSeries = (values: number[], fastPeriod: number, slowPeriod: number, signalPeriod: number) => {
  const fast = exponentialMovingAverageValues(values, fastPeriod);
  const slow = exponentialMovingAverageValues(values, slowPeriod);
  const macd = values.map((_, index) =>
    fast[index] !== null && slow[index] !== null ? fast[index]! - slow[index]! : null
  );
  const signal = exponentialMovingAverageNullable(macd, signalPeriod);
  const histogram = macd.map((value, index) =>
    value !== null && signal[index] !== null ? value - signal[index]! : null
  );

  return { macd, signal, histogram };
};

const calculateStochasticSeries = (candles: Candle[], period: number, signalPeriod: number) => {
  const k: Array<number | null> = new Array(candles.length).fill(null);

  for (let index = period - 1; index < candles.length; index += 1) {
    const window = candles.slice(index - period + 1, index + 1);
    const highest = Math.max(...window.map((candle) => candle.high));
    const lowest = Math.min(...window.map((candle) => candle.low));
    const range = highest - lowest;
    k[index] = range === 0 ? 50 : ((candles[index].close - lowest) / range) * 100;
  }

  return { k, d: simpleMovingAverageNullable(k, signalPeriod) };
};

const calculateDonchianSeries = (candles: Candle[], period: number) => {
  const upper: Array<number | null> = new Array(candles.length).fill(null);
  const lower: Array<number | null> = new Array(candles.length).fill(null);
  const middle: Array<number | null> = new Array(candles.length).fill(null);

  for (let index = period - 1; index < candles.length; index += 1) {
    const window = candles.slice(index - period + 1, index + 1);
    const highest = Math.max(...window.map((candle) => candle.high));
    const lowest = Math.min(...window.map((candle) => candle.low));
    upper[index] = highest;
    lower[index] = lowest;
    middle[index] = (highest + lowest) / 2;
  }

  return { upper, lower, middle };
};

const calculateMomentumValues = (values: number[], period: number) =>
  values.map((value, index) => (index >= period ? value - values[index - period] : null));

const calculateRocValues = (values: number[], period: number) =>
  values.map((value, index) => {
    if (index < period || values[index - period] === 0) return null;
    return ((value - values[index - period]) / values[index - period]) * 100;
  });

const calculateAccumulationDistributionValues = (candles: Candle[]) => {
  const result: Array<number | null> = new Array(candles.length).fill(null);
  let runningTotal = 0;

  candles.forEach((candle, index) => {
    const range = candle.high - candle.low;
    const moneyFlowMultiplier = range === 0 ? 0 : ((candle.close - candle.low) - (candle.high - candle.close)) / range;
    runningTotal += moneyFlowMultiplier * candle.volume;
    result[index] = runningTotal;
  });

  return result;
};

const calculateAtrValues = (candles: Candle[], period: number) => {
  const trueRanges = candles.map((candle, index) => {
    const previousClose = candles[index - 1]?.close ?? candle.close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose)
    );
  });

  return simpleMovingAverageValues(trueRanges, period);
};

const computeIndicatorSeries = (indicator: ActiveIndicator, candles: Candle[]): IndicatorComputedSeries => {
  const definition = getIndicatorDefinition(indicator.definitionId);
  const settings = indicator.settings;
  const source = settings.source ?? definition.defaults.source ?? 'close';
  const values = getSourceValues(candles, source);
  const period = sanitizePeriod(settings.period, definition.defaults.period ?? 20);
  const fastPeriod = sanitizePeriod(settings.fastPeriod, definition.defaults.fastPeriod ?? 12);
  const slowPeriod = sanitizePeriod(settings.slowPeriod, definition.defaults.slowPeriod ?? 26);
  const signalPeriod = sanitizePeriod(settings.signalPeriod, definition.defaults.signalPeriod ?? 9);
  const stdDev = clamp(settings.stdDev ?? definition.defaults.stdDev ?? 2, 0.1, 10);
  const color = settings.color ?? definition.defaults.color ?? '#2962ff';
  const secondaryColor = settings.secondaryColor ?? definition.defaults.secondaryColor ?? '#ff6d00';
  const tertiaryColor = settings.tertiaryColor ?? definition.defaults.tertiaryColor ?? '#7c8da6';

  if (definition.formula === 'sma') {
    return { lines: [{ label: definition.shortName, color, values: simpleMovingAverageValues(values, period) }] };
  }

  if (definition.formula === 'ema') {
    return { lines: [{ label: definition.shortName, color, values: exponentialMovingAverageValues(values, period) }] };
  }

  if (definition.formula === 'wma') {
    return { lines: [{ label: definition.shortName, color, values: weightedMovingAverageValues(values, period) }] };
  }

  if (definition.formula === 'bb') {
    const bands = calculateBollingerBands(values, period, stdDev);
    return {
      fillColor: settings.fillColor ?? definition.defaults.fillColor,
      lines: [
        { label: 'Basis', color, values: bands.basis },
        { label: 'Upper', color: secondaryColor, values: bands.upper },
        { label: 'Lower', color: tertiaryColor, values: bands.lower },
      ],
    };
  }

  if (definition.formula === 'vwap') {
    return { lines: [{ label: definition.shortName, color, values: calculateVwapValues(candles, source) }] };
  }

  if (definition.formula === 'donchian') {
    const channels = calculateDonchianSeries(candles, period);
    return {
      lines: [
        { label: 'Upper', color, values: channels.upper },
        { label: 'Lower', color: secondaryColor, values: channels.lower },
        { label: 'Basis', color: tertiaryColor, values: channels.middle },
      ],
    };
  }

  if (definition.formula === 'rsi') {
    return {
      lines: [{ label: definition.shortName, color, values: calculateRsiValues(values, period) }],
      min: 0,
      max: 100,
      guideLines: [{ value: 70 }, { value: 30 }],
    };
  }

  if (definition.formula === 'macd') {
    const macd = calculateMacdSeries(values, fastPeriod, slowPeriod, signalPeriod);
    return {
      lines: [
        { label: 'MACD', color, values: macd.macd },
        { label: 'Signal', color: secondaryColor, values: macd.signal },
      ],
      histogram: macd.histogram,
      histogramPositive: '#26a69a',
      histogramNegative: '#ef5350',
    };
  }

  if (definition.formula === 'stochastic') {
    const stochastic = calculateStochasticSeries(candles, period, signalPeriod);
    return {
      lines: [
        { label: '%K', color, values: stochastic.k },
        { label: '%D', color: secondaryColor, values: stochastic.d },
      ],
      min: 0,
      max: 100,
      guideLines: [{ value: 80 }, { value: 20 }],
    };
  }

  if (definition.formula === 'momentum') {
    return {
      lines: [{ label: definition.shortName, color, values: calculateMomentumValues(values, period) }],
      guideLines: [{ value: 0 }],
    };
  }

  if (definition.formula === 'roc') {
    return {
      lines: [{ label: definition.shortName, color, values: calculateRocValues(values, period) }],
      guideLines: [{ value: 0 }],
    };
  }

  if (definition.formula === 'adl') {
    return { lines: [{ label: definition.shortName, color, values: calculateAccumulationDistributionValues(candles) }] };
  }

  if (definition.formula === 'atr') {
    return { lines: [{ label: definition.shortName, color, values: calculateAtrValues(candles, period) }] };
  }

  if (definition.formula === 'bb-percent' || definition.formula === 'bb-width') {
    const bands = calculateBollingerBands(values, period, stdDev);
    const lineValues = values.map((value, index) => {
      const upper = bands.upper[index];
      const lower = bands.lower[index];
      const basis = bands.basis[index];
      if (upper === null || lower === null || basis === null || upper === lower) return null;

      if (definition.formula === 'bb-percent') {
        return ((value - lower) / (upper - lower)) * 100;
      }

      return ((upper - lower) / basis) * 100;
    });

    return {
      lines: [{ label: definition.shortName, color, values: lineValues }],
      min: definition.formula === 'bb-percent' ? 0 : undefined,
      max: definition.formula === 'bb-percent' ? 100 : undefined,
      guideLines: definition.formula === 'bb-percent' ? [{ value: 80 }, { value: 20 }] : undefined,
    };
  }

  return { lines: [] };
};

const getIndicatorLegendName = (indicator: ActiveIndicator, symbol: string) => {
  const definition = getIndicatorDefinition(indicator.definitionId);
  const settings = indicator.settings;
  const source = settings.source ?? definition.defaults.source ?? 'close';
  const period = sanitizePeriod(settings.period, definition.defaults.period ?? 20);
  const fastPeriod = sanitizePeriod(settings.fastPeriod, definition.defaults.fastPeriod ?? 12);
  const slowPeriod = sanitizePeriod(settings.slowPeriod, definition.defaults.slowPeriod ?? 26);
  const signalPeriod = sanitizePeriod(settings.signalPeriod, definition.defaults.signalPeriod ?? 9);
  const stdDev = clamp(settings.stdDev ?? definition.defaults.stdDev ?? 2, 0.1, 10);

  if (definition.formula === 'volume') return `Vol · ${symbol.replace('USDT', '')}`;
  if (definition.formula === 'bb') return `BB ${period} SMA ${source} ${Number(stdDev.toFixed(2))}`;
  if (definition.formula === 'macd') return `MACD ${fastPeriod} ${slowPeriod} ${signalPeriod} ${source}`;
  if (definition.formula === 'vwap') return 'VWAP Session';
  if (definition.formula === 'donchian') return `DC ${period}`;
  if (definition.formula === 'stochastic') return `Stoch ${period} ${signalPeriod}`;
  if (definition.defaults.period !== undefined || settings.period !== undefined) {
    return `${definition.shortName} ${period} ${source}`;
  }

  return definition.shortName;
};

const formatIndicatorNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  if (Math.abs(value) >= 1000) return formatCompact(value);
  return value.toFixed(Math.abs(value) < 10 ? 2 : 2);
};

const focusMenuItem = (menuKey: MenuKey, index: number) => {
  window.requestAnimationFrame(() => {
    const items = Array.from(
      document.querySelectorAll<HTMLButtonElement>(`[data-menu-key="${menuKey}"]`)
    );
    items[index]?.focus();
  });
};

interface ToolbarDropdownProps<T extends string> {
  menuKey: MenuKey;
  label: string;
  options: Array<MenuOption<T>>;
  value: T;
  openMenu: MenuKey | null;
  setOpenMenu: (menu: MenuKey | null) => void;
  onChange: (value: T) => void;
  renderIcon?: (value: T) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

function ToolbarDropdown<T extends string>({
  menuKey,
  label,
  options,
  value,
  openMenu,
  setOpenMenu,
  onChange,
  renderIcon,
  align = 'left',
  className = '',
}: ToolbarDropdownProps<T>) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isOpen = openMenu === menuKey;
  const menuId = `${menuKey}-menu`;
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selectedOption = options[selectedIndex] || options[0];

  const closeMenu = () => {
    setOpenMenu(null);
    triggerRef.current?.focus();
  };

  const selectOption = (nextValue: T) => {
    onChange(nextValue);
    closeMenu();
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpenMenu(menuKey);
      focusMenuItem(menuKey, selectedIndex);
    }
  };

  const handleOptionKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    option: MenuOption<T>,
    index: number
  ) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusMenuItem(menuKey, (index + 1) % options.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusMenuItem(menuKey, (index - 1 + options.length) % options.length);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      focusMenuItem(menuKey, 0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      focusMenuItem(menuKey, options.length - 1);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectOption(option.value);
    }
  };

  return (
    <div className={`toolbar-dropdown align-${align} ${className}`} data-open={isOpen}>
      <button
        ref={triggerRef}
        type="button"
        className="toolbar-trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setOpenMenu(isOpen ? null : menuKey)}
        onKeyDown={handleTriggerKeyDown}
      >
        {renderIcon?.(selectedOption.value)}
        <span className="trigger-label">{selectedOption.shortLabel || selectedOption.label}</span>
        <span className="trigger-caret" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="toolbar-menu" id={menuId} role="menu" aria-label={label}>
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={option.value === value}
              className="toolbar-menu-item"
              data-active={option.value === value}
              data-menu-key={menuKey}
              data-menu-value={option.value}
              onClick={() => selectOption(option.value)}
              onKeyDown={(event) => handleOptionKeyDown(event, option, index)}
            >
              <span className="menu-check" aria-hidden="true" />
              {renderIcon?.(option.value)}
              <span className="menu-item-copy">
                <strong>{option.label}</strong>
                {option.description && <small>{option.description}</small>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface IndicatorsDropdownProps {
  count: number;
  openMenu: MenuKey | null;
  setOpenMenu: (menu: MenuKey | null) => void;
  activeIndicators: ActiveIndicator[];
  onAddIndicator: (definitionId: string) => void;
}

function IndicatorsDropdown({
  count,
  openMenu,
  setOpenMenu,
  activeIndicators,
  onAddIndicator,
}: IndicatorsDropdownProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<'Favorites' | 'Technicals' | IndicatorDefinition['category']>('Technicals');
  const isOpen = openMenu === 'indicators';
  const categories: Array<'Favorites' | 'Technicals' | IndicatorDefinition['category']> = [
    'Favorites',
    'Technicals',
    'Volume',
    'Trend',
    'Momentum',
    'Volatility',
  ];
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const options = INDICATOR_DEFINITIONS.filter((definition) => {
    const matchesCategory =
      category === 'Technicals' ||
      (category === 'Favorites' ? definition.featured : definition.category === category);
    const matchesSearch =
      normalizedQuery.length === 0 ||
      definition.name.toLowerCase().includes(normalizedQuery) ||
      definition.shortName.toLowerCase().includes(normalizedQuery) ||
      definition.description.toLowerCase().includes(normalizedQuery);

    return matchesCategory && matchesSearch;
  });

  const closeMenu = () => {
    setOpenMenu(null);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpenMenu('indicators');
      window.requestAnimationFrame(() => searchRef.current?.focus());
    }
  };

  const handleItemKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    option: (typeof options)[number],
    index: number
  ) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusMenuItem('indicators', (index + 1) % options.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusMenuItem('indicators', (index - 1 + options.length) % options.length);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onAddIndicator(option.id);
    }
  };

  useEffect(() => {
    if (isOpen) {
      window.requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [isOpen]);

  return (
    <div className="toolbar-dropdown indicator-dropdown align-right" data-open={isOpen}>
      <button
        ref={triggerRef}
        type="button"
        className="toolbar-trigger"
        aria-label={`Indicators, ${count} active`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="indicators-menu"
        onClick={() => setOpenMenu(isOpen ? null : 'indicators')}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="indicator-glyph" aria-hidden="true" />
        <span className="trigger-label">Indicators</span>
        <span className="indicator-count">{count}</span>
        <span className="trigger-caret" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className="toolbar-menu indicator-menu-panel"
          id="indicators-menu"
          role="dialog"
          aria-label="Indicators, metrics, and strategies"
        >
          <div className="indicator-picker-header">
            <strong>Indicators, metrics, and strategies</strong>
            <button type="button" className="picker-close" aria-label="Close indicators" onClick={closeMenu}>
              <span aria-hidden="true" />
            </button>
          </div>

          <label className="indicator-search">
            <span className="search-glyph" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') closeMenu();
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  focusMenuItem('indicators', 0);
                }
              }}
            />
          </label>

          <div className="indicator-picker-body">
            <div className="indicator-category-rail" aria-label="Indicator categories">
              <span>Personal</span>
              <button type="button" disabled>
                My scripts
              </button>
              <span>Built-in</span>
              {categories.map((nextCategory) => (
                <button
                  key={nextCategory}
                  type="button"
                  className="indicator-category-button"
                  data-active={category === nextCategory}
                  onClick={() => setCategory(nextCategory)}
                >
                  {nextCategory}
                </button>
              ))}
            </div>

            <div className="indicator-results" role="menu" aria-label={`${category} indicators`}>
              <div className="indicator-tabs" aria-hidden="true">
                <span data-active="true">Indicators</span>
                <span>Strategies</span>
                <span>Profiles</span>
                <span>Patterns</span>
              </div>
              <span className="indicator-results-label">Script name</span>
              {options.map((option, index) => {
                const active = activeIndicators.some((indicator) => indicator.definitionId === option.id);

                return (
                  <button
                    key={option.id}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={active}
                    className="toolbar-menu-item indicator-menu-item"
                    data-active={active}
                    data-menu-key="indicators"
                    data-menu-value={option.id}
                    onClick={() => onAddIndicator(option.id)}
                    onKeyDown={(event) => handleItemKeyDown(event, option, index)}
                  >
                    <span className="menu-check" aria-hidden="true" />
                    <span className="menu-item-copy">
                      <strong>{option.name}</strong>
                      <small>{option.description}</small>
                    </span>
                    <span className="indicator-kind">{option.shortName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const socketRef = useRef<WebSocket | null>(null);
  const controlRackRef = useRef<HTMLDivElement>(null);
  const indicatorLegendRef = useRef<HTMLDivElement>(null);
  const activeStreamRef = useRef('');
  const selectedMarketRef = useRef({ symbol: 'BTCUSDT', timeframe: '1m' });
  const manualPriceRangeRef = useRef<PriceRange | null>(null);
  const viewRangeRef = useRef<ViewRange>({
    startIndex: 0,
    endIndex: 100,
    candlesPerView: 100,
  });
  const dragStateRef = useRef<ChartDragState>({
    mode: 'none',
    startX: 0,
    startY: 0,
    startViewRange: {
      startIndex: 0,
      endIndex: 100,
      candlesPerView: 100,
    },
    startPriceRange: null,
    anchorPrice: 0,
  });
  const chartBounds = useRef({
    minPrice: 0,
    maxPrice: 0,
    chartArea: { left: 12, top: 34, width: 0, height: 0 },
  });

  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1m');
  const [chartStyle, setChartStyle] = useState<ChartStyle>('candles');
  const [theme, setTheme] = useState<ThemeName>('dark');
  const [activeIndicators, setActiveIndicators] = useState<ActiveIndicator[]>(DEFAULT_ACTIVE_INDICATORS);
  const [settingsTargetId, setSettingsTargetId] = useState<string | null>(null);
  const [moreTargetId, setMoreTargetId] = useState<string | null>(null);
  const [feedStatus, setFeedStatus] = useState<FeedStatus>('connecting');
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [mousePos, setMousePos] = useState<MousePosition | null>(null);
  const [dragMode, setDragMode] = useState<ChartDragMode>('none');
  const [pointerArea, setPointerArea] = useState<ChartPointerArea>('outside');
  const [manualPriceRange, setManualPriceRange] = useState<PriceRange | null>(null);
  const [viewRange, setViewRange] = useState<ViewRange>({
    startIndex: 0,
    endIndex: 100,
    candlesPerView: 100,
  });

  const palette = PALETTES[theme];
  const latestCandle = candles.length > 0 ? candles[candles.length - 1] : null;
  const previousCandle = candles.length > 1 ? candles[candles.length - 2] : null;
  const priceChange = latestCandle && previousCandle ? latestCandle.close - previousCandle.close : 0;
  const priceChangePercent = previousCandle ? (priceChange / previousCandle.close) * 100 : 0;
  const changeTone = priceChange >= 0 ? 'positive' : 'negative';
  const visibleIndicators = activeIndicators.filter((indicator) => indicator.visible);
  const visibleVolumeIndicator = visibleIndicators.find(
    (indicator) => getIndicatorDefinition(indicator.definitionId).pane === 'volume'
  );
  const visibleOscillatorIndicators = visibleIndicators.filter(
    (indicator) => getIndicatorDefinition(indicator.definitionId).pane === 'oscillator'
  );
  const indicatorCount = activeIndicators.length;
  const showVolume = visibleVolumeIndicator !== undefined;
  const activeIndicatorSeries = useMemo(() => {
    return activeIndicators.reduce<Record<string, IndicatorComputedSeries>>((seriesById, indicator) => {
      seriesById[indicator.id] = computeIndicatorSeries(indicator, candles);
      return seriesById;
    }, {});
  }, [activeIndicators, candles]);

  const getEstimatedChartWidth = () => {
    const canvasWidth = canvasRef.current?.getBoundingClientRect().width ?? 0;
    const measuredWidth = chartBounds.current.chartArea.width;

    if (measuredWidth > 0) return measuredWidth;
    if (canvasWidth > 0) return Math.max(160, canvasWidth - (canvasWidth < 520 ? 74 : 100));
    return 980;
  };

  const resetView = (sourceCandles = candles, nextTimeframe = timeframe) => {
    const chartWidth = getEstimatedChartWidth();
    const futureBars = getRightOffsetBars(chartWidth);
    const candlesPerView = getDefaultCandlesPerView(nextTimeframe, sourceCandles.length, chartWidth);
    const endIndex = sourceCandles.length + futureBars;

    setManualPriceRange(null);
    setViewRange(normalizeViewRange(endIndex - candlesPerView, candlesPerView, sourceCandles.length, futureBars));
  };

  const addIndicator = (definitionId: string) => {
    const definition = getIndicatorDefinition(definitionId);

    setActiveIndicators((current) => {
      if (definition.singleton) {
        const existing = current.find((indicator) => indicator.definitionId === definition.id);
        if (existing) {
          return current.map((indicator) =>
            indicator.id === existing.id ? { ...indicator, visible: true } : indicator
          );
        }
      }

      return [...current, createActiveIndicator(definition.id, `${Date.now()}-${current.length}`)];
    });
  };

  const removeIndicator = (indicatorId: string) => {
    setActiveIndicators((current) => current.filter((indicator) => indicator.id !== indicatorId));
    setSettingsTargetId((current) => (current === indicatorId ? null : current));
    setMoreTargetId((current) => (current === indicatorId ? null : current));
  };

  const toggleIndicatorVisibility = (indicatorId: string) => {
    setActiveIndicators((current) =>
      current.map((indicator) =>
        indicator.id === indicatorId ? { ...indicator, visible: !indicator.visible } : indicator
      )
    );
  };

  const updateIndicatorSettings = (indicatorId: string, settings: IndicatorSettings) => {
    setActiveIndicators((current) =>
      current.map((indicator) =>
        indicator.id === indicatorId
          ? { ...indicator, settings: { ...indicator.settings, ...settings } }
          : indicator
      )
    );
  };

  const duplicateIndicator = (indicatorId: string) => {
    setActiveIndicators((current) => {
      const sourceIndicator = current.find((indicator) => indicator.id === indicatorId);
      if (!sourceIndicator) return current;

      return [
        ...current,
        {
          ...sourceIndicator,
          id: `${sourceIndicator.definitionId}-${Date.now()}-${current.length}`,
        },
      ];
    });
    setMoreTargetId(null);
  };

  const moveIndicator = (indicatorId: string, direction: -1 | 1) => {
    setActiveIndicators((current) => {
      const index = current.findIndex((indicator) => indicator.id === indicatorId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;

      const next = [...current];
      const [indicator] = next.splice(index, 1);
      if (!indicator) return current;
      next.splice(nextIndex, 0, indicator);
      return next;
    });
    setMoreTargetId(null);
  };

  useEffect(() => {
    viewRangeRef.current = viewRange;
  }, [viewRange]);

  useEffect(() => {
    manualPriceRangeRef.current = manualPriceRange;
  }, [manualPriceRange]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (!controlRackRef.current?.contains(target)) {
        setOpenMenu(null);
      }

      if (!indicatorLegendRef.current?.contains(target)) {
        setSettingsTargetId(null);
        setMoreTargetId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    selectedMarketRef.current = { symbol, timeframe };
  }, [symbol, timeframe]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setFeedStatus('connecting');

      try {
        const response = await fetch(
          `/api/binance?symbol=${symbol}&interval=${timeframe}&limit=1000`,
          { signal: controller.signal }
        );
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || `Market data request failed with ${response.status}.`);
        }

        const formattedCandles = parseCandles(payload);
        setCandles(formattedCandles);
        resetView(formattedCandles, timeframe);
      } catch (fetchError) {
        if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;

        setCandles([]);
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch market data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, [symbol, timeframe, refreshNonce]);

  useEffect(() => {
    let isActive = true;
    const ws = new WebSocket('wss://stream.binance.com:9443/ws');
    socketRef.current = ws;

    const sendStreamRequest = (method: 'SUBSCRIBE' | 'UNSUBSCRIBE', stream: string) => {
      if (ws.readyState !== WebSocket.OPEN) return;

      ws.send(
        JSON.stringify({
          method,
          params: [stream],
          id: Date.now(),
        })
      );
    };

    ws.onopen = () => {
      if (!isActive) return;

      const current = selectedMarketRef.current;
      const stream = `${current.symbol.toLowerCase()}@kline_${current.timeframe}`;
      activeStreamRef.current = stream;
      sendStreamRequest('SUBSCRIBE', stream);
      setFeedStatus('live');
    };
    ws.onerror = () => {
      if (isActive) setFeedStatus('offline');
    };
    ws.onclose = () => {
      if (isActive) setFeedStatus('offline');
    };

    ws.onmessage = (event) => {
      if (!isActive) return;

      const data = JSON.parse(event.data);
      if (data.result !== undefined || !data.k) return;

      const current = selectedMarketRef.current;
      if (data.s !== current.symbol || data.k.i !== current.timeframe) return;

      const newCandle: Candle = {
        time: Number(data.k.t),
        open: Number(data.k.o),
        high: Number(data.k.h),
        low: Number(data.k.l),
        close: Number(data.k.c),
        volume: Number(data.k.v),
      };

      if (Object.values(newCandle).some((value) => !Number.isFinite(value))) return;

      setCandles((previous) => {
        const updated = [...previous];
        const lastCandle = updated[updated.length - 1];
        const currentRange = viewRangeRef.current;
        const wasPinnedToLatest = currentRange.endIndex >= previous.length;
        const futureBars = Math.max(0, currentRange.endIndex - previous.length);

        if (lastCandle && lastCandle.time === newCandle.time) {
          updated[updated.length - 1] = newCandle;
        } else if (!lastCandle || newCandle.time > lastCandle.time) {
          updated.push(newCandle);

          if (wasPinnedToLatest) {
            setViewRange((current) => {
              const nextStartIndex = clamp(
                updated.length + futureBars - current.candlesPerView,
                0,
                getMaxStartIndex(updated.length, current.candlesPerView)
              );

              return {
                ...current,
                startIndex: nextStartIndex,
                endIndex: nextStartIndex + current.candlesPerView,
              };
            });
          }
        }

        return updated;
      });
    };

    return () => {
      isActive = false;
      activeStreamRef.current = '';
      ws.close();
    };
  }, []);

  useEffect(() => {
    const ws = socketRef.current;
    const nextStream = `${symbol.toLowerCase()}@kline_${timeframe}`;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setFeedStatus('connecting');
      return;
    }

    if (activeStreamRef.current && activeStreamRef.current !== nextStream) {
      ws.send(
        JSON.stringify({
          method: 'UNSUBSCRIBE',
          params: [activeStreamRef.current],
          id: Date.now(),
        })
      );
    }

    if (activeStreamRef.current !== nextStream) {
      ws.send(
        JSON.stringify({
          method: 'SUBSCRIBE',
          params: [nextStream],
          id: Date.now(),
        })
      );
      activeStreamRef.current = nextStream;
    }

    setFeedStatus('live');
  }, [symbol, timeframe]);

  const formatTime = (timestamp: number, detailed = false) => {
    const date = new Date(timestamp);

    if (detailed) {
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    if (timeframe.includes('d') || timeframe.includes('w') || timeframe.includes('M')) {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    if (timeframe.includes('h')) {
      return date.toLocaleString(undefined, { day: 'numeric', hour: '2-digit' });
    }

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPointerArea = (x: number, y: number): ChartPointerArea => {
    const { chartArea } = chartBounds.current;
    const right = chartArea.left + chartArea.width;
    const bottom = chartArea.top + chartArea.height;

    if (chartArea.width <= 0 || chartArea.height <= 0) return 'outside';

    if (x >= right && y >= chartArea.top && y <= bottom) return 'price-scale';
    if (x >= chartArea.left && x <= right && y >= chartArea.top && y <= bottom) return 'plot';
    if (x >= chartArea.left && x <= right && y > bottom) return 'time-scale';

    return 'outside';
  };

  const getCurrentPriceRange = (): PriceRange | null => {
    const manual = manualPriceRangeRef.current;
    if (manual && manual.maxPrice > manual.minPrice) return manual;

    const { minPrice, maxPrice } = chartBounds.current;
    if (Number.isFinite(minPrice) && Number.isFinite(maxPrice) && maxPrice > minPrice) {
      return { minPrice, maxPrice };
    }

    return null;
  };

  const getPriceAtY = (y: number, range: PriceRange) => {
    const { chartArea } = chartBounds.current;
    const localY = clamp(y - chartArea.top, 0, Math.max(1, chartArea.height));
    return range.maxPrice - (localY / Math.max(1, chartArea.height)) * (range.maxPrice - range.minPrice);
  };

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    if (!candles.length) return;
    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const { chartArea } = chartBounds.current;
    const chartWidth = chartArea.width || getEstimatedChartWidth();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const area = getPointerArea(x, y);
    const wheelScale = Math.exp(clamp(event.deltaY / 100, -3, 3) * 0.16);

    if (area === 'price-scale') {
      const currentPriceRange = getCurrentPriceRange();
      if (!currentPriceRange) return;

      const anchorPrice = getPriceAtY(y, currentPriceRange);
      setManualPriceRange(scalePriceRange(currentPriceRange, anchorPrice, wheelScale));
      return;
    }

    if (area !== 'plot' && area !== 'time-scale') return;

    const visibleBars = Math.max(1, viewRange.endIndex - viewRange.startIndex);
    const candleWidth = chartWidth / visibleBars;

    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      const panPixels = event.shiftKey && Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      const panBars = panPixels / Math.max(1, candleWidth);

      if (panBars !== 0) {
        setViewRange(normalizeViewRange(viewRange.startIndex + panBars, visibleBars, candles.length));
      }
      return;
    }

    const newCandlesPerView = Math.round(
      clamp(visibleBars * wheelScale, MIN_VISIBLE_BARS, Math.min(MAX_VISIBLE_BARS, candles.length + MAX_FUTURE_BARS))
    );
    const mouseRatio = clamp((event.clientX - rect.left - chartArea.left) / chartWidth, 0, 1);
    const pointerIndex = viewRange.startIndex + mouseRatio * viewRange.candlesPerView;
    const newStartIndex = pointerIndex - newCandlesPerView * mouseRatio;

    setViewRange(normalizeViewRange(newStartIndex, newCandlesPerView, candles.length));
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!candles.length) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const area = getPointerArea(x, y);

    if (area === 'outside') return;

    const currentPriceRange = getCurrentPriceRange();
    const mode: ChartDragMode = area === 'price-scale' ? 'price-scale' : 'chart-pan';

    if (mode === 'price-scale' && !currentPriceRange) return;
    if (mode === 'price-scale' && currentPriceRange) {
      setManualPriceRange(currentPriceRange);
    }

    dragStateRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startViewRange: viewRangeRef.current,
      startPriceRange: mode === 'price-scale' || manualPriceRangeRef.current ? currentPriceRange : null,
      anchorPrice: currentPriceRange ? getPriceAtY(y, currentPriceRange) : 0,
    };
    setDragMode(mode);
    event.preventDefault();
  };

  const handleMouseUp = () => {
    dragStateRef.current = {
      ...dragStateRef.current,
      mode: 'none',
    };
    setDragMode('none');
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const area = getPointerArea(x, y);
    setPointerArea(area);

    const dragState = dragStateRef.current;
    if (dragState.mode !== 'none' && candles.length) {
      const { chartArea } = chartBounds.current;
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;

      if (dragState.mode === 'price-scale' && dragState.startPriceRange) {
        const scaleFactor = Math.exp((deltaY / Math.max(1, chartArea.height)) * Y_AXIS_SCALE_SPEED);
        setManualPriceRange(scalePriceRange(dragState.startPriceRange, dragState.anchorPrice, scaleFactor));
      } else if (dragState.mode === 'chart-pan') {
        const { startViewRange } = dragState;
        const candleWidth = chartArea.width / Math.max(1, startViewRange.candlesPerView);
        const candlesDelta = deltaX / Math.max(1, candleWidth);
        const maxStartIndex = getMaxStartIndex(candles.length, startViewRange.candlesPerView);
        const newStartIndex = clamp(startViewRange.startIndex - candlesDelta, 0, maxStartIndex);

        setViewRange({
          ...startViewRange,
          startIndex: newStartIndex,
          endIndex: newStartIndex + startViewRange.candlesPerView,
        });

        if (dragState.startPriceRange && manualPriceRangeRef.current) {
          const priceRange = dragState.startPriceRange.maxPrice - dragState.startPriceRange.minPrice;
          const priceDelta = (deltaY / Math.max(1, chartArea.height)) * priceRange;

          setManualPriceRange({
            minPrice: dragState.startPriceRange.minPrice + priceDelta,
            maxPrice: dragState.startPriceRange.maxPrice + priceDelta,
          });
        }
      }
    }

    const currentPriceRange = getCurrentPriceRange();
    if (currentPriceRange) {
      setMousePos({ x, y, dataY: getPriceAtY(y, currentPriceRange) });
    } else {
      setMousePos({ x, y, dataY: 0 });
    }
  };

  const handleMouseLeave = () => {
    setMousePos(null);
    setPointerArea('outside');
    handleMouseUp();
  };

  const drawLinePath = (
    ctx: CanvasRenderingContext2D,
    points: Array<{ x: number; y: number }>,
    strokeStyle: string,
    lineWidth = 2
  ) => {
    if (points.length < 2) return;

    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
  };

  const drawChart = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const background = ctx.createLinearGradient(0, 0, 0, rect.height);
    background.addColorStop(0, palette.canvasTop);
    background.addColorStop(1, palette.canvasBottom);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (candles.length === 0) return;

    const rightAxisWidth = rect.width < 520 ? 64 : 82;
    const bottomAxisHeight = rect.width < 520 ? 27 : 34;
    const topLegendHeight = rect.width < 520 ? 26 : 34;
    const oscillatorCount = visibleOscillatorIndicators.length;
    const requestedVolumeHeight = showVolume ? clamp(rect.height * 0.15, 46, 96) : 0;
    const minMainChartHeight = rect.width < 520 ? 176 : 220;
    const availableAuxHeight = Math.max(
      0,
      rect.height - bottomAxisHeight - topLegendHeight - minMainChartHeight
    );
    const paneGap = 10;
    const volumeHeight = showVolume ? Math.min(requestedVolumeHeight, Math.max(42, availableAuxHeight * 0.38)) : 0;
    const availablePaneHeight = Math.max(
      0,
      availableAuxHeight - volumeHeight - (showVolume && oscillatorCount > 0 ? paneGap : 0)
    );
    const oscillatorPaneHeight =
      oscillatorCount > 0
        ? clamp(
            (availablePaneHeight - paneGap * Math.max(0, oscillatorCount - 1)) / oscillatorCount,
            58,
            104
          )
        : 0;
    const oscillatorTotalHeight =
      oscillatorCount > 0
        ? oscillatorPaneHeight * oscillatorCount + paneGap * Math.max(0, oscillatorCount - 1)
        : 0;
    const chartArea = {
      left: rect.width < 520 ? 8 : 12,
      top: topLegendHeight,
      width: Math.max(80, rect.width - rightAxisWidth - (rect.width < 520 ? 10 : 18)),
      height: Math.max(
        120,
        rect.height -
          bottomAxisHeight -
          topLegendHeight -
          volumeHeight -
          oscillatorTotalHeight -
          (showVolume ? paneGap : 0) -
          (oscillatorCount > 0 ? paneGap : 0)
      ),
    };
    const volumeArea = {
      left: chartArea.left,
      top: chartArea.top + chartArea.height + 10,
      width: chartArea.width,
      height: Math.max(0, volumeHeight - 14),
    };
    const oscillatorStartTop =
      chartArea.top +
      chartArea.height +
      (showVolume ? volumeHeight + paneGap : 0) +
      (oscillatorCount > 0 ? paneGap : 0);
    const oscillatorPaneAreas = visibleOscillatorIndicators.map((indicator, index) => ({
      indicator,
      left: chartArea.left,
      top: oscillatorStartTop + index * (oscillatorPaneHeight + paneGap),
      width: chartArea.width,
      height: oscillatorPaneHeight,
    }));

    const visibleIndexedCandles: Array<{ candle: Candle; index: number }> = [];
    const firstVisibleIndex = Math.max(0, Math.floor(viewRange.startIndex));
    const lastVisibleIndex = Math.min(candles.length - 1, Math.ceil(viewRange.endIndex) - 1);

    for (let index = firstVisibleIndex; index <= lastVisibleIndex; index += 1) {
      if (index + 1 > viewRange.startIndex && index < viewRange.endIndex) {
        const candle = candles[index];
        if (candle) visibleIndexedCandles.push({ candle, index });
      }
    }

    const priceSource = visibleIndexedCandles.length > 0
      ? visibleIndexedCandles.map(({ candle }) => candle)
      : [latestCandle!];
    const visiblePriceIndicators = visibleIndicators.filter(
      (indicator) => getIndicatorDefinition(indicator.definitionId).pane === 'price'
    );
    const indicatorPrices = visiblePriceIndicators.flatMap((indicator) => {
      const computed = activeIndicatorSeries[indicator.id];
      if (!computed) return [];

      return computed.lines.flatMap((line) =>
        visibleIndexedCandles
          .map(({ index }) => line.values[index])
          .filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value))
      );
    });
    const prices = [...priceSource.flatMap((candle) => [candle.high, candle.low]), ...indicatorPrices];
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const rawPriceRange = maxPrice - minPrice || Math.max(1, maxPrice * 0.001);
    const padding = rawPriceRange * 0.08;
    const autoPriceRange = {
      minPrice: minPrice - padding,
      maxPrice: maxPrice + padding,
    };
    const activePriceRange = manualPriceRange ?? autoPriceRange;
    const minPaddedPrice = activePriceRange.minPrice;
    const maxPaddedPrice = activePriceRange.maxPrice;
    const paddedPriceRange = maxPaddedPrice - minPaddedPrice || 1;

    chartBounds.current = {
      minPrice: minPaddedPrice,
      maxPrice: maxPaddedPrice,
      chartArea,
    };

    const priceToY = (price: number) =>
      chartArea.top + ((maxPaddedPrice - price) / paddedPriceRange) * chartArea.height;
    const candleSpacing = chartArea.width / Math.max(1, viewRange.candlesPerView);
    const candleWidth = clamp(candleSpacing * 0.64, 1, 12);
    const xForIndex = (index: number) => chartArea.left + (index - viewRange.startIndex + 0.5) * candleSpacing;
    const intervalMs = timeframeToMilliseconds(timeframe);
    const timeForIndex = (index: number) => {
      const exactCandle = candles[Math.floor(index)];
      if (exactCandle) return exactCandle.time;

      const firstCandle = candles[0];
      const lastCandleInData = candles[candles.length - 1];
      if (!firstCandle || !lastCandleInData) return Date.now();
      if (index < 0) return firstCandle.time + index * intervalMs;

      return lastCandleInData.time + (index - (candles.length - 1)) * intervalMs;
    };
    const priceTickInfo = createPriceTicks(minPaddedPrice, maxPaddedPrice, chartArea.height);
    const timeTicks = createTimelineTicks(viewRange, candles, timeframe, chartArea.width, rect.width < 620)
      .map((tick) => ({
        ...tick,
        x: xForIndex(tick.index),
      }))
      .filter((tick) => tick.x >= chartArea.left && tick.x <= chartArea.left + chartArea.width);

    ctx.save();
    ctx.beginPath();
    ctx.rect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
    ctx.clip();

    ctx.font = '11px var(--font-geist-sans), ui-sans-serif, sans-serif';
    ctx.lineWidth = 1;

    for (const price of priceTickInfo.ticks) {
      const y = priceToY(price);
      if (y < chartArea.top || y > chartArea.top + chartArea.height) continue;

      ctx.strokeStyle =
        Math.abs(price - latestCandle!.close) < priceTickInfo.step * 0.1 ? palette.gridStrong : palette.grid;
      ctx.beginPath();
      ctx.moveTo(chartArea.left, y);
      ctx.lineTo(chartArea.left + chartArea.width, y);
      ctx.stroke();
    }

    for (const tick of timeTicks) {
      ctx.strokeStyle = tick.major ? palette.gridStrong : palette.grid;
      ctx.beginPath();
      ctx.moveTo(tick.x, chartArea.top);
      ctx.lineTo(tick.x, chartArea.top + chartArea.height);
      ctx.stroke();
    }

    const closePoints = visibleIndexedCandles.map(({ candle, index }) => ({
      x: xForIndex(index),
      y: priceToY(candle.close),
    }));

    if (chartStyle === 'area' && closePoints.length > 0) {
      const areaFill = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.top + chartArea.height);
      areaFill.addColorStop(0, theme === 'dark' ? 'rgba(85, 167, 255, 0.34)' : 'rgba(11, 114, 217, 0.28)');
      areaFill.addColorStop(1, 'rgba(85, 167, 255, 0)');

      ctx.fillStyle = areaFill;
      ctx.beginPath();
      closePoints.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.lineTo(closePoints[closePoints.length - 1].x, chartArea.top + chartArea.height);
      ctx.lineTo(closePoints[0].x, chartArea.top + chartArea.height);
      ctx.closePath();
      ctx.fill();
      drawLinePath(ctx, closePoints, palette.line, 2.2);
    } else if (chartStyle === 'line') {
      drawLinePath(ctx, closePoints, palette.line, 2.2);
    } else {
      visibleIndexedCandles.forEach(({ candle, index }) => {
        const x = xForIndex(index);
        const highY = priceToY(candle.high);
        const lowY = priceToY(candle.low);
        const openY = priceToY(candle.open);
        const closeY = priceToY(candle.close);
        const isBullish = candle.close >= candle.open;

        ctx.strokeStyle = isBullish ? palette.green : palette.red;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        const bodyHeight = Math.max(1, Math.abs(closeY - openY));
        const bodyY = Math.min(openY, closeY);
        ctx.fillStyle = isBullish ? palette.green : palette.red;
        ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
      });
    }

    visiblePriceIndicators.forEach((indicator) => {
      const computed = activeIndicatorSeries[indicator.id];
      if (!computed) return;

      const definition = getIndicatorDefinition(indicator.definitionId);
      const upperLine = computed.lines.find((line) => line.label === 'Upper');
      const lowerLine = computed.lines.find((line) => line.label === 'Lower');

      if (definition.formula === 'bb' && computed.fillColor && upperLine && lowerLine) {
        const upperPoints = visibleIndexedCandles
          .map(({ index }) => {
            const value = upperLine.values[index];
            return value === null || value === undefined ? null : { x: xForIndex(index), y: priceToY(value) };
          })
          .filter((point): point is { x: number; y: number } => point !== null);
        const lowerPoints = visibleIndexedCandles
          .map(({ index }) => {
            const value = lowerLine.values[index];
            return value === null || value === undefined ? null : { x: xForIndex(index), y: priceToY(value) };
          })
          .filter((point): point is { x: number; y: number } => point !== null);

        if (upperPoints.length > 1 && lowerPoints.length > 1) {
          ctx.fillStyle = computed.fillColor;
          ctx.beginPath();
          upperPoints.forEach((point, index) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          [...lowerPoints].reverse().forEach((point) => {
            ctx.lineTo(point.x, point.y);
          });
          ctx.closePath();
          ctx.fill();
        }
      }

      computed.lines.forEach((line) => {
        const points = visibleIndexedCandles
          .map(({ index }) => {
            const value = line.values[index];
            return value === null || value === undefined ? null : { x: xForIndex(index), y: priceToY(value) };
          })
          .filter((point): point is { x: number; y: number } => point !== null);

        drawLinePath(ctx, points, line.color, definition.formula === 'bb' ? 1.25 : 1.7);
      });
    });

    const currentPriceY = priceToY(latestCandle!.close);
    const currentPriceColor = latestCandle!.close >= latestCandle!.open ? palette.green : palette.red;
    const currentPriceInside =
      currentPriceY >= chartArea.top && currentPriceY <= chartArea.top + chartArea.height;

    if (currentPriceInside) {
      ctx.strokeStyle = currentPriceColor;
      ctx.setLineDash([1.5, 3]);
      ctx.beginPath();
      ctx.moveTo(chartArea.left, currentPriceY);
      ctx.lineTo(chartArea.left + chartArea.width, currentPriceY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    if (showVolume && volumeArea.height > 0) {
      const maxVolume = Math.max(...visibleIndexedCandles.map(({ candle }) => candle.volume), 1);
      const volumeDefinition = visibleVolumeIndicator
        ? getIndicatorDefinition(visibleVolumeIndicator.definitionId)
        : getIndicatorDefinition('volume');
      const volumeUpColor =
        visibleVolumeIndicator?.settings.color ?? volumeDefinition.defaults.color ?? palette.greenSoft;
      const volumeDownColor =
        visibleVolumeIndicator?.settings.secondaryColor ?? volumeDefinition.defaults.secondaryColor ?? palette.redSoft;
      ctx.strokeStyle = palette.grid;
      ctx.beginPath();
      ctx.moveTo(volumeArea.left, volumeArea.top);
      ctx.lineTo(volumeArea.left + volumeArea.width, volumeArea.top);
      ctx.stroke();

      visibleIndexedCandles.forEach(({ candle, index }) => {
        const x = xForIndex(index);
        const barHeight = Math.max(1, (candle.volume / maxVolume) * volumeArea.height);
        ctx.globalAlpha = theme === 'dark' ? 0.42 : 0.34;
        ctx.fillStyle = candle.close >= candle.open ? volumeUpColor : volumeDownColor;
        ctx.fillRect(x - candleWidth / 2, volumeArea.top + volumeArea.height - barHeight, candleWidth, barHeight);
        ctx.globalAlpha = 1;
      });

      ctx.fillStyle = palette.text;
      ctx.font = '11px var(--font-geist-sans), ui-sans-serif, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Vol ${formatCompact(latestCandle!.volume)}`, volumeArea.left + 2, volumeArea.top + 14);
    }

    oscillatorPaneAreas.forEach((pane) => {
      const computed = activeIndicatorSeries[pane.indicator.id];
      const definition = getIndicatorDefinition(pane.indicator.definitionId);
      if (!computed || pane.height <= 0) return;

      const visibleValues = [
        ...computed.lines.flatMap((line) =>
          visibleIndexedCandles
            .map(({ index }) => line.values[index])
            .filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value))
        ),
        ...(computed.histogram
          ? visibleIndexedCandles
              .map(({ index }) => computed.histogram?.[index])
              .filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value))
          : []),
        ...(computed.guideLines?.map((guide) => guide.value) ?? []),
      ];

      if (visibleValues.length === 0) return;

      const rawMin = computed.min ?? Math.min(...visibleValues);
      const rawMax = computed.max ?? Math.max(...visibleValues);
      const range = rawMax - rawMin || Math.max(1, Math.abs(rawMax) * 0.1);
      const minValue = rawMin - range * 0.08;
      const maxValue = rawMax + range * 0.08;
      const valueRange = maxValue - minValue || 1;
      const valueToY = (value: number) => pane.top + ((maxValue - value) / valueRange) * pane.height;

      ctx.save();
      ctx.beginPath();
      ctx.rect(pane.left, pane.top, pane.width, pane.height);
      ctx.clip();

      ctx.fillStyle = theme === 'dark' ? 'rgba(13, 18, 27, 0.46)' : 'rgba(255, 255, 255, 0.42)';
      ctx.fillRect(pane.left, pane.top, pane.width, pane.height);

      const tickInfo = createPriceTicks(minValue, maxValue, pane.height);
      tickInfo.ticks.forEach((tick) => {
        const y = valueToY(tick);
        if (y < pane.top || y > pane.top + pane.height) return;

        ctx.strokeStyle = palette.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pane.left, y);
        ctx.lineTo(pane.left + pane.width, y);
        ctx.stroke();
      });

      computed.guideLines?.forEach((guide) => {
        const y = valueToY(guide.value);
        ctx.strokeStyle = palette.gridStrong;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(pane.left, y);
        ctx.lineTo(pane.left + pane.width, y);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      if (computed.histogram) {
        const zeroY = valueToY(0);
        visibleIndexedCandles.forEach(({ index }) => {
          const value = computed.histogram?.[index];
          if (value === null || value === undefined) return;

          const x = xForIndex(index);
          const y = valueToY(value);
          ctx.fillStyle = value >= 0 ? computed.histogramPositive ?? palette.greenSoft : computed.histogramNegative ?? palette.redSoft;
          ctx.fillRect(
            x - candleWidth / 2,
            Math.min(zeroY, y),
            Math.max(1, candleWidth),
            Math.max(1, Math.abs(zeroY - y))
          );
        });
      }

      computed.lines.forEach((line) => {
        const points = visibleIndexedCandles
          .map(({ index }) => {
            const value = line.values[index];
            return value === null || value === undefined ? null : { x: xForIndex(index), y: valueToY(value) };
          })
          .filter((point): point is { x: number; y: number } => point !== null);

        drawLinePath(ctx, points, line.color, 1.35);
      });

      ctx.restore();

      ctx.strokeStyle = palette.axisBorder;
      ctx.beginPath();
      ctx.moveTo(pane.left, pane.top);
      ctx.lineTo(pane.left + pane.width, pane.top);
      ctx.lineTo(pane.left + pane.width, pane.top + pane.height);
      ctx.stroke();

      ctx.fillStyle = palette.text;
      ctx.font = '11px var(--font-geist-mono), ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(getIndicatorLegendName(pane.indicator, symbol), pane.left + 2, pane.top + 14);

      ctx.textAlign = 'right';
      ctx.fillText(formatIndicatorNumber(rawMax), rect.width - 8, pane.top + 14);
      ctx.fillText(formatIndicatorNumber(rawMin), rect.width - 8, pane.top + pane.height - 6);

      if (definition.formula === 'rsi' || definition.formula === 'stochastic') {
        ctx.fillText('50.00', rect.width - 8, valueToY(50) + 4);
      }
    });

    ctx.strokeStyle = palette.axisBorder;
    ctx.beginPath();
    ctx.moveTo(chartArea.left + chartArea.width, chartArea.top);
    ctx.lineTo(chartArea.left + chartArea.width, chartArea.top + chartArea.height);
    ctx.lineTo(chartArea.left, chartArea.top + chartArea.height);
    ctx.stroke();

    if (currentPriceInside) {
      const countdown = formatCountdown(timeframe, latestCandle!.time);
      const markerHeight = countdown ? 32 : 24;
      const markerY = clamp(
        currentPriceY - markerHeight / 2,
        chartArea.top,
        chartArea.top + chartArea.height - markerHeight
      );

      ctx.fillStyle = currentPriceColor;
      ctx.fillRect(chartArea.left + chartArea.width + 1, markerY, rightAxisWidth - 6, markerHeight);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px var(--font-geist-mono), ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(formatPrice(latestCandle!.close), chartArea.left + chartArea.width + 7, markerY + 14);

      if (countdown) {
        ctx.globalAlpha = 0.84;
        ctx.font = '10px var(--font-geist-mono), ui-monospace, monospace';
        ctx.fillText(countdown, chartArea.left + chartArea.width + 7, markerY + 27);
        ctx.globalAlpha = 1;
      }
    }

    ctx.font = '11px var(--font-geist-mono), ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = palette.text;
    for (const price of priceTickInfo.ticks) {
      const y = priceToY(price);
      if (y < chartArea.top + 8 || y > chartArea.top + chartArea.height - 8) continue;
      ctx.fillText(formatPrice(price), rect.width - 8, y + 4);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = palette.text;
    for (const tick of timeTicks) {
      const labelWidth = ctx.measureText(tick.label).width;
      const labelX = clamp(
        tick.x,
        chartArea.left + labelWidth / 2,
        chartArea.left + chartArea.width - labelWidth / 2
      );
      ctx.fillText(tick.label, labelX, rect.height - 10);
    }

    let activeLogicalIndex = visibleIndexedCandles[visibleIndexedCandles.length - 1]?.index ?? candles.length - 1;
    const crosshairInside =
      mousePos &&
      mousePos.x >= chartArea.left &&
      mousePos.x <= chartArea.left + chartArea.width &&
      mousePos.y >= chartArea.top &&
      mousePos.y <= chartArea.top + chartArea.height;

    if (crosshairInside) {
      const crosshairRatio = clamp((mousePos.x - chartArea.left) / chartArea.width, 0, 1);
      const crosshairLogicalIndex = Math.floor(viewRange.startIndex + crosshairRatio * viewRange.candlesPerView);
      activeLogicalIndex = clamp(crosshairLogicalIndex, 0, candles.length - 1);

      ctx.strokeStyle = palette.crosshair;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(mousePos.x, chartArea.top);
      ctx.lineTo(mousePos.x, chartArea.top + chartArea.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(chartArea.left, mousePos.y);
      ctx.lineTo(chartArea.left + chartArea.width, mousePos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const priceLabel = formatPrice(mousePos.dataY);
      ctx.fillStyle = palette.axisBg;
      ctx.fillRect(chartArea.left + chartArea.width + 1, mousePos.y - 11, rightAxisWidth - 6, 22);
      ctx.fillStyle = palette.textBright;
      ctx.font = '12px var(--font-geist-mono), ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(priceLabel, chartArea.left + chartArea.width + 7, mousePos.y + 4);

      const timeLabel = formatTime(timeForIndex(crosshairLogicalIndex), true);
      const timeLabelWidth = ctx.measureText(timeLabel).width + 18;
      const labelX = clamp(mousePos.x - timeLabelWidth / 2, chartArea.left, chartArea.left + chartArea.width - timeLabelWidth);
      ctx.fillStyle = palette.axisBg;
      ctx.fillRect(labelX, chartArea.top + chartArea.height + 2, timeLabelWidth, 22);
      ctx.fillStyle = palette.textBright;
      ctx.textAlign = 'center';
      ctx.fillText(timeLabel, labelX + timeLabelWidth / 2, chartArea.top + chartArea.height + 17);
    }

    const activeCandle = candles[activeLogicalIndex] ?? latestCandle!;
    const activeChange = activeCandle.close - activeCandle.open;
    const activeTone = activeChange >= 0 ? palette.green : palette.red;
    const ohlc = [
      `${formatSymbol(symbol)} ${timeframe.toUpperCase()}`,
      `O ${formatPrice(activeCandle.open)}`,
      `H ${formatPrice(activeCandle.high)}`,
      `L ${formatPrice(activeCandle.low)}`,
      `C ${formatPrice(activeCandle.close)}`,
      `${activeChange >= 0 ? '+' : ''}${formatPrice(activeChange)}`,
    ];
    ctx.font = '12px var(--font-geist-mono), ui-monospace, monospace';
    ctx.textAlign = 'left';
    let legendX = chartArea.left + 2;
    ohlc.forEach((text, index) => {
      ctx.fillStyle = index === 0 ? palette.textBright : index === ohlc.length - 1 ? activeTone : palette.text;
      ctx.fillText(text, legendX, 18);
      legendX += ctx.measureText(text).width + (rect.width < 620 ? 8 : 14);
    });

  };

  useEffect(() => {
    const animate = () => {
      drawChart();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    candles,
    mousePos,
    viewRange,
    manualPriceRange,
    chartStyle,
    activeIndicators,
    activeIndicatorSeries,
    showVolume,
    theme,
    symbol,
    timeframe,
  ]);

  const canvasCursor =
    dragMode === 'price-scale'
      ? 'ns-resize'
      : dragMode === 'chart-pan'
        ? 'grabbing'
        : pointerArea === 'price-scale'
          ? 'ns-resize'
          : pointerArea === 'time-scale'
            ? 'ew-resize'
            : 'crosshair';

  const legendIndex = (() => {
    if (candles.length === 0) return -1;

    const { chartArea } = chartBounds.current;
    const mouseInsideMainPane =
      mousePos &&
      mousePos.x >= chartArea.left &&
      mousePos.x <= chartArea.left + chartArea.width &&
      mousePos.y >= chartArea.top &&
      mousePos.y <= chartArea.top + chartArea.height;

    if (!mouseInsideMainPane) return candles.length - 1;

    const ratio = clamp((mousePos.x - chartArea.left) / Math.max(1, chartArea.width), 0, 1);
    return Math.floor(clamp(viewRange.startIndex + ratio * viewRange.candlesPerView, 0, candles.length - 1));
  })();
  const legendCandle = legendIndex >= 0 ? candles[legendIndex] ?? latestCandle : latestCandle;

  return (
    <main className="chart-terminal" data-theme={theme}>
      <header className="chart-topbar" aria-label="Chart command bar">
        <div ref={controlRackRef} className="top-command-bar" aria-label="Chart controls">
          <ToolbarDropdown
            menuKey="symbol"
            label="Symbol"
            className="symbol-dropdown"
            options={SYMBOL_OPTIONS}
            value={symbol}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            onChange={setSymbol}
            renderIcon={(optionValue) => (
              <span className="symbol-badge" aria-hidden="true">
                {optionValue.slice(0, 1)}
              </span>
            )}
          />
          <span className={`feed-dot ${feedStatus}`} aria-label={`Feed ${feedStatus}`} role="status" />

          <span className="command-divider" aria-hidden="true" />

          <ToolbarDropdown
            menuKey="timeframe"
            label="Timeframe"
            className="timeframe-dropdown"
            options={TIMEFRAME_OPTIONS}
            value={timeframe}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            onChange={setTimeframe}
          />

          <ToolbarDropdown
            menuKey="chartStyle"
            label="Chart type"
            align="right"
            className="chart-style-dropdown"
            options={CHART_STYLE_OPTIONS}
            value={chartStyle}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            onChange={setChartStyle}
            renderIcon={(optionValue) => <span className={`chart-type-glyph ${optionValue}`} aria-hidden="true" />}
          />

          <IndicatorsDropdown
            count={indicatorCount}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            activeIndicators={activeIndicators}
            onAddIndicator={addIndicator}
          />

          <button
            type="button"
            className="tool-toggle icon-tool"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            onClick={() => {
              setOpenMenu(null);
              setTheme((value) => (value === 'dark' ? 'light' : 'dark'));
            }}
          >
            <span className={`theme-glyph ${theme === 'dark' ? 'moon' : 'sun'}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="tool-toggle icon-tool"
            aria-label="Reset chart view"
            title="Reset chart view"
            onClick={() => {
              setOpenMenu(null);
              resetView();
            }}
          >
            <span className="reset-glyph" aria-hidden="true" />
          </button>

          <div className="command-market-readout" aria-label="Latest market price">
            <span className="last-price">{latestCandle ? formatPrice(latestCandle.close) : '-'}</span>
            <span className={`price-change ${changeTone}`}>
              {priceChange >= 0 ? '+' : ''}
              {formatPrice(priceChange)} ({priceChangePercent >= 0 ? '+' : ''}
              {priceChangePercent.toFixed(2)}%)
            </span>
            <span className="muted">Binance Spot</span>
          </div>
        </div>
      </header>

      <section className="chart-stage">
        <canvas
          ref={canvasRef}
          aria-label={`${formatSymbol(symbol)} ${timeframe} chart`}
          className="chart-canvas"
          data-drag-mode={dragMode}
          data-manual-price-scale={manualPriceRange ? 'true' : 'false'}
          data-pointer-area={pointerArea}
          data-price-max={manualPriceRange ? manualPriceRange.maxPrice.toFixed(2) : ''}
          data-price-min={manualPriceRange ? manualPriceRange.minPrice.toFixed(2) : ''}
          data-view-end={viewRange.endIndex.toFixed(2)}
          data-view-start={viewRange.startIndex.toFixed(2)}
          style={{ cursor: canvasCursor }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
        />

        {activeIndicators.length > 0 && legendCandle && (
          <div ref={indicatorLegendRef} className="indicator-legend-overlay" aria-label="Active indicators">
            {activeIndicators.map((indicator, index) => {
              const definition = getIndicatorDefinition(indicator.definitionId);
              const computed = activeIndicatorSeries[indicator.id];
              const indicatorValues =
                definition.formula === 'volume'
                  ? [{ label: 'Volume', color: definition.defaults.color ?? palette.text, value: legendCandle.volume }]
                  : computed?.lines.map((line) => ({
                      label: line.label,
                      color: line.color,
                      value: legendIndex >= 0 ? line.values[legendIndex] : null,
                    })) ?? [];
              const settings = indicator.settings;
              const canEditPeriod =
                definition.defaults.period !== undefined ||
                settings.period !== undefined ||
                ['sma', 'ema', 'wma', 'rsi', 'stochastic', 'donchian', 'atr', 'momentum', 'roc'].includes(
                  definition.formula
                );
              const canEditSource = definition.defaults.source !== undefined || settings.source !== undefined;
              const canEditDeviation =
                definition.formula === 'bb' ||
                definition.formula === 'bb-percent' ||
                definition.formula === 'bb-width';
              const canEditMacd = definition.formula === 'macd';
              const canEditSignal = canEditMacd || definition.formula === 'stochastic';

              return (
                <div
                  key={indicator.id}
                  className="indicator-legend-row"
                  data-visible={indicator.visible}
                  data-settings-open={settingsTargetId === indicator.id}
                  data-more-open={moreTargetId === indicator.id}
                >
                  <div className="indicator-legend-main">
                    <span className="indicator-legend-title">{getIndicatorLegendName(indicator, symbol)}</span>
                    {indicatorValues.map((item) => (
                      <span key={`${indicator.id}-${item.label}`} className="indicator-legend-value" style={{ color: item.color }}>
                        {formatIndicatorNumber(item.value)}
                      </span>
                    ))}
                    <span className="indicator-legend-actions">
                      <button
                        type="button"
                        className="legend-action-button"
                        aria-label={`${indicator.visible ? 'Hide' : 'Show'} ${definition.name}`}
                        title={indicator.visible ? 'Hide' : 'Show'}
                        onClick={() => toggleIndicatorVisibility(indicator.id)}
                      >
                        <span className={`legend-action-glyph ${indicator.visible ? 'eye' : 'eye-off'}`} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="legend-action-button"
                        aria-label={`Settings for ${definition.name}`}
                        title="Settings"
                        onClick={() => {
                          setSettingsTargetId((current) => (current === indicator.id ? null : indicator.id));
                          setMoreTargetId(null);
                        }}
                      >
                        <span className="legend-action-glyph settings" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="legend-action-button"
                        aria-label={`Remove ${definition.name}`}
                        title="Remove"
                        onClick={() => removeIndicator(indicator.id)}
                      >
                        <span className="legend-action-glyph remove" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="legend-action-button"
                        aria-label={`More actions for ${definition.name}`}
                        title="More"
                        onClick={() => {
                          setMoreTargetId((current) => (current === indicator.id ? null : indicator.id));
                          setSettingsTargetId(null);
                        }}
                      >
                        <span className="legend-action-glyph more" aria-hidden="true" />
                      </button>
                    </span>
                  </div>

                  {settingsTargetId === indicator.id && (
                    <div className="indicator-settings-panel" role="group" aria-label={`${definition.name} settings`}>
                      <label>
                        <span>Color</span>
                        <input
                          type="color"
                          value={settings.color ?? definition.defaults.color ?? '#2962ff'}
                          onChange={(event) => updateIndicatorSettings(indicator.id, { color: event.target.value })}
                        />
                      </label>
                      {canEditPeriod && (
                        <label>
                          <span>Length</span>
                          <input
                            type="number"
                            min="1"
                            max="500"
                            value={sanitizePeriod(settings.period, definition.defaults.period ?? 20)}
                            onChange={(event) => updateIndicatorSettings(indicator.id, { period: Number(event.target.value) })}
                          />
                        </label>
                      )}
                      {canEditSource && (
                        <label>
                          <span>Source</span>
                          <select
                            value={settings.source ?? definition.defaults.source ?? 'close'}
                            onChange={(event) =>
                              updateIndicatorSettings(indicator.id, { source: event.target.value as IndicatorSource })
                            }
                          >
                            {INDICATOR_SOURCE_OPTIONS.map((sourceOption) => (
                              <option key={sourceOption} value={sourceOption}>
                                {sourceOption}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {canEditDeviation && (
                        <label>
                          <span>Std dev</span>
                          <input
                            type="number"
                            min="0.1"
                            max="10"
                            step="0.1"
                            value={settings.stdDev ?? definition.defaults.stdDev ?? 2}
                            onChange={(event) => updateIndicatorSettings(indicator.id, { stdDev: Number(event.target.value) })}
                          />
                        </label>
                      )}
                      {canEditMacd && (
                        <>
                          <label>
                            <span>Fast</span>
                            <input
                              type="number"
                              min="1"
                              max="200"
                              value={sanitizePeriod(settings.fastPeriod, definition.defaults.fastPeriod ?? 12)}
                              onChange={(event) =>
                                updateIndicatorSettings(indicator.id, { fastPeriod: Number(event.target.value) })
                              }
                            />
                          </label>
                          <label>
                            <span>Slow</span>
                            <input
                              type="number"
                              min="1"
                              max="300"
                              value={sanitizePeriod(settings.slowPeriod, definition.defaults.slowPeriod ?? 26)}
                              onChange={(event) =>
                                updateIndicatorSettings(indicator.id, { slowPeriod: Number(event.target.value) })
                              }
                            />
                          </label>
                        </>
                      )}
                      {canEditSignal && (
                        <label>
                          <span>Signal</span>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={sanitizePeriod(settings.signalPeriod, definition.defaults.signalPeriod ?? 9)}
                            onChange={(event) =>
                              updateIndicatorSettings(indicator.id, { signalPeriod: Number(event.target.value) })
                            }
                          />
                        </label>
                      )}
                    </div>
                  )}

                  {moreTargetId === indicator.id && (
                    <div className="indicator-more-panel" role="menu" aria-label={`${definition.name} actions`}>
                      <button type="button" role="menuitem" onClick={() => duplicateIndicator(indicator.id)}>
                        Duplicate
                      </button>
                      <button type="button" role="menuitem" disabled={index === 0} onClick={() => moveIndicator(indicator.id, -1)}>
                        Move up
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        disabled={index === activeIndicators.length - 1}
                        onClick={() => moveIndicator(indicator.id, 1)}
                      >
                        Move down
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {loading && (
          <div className="chart-overlay">
            <div className="loading-panel">
              <span className="loading-line" />
              <span className="loading-line short" />
              <span className="state-copy">Loading market data</span>
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="chart-overlay">
            <div className="state-panel">
              <strong>Market data unavailable</strong>
              <span>{error}</span>
              <button type="button" onClick={() => setRefreshNonce((value) => value + 1)}>
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && candles.length === 0 && (
          <div className="chart-overlay">
            <div className="state-panel">
              <strong>No candles returned</strong>
              <span>Try another symbol or timeframe.</span>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
