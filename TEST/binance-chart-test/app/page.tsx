'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CanvasHTMLAttributes,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react';

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
type MenuKey = 'timeframe' | 'chartStyle' | 'indicators';
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
  paneIndex: number;
  startX: number;
  startY: number;
  startViewRange: ViewRange;
  startPriceRange: PriceRange | null;
  anchorPrice: number;
}

interface ChartInteractionBounds {
  minPrice: number;
  maxPrice: number;
  chartArea: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
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

interface IndicatorLegendTarget {
  indicatorId: string;
  paneIndex: number;
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

type HeaderPanelKey =
  | 'symbolSearch'
  | 'templates'
  | 'templateSave'
  | 'templateOpen'
  | 'layout'
  | 'manageLayouts'
  | 'quickSearch'
  | 'settings'
  | 'snapshot'
  | 'alert'
  | 'replay'
  | 'save'
  | 'trade'
  | 'publish';
type LayoutSyncKey = 'symbol' | 'interval' | 'crosshair' | 'time' | 'dateRange';
type SettingsTab = 'symbol' | 'status' | 'scales' | 'canvas' | 'trading' | 'alerts' | 'events';

interface LayoutCellSpec {
  column: string;
  row: string;
}

interface ChartLayoutOption {
  id: string;
  count: number;
  label: string;
  columns: number;
  rows: number;
  cells: LayoutCellSpec[];
  templateColumns: string;
  templateRows: string;
}

interface ChartLayoutGroup {
  count: number;
  options: ChartLayoutOption[];
}

type QuickActionId =
  | 'symbol'
  | 'timeframe'
  | 'chartStyle'
  | 'indicators'
  | 'templates'
  | 'layout'
  | 'settings'
  | 'snapshot'
  | 'alert'
  | 'replay'
  | 'save'
  | 'trade'
  | 'publish'
  | 'fullscreen'
  | 'reset';

interface IndicatorTemplate {
  id: string;
  name: string;
  createdAt: number;
  indicators: ActiveIndicator[];
}

interface SavedChartPaneSnapshot {
  symbol: string;
  timeframe: string;
  manualPriceRange: PriceRange | null;
  viewRange: ViewRange;
}

interface SavedChartLayout {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  selectedLayoutId: string;
  activePaneIndex: number;
  chartStyle: ChartStyle;
  theme: ThemeName;
  layoutSync: Record<LayoutSyncKey, boolean>;
  chartSettings: ChartSettingsState;
  indicators: ActiveIndicator[];
  panes: SavedChartPaneSnapshot[];
}

interface ChartSettingsState {
  showStatusLine: boolean;
  showIndicatorLegend: boolean;
  showGridLines: boolean;
  showCurrentPriceLine: boolean;
  showVolumePane: boolean;
  showCrosshair: boolean;
}

interface ChartPaneState {
  symbol: string;
  timeframe: string;
  candles: Candle[];
  loading: boolean;
  error: string | null;
  feedStatus: FeedStatus;
  refreshNonce: number;
  mousePos: MousePosition | null;
  dragMode: ChartDragMode;
  pointerArea: ChartPointerArea;
  manualPriceRange: PriceRange | null;
  viewRange: ViewRange;
}

interface QuickAction {
  id: QuickActionId;
  label: string;
  description: string;
}

type SymbolSearchCategory = 'all' | 'favorites' | 'spot' | 'layer1' | 'defi' | 'meme';

interface SymbolSearchOption {
  symbol: string;
  base: string;
  quote: string;
  name: string;
  exchange: string;
  tags: string[];
  categories: SymbolSearchCategory[];
  color: string;
}

const INDICATOR_TEMPLATE_STORAGE_KEY = 'procharting.indicatorTemplates';
const CHART_LAYOUT_STORAGE_KEY = 'procharting.chartLayouts';
const MAX_SAVED_CHART_LAYOUTS = 12;
const LAYOUT_SYNC_LABELS: Record<LayoutSyncKey, string> = {
  symbol: 'Symbol',
  interval: 'Interval',
  crosshair: 'Crosshair',
  time: 'Time',
  dateRange: 'Date range',
};
const DEFAULT_LAYOUT_SYNC: Record<LayoutSyncKey, boolean> = {
  symbol: false,
  interval: false,
  crosshair: true,
  time: false,
  dateRange: false,
};
const DEFAULT_CHART_SETTINGS: ChartSettingsState = {
  showStatusLine: true,
  showIndicatorLegend: true,
  showGridLines: true,
  showCurrentPriceLine: true,
  showVolumePane: true,
  showCrosshair: true,
};

const layoutCell = (column: number, row: number, columnSpan = 1, rowSpan = 1): LayoutCellSpec => ({
  column: `${column} / span ${columnSpan}`,
  row: `${row} / span ${rowSpan}`,
});

const gridLayoutCells = (columns: number, rows: number, count = columns * rows): LayoutCellSpec[] =>
  Array.from({ length: Math.min(count, columns * rows) }, (_, index) =>
    layoutCell((index % columns) + 1, Math.floor(index / columns) + 1)
  );

const shiftLayoutColumns = (cells: LayoutCellSpec[], offset: number): LayoutCellSpec[] =>
  cells.map((cellSpec) => ({
    column: `${Number.parseInt(cellSpec.column, 10) + offset} / span 1`,
    row: cellSpec.row,
  }));

const createLayoutOption = (
  id: string,
  count: number,
  label: string,
  columns: number,
  rows: number,
  cells: LayoutCellSpec[] = gridLayoutCells(columns, rows, count),
  templateColumns = `repeat(${columns}, minmax(0, 1fr))`,
  templateRows = `repeat(${rows}, minmax(0, 1fr))`
): ChartLayoutOption => ({
  id,
  count,
  label,
  columns,
  rows,
  cells,
  templateColumns,
  templateRows,
});

const LAYOUT_GROUPS: ChartLayoutGroup[] = [
  { count: 1, options: [createLayoutOption('1-single', 1, '1 chart', 1, 1)] },
  {
    count: 2,
    options: [
      createLayoutOption('2-vertical', 2, '2 charts vertical split', 2, 1),
      createLayoutOption('2-horizontal', 2, '2 charts horizontal split', 1, 2),
    ],
  },
  {
    count: 3,
    options: [
      createLayoutOption('3-columns', 3, '3 charts in columns', 3, 1),
      createLayoutOption('3-rows', 3, '3 charts in rows', 1, 3),
      createLayoutOption('3-left', 3, 'Large chart left, two right', 2, 2, [
        layoutCell(1, 1, 1, 2),
        layoutCell(2, 1),
        layoutCell(2, 2),
      ]),
      createLayoutOption('3-right', 3, 'Two left, large chart right', 2, 2, [
        layoutCell(1, 1),
        layoutCell(1, 2),
        layoutCell(2, 1, 1, 2),
      ]),
      createLayoutOption('3-top', 3, 'Large chart top, two bottom', 2, 2, [
        layoutCell(1, 1, 2),
        layoutCell(1, 2),
        layoutCell(2, 2),
      ]),
      createLayoutOption('3-bottom', 3, 'Two top, large chart bottom', 2, 2, [
        layoutCell(1, 1),
        layoutCell(2, 1),
        layoutCell(1, 2, 2),
      ]),
    ],
  },
  {
    count: 4,
    options: [
      createLayoutOption('4-grid', 4, '4 charts grid', 2, 2),
      createLayoutOption('4-columns', 4, '4 charts in columns', 4, 1),
      createLayoutOption('4-rows', 4, '4 charts in rows', 1, 4),
      createLayoutOption('4-top', 4, 'Large chart top, three bottom', 3, 2, [
        layoutCell(1, 1, 3),
        layoutCell(1, 2),
        layoutCell(2, 2),
        layoutCell(3, 2),
      ]),
      createLayoutOption('4-bottom', 4, 'Three top, large chart bottom', 3, 2, [
        layoutCell(1, 1),
        layoutCell(2, 1),
        layoutCell(3, 1),
        layoutCell(1, 2, 3),
      ]),
      createLayoutOption('4-left', 4, 'Large chart left, three right', 2, 3, [
        layoutCell(1, 1, 1, 3),
        layoutCell(2, 1),
        layoutCell(2, 2),
        layoutCell(2, 3),
      ]),
      createLayoutOption('4-right', 4, 'Three left, large chart right', 2, 3, [
        layoutCell(1, 1),
        layoutCell(1, 2),
        layoutCell(1, 3),
        layoutCell(2, 1, 1, 3),
      ]),
      createLayoutOption('4-top-left', 4, 'Large chart top left', 3, 3, [
        layoutCell(1, 1, 2, 2),
        layoutCell(3, 1, 1, 2),
        layoutCell(1, 3),
        layoutCell(2, 3, 2),
      ]),
      createLayoutOption('4-top-right', 4, 'Large chart top right', 3, 3, [
        layoutCell(1, 1, 1, 2),
        layoutCell(2, 1, 2, 2),
        layoutCell(1, 3, 2),
        layoutCell(3, 3),
      ]),
      createLayoutOption('4-bottom-wide', 4, 'Two top, two bottom wide', 2, 3, [
        layoutCell(1, 1),
        layoutCell(2, 1),
        layoutCell(1, 2, 2),
        layoutCell(1, 3, 2),
      ]),
    ],
  },
  {
    count: 5,
    options: [
      createLayoutOption('5-columns', 5, '5 charts in columns', 5, 1),
      createLayoutOption('5-rows', 5, '5 charts in rows', 1, 5),
      createLayoutOption('5-3x2', 5, '5 charts compact grid', 3, 2),
      createLayoutOption('5-2x3', 5, '5 charts tall grid', 2, 3),
      createLayoutOption('5-left', 5, 'Large chart left, four right', 3, 4, [
        layoutCell(1, 1, 2, 4),
        layoutCell(3, 1),
        layoutCell(3, 2),
        layoutCell(3, 3),
        layoutCell(3, 4),
      ]),
      createLayoutOption('5-top', 5, 'Large chart top, four bottom', 4, 3, [
        layoutCell(1, 1, 4, 2),
        layoutCell(1, 3),
        layoutCell(2, 3),
        layoutCell(3, 3),
        layoutCell(4, 3),
      ]),
      createLayoutOption('5-corner', 5, 'Large chart corner with four panes', 3, 3, [
        layoutCell(1, 1, 2, 2),
        layoutCell(3, 1),
        layoutCell(3, 2),
        layoutCell(1, 3),
        layoutCell(2, 3, 2),
      ]),
      createLayoutOption('5-band', 5, 'One wide chart with four below', 4, 2, [
        layoutCell(1, 1, 4),
        layoutCell(1, 2),
        layoutCell(2, 2),
        layoutCell(3, 2),
        layoutCell(4, 2),
      ]),
      createLayoutOption('5-stack', 5, 'Four top charts with one wide bottom', 4, 2, [
        layoutCell(1, 1),
        layoutCell(2, 1),
        layoutCell(3, 1),
        layoutCell(4, 1),
        layoutCell(1, 2, 4),
      ]),
    ],
  },
  {
    count: 6,
    options: [
      createLayoutOption('6-3x2', 6, '6 charts grid', 3, 2),
      createLayoutOption('6-2x3', 6, '6 charts tall grid', 2, 3),
      createLayoutOption('6-columns', 6, '6 charts in columns', 6, 1),
      createLayoutOption('6-rows', 6, '6 charts in rows', 1, 6),
      createLayoutOption('6-left', 6, 'Large chart left, five right', 3, 5, [
        layoutCell(1, 1, 2, 5),
        ...gridLayoutCells(1, 5).map((cellSpec) => ({ column: '3 / span 1', row: cellSpec.row })),
      ]),
      createLayoutOption('6-top', 6, 'Large chart top, five bottom', 5, 3, [
        layoutCell(1, 1, 5, 2),
        ...gridLayoutCells(5, 1).map((cellSpec) => ({ column: cellSpec.column, row: '3 / span 1' })),
      ]),
    ],
  },
  {
    count: 7,
    options: [
      createLayoutOption('7-4x2', 7, '7 charts compact grid', 4, 2),
      createLayoutOption('7-2x4', 7, '7 charts tall grid', 2, 4),
      createLayoutOption('7-left', 7, 'Large chart left, six right', 3, 6, [
        layoutCell(1, 1, 2, 6),
        ...gridLayoutCells(1, 6).map((cellSpec) => ({ column: '3 / span 1', row: cellSpec.row })),
      ]),
    ],
  },
  {
    count: 8,
    options: [
      createLayoutOption('8-4x2', 8, '8 charts grid', 4, 2),
      createLayoutOption('8-2x4', 8, '8 charts tall grid', 2, 4),
      createLayoutOption('8-columns', 8, '8 charts in columns', 8, 1),
      createLayoutOption('8-rows', 8, '8 charts in rows', 1, 8),
    ],
  },
  {
    count: 9,
    options: [
      createLayoutOption('9-3x3', 9, '9 charts grid', 3, 3),
      createLayoutOption('9-columns', 9, '9 charts in columns', 9, 1),
      createLayoutOption('9-rows', 9, '9 charts in rows', 1, 9),
      createLayoutOption('9-left', 9, 'Large chart left, eight right', 4, 4, [
        layoutCell(1, 1, 2, 4),
        ...shiftLayoutColumns(gridLayoutCells(2, 4, 8), 2),
      ]),
    ],
  },
  {
    count: 10,
    options: [
      createLayoutOption('10-5x2', 10, '10 charts grid', 5, 2),
      createLayoutOption('10-2x5', 10, '10 charts tall grid', 2, 5),
      createLayoutOption('10-rows', 10, '10 charts in rows', 1, 10),
    ],
  },
  {
    count: 12,
    options: [
      createLayoutOption('12-4x3', 12, '12 charts grid', 4, 3),
      createLayoutOption('12-3x4', 12, '12 charts tall grid', 3, 4),
      createLayoutOption('12-columns', 12, '12 charts in columns', 12, 1),
    ],
  },
  {
    count: 14,
    options: [
      createLayoutOption('14-7x2', 14, '14 charts grid', 7, 2),
      createLayoutOption('14-2x7', 14, '14 charts tall grid', 2, 7),
    ],
  },
  {
    count: 16,
    options: [
      createLayoutOption('16-4x4', 16, '16 charts grid', 4, 4),
      createLayoutOption('16-8x2', 16, '16 charts wide grid', 8, 2),
    ],
  },
];
const ALL_LAYOUT_OPTIONS = LAYOUT_GROUPS.flatMap((group) => group.options);
const DEFAULT_LAYOUT_ID = '1-single';
const getLayoutOptionById = (layoutId: string) =>
  ALL_LAYOUT_OPTIONS.find((option) => option.id === layoutId) ?? ALL_LAYOUT_OPTIONS[0]!;
const SETTINGS_TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'symbol', label: 'Symbol' },
  { id: 'status', label: 'Status line' },
  { id: 'scales', label: 'Scales and lines' },
  { id: 'canvas', label: 'Canvas' },
  { id: 'trading', label: 'Trading' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'events', label: 'Events' },
];
const QUICK_ACTIONS: QuickAction[] = [
  { id: 'symbol', label: 'Symbol search', description: 'Change market symbol' },
  { id: 'timeframe', label: 'Change interval', description: 'Open timeframe menu' },
  { id: 'chartStyle', label: 'Chart type', description: 'Switch candles, line, or area' },
  { id: 'indicators', label: 'Indicators', description: 'Open indicators and strategies' },
  { id: 'templates', label: 'Indicator templates', description: 'Save or apply indicator sets' },
  { id: 'layout', label: 'Layout setup', description: 'Change layout and sync options' },
  { id: 'alert', label: 'Create alert', description: 'Set a market alert' },
  { id: 'replay', label: 'Bar replay', description: 'Replay historical candles' },
  { id: 'save', label: 'Save chart', description: 'Save the current chart layout' },
  { id: 'settings', label: 'Settings', description: 'Open chart settings' },
  { id: 'snapshot', label: 'Chart snapshot', description: 'Download, copy, or open image' },
  { id: 'trade', label: 'Trade', description: 'Choose a broker connection' },
  { id: 'publish', label: 'Publish idea', description: 'Share analysis with the community' },
  { id: 'fullscreen', label: 'Fullscreen mode', description: 'Toggle fullscreen chart' },
  { id: 'reset', label: 'Reset chart view', description: 'Restore automatic view' },
];
const FEATURE_DIALOGS: Record<'alert' | 'replay', { title: string; eyebrow: string; body: string }> = {
  alert: {
    title: 'Never miss a trade again',
    eyebrow: 'Create alert',
    body: 'Get notified when price, indicators, or drawing levels meet the condition you care about.',
  },
  replay: {
    title: 'Unlock Bar Replay',
    eyebrow: 'Bar replay',
    body: 'Step through historical candles and practice decisions with the chart paused at any point in time.',
  },
};
const BROKER_OPTIONS = [
  'Paper Trading',
  'Fusion Markets',
  'OKX',
  'Gate',
  'Bybit',
  'Binance',
  'Capital.com',
  'TradeStation',
];
const PUBLISH_OPTIONS = [
  {
    label: 'Publish idea',
    description: 'Share your next big trade',
  },
  {
    label: 'Record video idea',
    description: 'Create market-moving videos',
  },
  {
    label: 'Speak your mind',
    description: 'Write public notes about your favorite symbols',
  },
];

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
const SYMBOL_SEARCH_TABS: Array<{ id: SymbolSearchCategory; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'spot', label: 'Spot' },
  { id: 'layer1', label: 'Layer 1' },
  { id: 'defi', label: 'DeFi' },
  { id: 'meme', label: 'Meme' },
];
const SYMBOL_SEARCH_OPTIONS: SymbolSearchOption[] = [
  {
    symbol: 'BTCUSDT',
    base: 'BTC',
    quote: 'USDT',
    name: 'Bitcoin / TetherUS',
    exchange: 'Binance',
    tags: ['spot', 'crypto', 'defi'],
    categories: ['favorites', 'spot', 'layer1'],
    color: '#f7931a',
  },
  {
    symbol: 'ETHUSDT',
    base: 'ETH',
    quote: 'USDT',
    name: 'Ethereum / TetherUS',
    exchange: 'Binance',
    tags: ['spot', 'crypto', 'defi'],
    categories: ['favorites', 'spot', 'layer1', 'defi'],
    color: '#627eea',
  },
  {
    symbol: 'SOLUSDT',
    base: 'SOL',
    quote: 'USDT',
    name: 'Solana / TetherUS',
    exchange: 'Binance',
    tags: ['spot', 'crypto'],
    categories: ['favorites', 'spot', 'layer1'],
    color: '#14f195',
  },
  {
    symbol: 'BNBUSDT',
    base: 'BNB',
    quote: 'USDT',
    name: 'BNB / TetherUS',
    exchange: 'Binance',
    tags: ['spot', 'crypto'],
    categories: ['favorites', 'spot', 'layer1'],
    color: '#f3ba2f',
  },
  {
    symbol: 'XRPUSDT',
    base: 'XRP',
    quote: 'USDT',
    name: 'XRP / TetherUS',
    exchange: 'Binance',
    tags: ['spot', 'crypto'],
    categories: ['spot', 'layer1'],
    color: '#23292f',
  },
  {
    symbol: 'ADAUSDT',
    base: 'ADA',
    quote: 'USDT',
    name: 'Cardano / TetherUS',
    exchange: 'Binance',
    tags: ['spot', 'crypto'],
    categories: ['spot', 'layer1'],
    color: '#3468d1',
  },
  {
    symbol: 'DOGEUSDT',
    base: 'DOGE',
    quote: 'USDT',
    name: 'Dogecoin / TetherUS',
    exchange: 'Binance',
    tags: ['spot', 'crypto'],
    categories: ['spot', 'meme'],
    color: '#c2a633',
  },
  {
    symbol: 'AVAXUSDT',
    base: 'AVAX',
    quote: 'USDT',
    name: 'Avalanche / TetherUS',
    exchange: 'Binance',
    tags: ['spot', 'crypto', 'defi'],
    categories: ['spot', 'layer1', 'defi'],
    color: '#e84142',
  },
  {
    symbol: 'LINKUSDT',
    base: 'LINK',
    quote: 'USDT',
    name: 'Chainlink / TetherUS',
    exchange: 'Binance',
    tags: ['spot', 'crypto', 'oracle'],
    categories: ['spot', 'defi'],
    color: '#2a5ada',
  },
  {
    symbol: 'DOTUSDT',
    base: 'DOT',
    quote: 'USDT',
    name: 'Polkadot / TetherUS',
    exchange: 'Binance',
    tags: ['spot', 'crypto'],
    categories: ['spot', 'layer1'],
    color: '#e6007a',
  },
  {
    symbol: 'LTCUSDT',
    base: 'LTC',
    quote: 'USDT',
    name: 'Litecoin / TetherUS',
    exchange: 'Binance',
    tags: ['spot', 'crypto'],
    categories: ['spot', 'layer1'],
    color: '#345d9d',
  },
  {
    symbol: 'TRXUSDT',
    base: 'TRX',
    quote: 'USDT',
    name: 'TRON / TetherUS',
    exchange: 'Binance',
    tags: ['spot', 'crypto'],
    categories: ['spot', 'layer1'],
    color: '#ff0013',
  },
];
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
const createDefaultViewRange = (): ViewRange => ({
  startIndex: 0,
  endIndex: 100,
  candlesPerView: 100,
});
const createDefaultChartBounds = (): ChartInteractionBounds => ({
  minPrice: 0,
  maxPrice: 0,
  chartArea: { left: 12, top: 34, width: 0, height: 0 },
});
const createDragState = (paneIndex = 0): ChartDragState => ({
  mode: 'none',
  paneIndex,
  startX: 0,
  startY: 0,
  startViewRange: createDefaultViewRange(),
  startPriceRange: null,
  anchorPrice: 0,
});
const createChartPaneState = (symbol = 'BTCUSDT', timeframe = '1m'): ChartPaneState => ({
  symbol,
  timeframe,
  candles: [],
  loading: true,
  error: null,
  feedStatus: 'connecting',
  refreshNonce: 0,
  mousePos: null,
  dragMode: 'none',
  pointerArea: 'outside',
  manualPriceRange: null,
  viewRange: createDefaultViewRange(),
});
const createSavedPaneSnapshot = (pane: ChartPaneState): SavedChartPaneSnapshot => ({
  symbol: pane.symbol,
  timeframe: pane.timeframe,
  manualPriceRange: pane.manualPriceRange ? { ...pane.manualPriceRange } : null,
  viewRange: { ...pane.viewRange },
});
const createChartPaneStateFromSnapshot = (
  snapshot: SavedChartPaneSnapshot | undefined,
  refreshNonce = Date.now()
): ChartPaneState => {
  const symbol = typeof snapshot?.symbol === 'string' && snapshot.symbol.length > 0 ? snapshot.symbol : 'BTCUSDT';
  const timeframe =
    typeof snapshot?.timeframe === 'string' && snapshot.timeframe.length > 0 ? snapshot.timeframe : '1m';

  return {
    ...createChartPaneState(symbol, timeframe),
    refreshNonce,
    manualPriceRange: snapshot?.manualPriceRange ? { ...snapshot.manualPriceRange } : null,
    viewRange: snapshot?.viewRange ? { ...snapshot.viewRange } : createDefaultViewRange(),
  };
};
const cloneChartPaneState = (source: ChartPaneState): ChartPaneState => ({
  ...source,
  candles: [...source.candles],
  mousePos: null,
  dragMode: 'none',
  pointerArea: 'outside',
});
const getStreamKey = (symbol: string, timeframe: string) => `${symbol.toLowerCase()}@kline_${timeframe}`;

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

