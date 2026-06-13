// Indicator math verification: independent naive reference implementations
// (written directly from the TradingView/Pine v5 documentation) compared
// against lib/indicators.ts on seeded random OHLCV data, plus golden values.
//
// Run: npx -y tsx tests/indicators.test.mts

import {
  INDICATOR_DEFINITIONS,
  computeIndicatorSeries,
  getIndicatorDefinition,
  simpleMovingAverageValues,
  exponentialMovingAverageValues,
  wilderMovingAverageValues,
  weightedMovingAverageValues,
  standardDeviationValues,
  calculateBollingerBands,
  calculateRsiValues,
  averageTrueRangeValues,
  calculateMacdSeries,
  calculateStochasticRaw,
  calculateDmiSeries,
  calculateSupertrendSeries,
  calculateParabolicSarValues,
  calculateIchimokuSeries,
  calculateZigZagSeries,
  calculatePivotPointsStandard,
  calculatePivotPointsHighLow,
  hullMovingAverageValues,
  arnaudLegouxMovingAverageValues,
  linearRegressionValues,
  medianValues,
  volumeWeightedMovingAverageValues,
  mcginleyDynamicValues,
  calculateVwapValues,
  type Candle,
} from '../lib/indicators';

let failures = 0;
let checks = 0;

const fail = (message: string) => {
  failures += 1;
  console.error(`  ✗ ${message}`);
};

const assert = (condition: boolean, message: string) => {
  checks += 1;
  if (!condition) fail(message);
};

const close = (a: number | null | undefined, b: number | null | undefined, tolerance = 1e-6) => {
  if (a === null || a === undefined || b === null || b === undefined) return a === b;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const scale = Math.max(1, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= tolerance * scale;
};

const assertSeriesEqual = (
  actual: Array<number | null>,
  expected: Array<number | null>,
  label: string,
  tolerance = 1e-6
) => {
  checks += 1;
  if (actual.length !== expected.length) {
    fail(`${label}: length ${actual.length} != ${expected.length}`);
    return;
  }
  for (let i = 0; i < actual.length; i += 1) {
    const a = actual[i];
    const e = expected[i];
    const bothNull = (a === null || a === undefined) && (e === null || e === undefined);
    if (bothNull) continue;
    if (a === null || a === undefined || e === null || e === undefined || !close(a, e, tolerance)) {
      fail(`${label}: index ${i} got ${a} expected ${e}`);
      return;
    }
  }
};

// ---------- seeded random OHLCV ----------

const makeCandles = (count: number, seed = 42): Candle[] => {
  let state = seed >>> 0;
  const rand = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };

  const candles: Candle[] = [];
  let price = 1000;
  const start = Date.UTC(2024, 0, 1);

  for (let i = 0; i < count; i += 1) {
    const open = price;
    const drift = (rand() - 0.5) * 24;
    const closeValue = Math.max(50, open + drift);
    const high = Math.max(open, closeValue) + rand() * 9;
    const low = Math.max(10, Math.min(open, closeValue) - rand() * 9);
    const volume = 100 + rand() * 950;
    candles.push({ time: start + i * 3_600_000, open, high, low, close: closeValue, volume });
    price = closeValue;
  }

  return candles;
};

const candles = makeCandles(700);
const closes = candles.map((c) => c.close);
const highs = candles.map((c) => c.high);
const lows = candles.map((c) => c.low);

// ---------- naive reference implementations (from TV docs) ----------

type S = Array<number | null>;

const refSMA = (values: number[], len: number): S =>
  values.map((_, i) => {
    if (i < len - 1) return null;
    let sum = 0;
    for (let k = 0; k < len; k += 1) sum += values[i - k];
    return sum / len;
  });

const refEMA = (values: number[], len: number): S => {
  const out: S = new Array(values.length).fill(null);
  const alpha = 2 / (len + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i += 1) {
    if (prev === null) {
      if (i === len - 1) {
        let sum = 0;
        for (let k = 0; k < len; k += 1) sum += values[i - k];
        prev = sum / len;
        out[i] = prev;
      }
      continue;
    }
    prev = alpha * values[i] + (1 - alpha) * prev;
    out[i] = prev;
  }
  return out;
};

