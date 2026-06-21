// TradingView-style built-in indicator engine: types, math, definitions, and series computation.
// Formulas follow the published TradingView/Pine v5 reference implementations.

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type IndicatorPaneKind = 'price' | 'volume' | 'oscillator';
export type IndicatorSource = 'open' | 'high' | 'low' | 'close' | 'hl2' | 'hlc3' | 'ohlc4';
export type IndicatorMaType = 'EMA' | 'SMA';
export type IndicatorSmoothingType = 'RMA' | 'SMA' | 'EMA' | 'WMA';

export type IndicatorFormula =
  | 'volume'
  | 'sma'
  | 'ema'
  | 'wma'
  | 'smma'
  | 'vwma'
  | 'hma'
  | 'dema'
  | 'tema'
  | 'alma'
  | 'lsma'
  | 'mcginley'
  | 'median'
  | 'ma-cross'
  | 'ma-ribbon'
  | 'bb'
  | 'bb-percent'
  | 'bb-width'
  | 'keltner'
  | 'donchian'
  | 'env'
  | 'ichimoku'
  | 'supertrend'
  | 'psar'
  | 'vstop'
  | 'chande-kroll'
  | 'pivots-std'
  | 'pivots-hl'
  | 'zigzag'
  | 'fractals'
  | 'alligator'
  | 'linreg-channel'
  | 'vwap'
  | 'twap'
  | 'rsi'
  | 'macd'
  | 'stochastic'
  | 'stoch-rsi'
  | 'smi'
  | 'cmo'
  | 'momentum'
  | 'roc'
  | 'dpo'
  | 'ppo'
  | 'awesome'
  | 'adx'
  | 'dmi'
  | 'aroon'
  | 'cci'
  | 'crsi'
  | 'coppock'
  | 'kst'
  | 'tsi'
  | 'trix'
  | 'uo'
  | 'willr'
  | 'fisher'
  | 'rvgi'
  | 'rvi'
  | 'smi-ergodic'
  | 'smi-ergodic-osc'
  | 'bop'
  | 'bbtrend'
  | 'bbp'
  | 'chop'
  | 'chop-zone'
  | 'atr'
  | 'adr'
  | 'hv'
  | 'mass'
  | 'vortex'
  | 'efi'
  | 'eom'
  | 'obv'
  | 'pvt'
  | 'adl'
  | 'cmf'
  | 'chaikin-osc'
  | 'klinger'
  | 'mfi'
  | 'net-volume'
  | 'vol-osc'
  | '24h-volume'
  | 'rvol'
  | 'asi'
  | 'woodies-cci'
  | 'fundamental';

export interface IndicatorSettings {
  period?: number;
  period2?: number;
  period3?: number;
  period4?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  stdDev?: number;
  multiplier?: number;
  percent?: number;
  offset?: number;
  sigma?: number;
  startValue?: number;
  increment?: number;
  maxValue?: number;
  smoothingType?: IndicatorSmoothingType;
  source?: IndicatorSource;
  oscillatorMaType?: IndicatorMaType;
  signalMaType?: IndicatorMaType;
  color?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  quaternaryColor?: string;
  quinaryColor?: string;
  fillColor?: string;
  histogramPositiveColor?: string;
  histogramNegativeColor?: string;
}

export type IndicatorCategory = 'Volume' | 'Trend' | 'Momentum' | 'Volatility' | 'Fundamental';

export interface IndicatorDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: IndicatorCategory;
  pane: IndicatorPaneKind;
  formula: IndicatorFormula;
  defaults: IndicatorSettings;
  singleton?: boolean;
}

export interface ActiveIndicator {
  id: string;
  definitionId: string;
  paneIndex?: number;
  visible: boolean;
  settings: IndicatorSettings;
}

export type IndicatorLineStyle = 'line' | 'step' | 'dots' | 'cross';

export interface IndicatorLineSeries {
  label: string;
  color: string;
  values: Array<number | null>;
  style?: IndicatorLineStyle;
  lineWidth?: number;
  colors?: Array<string | null>;
  connectNulls?: boolean;
}

export interface IndicatorMarker {
  index: number;
  price: number;
  shape: 'triangleUp' | 'triangleDown' | 'cross' | 'label';
  color: string;
  text?: string;
  position: 'above' | 'below';
}

export interface IndicatorFill {
  upper: number;
  lower: number;
  color?: string;
  upColor?: string;
  downColor?: string;
}

export interface IndicatorComputedSeries {
  lines: IndicatorLineSeries[];
  histogram?: Array<number | null>;
  histogramPositive?: string;
  histogramNegative?: string;
  histogramColors?: Array<string | null>;
  fillColor?: string;
  fills?: IndicatorFill[];
  markers?: IndicatorMarker[];
  min?: number;
  max?: number;
  guideLines?: Array<{ value: number; label?: string }>;
  guideBand?: { from: number; to: number; color: string };
  noData?: boolean;
}

export const INDICATOR_SOURCE_OPTIONS: IndicatorSource[] = ['open', 'high', 'low', 'close', 'hl2', 'hlc3', 'ohlc4'];
export const INDICATOR_MA_TYPE_OPTIONS: IndicatorMaType[] = ['EMA', 'SMA'];
export const INDICATOR_SMOOTHING_OPTIONS: IndicatorSmoothingType[] = ['RMA', 'SMA', 'EMA', 'WMA'];

const DAY_MS = 24 * 60 * 60 * 1000;

const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const sanitizePeriod = (value: number | undefined, fallback: number, min = 1, max = 500) => {
  if (value === undefined || Number.isNaN(value)) return fallback;
  return clampValue(Math.round(value), min, max);
};

export const sanitizeFloat = (value: number | undefined, fallback: number, min: number, max: number) => {
  if (value === undefined || Number.isNaN(value)) return fallback;
  return clampValue(value, min, max);
};

export const getSourceValue = (candle: Candle, source: IndicatorSource = 'close') => {
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

export const getSourceValues = (candles: Candle[], source: IndicatorSource = 'close') =>
  candles.map((candle) => getSourceValue(candle, source));

type Series = Array<number | null>;

const emptySeries = (length: number): Series => new Array(length).fill(null);

export const simpleMovingAverageValues = (values: number[], period: number): Series => {
  const result = emptySeries(values.length);
  let rollingSum = 0;

  values.forEach((value, index) => {
    rollingSum += value;
    if (index >= period) rollingSum -= values[index - period];
    if (index >= period - 1) result[index] = rollingSum / period;
  });

  return result;
};

export const simpleMovingAverageNullable = (values: Series, period: number): Series => {
  const result = emptySeries(values.length);
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

// Pine ta.ema: seeded with SMA(length) on the first complete window.
export const exponentialMovingAverageValues = (values: number[], period: number): Series => {
  const result = emptySeries(values.length);
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

export const exponentialMovingAverageNullable = (values: Series, period: number): Series => {
  const result = emptySeries(values.length);
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

// Pine ta.rma (Wilder): alpha = 1/length, seeded with SMA.
export const wilderMovingAverageValues = (values: number[], period: number): Series => {
  const result = emptySeries(values.length);
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

    previous = (previous * (period - 1) + value) / period;
    result[index] = previous;
  });

  return result;
};

export const wilderMovingAverageNullable = (values: Series, period: number): Series => {
  const result = emptySeries(values.length);
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

    previous = (previous * (period - 1) + value) / period;
    result[index] = previous;
  });

  return result;
};

export const weightedMovingAverageValues = (values: number[], period: number): Series => {
  const result = emptySeries(values.length);
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

export const weightedMovingAverageNullable = (values: Series, period: number): Series => {
  const result = emptySeries(values.length);
  const denominator = (period * (period + 1)) / 2;

  for (let index = period - 1; index < values.length; index += 1) {
    let weightedSum = 0;
    let valid = true;

    for (let offset = 0; offset < period; offset += 1) {
      const value = values[index - offset];
      if (value === null) {
        valid = false;
        break;
      }
      weightedSum += value * (period - offset);
    }

    if (valid) result[index] = weightedSum / denominator;
  }

  return result;
};

export const calculateMovingAverageValues = (values: number[], period: number, maType: IndicatorMaType) =>
  maType === 'SMA' ? simpleMovingAverageValues(values, period) : exponentialMovingAverageValues(values, period);

export const calculateMovingAverageNullable = (values: Series, period: number, maType: IndicatorMaType) =>
  maType === 'SMA' ? simpleMovingAverageNullable(values, period) : exponentialMovingAverageNullable(values, period);

export const smoothedAverageBy = (values: number[], period: number, smoothing: IndicatorSmoothingType): Series => {
  if (smoothing === 'SMA') return simpleMovingAverageValues(values, period);
  if (smoothing === 'EMA') return exponentialMovingAverageValues(values, period);
  if (smoothing === 'WMA') return weightedMovingAverageValues(values, period);
  return wilderMovingAverageValues(values, period);
};

export const rollingSumNullable = (values: Series, period: number): Series => {
  const result = emptySeries(values.length);

  for (let index = period - 1; index < values.length; index += 1) {
    let sum = 0;
    let valid = true;

    for (let offset = 0; offset < period; offset += 1) {
      const value = values[index - offset];
      if (value === null) {
        valid = false;
        break;
      }
      sum += value;
    }

    if (valid) result[index] = sum;
  }

  return result;
};

export const rollingSumValues = (values: number[], period: number): Series => {
  const result = emptySeries(values.length);
  let rollingSum = 0;

  values.forEach((value, index) => {
    rollingSum += value;
    if (index >= period) rollingSum -= values[index - period];
    if (index >= period - 1) result[index] = rollingSum;
  });

  return result;
};

export const highestValues = (values: number[], period: number): Series => {
  const result = emptySeries(values.length);

  for (let index = period - 1; index < values.length; index += 1) {
    let highest = -Infinity;
    for (let offset = 0; offset < period; offset += 1) {
      highest = Math.max(highest, values[index - offset]);
    }
    result[index] = highest;
  }

  return result;
};

export const lowestValues = (values: number[], period: number): Series => {
  const result = emptySeries(values.length);

  for (let index = period - 1; index < values.length; index += 1) {
    let lowest = Infinity;
    for (let offset = 0; offset < period; offset += 1) {
      lowest = Math.min(lowest, values[index - offset]);
    }
    result[index] = lowest;
  }

  return result;
};

// Pine ta.stdev default (biased = population stdev).
export const standardDeviationValues = (values: number[], period: number): Series => {
  const result = emptySeries(values.length);

  for (let index = period - 1; index < values.length; index += 1) {
    let mean = 0;
    for (let offset = 0; offset < period; offset += 1) mean += values[index - offset];
    mean /= period;

    let variance = 0;
    for (let offset = 0; offset < period; offset += 1) {
      variance += (values[index - offset] - mean) ** 2;
    }
    result[index] = Math.sqrt(variance / period);
  }

  return result;
};

export const changeValues = (values: number[]): Series =>
  values.map((value, index) => (index > 0 ? value - values[index - 1] : null));

export const trueRangeValues = (candles: Candle[]): number[] =>
  candles.map((candle, index) => {
    const previousClose = candles[index - 1]?.close ?? candle.close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose)
    );
  });

export const averageTrueRangeValues = (candles: Candle[], period: number): Series =>
  wilderMovingAverageValues(trueRangeValues(candles), period);

// Pine ta.linreg(source, length, offset): endpoint of the least-squares fit.
export const linearRegressionValues = (values: number[], period: number, offset = 0): Series => {
  const result = emptySeries(values.length);
  const sumX = ((period - 1) * period) / 2;
  const sumXX = ((period - 1) * period * (2 * period - 1)) / 6;

  for (let index = period - 1; index < values.length; index += 1) {
    let sumY = 0;
    let sumXY = 0;
    for (let x = 0; x < period; x += 1) {
      const y = values[index - period + 1 + x];
      sumY += y;
      sumXY += x * y;
    }

    const denominator = period * sumXX - sumX * sumX;
    const slope = denominator === 0 ? 0 : (period * sumXY - sumX * sumY) / denominator;
    const intercept = (sumY - slope * sumX) / period;
    result[index] = intercept + slope * (period - 1 - offset);
  }

  return result;
};

// Pine ta.median uses percentile (nearest rank).
export const medianValues = (values: number[], period: number): Series => {
  const result = emptySeries(values.length);

  for (let index = period - 1; index < values.length; index += 1) {
    const window = values.slice(index - period + 1, index + 1).sort((a, b) => a - b);
    result[index] = window[Math.ceil(period / 2) - 1];
  }

  return result;
};

export const hullMovingAverageValues = (values: number[], period: number): Series => {
  const half = weightedMovingAverageValues(values, Math.max(1, Math.round(period / 2)));
  const full = weightedMovingAverageValues(values, period);
  const diff: Series = values.map((_, index) =>
    half[index] !== null && full[index] !== null ? 2 * half[index]! - full[index]! : null
  );
  return weightedMovingAverageNullable(diff, Math.max(1, Math.floor(Math.sqrt(period))));
};

export const volumeWeightedMovingAverageValues = (candles: Candle[], source: IndicatorSource, period: number): Series => {
  const priceVolume = candles.map((candle) => getSourceValue(candle, source) * candle.volume);
  const volume = candles.map((candle) => candle.volume);
  const pvSum = rollingSumValues(priceVolume, period);
  const volSum = rollingSumValues(volume, period);

  return candles.map((_, index) => {
    const pv = pvSum[index];
    const vol = volSum[index];
    if (pv === null || vol === null || vol === 0) return null;
    return pv / vol;
  });
};

export const arnaudLegouxMovingAverageValues = (
  values: number[],
  period: number,
  offset: number,
  sigma: number
): Series => {
  const result = emptySeries(values.length);
  const m = offset * (period - 1);
  const s = period / sigma;
  const weights: number[] = [];
  let weightSum = 0;

  for (let i = 0; i < period; i += 1) {
    const weight = Math.exp(-((i - m) ** 2) / (2 * s * s));
    weights.push(weight);
    weightSum += weight;
  }

  for (let index = period - 1; index < values.length; index += 1) {
    let sum = 0;
    for (let i = 0; i < period; i += 1) {
      sum += values[index - (period - 1 - i)] * weights[i];
    }
    result[index] = sum / weightSum;
  }

  return result;
};

export const mcginleyDynamicValues = (values: number[], period: number): Series => {
  const seed = exponentialMovingAverageValues(values, period);
  const result = emptySeries(values.length);
  let previous: number | null = null;

  values.forEach((value, index) => {
    if (previous === null) {
      if (seed[index] !== null) {
        previous = seed[index];
        result[index] = previous;
      }
      return;
    }

    const ratio = previous === 0 ? 1 : value / previous;
    previous = previous + (value - previous) / (period * ratio ** 4);
    result[index] = previous;
  });

  return result;
};

export const calculateBollingerBands = (values: number[], period: number, stdDev: number) => {
  const basis = simpleMovingAverageValues(values, period);
  const deviation = standardDeviationValues(values, period);
  const upper: Series = values.map((_, index) =>
    basis[index] !== null && deviation[index] !== null ? basis[index]! + deviation[index]! * stdDev : null
  );
  const lower: Series = values.map((_, index) =>
    basis[index] !== null && deviation[index] !== null ? basis[index]! - deviation[index]! * stdDev : null
  );

  return { basis, upper, lower };
};

export const calculateRsiValues = (values: number[], period: number): Series => {
  const gains = values.map((value, index) => (index > 0 ? Math.max(value - values[index - 1], 0) : 0));
  const losses = values.map((value, index) => (index > 0 ? Math.max(values[index - 1] - value, 0) : 0));
  const avgGain = wilderMovingAverageValues(gains.slice(1), period);
  const avgLoss = wilderMovingAverageValues(losses.slice(1), period);
  const result = emptySeries(values.length);

  for (let index = 1; index < values.length; index += 1) {
    const gain = avgGain[index - 1];
    const loss = avgLoss[index - 1];
    if (gain === null || loss === null) continue;
    result[index] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }

  return result;
};

export const rsiNullable = (values: Series, period: number): Series => {
  const result = emptySeries(values.length);
  const compact: Array<{ index: number; value: number }> = [];
  values.forEach((value, index) => {
    if (value !== null) compact.push({ index, value });
  });

  if (compact.length < period + 1) return result;
  const rsi = calculateRsiValues(compact.map((item) => item.value), period);
  rsi.forEach((value, position) => {
    if (value !== null) result[compact[position].index] = value;
  });

  return result;
};