const getSymbolSearchOption = (symbol: string) =>
  SYMBOL_SEARCH_OPTIONS.find((option) => option.symbol === symbol) ?? SYMBOL_SEARCH_OPTIONS[0]!;

const matchesSymbolSearch = (
  option: SymbolSearchOption,
  category: SymbolSearchCategory,
  query: string
) => {
  const matchesCategory = category === 'all' || option.categories.includes(category);
  const normalizedQuery = query.trim().toLowerCase();

  if (!matchesCategory) return false;
  if (normalizedQuery.length === 0) return true;

  const directMatches = [option.symbol, option.base, option.quote, option.exchange, ...option.tags].some(
    (value) => value.toLowerCase().includes(normalizedQuery)
  );
  const nameMatches = option.name
    .toLowerCase()
    .split(/[\s/]+/)
    .some((word) => word.startsWith(normalizedQuery));

  return directMatches || nameMatches;
};

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

type HeaderIconName =
  | 'templates'
  | 'alert'
  | 'replay'
  | 'undo'
  | 'redo'
  | 'layout'
  | 'caret'
  | 'search'
  | 'settings'
  | 'fullscreen'
  | 'snapshot';

const HEADER_ICON_PATHS: Record<HeaderIconName, ReactNode> = {
  templates: (
    <>
      <rect x="3" y="3" width="5" height="5" rx="1" />
      <rect x="12" y="3" width="5" height="5" rx="1" />
      <rect x="3" y="12" width="5" height="5" rx="1" />
      <rect x="12" y="12" width="5" height="5" rx="1" />
    </>
  ),
  alert: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l3 2" />
      <path d="M15.5 4.5l2-2" />
      <path d="M16 2.5h2v2" />
    </>
  ),
  replay: (
    <>
      <path d="M7 5L3 10l4 5" />
      <path d="M14 5l-4 5 4 5" />
      <path d="M17 5v10" />
    </>
  ),
  undo: (
    <>
      <path d="M8 6H4v4" />
      <path d="M4 10c2.2-3.6 7.8-4.1 11-1.1 1.4 1.4 2 3.3 1.7 5.1" />
    </>
  ),
  redo: (
    <>
      <path d="M12 6h4v4" />
      <path d="M16 10C13.8 6.4 8.2 5.9 5 8.9 3.6 10.3 3 12.2 3.3 14" />
    </>
  ),
  layout: <rect x="4" y="4" width="12" height="12" rx="2" />,
  caret: <path d="M6 8l4 4 4-4" />,
  search: (
    <>
      <circle cx="8.5" cy="8.5" r="5" />
      <path d="M12.5 12.5L17 17" />
    </>
  ),
  settings: (
    <>
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2.5v2" />
      <path d="M10 15.5v2" />
      <path d="M2.5 10h2" />
      <path d="M15.5 10h2" />
      <path d="M4.7 4.7l1.4 1.4" />
      <path d="M13.9 13.9l1.4 1.4" />
      <path d="M15.3 4.7l-1.4 1.4" />
      <path d="M6.1 13.9l-1.4 1.4" />
    </>
  ),
  fullscreen: (
    <>
      <path d="M7 3H3v4" />
      <path d="M13 3h4v4" />
      <path d="M17 13v4h-4" />
      <path d="M3 13v4h4" />
    </>
  ),
  snapshot: (
    <>
      <path d="M6.5 6.5l1-2h5l1 2H16a2 2 0 0 1 2 2v6A2 2 0 0 1 16 16H4a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2h2.5z" />
      <circle cx="10" cy="11" r="3" />
    </>
  ),
};