const refRMA = (values: number[], len: number): S => {
  const out: S = new Array(values.length).fill(null);
  const alpha = 1 / len;
  let prev: number | null = null;
  for (let i = 0; i < values.length; i += 1) {
    if (prev === null) {
      if (i === len - 1) {
        let sum = 0;
        for (let k = 0; k < len; k += 1) sum += values[i - k];
        prev = sum / len;
        out[i] = prev;
      }
      continue;
    }
    prev = alpha * values[i] + (1 - alpha) * prev;
    out[i] = prev;
  }
  return out;
};

const refWMA = (values: number[], len: number): S =>
  values.map((_, i) => {
    if (i < len - 1) return null;
    let num = 0;
    let den = 0;
    for (let k = 0; k < len; k += 1) {
      const weight = len - k;
      num += values[i - k] * weight;
      den += weight;
    }
    return num / den;
  });

const refStdev = (values: number[], len: number): S =>
  values.map((_, i) => {
    if (i < len - 1) return null;
    let mean = 0;
    for (let k = 0; k < len; k += 1) mean += values[i - k];
    mean /= len;
    let variance = 0;
    for (let k = 0; k < len; k += 1) variance += (values[i - k] - mean) ** 2;
    return Math.sqrt(variance / len);
  });

const refTR = (cs: Candle[]): number[] =>
  cs.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const pc = cs[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - pc), Math.abs(c.low - pc));
  });

const refRSI = (values: number[], len: number): S => {
  const ups: number[] = [];
  const downs: number[] = [];
  for (let i = 1; i < values.length; i += 1) {
    const ch = values[i] - values[i - 1];
    ups.push(Math.max(ch, 0));
    downs.push(Math.max(-ch, 0));
  }
  const upRma = refRMA(ups, len);
  const downRma = refRMA(downs, len);
  const out: S = new Array(values.length).fill(null);
  for (let i = 1; i < values.length; i += 1) {
    const u = upRma[i - 1];
    const d = downRma[i - 1];
    if (u === null || d === null) continue;
    out[i] = d === 0 ? 100 : 100 - 100 / (1 + u / d);
  }
  return out;
};

// ---------- run comparisons ----------

console.log('Indicator math vs naive reference implementations');

assertSeriesEqual(simpleMovingAverageValues(closes, 20), refSMA(closes, 20), 'SMA(20)');
assertSeriesEqual(simpleMovingAverageValues(closes, 9), refSMA(closes, 9), 'SMA(9)');
assertSeriesEqual(exponentialMovingAverageValues(closes, 9), refEMA(closes, 9), 'EMA(9)');
assertSeriesEqual(exponentialMovingAverageValues(closes, 21), refEMA(closes, 21), 'EMA(21)');
assertSeriesEqual(wilderMovingAverageValues(closes, 14), refRMA(closes, 14), 'RMA(14)');
assertSeriesEqual(weightedMovingAverageValues(closes, 9), refWMA(closes, 9), 'WMA(9)');
assertSeriesEqual(standardDeviationValues(closes, 20), refStdev(closes, 20), 'Stdev(20)');
assertSeriesEqual(calculateRsiValues(closes, 14), refRSI(closes, 14), 'RSI(14)');
assertSeriesEqual(averageTrueRangeValues(candles, 14), refRMA(refTR(candles), 14), 'ATR(14) RMA');

{
  const bb = calculateBollingerBands(closes, 20, 2);
  const basis = refSMA(closes, 20);
  const dev = refStdev(closes, 20);
  assertSeriesEqual(bb.basis, basis, 'BB basis');
  assertSeriesEqual(
    bb.upper,
    basis.map((b, i) => (b === null || dev[i] === null ? null : b + 2 * dev[i]!)),
    'BB upper'
  );
  assertSeriesEqual(
    bb.lower,
    basis.map((b, i) => (b === null || dev[i] === null ? null : b - 2 * dev[i]!)),
    'BB lower'
  );
}