export const calculateStochasticRaw = (
  highs: number[],
  lows: number[],
  closes: number[],
  period: number
): Series => {
  const highest = highestValues(highs, period);
  const lowest = lowestValues(lows, period);

  return closes.map((close, index) => {
    const hh = highest[index];
    const ll = lowest[index];
    if (hh === null || ll === null) return null;
    const range = hh - ll;
    return range === 0 ? null : ((close - ll) / range) * 100;
  });
};

export const calculateVwapValues = (candles: Candle[], source: IndicatorSource): Series => {
  const result = emptySeries(candles.length);
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

export const calculateTwapValues = (candles: Candle[]): Series => {
  const result = emptySeries(candles.length);
  let sessionKey = '';
  let cumulative = 0;
  let count = 0;

  candles.forEach((candle, index) => {
    const date = new Date(candle.time);
    const nextSessionKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;

    if (nextSessionKey !== sessionKey) {
      sessionKey = nextSessionKey;
      cumulative = 0;
      count = 0;
    }

    cumulative += (candle.open + candle.high + candle.low + candle.close) / 4;
    count += 1;
    result[index] = cumulative / count;
  });

  return result;
};

export const calculateAccumulationDistributionValues = (candles: Candle[]): Series => {
  const result = emptySeries(candles.length);
  let runningTotal = 0;

  candles.forEach((candle, index) => {
    const range = candle.high - candle.low;
    const moneyFlowMultiplier = range === 0 ? 0 : (candle.close - candle.low - (candle.high - candle.close)) / range;
    runningTotal += moneyFlowMultiplier * candle.volume;
    result[index] = runningTotal;
  });

  return result;
};

export const calculateMacdSeries = (
  values: number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number,
  oscillatorMaType: IndicatorMaType,
  signalMaType: IndicatorMaType
) => {
  const fast = calculateMovingAverageValues(values, fastPeriod, oscillatorMaType);
  const slow = calculateMovingAverageValues(values, slowPeriod, oscillatorMaType);
  const macd: Series = values.map((_, index) =>
    fast[index] !== null && slow[index] !== null ? fast[index]! - slow[index]! : null
  );
  const signal = calculateMovingAverageNullable(macd, signalPeriod, signalMaType);
  const histogram: Series = macd.map((value, index) =>
    value !== null && signal[index] !== null ? value - signal[index]! : null
  );

  return { macd, signal, histogram };
};

export const calculateDonchianSeries = (candles: Candle[], period: number) => {
  const upper = highestValues(candles.map((candle) => candle.high), period);
  const lower = lowestValues(candles.map((candle) => candle.low), period);
  const middle: Series = candles.map((_, index) =>
    upper[index] !== null && lower[index] !== null ? (upper[index]! + lower[index]!) / 2 : null
  );

  return { upper, lower, middle };
};

export const calculateSupertrendSeries = (candles: Candle[], atrPeriod: number, factor: number) => {
  const atr = averageTrueRangeValues(candles, atrPeriod);
  const supertrend = emptySeries(candles.length);
  const direction: Array<1 | -1 | null> = new Array(candles.length).fill(null);
  let prevUpper: number | null = null;
  let prevLower: number | null = null;
  let prevTrend: 1 | -1 = 1;
  let started = false;

  candles.forEach((candle, index) => {
    const atrValue = atr[index];
    if (atrValue === null) return;

    const mid = (candle.high + candle.low) / 2;
    let upper = mid + factor * atrValue;
    let lower = mid - factor * atrValue;
    const previousClose = candles[index - 1]?.close ?? candle.close;

    if (started) {
      if (prevLower !== null && !(lower > prevLower || previousClose < prevLower)) lower = prevLower;
      if (prevUpper !== null && !(upper < prevUpper || previousClose > prevUpper)) upper = prevUpper;
    }

    let trend: 1 | -1;
    if (!started) {
      trend = 1;
      started = true;
    } else if (prevTrend === -1) {
      trend = candle.close > prevUpper! ? 1 : -1;
    } else {
      trend = candle.close < prevLower! ? -1 : 1;
    }

    supertrend[index] = trend === 1 ? lower : upper;
    direction[index] = trend;
    prevUpper = upper;
    prevLower = lower;
    prevTrend = trend;
  });

  return { supertrend, direction };
};

export const calculateParabolicSarValues = (
  candles: Candle[],
  start: number,
  increment: number,
  maximum: number
): Series => {
  const result = emptySeries(candles.length);
  if (candles.length < 2) return result;

  let isUptrend = candles[1].close >= candles[0].close;
  let sar = isUptrend ? candles[0].low : candles[0].high;
  let extremePoint = isUptrend ? candles[0].high : candles[0].low;
  let acceleration = start;

  for (let index = 1; index < candles.length; index += 1) {
    const candle = candles[index];
    sar = sar + acceleration * (extremePoint - sar);

    if (isUptrend) {
      sar = Math.min(sar, candles[index - 1].low, candles[index - 2]?.low ?? candles[index - 1].low);
      if (candle.low < sar) {
        isUptrend = false;
        sar = extremePoint;
        extremePoint = candle.low;
        acceleration = start;
      } else if (candle.high > extremePoint) {
        extremePoint = candle.high;
        acceleration = Math.min(maximum, acceleration + increment);
      }
    } else {
      sar = Math.max(sar, candles[index - 1].high, candles[index - 2]?.high ?? candles[index - 1].high);
      if (candle.high > sar) {
        isUptrend = true;
        sar = extremePoint;
        extremePoint = candle.high;
        acceleration = start;
      } else if (candle.low < extremePoint) {
        extremePoint = candle.low;
        acceleration = Math.min(maximum, acceleration + increment);
      }
    }

    result[index] = sar;
  }

  return result;
};

export const calculateVolatilityStopSeries = (
  candles: Candle[],
  source: IndicatorSource,
  period: number,
  multiplier: number
) => {
  const atr = averageTrueRangeValues(candles, period);
  const stop = emptySeries(candles.length);
  const direction: Array<1 | -1 | null> = new Array(candles.length).fill(null);
  let isUptrend = true;
  let max = -Infinity;
  let min = Infinity;
  let currentStop: number | null = null;

  candles.forEach((candle, index) => {
    const src = getSourceValue(candle, source);
    const atrValue = atr[index];
    if (atrValue === null) return;

    const atrM = atrValue * multiplier;

    if (currentStop === null) {
      max = src;
      min = src;
      currentStop = isUptrend ? src - atrM : src + atrM;
      stop[index] = currentStop;
      direction[index] = isUptrend ? 1 : -1;
      return;
    }

    max = Math.max(max, src);
    min = Math.min(min, src);

    if (isUptrend) {
      currentStop = Math.max(currentStop, max - atrM);
      if (src < currentStop) {
        isUptrend = false;
        max = src;
        min = src;
        currentStop = src + atrM;
      }
    } else {
      currentStop = Math.min(currentStop, min + atrM);
      if (src > currentStop) {
        isUptrend = true;
        max = src;
        min = src;
        currentStop = src - atrM;
      }
    }

    stop[index] = currentStop;
    direction[index] = isUptrend ? 1 : -1;
  });

  return { stop, direction };
};

export const calculateIchimokuSeries = (
  candles: Candle[],
  conversionPeriod: number,
  basePeriod: number,
  spanBPeriod: number,
  displacement: number
) => {
  const highs = candles.map((candle) => candle.high);
  const lows = candles.map((candle) => candle.low);
  const donchianMiddle = (period: number): Series => {
    const hh = highestValues(highs, period);
    const ll = lowestValues(lows, period);
    return candles.map((_, index) =>
      hh[index] !== null && ll[index] !== null ? (hh[index]! + ll[index]!) / 2 : null
    );
  };

  const conversion = donchianMiddle(conversionPeriod);
  const base = donchianMiddle(basePeriod);
  const spanBRaw = donchianMiddle(spanBPeriod);
  const shift = Math.max(0, displacement - 1);
  const extendedLength = candles.length + shift;
  const spanA: Series = new Array(extendedLength).fill(null);
  const spanB: Series = new Array(extendedLength).fill(null);
  const lagging: Series = emptySeries(candles.length);

  candles.forEach((candle, index) => {
    if (conversion[index] !== null && base[index] !== null) {
      spanA[index + shift] = (conversion[index]! + base[index]!) / 2;
    }
    if (spanBRaw[index] !== null) {
      spanB[index + shift] = spanBRaw[index];
    }
    if (index - shift >= 0) {
      lagging[index - shift] = candle.close;
    }
  });

  return { conversion, base, spanA, spanB, lagging };
};

export const calculateAlligatorSeries = (
  candles: Candle[],
  jawPeriod: number,
  jawOffset: number,
  teethPeriod: number,
  teethOffset: number,
  lipsPeriod: number,
  lipsOffset: number
) => {
  const hl2 = candles.map((candle) => (candle.high + candle.low) / 2);
  const maxOffset = Math.max(jawOffset, teethOffset, lipsOffset);
  const extendedLength = candles.length + maxOffset;
  const shiftSeries = (values: Series, offset: number): Series => {
    const shifted: Series = new Array(extendedLength).fill(null);
    values.forEach((value, index) => {
      if (value !== null) shifted[index + offset] = value;
    });
    return shifted;
  };

  return {
    jaw: shiftSeries(wilderMovingAverageValues(hl2, jawPeriod), jawOffset),
    teeth: shiftSeries(wilderMovingAverageValues(hl2, teethPeriod), teethOffset),
    lips: shiftSeries(wilderMovingAverageValues(hl2, lipsPeriod), lipsOffset),
  };
};

export const calculateDmiSeries = (candles: Candle[], diPeriod: number, adxPeriod: number) => {
  const length = candles.length;
  const plusDm: number[] = new Array(length).fill(0);
  const minusDm: number[] = new Array(length).fill(0);

  for (let index = 1; index < length; index += 1) {
    const upMove = candles[index].high - candles[index - 1].high;
    const downMove = candles[index - 1].low - candles[index].low;
    plusDm[index] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDm[index] = downMove > upMove && downMove > 0 ? downMove : 0;
  }

  const trSmoothed = wilderMovingAverageValues(trueRangeValues(candles), diPeriod);
  const plusSmoothed = wilderMovingAverageValues(plusDm.slice(1), diPeriod);
  const minusSmoothed = wilderMovingAverageValues(minusDm.slice(1), diPeriod);
  const plusDi = emptySeries(length);
  const minusDi = emptySeries(length);
  const dx: Series = emptySeries(length);

  for (let index = 1; index < length; index += 1) {
    const tr = trSmoothed[index];
    const plus = plusSmoothed[index - 1];
    const minus = minusSmoothed[index - 1];
    if (tr === null || plus === null || minus === null || tr === 0) continue;

    const pdi = (100 * plus) / tr;
    const mdi = (100 * minus) / tr;
    plusDi[index] = pdi;
    minusDi[index] = mdi;
    const sum = pdi + mdi;
    dx[index] = sum === 0 ? 0 : (100 * Math.abs(pdi - mdi)) / sum;
  }

  const adx = wilderMovingAverageNullable(dx, adxPeriod);
  return { plusDi, minusDi, adx };
};

export const calculatePivotPointsHighLow = (candles: Candle[], leftBars: number, rightBars: number) => {
  const highs: Array<{ index: number; price: number }> = [];
  const lows: Array<{ index: number; price: number }> = [];

  for (let index = leftBars; index < candles.length - rightBars; index += 1) {
    const high = candles[index].high;
    const low = candles[index].low;
    let isPivotHigh = true;
    let isPivotLow = true;

    for (let offset = 1; offset <= leftBars && (isPivotHigh || isPivotLow); offset += 1) {
      if (candles[index - offset].high >= high) isPivotHigh = false;
      if (candles[index - offset].low <= low) isPivotLow = false;
    }
    for (let offset = 1; offset <= rightBars && (isPivotHigh || isPivotLow); offset += 1) {
      if (candles[index + offset].high > high) isPivotHigh = false;
      if (candles[index + offset].low < low) isPivotLow = false;
    }

    if (isPivotHigh) highs.push({ index, price: high });
    if (isPivotLow) lows.push({ index, price: low });
  }

  return { highs, lows };
};

export const calculateZigZagSeries = (candles: Candle[], deviationPercent: number, depth: number) => {
  const values = emptySeries(candles.length);
  if (candles.length < 2) return values;

  type Pivot = { index: number; price: number; isHigh: boolean };
  const pivots: Pivot[] = [];
  let direction: 1 | -1 = candles[1].close >= candles[0].close ? 1 : -1;
  let extremeIndex = 0;
  let extremePrice = direction === 1 ? candles[0].high : candles[0].low;

  for (let index = 1; index < candles.length; index += 1) {
    const candle = candles[index];

    if (direction === 1) {
      if (candle.high >= extremePrice) {
        extremePrice = candle.high;
        extremeIndex = index;
        continue;
      }

      const retrace = ((extremePrice - candle.low) / extremePrice) * 100;
      if (retrace >= deviationPercent && index - extremeIndex >= 1 && (pivots.length === 0 || extremeIndex - pivots[pivots.length - 1].index >= depth)) {
        pivots.push({ index: extremeIndex, price: extremePrice, isHigh: true });
        direction = -1;
        extremePrice = candle.low;
        extremeIndex = index;
      }
    } else {
      if (candle.low <= extremePrice) {
        extremePrice = candle.low;
        extremeIndex = index;
        continue;
      }

      const retrace = ((candle.high - extremePrice) / extremePrice) * 100;
      if (retrace >= deviationPercent && index - extremeIndex >= 1 && (pivots.length === 0 || extremeIndex - pivots[pivots.length - 1].index >= depth)) {
        pivots.push({ index: extremeIndex, price: extremePrice, isHigh: false });
        direction = 1;
        extremePrice = candle.high;
        extremeIndex = index;
      }
    }
  }

  pivots.forEach((pivot) => {
    values[pivot.index] = pivot.price;
  });
  if (extremeIndex > 0 && values[extremeIndex] === null) {
    values[extremeIndex] = extremePrice;
  }

  return values;
};

type PivotAnchor = 'day' | 'month' | 'year';

const getPivotAnchorKey = (time: number, anchor: PivotAnchor) => {
  const date = new Date(time);
  if (anchor === 'day') return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
  if (anchor === 'month') return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
  return `${date.getUTCFullYear()}`;
};

export const calculatePivotPointsStandard = (candles: Candle[], intervalMs: number) => {
  const anchor: PivotAnchor = intervalMs < DAY_MS ? 'day' : intervalMs < 7 * DAY_MS ? 'month' : 'year';
  const length = candles.length;
  const levels = {
    p: emptySeries(length),
    r1: emptySeries(length),
    s1: emptySeries(length),
    r2: emptySeries(length),
    s2: emptySeries(length),
    r3: emptySeries(length),
    s3: emptySeries(length),
  };

  let currentKey = '';
  let periodHigh = 0;
  let periodLow = 0;
  let periodClose = 0;
  let hasPrevious = false;
  let prevHigh = 0;
  let prevLow = 0;
  let prevClose = 0;

  candles.forEach((candle, index) => {
    const key = getPivotAnchorKey(candle.time, anchor);

    if (key !== currentKey) {
      if (currentKey !== '') {
        prevHigh = periodHigh;
        prevLow = periodLow;
        prevClose = periodClose;
        hasPrevious = true;
      }
      currentKey = key;
      periodHigh = candle.high;
      periodLow = candle.low;
    } else {
      periodHigh = Math.max(periodHigh, candle.high);
      periodLow = Math.min(periodLow, candle.low);
    }
    periodClose = candle.close;

    if (!hasPrevious) return;

    const p = (prevHigh + prevLow + prevClose) / 3;
    const range = prevHigh - prevLow;
    levels.p[index] = p;
    levels.r1[index] = 2 * p - prevLow;
    levels.s1[index] = 2 * p - prevHigh;
    levels.r2[index] = p + range;
    levels.s2[index] = p - range;
    levels.r3[index] = prevHigh + 2 * (p - prevLow);
    levels.s3[index] = prevLow - 2 * (prevHigh - p);
  });

  return levels;
};

export const inferIntervalMs = (candles: Candle[]): number => {
  if (candles.length < 2) return 60 * 1000;
  const diffs: number[] = [];
  for (let index = 1; index < Math.min(candles.length, 50); index += 1) {
    const diff = candles[index].time - candles[index - 1].time;
    if (diff > 0) diffs.push(diff);
  }
  if (diffs.length === 0) return 60 * 1000;
  diffs.sort((a, b) => a - b);
  return diffs[Math.floor(diffs.length / 2)];
};

const combineSeries = (a: Series, b: Series, combine: (x: number, y: number) => number): Series =>
  a.map((value, index) => {
    const other = b[index];
    return value !== null && other !== null ? combine(value, other) : null;
  });

const mapSeries = (a: Series, map: (x: number) => number): Series =>
  a.map((value) => (value !== null ? map(value) : null));

const subtractSeries = (a: Series, b: Series) => combineSeries(a, b, (x, y) => x - y);

// Symmetrical weighted MA used by RVGI: (x + 2x[1] + 2x[2] + x[3]) / 6.
const symmetricalWeightedValues = (values: number[]): Series =>
  values.map((_, index) => {
    if (index < 3) return null;
    return (values[index - 3] + 2 * values[index - 2] + 2 * values[index - 1] + values[index]) / 6;
  });

const percentRankValues = (values: Series, period: number): Series => {
  const result = emptySeries(values.length);

  for (let index = 0; index < values.length; index += 1) {
    const current = values[index];
    if (current === null || index < period) continue;

    let count = 0;
    let valid = true;
    for (let offset = 1; offset <= period; offset += 1) {
      const past = values[index - offset];
      if (past === null) {
        valid = false;
        break;
      }
      if (past <= current) count += 1;
    }
    if (valid) result[index] = (count / period) * 100;
  }

  return result;
};

const FOUR_COLOR_POS_RISE = '#26a69a';
const FOUR_COLOR_POS_FALL = '#b2dfdb';
const FOUR_COLOR_NEG_RISE = '#ffcdd2';
const FOUR_COLOR_NEG_FALL = '#ff5252';

const fourColorHistogram = (histogram: Series): Array<string | null> =>
  histogram.map((value, index) => {
    if (value === null) return null;
    const previous = index > 0 ? histogram[index - 1] : null;
    const rising = previous === null ? true : value >= previous;
    if (value >= 0) return rising ? FOUR_COLOR_POS_RISE : FOUR_COLOR_POS_FALL;
    return rising ? FOUR_COLOR_NEG_RISE : FOUR_COLOR_NEG_FALL;
  });

const deltaColorHistogram = (histogram: Series, riseColor: string, fallColor: string): Array<string | null> =>
  histogram.map((value, index) => {
    if (value === null) return null;
    const previous = index > 0 ? histogram[index - 1] : null;
    return previous === null || value >= previous ? riseColor : fallColor;
  });

const signColorHistogram = (histogram: Series, positive: string, negative: string): Array<string | null> =>
  histogram.map((value) => (value === null ? null : value >= 0 ? positive : negative));

export const computeIndicatorSeries = (indicator: ActiveIndicator, candles: Candle[]): IndicatorComputedSeries => {
  const definition = getIndicatorDefinition(indicator.definitionId);
  const settings = indicator.settings;
  const defaults = definition.defaults;
  const source = settings.source ?? defaults.source ?? 'close';
  const values = getSourceValues(candles, source);
  const closes = candles.map((candle) => candle.close);
  const highs = candles.map((candle) => candle.high);
  const lows = candles.map((candle) => candle.low);
  const volumes = candles.map((candle) => candle.volume);
  const period = sanitizePeriod(settings.period, defaults.period ?? 20);
  const period2 = sanitizePeriod(settings.period2, defaults.period2 ?? 20);
  const period3 = sanitizePeriod(settings.period3, defaults.period3 ?? 20);
  const period4 = sanitizePeriod(settings.period4, defaults.period4 ?? 20);
  const fastPeriod = sanitizePeriod(settings.fastPeriod, defaults.fastPeriod ?? 12);
  const slowPeriod = sanitizePeriod(settings.slowPeriod, defaults.slowPeriod ?? 26);
  const signalPeriod = sanitizePeriod(
    settings.signalPeriod,
    defaults.signalPeriod ?? 9,
    1,
    definition.formula === 'macd' ? 50 : 500
  );
  const stdDev = sanitizeFloat(settings.stdDev, defaults.stdDev ?? 2, 0.1, 10);
  const multiplier = sanitizeFloat(settings.multiplier, defaults.multiplier ?? 2, 0.1, 50);
  const percent = sanitizeFloat(settings.percent, defaults.percent ?? 10, 0.01, 100);
  const offsetValue = sanitizeFloat(settings.offset, defaults.offset ?? 0, -100, 100);
  const sigma = sanitizeFloat(settings.sigma, defaults.sigma ?? 6, 0.1, 100);
  const startValue = sanitizeFloat(settings.startValue, defaults.startValue ?? 0.02, 0.001, 1);
  const increment = sanitizeFloat(settings.increment, defaults.increment ?? 0.02, 0.001, 1);
  const maxValue = sanitizeFloat(settings.maxValue, defaults.maxValue ?? 0.2, 0.01, 1);
  const smoothingType = settings.smoothingType ?? defaults.smoothingType ?? 'RMA';
  const oscillatorMaType = settings.oscillatorMaType ?? defaults.oscillatorMaType ?? 'EMA';
  const signalMaType = settings.signalMaType ?? defaults.signalMaType ?? 'EMA';
  const color = settings.color ?? defaults.color ?? '#2962ff';
  const secondaryColor = settings.secondaryColor ?? defaults.secondaryColor ?? '#ff6d00';
  const tertiaryColor = settings.tertiaryColor ?? defaults.tertiaryColor ?? '#7c8da6';
  const quaternaryColor = settings.quaternaryColor ?? defaults.quaternaryColor ?? '#43a047';
  const quinaryColor = settings.quinaryColor ?? defaults.quinaryColor ?? '#f23645';
  const fillColor = settings.fillColor ?? defaults.fillColor;
  const histogramPositiveColor =
    settings.histogramPositiveColor ?? defaults.histogramPositiveColor ?? '#26a69a';
  const histogramNegativeColor =
    settings.histogramNegativeColor ?? defaults.histogramNegativeColor ?? '#ef5350';
  const shortName = definition.shortName;

  switch (definition.formula) {
    case 'volume':
      return { lines: [] };

    case 'fundamental':
      return { lines: [], noData: true };

    case 'sma':
      return { lines: [{ label: shortName, color, values: simpleMovingAverageValues(values, period) }] };

    case 'ema':
      return { lines: [{ label: shortName, color, values: exponentialMovingAverageValues(values, period) }] };

    case 'wma':
      return { lines: [{ label: shortName, color, values: weightedMovingAverageValues(values, period) }] };

    case 'smma':
      return { lines: [{ label: shortName, color, values: wilderMovingAverageValues(values, period) }] };

    case 'vwma':
      return { lines: [{ label: shortName, color, values: volumeWeightedMovingAverageValues(candles, source, period) }] };

    case 'hma':
      return { lines: [{ label: shortName, color, values: hullMovingAverageValues(values, period) }] };

    case 'dema': {
      const ema1 = exponentialMovingAverageValues(values, period);
      const ema2 = exponentialMovingAverageNullable(ema1, period);
      const dema = combineSeries(ema1, ema2, (a, b) => 2 * a - b);
      return { lines: [{ label: shortName, color, values: dema }] };
    }

    case 'tema': {
      const ema1 = exponentialMovingAverageValues(values, period);
      const ema2 = exponentialMovingAverageNullable(ema1, period);
      const ema3 = exponentialMovingAverageNullable(ema2, period);
      const tema = values.map((_, index) => {
        const e1 = ema1[index];
        const e2 = ema2[index];
        const e3 = ema3[index];
        return e1 !== null && e2 !== null && e3 !== null ? 3 * (e1 - e2) + e3 : null;
      });
      return { lines: [{ label: shortName, color, values: tema }] };
    }

    case 'alma':
      return {
        lines: [
          { label: shortName, color, values: arnaudLegouxMovingAverageValues(values, period, offsetValue, sigma) },
        ],
      };

    case 'lsma':
      return { lines: [{ label: shortName, color, values: linearRegressionValues(values, period, offsetValue) }] };

    case 'mcginley':
      return { lines: [{ label: shortName, color, values: mcginleyDynamicValues(values, period) }] };

    case 'median':
      return { lines: [{ label: shortName, color, values: medianValues(values, period) }] };

    case 'ma-cross': {
      const shortMa = simpleMovingAverageValues(values, period);
      const longMa = simpleMovingAverageValues(values, period2);
      const markers: IndicatorMarker[] = [];

      for (let index = 1; index < candles.length; index += 1) {
        const prevShort = shortMa[index - 1];
        const prevLong = longMa[index - 1];
        const curShort = shortMa[index];
        const curLong = longMa[index];
        if (prevShort === null || prevLong === null || curShort === null || curLong === null) continue;
        if ((prevShort - prevLong) * (curShort - curLong) < 0 || (prevShort === prevLong && curShort !== curLong)) {
          markers.push({
            index,
            price: (curShort + curLong) / 2,
            shape: 'cross',
            color: tertiaryColor,
            position: 'above',
          });
        }
      }

      return {
        lines: [
          { label: `MA ${period}`, color, values: shortMa },
          { label: `MA ${period2}`, color: secondaryColor, values: longMa },
        ],
        markers,
      };
    }

    case 'ma-ribbon':
      return {
        lines: [
          { label: `MA ${period}`, color, values: simpleMovingAverageValues(values, period) },
          { label: `MA ${period2}`, color: secondaryColor, values: simpleMovingAverageValues(values, period2) },
          { label: `MA ${period3}`, color: tertiaryColor, values: simpleMovingAverageValues(values, period3) },
          { label: `MA ${period4}`, color: quaternaryColor, values: simpleMovingAverageValues(values, period4) },
        ],
      };

    case 'bb': {
      const bands = calculateBollingerBands(values, period, stdDev);
      return {
        fillColor,
        fills: fillColor ? [{ upper: 1, lower: 2, color: fillColor }] : undefined,
        lines: [
          { label: 'Basis', color, values: bands.basis },
          { label: 'Upper', color: secondaryColor, values: bands.upper },
          { label: 'Lower', color: tertiaryColor, values: bands.lower },
        ],
      };
    }

    case 'bb-percent': {
      const bands = calculateBollingerBands(values, period, stdDev);
      const line = values.map((value, index) => {
        const upper = bands.upper[index];
        const lower = bands.lower[index];
        if (upper === null || lower === null || upper === lower) return null;
        return (value - lower) / (upper - lower);
      });
      return {
        lines: [{ label: shortName, color, values: line }],
        guideLines: [{ value: 1 }, { value: 0.5 }, { value: 0 }],
        guideBand: { from: 0, to: 1, color: 'rgba(41, 98, 255, 0.08)' },
      };
    }

    case 'bb-width': {
      const bands = calculateBollingerBands(values, period, stdDev);
      const line = values.map((_, index) => {
        const upper = bands.upper[index];
        const lower = bands.lower[index];
        const basis = bands.basis[index];
        if (upper === null || lower === null || basis === null || basis === 0) return null;
        return (upper - lower) / basis;
      });
      return { lines: [{ label: shortName, color, values: line }] };
    }

    case 'keltner': {
      const basis = exponentialMovingAverageValues(values, period);
      const atr = averageTrueRangeValues(candles, period2);
      const upper = combineSeries(basis, atr, (b, a) => b + a * multiplier);
      const lower = combineSeries(basis, atr, (b, a) => b - a * multiplier);
      return {
        fills: fillColor ? [{ upper: 1, lower: 2, color: fillColor }] : undefined,
        lines: [
          { label: 'Basis', color, values: basis },
          { label: 'Upper', color: secondaryColor, values: upper },
          { label: 'Lower', color: tertiaryColor, values: lower },
        ],
      };
    }

    case 'donchian': {
      const channels = calculateDonchianSeries(candles, period);
      return {
        fills: fillColor ? [{ upper: 0, lower: 1, color: fillColor }] : undefined,
        lines: [
          { label: 'Upper', color, values: channels.upper },
          { label: 'Lower', color: secondaryColor, values: channels.lower },
          { label: 'Basis', color: tertiaryColor, values: channels.middle },
        ],
      };
    }

    case 'env': {
      const basis =
        oscillatorMaType === 'EMA'
          ? exponentialMovingAverageValues(values, period)
          : simpleMovingAverageValues(values, period);
      const upper = mapSeries(basis, (value) => value * (1 + percent / 100));
      const lower = mapSeries(basis, (value) => value * (1 - percent / 100));
      return {
        fills: fillColor ? [{ upper: 1, lower: 2, color: fillColor }] : undefined,
        lines: [
          { label: 'Basis', color, values: basis },
          { label: 'Upper', color: secondaryColor, values: upper },
          { label: 'Lower', color: tertiaryColor, values: lower },
        ],
      };
    }

    case 'ichimoku': {
      const ichimoku = calculateIchimokuSeries(candles, period, period2, period3, period4);
      return {
        fills: [
          {
            upper: 3,
            lower: 4,
            upColor: 'rgba(8, 153, 129, 0.12)',
            downColor: 'rgba(242, 54, 69, 0.12)',
          },
        ],
        lines: [
          { label: 'Conversion', color, values: ichimoku.conversion },
          { label: 'Base', color: secondaryColor, values: ichimoku.base },
          { label: 'Lagging', color: tertiaryColor, values: ichimoku.lagging },
          { label: 'Lead 1', color: quaternaryColor, values: ichimoku.spanA },
          { label: 'Lead 2', color: quinaryColor, values: ichimoku.spanB },
        ],
      };
    }

    case 'supertrend': {
      const { supertrend, direction } = calculateSupertrendSeries(candles, period, multiplier);
      const colors = direction.map((trend) => (trend === null ? null : trend === 1 ? color : secondaryColor));
      return {
        lines: [
          {
            label: 'Supertrend',
            color,
            values: supertrend,
            colors,
            lineWidth: 2,
          },
        ],
      };
    }

    case 'psar':
      return {
        lines: [
          {
            label: shortName,
            color,
            values: calculateParabolicSarValues(candles, startValue, increment, maxValue),
            style: 'cross',
          },
        ],
      };

    case 'vstop': {
      const { stop, direction } = calculateVolatilityStopSeries(candles, source, period, multiplier);
      const colors = direction.map((trend) => (trend === null ? null : trend === 1 ? color : secondaryColor));
      return {
        lines: [{ label: shortName, color, values: stop, colors, style: 'dots' }],
      };
    }

    case 'chande-kroll': {
      const atrP = averageTrueRangeValues(candles, period);
      const highestP = highestValues(highs, period);
      const lowestP = lowestValues(lows, period);
      const firstHighStop = combineSeries(highestP, atrP, (h, a) => h - multiplier * a);
      const firstLowStop = combineSeries(lowestP, atrP, (l, a) => l + multiplier * a);
      const stopShort = emptySeries(candles.length);
      const stopLong = emptySeries(candles.length);

      for (let index = 0; index < candles.length; index += 1) {
        let highestStop: number | null = null;
        let lowestStop: number | null = null;
        let valid = true;

        for (let back = 0; back < period2; back += 1) {
          const position = index - back;
          if (position < 0) {
            valid = false;
            break;
          }
          const highValue = firstHighStop[position];
          const lowValue = firstLowStop[position];
          if (highValue === null || lowValue === null) {
            valid = false;
            break;
          }
          highestStop = highestStop === null ? highValue : Math.max(highestStop, highValue);
          lowestStop = lowestStop === null ? lowValue : Math.min(lowestStop, lowValue);
        }

        if (valid) {
          stopShort[index] = highestStop;
          stopLong[index] = lowestStop;
        }
      }

      return {
        lines: [
          { label: 'Stop Long', color, values: stopLong },
          { label: 'Stop Short', color: secondaryColor, values: stopShort },
        ],
      };
    }

    case 'pivots-std': {
      const levels = calculatePivotPointsStandard(candles, inferIntervalMs(candles));
      const lineOf = (label: string, lineValues: Series, lineColor: string): IndicatorLineSeries => ({
        label,
        color: lineColor,
        values: lineValues,
        style: 'step',
        lineWidth: 1,
      });
      return {
        lines: [
          lineOf('P', levels.p, color),
          lineOf('R1', levels.r1, secondaryColor),
          lineOf('S1', levels.s1, tertiaryColor),
          lineOf('R2', levels.r2, secondaryColor),
          lineOf('S2', levels.s2, tertiaryColor),
          lineOf('R3', levels.r3, secondaryColor),
          lineOf('S3', levels.s3, tertiaryColor),
        ],
      };
    }

    case 'pivots-hl': {
      const { highs: pivotHighs, lows: pivotLows } = calculatePivotPointsHighLow(candles, period, period2);
      const markers: IndicatorMarker[] = [
        ...pivotHighs.map((pivot): IndicatorMarker => ({
          index: pivot.index,
          price: pivot.price,
          shape: 'label',
          color,
          position: 'above',
        })),
        ...pivotLows.map((pivot): IndicatorMarker => ({
          index: pivot.index,
          price: pivot.price,
          shape: 'label',
          color: secondaryColor,
          position: 'below',
        })),
      ];
      return { lines: [], markers };
    }

    case 'zigzag':
      return {
        lines: [
          {
            label: shortName,
            color,
            values: calculateZigZagSeries(candles, percent, period),
            connectNulls: true,
            lineWidth: 2,
          },
        ],
      };

    case 'fractals': {
      const { highs: pivotHighs, lows: pivotLows } = calculatePivotPointsHighLow(candles, period, period);
      const markers: IndicatorMarker[] = [
        ...pivotHighs.map((pivot): IndicatorMarker => ({
          index: pivot.index,
          price: pivot.price,
          shape: 'triangleUp',
          color,
          position: 'above',
        })),
        ...pivotLows.map((pivot): IndicatorMarker => ({
          index: pivot.index,
          price: pivot.price,
          shape: 'triangleDown',
          color: secondaryColor,
          position: 'below',
        })),
      ];
      return { lines: [], markers };
    }

    case 'alligator': {
      const alligator = calculateAlligatorSeries(candles, period, 8, period2, 5, period3, 3);
      return {
        lines: [
          { label: 'Jaw', color, values: alligator.jaw },
          { label: 'Teeth', color: secondaryColor, values: alligator.teeth },
          { label: 'Lips', color: tertiaryColor, values: alligator.lips },
        ],
      };
    }

    case 'linreg-channel': {
      const length = Math.min(period, candles.length);
      const basis = emptySeries(candles.length);
      const upper = emptySeries(candles.length);
      const lower = emptySeries(candles.length);

      if (length >= 2) {
        const startIndex = candles.length - length;
        const window = values.slice(startIndex);
        const sumX = ((length - 1) * length) / 2;
        const sumXX = ((length - 1) * length * (2 * length - 1)) / 6;
        let sumY = 0;
        let sumXY = 0;
        window.forEach((y, x) => {
          sumY += y;
          sumXY += x * y;
        });
        const denominator = length * sumXX - sumX * sumX;
        const slope = denominator === 0 ? 0 : (length * sumXY - sumX * sumY) / denominator;
        const interceptValue = (sumY - slope * sumX) / length;

        let variance = 0;
        window.forEach((y, x) => {
          variance += (y - (interceptValue + slope * x)) ** 2;
        });
        const deviation = Math.sqrt(variance / length);

        window.forEach((_, x) => {
          const fitted = interceptValue + slope * x;
          basis[startIndex + x] = fitted;
          upper[startIndex + x] = fitted + multiplier * deviation;
          lower[startIndex + x] = fitted - multiplier * deviation;
        });
      }

      return {
        fills: fillColor ? [{ upper: 1, lower: 2, color: fillColor }] : undefined,
        lines: [
          { label: 'Basis', color, values: basis },
          { label: 'Upper', color: secondaryColor, values: upper },
          { label: 'Lower', color: tertiaryColor, values: lower },
        ],
      };
    }

    case 'vwap':
      return { lines: [{ label: shortName, color, values: calculateVwapValues(candles, source) }] };

    case 'twap':
      return { lines: [{ label: shortName, color, values: calculateTwapValues(candles) }] };

    case 'rsi':
      return {
        lines: [{ label: shortName, color, values: calculateRsiValues(values, period) }],
        guideLines: [{ value: 70 }, { value: 50 }, { value: 30 }],
        guideBand: { from: 30, to: 70, color: 'rgba(126, 87, 194, 0.08)' },
      };

    case 'macd': {
      const macd = calculateMacdSeries(values, fastPeriod, slowPeriod, signalPeriod, oscillatorMaType, signalMaType);
      const hasCustomHistogramColors =
        settings.histogramPositiveColor !== undefined || settings.histogramNegativeColor !== undefined;
      return {
        lines: [
          { label: 'MACD', color, values: macd.macd },
          { label: 'Signal', color: secondaryColor, values: macd.signal },
        ],
        histogram: macd.histogram,
        histogramPositive: histogramPositiveColor,
        histogramNegative: histogramNegativeColor,
        histogramColors: hasCustomHistogramColors
          ? signColorHistogram(macd.histogram, histogramPositiveColor, histogramNegativeColor)
          : fourColorHistogram(macd.histogram),
        guideLines: [{ value: 0 }],
      };
    }

    case 'stochastic': {
      const raw = calculateStochasticRaw(highs, lows, closes, period);
      const k = simpleMovingAverageNullable(raw, period2);
      const d = simpleMovingAverageNullable(k, signalPeriod);
      return {
        lines: [
          { label: '%K', color, values: k },
          { label: '%D', color: secondaryColor, values: d },
        ],
        guideLines: [{ value: 80 }, { value: 20 }],
        guideBand: { from: 20, to: 80, color: 'rgba(41, 98, 255, 0.06)' },
      };
    }

    case 'stoch-rsi': {
      const rsi = calculateRsiValues(values, period2);
      const rsiNumbers = rsi.map((value) => value);
      const stochOfRsi = emptySeries(candles.length);

      for (let index = 0; index < candles.length; index += 1) {
        const current = rsiNumbers[index];
        if (current === null || index < period - 1) continue;

        let highest: number | null = null;
        let lowest: number | null = null;
        let valid = true;
        for (let back = 0; back < period; back += 1) {
          const value = rsiNumbers[index - back];
          if (value === null) {
            valid = false;
            break;
          }
          highest = highest === null ? value : Math.max(highest, value);
          lowest = lowest === null ? value : Math.min(lowest, value);
        }
        if (!valid || highest === null || lowest === null) continue;
        const range = highest - lowest;
        stochOfRsi[index] = range === 0 ? null : ((current - lowest) / range) * 100;
      }

      const k = simpleMovingAverageNullable(stochOfRsi, period3);
      const d = simpleMovingAverageNullable(k, signalPeriod);
      return {
        lines: [
          { label: '%K', color, values: k },
          { label: '%D', color: secondaryColor, values: d },
        ],
        guideLines: [{ value: 80 }, { value: 20 }],
        guideBand: { from: 20, to: 80, color: 'rgba(41, 98, 255, 0.06)' },
      };
    }

    case 'smi': {
      const highest = highestValues(highs, period);
      const lowest = lowestValues(lows, period);
      const relative: Series = closes.map((close, index) => {
        const hh = highest[index];
        const ll = lowest[index];
        return hh !== null && ll !== null ? close - (hh + ll) / 2 : null;
      });
      const range: Series = candles.map((_, index) => {
        const hh = highest[index];
        const ll = lowest[index];
        return hh !== null && ll !== null ? hh - ll : null;
      });
      const relSmoothed = exponentialMovingAverageNullable(
        exponentialMovingAverageNullable(relative, period2),
        period2
      );
      const rangeSmoothed = exponentialMovingAverageNullable(
        exponentialMovingAverageNullable(range, period2),
        period2
      );
      const smi: Series = candles.map((_, index) => {
        const rel = relSmoothed[index];
        const rng = rangeSmoothed[index];
        if (rel === null || rng === null || rng === 0) return null;
        return (200 * rel) / rng;
      });
      const signal = exponentialMovingAverageNullable(smi, period2);
      return {
        lines: [
          { label: 'SMI', color, values: smi },
          { label: 'Signal', color: secondaryColor, values: signal },
        ],
        guideLines: [{ value: 40 }, { value: -40 }],
      };
    }

    case 'cmo': {
      const momUp: number[] = values.map((value, index) =>
        index > 0 ? Math.max(value - values[index - 1], 0) : 0
      );
      const momDown: number[] = values.map((value, index) =>
        index > 0 ? Math.max(values[index - 1] - value, 0) : 0
      );
      const upSum = rollingSumValues(momUp.slice(1), period);
      const downSum = rollingSumValues(momDown.slice(1), period);
      const cmo = emptySeries(values.length);

      for (let index = 1; index < values.length; index += 1) {
        const up = upSum[index - 1];
        const down = downSum[index - 1];
        if (up === null || down === null) continue;
        const total = up + down;
        cmo[index] = total === 0 ? 0 : (100 * (up - down)) / total;
      }

      return {
        lines: [{ label: shortName, color, values: cmo }],
        guideLines: [{ value: 50 }, { value: 0 }, { value: -50 }],
      };
    }

    case 'momentum':
      return {
        lines: [
          {
            label: shortName,
            color,
            values: values.map((value, index) => (index >= period ? value - values[index - period] : null)),
          },
        ],
        guideLines: [{ value: 0 }],
      };

    case 'roc':
      return {
        lines: [
          {
            label: shortName,
            color,
            values: values.map((value, index) => {
              if (index < period || values[index - period] === 0) return null;
              return ((value - values[index - period]) / values[index - period]) * 100;
            }),
          },
        ],
        guideLines: [{ value: 0 }],
      };

    case 'dpo': {
      const barsBack = Math.floor(period / 2) + 1;
      const ma = simpleMovingAverageValues(values, period);
      const dpo = values.map((value, index) => {
        const reference = index - barsBack >= 0 ? ma[index - barsBack] : null;
        return reference !== null ? value - reference : null;
      });
      return { lines: [{ label: shortName, color, values: dpo }], guideLines: [{ value: 0 }] };
    }

    case 'ppo': {
      const fast =
        oscillatorMaType === 'EMA'
          ? exponentialMovingAverageValues(values, fastPeriod)
          : simpleMovingAverageValues(values, fastPeriod);
      const slow =
        oscillatorMaType === 'EMA'
          ? exponentialMovingAverageValues(values, slowPeriod)
          : simpleMovingAverageValues(values, slowPeriod);
      const ppo = combineSeries(fast, slow, (f, s) => (s === 0 ? 0 : ((f - s) / s) * 100));
      return { lines: [{ label: shortName, color, values: ppo }], guideLines: [{ value: 0 }] };
    }

    case 'awesome': {
      const median = candles.map((candle) => (candle.high + candle.low) / 2);
      const ao = subtractSeries(
        simpleMovingAverageValues(median, fastPeriod),
        simpleMovingAverageValues(median, slowPeriod)
      );
      return {
        lines: [],
        histogram: ao,
        histogramColors: deltaColorHistogram(ao, histogramPositiveColor, histogramNegativeColor),
        histogramPositive: histogramPositiveColor,
        histogramNegative: histogramNegativeColor,
        guideLines: [{ value: 0 }],
      };
    }

    case 'adx': {
      const { adx } = calculateDmiSeries(candles, period2, period);
      return { lines: [{ label: shortName, color, values: adx }] };
    }

    case 'dmi': {
      const { plusDi, minusDi, adx } = calculateDmiSeries(candles, period2, period);
      return {
        lines: [
          { label: '+DI', color, values: plusDi },
          { label: '-DI', color: secondaryColor, values: minusDi },
          { label: 'ADX', color: tertiaryColor, values: adx },
        ],
      };
    }

    case 'aroon': {
      const upper = emptySeries(candles.length);
      const lower = emptySeries(candles.length);

      for (let index = period; index < candles.length; index += 1) {
        let highestOffset = 0;
        let lowestOffset = 0;
        let highest = -Infinity;
        let lowest = Infinity;

        for (let offset = 0; offset <= period; offset += 1) {
          const high = highs[index - offset];
          const low = lows[index - offset];
          if (high > highest) {
            highest = high;
            highestOffset = offset;
          }
          if (low < lowest) {
            lowest = low;
            lowestOffset = offset;
          }
        }

        upper[index] = ((period - highestOffset) / period) * 100;
        lower[index] = ((period - lowestOffset) / period) * 100;
      }

      return {
        lines: [
          { label: 'Up', color, values: upper },
          { label: 'Down', color: secondaryColor, values: lower },
        ],
        guideLines: [{ value: 70 }, { value: 30 }],
      };
    }

    case 'cci': {
      const ma = simpleMovingAverageValues(values, period);
      const cci = emptySeries(values.length);

      for (let index = period - 1; index < values.length; index += 1) {
        const mean = ma[index];
        if (mean === null) continue;

        let deviation = 0;
        for (let offset = 0; offset < period; offset += 1) {
          deviation += Math.abs(values[index - offset] - mean);
        }
        deviation /= period;
        cci[index] = deviation === 0 ? 0 : (values[index] - mean) / (0.015 * deviation);
      }

      return {
        lines: [{ label: shortName, color, values: cci }],
        guideLines: [{ value: 100 }, { value: 0 }, { value: -100 }],
        guideBand: { from: -100, to: 100, color: 'rgba(41, 98, 255, 0.06)' },
      };
    }

    case 'crsi': {
      const priceRsi = calculateRsiValues(values, period);
      const streaks: number[] = new Array(values.length).fill(0);
      for (let index = 1; index < values.length; index += 1) {
        const change = values[index] - values[index - 1];
        if (change > 0) streaks[index] = streaks[index - 1] > 0 ? streaks[index - 1] + 1 : 1;
        else if (change < 0) streaks[index] = streaks[index - 1] < 0 ? streaks[index - 1] - 1 : -1;
        else streaks[index] = 0;
      }
      const streakRsi = calculateRsiValues(streaks, period2);
      const oneDayRoc: Series = values.map((value, index) => {
        if (index === 0 || values[index - 1] === 0) return null;
        return ((value - values[index - 1]) / values[index - 1]) * 100;
      });
      const rank = percentRankValues(oneDayRoc, period3);
      const crsi: Series = values.map((_, index) => {
        const a = priceRsi[index];
        const b = streakRsi[index];
        const c = rank[index];
        return a !== null && b !== null && c !== null ? (a + b + c) / 3 : null;
      });
      return {
        lines: [{ label: shortName, color, values: crsi }],
        guideLines: [{ value: 70 }, { value: 30 }],
      };
    }

    case 'coppock': {
      const longRoc: Series = values.map((value, index) => {
        if (index < slowPeriod || values[index - slowPeriod] === 0) return null;
        return ((value - values[index - slowPeriod]) / values[index - slowPeriod]) * 100;
      });
      const shortRoc: Series = values.map((value, index) => {
        if (index < fastPeriod || values[index - fastPeriod] === 0) return null;
        return ((value - values[index - fastPeriod]) / values[index - fastPeriod]) * 100;
      });
      const summed = combineSeries(longRoc, shortRoc, (a, b) => a + b);
      const coppock = weightedMovingAverageNullable(summed, period);
      return { lines: [{ label: shortName, color, values: coppock }], guideLines: [{ value: 0 }] };
    }

    case 'kst': {
      const rocSeries = (length: number): Series =>
        values.map((value, index) => {
          if (index < length || values[index - length] === 0) return null;
          return ((value - values[index - length]) / values[index - length]) * 100;
        });
      const smaRoc1 = simpleMovingAverageNullable(rocSeries(period), 10);
      const smaRoc2 = simpleMovingAverageNullable(rocSeries(period2), 10);
      const smaRoc3 = simpleMovingAverageNullable(rocSeries(period3), 10);
      const smaRoc4 = simpleMovingAverageNullable(rocSeries(period4), 15);
      const kst: Series = values.map((_, index) => {
        const a = smaRoc1[index];
        const b = smaRoc2[index];
        const c = smaRoc3[index];
        const d = smaRoc4[index];
        return a !== null && b !== null && c !== null && d !== null ? a + 2 * b + 3 * c + 4 * d : null;
      });
      const signal = simpleMovingAverageNullable(kst, signalPeriod);
      return {
        lines: [
          { label: 'KST', color, values: kst },
          { label: 'Signal', color: secondaryColor, values: signal },
        ],
        guideLines: [{ value: 0 }],
      };
    }

    case 'tsi': {
      const pc = changeValues(values);
      const absPc = mapSeries(pc, Math.abs);
      const doubleSmoothed = exponentialMovingAverageNullable(
        exponentialMovingAverageNullable(pc, slowPeriod),
        fastPeriod
      );
      const doubleSmoothedAbs = exponentialMovingAverageNullable(
        exponentialMovingAverageNullable(absPc, slowPeriod),
        fastPeriod
      );
      const tsi: Series = values.map((_, index) => {
        const numerator = doubleSmoothed[index];
        const denominator = doubleSmoothedAbs[index];
        if (numerator === null || denominator === null || denominator === 0) return null;
        return (100 * numerator) / denominator;
      });
      const signal = exponentialMovingAverageNullable(tsi, signalPeriod);
      return {
        lines: [
          { label: 'TSI', color, values: tsi },
          { label: 'Signal', color: secondaryColor, values: signal },
        ],
        guideLines: [{ value: 0 }],
      };
    }

    case 'trix': {
      const logValues = values.map((value) => Math.log(Math.max(value, Number.EPSILON)));
      const ema1 = exponentialMovingAverageValues(logValues, period);
      const ema2 = exponentialMovingAverageNullable(ema1, period);
      const ema3 = exponentialMovingAverageNullable(ema2, period);
      const trix: Series = values.map((_, index) => {
        const current = ema3[index];
        const previous = index > 0 ? ema3[index - 1] : null;
        return current !== null && previous !== null ? (current - previous) * 10000 : null;
      });
      return { lines: [{ label: shortName, color, values: trix }], guideLines: [{ value: 0 }] };
    }

    case 'uo': {
      const buyingPressure: number[] = [];
      const trueRange: number[] = [];

      candles.forEach((candle, index) => {
        const previousClose = candles[index - 1]?.close ?? candle.close;
        const trueLow = Math.min(candle.low, previousClose);
        const trueHigh = Math.max(candle.high, previousClose);
        buyingPressure.push(candle.close - trueLow);
        trueRange.push(trueHigh - trueLow);
      });

      const average = (length: number): Series => {
        const bpSum = rollingSumValues(buyingPressure, length);
        const trSum = rollingSumValues(trueRange, length);
        return combineSeries(bpSum, trSum, (bp, tr) => (tr === 0 ? 0 : bp / tr));
      };

      const fast = average(fastPeriod);
      const middle = average(period);
      const slow = average(slowPeriod);
      const uo: Series = candles.map((_, index) => {
        const f = fast[index];
        const m = middle[index];
        const s = slow[index];
        if (f === null || m === null || s === null) return null;
        return (100 * (4 * f + 2 * m + s)) / 7;
      });

      return { lines: [{ label: shortName, color, values: uo }] };
    }

    case 'willr': {
      const highest = highestValues(highs, period);
      const lowest = lowestValues(lows, period);
      const willr: Series = closes.map((close, index) => {
        const hh = highest[index];
        const ll = lowest[index];
        if (hh === null || ll === null || hh === ll) return null;
        return (100 * (close - hh)) / (hh - ll);
      });
      return {
        lines: [{ label: shortName, color, values: willr }],
        guideLines: [{ value: -20 }, { value: -80 }],
        guideBand: { from: -80, to: -20, color: 'rgba(126, 87, 194, 0.08)' },
      };
    }

    case 'fisher': {
      const hl2 = candles.map((candle) => (candle.high + candle.low) / 2);
      const highest = highestValues(hl2, period);
      const lowest = lowestValues(hl2, period);
      const fisher = emptySeries(candles.length);
      let value = 0;
      let previousFisher = 0;
      let started = false;

      for (let index = 0; index < candles.length; index += 1) {
        const hh = highest[index];
        const ll = lowest[index];
        if (hh === null || ll === null) continue;

        const range = hh - ll;
        const position = range === 0 ? 0 : (hl2[index] - ll) / range;
        value = 0.66 * (position - 0.5) + 0.67 * value;
        value = clampValue(value, -0.999, 0.999);
        const current = 0.5 * Math.log((1 + value) / (1 - value)) + 0.5 * previousFisher;
        fisher[index] = current;
        previousFisher = current;
        started = true;
      }

      const trigger: Series = fisher.map((_, index) => (index > 0 ? fisher[index - 1] : null));
      if (!started) return { lines: [] };

      return {
        lines: [
          { label: 'Fisher', color, values: fisher },
          { label: 'Trigger', color: secondaryColor, values: trigger },
        ],
        guideLines: [{ value: 1.5 }, { value: 0.75 }, { value: 0 }, { value: -0.75 }, { value: -1.5 }],
      };
    }

    case 'rvgi': {
      const closeOpen = candles.map((candle) => candle.close - candle.open);
      const highLow = candles.map((candle) => candle.high - candle.low);
      const numerator = rollingSumNullable(symmetricalWeightedValues(closeOpen), period);
      const denominator = rollingSumNullable(symmetricalWeightedValues(highLow), period);
      const rvgi = combineSeries(numerator, denominator, (n, d) => (d === 0 ? 0 : n / d));
      const rvgiNumbers = rvgi.map((value) => value);
      const signal: Series = rvgiNumbers.map((_, index) => {
        const v0 = rvgiNumbers[index];
        const v1 = index >= 1 ? rvgiNumbers[index - 1] : null;
        const v2 = index >= 2 ? rvgiNumbers[index - 2] : null;
        const v3 = index >= 3 ? rvgiNumbers[index - 3] : null;
        if (v0 === null || v1 === null || v2 === null || v3 === null) return null;
        return (v0 + 2 * v1 + 2 * v2 + v3) / 6;
      });
      return {
        lines: [
          { label: 'RVGI', color, values: rvgi },
          { label: 'Signal', color: secondaryColor, values: signal },
        ],
        guideLines: [{ value: 0 }],
      };
    }

    case 'rvi': {
      const deviation = standardDeviationValues(values, period);
      const upMove: Series = values.map((value, index) => {
        if (index === 0 || deviation[index] === null) return null;
        return value - values[index - 1] <= 0 ? 0 : deviation[index];
      });
      const downMove: Series = values.map((value, index) => {
        if (index === 0 || deviation[index] === null) return null;
        return value - values[index - 1] > 0 ? 0 : deviation[index];
      });
      const upper = exponentialMovingAverageNullable(upMove, period2);
      const lower = exponentialMovingAverageNullable(downMove, period2);
      const rvi = combineSeries(upper, lower, (up, down) => (up + down === 0 ? 0 : (100 * up) / (up + down)));
      return {
        lines: [{ label: shortName, color, values: rvi }],
        guideLines: [{ value: 80 }, { value: 20 }],
      };
    }

    case 'smi-ergodic':
    case 'smi-ergodic-osc': {
      const pc = changeValues(values);
      const absPc = mapSeries(pc, Math.abs);
      const doubleSmoothed = exponentialMovingAverageNullable(
        exponentialMovingAverageNullable(pc, fastPeriod),
        slowPeriod
      );
      const doubleSmoothedAbs = exponentialMovingAverageNullable(
        exponentialMovingAverageNullable(absPc, fastPeriod),
        slowPeriod
      );
      const smi: Series = values.map((_, index) => {
        const numerator = doubleSmoothed[index];
        const denominator = doubleSmoothedAbs[index];
        if (numerator === null || denominator === null || denominator === 0) return null;
        return numerator / denominator;
      });
      const signal = exponentialMovingAverageNullable(smi, signalPeriod);

      if (definition.formula === 'smi-ergodic') {
        return {
          lines: [
            { label: 'SMI', color, values: smi },
            { label: 'Signal', color: secondaryColor, values: signal },
          ],
          guideLines: [{ value: 0 }],
        };
      }

      const oscillator = subtractSeries(smi, signal);
      return {
        lines: [],
        histogram: oscillator,
        histogramColors: signColorHistogram(oscillator, histogramPositiveColor, histogramNegativeColor),
        histogramPositive: histogramPositiveColor,
        histogramNegative: histogramNegativeColor,
        guideLines: [{ value: 0 }],
      };
    }

    case 'bop': {
      const bop = candles.map((candle) => {
        const range = candle.high - candle.low;
        return range === 0 ? 0 : (candle.close - candle.open) / range;
      });
      return { lines: [{ label: shortName, color, values: bop }], guideLines: [{ value: 0 }] };
    }

    case 'bbtrend': {
      const shortBands = calculateBollingerBands(values, period, stdDev);
      const longBands = calculateBollingerBands(values, period2, stdDev);
      const bbtrend: Series = values.map((_, index) => {
        const lowerShort = shortBands.lower[index];
        const upperShort = shortBands.upper[index];
        const basisShort = shortBands.basis[index];
        const lowerLong = longBands.lower[index];
        const upperLong = longBands.upper[index];
        if (
          lowerShort === null ||
          upperShort === null ||
          basisShort === null ||
          lowerLong === null ||
          upperLong === null ||
          basisShort === 0
        ) {
          return null;
        }
        return ((Math.abs(lowerShort - lowerLong) - Math.abs(upperShort - upperLong)) / basisShort) * 100;
      });
      return {
        lines: [],
        histogram: bbtrend,
        histogramColors: signColorHistogram(bbtrend, histogramPositiveColor, histogramNegativeColor),
        histogramPositive: histogramPositiveColor,
        histogramNegative: histogramNegativeColor,
        guideLines: [{ value: 0 }],
      };
    }

    case 'bbp': {
      const ema = exponentialMovingAverageValues(closes, period);
      const bbp: Series = candles.map((candle, index) => {
        const emaValue = ema[index];
        return emaValue !== null ? candle.high + candle.low - 2 * emaValue : null;
      });
      return { lines: [{ label: shortName, color, values: bbp }], guideLines: [{ value: 0 }] };
    }

    case 'chop': {
      const atrSum = rollingSumValues(trueRangeValues(candles), period);
      const highest = highestValues(highs, period);
      const lowest = lowestValues(lows, period);
      const chop: Series = candles.map((_, index) => {
        const sum = atrSum[index];
        const hh = highest[index];
        const ll = lowest[index];
        if (sum === null || hh === null || ll === null || hh === ll || sum <= 0) return null;
        return (100 * Math.log10(sum / (hh - ll))) / Math.log10(period);
      });
      return {
        lines: [{ label: shortName, color, values: chop }],
        guideLines: [{ value: 61.8 }, { value: 38.2 }],
        guideBand: { from: 38.2, to: 61.8, color: 'rgba(41, 98, 255, 0.06)' },
      };
    }

    case 'chop-zone': {
      const hlc3 = candles.map((candle) => (candle.high + candle.low + candle.close) / 3);
      const highest = highestValues(highs, period);
      const lowest = lowestValues(lows, period);
      const ema34 = exponentialMovingAverageValues(closes, period2);
      const columnValues = emptySeries(candles.length);
      const colors: Array<string | null> = new Array(candles.length).fill(null);

      for (let index = 0; index < candles.length; index += 1) {
        const hh = highest[index];
        const ll = lowest[index];
        const emaCurrent = ema34[index];
        const emaPrevious = index > 0 ? ema34[index - 1] : null;
        if (hh === null || ll === null || emaCurrent === null || emaPrevious === null || hh === ll) continue;

        const span = (25 / (hh - ll)) * ll;
        const y2 = ((emaPrevious - emaCurrent) / hlc3[index]) * span;
        const c = Math.sqrt(1 + y2 * y2);
        const angleMagnitude = Math.round((Math.acos(1 / c) * 180) / Math.PI);
        const angle = y2 > 0 ? -angleMagnitude : angleMagnitude;

        columnValues[index] = 1;
        if (angle >= 5) colors[index] = '#26c6da';
        else if (angle >= 3.57) colors[index] = '#43a047';
        else if (angle >= 2.14) colors[index] = '#a5d6a7';
        else if (angle >= 0.71) colors[index] = '#009688';
        else if (angle <= -5) colors[index] = '#d50000';
        else if (angle <= -3.57) colors[index] = '#e57373';
        else if (angle <= -2.14) colors[index] = '#ff6d00';
        else if (angle <= -0.71) colors[index] = '#ffb74d';
        else colors[index] = '#fdd835';
      }

      return {
        lines: [],
        histogram: columnValues,
        histogramColors: colors,
        min: 0,
        max: 1,
      };
    }

    case 'atr':
      return {
        lines: [
          { label: shortName, color, values: smoothedAverageBy(trueRangeValues(candles), period, smoothingType) },
        ],
      };

    case 'adr': {
      const ranges = candles.map((candle) => candle.high - candle.low);
      return { lines: [{ label: shortName, color, values: simpleMovingAverageValues(ranges, period) }] };
    }

    case 'hv': {
      const intervalMs = inferIntervalMs(candles);
      const annual = 365;
      const per = intervalMs <= DAY_MS ? 1 : intervalMs <= 7 * DAY_MS ? 7 : 30;
      const logReturns: Series = closes.map((close, index) => {
        if (index === 0 || closes[index - 1] === 0) return null;
        return Math.log(close / closes[index - 1]);
      });
      const compact: number[] = [];
      const positions: number[] = [];
      logReturns.forEach((value, index) => {
        if (value !== null) {
          compact.push(value);
          positions.push(index);
        }
      });
      const deviation = standardDeviationValues(compact, period);
      const hv = emptySeries(candles.length);
      deviation.forEach((value, position) => {
        if (value !== null) hv[positions[position]] = 100 * value * Math.sqrt(annual / per);
      });
      return { lines: [{ label: shortName, color, values: hv }] };
    }

    case 'mass': {
      const range = candles.map((candle) => candle.high - candle.low);
      const ema9 = exponentialMovingAverageValues(range, 9);
      const ema9of9 = exponentialMovingAverageNullable(ema9, 9);
      const ratio = combineSeries(ema9, ema9of9, (a, b) => (b === 0 ? 0 : a / b));
      const mass = rollingSumNullable(ratio, period);
      return { lines: [{ label: shortName, color, values: mass }] };
    }

    case 'vortex': {
      const trSum = rollingSumValues(trueRangeValues(candles), period);
      const vmPlus: number[] = candles.map((candle, index) =>
        index > 0 ? Math.abs(candle.high - candles[index - 1].low) : 0
      );
      const vmMinus: number[] = candles.map((candle, index) =>
        index > 0 ? Math.abs(candle.low - candles[index - 1].high) : 0
      );
      const vmPlusSum = rollingSumValues(vmPlus.slice(1), period);
      const vmMinusSum = rollingSumValues(vmMinus.slice(1), period);
      const viPlus = emptySeries(candles.length);
      const viMinus = emptySeries(candles.length);

      for (let index = 1; index < candles.length; index += 1) {
        const tr = trSum[index];
        const plus = vmPlusSum[index - 1];
        const minus = vmMinusSum[index - 1];
        if (tr === null || plus === null || minus === null || tr === 0) continue;
        viPlus[index] = plus / tr;
        viMinus[index] = minus / tr;
      }

      return {
        lines: [
          { label: 'VI+', color, values: viPlus },
          { label: 'VI-', color: secondaryColor, values: viMinus },
        ],
      };
    }

    case 'efi': {
      const force: Series = candles.map((candle, index) =>
        index > 0 ? (candle.close - candles[index - 1].close) * candle.volume : null
      );
      return {
        lines: [{ label: shortName, color, values: exponentialMovingAverageNullable(force, period) }],
        guideLines: [{ value: 0 }],
      };
    }

    case 'eom': {
      const divisor = 10000;
      const eomRaw: Series = candles.map((candle, index) => {
        if (index === 0 || candle.volume === 0) return null;
        const previous = candles[index - 1];
        const midMove = (candle.high + candle.low) / 2 - (previous.high + previous.low) / 2;
        return (divisor * midMove * (candle.high - candle.low)) / candle.volume;
      });
      return {
        lines: [{ label: shortName, color, values: simpleMovingAverageNullable(eomRaw, period) }],
        guideLines: [{ value: 0 }],
      };
    }

    case 'obv': {
      const obv = emptySeries(candles.length);
      let runningTotal = 0;
      candles.forEach((candle, index) => {
        if (index > 0) {
          const change = candle.close - candles[index - 1].close;
          if (change > 0) runningTotal += candle.volume;
          else if (change < 0) runningTotal -= candle.volume;
        }
        obv[index] = runningTotal;
      });
      return { lines: [{ label: shortName, color, values: obv }] };
    }

    case 'pvt': {
      const pvt = emptySeries(candles.length);
      let runningTotal = 0;
      candles.forEach((candle, index) => {
        if (index > 0 && candles[index - 1].close !== 0) {
          runningTotal +=
            ((candle.close - candles[index - 1].close) / candles[index - 1].close) * candle.volume;
        }
        pvt[index] = runningTotal;
      });
      return { lines: [{ label: shortName, color, values: pvt }] };
    }

    case 'adl':
      return { lines: [{ label: shortName, color, values: calculateAccumulationDistributionValues(candles) }] };

    case 'cmf': {
      const moneyFlowVolume = candles.map((candle) => {
        const range = candle.high - candle.low;
        const multiplierValue =
          range === 0 ? 0 : (candle.close - candle.low - (candle.high - candle.close)) / range;
        return multiplierValue * candle.volume;
      });
      const mfvSum = rollingSumValues(moneyFlowVolume, period);
      const volSum = rollingSumValues(volumes, period);
      const cmf = combineSeries(mfvSum, volSum, (mfv, vol) => (vol === 0 ? 0 : mfv / vol));
      return { lines: [{ label: shortName, color, values: cmf }], guideLines: [{ value: 0 }] };
    }

    case 'chaikin-osc': {
      const adl = calculateAccumulationDistributionValues(candles);
      const fast = exponentialMovingAverageNullable(adl, fastPeriod);
      const slow = exponentialMovingAverageNullable(adl, slowPeriod);
      return {
        lines: [{ label: shortName, color, values: subtractSeries(fast, slow) }],
        guideLines: [{ value: 0 }],
      };
    }

    case 'klinger': {
      const hlc3 = candles.map((candle) => (candle.high + candle.low + candle.close) / 3);
      const signedVolume: Series = candles.map((candle, index) => {
        if (index === 0) return null;
        return hlc3[index] >= hlc3[index - 1] ? candle.volume : -candle.volume;
      });
      const fast = exponentialMovingAverageNullable(signedVolume, 34);
      const slow = exponentialMovingAverageNullable(signedVolume, 55);
      const kvo = subtractSeries(fast, slow);
      const signal = exponentialMovingAverageNullable(kvo, 13);
      return {
        lines: [
          { label: 'KVO', color, values: kvo },
          { label: 'Signal', color: secondaryColor, values: signal },
        ],
        guideLines: [{ value: 0 }],
      };
    }

    case 'mfi': {
      const typical = candles.map((candle) => (candle.high + candle.low + candle.close) / 3);
      const positiveFlow: number[] = new Array(candles.length).fill(0);
      const negativeFlow: number[] = new Array(candles.length).fill(0);

      for (let index = 1; index < candles.length; index += 1) {
        const rawFlow = typical[index] * candles[index].volume;
        if (typical[index] > typical[index - 1]) positiveFlow[index] = rawFlow;
        else if (typical[index] < typical[index - 1]) negativeFlow[index] = rawFlow;
      }

      const positiveSum = rollingSumValues(positiveFlow.slice(1), period);
      const negativeSum = rollingSumValues(negativeFlow.slice(1), period);
      const mfi = emptySeries(candles.length);

      for (let index = 1; index < candles.length; index += 1) {
        const positive = positiveSum[index - 1];
        const negative = negativeSum[index - 1];
        if (positive === null || negative === null) continue;
        mfi[index] = negative === 0 ? 100 : 100 - 100 / (1 + positive / negative);
      }

      return {
        lines: [{ label: shortName, color, values: mfi }],
        guideLines: [{ value: 80 }, { value: 50 }, { value: 20 }],
        guideBand: { from: 20, to: 80, color: 'rgba(126, 87, 194, 0.08)' },
      };
    }

    case 'net-volume': {
      const netVolume: Series = candles.map((candle, index) => {
        if (index === 0) return 0;
        const change = candle.close - candles[index - 1].close;
        if (change > 0) return candle.volume;
        if (change < 0) return -candle.volume;
        return 0;
      });
      return {
        lines: [],
        histogram: netVolume,
        histogramColors: signColorHistogram(netVolume, histogramPositiveColor, histogramNegativeColor),
        histogramPositive: histogramPositiveColor,
        histogramNegative: histogramNegativeColor,
        guideLines: [{ value: 0 }],
      };
    }

    case 'vol-osc': {
      const shortEma = exponentialMovingAverageValues(volumes, fastPeriod);
      const longEma = exponentialMovingAverageValues(volumes, slowPeriod);
      const osc = combineSeries(shortEma, longEma, (short, long) =>
        long === 0 ? 0 : (100 * (short - long)) / long
      );
      return { lines: [{ label: shortName, color, values: osc }], guideLines: [{ value: 0 }] };
    }

    case '24h-volume': {
      const intervalMs = inferIntervalMs(candles);
      const window = Math.max(1, Math.round(DAY_MS / intervalMs));
      const quoteVolume = candles.map((candle) => candle.volume * candle.close);
      const summed = rollingSumValues(quoteVolume, Math.min(window, candles.length));
      return { lines: [{ label: shortName, color, values: summed }] };
    }

    case 'rvol': {
      const intervalMs = inferIntervalMs(candles);
      const cumulativeByDay = emptySeries(candles.length);
      let dayKey = '';
      let cumulative = 0;
      const history = new Map<number, number[]>();
      const result = emptySeries(candles.length);

      candles.forEach((candle, index) => {
        const date = new Date(candle.time);
        const nextKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
        if (nextKey !== dayKey) {
          dayKey = nextKey;
          cumulative = 0;
        }
        cumulative += candle.volume;
        cumulativeByDay[index] = cumulative;

        const bucket = Math.floor((candle.time % DAY_MS) / intervalMs);
        const past = history.get(bucket) ?? [];
        if (past.length > 0) {
          const window = past.slice(-period);
          const mean = window.reduce((sum, item) => sum + item, 0) / window.length;
          result[index] = mean === 0 ? null : cumulative / mean;
        }
        past.push(cumulative);
        history.set(bucket, past);
      });

      return {
        lines: [],
        histogram: result,
        histogramColors: result.map((value) =>
          value === null ? null : value >= 1 ? histogramPositiveColor : histogramNegativeColor
        ),
        histogramPositive: histogramPositiveColor,
        histogramNegative: histogramNegativeColor,
        guideLines: [{ value: 1 }],
      };
    }

    case 'asi': {
      const limit = sanitizeFloat(settings.multiplier, defaults.multiplier ?? 10000, 0.0001, 1000000);
      const asi = emptySeries(candles.length);
      let runningTotal = 0;

      for (let index = 1; index < candles.length; index += 1) {
        const candle = candles[index];
        const previous = candles[index - 1];
        const r1 = Math.abs(candle.high - previous.close);
        const r2 = Math.abs(candle.low - previous.close);
        const r3 = candle.high - candle.low;
        const r4 = Math.abs(previous.close - previous.open);
        let r: number;
        if (r1 >= r2 && r1 >= r3) r = r1 - 0.5 * r2 + 0.25 * r4;
        else if (r2 >= r1 && r2 >= r3) r = r2 - 0.5 * r1 + 0.25 * r4;
        else r = r3 + 0.25 * r4;

        const k = Math.max(r1, r2);
        if (r === 0 || limit === 0) {
          asi[index] = runningTotal;
          continue;
        }

        const swing =
          50 *
          ((candle.close - previous.close +
            0.5 * (candle.close - candle.open) +
            0.25 * (previous.close - previous.open)) /
            r) *
          (k / limit);
        runningTotal += swing;
        asi[index] = runningTotal;
      }

      return { lines: [{ label: shortName, color, values: asi }], guideLines: [{ value: 0 }] };
    }

    case 'woodies-cci': {
      const computeCci = (length: number): Series => {
        const typical = candles.map((candle) => (candle.high + candle.low + candle.close) / 3);
        const ma = simpleMovingAverageValues(typical, length);
        const cci = emptySeries(candles.length);

        for (let index = length - 1; index < candles.length; index += 1) {
          const mean = ma[index];
          if (mean === null) continue;
          let deviation = 0;
          for (let offset = 0; offset < length; offset += 1) {
            deviation += Math.abs(typical[index - offset] - mean);
          }
          deviation /= length;
          cci[index] = deviation === 0 ? 0 : (typical[index] - mean) / (0.015 * deviation);
        }

        return cci;
      };

      const cciMain = computeCci(period);
      const cciTurbo = computeCci(period2);
      return {
        lines: [{ label: 'Turbo', color: secondaryColor, values: cciTurbo }],
        histogram: cciMain,
        histogramColors: signColorHistogram(cciMain, histogramPositiveColor, histogramNegativeColor),
        histogramPositive: histogramPositiveColor,
        histogramNegative: histogramNegativeColor,
        guideLines: [{ value: 100 }, { value: 0 }, { value: -100 }],
      };
    }

    default:
      return { lines: [] };
  }
};

const TECHNICAL_DEFINITIONS: IndicatorDefinition[] = [
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
  },
  {
    id: '24h-volume',
    name: '24-hour Volume',
    shortName: '24h Vol',
    description: 'Rolling 24-hour traded volume in quote currency',
    category: 'Volume',
    pane: 'oscillator',
    formula: '24h-volume',
    defaults: { color: '#2962ff' },
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
    id: 'asi',
    name: 'Accumulative Swing Index',
    shortName: 'ASI',
    description: 'Cumulative Wilder swing index',
    category: 'Trend',
    pane: 'oscillator',
    formula: 'asi',
    defaults: { multiplier: 10000, color: '#2962ff' },
  },
  {
    id: 'alma',
    name: 'Arnaud Legoux Moving Average',
    shortName: 'ALMA',
    description: 'Gaussian weighted moving average',
    category: 'Trend',
    pane: 'price',
    formula: 'alma',
    defaults: { period: 9, offset: 0.85, sigma: 6, source: 'close', color: '#2962ff' },
  },
  {
    id: 'aroon',
    name: 'Aroon',
    shortName: 'Aroon',
    description: 'Bars since highest high and lowest low',
    category: 'Trend',
    pane: 'oscillator',
    formula: 'aroon',
    defaults: { period: 14, color: '#ff6d00', secondaryColor: '#2962ff' },
  },
  {
    id: 'adr',
    name: 'Average Day Range',
    shortName: 'ADR',
    description: 'Average bar range over the period',
    category: 'Volatility',
    pane: 'oscillator',
    formula: 'adr',
    defaults: { period: 14, color: '#2962ff' },
  },
  {
    id: 'adx',
    name: 'Average Directional Index',
    shortName: 'ADX',
    description: 'Trend strength from directional movement',
    category: 'Trend',
    pane: 'oscillator',
    formula: 'adx',
    defaults: { period: 14, period2: 14, color: '#f23645' },
  },
  {
    id: 'atr',
    name: 'Average True Range',
    shortName: 'ATR',
    description: 'Average true range volatility',
    category: 'Volatility',
    pane: 'oscillator',
    formula: 'atr',
    defaults: { period: 14, smoothingType: 'RMA', color: '#b71c1c' },
  },
  {
    id: 'awesome',
    name: 'Awesome Oscillator',
    shortName: 'AO',
    description: 'Median price momentum histogram',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'awesome',
    defaults: { fastPeriod: 5, slowPeriod: 34, histogramPositiveColor: '#089981', histogramNegativeColor: '#f23645' },
  },
  {
    id: 'bop',
    name: 'Balance of Power',
    shortName: 'BOP',
    description: 'Close versus open strength inside the bar range',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'bop',
    defaults: { color: '#f23645' },
  },
  {
    id: 'bbtrend',
    name: 'BBTrend',
    shortName: 'BBTrend',
    description: 'Bollinger Bands trend strength histogram',
    category: 'Trend',
    pane: 'oscillator',
    formula: 'bbtrend',
    defaults: {
      period: 20,
      period2: 50,
      stdDev: 2,
      histogramPositiveColor: '#089981',
      histogramNegativeColor: '#f23645',
    },
  },
  {
    id: 'bb',
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
  },
  {
    id: 'bb-percent',
    name: 'Bollinger Bands %B',
    shortName: 'BB %B',
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
  {
    id: 'bbp',
    name: 'Bull Bear Power',
    shortName: 'BBP',
    description: 'Combined bull and bear power versus EMA',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'bbp',
    defaults: { period: 13, color: '#f23645' },
  },
  {
    id: 'cmf',
    name: 'Chaikin Money Flow',
    shortName: 'CMF',
    description: 'Volume-weighted accumulation over the period',
    category: 'Volume',
    pane: 'oscillator',
    formula: 'cmf',
    defaults: { period: 20, color: '#43a047' },
  },
  {
    id: 'chaikin-osc',
    name: 'Chaikin Oscillator',
    shortName: 'Chaikin Osc',
    description: 'EMA difference of accumulation distribution',
    category: 'Volume',
    pane: 'oscillator',
    formula: 'chaikin-osc',
    defaults: { fastPeriod: 3, slowPeriod: 10, color: '#2962ff' },
  },
  {
    id: 'chande-kroll',
    name: 'Chande Kroll Stop',
    shortName: 'CKS',
    description: 'ATR based long and short stop levels',
    category: 'Trend',
    pane: 'price',
    formula: 'chande-kroll',
    defaults: { period: 10, multiplier: 1, period2: 9, color: '#089981', secondaryColor: '#f23645' },
  },
  {
    id: 'cmo',
    name: 'Chande Momentum Oscillator',
    shortName: 'CMO',
    description: 'Momentum of gains versus losses',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'cmo',
    defaults: { period: 9, source: 'close', color: '#2962ff' },
  },
  {
    id: 'chop-zone',
    name: 'Chop Zone',
    shortName: 'CZ',
    description: 'EMA slope angle classification columns',
    category: 'Trend',
    pane: 'oscillator',
    formula: 'chop-zone',
    defaults: { period: 30, period2: 34 },
  },
  {
    id: 'chop',
    name: 'Choppiness Index',
    shortName: 'CHOP',
    description: 'Trendiness versus sideways chop',
    category: 'Volatility',
    pane: 'oscillator',
    formula: 'chop',
    defaults: { period: 14, color: '#2962ff' },
  },
  {
    id: 'cci',
    name: 'Commodity Channel Index',
    shortName: 'CCI',
    description: 'Deviation from typical price average',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'cci',
    defaults: { period: 20, source: 'hlc3', color: '#2962ff' },
  },
  {
    id: 'crsi',
    name: 'Connors RSI',
    shortName: 'CRSI',
    description: 'Composite RSI of price, streak, and rank',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'crsi',
    defaults: { period: 3, period2: 2, period3: 100, source: 'close', color: '#2962ff' },
  },
  {
    id: 'coppock',
    name: 'Coppock Curve',
    shortName: 'Coppock',
    description: 'Weighted moving average of summed ROCs',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'coppock',
    defaults: { period: 10, slowPeriod: 14, fastPeriod: 11, source: 'close', color: '#2962ff' },
  },
  {
    id: 'dpo',
    name: 'Detrended Price Oscillator',
    shortName: 'DPO',
    description: 'Price distance from displaced moving average',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'dpo',
    defaults: { period: 21, color: '#2962ff' },
  },
  {
    id: 'dmi',
    name: 'Directional Movement Index',
    shortName: 'DMI',
    description: 'Directional movement with ADX',
    category: 'Trend',
    pane: 'oscillator',
    formula: 'dmi',
    defaults: { period: 14, period2: 14, color: '#2962ff', secondaryColor: '#ff6d00', tertiaryColor: '#f23645' },
  },
  {
    id: 'donchian',
    name: 'Donchian Channels',
    shortName: 'DC',
    description: 'High and low price channels',
    category: 'Volatility',
    pane: 'price',
    formula: 'donchian',
    defaults: {
      period: 20,
      color: '#2962ff',
      secondaryColor: '#2962ff',
      tertiaryColor: '#ff6d00',
      fillColor: 'rgba(41, 98, 255, 0.06)',
    },
  },
  {
    id: 'dema',
    name: 'Double EMA',
    shortName: 'DEMA',
    description: 'Double exponential moving average',
    category: 'Trend',
    pane: 'price',
    formula: 'dema',
    defaults: { period: 9, source: 'close', color: '#43a047' },
  },
  {
    id: 'eom',
    name: 'Ease of Movement',
    shortName: 'EOM',
    description: 'Price movement relative to volume',
    category: 'Volume',
    pane: 'oscillator',
    formula: 'eom',
    defaults: { period: 14, color: '#2962ff' },
  },
  {
    id: 'efi',
    name: 'Elder Force Index',
    shortName: 'EFI',
    description: 'Price change weighted by volume',
    category: 'Volume',
    pane: 'oscillator',
    formula: 'efi',
    defaults: { period: 13, color: '#2962ff' },
  },
  {
    id: 'env',
    name: 'Envelope',
    shortName: 'ENV',
    description: 'Percent envelope around a moving average',
    category: 'Trend',
    pane: 'price',
    formula: 'env',
    defaults: {
      period: 20,
      percent: 10,
      source: 'close',
      oscillatorMaType: 'SMA',
      color: '#ff6d00',
      secondaryColor: '#2962ff',
      tertiaryColor: '#2962ff',
      fillColor: 'rgba(41, 98, 255, 0.06)',
    },
  },
  {
    id: 'fisher',
    name: 'Fisher Transform',
    shortName: 'Fisher',
    description: 'Gaussian transform of price extremes',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'fisher',
    defaults: { period: 9, color: '#2962ff', secondaryColor: '#ff6d00' },
  },
  {
    id: 'hv',
    name: 'Historical Volatility',
    shortName: 'HV',
    description: 'Annualized standard deviation of returns',
    category: 'Volatility',
    pane: 'oscillator',
    formula: 'hv',
    defaults: { period: 10, color: '#2962ff' },
  },
  {
    id: 'hma',
    name: 'Hull Moving Average',
    shortName: 'HMA',
    description: 'Fast low-lag weighted moving average',
    category: 'Trend',
    pane: 'price',
    formula: 'hma',
    defaults: { period: 9, source: 'close', color: '#ff6d00' },
  },
  {
    id: 'ichimoku',
    name: 'Ichimoku Cloud',
    shortName: 'Ichimoku',
    description: 'Cloud with conversion, base, and spans',
    category: 'Trend',
    pane: 'price',
    formula: 'ichimoku',
    defaults: {
      period: 9,
      period2: 26,
      period3: 52,
      period4: 26,
      color: '#2962ff',
      secondaryColor: '#b71c1c',
      tertiaryColor: '#43a047',
      quaternaryColor: '#a5d6a7',
      quinaryColor: '#ef9a9a',
    },
  },
  {
    id: 'keltner',
    name: 'Keltner Channels',
    shortName: 'KC',
    description: 'EMA bands offset by average true range',
    category: 'Volatility',
    pane: 'price',
    formula: 'keltner',
    defaults: {
      period: 20,
      multiplier: 2,
      period2: 10,
      source: 'close',
      color: '#2962ff',
      secondaryColor: '#2962ff',
      tertiaryColor: '#2962ff',
      fillColor: 'rgba(41, 98, 255, 0.06)',
    },
  },
  {
    id: 'klinger',
    name: 'Klinger Oscillator',
    shortName: 'KVO',
    description: 'Volume force oscillator with signal',
    category: 'Volume',
    pane: 'oscillator',
    formula: 'klinger',
    defaults: { color: '#2962ff', secondaryColor: '#43a047' },
  },
  {
    id: 'kst',
    name: 'Know Sure Thing',
    shortName: 'KST',
    description: 'Weighted sum of smoothed rate of change',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'kst',
    defaults: {
      period: 10,
      period2: 15,
      period3: 20,
      period4: 30,
      signalPeriod: 9,
      source: 'close',
      color: '#43a047',
      secondaryColor: '#f23645',
    },
  },
  {
    id: 'lsma',
    name: 'Least Squares Moving Average',
    shortName: 'LSMA',
    description: 'Linear regression endpoint average',
    category: 'Trend',
    pane: 'price',
    formula: 'lsma',
    defaults: { period: 25, offset: 0, source: 'close', color: '#43a047' },
  },
  {
    id: 'linreg-channel',
    name: 'Linear Regression Channel',
    shortName: 'LinReg',
    description: 'Regression line with deviation channel',
    category: 'Trend',
    pane: 'price',
    formula: 'linreg-channel',
    defaults: {
      period: 100,
      multiplier: 2,
      source: 'close',
      color: '#f23645',
      secondaryColor: '#2962ff',
      tertiaryColor: '#2962ff',
      fillColor: 'rgba(41, 98, 255, 0.06)',
    },
  },
  {
    id: 'ma-cross',
    name: 'MA Cross',
    shortName: 'MA Cross',
    description: 'Two moving averages with cross markers',
    category: 'Trend',
    pane: 'price',
    formula: 'ma-cross',
    defaults: { period: 9, period2: 21, source: 'close', color: '#2962ff', secondaryColor: '#ff6d00', tertiaryColor: '#ff9800' },
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
      oscillatorMaType: 'EMA',
      signalMaType: 'EMA',
      color: '#2962ff',
      secondaryColor: '#ff6d00',
      histogramPositiveColor: '#26a69a',
      histogramNegativeColor: '#ef5350',
    },
  },
  {
    id: 'mass',
    name: 'Mass Index',
    shortName: 'Mass',
    description: 'Range expansion from EMA ratio sums',
    category: 'Volatility',
    pane: 'oscillator',
    formula: 'mass',
    defaults: { period: 10, color: '#2962ff' },
  },
  {
    id: 'mcginley',
    name: 'McGinley Dynamic',
    shortName: 'MD',
    description: 'Self-adjusting smoothing average',
    category: 'Trend',
    pane: 'price',
    formula: 'mcginley',
    defaults: { period: 14, source: 'close', color: '#2962ff' },
  },
  {
    id: 'median',
    name: 'Median',
    shortName: 'Median',
    description: 'Rolling median of source price',
    category: 'Trend',
    pane: 'price',
    formula: 'median',
    defaults: { period: 3, source: 'hl2', color: '#2962ff' },
  },
  {
    id: 'momentum',
    name: 'Momentum',
    shortName: 'Mom',
    description: 'Close price momentum',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'momentum',
    defaults: { period: 10, source: 'close', color: '#2962ff' },
  },
  {
    id: 'mfi',
    name: 'Money Flow Index',
    shortName: 'MFI',
    description: 'Volume-weighted RSI of typical price',
    category: 'Volume',
    pane: 'oscillator',
    formula: 'mfi',
    defaults: { period: 14, color: '#7e57c2' },
  },
  {
    id: 'ema',
    name: 'Moving Average Exponential',
    shortName: 'EMA',
    description: 'Exponential moving average',
    category: 'Trend',
    pane: 'price',
    formula: 'ema',
    defaults: { period: 9, source: 'close', color: '#2962ff' },
  },
  {
    id: 'ma-ribbon',
    name: 'Moving Average Ribbon',
    shortName: 'Ribbon',
    description: 'Four moving averages as a ribbon',
    category: 'Trend',
    pane: 'price',
    formula: 'ma-ribbon',
    defaults: {
      period: 20,
      period2: 50,
      period3: 100,
      period4: 200,
      source: 'close',
      color: '#fbc02d',
      secondaryColor: '#fb8c00',
      tertiaryColor: '#f23645',
      quaternaryColor: '#880e4f',
    },
  },
  {
    id: 'sma',
    name: 'Moving Average Simple',
    shortName: 'SMA',
    description: 'Simple moving average',
    category: 'Trend',
    pane: 'price',
    formula: 'sma',
    defaults: { period: 9, source: 'close', color: '#2962ff' },
  },
  {
    id: 'wma',
    name: 'Moving Average Weighted',
    shortName: 'WMA',
    description: 'Weighted moving average',
    category: 'Trend',
    pane: 'price',
    formula: 'wma',
    defaults: { period: 9, source: 'close', color: '#2962ff' },
  },
  {
    id: 'net-volume',
    name: 'Net Volume',
    shortName: 'NV',
    description: 'Signed volume by price direction',
    category: 'Volume',
    pane: 'oscillator',
    formula: 'net-volume',
    defaults: { histogramPositiveColor: '#26a69a', histogramNegativeColor: '#ef5350' },
  },
  {
    id: 'obv',
    name: 'On Balance Volume',
    shortName: 'OBV',
    description: 'Cumulative signed volume',
    category: 'Volume',
    pane: 'oscillator',
    formula: 'obv',
    defaults: { color: '#2962ff' },
  },
  {
    id: 'psar',
    name: 'Parabolic SAR',
    shortName: 'SAR',
    description: 'Stop and reverse trailing dots',
    category: 'Trend',
    pane: 'price',
    formula: 'psar',
    defaults: { startValue: 0.02, increment: 0.02, maxValue: 0.2, color: '#2962ff' },
  },
  {
    id: 'pivots-hl',
    name: 'Pivot Points High Low',
    shortName: 'Pivots HL',
    description: 'Local high and low pivot labels',
    category: 'Trend',
    pane: 'price',
    formula: 'pivots-hl',
    defaults: { period: 10, period2: 10, color: '#f23645', secondaryColor: '#089981' },
  },
  {
    id: 'pivots-std',
    name: 'Pivot Points Standard',
    shortName: 'Pivots',
    description: 'Traditional floor trader pivot levels',
    category: 'Trend',
    pane: 'price',
    formula: 'pivots-std',
    defaults: { color: '#fb8c00', secondaryColor: '#f23645', tertiaryColor: '#089981' },
  },
  {
    id: 'ppo',
    name: 'Price Oscillator',
    shortName: 'PPO',
    description: 'Percent difference of moving averages',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'ppo',
    defaults: { fastPeriod: 10, slowPeriod: 21, source: 'close', oscillatorMaType: 'SMA', color: '#2962ff' },
  },
  {
    id: 'pvt',
    name: 'Price Volume Trend',
    shortName: 'PVT',
    description: 'Cumulative volume scaled by percent change',
    category: 'Volume',
    pane: 'oscillator',
    formula: 'pvt',
    defaults: { color: '#2962ff' },
  },
  {
    id: 'roc',
    name: 'Rate Of Change',
    shortName: 'ROC',
    description: 'Percent rate of change',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'roc',
    defaults: { period: 9, source: 'close', color: '#2962ff' },
  },
  {
    id: 'rsi',
    name: 'Relative Strength Index',
    shortName: 'RSI',
    description: 'Momentum oscillator',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'rsi',
    defaults: { period: 14, source: 'close', color: '#7e57c2' },
  },
  {
    id: 'rvgi',
    name: 'Relative Vigor Index',
    shortName: 'RVGI',
    description: 'Close strength relative to range',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'rvgi',
    defaults: { period: 10, color: '#089981', secondaryColor: '#f23645' },
  },
  {
    id: 'rvi',
    name: 'Relative Volatility Index',
    shortName: 'RVI',
    description: 'RSI computed on standard deviation',
    category: 'Volatility',
    pane: 'oscillator',
    formula: 'rvi',
    defaults: { period: 10, period2: 14, source: 'close', color: '#2962ff' },
  },
  {
    id: 'rvol',
    name: 'Relative Volume at Time',
    shortName: 'RVOL',
    description: 'Session volume versus prior sessions',
    category: 'Volume',
    pane: 'oscillator',
    formula: 'rvol',
    defaults: { period: 10, histogramPositiveColor: '#26a69a', histogramNegativeColor: '#ef5350' },
  },
  {
    id: 'smi-ergodic',
    name: 'SMI Ergodic Indicator',
    shortName: 'SMIE',
    description: 'True strength index with signal line',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'smi-ergodic',
    defaults: { fastPeriod: 5, slowPeriod: 20, signalPeriod: 5, source: 'close', color: '#2962ff', secondaryColor: '#ff6d00' },
  },
  {
    id: 'smi-ergodic-osc',
    name: 'SMI Ergodic Oscillator',
    shortName: 'SMIEO',
    description: 'SMI ergodic histogram oscillator',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'smi-ergodic-osc',
    defaults: {
      fastPeriod: 5,
      slowPeriod: 20,
      signalPeriod: 5,
      source: 'close',
      histogramPositiveColor: '#089981',
      histogramNegativeColor: '#f23645',
    },
  },
  {
    id: 'smma',
    name: 'Smoothed Moving Average',
    shortName: 'SMMA',
    description: 'Wilder smoothed moving average',
    category: 'Trend',
    pane: 'price',
    formula: 'smma',
    defaults: { period: 7, source: 'close', color: '#673ab7' },
  },
  {
    id: 'stochastic',
    name: 'Stochastic',
    shortName: 'Stoch',
    description: 'Stochastic oscillator',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'stochastic',
    defaults: { period: 14, period2: 1, signalPeriod: 3, color: '#2962ff', secondaryColor: '#ff6d00' },
  },
  {
    id: 'smi',
    name: 'Stochastic Momentum Index',
    shortName: 'SMI',
    description: 'Double-smoothed stochastic momentum',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'smi',
    defaults: { period: 10, period2: 3, color: '#2962ff', secondaryColor: '#ff6d00' },
  },
  {
    id: 'stoch-rsi',
    name: 'Stochastic RSI',
    shortName: 'Stoch RSI',
    description: 'Stochastic applied to RSI values',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'stoch-rsi',
    defaults: {
      period: 14,
      period2: 14,
      period3: 3,
      signalPeriod: 3,
      source: 'close',
      color: '#2962ff',
      secondaryColor: '#ff6d00',
    },
  },
  {
    id: 'supertrend',
    name: 'Supertrend',
    shortName: 'Supertrend',
    description: 'ATR trailing stop trend line',
    category: 'Trend',
    pane: 'price',
    formula: 'supertrend',
    defaults: { period: 10, multiplier: 3, color: '#089981', secondaryColor: '#f23645' },
  },
  {
    id: 'twap',
    name: 'TWAP',
    shortName: 'TWAP',
    description: 'Time weighted average price',
    category: 'Trend',
    pane: 'price',
    formula: 'twap',
    defaults: { color: '#2962ff' },
    singleton: true,
  },
  {
    id: 'trix',
    name: 'TRIX',
    shortName: 'TRIX',
    description: 'Rate of change of triple smoothed EMA',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'trix',
    defaults: { period: 18, color: '#2962ff' },
  },
  {
    id: 'tema',
    name: 'Triple EMA',
    shortName: 'TEMA',
    description: 'Triple exponential moving average',
    category: 'Trend',
    pane: 'price',
    formula: 'tema',
    defaults: { period: 9, source: 'close', color: '#43a047' },
  },
  {
    id: 'tsi',
    name: 'True Strength Index',
    shortName: 'TSI',
    description: 'Double smoothed momentum oscillator',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'tsi',
    defaults: { slowPeriod: 25, fastPeriod: 13, signalPeriod: 13, source: 'close', color: '#2962ff', secondaryColor: '#f23645' },
  },
  {
    id: 'uo',
    name: 'Ultimate Oscillator',
    shortName: 'UO',
    description: 'Weighted buying pressure across three windows',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'uo',
    defaults: { fastPeriod: 7, period: 14, slowPeriod: 28, color: '#f23645' },
  },
  {
    id: 'vstop',
    name: 'Volatility Stop',
    shortName: 'VStop',
    description: 'ATR trailing stop dots',
    category: 'Trend',
    pane: 'price',
    formula: 'vstop',
    defaults: { period: 20, multiplier: 2, source: 'close', color: '#089981', secondaryColor: '#f23645' },
  },
  {
    id: 'vol-osc',
    name: 'Volume Oscillator',
    shortName: 'Vol Osc',
    description: 'Percent spread of volume EMAs',
    category: 'Volume',
    pane: 'oscillator',
    formula: 'vol-osc',
    defaults: { fastPeriod: 5, slowPeriod: 10, color: '#2962ff' },
  },
  {
    id: 'vortex',
    name: 'Vortex Indicator',
    shortName: 'VI',
    description: 'Positive and negative trend movement',
    category: 'Trend',
    pane: 'oscillator',
    formula: 'vortex',
    defaults: { period: 14, color: '#2962ff', secondaryColor: '#f23645' },
  },
  {
    id: 'vwap',
    name: 'VWAP',
    shortName: 'VWAP',
    description: 'Session volume weighted average price',
    category: 'Trend',
    pane: 'price',
    formula: 'vwap',
    defaults: { source: 'hlc3', color: '#2962ff' },
    singleton: true,
  },
  {
    id: 'vwma',
    name: 'VWMA',
    shortName: 'VWMA',
    description: 'Volume weighted moving average',
    category: 'Trend',
    pane: 'price',
    formula: 'vwma',
    defaults: { period: 20, source: 'close', color: '#2962ff' },
  },
  {
    id: 'alligator',
    name: 'Williams Alligator',
    shortName: 'Alligator',
    description: 'Three smoothed averages with offsets',
    category: 'Trend',
    pane: 'price',
    formula: 'alligator',
    defaults: { period: 13, period2: 8, period3: 5, color: '#2962ff', secondaryColor: '#e91e63', tertiaryColor: '#66bb6a' },
  },
  {
    id: 'fractals',
    name: 'Williams Fractals',
    shortName: 'Fractals',
    description: 'Fractal reversal markers',
    category: 'Trend',
    pane: 'price',
    formula: 'fractals',
    defaults: { period: 2, color: '#f23645', secondaryColor: '#089981' },
  },
  {
    id: 'willr',
    name: 'Williams Percent Range',
    shortName: '%R',
    description: 'Close relative to the high low range',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'willr',
    defaults: { period: 14, color: '#7e57c2' },
  },
  {
    id: 'woodies-cci',
    name: 'Woodies CCI',
    shortName: 'Woodies',
    description: 'CCI histogram with turbo line',
    category: 'Momentum',
    pane: 'oscillator',
    formula: 'woodies-cci',
    defaults: {
      period: 14,
      period2: 6,
      secondaryColor: '#ff6d00',
      histogramPositiveColor: '#26a69a',
      histogramNegativeColor: '#ef5350',
    },
  },
  {
    id: 'zigzag',
    name: 'Zig Zag',
    shortName: 'ZigZag',
    description: 'Pivot swings filtered by deviation',
    category: 'Trend',
    pane: 'price',
    formula: 'zigzag',
    defaults: { percent: 5, period: 10, color: '#2962ff' },
  },
];