function HeaderIcon({ name }: { name: HeaderIconName }) {
  return (
    <svg className="header-icon" viewBox="0 0 20 20" aria-hidden="true">
      {HEADER_ICON_PATHS[name]}
    </svg>
  );
}

function LayoutOptionIcon({ option }: { option: ChartLayoutOption }) {
  return (
    <span
      className="layout-option-icon"
      style={{
        gridTemplateColumns: option.templateColumns,
        gridTemplateRows: option.templateRows,
      }}
      aria-hidden="true"
    >
      {option.cells.map((cellSpec, index) => (
        <span
          key={`${option.id}-${index}`}
          className="layout-option-cell"
          style={{ gridColumn: cellSpec.column, gridRow: cellSpec.row }}
        />
      ))}
    </span>
  );
}

interface ChartPaneProps {
  cell: LayoutCellSpec;
  paneIndex: number;
  active: boolean;
  onActivate: () => void;
  canvasRef: Ref<HTMLCanvasElement>;
  canvasProps: CanvasHTMLAttributes<HTMLCanvasElement> & Record<`data-${string}`, string | number | boolean | undefined>;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

function ChartPane({
  cell,
  paneIndex,
  active,
  onActivate,
  canvasRef,
  canvasProps,
  children,
  className = '',
  style,
}: ChartPaneProps) {
  const canvasClassName = ['chart-canvas', canvasProps.className].filter(Boolean).join(' ');

  return (
    <div
      className={['chart-layout-cell', className].filter(Boolean).join(' ')}
      data-active={active}
      data-pane-index={paneIndex + 1}
      aria-current={active ? 'true' : undefined}
      onFocus={onActivate}
      onPointerDownCapture={onActivate}
      style={{
        ...style,
        gridColumn: cell.column,
        gridRow: cell.row,
      }}
    >
      <canvas {...canvasProps} ref={canvasRef} className={canvasClassName} />
      {children}
    </div>
  );
}

export default function Home() {
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const socketRef = useRef<WebSocket | null>(null);
  const controlRackRef = useRef<HTMLDivElement>(null);
  const symbolSearchInputRef = useRef<HTMLInputElement>(null);
  const indicatorLegendRef = useRef<HTMLDivElement>(null);
  const activeStreamsRef = useRef<Set<string>>(new Set());
  const paneStatesRef = useRef<ChartPaneState[]>([]);
  const chartBoundsRefs = useRef<ChartInteractionBounds[]>([createDefaultChartBounds()]);
  const dragStateRef = useRef<ChartDragState>(createDragState());

  const [chartPanes, setChartPanes] = useState<ChartPaneState[]>(() => [createChartPaneState()]);
  const [activePaneIndex, setActivePaneIndex] = useState(0);
  const [chartStyle, setChartStyle] = useState<ChartStyle>('candles');
  const [theme, setTheme] = useState<ThemeName>('dark');
  const [activeIndicators, setActiveIndicators] = useState<ActiveIndicator[]>(DEFAULT_ACTIVE_INDICATORS);
  const [settingsTarget, setSettingsTarget] = useState<IndicatorLegendTarget | null>(null);
  const [moreTarget, setMoreTarget] = useState<IndicatorLegendTarget | null>(null);
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [headerPanel, setHeaderPanel] = useState<HeaderPanelKey | null>(null);
  const [indicatorTemplates, setIndicatorTemplates] = useState<IndicatorTemplate[]>([]);
  const [templateName, setTemplateName] = useState('My indicator template');
  const [savedChartLayouts, setSavedChartLayouts] = useState<SavedChartLayout[]>([]);
  const [layoutName, setLayoutName] = useState('My chart layout');
  const [activeSavedLayoutId, setActiveSavedLayoutId] = useState<string | null>(null);
  const [layoutSaveTargetId, setLayoutSaveTargetId] = useState<string | null>(null);
  const [layoutAutosave, setLayoutAutosave] = useState(false);
  const [layoutSaveStatus, setLayoutSaveStatus] = useState('');
  const [selectedLayoutId, setSelectedLayoutId] = useState(DEFAULT_LAYOUT_ID);
  const [layoutSync, setLayoutSync] = useState<Record<LayoutSyncKey, boolean>>(DEFAULT_LAYOUT_SYNC);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('symbol');
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [symbolSearchQuery, setSymbolSearchQuery] = useState('BTCUSDT');
  const [symbolSearchCategory, setSymbolSearchCategory] = useState<SymbolSearchCategory>('all');
  const [snapshotStatus, setSnapshotStatus] = useState('');
  const [selectedBroker, setSelectedBroker] = useState('Paper Trading');
  const [chartSettings, setChartSettings] = useState<ChartSettingsState>(DEFAULT_CHART_SETTINGS);

  const palette = PALETTES[theme];
  const selectedLayout = getLayoutOptionById(selectedLayoutId);
  const selectedLayoutCells = selectedLayout.cells;
  const paneCount = selectedLayoutCells.length;
  const activeSavedLayout = savedChartLayouts.find((layout) => layout.id === activeSavedLayoutId) ?? null;
  const activePane = chartPanes[activePaneIndex] ?? chartPanes[0] ?? createChartPaneState();
  const activeSymbol = activePane.symbol;
  const activeTimeframe = activePane.timeframe;
  const activeFeedStatus = activePane.feedStatus;
  const visibleIndicators = activeIndicators.filter((indicator) => indicator.visible);
  const selectedSymbolOption = getSymbolSearchOption(activeSymbol);
  const visibleVolumeIndicator = visibleIndicators.find(
    (indicator) => getIndicatorDefinition(indicator.definitionId).pane === 'volume'
  );
  const visibleOscillatorIndicators = visibleIndicators.filter(
    (indicator) => getIndicatorDefinition(indicator.definitionId).pane === 'oscillator'
  );
  const indicatorCount = activeIndicators.length;
  const showVolume = chartSettings.showVolumePane && visibleVolumeIndicator !== undefined;
  const paneIndicatorSeries = useMemo(() => {
    return chartPanes.map((pane) =>
      activeIndicators.reduce<Record<string, IndicatorComputedSeries>>((seriesById, indicator) => {
        seriesById[indicator.id] = computeIndicatorSeries(indicator, pane.candles);
        return seriesById;
      }, {})
    );
  }, [activeIndicators, chartPanes]);
  paneStatesRef.current = chartPanes;
  const filteredSymbolOptions = useMemo(() => {
    return SYMBOL_SEARCH_OPTIONS.filter((option) =>
      matchesSymbolSearch(option, symbolSearchCategory, symbolSearchQuery)
    );
  }, [symbolSearchCategory, symbolSearchQuery]);
  const filteredQuickActions = QUICK_ACTIONS.filter((action) => {
    const query = quickSearchQuery.trim().toLowerCase();
    if (query.length === 0) return true;

    return (
      action.label.toLowerCase().includes(query) ||
      action.description.toLowerCase().includes(query)
    );
  });
  const paneMarketRequestKey = chartPanes
    .map((pane, index) => `${index}:${pane.symbol}:${pane.timeframe}:${pane.refreshNonce}`)
    .join('|');

  useEffect(() => {
    canvasRefs.current = canvasRefs.current.slice(0, paneCount);
    chartBoundsRefs.current = Array.from(
      { length: paneCount },
      (_unused, index) => chartBoundsRefs.current[index] ?? createDefaultChartBounds()
    );

    setChartPanes((current) => {
      if (current.length === paneCount) return current;

      if (current.length > paneCount) {
        return current.slice(0, paneCount);
      }

      const source = current[activePaneIndex] ?? current[0] ?? createChartPaneState();
      const next = [...current];
      while (next.length < paneCount) {
        next.push(cloneChartPaneState(source));
      }

      return next;
    });
    setActivePaneIndex((current) => clamp(current, 0, Math.max(0, paneCount - 1)));
  }, [activePaneIndex, paneCount]);

  useEffect(() => {
    if (headerPanel !== 'symbolSearch') return;

    window.requestAnimationFrame(() => {
      symbolSearchInputRef.current?.focus();
      symbolSearchInputRef.current?.select();
    });
  }, [headerPanel]);

  useEffect(() => {
    try {
      const rawTemplates = window.localStorage.getItem(INDICATOR_TEMPLATE_STORAGE_KEY);
      if (!rawTemplates) return;

      const parsedTemplates = JSON.parse(rawTemplates) as IndicatorTemplate[];
      if (!Array.isArray(parsedTemplates)) return;

      setIndicatorTemplates(
        parsedTemplates.filter(
          (template) =>
            typeof template.id === 'string' &&
            typeof template.name === 'string' &&
            Array.isArray(template.indicators)
        )
      );
    } catch {
      setIndicatorTemplates([]);
    }
  }, []);

  useEffect(() => {
    try {
      const rawLayouts = window.localStorage.getItem(CHART_LAYOUT_STORAGE_KEY);
      if (!rawLayouts) return;

      const parsedLayouts = JSON.parse(rawLayouts) as SavedChartLayout[];
      if (!Array.isArray(parsedLayouts)) return;

      setSavedChartLayouts(
        parsedLayouts
          .filter(
            (layout) =>
              typeof layout.id === 'string' &&
              typeof layout.name === 'string' &&
              typeof layout.selectedLayoutId === 'string' &&
              Array.isArray(layout.panes) &&
              Array.isArray(layout.indicators)
          )
          .slice(0, MAX_SAVED_CHART_LAYOUTS)
      );
    } catch {
      setSavedChartLayouts([]);
    }
  }, []);

  const getEstimatedChartWidth = (paneIndex = activePaneIndex) => {
    const canvasWidth = canvasRefs.current[paneIndex]?.getBoundingClientRect().width ?? 0;
    const measuredWidth = chartBoundsRefs.current[paneIndex]?.chartArea.width ?? 0;

    if (measuredWidth > 0) return measuredWidth;
    if (canvasWidth > 0) return Math.max(160, canvasWidth - (canvasWidth < 520 ? 74 : 100));
    return 980;
  };

  const createResetViewRange = (paneIndex: number, sourceCandles: Candle[], nextTimeframe: string) => {
    const chartWidth = getEstimatedChartWidth(paneIndex);
    const futureBars = getRightOffsetBars(chartWidth);
    const candlesPerView = getDefaultCandlesPerView(nextTimeframe, sourceCandles.length, chartWidth);
    const endIndex = sourceCandles.length + futureBars;

    return normalizeViewRange(endIndex - candlesPerView, candlesPerView, sourceCandles.length, futureBars);
  };

  const updatePaneState = (paneIndex: number, updater: (pane: ChartPaneState) => ChartPaneState) => {
    setChartPanes((current) => current.map((pane, index) => (index === paneIndex ? updater(pane) : pane)));
  };

  const resetView = (paneIndex = activePaneIndex) => {
    updatePaneState(paneIndex, (pane) => ({
      ...pane,
      manualPriceRange: null,
      viewRange: createResetViewRange(paneIndex, pane.candles, pane.timeframe),
    }));
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
    setSettingsTarget((current) => (current?.indicatorId === indicatorId ? null : current));
    setMoreTarget((current) => (current?.indicatorId === indicatorId ? null : current));
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
    setMoreTarget(null);
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
    setMoreTarget(null);
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (!controlRackRef.current?.contains(target)) {
        setOpenMenu(null);
        setHeaderPanel(null);
      }

      if (!indicatorLegendRef.current?.contains(target)) {
        setSettingsTarget(null);
        setMoreTarget(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        setHeaderPanel(null);
        setQuickSearchQuery('');
        setSnapshotStatus('');
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
    const paneRequests = paneStatesRef.current.map((pane, index) => ({
      index,
      symbol: pane.symbol,
      timeframe: pane.timeframe,
    }));
    const controllers: AbortController[] = [];

    paneRequests.forEach((request) => {
      const controller = new AbortController();
      controllers.push(controller);

      updatePaneState(request.index, (pane) =>
        pane.symbol === request.symbol && pane.timeframe === request.timeframe
          ? {
              ...pane,
              loading: true,
              error: null,
              feedStatus: pane.feedStatus === 'offline' ? 'connecting' : pane.feedStatus,
            }
          : pane
      );

      const fetchData = async () => {
        try {
          const response = await fetch(
            `/api/binance?symbol=${request.symbol}&interval=${request.timeframe}&limit=1000`,
            { signal: controller.signal }
          );
          const payload = await response.json();

          if (!response.ok) {
            throw new Error(payload?.error || `Market data request failed with ${response.status}.`);
          }

          const formattedCandles = parseCandles(payload);
          setChartPanes((current) =>
            current.map((pane, index) =>
              index === request.index && pane.symbol === request.symbol && pane.timeframe === request.timeframe
                ? {
                    ...pane,
                    candles: formattedCandles,
                    loading: false,
                    error: null,
                    manualPriceRange: null,
                    viewRange: createResetViewRange(request.index, formattedCandles, request.timeframe),
                  }
                : pane
            )
          );
        } catch (fetchError) {
          if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;

          setChartPanes((current) =>
            current.map((pane, index) =>
              index === request.index && pane.symbol === request.symbol && pane.timeframe === request.timeframe
                ? {
                    ...pane,
                    candles: [],
                    loading: false,
                    error: fetchError instanceof Error ? fetchError.message : 'Failed to fetch market data.',
                  }
                : pane
            )
          );
        }
      };

      void fetchData();
    });

    return () => {
      controllers.forEach((controller) => controller.abort());
    };
  }, [paneMarketRequestKey]);

  useEffect(() => {
    let isActive = true;
    const ws = new WebSocket('wss://stream.binance.com:9443/ws');
    socketRef.current = ws;

    const sendStreamRequest = (method: 'SUBSCRIBE' | 'UNSUBSCRIBE', streams: string[]) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      if (streams.length === 0) return;

      ws.send(
        JSON.stringify({
          method,
          params: streams,
          id: Date.now(),
        })
      );
    };

    ws.onopen = () => {
      if (!isActive) return;

      const streams = Array.from(
        new Set(paneStatesRef.current.map((pane) => getStreamKey(pane.symbol, pane.timeframe)))
      );
      activeStreamsRef.current = new Set(streams);
      sendStreamRequest('SUBSCRIBE', streams);
      setChartPanes((current) => current.map((pane) => ({ ...pane, feedStatus: 'live' })));
    };
    ws.onerror = () => {
      if (isActive) {
        setChartPanes((current) => current.map((pane) => ({ ...pane, feedStatus: 'offline' })));
      }
    };
    ws.onclose = () => {
      if (isActive) {
        setChartPanes((current) => current.map((pane) => ({ ...pane, feedStatus: 'offline' })));
      }
    };

    ws.onmessage = (event) => {
      if (!isActive) return;

      const data = JSON.parse(event.data);
      if (data.result !== undefined || !data.k) return;

      const eventSymbol = String(data.s);
      const eventTimeframe = String(data.k.i);

      const newCandle: Candle = {
        time: Number(data.k.t),
        open: Number(data.k.o),
        high: Number(data.k.h),
        low: Number(data.k.l),
        close: Number(data.k.c),
        volume: Number(data.k.v),
      };

      if (Object.values(newCandle).some((value) => !Number.isFinite(value))) return;

      setChartPanes((previous) =>
        previous.map((pane) => {
          if (pane.symbol !== eventSymbol || pane.timeframe !== eventTimeframe) return pane;

          const updated = [...pane.candles];
          const lastCandle = updated[updated.length - 1];
          const currentRange = pane.viewRange;
          const wasPinnedToLatest = currentRange.endIndex >= pane.candles.length;
          const futureBars = Math.max(0, currentRange.endIndex - pane.candles.length);
          let nextViewRange = currentRange;

          if (lastCandle && lastCandle.time === newCandle.time) {
            updated[updated.length - 1] = newCandle;
          } else if (!lastCandle || newCandle.time > lastCandle.time) {
            updated.push(newCandle);

            if (wasPinnedToLatest) {
              const nextStartIndex = clamp(
                updated.length + futureBars - currentRange.candlesPerView,
                0,
                getMaxStartIndex(updated.length, currentRange.candlesPerView)
              );

              nextViewRange = {
                ...currentRange,
                startIndex: nextStartIndex,
                endIndex: nextStartIndex + currentRange.candlesPerView,
              };
            }
          }

          return {
            ...pane,
            candles: updated,
            viewRange: nextViewRange,
          };
        })
      );
    };

    return () => {
      isActive = false;
      activeStreamsRef.current = new Set();
      ws.close();
    };
  }, []);

  useEffect(() => {
    const ws = socketRef.current;
    const nextStreams = new Set(paneStatesRef.current.map((pane) => getStreamKey(pane.symbol, pane.timeframe)));

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setChartPanes((current) =>
        current.map((pane) => (pane.feedStatus === 'offline' ? pane : { ...pane, feedStatus: 'connecting' }))
      );
      return;
    }

    const currentStreams = activeStreamsRef.current;
    const streamsToUnsubscribe = Array.from(currentStreams).filter((stream) => !nextStreams.has(stream));
    const streamsToSubscribe = Array.from(nextStreams).filter((stream) => !currentStreams.has(stream));

    if (streamsToUnsubscribe.length > 0) {
      ws.send(
        JSON.stringify({
          method: 'UNSUBSCRIBE',
          params: streamsToUnsubscribe,
          id: Date.now(),
        })
      );
    }

    if (streamsToSubscribe.length > 0) {
      ws.send(
        JSON.stringify({
          method: 'SUBSCRIBE',
          params: streamsToSubscribe,
          id: Date.now(),
        })
      );
    }

    activeStreamsRef.current = nextStreams;
    setChartPanes((current) => current.map((pane) => ({ ...pane, feedStatus: 'live' })));
  }, [paneMarketRequestKey]);

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