{
  const macd = calculateMacdSeries(closes, 12, 26, 9, 'EMA', 'EMA');
  const fast = refEMA(closes, 12);
  const slow = refEMA(closes, 26);
  const line = closes.map((_, i) => (fast[i] === null || slow[i] === null ? null : fast[i]! - slow[i]!));
  assertSeriesEqual(macd.macd, line, 'MACD line');
  // signal: EMA of macd line (seeded with SMA over first 9 valid values)
  const valid: number[] = [];
  const validIdx: number[] = [];
  line.forEach((v, i) => {
    if (v !== null) {
      valid.push(v);
      validIdx.push(i);
    }
  });
  const signalCompact = refEMA(valid, 9);
  const signal: S = new Array(closes.length).fill(null);
  signalCompact.forEach((v, k) => {
    if (v !== null) signal[validIdx[k]] = v;
  });
  assertSeriesEqual(macd.signal, signal, 'MACD signal');
}

{
  const raw = calculateStochasticRaw(highs, lows, closes, 14);
  const expected: S = closes.map((c, i) => {
    if (i < 13) return null;
    let hh = -Infinity;
    let ll = Infinity;
    for (let k = 0; k < 14; k += 1) {
      hh = Math.max(hh, highs[i - k]);
      ll = Math.min(ll, lows[i - k]);
    }
    const range = hh - ll;
    return range === 0 ? null : ((c - ll) / range) * 100;
  });
  assertSeriesEqual(raw, expected, 'Stoch raw(14)');
}

{
  // DMI per Wilder: RMA-smoothed DM and TR
  const { plusDi, minusDi, adx } = calculateDmiSeries(candles, 14, 14);
  const plusDmArr: number[] = [];
  const minusDmArr: number[] = [];
  for (let i = 1; i < candles.length; i += 1) {
    const up = candles[i].high - candles[i - 1].high;
    const down = candles[i - 1].low - candles[i].low;
    plusDmArr.push(up > down && up > 0 ? up : 0);
    minusDmArr.push(down > up && down > 0 ? down : 0);
  }
  const trS = refRMA(refTR(candles), 14);
  const plusS = refRMA(plusDmArr, 14);
  const minusS = refRMA(minusDmArr, 14);
  const expPlus: S = new Array(candles.length).fill(null);
  const expMinus: S = new Array(candles.length).fill(null);
  const dx: S = new Array(candles.length).fill(null);
  for (let i = 1; i < candles.length; i += 1) {
    const tr = trS[i];
    const p = plusS[i - 1];
    const m = minusS[i - 1];
    if (tr === null || p === null || m === null || tr === 0) continue;
    const pdi = (100 * p) / tr;
    const mdi = (100 * m) / tr;
    expPlus[i] = pdi;
    expMinus[i] = mdi;
    dx[i] = pdi + mdi === 0 ? 0 : (100 * Math.abs(pdi - mdi)) / (pdi + mdi);
  }
  assertSeriesEqual(plusDi, expPlus, '+DI(14)');
  assertSeriesEqual(minusDi, expMinus, '-DI(14)');
  // ADX = RMA of DX over valid values
  const validDx: number[] = [];
  const dxIdx: number[] = [];
  dx.forEach((v, i) => {
    if (v !== null) {
      validDx.push(v);
      dxIdx.push(i);
    }
  });
  const adxCompact = refRMA(validDx, 14);
  const expAdx: S = new Array(candles.length).fill(null);
  adxCompact.forEach((v, k) => {
    if (v !== null) expAdx[dxIdx[k]] = v;
  });
  assertSeriesEqual(adx, expAdx, 'ADX(14)');
}

{
  // HMA = WMA(2*WMA(n/2) - WMA(n), floor(sqrt(n)))
  const half = refWMA(closes, 5); // n=9 → round(4.5)=5
  const full = refWMA(closes, 9);
  const diff = closes.map((_, i) => (half[i] === null || full[i] === null ? null : 2 * half[i]! - full[i]!));
  const expected: S = closes.map((_, i) => {
    if (i < 8 + 2) {
      // need 3 valid diff values (sqrt(9)=3) starting at index 8
      if (i < 10) return null;
    }
    let num = 0;
    let den = 0;
    let ok = true;
    for (let k = 0; k < 3; k += 1) {
      const v = diff[i - k];
      if (v === null) {
        ok = false;
        break;
      }
      const weight = 3 - k;
      num += v * weight;
      den += weight;
    }
    return ok ? num / den : null;
  });
  assertSeriesEqual(hullMovingAverageValues(closes, 9), expected, 'HMA(9)');
}