interface FundamentalSpec {
  id: string;
  name: string;
  shortName: string;
  group: 'Income statement' | 'Balance sheet' | 'Cash flow' | 'Statistics' | 'Dividends';
}

const FUNDAMENTAL_SPECS: FundamentalSpec[] = [
  { id: 'fund-total-revenue', name: 'Total revenue', shortName: 'Revenue', group: 'Income statement' },
  { id: 'fund-gross-profit', name: 'Gross profit', shortName: 'Gross profit', group: 'Income statement' },
  { id: 'fund-operating-income', name: 'Operating income', shortName: 'Op income', group: 'Income statement' },
  { id: 'fund-net-income', name: 'Net income', shortName: 'Net income', group: 'Income statement' },
  { id: 'fund-ebitda', name: 'EBITDA', shortName: 'EBITDA', group: 'Income statement' },
  { id: 'fund-eps-diluted', name: 'EPS diluted', shortName: 'EPS', group: 'Income statement' },
  { id: 'fund-net-margin', name: 'Net margin', shortName: 'Net margin', group: 'Income statement' },
  { id: 'fund-total-assets', name: 'Total assets', shortName: 'Assets', group: 'Balance sheet' },
  { id: 'fund-total-liabilities', name: 'Total liabilities', shortName: 'Liabilities', group: 'Balance sheet' },
  { id: 'fund-total-equity', name: 'Total equity', shortName: 'Equity', group: 'Balance sheet' },
  { id: 'fund-total-debt', name: 'Total debt', shortName: 'Debt', group: 'Balance sheet' },
  { id: 'fund-cash-equivalents', name: 'Cash & equivalents', shortName: 'Cash', group: 'Balance sheet' },
  { id: 'fund-current-ratio', name: 'Current ratio', shortName: 'Current ratio', group: 'Balance sheet' },
  { id: 'fund-debt-to-equity', name: 'Debt to equity ratio', shortName: 'D/E', group: 'Balance sheet' },
  { id: 'fund-free-cash-flow', name: 'Free cash flow', shortName: 'FCF', group: 'Cash flow' },
  { id: 'fund-operating-cash-flow', name: 'Cash from operating activities', shortName: 'CFO', group: 'Cash flow' },
  { id: 'fund-capex', name: 'Capital expenditures', shortName: 'CapEx', group: 'Cash flow' },
  { id: 'fund-market-cap', name: 'Market capitalization', shortName: 'Mkt cap', group: 'Statistics' },
  { id: 'fund-enterprise-value', name: 'Enterprise value', shortName: 'EV', group: 'Statistics' },
  { id: 'fund-pe', name: 'Price to earnings ratio', shortName: 'P/E', group: 'Statistics' },
  { id: 'fund-ps', name: 'Price to sales ratio', shortName: 'P/S', group: 'Statistics' },
  { id: 'fund-pb', name: 'Price to book ratio', shortName: 'P/B', group: 'Statistics' },
  { id: 'fund-roe', name: 'Return on equity', shortName: 'ROE', group: 'Statistics' },
  { id: 'fund-roa', name: 'Return on assets', shortName: 'ROA', group: 'Statistics' },
  { id: 'fund-dividends-per-share', name: 'Dividends per share', shortName: 'DPS', group: 'Dividends' },
  { id: 'fund-dividend-yield', name: 'Dividend yield', shortName: 'Div yield', group: 'Dividends' },
];