    if (activeTimeframe.includes('d') || activeTimeframe.includes('w') || activeTimeframe.includes('M')) {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    if (activeTimeframe.includes('h')) {
      return date.toLocaleString(undefined, { day: 'numeric', hour: '2-digit' });
    }

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPointerArea = (paneIndex: number, x: number, y: number): ChartPointerArea => {
    const { chartArea } = chartBoundsRefs.current[paneIndex] ?? createDefaultChartBounds();
    const right = chartArea.left + chartArea.width;
    const bottom = chartArea.top + chartArea.height;

    if (chartArea.width <= 0 || chartArea.height <= 0) return 'outside';

    if (x >= right && y >= chartArea.top && y <= bottom) return 'price-scale';
    if (x >= chartArea.left && x <= right && y >= chartArea.top && y <= bottom) return 'plot';
    if (x >= chartArea.left && x <= right && y > bottom) return 'time-scale';

    return 'outside';
  };

  const getCurrentPriceRange = (paneIndex: number): PriceRange | null => {
    const pane = paneStatesRef.current[paneIndex];
    const manual = pane?.manualPriceRange ?? null;
    if (manual && manual.maxPrice > manual.minPrice) return manual;

    const { minPrice, maxPrice } = chartBoundsRefs.current[paneIndex] ?? createDefaultChartBounds();
    if (Number.isFinite(minPrice) && Number.isFinite(maxPrice) && maxPrice > minPrice) {
      return { minPrice, maxPrice };
    }

    return null;
  };

  const getPriceAtY = (paneIndex: number, y: number, range: PriceRange) => {
    const { chartArea } = chartBoundsRefs.current[paneIndex] ?? createDefaultChartBounds();
    const localY = clamp(y - chartArea.top, 0, Math.max(1, chartArea.height));
    return range.maxPrice - (localY / Math.max(1, chartArea.height)) * (range.maxPrice - range.minPrice);
  };

  const handleWheel = (paneIndex: number, event: React.WheelEvent<HTMLCanvasElement>) => {
    const pane = paneStatesRef.current[paneIndex];
    setActivePaneIndex(paneIndex);
    if (!pane?.candles.length) return;
    event.preventDefault();

    const rect = event.currentTarget.getBoundingClientRect();
    const { chartArea } = chartBoundsRefs.current[paneIndex] ?? createDefaultChartBounds();
    const chartWidth = chartArea.width || getEstimatedChartWidth(paneIndex);
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const area = getPointerArea(paneIndex, x, y);
    const wheelScale = Math.exp(clamp(event.deltaY / 100, -3, 3) * 0.16);

    if (area === 'price-scale') {
      const currentPriceRange = getCurrentPriceRange(paneIndex);
      if (!currentPriceRange) return;

      const anchorPrice = getPriceAtY(paneIndex, y, currentPriceRange);
      updatePaneState(paneIndex, (currentPane) => ({
        ...currentPane,
        manualPriceRange: scalePriceRange(currentPriceRange, anchorPrice, wheelScale),
      }));
      return;
    }

    if (area !== 'plot' && area !== 'time-scale') return;

    const visibleBars = Math.max(1, pane.viewRange.endIndex - pane.viewRange.startIndex);
    const candleWidth = chartWidth / visibleBars;

    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      const panPixels = event.shiftKey && Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      const panBars = panPixels / Math.max(1, candleWidth);

      if (panBars !== 0) {
        updatePaneState(paneIndex, (currentPane) => ({
          ...currentPane,
          viewRange: normalizeViewRange(currentPane.viewRange.startIndex + panBars, visibleBars, currentPane.candles.length),
        }));
      }
      return;
    }

    const newCandlesPerView = Math.round(
      clamp(visibleBars * wheelScale, MIN_VISIBLE_BARS, Math.min(MAX_VISIBLE_BARS, pane.candles.length + MAX_FUTURE_BARS))
    );
    const mouseRatio = clamp((event.clientX - rect.left - chartArea.left) / chartWidth, 0, 1);
    const pointerIndex = pane.viewRange.startIndex + mouseRatio * pane.viewRange.candlesPerView;
    const newStartIndex = pointerIndex - newCandlesPerView * mouseRatio;

    updatePaneState(paneIndex, (currentPane) => ({
      ...currentPane,
      viewRange: normalizeViewRange(newStartIndex, newCandlesPerView, currentPane.candles.length),
    }));
  };

  const handleMouseDown = (paneIndex: number, event: React.MouseEvent<HTMLCanvasElement>) => {
    const pane = paneStatesRef.current[paneIndex];
    setActivePaneIndex(paneIndex);
    if (!pane?.candles.length) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const area = getPointerArea(paneIndex, x, y);

    if (area === 'outside') return;

    const currentPriceRange = getCurrentPriceRange(paneIndex);
    const mode: ChartDragMode = area === 'price-scale' ? 'price-scale' : 'chart-pan';

    if (mode === 'price-scale' && !currentPriceRange) return;
    if (mode === 'price-scale' && currentPriceRange) {
      updatePaneState(paneIndex, (currentPane) => ({ ...currentPane, manualPriceRange: currentPriceRange }));
    }

    dragStateRef.current = {
      mode,
      paneIndex,
      startX: event.clientX,
      startY: event.clientY,
      startViewRange: pane.viewRange,
      startPriceRange: mode === 'price-scale' || pane.manualPriceRange ? currentPriceRange : null,
      anchorPrice: currentPriceRange ? getPriceAtY(paneIndex, y, currentPriceRange) : 0,
    };
    updatePaneState(paneIndex, (currentPane) => ({ ...currentPane, dragMode: mode }));
    event.preventDefault();
  };

  const handleMouseUp = () => {
    const paneIndex = dragStateRef.current.paneIndex;
    dragStateRef.current = {
      ...dragStateRef.current,
      mode: 'none',
    };
    updatePaneState(paneIndex, (pane) => ({ ...pane, dragMode: 'none' }));
  };

  const handleMouseMove = (paneIndex: number, event: React.MouseEvent<HTMLCanvasElement>) => {
    const pane = paneStatesRef.current[paneIndex];
    if (!pane) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const area = getPointerArea(paneIndex, x, y);
    updatePaneState(paneIndex, (currentPane) => ({ ...currentPane, pointerArea: area }));

    const dragState = dragStateRef.current;
    if (dragState.mode !== 'none' && dragState.paneIndex === paneIndex && pane.candles.length) {
      const { chartArea } = chartBoundsRefs.current[paneIndex] ?? createDefaultChartBounds();
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;

      if (dragState.mode === 'price-scale' && dragState.startPriceRange) {
        const startPriceRange = dragState.startPriceRange;
        const scaleFactor = Math.exp((deltaY / Math.max(1, chartArea.height)) * Y_AXIS_SCALE_SPEED);
        updatePaneState(paneIndex, (currentPane) => ({
          ...currentPane,
          manualPriceRange: scalePriceRange(startPriceRange, dragState.anchorPrice, scaleFactor),
        }));
      } else if (dragState.mode === 'chart-pan') {
        const { startViewRange } = dragState;
        const candleWidth = chartArea.width / Math.max(1, startViewRange.candlesPerView);
        const candlesDelta = deltaX / Math.max(1, candleWidth);
        const maxStartIndex = getMaxStartIndex(pane.candles.length, startViewRange.candlesPerView);
        const newStartIndex = clamp(startViewRange.startIndex - candlesDelta, 0, maxStartIndex);

        updatePaneState(paneIndex, (currentPane) => ({
          ...currentPane,
          viewRange: {
            ...startViewRange,
            startIndex: newStartIndex,
            endIndex: newStartIndex + startViewRange.candlesPerView,
          },
        }));

        if (dragState.startPriceRange && pane.manualPriceRange) {
          const startPriceRange = dragState.startPriceRange;
          const priceRange = startPriceRange.maxPrice - startPriceRange.minPrice;
          const priceDelta = (deltaY / Math.max(1, chartArea.height)) * priceRange;

          updatePaneState(paneIndex, (currentPane) => ({
            ...currentPane,
            manualPriceRange: {
              minPrice: startPriceRange.minPrice + priceDelta,
              maxPrice: startPriceRange.maxPrice + priceDelta,
            },
          }));
        }
      }
    }

    const currentPriceRange = getCurrentPriceRange(paneIndex);
    if (currentPriceRange) {
      updatePaneState(paneIndex, (currentPane) => ({
        ...currentPane,
        mousePos: { x, y, dataY: getPriceAtY(paneIndex, y, currentPriceRange) },
      }));
    } else {
      updatePaneState(paneIndex, (currentPane) => ({ ...currentPane, mousePos: { x, y, dataY: 0 } }));
    }
  };