{
  // ALMA(9, 0.85, 6)
  const len = 9;
  const m = 0.85 * (len - 1);
  const s = len / 6;
  const expected: S = closes.map((_, i) => {
    if (i < len - 1) return null;
    let norm = 0;
    let sum = 0;
    for (let k = 0; k < len; k += 1) {
      const w = Math.exp(-((k - m) ** 2) / (2 * s * s));
      norm += w;
      sum += closes[i - (len - 1 - k)] * w;
    }
    return sum / norm;
  });
  assertSeriesEqual(arnaudLegouxMovingAverageValues(closes, 9, 0.85, 6), expected, 'ALMA(9, 0.85, 6)');
}

{
  // LSMA via direct least-squares solve
  const len = 25;
  const expected: S = closes.map((_, i) => {
    if (i < len - 1) return null;
    let sx = 0;
    let sy = 0;
    let sxy = 0;
    let sxx = 0;
    for (let x = 0; x < len; x += 1) {
      const y = closes[i - len + 1 + x];
      sx += x;
      sy += y;
      sxy += x * y;
      sxx += x * x;
    }
    const slope = (len * sxy - sx * sy) / (len * sxx - sx * sx);
    const intercept = (sy - slope * sx) / len;
    return intercept + slope * (len - 1);
  });
  assertSeriesEqual(linearRegressionValues(closes, 25, 0), expected, 'LSMA(25)');
}

{
  // Median(3) — percentile nearest rank
  const expected: S = closes.map((_, i) => {
    if (i < 2) return null;
    const w = [closes[i - 2], closes[i - 1], closes[i]].sort((a, b) => a - b);
    return w[1];
  });
  assertSeriesEqual(medianValues(closes, 3), expected, 'Median(3)');
}

{
  // VWMA(20) = SMA(close*vol,20)/SMA(vol,20)
  const expected: S = closes.map((_, i) => {
    if (i < 19) return null;
    let pv = 0;
    let vv = 0;
    for (let k = 0; k < 20; k += 1) {
      pv += closes[i - k] * candles[i - k].volume;
      vv += candles[i - k].volume;
    }
    return pv / vv;
  });
  assertSeriesEqual(volumeWeightedMovingAverageValues(candles, 'close', 20), expected, 'VWMA(20)', 1e-5);
}

{
  // McGinley Dynamic: md += (src - md) / (len * (src/md)^4), seeded with EMA
  const seed = refEMA(closes, 14);
  const expected: S = new Array(closes.length).fill(null);
  let prev: number | null = null;
  closes.forEach((v, i) => {
    if (prev === null) {
      if (seed[i] !== null) {
        prev = seed[i];
        expected[i] = prev;
      }
      return;
    }
    prev = prev + (v - prev) / (14 * (v / prev) ** 4);
    expected[i] = prev;
  });
  assertSeriesEqual(mcginleyDynamicValues(closes, 14), expected, 'McGinley(14)');
}

{
  // Session VWAP grouped by UTC day
  const expected: S = new Array(candles.length).fill(null);
  let key = '';
  let pv = 0;
  let vv = 0;
  candles.forEach((c, i) => {
    const d = new Date(c.time);
    const k = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    if (k !== key) {
      key = k;
      pv = 0;
      vv = 0;
    }
    const typical = (c.high + c.low + c.close) / 3;
    pv += typical * c.volume;
    vv += c.volume;
    expected[i] = vv > 0 ? pv / vv : null;
  });
  assertSeriesEqual(calculateVwapValues(candles, 'hlc3'), expected, 'VWAP session');
}

console.log(`  reference comparisons done`);

// ---------- golden hand-computed values ----------

console.log('Golden values');

assertSeriesEqual(simpleMovingAverageValues([1, 2, 3, 4, 5], 3), [null, null, 2, 3, 4], 'golden SMA');
assertSeriesEqual(exponentialMovingAverageValues([2, 4, 6, 8, 10], 2), [null, 3, 5, 7, 9], 'golden EMA');
assertSeriesEqual(
  weightedMovingAverageValues([1, 2, 3, 4], 2),
  [null, 5 / 3, 8 / 3, 11 / 3],
  'golden WMA'
);
assertSeriesEqual(
  wilderMovingAverageValues([1, 2, 3, 4, 5], 2),
  [null, 1.5, 2.25, 3.125, 4.0625],
  'golden RMA'
);
assertSeriesEqual(medianValues([5, 1, 9, 3, 7], 3), [null, null, 5, 3, 7], 'golden Median');