const FUNDAMENTAL_DEFINITIONS: IndicatorDefinition[] = FUNDAMENTAL_SPECS.map((spec) => ({
  id: spec.id,
  name: spec.name,
  shortName: spec.shortName,
  description: spec.group,
  category: 'Fundamental',
  pane: 'oscillator',
  formula: 'fundamental',
  defaults: { color: '#2962ff' },
  singleton: true,
}));

export const INDICATOR_DEFINITIONS: IndicatorDefinition[] = [
  ...TECHNICAL_DEFINITIONS,
  ...FUNDAMENTAL_DEFINITIONS,
];

// Saved layouts may reference pre-rework definition ids.
const LEGACY_INDICATOR_IDS: Record<string, string> = {
  'sma-20': 'sma',
  'sma-200': 'sma',
  'ema-7': 'ema',
  'ema-20': 'ema',
  'wma-20': 'wma',
  'bb-20': 'bb',
  'vwap-session': 'vwap',
  'donchian-20': 'donchian',
  'rsi-14': 'rsi',
};

export const getIndicatorDefinition = (definitionId: string): IndicatorDefinition => {
  const direct = INDICATOR_DEFINITIONS.find((definition) => definition.id === definitionId);
  if (direct) return direct;

  const legacyId = LEGACY_INDICATOR_IDS[definitionId];
  if (legacyId) {
    const legacy = INDICATOR_DEFINITIONS.find((definition) => definition.id === legacyId);
    if (legacy) return legacy;
  }

  return INDICATOR_DEFINITIONS[0];
};