  const handleMouseLeave = (paneIndex: number) => {
    updatePaneState(paneIndex, (pane) => ({ ...pane, mousePos: null, pointerArea: 'outside' }));
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

  const drawChart = (
    canvas: HTMLCanvasElement,
    paneIndex: number,
    {
      updateInteractionBounds = false,
      crosshairPosition = null,
    }: { updateInteractionBounds?: boolean; crosshairPosition?: MousePosition | null } = {}
  ) => {
    const pane = paneStatesRef.current[paneIndex];
    if (!pane) return;

    const { candles, viewRange, manualPriceRange, timeframe, symbol } = pane;
    const latestCandle = candles.length > 0 ? candles[candles.length - 1] : null;
    const activeIndicatorSeries = paneIndicatorSeries[paneIndex] ?? {};
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

    const compactChart = rect.width < 520;
    const narrowChart = rect.width < 620;
    const axisFontSize = compactChart ? 12 : 13;
    const indicatorPaneFontSize = compactChart ? 10.4 : 11.2;
    const rightAxisWidth = compactChart ? 72 : 92;
    const bottomAxisHeight = compactChart ? 31 : 38;
    const topPlotInset = 0;
    const oscillatorCount = visibleOscillatorIndicators.length;
    const requestedVolumeHeight = showVolume ? clamp(rect.height * 0.15, 46, 96) : 0;
    const minMainChartHeight = rect.width < 520 ? 176 : 220;
    const availableAuxHeight = Math.max(
      0,
      rect.height - bottomAxisHeight - topPlotInset - minMainChartHeight
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
      left: compactChart ? 8 : 12,
      top: topPlotInset,
      width: Math.max(80, rect.width - rightAxisWidth - (compactChart ? 10 : 18)),
      height: Math.max(
        120,
        rect.height -
          bottomAxisHeight -
          topPlotInset -
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

    if (updateInteractionBounds) {
      chartBoundsRefs.current[paneIndex] = {
        minPrice: minPaddedPrice,
        maxPrice: maxPaddedPrice,
        chartArea,
      };
    }

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
    const timeTicks = createTimelineTicks(viewRange, candles, timeframe, chartArea.width, narrowChart)
      .map((tick) => ({
        ...tick,
        x: xForIndex(tick.index),
      }))
      .filter((tick) => tick.x >= chartArea.left && tick.x <= chartArea.left + chartArea.width);

    ctx.save();
    ctx.beginPath();
    ctx.rect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
    ctx.clip();

    ctx.font = `${axisFontSize}px var(--font-geist-sans), ui-sans-serif, sans-serif`;
    ctx.lineWidth = 1;

    if (chartSettings.showGridLines) {
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

    if (chartSettings.showCurrentPriceLine && currentPriceInside) {
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
      ctx.font = `${indicatorPaneFontSize}px var(--font-geist-sans), ui-sans-serif, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(
        `Vol ${formatCompact(latestCandle!.volume)}`,
        volumeArea.left + 2,
        volumeArea.top + indicatorPaneFontSize + 5
      );
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
      if (chartSettings.showGridLines) {
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
      }

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
      ctx.font = `${indicatorPaneFontSize}px var(--font-geist-mono), ui-monospace, monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(
        getIndicatorLegendName(pane.indicator, symbol),
        pane.left + 2,
        pane.top + indicatorPaneFontSize + 5
      );

      ctx.textAlign = 'right';
      ctx.fillText(formatIndicatorNumber(rawMax), rect.width - 8, pane.top + indicatorPaneFontSize + 5);
      ctx.fillText(formatIndicatorNumber(rawMin), rect.width - 8, pane.top + pane.height - 7);

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

    if (chartSettings.showCurrentPriceLine && currentPriceInside) {
      const countdown = formatCountdown(timeframe, latestCandle!.time);
      const markerHeight = countdown ? 38 : 30;
      const markerY = clamp(
        currentPriceY - markerHeight / 2,
        chartArea.top,
        chartArea.top + chartArea.height - markerHeight
      );

      ctx.fillStyle = currentPriceColor;
      ctx.fillRect(chartArea.left + chartArea.width + 1, markerY, rightAxisWidth - 6, markerHeight);
      ctx.fillStyle = '#ffffff';
      ctx.font = `${axisFontSize}px var(--font-geist-mono), ui-monospace, monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(formatPrice(latestCandle!.close), chartArea.left + chartArea.width + 7, markerY + 18);

      if (countdown) {
        ctx.globalAlpha = 0.84;
        ctx.font = `${Math.max(10, axisFontSize - 1)}px var(--font-geist-mono), ui-monospace, monospace`;
        ctx.fillText(countdown, chartArea.left + chartArea.width + 7, markerY + 33);
        ctx.globalAlpha = 1;
      }
    }

    ctx.font = `${axisFontSize}px var(--font-geist-mono), ui-monospace, monospace`;
    ctx.textAlign = 'right';
    ctx.fillStyle = palette.text;
    for (const price of priceTickInfo.ticks) {
      const y = priceToY(price);
      if (y < chartArea.top + 8 || y > chartArea.top + chartArea.height - 8) continue;
      ctx.fillText(formatPrice(price), rect.width - 8, y + 5);
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

    const crosshairInside =
      chartSettings.showCrosshair &&
      crosshairPosition &&
      crosshairPosition.x >= chartArea.left &&
      crosshairPosition.x <= chartArea.left + chartArea.width &&
      crosshairPosition.y >= chartArea.top &&
      crosshairPosition.y <= chartArea.top + chartArea.height;

    if (crosshairInside && crosshairPosition) {
      const crosshairRatio = clamp((crosshairPosition.x - chartArea.left) / chartArea.width, 0, 1);
      const crosshairLogicalIndex = Math.floor(viewRange.startIndex + crosshairRatio * viewRange.candlesPerView);

      ctx.strokeStyle = palette.crosshair;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(crosshairPosition.x, chartArea.top);
      ctx.lineTo(crosshairPosition.x, chartArea.top + chartArea.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(chartArea.left, crosshairPosition.y);
      ctx.lineTo(chartArea.left + chartArea.width, crosshairPosition.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const priceLabel = formatPrice(crosshairPosition.dataY);
      ctx.fillStyle = palette.axisBg;
      ctx.fillRect(chartArea.left + chartArea.width + 1, crosshairPosition.y - 11, rightAxisWidth - 6, 22);
      ctx.fillStyle = palette.textBright;
      ctx.font = `${axisFontSize}px var(--font-geist-mono), ui-monospace, monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(priceLabel, chartArea.left + chartArea.width + 7, crosshairPosition.y + 5);

      const timeLabel = formatTime(timeForIndex(crosshairLogicalIndex), true);
      const timeLabelWidth = ctx.measureText(timeLabel).width + 18;
      const labelX = clamp(
        crosshairPosition.x - timeLabelWidth / 2,
        chartArea.left,
        chartArea.left + chartArea.width - timeLabelWidth
      );
      ctx.fillStyle = palette.axisBg;
      ctx.fillRect(labelX, chartArea.top + chartArea.height + 2, timeLabelWidth, 22);
      ctx.fillStyle = palette.textBright;
      ctx.textAlign = 'center';
      ctx.fillText(timeLabel, labelX + timeLabelWidth / 2, chartArea.top + chartArea.height + 17);
    }

  };

  useEffect(() => {
    const animate = () => {
      canvasRefs.current.forEach((canvas, paneIndex) => {
        if (canvas) {
          const pane = paneStatesRef.current[paneIndex];
          drawChart(canvas, paneIndex, {
            updateInteractionBounds: true,
            crosshairPosition: pane?.mousePos ?? null,
          });
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    chartPanes,
    chartStyle,
    activeIndicators,
    paneIndicatorSeries,
    showVolume,
    theme,
    chartSettings,
    paneCount,
  ]);

  const getCanvasCursor = (pane: ChartPaneState) =>
    pane.dragMode === 'price-scale'
      ? 'ns-resize'
      : pane.dragMode === 'chart-pan'
        ? 'grabbing'
        : pane.pointerArea === 'price-scale'
          ? 'ns-resize'
          : pane.pointerArea === 'time-scale'
            ? 'ew-resize'
            : 'crosshair';
  const getPaneLegendSnapshot = (paneIndex: number) => {
    const pane = chartPanes[paneIndex];
    if (!pane || pane.candles.length === 0) {
      return {
        pane,
        legendIndex: -1,
        legendCandle: null,
        legendChange: 0,
        legendChangePercent: 0,
        legendTone: 'positive' as const,
      };
    }

    const latestCandle = pane.candles[pane.candles.length - 1] ?? null;
    const { chartArea } = chartBoundsRefs.current[paneIndex] ?? createDefaultChartBounds();
    const mousePos = pane.mousePos;
    const mouseInsideMainPane =
      mousePos &&
      mousePos.x >= chartArea.left &&
      mousePos.x <= chartArea.left + chartArea.width &&
      mousePos.y >= chartArea.top &&
      mousePos.y <= chartArea.top + chartArea.height;
    const legendIndex = mouseInsideMainPane
      ? Math.floor(
          clamp(
            pane.viewRange.startIndex +
              (clamp((mousePos.x - chartArea.left) / Math.max(1, chartArea.width), 0, 1) *
                pane.viewRange.candlesPerView),
            0,
            pane.candles.length - 1
          )
        )
      : pane.candles.length - 1;
    const legendCandle = legendIndex >= 0 ? pane.candles[legendIndex] ?? latestCandle : latestCandle;
    const legendChange = legendCandle ? legendCandle.close - legendCandle.open : 0;
    const legendChangePercent =
      legendCandle && legendCandle.open !== 0 ? (legendChange / legendCandle.open) * 100 : 0;

    return {
      pane,
      legendIndex,
      legendCandle,
      legendChange,
      legendChangePercent,
      legendTone: legendChange >= 0 ? ('positive' as const) : ('negative' as const),
    };
  };
  const closeHeaderOverlays = () => {
    setOpenMenu(null);
    setHeaderPanel(null);
    setQuickSearchQuery('');
    setSymbolSearchQuery(activeSymbol);
    setSnapshotStatus('');
    setLayoutSaveStatus('');
    setLayoutSaveTargetId(null);
    setSettingsTarget(null);
    setMoreTarget(null);
  };
  const openSymbolSearch = () => {
    setOpenMenu(null);
    setSettingsTarget(null);
    setMoreTarget(null);
    setSnapshotStatus('');
    setSymbolSearchQuery(activeSymbol);
    setSymbolSearchCategory('all');
    setHeaderPanel('symbolSearch');
  };
  const selectSymbolSearchOption = (nextSymbol: string) => {
    setChartPanes((current) =>
      current.map((pane, index) =>
        layoutSync.symbol || index === activePaneIndex
          ? {
              ...pane,
              symbol: nextSymbol,
              loading: true,
              error: null,
              mousePos: null,
              manualPriceRange: null,
            }
          : pane
      )
    );
    setSymbolSearchQuery(nextSymbol);
    setOpenMenu(null);
    setHeaderPanel(null);
    setQuickSearchQuery('');
    setSnapshotStatus('');
    setSettingsTarget(null);
    setMoreTarget(null);
  };
  const updateActiveTimeframe = (nextTimeframe: string) => {
    setChartPanes((current) =>
      current.map((pane, index) =>
        layoutSync.interval || index === activePaneIndex
          ? {
              ...pane,
              timeframe: nextTimeframe,
              loading: true,
              error: null,
              mousePos: null,
              manualPriceRange: null,
            }
          : pane
      )
    );
  };
  const toggleHeaderPanel = (panel: HeaderPanelKey) => {
    setOpenMenu(null);
    setSettingsTarget(null);
    setMoreTarget(null);
    setSnapshotStatus('');
    setHeaderPanel((current) => (current === panel ? null : panel));
  };
  const openQuickSearch = () => {
    setSettingsTarget(null);
    setMoreTarget(null);
    setOpenMenu(null);
    setHeaderPanel('quickSearch');
  };
  const persistSavedChartLayouts = (layouts: SavedChartLayout[]) => {
    const nextLayouts = layouts.slice(0, MAX_SAVED_CHART_LAYOUTS);
    setSavedChartLayouts(nextLayouts);
    window.localStorage.setItem(CHART_LAYOUT_STORAGE_KEY, JSON.stringify(nextLayouts));
  };
  const copyIndicatorsForSnapshot = (indicators: ActiveIndicator[]) =>
    indicators.map((indicator) => ({
      ...indicator,
      settings: { ...indicator.settings },
    }));
  const buildSavedChartLayout = (name: string, existingLayout?: SavedChartLayout): SavedChartLayout => {
    const now = Date.now();
    const visiblePaneSnapshots = chartPanes.slice(0, paneCount).map(createSavedPaneSnapshot);

    return {
      id: existingLayout?.id ?? `layout-${now}`,
      name,
      createdAt: existingLayout?.createdAt ?? now,
      updatedAt: now,
      selectedLayoutId: selectedLayout.id,
      activePaneIndex: clamp(activePaneIndex, 0, Math.max(0, paneCount - 1)),
      chartStyle,
      theme,
      layoutSync: { ...layoutSync },
      chartSettings: { ...chartSettings },
      indicators: copyIndicatorsForSnapshot(activeIndicators),
      panes: visiblePaneSnapshots.length > 0 ? visiblePaneSnapshots : [createSavedPaneSnapshot(activePane)],
    };
  };
  const openSaveLayoutDialog = (nameOverride?: string, targetLayoutId = activeSavedLayoutId) => {
    setOpenMenu(null);
    setSettingsTarget(null);
    setMoreTarget(null);
    setSnapshotStatus('');
    setLayoutSaveStatus('');
    setLayoutSaveTargetId(targetLayoutId);
    setLayoutName(
      nameOverride ?? activeSavedLayout?.name ?? `Chart layout ${Math.min(savedChartLayouts.length + 1, 99)}`
    );
    setHeaderPanel('save');
  };
  const confirmChartLayoutSave = () => {
    const trimmedName = layoutName.trim();
    const name = trimmedName.length > 0 ? trimmedName : `Chart layout ${savedChartLayouts.length + 1}`;
    const existingLayout = layoutSaveTargetId
      ? savedChartLayouts.find((layout) => layout.id === layoutSaveTargetId)
      : undefined;
    const nextLayout = buildSavedChartLayout(name, existingLayout);
    const otherLayouts = savedChartLayouts.filter((layout) => layout.id !== nextLayout.id);

    persistSavedChartLayouts([nextLayout, ...otherLayouts]);
    setActiveSavedLayoutId(nextLayout.id);
    setLayoutName(name);
    closeHeaderOverlays();
  };
  const copyCurrentChartLayout = () => {
    const sourceName = activeSavedLayout?.name ?? (layoutName.trim() || `Chart layout ${savedChartLayouts.length + 1}`);
    const nextLayout = buildSavedChartLayout(`${sourceName} copy`);

    persistSavedChartLayouts([nextLayout, ...savedChartLayouts]);
    setActiveSavedLayoutId(nextLayout.id);
    setLayoutName(nextLayout.name);
    setLayoutSaveStatus('Saved copy');
  };
  const applySavedChartLayout = (layout: SavedChartLayout) => {
    const layoutOption = getLayoutOptionById(layout.selectedLayoutId);
    const paneSnapshots = layout.panes.length > 0 ? layout.panes : [createSavedPaneSnapshot(createChartPaneState())];
    const restoreNonce = Date.now();
    const restoredPanes = Array.from({ length: layoutOption.cells.length }, (_unused, index) =>
      createChartPaneStateFromSnapshot(paneSnapshots[index] ?? paneSnapshots[0], restoreNonce)
    );

    setSelectedLayoutId(layoutOption.id);
    setLayoutSync({ ...DEFAULT_LAYOUT_SYNC, ...layout.layoutSync });
    setChartStyle(layout.chartStyle);
    setTheme(layout.theme);
    setChartSettings({ ...DEFAULT_CHART_SETTINGS, ...layout.chartSettings });
    setActiveIndicators(
      copyIndicatorsForSnapshot(layout.indicators).map((indicator, index) => ({
        ...indicator,
        id: `${indicator.definitionId}-${Date.now()}-${index}`,
      }))
    );
    setChartPanes(restoredPanes);
    setActivePaneIndex(clamp(layout.activePaneIndex, 0, Math.max(0, layoutOption.cells.length - 1)));
    setActiveSavedLayoutId(layout.id);
    setLayoutName(layout.name);
    closeHeaderOverlays();
  };
  const removeSavedChartLayout = (layoutId: string) => {
    persistSavedChartLayouts(savedChartLayouts.filter((layout) => layout.id !== layoutId));
    setActiveSavedLayoutId((current) => (current === layoutId ? null : current));
  };
  const formatSavedLayoutMetadata = (layout: SavedChartLayout) => {
    const layoutOption = getLayoutOptionById(layout.selectedLayoutId);
    const updatedAt = Number.isFinite(layout.updatedAt) ? layout.updatedAt : layout.createdAt;
    const savedAt = new Date(updatedAt).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${layoutOption.count} ${layoutOption.count === 1 ? 'chart' : 'charts'} - ${savedAt}`;
  };
  useEffect(() => {
    if (!layoutAutosave || !activeSavedLayoutId) return;

    const handle = window.setTimeout(() => {
      setSavedChartLayouts((current) => {
        const existingLayout = current.find((layout) => layout.id === activeSavedLayoutId);
        if (!existingLayout) return current;

        const nextLayout = buildSavedChartLayout(existingLayout.name, existingLayout);
        const nextLayouts = [nextLayout, ...current.filter((layout) => layout.id !== nextLayout.id)].slice(
          0,
          MAX_SAVED_CHART_LAYOUTS
        );

        window.localStorage.setItem(CHART_LAYOUT_STORAGE_KEY, JSON.stringify(nextLayouts));
        return nextLayouts;
      });
    }, 600);

    return () => window.clearTimeout(handle);
  }, [
    activeIndicators,
    activePaneIndex,
    activeSavedLayoutId,
    chartPanes,
    chartSettings,
    chartStyle,
    layoutAutosave,
    layoutSync,
    paneCount,
    selectedLayoutId,
    theme,
  ]);
  const persistIndicatorTemplates = (templates: IndicatorTemplate[]) => {
    setIndicatorTemplates(templates);
    window.localStorage.setItem(INDICATOR_TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
  };
  const saveIndicatorTemplate = () => {
    const trimmedName = templateName.trim();
    const name = trimmedName.length > 0 ? trimmedName : `Template ${indicatorTemplates.length + 1}`;
    const nextTemplate: IndicatorTemplate = {
      id: `template-${Date.now()}`,
      name,
      createdAt: Date.now(),
      indicators: activeIndicators.map((indicator) => ({
        ...indicator,
        settings: { ...indicator.settings },
      })),
    };

    persistIndicatorTemplates([nextTemplate, ...indicatorTemplates].slice(0, 8));
    setTemplateName(`Template ${indicatorTemplates.length + 2}`);
  };
  const confirmIndicatorTemplateSave = () => {
    saveIndicatorTemplate();
    closeHeaderOverlays();
  };
  const applyIndicatorTemplate = (template: IndicatorTemplate) => {
    setActiveIndicators(
      template.indicators.map((indicator, index) => ({
        ...indicator,
        id: `${indicator.definitionId}-${Date.now()}-${index}`,
        settings: { ...indicator.settings },
      }))
    );
    closeHeaderOverlays();
  };
  const removeIndicatorTemplate = (templateId: string) => {
    persistIndicatorTemplates(indicatorTemplates.filter((template) => template.id !== templateId));
  };
  const updateLayoutSync = (key: LayoutSyncKey, checked: boolean) => {
    setLayoutSync((current) => ({ ...current, [key]: checked }));
  };
  const updateChartSetting = (key: keyof ChartSettingsState, checked: boolean) => {
    setChartSettings((current) => ({ ...current, [key]: checked }));
  };
  const openToolbarMenu = (menuKey: MenuKey) => {
    setHeaderPanel(null);
    setSettingsTarget(null);
    setMoreTarget(null);
    setOpenMenu(menuKey);
    focusMenuItem(menuKey, 0);
  };
  const toggleFullscreen = () => {
    closeHeaderOverlays();

    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }

    void document.documentElement.requestFullscreen?.();
  };
  const downloadChartSnapshot = () => {
    closeHeaderOverlays();

    const canvas = canvasRefs.current[activePaneIndex];
    if (!canvas) return;

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `procharting-${activeSymbol.toLowerCase()}-${activeTimeframe}.png`;
    link.click();
  };
  const copySnapshotLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setSnapshotStatus('Link copied');
    } catch {
      setSnapshotStatus('Copy failed');
    }
  };
  const copySnapshotImage = () => {
    const canvas = canvasRefs.current[activePaneIndex];
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob || !navigator.clipboard || !window.ClipboardItem) {
        setSnapshotStatus('Copy failed');
        return;
      }

      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setSnapshotStatus('Image copied');
      } catch {
        setSnapshotStatus('Copy failed');
      }
    }, 'image/png');
  };
  const openSnapshotInNewTab = () => {
    const canvas = canvasRefs.current[activePaneIndex];
    if (!canvas) return;

    window.open(canvas.toDataURL('image/png'), '_blank', 'noopener,noreferrer');
    setSnapshotStatus('Opened in new tab');
  };
  const executeQuickAction = (actionId: QuickActionId) => {
    setQuickSearchQuery('');

    if (actionId === 'symbol') {
      openSymbolSearch();
      return;
    }

    if (actionId === 'timeframe') {
      openToolbarMenu('timeframe');
      return;
    }

    if (actionId === 'chartStyle') {
      openToolbarMenu('chartStyle');
      return;
    }

    if (actionId === 'indicators') {
      openToolbarMenu('indicators');
      return;
    }

    if (actionId === 'save') {
      openSaveLayoutDialog();
      return;
    }

    if (
      actionId === 'templates' ||
      actionId === 'layout' ||
      actionId === 'settings' ||
      actionId === 'snapshot' ||
      actionId === 'alert' ||
      actionId === 'replay' ||
      actionId === 'trade' ||
      actionId === 'publish'
    ) {
      setOpenMenu(null);
      setHeaderPanel(actionId);
      return;
    }

    if (actionId === 'fullscreen') {
      toggleFullscreen();
      return;
    }

    resetView();
    closeHeaderOverlays();
  };
  const renderInstrumentLegend = (paneIndex: number) => {
    const { pane, legendCandle, legendChange, legendChangePercent, legendTone } = getPaneLegendSnapshot(paneIndex);

    return chartSettings.showStatusLine && pane && legendCandle ? (
        <div
          className="instrument-legend-overlay"
          aria-label={`${formatSymbol(pane.symbol)} ${pane.timeframe.toUpperCase()} OHLC legend pane ${paneIndex + 1}`}
        >
          <span className="instrument-legend-symbol">
            {formatSymbol(pane.symbol)} {pane.timeframe.toUpperCase()}
          </span>
          <span className="instrument-legend-field">
            <span>O</span>
            {formatPrice(legendCandle.open)}
          </span>
          <span className="instrument-legend-field">
            <span>H</span>
            {formatPrice(legendCandle.high)}
          </span>
          <span className="instrument-legend-field">
            <span>L</span>
            {formatPrice(legendCandle.low)}
          </span>
          <span className="instrument-legend-field">
            <span>C</span>
            {formatPrice(legendCandle.close)}
          </span>
          <span className={`instrument-legend-change ${legendTone}`}>
            {legendChange >= 0 ? '+' : ''}
            {formatPrice(legendChange)} ({legendChangePercent >= 0 ? '+' : ''}
            {legendChangePercent.toFixed(2)}%)
          </span>
        </div>
      ) : null;
  };
  const renderIndicatorLegend = (paneIndex: number, attachRef: boolean) => {
    const { pane, legendIndex, legendCandle } = getPaneLegendSnapshot(paneIndex);
    const activeIndicatorSeries = paneIndicatorSeries[paneIndex] ?? {};

    return chartSettings.showIndicatorLegend && activeIndicators.length > 0 && pane && legendCandle ? (
      <div
        ref={attachRef ? indicatorLegendRef : undefined}
        className="indicator-legend-overlay"
        aria-label={`Active indicators pane ${paneIndex + 1}`}
      >
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
              key={`${paneIndex}-${indicator.id}`}
              className="indicator-legend-row"
              data-visible={indicator.visible}
              data-settings-open={settingsTarget?.indicatorId === indicator.id && settingsTarget.paneIndex === paneIndex}
              data-more-open={moreTarget?.indicatorId === indicator.id && moreTarget.paneIndex === paneIndex}
            >
              <div className="indicator-legend-main">
                <span className="indicator-legend-title">{getIndicatorLegendName(indicator, pane.symbol)}</span>
                {indicatorValues.map((item) => (
                  <span key={`${paneIndex}-${indicator.id}-${item.label}`} className="indicator-legend-value" style={{ color: item.color }}>
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
                      setSettingsTarget((current) =>
                        current?.indicatorId === indicator.id && current.paneIndex === paneIndex
                          ? null
                          : { indicatorId: indicator.id, paneIndex }
                      );
                      setMoreTarget(null);
                    }}
                  >
                    <span className="legend-action-glyph settings" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path d="M10.4 3h3.2l.6 2.4c.5.2 1 .4 1.4.8l2.4-.8 1.6 2.8-1.8 1.7c.1.5.2 1.1.2 1.6s-.1 1.1-.2 1.6l1.8 1.7-1.6 2.8-2.4-.8c-.4.3-.9.6-1.4.8l-.6 2.4h-3.2l-.6-2.4c-.5-.2-1-.4-1.4-.8l-2.4.8-1.6-2.8 1.8-1.7c-.1-.5-.2-1.1-.2-1.6s.1-1.1.2-1.6L4.4 8.2 6 5.4l2.4.8c.4-.3.9-.6 1.4-.8L10.4 3Z" />
                        <circle cx="12" cy="11.5" r="2.6" />
                      </svg>
                    </span>
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
                      setMoreTarget((current) =>
                        current?.indicatorId === indicator.id && current.paneIndex === paneIndex
                          ? null
                          : { indicatorId: indicator.id, paneIndex }
                      );
                      setSettingsTarget(null);
                    }}
                  >
                    <span className="legend-action-glyph more" aria-hidden="true" />
                  </button>
                </span>
              </div>

              {settingsTarget?.indicatorId === indicator.id && settingsTarget.paneIndex === paneIndex && (
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

              {moreTarget?.indicatorId === indicator.id && moreTarget.paneIndex === paneIndex && (
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
    ) : null;
  };
  const retryPane = (paneIndex: number) => {
    updatePaneState(paneIndex, (pane) => ({ ...pane, refreshNonce: pane.refreshNonce + 1 }));
  };
  const renderPaneOverlays = (paneIndex: number, attachLegendRef: boolean) => {
    const pane = chartPanes[paneIndex];
    if (!pane) return null;

    return (
      <>
        {renderInstrumentLegend(paneIndex)}
        {renderIndicatorLegend(paneIndex, attachLegendRef)}

        {pane.loading && (
          <div className="chart-overlay">
            <div className="loading-panel">
              <span className="loading-line" />
              <span className="loading-line short" />
              <span className="state-copy">Loading market data</span>
            </div>
          </div>
        )}

        {!pane.loading && pane.error && (
          <div className="chart-overlay">
            <div className="state-panel">
              <strong>Market data unavailable</strong>
              <span>{pane.error}</span>
              <button type="button" onClick={() => retryPane(paneIndex)}>
                Retry
              </button>
            </div>
          </div>
        )}

        {!pane.loading && !pane.error && pane.candles.length === 0 && (
          <div className="chart-overlay">
            <div className="state-panel">
              <strong>No candles returned</strong>
              <span>Try another symbol or timeframe.</span>
            </div>
          </div>
        )}
      </>
    );
  };
  const featureDialog =
    headerPanel === 'alert' || headerPanel === 'replay'
      ? FEATURE_DIALOGS[headerPanel]
      : null;

  return (
    <main className="chart-terminal" data-theme={theme}>
      <header className="chart-topbar" aria-label="Chart command bar">
        <div ref={controlRackRef} className="top-command-bar" aria-label="Chart controls">
          <div className="toolbar-dropdown symbol-dropdown">
            <button
              type="button"
              className="toolbar-trigger symbol-search-trigger"
              aria-label="Symbol search"
              aria-haspopup="dialog"
              aria-expanded={headerPanel === 'symbolSearch'}
              onClick={openSymbolSearch}
            >
              <span className="symbol-badge" style={{ background: selectedSymbolOption.color }} aria-hidden="true">
                {selectedSymbolOption.base.slice(0, 1)}
              </span>
              <span className="symbol-trigger-copy">
                <span className="trigger-label">{activeSymbol}</span>
                <small>{selectedSymbolOption.exchange}</small>
              </span>
              <span className="symbol-data-switch" aria-hidden="true">
                <HeaderIcon name="caret" />
              </span>
            </button>
          </div>
          <span className={`feed-dot ${activeFeedStatus}`} aria-label={`Feed ${activeFeedStatus}`} role="status" />

          <span className="command-divider" aria-hidden="true" />

          <ToolbarDropdown
            menuKey="timeframe"
            label="Timeframe"
            className="timeframe-dropdown"
            options={TIMEFRAME_OPTIONS}
            value={activeTimeframe}
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            onChange={updateActiveTimeframe}
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

          <div className="header-tool-wrapper desktop-header-command">
            <button
              type="button"
              className="tool-toggle icon-tool"
              aria-label="Indicator templates"
              title="Indicator templates"
              data-active={headerPanel === 'templates' || headerPanel === 'templateSave' || headerPanel === 'templateOpen'}
              onClick={() => toggleHeaderPanel('templates')}
            >
              <HeaderIcon name="templates" />
            </button>
            {headerPanel === 'templates' && (
              <div className="header-panel templates-panel" role="menu" aria-label="Indicator templates">
                <strong>Indicator templates</strong>
                <button type="button" className="header-menu-row" role="menuitem" onClick={() => setHeaderPanel('templateSave')}>
                  Save indicator template...
                </button>
                <button type="button" className="header-menu-row" role="menuitem" onClick={() => setHeaderPanel('templateOpen')}>
                  Open template...
                </button>
              </div>
            )}
            {headerPanel === 'templateOpen' && (
              <div className="header-panel templates-panel" role="menu" aria-label="Open indicator template">
                <strong>Open template...</strong>
                {indicatorTemplates.length === 0 ? (
                  <span className="header-panel-empty">No saved templates</span>
                ) : (
                  indicatorTemplates.map((template) => (
                    <div key={template.id} className="template-menu-row">
                      <button type="button" role="menuitem" onClick={() => applyIndicatorTemplate(template)}>
                        <strong>{template.name}</strong>
                        <small>{new Date(template.createdAt).toLocaleDateString()}</small>
                      </button>
                      <button
                        type="button"
                        className="template-remove"
                        aria-label={`Remove ${template.name}`}
                        onClick={() => removeIndicatorTemplate(template.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            className="tool-toggle tv-command-with-text desktop-header-command"
            aria-label="Create alert"
            title="Create alert"
            data-active={headerPanel === 'alert'}
            onClick={() => toggleHeaderPanel('alert')}
          >
            <HeaderIcon name="alert" />
            <span>Alert</span>
          </button>
          <button
            type="button"
            className="tool-toggle tv-command-with-text desktop-header-command"
            aria-label="Bar replay"
            title="Bar replay"
            data-active={headerPanel === 'replay'}
            onClick={() => toggleHeaderPanel('replay')}
          >
            <HeaderIcon name="replay" />
            <span>Replay</span>
          </button>
          <button
            type="button"
            className="tool-toggle icon-tool desktop-header-command"
            aria-label="Undo"
            title="Undo"
            disabled
          >
            <HeaderIcon name="undo" />
          </button>
          <button
            type="button"
            className="tool-toggle icon-tool desktop-header-command"
            aria-label="Redo"
            title="Redo"
            disabled
          >
            <HeaderIcon name="redo" />
          </button>

          <span className="header-spacer" aria-hidden="true" />

          <div className="header-right-cluster" aria-label="TradingView desktop header controls">
            <div className="header-tool-wrapper">
              <button
                type="button"
                className="tool-toggle icon-tool"
                aria-label="Layout setup"
                title="Layout setup"
                data-active={headerPanel === 'layout'}
                onClick={() => toggleHeaderPanel('layout')}
              >
                <HeaderIcon name="layout" />
              </button>
              {headerPanel === 'layout' && (
                <div className="header-panel layout-panel" role="menu" aria-label="Layout setup">
                  <div className="layout-matrix" aria-label="Layout variants">
                    {LAYOUT_GROUPS.map((group) => (
                      <div key={group.count} className="layout-option-row">
                        <span className="layout-option-count">{group.count}</span>
                        <div className="layout-option-list">
                          {group.options.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              className="layout-option-button"
                              role="menuitemradio"
                              aria-label={option.label}
                              aria-checked={selectedLayoutId === option.id}
                              data-active={selectedLayoutId === option.id}
                              onClick={() => {
                                setSelectedLayoutId(option.id);
                                setHeaderPanel(null);
                              }}
                            >
                              <LayoutOptionIcon option={option} />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <span className="header-panel-label layout-sync-heading">SYNC IN LAYOUT</span>
                  {Object.entries(LAYOUT_SYNC_LABELS).map(([key, label]) => (
                    <label key={key} className="layout-sync-row">
                      <span className="layout-sync-name">
                        {label}
                        <span className="layout-sync-info" aria-hidden="true">
                          i
                        </span>
                      </span>
                      <input
                        className="layout-sync-input"
                        type="checkbox"
                        checked={layoutSync[key as LayoutSyncKey]}
                        onChange={(event) => updateLayoutSync(key as LayoutSyncKey, event.target.checked)}
                      />
                      <span className="layout-sync-switch" aria-hidden="true" />
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              className="tool-toggle tv-save-button"
              aria-label="Save all charts for all symbols and intervals on your layout"
              title="Save all charts for all symbols and intervals on your layout"
              data-active={headerPanel === 'save'}
              onClick={() => openSaveLayoutDialog()}
            >
              <span>Save</span>
            </button>
            <div className="header-tool-wrapper">
              <button
                type="button"
                className="tool-toggle tv-save-menu-button"
                aria-label="Manage layouts"
                title="Manage layouts"
                data-active={headerPanel === 'manageLayouts'}
                onClick={() => toggleHeaderPanel('manageLayouts')}
              >
                <HeaderIcon name="caret" />
              </button>
              {headerPanel === 'manageLayouts' && (
                <div className="header-panel manage-layouts-panel" role="menu" aria-label="Manage layouts">
                  <strong>Manage layouts</strong>
                  <button type="button" className="header-menu-row stacked" role="menuitem" onClick={() => openSaveLayoutDialog()}>
                    <span>Save all charts...</span>
                    <small>{activeSavedLayout ? activeSavedLayout.name : 'Create a saved layout snapshot'}</small>
                  </button>
                  <button
                    type="button"
                    className="header-menu-row stacked"
                    role="menuitem"
                    onClick={() => openSaveLayoutDialog(`Chart layout ${savedChartLayouts.length + 1}`, null)}
                  >
                    <span>Create new layout...</span>
                    <small>Save current panes as a separate layout</small>
                  </button>
                  <button type="button" className="header-menu-row" role="menuitem" onClick={copyCurrentChartLayout}>
                    <span>Make a copy...</span>
                    <small>Duplicate current setup</small>
                  </button>
                  <button type="button" className="header-menu-row" role="menuitem" onClick={() => openSaveLayoutDialog()}>
                    Rename...
                  </button>
                  <button
                    type="button"
                    className="header-menu-row"
                    role="menuitemcheckbox"
                    aria-checked={layoutAutosave}
                    onClick={() => setLayoutAutosave((current) => !current)}
                  >
                    <span>Auto-save</span>
                    <small>{layoutAutosave ? 'On' : 'Off'}</small>
                  </button>
                  {layoutSaveStatus && <span className="header-panel-status">{layoutSaveStatus}</span>}
                  <span className="header-panel-label saved-layouts-heading">RECENTLY USED</span>
                  {savedChartLayouts.length === 0 ? (
                    <span className="header-panel-empty">No saved layouts</span>
                  ) : (
                    savedChartLayouts.map((layout) => (
                      <div key={layout.id} className="template-menu-row saved-layout-row" data-active={layout.id === activeSavedLayoutId}>
                        <button type="button" role="menuitem" onClick={() => applySavedChartLayout(layout)}>
                          <strong>{layout.name}</strong>
                          <small>{formatSavedLayoutMetadata(layout)}</small>
                        </button>
                        <button
                          type="button"
                          className="template-remove"
                          aria-label={`Remove ${layout.name}`}
                          onClick={() => removeSavedChartLayout(layout.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              className="tool-toggle icon-tool"
              aria-label="Quick search"
              title="Quick search"
              data-active={headerPanel === 'quickSearch'}
              onClick={openQuickSearch}
            >
              <HeaderIcon name="search" />
            </button>
            <button
              type="button"
              className="tool-toggle icon-tool"
              aria-label="Settings"
              title="Settings"
              data-active={headerPanel === 'settings'}
              onClick={() => toggleHeaderPanel('settings')}
            >
              <HeaderIcon name="settings" />
            </button>
            <button
              type="button"
              className="tool-toggle icon-tool"
              aria-label="Fullscreen mode"
              title="Fullscreen mode"
              onClick={toggleFullscreen}
            >
              <HeaderIcon name="fullscreen" />
            </button>
            <div className="header-tool-wrapper">
              <button
                type="button"
                className="tool-toggle icon-tool"
                aria-label="Take a snapshot"
                title="Take a snapshot"
                data-active={headerPanel === 'snapshot'}
                onClick={() => toggleHeaderPanel('snapshot')}
              >
                <HeaderIcon name="snapshot" />
              </button>
              {headerPanel === 'snapshot' && (
                <div className="header-panel snapshot-panel" role="menu" aria-label="Chart snapshot">
                  <strong>Chart snapshot</strong>
                  <button type="button" className="header-menu-row" role="menuitem" onClick={downloadChartSnapshot}>
                    <span>Download image</span>
                    <small>⌥ ⌘ S</small>
                  </button>
                  <button type="button" className="header-menu-row" role="menuitem" onClick={copySnapshotImage}>
                    <span>Copy image</span>
                    <small>⇧ ⌘ S</small>
                  </button>
                  <button type="button" className="header-menu-row" role="menuitem" onClick={() => void copySnapshotLink()}>
                    <span>Copy link</span>
                    <small>⌥ S</small>
                  </button>
                  <button type="button" className="header-menu-row" role="menuitem" onClick={openSnapshotInNewTab}>
                    Open in new tab
                  </button>
                  <button type="button" className="header-menu-row" role="menuitem" onClick={() => void copySnapshotLink()}>
                    Tweet image
                  </button>
                  {snapshotStatus && <span className="header-panel-status">{snapshotStatus}</span>}
                </div>
              )}
            </div>
            <button
              type="button"
              className="tool-toggle tv-trade-button"
              aria-label="Trade"
              title="Trade"
              data-active={headerPanel === 'trade'}
              onClick={() => toggleHeaderPanel('trade')}
            >
              <span>Trade</span>
            </button>
            <div className="header-tool-wrapper">
              <button
                type="button"
                className="tool-toggle tv-publish-button"
                aria-label="Share your idea with the trade community"
                title="Share your idea with the trade community"
                data-active={headerPanel === 'publish'}
                onClick={() => toggleHeaderPanel('publish')}
              >
                <span>Publish</span>
              </button>
              {headerPanel === 'publish' && (
                <div className="header-panel publish-panel" role="menu" aria-label="Share your idea with the trade community">
                  {PUBLISH_OPTIONS.map((option) => (
                    <button key={option.label} type="button" className="header-menu-row stacked" role="menuitem" onClick={closeHeaderOverlays}>
                      <span>{option.label}</span>
                      <small>{option.description}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {headerPanel === 'templateSave' && (
            <div className="header-modal-backdrop" onMouseDown={closeHeaderOverlays}>
              <div
                className="header-modal template-save-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Save indicator template"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="header-modal-title">
                  <strong>Save indicator template</strong>
                  <button type="button" aria-label="Close menu" onClick={closeHeaderOverlays}>
                    ×
                  </button>
                </div>
                <div className="template-save-body">
                  <label className="header-panel-field">
                    <span>Template name</span>
                    <input autoFocus value={templateName} onChange={(event) => setTemplateName(event.target.value)} />
                  </label>
                </div>
                <div className="settings-footer">
                  <button type="button" onClick={() => setHeaderPanel('templates')}>
                    Cancel
                  </button>
                  <button type="button" className="settings-ok" onClick={confirmIndicatorTemplateSave}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
          {headerPanel === 'save' && (
            <div className="header-modal-backdrop" onMouseDown={closeHeaderOverlays}>
              <div
                className="header-modal template-save-dialog layout-save-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Save chart layout"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="header-modal-title">
                  <strong>Save chart layout</strong>
                  <button type="button" aria-label="Close menu" onClick={closeHeaderOverlays}>
                    ×
                  </button>
                </div>
                <div className="template-save-body layout-save-body">
                  <label className="header-panel-field">
                    <span>Layout name</span>
                    <input autoFocus value={layoutName} onChange={(event) => setLayoutName(event.target.value)} />
                  </label>
                  <div className="layout-save-summary" aria-label="Saved layout contents">
                    <span>
                      <strong>{selectedLayout.label}</strong>
                      <small>{paneCount} chart panes</small>
                    </span>
                    <span>
                      <strong>{activeIndicators.length}</strong>
                      <small>Indicators</small>
                    </span>
                    <span>
                      <strong>{activeSymbol}</strong>
                      <small>{activeTimeframe.toUpperCase()} active pane</small>
                    </span>
                  </div>
                  <span className="header-panel-status">
                    Saves symbols, intervals, layout grid, indicators, settings, and current view ranges.
                  </span>
                </div>
                <div className="settings-footer">
                  <button type="button" onClick={closeHeaderOverlays}>
                    Cancel
                  </button>
                  <button type="button" className="settings-ok" onClick={confirmChartLayoutSave}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}
          {featureDialog && (
            <div className="header-modal-backdrop" onMouseDown={closeHeaderOverlays}>
              <div
                className="header-modal feature-dialog"
                role="dialog"
                aria-modal="true"
                aria-label={featureDialog.eyebrow}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="header-modal-title">
                  <strong>{featureDialog.eyebrow}</strong>
                  <button type="button" aria-label="Close menu" onClick={closeHeaderOverlays}>
                    ×
                  </button>
                </div>
                <div className="feature-dialog-body">
                  <strong>{featureDialog.title}</strong>
                  <span>{featureDialog.body}</span>
                  <div className="feature-dialog-actions">
                    <button type="button" className="settings-ok" onClick={closeHeaderOverlays}>
                      Join for free
                    </button>
                    <button type="button" onClick={closeHeaderOverlays}>
                      Learn more
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {headerPanel === 'trade' && (
            <div className="header-modal-backdrop" onMouseDown={closeHeaderOverlays}>
              <div
                className="header-modal broker-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Trade with your broker"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="header-modal-title">
                  <strong>Trade with your broker</strong>
                  <button type="button" aria-label="Close menu" onClick={closeHeaderOverlays}>
                    ×
                  </button>
                </div>
                <div className="broker-dialog-body">
                  <div className="broker-tabs" role="tablist" aria-label="Broker categories">
                    <button type="button" role="tab" aria-selected="true" data-active="true">
                      Featured
                    </button>
                    <button type="button" role="tab" aria-selected="false">
                      Crypto
                    </button>
                    <button type="button" role="tab" aria-selected="false">
                      Futures
                    </button>
                  </div>
                  <div className="broker-grid" role="list" aria-label="Featured brokers">
                    {BROKER_OPTIONS.map((broker) => (
                      <button
                        key={broker}
                        type="button"
                        role="listitem"
                        data-active={selectedBroker === broker}
                        onClick={() => setSelectedBroker(broker)}
                      >
                        <strong>{broker}</strong>
                        <small>{broker === 'Paper Trading' ? 'Simulated account' : 'Broker connection'}</small>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="settings-footer">
                  <span className="selected-broker-status">{selectedBroker}</span>
                  <button type="button" className="settings-ok" onClick={closeHeaderOverlays}>
                    Connect
                  </button>
                </div>
              </div>
            </div>
          )}
          {headerPanel === 'symbolSearch' && (
            <div className="header-modal-backdrop" onMouseDown={closeHeaderOverlays}>
              <div
                className="header-modal symbol-search-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Symbol search"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="header-modal-title">
                  <strong>Symbol search</strong>
                  <button type="button" aria-label="Close menu" onClick={closeHeaderOverlays}>
                    ×
                  </button>
                </div>
                <label className="symbol-search-input">
                  <HeaderIcon name="search" />
                  <input
                    ref={symbolSearchInputRef}
                    autoFocus
                    type="text"
                    aria-label="Search symbols"
                    value={symbolSearchQuery}
                    onChange={(event) => setSymbolSearchQuery(event.target.value.toUpperCase())}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        closeHeaderOverlays();
                        return;
                      }

                      if (event.key === 'Enter' && filteredSymbolOptions[0]) {
                        event.preventDefault();
                        selectSymbolSearchOption(filteredSymbolOptions[0].symbol);
                      }
                    }}
                  />
                  {symbolSearchQuery.length > 0 && (
                    <button
                      type="button"
                      className="symbol-search-clear"
                      aria-label="Clear symbol search"
                      onClick={() => setSymbolSearchQuery('')}
                    >
                      ×
                    </button>
                  )}
                </label>
                <div className="symbol-search-tabs" role="tablist" aria-label="Symbol categories">
                  {SYMBOL_SEARCH_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={symbolSearchCategory === tab.id}
                      data-active={symbolSearchCategory === tab.id}
                      onClick={() => setSymbolSearchCategory(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="symbol-search-results" role="listbox" aria-label="Symbol search results">
                  {filteredSymbolOptions.map((option) => {
                    const active = option.symbol === activeSymbol;

                    return (
                      <button
                        key={option.symbol}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className="symbol-search-result"
                        data-active={active}
                        onClick={() => selectSymbolSearchOption(option.symbol)}
                      >
                        <span className="symbol-result-badge" style={{ background: option.color }} aria-hidden="true">
                          {option.base.slice(0, 1)}
                        </span>
                        <span className="symbol-result-main">
                          <strong>{option.symbol}</strong>
                          <span>{option.name}</span>
                        </span>
                        <span className="symbol-result-tags" aria-label={option.tags.join(' ')}>
                          {option.tags.slice(0, 3).map((tag) => (
                            <small key={tag}>{tag}</small>
                          ))}
                        </span>
                        <span className="symbol-result-exchange">
                          {option.exchange}
                          <span className="exchange-mark" aria-hidden="true">
                            {option.exchange.slice(0, 1)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                  {filteredSymbolOptions.length === 0 && (
                    <span className="header-panel-empty symbol-search-empty">No symbols found</span>
                  )}
                </div>
              </div>
            </div>
          )}
          {headerPanel === 'quickSearch' && (
            <div className="header-modal-backdrop" onMouseDown={closeHeaderOverlays}>
              <div
                className="header-modal quick-search-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Search tool or function"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="header-modal-title">
                  <strong>Search tool or function</strong>
                  <button type="button" aria-label="Close menu" onClick={closeHeaderOverlays}>
                    ×
                  </button>
                </div>
                <label className="quick-search-input">
                  <HeaderIcon name="search" />
                  <input
                    autoFocus
                    type="search"
                    placeholder="Type to search for drawings, functions and settings"
                    value={quickSearchQuery}
                    onChange={(event) => setQuickSearchQuery(event.target.value)}
                  />
                </label>
                <div className="quick-action-list" role="menu" aria-label="Search results">
                  {filteredQuickActions.map((action) => (
                    <button key={action.id} type="button" role="menuitem" onClick={() => executeQuickAction(action.id)}>
                      <strong>{action.label}</strong>
                      <small>{action.description}</small>
                    </button>
                  ))}
                  {filteredQuickActions.length === 0 && <span className="header-panel-empty">No matching tools</span>}
                </div>
              </div>
            </div>
          )}
          {headerPanel === 'settings' && (
            <div className="header-modal-backdrop" onMouseDown={closeHeaderOverlays}>
              <div
                className="header-modal settings-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Settings"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="header-modal-title">
                  <strong>Settings</strong>
                  <button type="button" aria-label="Close menu" onClick={closeHeaderOverlays}>
                    ×
                  </button>
                </div>
                <div className="settings-body">
                  <div className="settings-tabs" role="tablist" aria-label="Settings sections">
                    {SETTINGS_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={settingsTab === tab.id}
                        data-active={settingsTab === tab.id}
                        onClick={() => setSettingsTab(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="settings-content">
                    {settingsTab === 'symbol' && (
                      <>
                        <strong>Symbol</strong>
                        <span className="settings-current-symbol">{formatSymbol(activeSymbol)}</span>
                        <div className="settings-segmented" aria-label="Chart type">
                          {CHART_STYLE_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              data-active={chartStyle === option.value}
                              onClick={() => setChartStyle(option.value)}
                            >
                              {option.shortLabel || option.label}
                            </button>
                          ))}
                        </div>
                        <div className="settings-static-list" aria-label="Symbol visual settings">
                          <span className="setting-row static-setting">
                            <span>Color bars based on previous close</span>
                            <small>On</small>
                          </span>
                          <span className="setting-row static-setting">
                            <span>Body</span>
                            <small>Up / Down</small>
                          </span>
                          <span className="setting-row static-setting">
                            <span>Borders</span>
                            <small>Visible</small>
                          </span>
                          <span className="setting-row static-setting">
                            <span>Wick</span>
                            <small>Visible</small>
                          </span>
                          <span className="setting-row static-setting">
                            <span>Data modification</span>
                            <small>Off</small>
                          </span>
                          <span className="setting-row static-setting">
                            <span>Precision</span>
                            <small>Default</small>
                          </span>
                          <span className="setting-row static-setting">
                            <span>Timezone</span>
                            <small>UTC</small>
                          </span>
                          <span className="setting-row static-setting">
                            <span>Template</span>
                            <small>Default</small>
                          </span>
                        </div>
                      </>
                    )}
                    {settingsTab === 'status' && (
                      <>
                        <strong>Status line</strong>
                        <label className="setting-row">
                          <input
                            type="checkbox"
                            checked={chartSettings.showStatusLine}
                            onChange={(event) => updateChartSetting('showStatusLine', event.target.checked)}
                          />
                          <span>OHLC values</span>
                        </label>
                        <label className="setting-row">
                          <input
                            type="checkbox"
                            checked={chartSettings.showIndicatorLegend}
                            onChange={(event) => updateChartSetting('showIndicatorLegend', event.target.checked)}
                          />
                          <span>Indicator values</span>
                        </label>
                      </>
                    )}
                    {settingsTab === 'scales' && (
                      <>
                        <strong>Scales and lines</strong>
                        <label className="setting-row">
                          <input
                            type="checkbox"
                            checked={chartSettings.showGridLines}
                            onChange={(event) => updateChartSetting('showGridLines', event.target.checked)}
                          />
                          <span>Grid lines</span>
                        </label>
                        <label className="setting-row">
                          <input
                            type="checkbox"
                            checked={chartSettings.showCurrentPriceLine}
                            onChange={(event) => updateChartSetting('showCurrentPriceLine', event.target.checked)}
                          />
                          <span>Current price line</span>
                        </label>
                        <label className="setting-row">
                          <input
                            type="checkbox"
                            checked={chartSettings.showCrosshair}
                            onChange={(event) => updateChartSetting('showCrosshair', event.target.checked)}
                          />
                          <span>Crosshair labels</span>
                        </label>
                      </>
                    )}
                    {settingsTab === 'canvas' && (
                      <>
                        <strong>Canvas</strong>
                        <div className="settings-segmented" aria-label="Theme">
                          <button type="button" data-active={theme === 'dark'} onClick={() => setTheme('dark')}>
                            Dark
                          </button>
                          <button type="button" data-active={theme === 'light'} onClick={() => setTheme('light')}>
                            Light
                          </button>
                        </div>
                      </>
                    )}
                    {settingsTab === 'trading' && (
                      <>
                        <strong>Trading</strong>
                        <label className="setting-row">
                          <input
                            type="checkbox"
                            checked={chartSettings.showVolumePane}
                            onChange={(event) => updateChartSetting('showVolumePane', event.target.checked)}
                          />
                          <span>Volume pane</span>
                        </label>
                      </>
                    )}
                    {settingsTab === 'alerts' && (
                      <>
                        <strong>Alerts</strong>
                        <span className="settings-current-symbol">Feed {activeFeedStatus}</span>
                      </>
                    )}
                    {settingsTab === 'events' && (
                      <>
                        <strong>Events</strong>
                        <span className="settings-current-symbol">BTC/USDT spot</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="settings-footer">
                  <button type="button" onClick={closeHeaderOverlays}>
                    Cancel
                  </button>
                  <button type="button" className="settings-ok" onClick={closeHeaderOverlays}>
                    Ok
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <section className="chart-stage" data-layout-count={selectedLayout.count} data-layout-id={selectedLayout.id}>
        <div
          className="chart-layout-grid"
          style={{
            gridTemplateColumns: selectedLayout.templateColumns,
            gridTemplateRows: selectedLayout.templateRows,
          }}
        >
          {selectedLayoutCells.map((cellSpec, paneIndex) => {
            const pane = chartPanes[paneIndex] ?? activePane;

            return (
              <ChartPane
                key={`${selectedLayout.id}-${paneIndex + 1}`}
                cell={cellSpec}
                paneIndex={paneIndex}
                active={activePaneIndex === paneIndex}
                onActivate={() => setActivePaneIndex(paneIndex)}
                canvasRef={(node) => {
                  canvasRefs.current[paneIndex] = node;
                }}
                canvasProps={{
                  'aria-label': `${formatSymbol(pane.symbol)} ${pane.timeframe} chart pane ${paneIndex + 1}`,
                  'data-active-pane': activePaneIndex === paneIndex ? 'true' : 'false',
                  'data-drag-mode': pane.dragMode,
                  'data-manual-price-scale': pane.manualPriceRange ? 'true' : 'false',
                  'data-pointer-area': pane.pointerArea,
                  'data-price-max': pane.manualPriceRange ? pane.manualPriceRange.maxPrice.toFixed(2) : '',
                  'data-price-min': pane.manualPriceRange ? pane.manualPriceRange.minPrice.toFixed(2) : '',
                  'data-view-end': pane.viewRange.endIndex.toFixed(2),
                  'data-view-start': pane.viewRange.startIndex.toFixed(2),
                  style: { cursor: getCanvasCursor(pane) },
                  onMouseMove: (event) => handleMouseMove(paneIndex, event),
                  onMouseDown: (event) => handleMouseDown(paneIndex, event),
                  onMouseUp: handleMouseUp,
                  onMouseLeave: () => handleMouseLeave(paneIndex),
                  onWheel: (event) => handleWheel(paneIndex, event),
                }}
              >
                {renderPaneOverlays(paneIndex, activePaneIndex === paneIndex)}
              </ChartPane>
            );
          })}
        </div>
      </section>
    </main>
  );
}