// ---------- structural checks ----------

console.log('Structural checks');

{
  const { supertrend, direction } = calculateSupertrendSeries(candles, 10, 3);
  let previousDir: 1 | -1 | null = null;
  let previousSt: number | null = null;
  let flips = 0;

  candles.forEach((candle, i) => {
    const st = supertrend[i];
    const dir = direction[i];
    if (st === null || dir === null) return;

    assert(Number.isFinite(st), `supertrend finite at ${i}`);

    if (previousDir !== null && previousSt !== null) {
      if (dir === previousDir) {
        if (dir === 1) {
          checks += 1;
          if (st < previousSt - 1e-9) fail(`supertrend up-trend stop decreased at ${i}`);
        } else {
          checks += 1;
          if (st > previousSt + 1e-9) fail(`supertrend down-trend stop increased at ${i}`);
        }
      } else {
        flips += 1;
      }
    }
    previousDir = dir;
    previousSt = st;
  });

  assert(flips > 3, `supertrend flips a few times on random walk (got ${flips})`);
  // In an uptrend the stop sits below the close; above it in a downtrend.
  candles.forEach((candle, i) => {
    const st = supertrend[i];
    const dir = direction[i];
    if (st === null || dir === null) return;
    checks += 1;
    if (dir === 1 && st > Math.max(candle.close, candle.high)) fail(`supertrend above price in uptrend at ${i}`);
    if (dir === -1 && st < Math.min(candle.close, candle.low)) fail(`supertrend below price in downtrend at ${i}`);
  });
}

{
  const sar = calculateParabolicSarValues(candles, 0.02, 0.02, 0.2);
  const finiteCount = sar.filter((v) => v !== null && Number.isFinite(v)).length;
  assert(finiteCount >= candles.length - 1, 'PSAR defined from second bar');
}

{
  const ichimoku = calculateIchimokuSeries(candles, 9, 26, 52, 26);
  assert(ichimoku.spanA.length === candles.length + 25, 'Ichimoku span A shifted forward by displacement-1');
  // conversion = donchian middle 9
  const i = 100;
  let hh = -Infinity;
  let ll = Infinity;
  for (let k = 0; k < 9; k += 1) {
    hh = Math.max(hh, highs[i - k]);
    ll = Math.min(ll, lows[i - k]);
  }
  assert(close(ichimoku.conversion[i], (hh + ll) / 2), 'Ichimoku conversion = donchian middle');
  // spanA shifted: spanA[i+25] = (conv[i]+base[i])/2
  const conv = ichimoku.conversion[i];
  const base = ichimoku.base[i];
  assert(
    conv !== null && base !== null && close(ichimoku.spanA[i + 25], (conv + base) / 2),
    'Ichimoku span A displacement'
  );
  // lagging: lagging[i-25] = close[i]
  assert(close(ichimoku.lagging[i - 25], candles[i].close), 'Ichimoku lagging displacement');
}

{
  const zigzag = calculateZigZagSeries(candles, 5, 10);
  const pivots: Array<{ index: number; price: number }> = [];
  zigzag.forEach((v, i) => {
    if (v !== null) pivots.push({ index: i, price: v });
  });
  assert(pivots.length >= 2, `zigzag found pivots (got ${pivots.length})`);
  for (let k = 1; k < pivots.length - 1; k += 1) {
    const move = Math.abs(pivots[k].price - pivots[k - 1].price) / Math.max(pivots[k - 1].price, 1);
    checks += 1;
    if (move < 0.045) fail(`zigzag leg ${k} below deviation threshold (${(move * 100).toFixed(2)}%)`);
  }
}