export const getIndicatorLegendSuffix = (definition: IndicatorDefinition, settings: IndicatorSettings): string => {
  const defaults = definition.defaults;
  const period = sanitizePeriod(settings.period, defaults.period ?? 20);
  const period2 = sanitizePeriod(settings.period2, defaults.period2 ?? 20);
  const period3 = sanitizePeriod(settings.period3, defaults.period3 ?? 20);
  const period4 = sanitizePeriod(settings.period4, defaults.period4 ?? 20);
  const fastPeriod = sanitizePeriod(settings.fastPeriod, defaults.fastPeriod ?? 12);
  const slowPeriod = sanitizePeriod(settings.slowPeriod, defaults.slowPeriod ?? 26);
  const signalPeriod = sanitizePeriod(settings.signalPeriod, defaults.signalPeriod ?? 9);
  const stdDev = sanitizeFloat(settings.stdDev, defaults.stdDev ?? 2, 0.1, 10);
  const multiplier = sanitizeFloat(settings.multiplier, defaults.multiplier ?? 2, 0.0001, 1000000);
  const percent = sanitizeFloat(settings.percent, defaults.percent ?? 10, 0.01, 100);
  const source = settings.source ?? defaults.source ?? 'close';
  const trim = (value: number) => `${Number(value.toFixed(4))}`;

  switch (definition.formula) {
    case 'volume':
    case 'fundamental':
    case 'vwap':
    case 'twap':
    case '24h-volume':
    case 'obv':
    case 'pvt':
    case 'adl':
    case 'bop':
    case 'klinger':
      return '';
    case 'sma':
    case 'ema':
    case 'wma':
    case 'smma':
    case 'vwma':
    case 'hma':
    case 'dema':
    case 'tema':
    case 'lsma':
    case 'mcginley':
    case 'median':
      return `${period} ${source}`;
    case 'alma':
      return `${period} ${trim(sanitizeFloat(settings.offset, defaults.offset ?? 0.85, -100, 100))} ${trim(
        sanitizeFloat(settings.sigma, defaults.sigma ?? 6, 0.1, 100)
      )}`;
    case 'ma-cross':
    case 'pivots-hl':
      return `${period} ${period2}`;
    case 'ma-ribbon':
      return `${period} ${period2} ${period3} ${period4}`;
    case 'bb':
    case 'bb-percent':
    case 'bb-width':
      return `${period} ${trim(stdDev)}`;
    case 'bbtrend':
      return `${period} ${period2}`;
    case 'keltner':
      return `${period} ${trim(multiplier)} ${period2}`;
    case 'donchian':
      return `${period}`;
    case 'env':
      return `${period} ${trim(percent)}%`;
    case 'ichimoku':
      return `${period} ${period2} ${period3} ${period4}`;
    case 'supertrend':
      return `${period} ${trim(multiplier)}`;
    case 'psar':
      return `${trim(sanitizeFloat(settings.startValue, defaults.startValue ?? 0.02, 0.001, 1))} ${trim(
        sanitizeFloat(settings.increment, defaults.increment ?? 0.02, 0.001, 1)
      )} ${trim(sanitizeFloat(settings.maxValue, defaults.maxValue ?? 0.2, 0.01, 1))}`;
    case 'vstop':
      return `${period} ${trim(multiplier)}`;
    case 'chande-kroll':
      return `${period} ${trim(multiplier)} ${period2}`;
    case 'zigzag':
      return `${trim(percent)}% ${period}`;
    case 'fractals':
      return `${period}`;
    case 'alligator':
      return `${period} ${period2} ${period3}`;
    case 'linreg-channel':
      return `${period}`;
    case 'macd':
      return `${fastPeriod} ${slowPeriod} ${signalPeriod}`;
    case 'stochastic':
      return `${period} ${period2} ${signalPeriod}`;
    case 'stoch-rsi':
      return `${period3} ${signalPeriod} ${period2} ${period}`;
    case 'smi':
      return `${period} ${period2}`;
    case 'crsi':
      return `${period} ${period2} ${period3}`;
    case 'coppock':
      return `${period} ${slowPeriod} ${fastPeriod}`;
    case 'kst':
      return `${period} ${period2} ${period3} ${period4} ${signalPeriod}`;
    case 'tsi':
      return `${slowPeriod} ${fastPeriod} ${signalPeriod}`;
    case 'uo':
      return `${fastPeriod} ${period} ${slowPeriod}`;
    case 'smi-ergodic':
    case 'smi-ergodic-osc':
      return `${fastPeriod} ${slowPeriod} ${signalPeriod}`;
    case 'ppo':
    case 'chaikin-osc':
    case 'vol-osc':
    case 'awesome':
      return `${fastPeriod} ${slowPeriod}`;
    case 'dmi':
    case 'adx':
      return `${period} ${period2}`;
    case 'atr':
      return `${period} ${settings.smoothingType ?? defaults.smoothingType ?? 'RMA'}`;
    case 'rvi':
      return `${period} ${period2}`;
    case 'woodies-cci':
      return `${period} ${period2}`;
    case 'chop-zone':
      return `${period} ${period2}`;
    case 'asi':
      return `${trim(multiplier)}`;
    case 'pivots-std':
      return 'Auto';
    default:
      return defaults.period !== undefined || settings.period !== undefined ? `${period}` : '';
  }
};

const GENERIC_SETTING_LABELS: Record<string, string> = {
  period: 'Length',
  period2: 'Length 2',
  period3: 'Length 3',
  period4: 'Length 4',
  fastPeriod: 'Fast length',
  slowPeriod: 'Slow length',
  signalPeriod: 'Signal',
  stdDev: 'StdDev',
  multiplier: 'Multiplier',
  percent: 'Percent',
  offset: 'Offset',
  sigma: 'Sigma',
  startValue: 'Start',
  increment: 'Increment',
  maxValue: 'Max value',
};

const SETTING_LABEL_OVERRIDES: Partial<Record<IndicatorFormula, Record<string, string>>> = {
  stochastic: { period: '%K length', period2: '%K smoothing', signalPeriod: '%D smoothing' },
  'stoch-rsi': {
    period: 'Stochastic length',
    period2: 'RSI length',
    period3: '%K smoothing',
    signalPeriod: '%D smoothing',
  },
  smi: { period: '%K length', period2: '%D length' },
  supertrend: { period: 'ATR length', multiplier: 'Factor' },
  keltner: { period: 'Length', multiplier: 'Multiplier', period2: 'ATR length' },
  'chande-kroll': { period: 'P', multiplier: 'X', period2: 'Q' },
  ichimoku: {
    period: 'Conversion line length',
    period2: 'Base line length',
    period3: 'Leading span B length',
    period4: 'Displacement',
  },
  adx: { period: 'ADX smoothing', period2: 'DI length' },
  dmi: { period: 'ADX smoothing', period2: 'DI length' },
  uo: { fastPeriod: 'Fast length', period: 'Middle length', slowPeriod: 'Slow length' },
  tsi: { slowPeriod: 'Long length', fastPeriod: 'Short length', signalPeriod: 'Signal length' },
  kst: {
    period: 'ROC length 1',
    period2: 'ROC length 2',
    period3: 'ROC length 3',
    period4: 'ROC length 4',
    signalPeriod: 'Signal length',
  },
  coppock: { period: 'WMA length', slowPeriod: 'Long ROC length', fastPeriod: 'Short ROC length' },
  crsi: { period: 'RSI length', period2: 'Up/down length', period3: 'ROC length' },
  'ma-cross': { period: 'Short length', period2: 'Long length' },
  'ma-ribbon': { period: 'Length 1', period2: 'Length 2', period3: 'Length 3', period4: 'Length 4' },
  alligator: { period: 'Jaw length', period2: 'Teeth length', period3: 'Lips length' },
  'pivots-hl': { period: 'Pivot high bars', period2: 'Pivot low bars' },
  zigzag: { percent: 'Deviation %', period: 'Depth' },
  'linreg-channel': { period: 'Length', multiplier: 'Deviation' },
  env: { percent: 'Percent' },
  alma: { period: 'Window size', offset: 'Offset', sigma: 'Sigma' },
  asi: { multiplier: 'Limit move value' },
  rvi: { period: 'Length', period2: 'EMA length' },
  'woodies-cci': { period: 'CCI length', period2: 'Turbo length' },
  'chop-zone': { period: 'Lookback', period2: 'EMA length' },
  bbtrend: { period: 'Short length', period2: 'Long length' },
  fractals: { period: 'Periods' },
};