{
  const levels = calculatePivotPointsStandard(candles, 3_600_000);
  // find second day's first bar and verify against day-1 aggregates
  const dayKey = (t: number) => {
    const d = new Date(t);
    return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
  };
  let boundary = -1;
  for (let i = 1; i < candles.length; i += 1) {
    if (dayKey(candles[i].time) !== dayKey(candles[i - 1].time)) {
      boundary = i;
      break;
    }
  }
  assert(boundary > 0, 'found day boundary');
  if (boundary > 0) {
    let h = -Infinity;
    let l = Infinity;
    for (let i = 0; i < boundary; i += 1) {
      h = Math.max(h, candles[i].high);
      l = Math.min(l, candles[i].low);
    }
    const c = candles[boundary - 1].close;
    const p = (h + l + c) / 3;
    assert(close(levels.p[boundary], p), 'pivot P matches (H+L+C)/3 of previous day');
    assert(close(levels.r1[boundary], 2 * p - l), 'pivot R1');
    assert(close(levels.s1[boundary], 2 * p - h), 'pivot S1');
    assert(close(levels.r2[boundary], p + (h - l)), 'pivot R2');
    assert(close(levels.s2[boundary], p - (h - l)), 'pivot S2');
    assert(close(levels.r3[boundary], h + 2 * (p - l)), 'pivot R3');
    assert(close(levels.s3[boundary], l - 2 * (h - p)), 'pivot S3');
  }
}

{
  const { highs: ph, lows: pl } = calculatePivotPointsHighLow(candles, 10, 10);
  assert(ph.length > 0 && pl.length > 0, 'pivot HL found pivots');
  ph.forEach((pivot) => {
    for (let k = pivot.index - 10; k <= pivot.index + 10; k += 1) {
      if (k === pivot.index) continue;
      checks += 1;
      if (candles[k].high > pivot.price || (k < pivot.index && candles[k].high === pivot.price)) {
        fail(`pivot high at ${pivot.index} not strict max in window`);
        break;
      }
    }
  });
}

// ---------- full registry smoke test ----------

console.log('Registry smoke test (every definition computes cleanly)');

const seenIds = new Set<string>();
INDICATOR_DEFINITIONS.forEach((definition) => {
  assert(!seenIds.has(definition.id), `duplicate definition id ${definition.id}`);
  seenIds.add(definition.id);
});

INDICATOR_DEFINITIONS.forEach((definition) => {
  const active = {
    id: `${definition.id}-test`,
    definitionId: definition.id,
    visible: true,
    settings: { ...definition.defaults },
  };

  let computed;
  try {
    computed = computeIndicatorSeries(active, candles);
  } catch (error) {
    fail(`${definition.id}: computeIndicatorSeries threw ${error}`);
    return;
  }

  let hasValue = false;
  computed.lines.forEach((line) => {
    line.values.forEach((value, i) => {
      checks += 1;
      if (value !== null && !Number.isFinite(value)) {
        fail(`${definition.id}: line ${line.label} non-finite at ${i}`);
      }
      if (value !== null) hasValue = true;
    });
    if (line.colors) {
      assert(line.colors.length >= line.values.length - 1, `${definition.id}: colors array sized`);
    }
  });
  computed.histogram?.forEach((value, i) => {
    checks += 1;
    if (value !== null && !Number.isFinite(value)) fail(`${definition.id}: histogram non-finite at ${i}`);
    if (value !== null) hasValue = true;
  });
  if (computed.markers && computed.markers.length > 0) hasValue = true;

  if (definition.formula === 'fundamental') {
    assert(computed.noData === true, `${definition.id}: fundamental flags noData`);
  } else if (definition.formula !== 'volume') {
    assert(hasValue, `${definition.id}: produced at least one value`);
  }
});

// legacy id aliases
assert(getIndicatorDefinition('sma-20').id === 'sma', 'legacy sma-20 → sma');
assert(getIndicatorDefinition('rsi-14').id === 'rsi', 'legacy rsi-14 → rsi');
assert(getIndicatorDefinition('vwap-session').id === 'vwap', 'legacy vwap-session → vwap');
assert(getIndicatorDefinition('bb-20').id === 'bb', 'legacy bb-20 → bb');

const technicalCount = INDICATOR_DEFINITIONS.filter((d) => d.category !== 'Fundamental').length;
const fundamentalCount = INDICATOR_DEFINITIONS.filter((d) => d.category === 'Fundamental').length;
console.log(`  ${technicalCount} technical + ${fundamentalCount} fundamental definitions`);

// ---------- summary ----------

console.log('');
if (failures > 0) {
  console.error(`FAILED: ${failures} of ${checks} checks failed`);
  process.exit(1);
} else {
  console.log(`PASSED: all ${checks} checks passed`);
}