export const getIndicatorSettingLabel = (formula: IndicatorFormula, field: string): string =>
  SETTING_LABEL_OVERRIDES[formula]?.[field] ?? GENERIC_SETTING_LABELS[field] ?? field;

const COLOR_LABEL_OVERRIDES: Partial<Record<IndicatorFormula, Partial<Record<string, string>>>> = {
  volume: { color: 'Up color', secondaryColor: 'Down color' },
  bb: { color: 'Basis color', secondaryColor: 'Upper color', tertiaryColor: 'Lower color' },
  keltner: { color: 'Basis color', secondaryColor: 'Upper color', tertiaryColor: 'Lower color' },
  env: { color: 'Basis color', secondaryColor: 'Upper color', tertiaryColor: 'Lower color' },
  donchian: { color: 'Upper color', secondaryColor: 'Lower color', tertiaryColor: 'Basis color' },
  'linreg-channel': { color: 'Basis color', secondaryColor: 'Upper color', tertiaryColor: 'Lower color' },
  macd: { color: 'MACD color', secondaryColor: 'Signal color' },
  stochastic: { color: '%K color', secondaryColor: '%D color' },
  'stoch-rsi': { color: '%K color', secondaryColor: '%D color' },
  smi: { color: 'SMI color', secondaryColor: 'Signal color' },
  supertrend: { color: 'Up trend', secondaryColor: 'Down trend' },
  vstop: { color: 'Up trend', secondaryColor: 'Down trend' },
  'chande-kroll': { color: 'Long stop', secondaryColor: 'Short stop' },
  ichimoku: {
    color: 'Conversion line',
    secondaryColor: 'Base line',
    tertiaryColor: 'Lagging span',
    quaternaryColor: 'Lead 1',
    quinaryColor: 'Lead 2',
  },
  alligator: { color: 'Jaw', secondaryColor: 'Teeth', tertiaryColor: 'Lips' },
  aroon: { color: 'Up color', secondaryColor: 'Down color' },
  dmi: { color: '+DI color', secondaryColor: '-DI color', tertiaryColor: 'ADX color' },
  vortex: { color: 'VI+ color', secondaryColor: 'VI- color' },
  rvgi: { color: 'RVGI color', secondaryColor: 'Signal color' },
  kst: { color: 'KST color', secondaryColor: 'Signal color' },
  tsi: { color: 'TSI color', secondaryColor: 'Signal color' },
  klinger: { color: 'KVO color', secondaryColor: 'Signal color' },
  fisher: { color: 'Fisher color', secondaryColor: 'Trigger color' },
  'smi-ergodic': { color: 'SMI color', secondaryColor: 'Signal color' },
  'ma-cross': { color: 'Short MA', secondaryColor: 'Long MA', tertiaryColor: 'Crosses' },
  'ma-ribbon': {
    color: 'MA 1 color',
    secondaryColor: 'MA 2 color',
    tertiaryColor: 'MA 3 color',
    quaternaryColor: 'MA 4 color',
  },
  'pivots-std': { color: 'P color', secondaryColor: 'R color', tertiaryColor: 'S color' },
  'pivots-hl': { color: 'High color', secondaryColor: 'Low color' },
  fractals: { color: 'Up fractal', secondaryColor: 'Down fractal' },
  'woodies-cci': { secondaryColor: 'Turbo color' },
};

export const getIndicatorColorLabel = (formula: IndicatorFormula, field: string): string | null => {
  const override = COLOR_LABEL_OVERRIDES[formula]?.[field];
  if (override) return override;
  if (field === 'color') return 'Color';
  return null;
};
