'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CanvasHTMLAttributes,
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import {
  Bell,
  Bookmark,
  Check,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  Lock,
  MoreHorizontal,
  Pencil,
  Settings,
  Trash2,
  Type,
  Unlock,
  X,
} from 'lucide-react';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const createSupabaseBrowserClient = (): SupabaseClient | null => {
  if (typeof window === 'undefined' || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
};

const getOrCreateUserTrackingDeviceId = (): string => {
  const existingDeviceId = window.localStorage.getItem(USER_TRACKING_DEVICE_STORAGE_KEY);
  if (existingDeviceId) {
    return existingDeviceId;
  }

  const nextDeviceId =
    typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(USER_TRACKING_DEVICE_STORAGE_KEY, nextDeviceId);
  return nextDeviceId;
};

const getUserTrackingBrowserContext = () => ({
  devicePixelRatio: window.devicePixelRatio,
  language: navigator.language,
  languages: Array.from(navigator.languages ?? []).slice(0, 5),
  platform: navigator.platform,
  screen: {
    colorDepth: window.screen.colorDepth,
    height: window.screen.height,
    width: window.screen.width,
  },
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

const sendUserTrackingEvent = async (session: Session | null, eventType: UserTrackingEventType): Promise<void> => {
  if (!session?.access_token || typeof window === 'undefined') {
    return;
  }

  try {
    await fetch('/api/user-tracking', {
      body: JSON.stringify({
        browserContext: getUserTrackingBrowserContext(),
        deviceId: getOrCreateUserTrackingDeviceId(),
        eventType,
      }),
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  } catch {
    // Tracking should never block account actions or chart rendering.
  }
};

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
  logicalIndex: number;
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
type ChartTouchGestureMode = 'none' | 'pan' | 'pinch';
type CursorToolId = 'cross' | 'dot' | 'arrow' | 'demonstration' | 'magic' | 'eraser';
type DrawingToolId =
  | 'trend-line'
  | 'ray'
  | 'info-line'
  | 'extended-line'
  | 'trend-angle'
  | 'horizontal-line'
  | 'horizontal-ray'
  | 'vertical-line'
  | 'cross-line'
  | 'parallel-channel'
  | 'regression-trend'
  | 'flat-top-bottom'
  | 'disjoint-channel'
  | 'fib-retracement'
  | 'fib-extension'
  | 'fib-channel'
  | 'fib-time-zone'
  | 'fib-speed-fan'
  | 'fib-trend-time'
  | 'fib-circles'
  | 'fib-spiral'
  | 'fib-arcs'
  | 'fib-wedge'
  | 'xabcd-pattern'
  | 'cypher-pattern'
  | 'head-and-shoulders'
  | 'abcd-pattern'
  | 'triangle-pattern'
  | 'three-drives-pattern'
  | 'elliott-impulse-wave'
  | 'elliott-correction-wave'
  | 'elliott-triangle-wave'
  | 'elliott-double-combo-wave'
  | 'elliott-triple-combo-wave'
  | 'cyclic-lines'
  | 'time-cycles'
  | 'sine-line';
type DrawingMenuId = 'cursor' | 'line-tools' | 'fib-tools' | 'pattern-tools';
type DrawingLineStyle = 'solid' | 'dashed' | 'dotted';
type DrawingExtendMode = 'none' | 'left' | 'right' | 'both';
type DrawingVisibilityMode = 'all' | 'intraday' | 'daily-plus';
type DrawingToolbarMenuId = 'templates' | 'color' | 'text' | 'width' | 'style' | 'settings' | 'alert' | 'more';
type DrawingSettingsTab = 'style' | 'text' | 'coordinates' | 'visibility';
type DrawingArrowEnd = 'none' | 'arrow';
type DrawingTextAlignment = 'left' | 'center' | 'right';
type DrawingTextVerticalAlignment = 'top' | 'middle' | 'bottom';
type DrawingStatsPosition = 'above' | 'below' | 'right';
type DrawingStatsSelectValue =
  | 'hidden'
  | 'priceRange'
  | 'percentChange'
  | 'change'
  | 'barsRange'
  | 'dateTimeRange'
  | 'distance'
  | 'angle'
  | 'all';
type DrawingAlertCondition = 'crossing' | 'crossing-up' | 'crossing-down' | 'greater-than' | 'less-than';
type DrawingAlertFrequency = 'only-once' | 'once-per-bar' | 'once-per-bar-close';
type DrawingDragMode = 'none' | 'body' | 'start' | 'end' | 'third' | 'fourth' | 'fifth' | 'sixth' | 'seventh';
type DrawingHitTarget = Exclude<DrawingDragMode, 'none'>;
type DrawingHoverTarget = DrawingHitTarget | null;
type IndicatorPaneKind = 'price' | 'volume' | 'oscillator';
type IndicatorSource = 'open' | 'high' | 'low' | 'close' | 'hl2' | 'hlc3' | 'ohlc4';
type IndicatorMaType = 'EMA' | 'SMA';
type AuthMode = 'login' | 'signup';
type AuthOAuthProvider = 'google' | 'github';
type UserTrackingEventType = 'session_seen' | 'sign_in' | 'sign_up' | 'token_refreshed' | 'sign_out';
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

interface ChartTouchPoint {
  x: number;
  y: number;
}

interface ChartTouchGestureState {
  mode: ChartTouchGestureMode;
  paneIndex: number;
  startX: number;
  startViewRange: ViewRange;
  startDistance: number;
  startMidX: number;
}

interface ChartCanvasArea {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface DrawingRenderedSegment {
  start: { x: number; y: number };
  end: { x: number; y: number };
  muted?: boolean;
}

interface ChartInteractionBounds {
  minPrice: number;
  maxPrice: number;
  chartArea: ChartCanvasArea;
  crosshairAreas: ChartCanvasArea[];
  timeScaleArea: ChartCanvasArea;
}

interface ChartDrawingAnchor {
  logicalIndex: number;
  price: number;
}

interface DrawingFibLevel {
  value: number;
  enabled: boolean;
  color: string;
}

interface ChartDrawing {
  id: string;
  kind: DrawingToolId;
  paneIndex: number;
  anchors: ChartDrawingAnchor[];
  locked: boolean;
  visible: boolean;
  color: string;
  opacity: number;
  lineWidth: number;
  lineStyle: DrawingLineStyle;
  extend: DrawingExtendMode;
  leftEnd: DrawingArrowEnd;
  rightEnd: DrawingArrowEnd;
  text: string;
  showText: boolean;
  textColor: string;
  textSize: number;
  textBold: boolean;
  textItalic: boolean;
  textAlignment: DrawingTextAlignment;
  textVerticalAlignment: DrawingTextVerticalAlignment;
  showMiddlePoint: boolean;
  showPriceLabels: boolean;
  fibLevels: DrawingFibLevel[];
  fibShowLevelLabels: boolean;
  fibShowPriceLabels: boolean;
  fibBackground: boolean;
  fibReverse: boolean;
  stats: DrawingStatsState;
  timeframeVisibility: Record<string, boolean>;
  alertEnabled: boolean;
  alertCondition: DrawingAlertCondition;
  alertFrequency: DrawingAlertFrequency;
  alertMessage: string;
  visibility: DrawingVisibilityMode;
  syncInLayout: boolean;
  syncGlobally: boolean;
  createdAt: number;
  updatedAt: number;
}

interface PendingDrawing {
  tool: DrawingToolId;
  paneIndex: number;
  anchors: ChartDrawingAnchor[];
  preview: ChartDrawingAnchor;
}

interface DrawingDragState {
  mode: DrawingDragMode;
  paneIndex: number;
  drawingId: string | null;
  startX: number;
  startY: number;
  startAnchors: ChartDrawingAnchor[];
}

interface DrawingHitResult {
  drawing: ChartDrawing;
  target: DrawingHitTarget;
}

interface DrawingToolbarPosition {
  paneIndex: number;
  left: number;
  top: number;
}

interface DrawingToolbarDragState extends DrawingToolbarPosition {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  toolbarWidth: number;
  toolbarHeight: number;
}

interface DrawingStylePreset {
  color: string;
  opacity: number;
  lineWidth: number;
  lineStyle: DrawingLineStyle;
  extend: DrawingExtendMode;
  leftEnd: DrawingArrowEnd;
  rightEnd: DrawingArrowEnd;
}

interface DrawingStatsState {
  priceRange: boolean;
  percentChange: boolean;
  change: boolean;
  barsRange: boolean;
  dateTimeRange: boolean;
  distance: boolean;
  angle: boolean;
  alwaysShow: boolean;
  position: DrawingStatsPosition;
}

interface DrawingMenuToolEntry {
  type: 'tool';
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
  tool?: DrawingToolId;
  disabled?: boolean;
}

interface DrawingMenuSectionEntry {
  type: 'section';
  label: string;
}

type DrawingMenuEntry = DrawingMenuToolEntry | DrawingMenuSectionEntry;

interface OscillatorPaneArea extends ChartCanvasArea {
  indicator: ActiveIndicator;
}

interface ChartVisualLayout {
  chartArea: ChartCanvasArea;
  volumeArea: ChartCanvasArea;
  oscillatorPaneAreas: OscillatorPaneArea[];
  crosshairAreas: ChartCanvasArea[];
  timeScaleArea: ChartCanvasArea;
  rightAxisWidth: number;
  bottomAxisHeight: number;
  compactChart: boolean;
  narrowChart: boolean;
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
  oscillatorMaType?: IndicatorMaType;
  signalMaType?: IndicatorMaType;
  color?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  fillColor?: string;
  histogramPositiveColor?: string;
  histogramNegativeColor?: string;
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

interface IndicatorLegendValue {
  label: string;
  color: string;
  value: number | null | undefined;
}

interface PaneIndicatorSeriesCache {
  candles: Candle[];
  indicators: ActiveIndicator[];
  seriesById: Record<string, IndicatorComputedSeries>;
}

interface PaneHoverState {
  mousePos: MousePosition | null;
  pointerArea: ChartPointerArea;
  pointerX: number | null;
  pointerY: number | null;
  drawingHoverTarget: DrawingHoverTarget;
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
  drawings?: ChartDrawing[];
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

interface AuthFormState {
  displayName: string;
  email: string;
  password: string;
}

interface PasswordSecurityRequirement {
  id: string;
  label: string;
  isMet: boolean;
}

interface PasswordSecurityReport {
  isValid: boolean;
  missingRequirements: string[];
  requirements: PasswordSecurityRequirement[];
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
const USER_TRACKING_DEVICE_STORAGE_KEY = 'procharting.userTrackingDevice';
const MAX_SAVED_CHART_LAYOUTS = 12;
const DEFAULT_ACCOUNT_LAYOUT_ID = 'layout-default';
const DEFAULT_ACCOUNT_LAYOUT_NAME = 'Default';
const DEFAULT_ACCOUNT_LAYOUT_SYMBOL = 'BTCUSDT';
const DEFAULT_ACCOUNT_LAYOUT_TIMEFRAME = '1d';
const DEFAULT_ACCOUNT_LAYOUT_THEME: ThemeName = 'light';
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
const DRAWING_DEFAULT_COLOR = '#2962ff';
const DRAWING_DEFAULT_LINE_STYLE: DrawingLineStyle = 'solid';
const DRAWING_DEFAULT_TEXT_COLOR = '#ffffff';
const DRAWING_DEFAULT_OPACITY = 1;
const DRAWING_HANDLE_RADIUS = 4.5;
const DRAWING_HIT_TOLERANCE = 8;
const DRAWING_FLOATING_TOOLBAR_HEIGHT = 38;
const DRAWING_FLOATING_TOOLBAR_MARGIN = 8;
const DRAWING_COLOR_SWATCHES = ['#2962ff', '#089981', '#f23645', '#ff9800', '#9c27b0', '#ffffff', '#000000'];
const DRAWING_LINE_WIDTH_OPTIONS = [1, 2, 3, 4, 5, 6] as const;
const DRAWING_TEXT_SIZE_OPTIONS = [10, 12, 14, 16, 18, 20] as const;
const DRAWING_LINE_STYLE_OPTIONS: Array<{ value: DrawingLineStyle; label: string }> = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];
const DRAWING_EXTEND_OPTIONS: Array<{ value: DrawingExtendMode; label: string }> = [
  { value: 'none', label: "Don't extend" },
  { value: 'left', label: 'Extend left' },
  { value: 'right', label: 'Extend right' },
  { value: 'both', label: 'Extend both' },
];
const DRAWING_ARROW_END_OPTIONS: Array<{ value: DrawingArrowEnd; label: string }> = [
  { value: 'none', label: 'Normal' },
  { value: 'arrow', label: 'Arrow' },
];
const DRAWING_TEXT_ALIGNMENT_OPTIONS: Array<{ value: DrawingTextAlignment; label: string }> = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];
const DRAWING_TEXT_VERTICAL_ALIGNMENT_OPTIONS: Array<{ value: DrawingTextVerticalAlignment; label: string }> = [
  { value: 'top', label: 'Top' },
  { value: 'middle', label: 'Middle' },
  { value: 'bottom', label: 'Bottom' },
];
const DRAWING_STATS_POSITION_OPTIONS: Array<{ value: DrawingStatsPosition; label: string }> = [
  { value: 'above', label: 'Above' },
  { value: 'below', label: 'Below' },
  { value: 'right', label: 'Right' },
];
const DRAWING_SETTINGS_TABS: Array<{ value: DrawingSettingsTab; label: string }> = [
  { value: 'style', label: 'Style' },
  { value: 'text', label: 'Text' },
  { value: 'coordinates', label: 'Coordinates' },
  { value: 'visibility', label: 'Visibility' },
];
const DRAWING_STATS_SELECT_OPTIONS: Array<{ value: DrawingStatsSelectValue; label: string }> = [
  { value: 'hidden', label: 'Hidden' },
  { value: 'priceRange', label: 'Price range' },
  { value: 'percentChange', label: 'Percent change' },
  { value: 'change', label: 'Change' },
  { value: 'barsRange', label: 'Bars range' },
  { value: 'dateTimeRange', label: 'Date/time range' },
  { value: 'distance', label: 'Distance' },
  { value: 'angle', label: 'Angle' },
  { value: 'all', label: 'All stats' },
];
const DRAWING_ALERT_CONDITION_OPTIONS: Array<{ value: DrawingAlertCondition; label: string }> = [
  { value: 'crossing', label: 'Crossing' },
  { value: 'crossing-up', label: 'Crossing up' },
  { value: 'crossing-down', label: 'Crossing down' },
  { value: 'greater-than', label: 'Greater than' },
  { value: 'less-than', label: 'Less than' },
];
const DRAWING_ALERT_FREQUENCY_OPTIONS: Array<{ value: DrawingAlertFrequency; label: string }> = [
  { value: 'only-once', label: 'Only once' },
  { value: 'once-per-bar', label: 'Once per bar' },
  { value: 'once-per-bar-close', label: 'Once per bar close' },
];
const DRAWING_VISIBILITY_OPTIONS: Array<{ value: DrawingVisibilityMode; label: string; description: string }> = [
  { value: 'all', label: 'All intervals', description: 'Visible on every chart interval' },
  { value: 'intraday', label: 'Intraday only', description: '1m through 4H intervals' },
  { value: 'daily-plus', label: 'Daily and above', description: '1D, 1W, and 1M intervals' },
];
const DRAWING_VISIBILITY_GROUPS: Array<{
  id: string;
  label: string;
  min?: number;
  max?: number;
  timeframes: string[];
}> = [
  { id: 'ticks', label: 'Ticks', timeframes: [] },
  { id: 'seconds', label: 'Seconds', min: 1, max: 59, timeframes: [] },
  { id: 'minutes', label: 'Minutes', min: 1, max: 59, timeframes: ['1m', '5m', '15m', '30m'] },
  { id: 'hours', label: 'Hours', min: 1, max: 24, timeframes: ['1h', '4h'] },
  { id: 'days', label: 'Days', min: 1, max: 366, timeframes: ['1d'] },
  { id: 'weeks', label: 'Weeks', min: 1, max: 52, timeframes: ['1w'] },
  { id: 'months', label: 'Months', min: 1, max: 12, timeframes: ['1M'] },
  { id: 'ranges', label: 'Ranges', timeframes: [] },
];
const DEFAULT_DRAWING_STYLE_PRESET: DrawingStylePreset = {
  color: DRAWING_DEFAULT_COLOR,
  opacity: DRAWING_DEFAULT_OPACITY,
  lineWidth: 2,
  lineStyle: DRAWING_DEFAULT_LINE_STYLE,
  extend: 'none',
  leftEnd: 'none',
  rightEnd: 'none',
};
const CURSOR_TOOL_LABELS: Record<CursorToolId, string> = {
  cross: 'Cross',
  dot: 'Dot',
  arrow: 'Arrow',
  demonstration: 'Demonstration',
  magic: 'Magic',
  eraser: 'Eraser',
};
const CURSOR_TOOL_CANVAS_CURSORS: Record<CursorToolId, string> = {
  cross: 'crosshair',
  dot: "url('/cursors/dot.cur'), default",
  arrow: 'default',
  demonstration: 'default',
  magic: "url('/cursors/magic.svg'), default",
  eraser: "url('/cursors/eraser.cur'), default",
};
const CURSOR_TOOLS_WITHOUT_CROSSHAIR: ReadonlySet<CursorToolId> = new Set(['arrow']);
const CURSOR_FAVORITES_STORAGE_KEY = 'procharting.cursorToolFavorites';
const VALUES_TOOLTIP_LONG_PRESS_STORAGE_KEY = 'procharting.valuesTooltipOnLongPress';
const DRAWING_TOOL_LABELS: Record<DrawingToolId, string> = {
  'trend-line': 'Trendline',
  ray: 'Ray',
  'info-line': 'Info line',
  'extended-line': 'Extended line',
  'trend-angle': 'Trend angle',
  'horizontal-line': 'Horizontal line',
  'horizontal-ray': 'Horizontal ray',
  'vertical-line': 'Vertical line',
  'cross-line': 'Cross line',
  'parallel-channel': 'Parallel channel',
  'regression-trend': 'Regression trend',
  'flat-top-bottom': 'Flat top/bottom',
  'disjoint-channel': 'Disjoint channel',
  'fib-retracement': 'Fib retracement',
  'fib-extension': 'Trend-based fib extension',
  'fib-channel': 'Fib channel',
  'fib-time-zone': 'Fib time zone',
  'fib-speed-fan': 'Fib speed resistance fan',
  'fib-trend-time': 'Trend-based fib time',
  'fib-circles': 'Fib circles',
  'fib-spiral': 'Fib spiral',
  'fib-arcs': 'Fib speed resistance arcs',
  'fib-wedge': 'Fib wedge',
  'xabcd-pattern': 'XABCD pattern',
  'cypher-pattern': 'Cypher pattern',
  'head-and-shoulders': 'Head and shoulders',
  'abcd-pattern': 'ABCD pattern',
  'triangle-pattern': 'Triangle pattern',
  'three-drives-pattern': 'Three drives pattern',
  'elliott-impulse-wave': 'Elliott impulse wave (12345)',
  'elliott-correction-wave': 'Elliott correction wave (ABC)',
  'elliott-triangle-wave': 'Elliott triangle wave (ABCDE)',
  'elliott-double-combo-wave': 'Elliott double combo wave (WXY)',
  'elliott-triple-combo-wave': 'Elliott triple combo wave (WXYXZ)',
  'cyclic-lines': 'Cyclic lines',
  'time-cycles': 'Time cycles',
  'sine-line': 'Sine line',
};
const FIB_DEFAULT_TREND_COLOR = '#787b86';
const FIB_LEVEL_VALUE_COLORS: Record<string, string> = {
  '0': '#787b86',
  '0.236': '#f23645',
  '0.25': '#f23645',
  '0.382': '#ff9800',
  '0.5': '#4caf50',
  '0.618': '#089981',
  '0.75': '#00bcd4',
  '0.786': '#00bcd4',
  '1': '#787b86',
  '1.382': '#2962ff',
  '1.618': '#2962ff',
  '2': '#089981',
  '2.382': '#f23645',
  '2.618': '#f23645',
  '3': '#9c27b0',
  '3.618': '#9c27b0',
  '4.236': '#e91e63',
};
const formatFibLevelValue = (value: number) => {
  const text = value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  return text === '' || text === '-' ? '0' : text;
};
const getFibLevelColor = (value: number) => FIB_LEVEL_VALUE_COLORS[formatFibLevelValue(value)] ?? '#787b86';
const createFibLevels = (values: number[]): DrawingFibLevel[] =>
  values.map((value) => ({ value, enabled: true, color: getFibLevelColor(value) }));
const createDefaultFibLevels = (kind: DrawingToolId): DrawingFibLevel[] => {
  switch (kind) {
    case 'fib-retracement':
    case 'fib-extension':
      return createFibLevels([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618, 3.618, 4.236]);
    case 'fib-channel':
      return createFibLevels([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]);
    case 'fib-time-zone':
      return [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89].map((value) => ({
        value,
        enabled: true,
        color: value === 0 ? '#787b86' : '#2962ff',
      }));
    case 'fib-trend-time':
      return createFibLevels([0, 0.382, 0.5, 0.618, 1, 1.382, 1.618, 2, 2.382, 2.618]);
    case 'fib-speed-fan':
      return createFibLevels([0, 0.25, 0.382, 0.5, 0.618, 0.75, 1]);
    case 'fib-circles':
      return createFibLevels([0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.618, 2.618, 3.618]);
    case 'fib-arcs':
    case 'fib-wedge':
      return createFibLevels([0.236, 0.382, 0.5, 0.618, 0.786, 1]);
    default:
      return [];
  }
};
type CursorMenuEntry = { type: 'cursor'; id: CursorToolId } | { type: 'divider' };
const CURSOR_MENU_ENTRIES: CursorMenuEntry[] = [
  { type: 'cursor', id: 'cross' },
  { type: 'cursor', id: 'dot' },
  { type: 'cursor', id: 'arrow' },
  { type: 'cursor', id: 'demonstration' },
  { type: 'cursor', id: 'magic' },
  { type: 'divider' },
  { type: 'cursor', id: 'eraser' },
];
const CURSOR_TOOL_ICONS: Record<CursorToolId, ReactNode> = {
  cross: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
      <g fill="currentColor">
        <path d="M18 15h8v-1h-8z" />
        <path d="M14 18v8h1v-8zM14 3v8h1v-8zM3 15h8v-1h-8z" />
      </g>
    </svg>
  ),
  dot: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
      <circle fill="currentColor" cx="14" cy="14" r="3" />
    </svg>
  ),
  arrow: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
      <path
        fill="currentColor"
        d="M11.682 16.09l3.504 6.068 1.732-1-3.497-6.057 3.595-2.1L8 7.74v10.512l3.682-2.163zm-.362 1.372L7 20V6l12 7-4.216 2.462 3.5 6.062-3.464 2-3.5-6.062z"
      />
    </svg>
  ),
  demonstration: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="currentColor">
      <path d="m11.26 21 3.65-4.78 6.09-.66L10 8zm3.09-5.71-2.33 3.05-.8-8.3 7.02 4.82z" />
      <path fillRule="evenodd" d="M25 14a11 11 0 1 1-22 0 11 11 0 0 1 22 0m-1 0a10 10 0 1 1-20 0 10 10 0 0 1 20 0" />
    </svg>
  ),
  magic: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
      <path
        fill="#BBD9FB"
        d="M19.18 8.06 5.24 21.76a2.38 2.38 0 1 0 3.63 3.05L19.95 8.7l-.77-.64Z"
      />
      <path
        fill="#FFB74D"
        d="M23.25 2.55a1 1 0 0 1 1.42 1.18l-.72 2.3a1 1 0 0 0 .25 1l1.7 1.69a1 1 0 0 1-.68 1.71l-2.4.03a1 1 0 0 0-.89.55l-1.07 2.15a1 1 0 0 1-1.84-.13l-.77-2.28a1 1 0 0 0-.8-.67l-2.37-.36a1 1 0 0 1-.45-1.79l1.93-1.43a1 1 0 0 0 .4-.96l-.4-2.37a1 1 0 0 1 1.56-.98l1.96 1.39a1 1 0 0 0 1.04.07l2.13-1.1Z"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M23.71 3.43 23 5.73a2 2 0 0 0 .5 2.02l1.72 1.68-2.4.03a2 2 0 0 0-1.77 1.1l-1.08 2.15-.76-2.28a2 2 0 0 0-1.6-1.34l-2.37-.36 1.93-1.43a2 2 0 0 0 .78-1.93L17.54 3l1.96 1.4a2 2 0 0 0 2.08.14l2.13-1.1Zm-.46-.88a1 1 0 0 1 1.42 1.18l-.72 2.3a1 1 0 0 0 .25 1l1.7 1.69a1 1 0 0 1-.68 1.71l-2.4.03a1 1 0 0 0-.89.55l-1.07 2.15a1 1 0 0 1-1.84-.13l-.48-1.41-9.26 13.47A2.88 2.88 0 1 1 4.9 21.4L16.55 9.95l-1.47-.23a1 1 0 0 1-.45-1.79l1.93-1.43a1 1 0 0 0 .4-.96l-.4-2.37a1 1 0 0 1 1.56-.98l1.96 1.39a1 1 0 0 0 1.04.07l2.13-1.1Zm-5.5 7.62L5.58 22.12a1.88 1.88 0 1 0 2.87 2.4l9.65-14.04a1 1 0 0 0-.37-.3Z"
      />
    </svg>
  ),
  eraser: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 31" width="29" height="31">
      <g fill="currentColor" fillRule="nonzero">
        <path d="M15.3 22l8.187-8.187c.394-.394.395-1.028.004-1.418l-4.243-4.243c-.394-.394-1.019-.395-1.407-.006l-11.325 11.325c-.383.383-.383 1.018.007 1.407l1.121 1.121h7.656zm-9.484-.414c-.781-.781-.779-2.049-.007-2.821l11.325-11.325c.777-.777 2.035-.78 2.821.006l4.243 4.243c.781.781.78 2.048-.004 2.832l-8.48 8.48h-8.484l-1.414-1.414z" />
        <path d="M13.011 22.999h7.999v-1h-7.999zM13.501 11.294l6.717 6.717.707-.707-6.717-6.717z" />
      </g>
    </svg>
  ),
};
const CURSOR_FAVORITE_OUTLINE_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
    <path
      stroke="currentColor"
      d="M9 2.13l1.903 3.855.116.236.26.038 4.255.618-3.079 3.001-.188.184.044.259.727 4.237-3.805-2L9 12.434l-.233.122-3.805 2.001.727-4.237.044-.26-.188-.183-3.079-3.001 4.255-.618.26-.038.116-.236L9 2.13z"
    />
  </svg>
);
const CURSOR_FAVORITE_FILLED_ICON = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18" fill="none">
    <path fill="currentColor" d="M9 1l2.35 4.76 5.26.77-3.8 3.7.9 5.24L9 13l-4.7 2.47.9-5.23-3.8-3.71 5.25-.77L9 1z" />
  </svg>
);
const LINE_TOOL_MENU_ENTRIES: DrawingMenuEntry[] = [
  { type: 'section', label: 'Lines' },
  { type: 'tool', id: 'trend-line', label: 'Trendline', icon: 'trend-line', shortcut: 'T', tool: 'trend-line' },
  { type: 'tool', id: 'ray', label: 'Ray', icon: 'ray', shortcut: 'R', tool: 'ray' },
  { type: 'tool', id: 'info-line', label: 'Info line', icon: 'info-line', shortcut: 'I', tool: 'info-line' },
  { type: 'tool', id: 'extended-line', label: 'Extended line', icon: 'extended-line', shortcut: 'E', tool: 'extended-line' },
  { type: 'tool', id: 'trend-angle', label: 'Trend angle', icon: 'trend-angle', shortcut: 'A', tool: 'trend-angle' },
  { type: 'tool', id: 'horizontal-line', label: 'Horizontal line', icon: 'horizontal-line', shortcut: 'H', tool: 'horizontal-line' },
  {
    type: 'tool',
    id: 'horizontal-ray',
    label: 'Horizontal ray',
    icon: 'horizontal-ray',
    shortcut: 'J',
    tool: 'horizontal-ray',
  },
  { type: 'tool', id: 'vertical-line', label: 'Vertical line', icon: 'vertical-line', shortcut: 'V', tool: 'vertical-line' },
  { type: 'tool', id: 'cross-line', label: 'Cross line', icon: 'cross-line', shortcut: 'C', tool: 'cross-line' },
  { type: 'section', label: 'Channels' },
  { type: 'tool', id: 'parallel-channel', label: 'Parallel channel', icon: 'parallel-channel', shortcut: 'P', tool: 'parallel-channel' },
  { type: 'tool', id: 'regression-trend', label: 'Regression trend', icon: 'regression-trend', shortcut: 'G', tool: 'regression-trend' },
  { type: 'tool', id: 'flat-top-bottom', label: 'Flat top/bottom', icon: 'flat-channel', shortcut: 'F', tool: 'flat-top-bottom' },
  { type: 'tool', id: 'disjoint-channel', label: 'Disjoint channel', icon: 'disjoint-channel', shortcut: 'D', tool: 'disjoint-channel' },
];
const FIB_TOOL_MENU_ENTRIES: DrawingMenuEntry[] = [
  { type: 'section', label: 'Fibonacci' },
  { type: 'tool', id: 'fib-retracement', label: 'Fib retracement', icon: 'fib-retracement', shortcut: '⌥F', tool: 'fib-retracement' },
  { type: 'tool', id: 'fib-extension', label: 'Trend-based fib extension', icon: 'fib-extension', tool: 'fib-extension' },
  { type: 'tool', id: 'fib-channel', label: 'Fib channel', icon: 'fib-channel', tool: 'fib-channel' },
  { type: 'tool', id: 'fib-time-zone', label: 'Fib time zone', icon: 'fib-time-zone', tool: 'fib-time-zone' },
  { type: 'tool', id: 'fib-speed-fan', label: 'Fib speed resistance fan', icon: 'fib-speed-fan', tool: 'fib-speed-fan' },
  { type: 'tool', id: 'fib-trend-time', label: 'Trend-based fib time', icon: 'fib-trend-time', tool: 'fib-trend-time' },
  { type: 'tool', id: 'fib-circles', label: 'Fib circles', icon: 'fib-circles', tool: 'fib-circles' },
  { type: 'tool', id: 'fib-spiral', label: 'Fib spiral', icon: 'fib-spiral', tool: 'fib-spiral' },
  { type: 'tool', id: 'fib-arcs', label: 'Fib speed resistance arcs', icon: 'fib-arcs', tool: 'fib-arcs' },
  { type: 'tool', id: 'fib-wedge', label: 'Fib wedge', icon: 'fib-wedge', tool: 'fib-wedge' },
];
const FIB_TOOL_ICONS: Record<string, ReactNode> = {
  'fib-retracement': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="2" d="M4 6.5h20M4 14h20M4 21.5h20" />
      <path stroke="currentColor" strokeWidth="1.4" strokeDasharray="2.6 2.4" d="M5 21.5 23 6.5" />
    </svg>
  ),
  'fib-extension': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="m4 21 7-11 5 6" />
      <path stroke="currentColor" strokeWidth="2" d="M15 10.5h9M15 5.5h9" />
    </svg>
  ),
  'fib-channel': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="2" d="M3 17 17 3M7 23 21 9M11 25 25 11" />
    </svg>
  ),
  'fib-time-zone': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="2" d="M4.5 4v20M9.5 4v20M16 4v20M24 4v20" />
    </svg>
  ),
  'fib-speed-fan': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="M4.5 23.5V4.5M4.5 23.5h19M4.5 23.5 23.5 4.5M4.5 23.5l19-9.5M4.5 23.5 14 4.5" />
    </svg>
  ),
  'fib-trend-time': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="m3.5 21 7.5-12 4 5" />
      <path stroke="currentColor" strokeWidth="2" d="M18 4v20M24 4v20" />
    </svg>
  ),
  'fib-circles': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="14" cy="14" r="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="14" cy="14" r="1.4" fill="currentColor" />
    </svg>
  ),
  'fib-spiral': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path
        stroke="currentColor"
        strokeWidth="1.6"
        d="M14.5 13a2 2 0 0 1 2 2 3.4 3.4 0 0 1-3.4 3.4A5.5 5.5 0 0 1 7.6 13 8.4 8.4 0 0 1 16 4.6 9.4 9.4 0 0 1 25.4 14c0 6-4.8 10.4-10.9 10.4"
      />
    </svg>
  ),
  'fib-arcs': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="M2.5 22.5h23" />
      <path stroke="currentColor" strokeWidth="1.6" d="M8.5 22.5a5.5 5.5 0 0 1 11 0M4 22.5a10 10 0 0 1 20 0" />
    </svg>
  ),
  'fib-wedge': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="M4 23.5 23 5M4 23.5 25 17" />
      <path stroke="currentColor" strokeWidth="1.6" d="M13.5 14.3a13 13 0 0 1 6.3 5.5" />
    </svg>
  ),
};
const PATTERN_TOOL_MENU_ENTRIES: DrawingMenuEntry[] = [
  { type: 'section', label: 'Patterns' },
  { type: 'tool', id: 'xabcd-pattern', label: 'XABCD pattern', icon: 'xabcd-pattern', tool: 'xabcd-pattern' },
  { type: 'tool', id: 'cypher-pattern', label: 'Cypher pattern', icon: 'cypher-pattern', tool: 'cypher-pattern' },
  {
    type: 'tool',
    id: 'head-and-shoulders',
    label: 'Head and shoulders',
    icon: 'head-and-shoulders',
    tool: 'head-and-shoulders',
  },
  { type: 'tool', id: 'abcd-pattern', label: 'ABCD pattern', icon: 'abcd-pattern', tool: 'abcd-pattern' },
  { type: 'tool', id: 'triangle-pattern', label: 'Triangle pattern', icon: 'triangle-pattern', tool: 'triangle-pattern' },
  {
    type: 'tool',
    id: 'three-drives-pattern',
    label: 'Three drives pattern',
    icon: 'three-drives-pattern',
    tool: 'three-drives-pattern',
  },
  { type: 'section', label: 'Elliott waves' },
  {
    type: 'tool',
    id: 'elliott-impulse-wave',
    label: 'Elliott impulse wave (12345)',
    icon: 'elliott-impulse-wave',
    tool: 'elliott-impulse-wave',
  },
  {
    type: 'tool',
    id: 'elliott-correction-wave',
    label: 'Elliott correction wave (ABC)',
    icon: 'elliott-correction-wave',
    tool: 'elliott-correction-wave',
  },
  {
    type: 'tool',
    id: 'elliott-triangle-wave',
    label: 'Elliott triangle wave (ABCDE)',
    icon: 'elliott-triangle-wave',
    tool: 'elliott-triangle-wave',
  },
  {
    type: 'tool',
    id: 'elliott-double-combo-wave',
    label: 'Elliott double combo wave (WXY)',
    icon: 'elliott-double-combo-wave',
    tool: 'elliott-double-combo-wave',
  },
  {
    type: 'tool',
    id: 'elliott-triple-combo-wave',
    label: 'Elliott triple combo wave (WXYXZ)',
    icon: 'elliott-triple-combo-wave',
    tool: 'elliott-triple-combo-wave',
  },
  { type: 'section', label: 'Cycles' },
  { type: 'tool', id: 'cyclic-lines', label: 'Cyclic lines', icon: 'cyclic-lines', tool: 'cyclic-lines' },
  { type: 'tool', id: 'time-cycles', label: 'Time cycles', icon: 'time-cycles', tool: 'time-cycles' },
  { type: 'tool', id: 'sine-line', label: 'Sine line', icon: 'sine-line', tool: 'sine-line' },
];
const PATTERN_TOOL_ICONS: Record<string, ReactNode> = {
  'xabcd-pattern': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="m3.5 22 5-14 5.5 9.5L19.5 6l5 15.5" />
      <path stroke="currentColor" strokeWidth="1" strokeDasharray="2.4 2" d="M3.5 22 14 17.5l10.5 4" />
      <circle cx="3.5" cy="22" r="1.6" fill="currentColor" />
      <circle cx="8.5" cy="8" r="1.6" fill="currentColor" />
      <circle cx="14" cy="17.5" r="1.6" fill="currentColor" />
      <circle cx="19.5" cy="6" r="1.6" fill="currentColor" />
      <circle cx="24.5" cy="21.5" r="1.6" fill="currentColor" />
    </svg>
  ),
  'cypher-pattern': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="m3.5 19.5 5.5-13 5 9 6-11 4.5 17" />
      <path stroke="currentColor" strokeWidth="1" strokeDasharray="2.4 2" d="m3.5 19.5 10.5-4M9 6.5l15.5 15" />
      <circle cx="3.5" cy="19.5" r="1.6" fill="currentColor" />
      <circle cx="9" cy="6.5" r="1.6" fill="currentColor" />
      <circle cx="14" cy="15.5" r="1.6" fill="currentColor" />
      <circle cx="20" cy="4.5" r="1.6" fill="currentColor" />
      <circle cx="24.5" cy="21.5" r="1.6" fill="currentColor" />
    </svg>
  ),
  'head-and-shoulders': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="m2.5 23 3.5-9 3.5 6 4.5-15 4.5 15 3.5-6 3.5 9" />
      <path stroke="currentColor" strokeWidth="1" strokeDasharray="2.4 2" d="M2 19h24" />
    </svg>
  ),
  'abcd-pattern': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="m4 21.5 6-13M17.5 18.5l6.5-13" />
      <path stroke="currentColor" strokeWidth="1" strokeDasharray="2.4 2" d="m10 8.5 7.5 10" />
      <circle cx="4" cy="21.5" r="1.6" fill="currentColor" />
      <circle cx="10" cy="8.5" r="1.6" fill="currentColor" />
      <circle cx="17.5" cy="18.5" r="1.6" fill="currentColor" />
      <circle cx="24" cy="5.5" r="1.6" fill="currentColor" />
    </svg>
  ),
  'triangle-pattern': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="m3 6 22 8.5M3 23l22-8.5" />
      <path stroke="currentColor" strokeWidth="1" strokeDasharray="2.4 2" d="m6.5 7.5 4 13 5-9.5 4.5 6.5" />
    </svg>
  ),
  'three-drives-pattern': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="m2.5 24 5-11 3 5.5 4.5-10 3 5.5L23 3.5l2.5 5" />
      <circle cx="7.5" cy="13" r="1.5" fill="currentColor" />
      <circle cx="15" cy="8.5" r="1.5" fill="currentColor" />
      <circle cx="23" cy="3.5" r="1.5" fill="currentColor" />
    </svg>
  ),
  'elliott-impulse-wave': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="m2.5 24 5-9.5 3 4.5 5.5-10.5 3 4.5 5.5-10" />
      <text x="22" y="25" fill="currentColor" fontSize="9" fontFamily="sans-serif">5</text>
    </svg>
  ),
  'elliott-correction-wave': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="m3 19.5 6-13 4 8 7-11" />
      <text x="16" y="25" fill="currentColor" fontSize="9" fontFamily="sans-serif">abc</text>
    </svg>
  ),
  'elliott-triangle-wave': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="m2.5 17 4.5-11 4 9.5L15.5 7l3.5 7.5 3.5-6" />
      <text x="13" y="25" fill="currentColor" fontSize="9" fontFamily="sans-serif">abcde</text>
    </svg>
  ),
  'elliott-double-combo-wave': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="m3 20 6.5-13 4.5 9 7.5-12" />
      <text x="15" y="25" fill="currentColor" fontSize="9" fontFamily="sans-serif">wxy</text>
    </svg>
  ),
  'elliott-triple-combo-wave': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="m2.5 19 4.5-9.5 3.5 6.5 4.5-9 3.5 6.5 5-9.5" />
      <text x="11" y="25" fill="currentColor" fontSize="9" fontFamily="sans-serif">wxyxz</text>
    </svg>
  ),
  'cyclic-lines': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="M5 4v20M14 4v20M23 4v20" />
      <path stroke="currentColor" strokeWidth="1" strokeDasharray="2.4 2" d="M5 9a9 4.5 0 0 1 9 0M14 9a9 4.5 0 0 1 9 0" />
    </svg>
  ),
  'time-cycles': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="M2.5 21.5h23" />
      <path stroke="currentColor" strokeWidth="1.6" d="M3.5 21.5a5.25 5.25 0 0 1 10.5 0M14 21.5a5.25 5.25 0 0 1 10.5 0" />
    </svg>
  ),
  'sine-line': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="M2.5 14c3-7.5 6-7.5 8.5 0s5.5 7.5 8.5 0 4.5-5.5 6-2.5" />
    </svg>
  ),
};
const DRAWING_TOOL_SHORTCUTS = LINE_TOOL_MENU_ENTRIES.reduce<Record<string, DrawingToolId>>((shortcuts, entry) => {
  if (entry.type === 'tool' && !entry.disabled && entry.shortcut && entry.tool) {
    shortcuts[entry.shortcut.toLowerCase()] = entry.tool;
  }

  return shortcuts;
}, {});
const isEditableKeyboardTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
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
const ACCOUNT_ONLY_HEADER_PANELS = new Set<HeaderPanelKey>([
  'templates',
  'templateSave',
  'templateOpen',
  'layout',
  'manageLayouts',
  'quickSearch',
  'settings',
  'snapshot',
  'alert',
  'replay',
  'save',
  'trade',
  'publish',
]);
const ACCOUNT_ONLY_QUICK_ACTIONS = new Set<QuickActionId>([
  'templates',
  'layout',
  'settings',
  'snapshot',
  'alert',
  'replay',
  'save',
  'trade',
  'publish',
]);
const AUTH_ACTION_LABELS: Partial<Record<HeaderPanelKey | QuickActionId, string>> = {
  templates: 'indicator templates',
  templateSave: 'indicator templates',
  templateOpen: 'indicator templates',
  layout: 'multi-chart layouts',
  manageLayouts: 'saved layouts',
  quickSearch: 'quick search',
  settings: 'chart settings',
  snapshot: 'snapshots',
  alert: 'alerts',
  replay: 'bar replay',
  save: 'saved layouts',
  trade: 'broker trading',
  publish: 'publishing',
};
const DEFAULT_AUTH_FORM_STATE: AuthFormState = {
  displayName: '',
  email: '',
  password: '',
};
const AUTH_OAUTH_PROVIDERS: Array<{ provider: AuthOAuthProvider; label: string; iconSrc: string }> = [
  { provider: 'google', label: 'Continue with Google', iconSrc: '/auth/google.svg' },
  { provider: 'github', label: 'Continue with GitHub', iconSrc: '/auth/github.svg' },
];
const PASSWORD_MIN_LENGTH = 15;
const PASSWORD_MAX_LENGTH = 128;
const PASSWORD_PASSPHRASE_LENGTH = 20;
const PASSWORD_SEQUENCE_LENGTH = 5;
const PASSWORD_CHARACTER_GROUPS = {
  lower: 'abcdefghijkmnopqrstuvwxyz',
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  number: '23456789',
  symbol: '!@#$%^&*()-_=+[]{};:,.?',
} as const;
const PASSWORD_GENERATOR_GROUPS = Object.values(PASSWORD_CHARACTER_GROUPS);
const PASSWORD_GENERATOR_POOL = PASSWORD_GENERATOR_GROUPS.join('');
const PASSWORD_GENERATOR_LENGTH = 20;
const PASSWORD_BLOCKED_TERMS = [
  'password',
  'passw0rd',
  'qwerty',
  'letmein',
  'welcome',
  'admin',
  'login',
  'changeme',
  'default',
  'procharting',
  'procharts',
  'binance',
  'tradingview',
];
const PASSWORD_SEQUENCE_SOURCES = [
  'abcdefghijklmnopqrstuvwxyz',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  '0123456789',
];

const getPasswordCharacterTypeCount = (password: string) =>
  Number(/[a-z]/.test(password)) +
  Number(/[A-Z]/.test(password)) +
  Number(/[0-9]/.test(password)) +
  Number(/[^A-Za-z0-9]/.test(password));

const hasPasswordSequence = (password: string) => {
  const normalized = password.toLowerCase();

  return PASSWORD_SEQUENCE_SOURCES.some((source) => {
    const reversed = source.split('').reverse().join('');

    for (let index = 0; index <= source.length - PASSWORD_SEQUENCE_LENGTH; index += 1) {
      const forward = source.slice(index, index + PASSWORD_SEQUENCE_LENGTH);
      const backward = reversed.slice(index, index + PASSWORD_SEQUENCE_LENGTH);

      if (normalized.includes(forward) || normalized.includes(backward)) {
        return true;
      }
    }

    return false;
  });
};

const hasRepeatedPasswordRun = (password: string) => /(.)\1{4,}/.test(password);

const getPasswordContextTerms = (email: string, displayName: string) => {
  const terms = new Set<string>();
  const [emailLocalPart] = email.toLowerCase().split('@');

  for (const value of [emailLocalPart ?? '', displayName.toLowerCase()]) {
    value
      .split(/[^a-z0-9]+/)
      .filter((part) => part.length >= 3)
      .forEach((part) => terms.add(part));
  }

  return [...terms];
};

const getPasswordSecurityReport = (
  password: string,
  context: Pick<AuthFormState, 'displayName' | 'email'>
): PasswordSecurityReport => {
  const normalizedPassword = password.toLowerCase();
  const characterTypeCount = getPasswordCharacterTypeCount(password);
  const contextTerms = getPasswordContextTerms(context.email, context.displayName);
  const hasCommonTerm = PASSWORD_BLOCKED_TERMS.some((term) => normalizedPassword.includes(term));
  const hasContextTerm = contextTerms.some((term) => normalizedPassword.includes(term));
  const hasPassphraseLength = password.length >= PASSWORD_PASSPHRASE_LENGTH;

  const requirements: PasswordSecurityRequirement[] = [
    {
      id: 'visible',
      label: 'Use at least one visible character.',
      isMet: /\S/.test(password),
    },
    {
      id: 'length',
      label: `Use at least ${PASSWORD_MIN_LENGTH} characters.`,
      isMet: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: 'maximum',
      label: `Keep it ${PASSWORD_MAX_LENGTH} characters or fewer.`,
      isMet: password.length <= PASSWORD_MAX_LENGTH,
    },
    {
      id: 'variety',
      label: `Use at least 3 character types, or ${PASSWORD_PASSPHRASE_LENGTH}+ characters as a passphrase.`,
      isMet: characterTypeCount >= 3 || hasPassphraseLength,
    },
    {
      id: 'common',
      label: 'Avoid common words, defaults, and product names.',
      isMet: !hasCommonTerm,
    },
    {
      id: 'personal',
      label: 'Do not include your name or email.',
      isMet: !hasContextTerm,
    },
    {
      id: 'patterns',
      label: 'Avoid repeated characters and keyboard or number runs.',
      isMet: !hasRepeatedPasswordRun(password) && !hasPasswordSequence(password),
    },
  ];

  const missingRequirements = requirements
    .filter((requirement) => !requirement.isMet)
    .map((requirement) => requirement.label);

  return {
    isValid: missingRequirements.length === 0,
    missingRequirements,
    requirements,
  };
};

const formatPasswordSecurityMessage = (report: PasswordSecurityReport) =>
  `Secure password missing: ${report.missingRequirements.join(' ')}`;

const getSecureRandomIndex = (maxExclusive: number) => {
  const cryptoApi = globalThis.crypto;

  if (!cryptoApi?.getRandomValues) {
    throw new Error('Secure password generation is unavailable in this browser.');
  }

  const randomValues = new Uint32Array(1);
  const randomLimit = 0x100000000;
  const maxUnbiased = randomLimit - (randomLimit % maxExclusive);

  do {
    cryptoApi.getRandomValues(randomValues);
  } while (randomValues[0]! >= maxUnbiased);

  return randomValues[0]! % maxExclusive;
};

const pickSecurePasswordCharacter = (characters: string) => characters[getSecureRandomIndex(characters.length)]!;

const shuffleSecurePasswordCharacters = (characters: string[]) => {
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = getSecureRandomIndex(index + 1);
    [characters[index], characters[swapIndex]] = [characters[swapIndex]!, characters[index]!];
  }

  return characters;
};

const generateSecurePasswordCandidate = () => {
  const passwordCharacters = PASSWORD_GENERATOR_GROUPS.map(pickSecurePasswordCharacter);

  while (passwordCharacters.length < PASSWORD_GENERATOR_LENGTH) {
    passwordCharacters.push(pickSecurePasswordCharacter(PASSWORD_GENERATOR_POOL));
  }

  return shuffleSecurePasswordCharacters(passwordCharacters).join('');
};

const generateSecurePassword = () => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const password = generateSecurePasswordCandidate();

    if (getPasswordSecurityReport(password, DEFAULT_AUTH_FORM_STATE).isValid) {
      return password;
    }
  }

  throw new Error('Secure password generation failed.');
};

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
const formatTimeframeLabel = (timeframe: string) =>
  TIMEFRAME_OPTIONS.find((option) => option.value === timeframe)?.label ?? timeframe;
const DRAWING_TIMEFRAME_VALUES = TIMEFRAME_OPTIONS.map((option) => option.value);
const createDefaultDrawingStats = (): DrawingStatsState => ({
  priceRange: false,
  percentChange: false,
  change: false,
  barsRange: false,
  dateTimeRange: false,
  distance: false,
  angle: false,
  alwaysShow: false,
  position: 'right',
});
const createDefaultDrawingTimeframeVisibility = () =>
  DRAWING_TIMEFRAME_VALUES.reduce<Record<string, boolean>>((visibilityByTimeframe, timeframe) => {
    visibilityByTimeframe[timeframe] = true;
    return visibilityByTimeframe;
  }, {});
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
    defaults: { period: 14, source: 'close', color: '#7e57c2' },
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
      oscillatorMaType: 'EMA',
      signalMaType: 'EMA',
      color: '#2962ff',
      secondaryColor: '#ff6d00',
      histogramPositiveColor: '#26a69a',
      histogramNegativeColor: '#ef5350',
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
const INDICATOR_MA_TYPE_OPTIONS: IndicatorMaType[] = ['EMA', 'SMA'];
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const COLOR_INPUT_FALLBACK = '#2962ff';
const colorToInputValue = (color: string | undefined, fallback = COLOR_INPUT_FALLBACK) => {
  if (!color) return fallback;

  const hex = color.trim();
  const shortHexMatch = hex.match(/^#([0-9a-f]{3})$/i);
  if (shortHexMatch) {
    return `#${shortHexMatch[1]
      .split('')
      .map((char) => `${char}${char}`)
      .join('')}`;
  }

  if (/^#[0-9a-f]{6}$/i.test(hex)) return hex;

  const rgbMatch = hex.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (!rgbMatch) return fallback;

  const [, r, g, b] = rgbMatch;
  return `#${[r, g, b]
    .map((channel) => clamp(Number(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;
};
const hexToRgba = (hex: string, alpha: number) => {
  const input = colorToInputValue(hex);
  const red = parseInt(input.slice(1, 3), 16);
  const green = parseInt(input.slice(3, 5), 16);
  const blue = parseInt(input.slice(5, 7), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};
const CHART_AXIS_FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif';
const getCanvasFont = (fontSize: number, fontFamily = CHART_AXIS_FONT_FAMILY) => `${fontSize}px ${fontFamily}`;

const PALETTES: Record<ThemeName, Palette> = {
  dark: {
    canvasTop: '#1f1633',
    canvasBottom: '#150f23',
    grid: 'rgba(207, 207, 219, 0.12)',
    gridStrong: 'rgba(194, 239, 78, 0.22)',
    text: '#bdb8c0',
    textBright: '#fffaff',
    crosshair: 'rgba(194, 239, 78, 0.74)',
    axisBg: '#1b132d',
    axisBorder: '#362d59',
    green: '#c2ef4e',
    red: '#fa7faa',
    greenSoft: 'rgba(194, 239, 78, 0.18)',
    redSoft: 'rgba(250, 127, 170, 0.17)',
    wick: '#9d94ad',
    line: '#9dc1f5',
    ma: '#fae07a',
    volume: 'rgba(121, 98, 140, 0.34)',
  },
  light: {
    canvasTop: '#ffffff',
    canvasBottom: '#f8f5fb',
    grid: 'rgba(31, 22, 51, 0.11)',
    gridStrong: 'rgba(66, 32, 130, 0.2)',
    text: '#746783',
    textBright: '#1f1633',
    crosshair: 'rgba(66, 32, 130, 0.62)',
    axisBg: '#f0eef6',
    axisBorder: '#cfcfdb',
    green: '#16846d',
    red: '#c84274',
    greenSoft: 'rgba(22, 132, 109, 0.15)',
    redSoft: 'rgba(200, 66, 116, 0.14)',
    wick: '#79628c',
    line: '#422082',
    ma: '#9a6b00',
    volume: 'rgba(121, 98, 140, 0.22)',
  },
};

const MIN_VISIBLE_BARS = 18;
const MAX_VISIBLE_BARS = 420;
const MAX_FUTURE_BARS = 120;
const Y_AXIS_SCALE_SPEED = 1.7;

const getChartVisualLayout = ({
  width,
  height,
  showVolume,
  oscillatorIndicators,
}: {
  width: number;
  height: number;
  showVolume: boolean;
  oscillatorIndicators: ActiveIndicator[];
}): ChartVisualLayout => {
  const compactChart = width < 520;
  const narrowChart = width < 620;
  const rightAxisWidth = compactChart ? 82 : 102;
  const bottomAxisHeight = compactChart ? 31 : 38;
  const topPlotInset = 0;
  const oscillatorCount = oscillatorIndicators.length;
  const requestedVolumeHeight = showVolume ? clamp(height * 0.15, 46, 96) : 0;
  const minMainChartHeight = width < 520 ? 176 : 220;
  const availableAuxHeight = Math.max(0, height - bottomAxisHeight - topPlotInset - minMainChartHeight);
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
    width: Math.max(80, width - rightAxisWidth - (compactChart ? 10 : 18)),
    height: Math.max(
      120,
      height -
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
    top: chartArea.top + chartArea.height + paneGap,
    width: chartArea.width,
    height: Math.max(0, volumeHeight - 14),
  };
  const oscillatorStartTop =
    chartArea.top +
    chartArea.height +
    (showVolume ? volumeHeight + paneGap : 0) +
    (oscillatorCount > 0 ? paneGap : 0);
  const oscillatorPaneAreas = oscillatorIndicators.map((indicator, index) => ({
    indicator,
    left: chartArea.left,
    top: oscillatorStartTop + index * (oscillatorPaneHeight + paneGap),
    width: chartArea.width,
    height: oscillatorPaneHeight,
  }));
  const crosshairAreas: ChartCanvasArea[] = [
    chartArea,
    ...(showVolume && volumeArea.height > 0 ? [volumeArea] : []),
    ...oscillatorPaneAreas
      .filter((area) => area.height > 0)
      .map(({ left, top, width: areaWidth, height: areaHeight }) => ({
        left,
        top,
        width: areaWidth,
        height: areaHeight,
      })),
  ];
  const timeScaleArea = {
    left: chartArea.left,
    top: Math.max(chartArea.top, height - bottomAxisHeight),
    width: chartArea.width,
    height: bottomAxisHeight,
  };

  return {
    chartArea,
    volumeArea,
    oscillatorPaneAreas,
    crosshairAreas,
    timeScaleArea,
    rightAxisWidth,
    bottomAxisHeight,
    compactChart,
    narrowChart,
  };
};
const createDefaultViewRange = (): ViewRange => ({
  startIndex: 0,
  endIndex: 100,
  candlesPerView: 100,
});
const createDefaultChartBounds = (): ChartInteractionBounds => ({
  minPrice: 0,
  maxPrice: 0,
  chartArea: { left: 12, top: 34, width: 0, height: 0 },
  crosshairAreas: [],
  timeScaleArea: { left: 12, top: 34, width: 0, height: 0 },
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
const createTouchGestureState = (paneIndex = 0): ChartTouchGestureState => ({
  mode: 'none',
  paneIndex,
  startX: 0,
  startViewRange: createDefaultViewRange(),
  startDistance: 0,
  startMidX: 0,
});
const createDrawingDragState = (paneIndex = 0): DrawingDragState => ({
  mode: 'none',
  paneIndex,
  drawingId: null,
  startX: 0,
  startY: 0,
  startAnchors: [],
});
const createDrawingId = (kind: DrawingToolId) =>
  `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const cloneDrawingAnchors = (anchors: ChartDrawingAnchor[]) =>
  anchors.map((anchor) => ({ logicalIndex: anchor.logicalIndex, price: anchor.price }));
const cloneDrawing = (drawing: ChartDrawing): ChartDrawing => ({
  ...drawing,
  anchors: cloneDrawingAnchors(drawing.anchors),
  fibLevels: drawing.fibLevels.map((level) => ({ ...level })),
});
const isDrawingToolId = (value: unknown): value is DrawingToolId =>
  value === 'trend-line' ||
  value === 'ray' ||
  value === 'info-line' ||
  value === 'extended-line' ||
  value === 'trend-angle' ||
  value === 'horizontal-line' ||
  value === 'horizontal-ray' ||
  value === 'vertical-line' ||
  value === 'cross-line' ||
  value === 'parallel-channel' ||
  value === 'regression-trend' ||
  value === 'flat-top-bottom' ||
  value === 'disjoint-channel' ||
  value === 'fib-retracement' ||
  value === 'fib-extension' ||
  value === 'fib-channel' ||
  value === 'fib-time-zone' ||
  value === 'fib-speed-fan' ||
  value === 'fib-trend-time' ||
  value === 'fib-circles' ||
  value === 'fib-spiral' ||
  value === 'fib-arcs' ||
  value === 'fib-wedge' ||
  value === 'xabcd-pattern' ||
  value === 'cypher-pattern' ||
  value === 'head-and-shoulders' ||
  value === 'abcd-pattern' ||
  value === 'triangle-pattern' ||
  value === 'three-drives-pattern' ||
  value === 'elliott-impulse-wave' ||
  value === 'elliott-correction-wave' ||
  value === 'elliott-triangle-wave' ||
  value === 'elliott-double-combo-wave' ||
  value === 'elliott-triple-combo-wave' ||
  value === 'cyclic-lines' ||
  value === 'time-cycles' ||
  value === 'sine-line';
const isFibDrawingTool = (kind: DrawingToolId) =>
  kind === 'fib-retracement' ||
  kind === 'fib-extension' ||
  kind === 'fib-channel' ||
  kind === 'fib-time-zone' ||
  kind === 'fib-speed-fan' ||
  kind === 'fib-trend-time' ||
  kind === 'fib-circles' ||
  kind === 'fib-spiral' ||
  kind === 'fib-arcs' ||
  kind === 'fib-wedge';
const isThreeAnchorFibDrawingTool = (kind: DrawingToolId) =>
  kind === 'fib-extension' || kind === 'fib-channel' || kind === 'fib-trend-time' || kind === 'fib-wedge';
const PATTERN_DRAWING_ANCHOR_COUNTS: Partial<Record<DrawingToolId, number>> = {
  'xabcd-pattern': 5,
  'cypher-pattern': 5,
  'head-and-shoulders': 7,
  'abcd-pattern': 4,
  'triangle-pattern': 4,
  'three-drives-pattern': 7,
  'elliott-impulse-wave': 6,
  'elliott-correction-wave': 4,
  'elliott-triangle-wave': 6,
  'elliott-double-combo-wave': 4,
  'elliott-triple-combo-wave': 6,
  'cyclic-lines': 2,
  'time-cycles': 2,
  'sine-line': 2,
};
const isPatternDrawingTool = (kind: DrawingToolId) => PATTERN_DRAWING_ANCHOR_COUNTS[kind] !== undefined;
const PATTERN_POINT_LABELS: Partial<Record<DrawingToolId, Array<string | null>>> = {
  'xabcd-pattern': ['X', 'A', 'B', 'C', 'D'],
  'cypher-pattern': ['X', 'A', 'B', 'C', 'D'],
  'head-and-shoulders': [null, 'Left Shoulder', null, 'Head', null, 'Right Shoulder', null],
  'abcd-pattern': ['A', 'B', 'C', 'D'],
  'triangle-pattern': ['A', 'B', 'C', 'D'],
  'three-drives-pattern': [null, '1', 'A', '2', 'B', '3', 'C'],
  'elliott-impulse-wave': ['(0)', '(1)', '(2)', '(3)', '(4)', '(5)'],
  'elliott-correction-wave': ['(0)', '(A)', '(B)', '(C)'],
  'elliott-triangle-wave': ['(0)', '(A)', '(B)', '(C)', '(D)', '(E)'],
  'elliott-double-combo-wave': ['(0)', '(W)', '(X)', '(Y)'],
  'elliott-triple-combo-wave': ['(0)', '(W)', '(X)', '(Y)', '(X)', '(Z)'],
};
const isFibExtendableDrawingTool = (kind: DrawingToolId) =>
  kind === 'fib-retracement' || kind === 'fib-extension' || kind === 'fib-channel';
const isOneAnchorDrawingTool = (kind: DrawingToolId) =>
  kind === 'horizontal-line' || kind === 'horizontal-ray' || kind === 'vertical-line' || kind === 'cross-line';
const isTwoAnchorDrawingTool = (kind: DrawingToolId) =>
  kind === 'trend-line' ||
  kind === 'ray' ||
  kind === 'info-line' ||
  kind === 'extended-line' ||
  kind === 'trend-angle';
const isChannelDrawingTool = (kind: DrawingToolId) =>
  kind === 'parallel-channel' ||
  kind === 'regression-trend' ||
  kind === 'flat-top-bottom' ||
  kind === 'disjoint-channel';
const isMultiAnchorDrawingTool = (kind: DrawingToolId) => !isOneAnchorDrawingTool(kind);
const isHorizontalDrawingTool = (kind: DrawingToolId) => kind === 'horizontal-line' || kind === 'horizontal-ray';
const isVerticalDrawingTool = (kind: DrawingToolId) => kind === 'vertical-line';
const getRequiredDrawingAnchorCount = (kind: DrawingToolId) =>
  PATTERN_DRAWING_ANCHOR_COUNTS[kind] ??
  (kind === 'disjoint-channel'
    ? 4
    : isChannelDrawingTool(kind) || isThreeAnchorFibDrawingTool(kind)
      ? 3
      : isTwoAnchorDrawingTool(kind) || isFibDrawingTool(kind)
        ? 2
        : 1);
const DRAWING_HIT_TARGETS_BY_ANCHOR_INDEX = ['start', 'end', 'third', 'fourth', 'fifth', 'sixth', 'seventh'] as const;
const getDrawingHitTargetForAnchorIndex = (index: number): DrawingHitTarget | null =>
  DRAWING_HIT_TARGETS_BY_ANCHOR_INDEX[index] ?? null;
const getDrawingAnchorIndexForHitTarget = (target: DrawingDragMode) => {
  const index = DRAWING_HIT_TARGETS_BY_ANCHOR_INDEX.indexOf(
    target as (typeof DRAWING_HIT_TARGETS_BY_ANCHOR_INDEX)[number]
  );
  return index >= 0 ? index : null;
};
const isDrawingLineStyle = (value: unknown): value is DrawingLineStyle =>
  value === 'solid' || value === 'dashed' || value === 'dotted';
const isDrawingExtendMode = (value: unknown): value is DrawingExtendMode =>
  value === 'none' || value === 'left' || value === 'right' || value === 'both';
const isDrawingVisibilityMode = (value: unknown): value is DrawingVisibilityMode =>
  value === 'all' || value === 'intraday' || value === 'daily-plus';
const isDrawingArrowEnd = (value: unknown): value is DrawingArrowEnd => value === 'none' || value === 'arrow';
const isDrawingTextAlignment = (value: unknown): value is DrawingTextAlignment =>
  value === 'left' || value === 'center' || value === 'right';
const isDrawingTextVerticalAlignment = (value: unknown): value is DrawingTextVerticalAlignment =>
  value === 'top' || value === 'middle' || value === 'bottom';
const isDrawingStatsPosition = (value: unknown): value is DrawingStatsPosition =>
  value === 'above' || value === 'below' || value === 'right';
const isDrawingAlertCondition = (value: unknown): value is DrawingAlertCondition =>
  value === 'crossing' ||
  value === 'crossing-up' ||
  value === 'crossing-down' ||
  value === 'greater-than' ||
  value === 'less-than';
const isDrawingAlertFrequency = (value: unknown): value is DrawingAlertFrequency =>
  value === 'only-once' || value === 'once-per-bar' || value === 'once-per-bar-close';
const isDailyPlusTimeframe = (timeframe: string) => timeframe === '1d' || timeframe === '1w' || timeframe === '1M';
const shouldRenderDrawingForTimeframe = (drawing: ChartDrawing, timeframe: string) => {
  if (!drawing.visible) return false;
  if (drawing.timeframeVisibility[timeframe] === false) return false;
  if (drawing.visibility === 'all') return true;

  const dailyPlus = isDailyPlusTimeframe(timeframe);
  return drawing.visibility === 'daily-plus' ? dailyPlus : !dailyPlus;
};
const sanitizeDrawingStats = (stats: unknown): DrawingStatsState => {
  const defaults = createDefaultDrawingStats();
  if (!stats || typeof stats !== 'object') return defaults;

  const candidate = stats as Partial<DrawingStatsState>;
  return {
    priceRange: candidate.priceRange === true,
    percentChange: candidate.percentChange === true,
    change: candidate.change === true,
    barsRange: candidate.barsRange === true,
    dateTimeRange: candidate.dateTimeRange === true,
    distance: candidate.distance === true,
    angle: candidate.angle === true,
    alwaysShow: candidate.alwaysShow === true,
    position: isDrawingStatsPosition(candidate.position) ? candidate.position : defaults.position,
  };
};
const DRAWING_STATS_SELECT_KEYS: Array<Exclude<DrawingStatsSelectValue, 'hidden' | 'all'>> = [
  'priceRange',
  'percentChange',
  'change',
  'barsRange',
  'dateTimeRange',
  'distance',
  'angle',
];
const getDrawingStatsSelectValue = (stats: DrawingStatsState): DrawingStatsSelectValue => {
  const activeKeys = DRAWING_STATS_SELECT_KEYS.filter((key) => stats[key]);
  if (activeKeys.length === 0) return 'hidden';
  if (activeKeys.length === DRAWING_STATS_SELECT_KEYS.length) return 'all';

  return activeKeys[0] ?? 'hidden';
};
const createDrawingStatsFromSelectValue = (
  currentStats: DrawingStatsState,
  value: DrawingStatsSelectValue
): DrawingStatsState => {
  const nextStats = { ...currentStats };
  DRAWING_STATS_SELECT_KEYS.forEach((key) => {
    nextStats[key] = value === 'all' || value === key;
  });
  return nextStats;
};
const sanitizeDrawingTimeframeVisibility = (visibility: unknown) => {
  const defaults = createDefaultDrawingTimeframeVisibility();
  if (!visibility || typeof visibility !== 'object') return defaults;

  return DRAWING_TIMEFRAME_VALUES.reduce<Record<string, boolean>>((nextVisibility, timeframe) => {
    nextVisibility[timeframe] = (visibility as Record<string, unknown>)[timeframe] !== false;
    return nextVisibility;
  }, {});
};
const sanitizeFibLevels = (levels: unknown, kind: DrawingToolId): DrawingFibLevel[] => {
  if (!isFibDrawingTool(kind)) return [];
  if (!Array.isArray(levels)) return createDefaultFibLevels(kind);

  const sanitized = levels
    .filter((level): level is Partial<DrawingFibLevel> => level !== null && typeof level === 'object')
    .filter((level) => Number.isFinite(level.value))
    .slice(0, 24)
    .map((level) => ({
      value: level.value as number,
      enabled: level.enabled !== false,
      color: typeof level.color === 'string' ? level.color : getFibLevelColor(level.value as number),
    }));

  return sanitized.length > 0 ? sanitized : createDefaultFibLevels(kind);
};
const sanitizeSavedDrawings = (drawings: unknown, paneCount: number): ChartDrawing[] => {
  if (!Array.isArray(drawings)) return [];

  return drawings
    .filter(
      (drawing): drawing is Partial<ChartDrawing> & {
        kind: DrawingToolId;
        paneIndex: number;
        anchors: ChartDrawingAnchor[];
      } => {
        if (!drawing || typeof drawing !== 'object') return false;

        const candidate = drawing as Partial<ChartDrawing>;
        if (!isDrawingToolId(candidate.kind)) return false;
        if (!Array.isArray(candidate.anchors)) return false;
        if (typeof candidate.paneIndex !== 'number' || candidate.paneIndex < 0 || candidate.paneIndex >= paneCount) {
          return false;
        }

        const requiredAnchors = getRequiredDrawingAnchorCount(candidate.kind);
        return candidate.anchors.length >= requiredAnchors;
      }
    )
    .map((drawing, index) => {
      const requiredAnchors = getRequiredDrawingAnchorCount(drawing.kind);
      const anchors = drawing.anchors
        .slice(0, requiredAnchors)
        .filter(
          (anchor) =>
            Number.isFinite(anchor.logicalIndex) &&
            Number.isFinite(anchor.price)
        )
        .map((anchor) => ({ logicalIndex: anchor.logicalIndex, price: anchor.price }));

      if (anchors.length < requiredAnchors) return null;

      const timestamp = Number.isFinite(drawing.createdAt) ? drawing.createdAt! : Date.now();
      return {
        id: typeof drawing.id === 'string' && drawing.id.length > 0 ? drawing.id : `${drawing.kind}-${timestamp}-${index}`,
        kind: drawing.kind,
        paneIndex: drawing.paneIndex,
        anchors,
        locked: drawing.locked === true,
        visible: drawing.visible !== false,
        color: typeof drawing.color === 'string' ? drawing.color : DRAWING_DEFAULT_COLOR,
        opacity: Number.isFinite(drawing.opacity) ? clamp(drawing.opacity!, 0.1, 1) : DRAWING_DEFAULT_OPACITY,
        lineWidth: Number.isFinite(drawing.lineWidth) ? clamp(drawing.lineWidth!, 1, 6) : 2,
        lineStyle: isDrawingLineStyle(drawing.lineStyle) ? drawing.lineStyle : DRAWING_DEFAULT_LINE_STYLE,
        extend: isDrawingExtendMode(drawing.extend) ? drawing.extend : 'none',
        leftEnd: isDrawingArrowEnd(drawing.leftEnd) ? drawing.leftEnd : 'none',
        rightEnd: isDrawingArrowEnd(drawing.rightEnd) ? drawing.rightEnd : 'none',
        text: typeof drawing.text === 'string' ? drawing.text.slice(0, 120) : '',
        showText: drawing.showText === true,
        textColor: typeof drawing.textColor === 'string' ? drawing.textColor : DRAWING_DEFAULT_TEXT_COLOR,
        textSize: Number.isFinite(drawing.textSize) ? clamp(drawing.textSize!, 10, 20) : 12,
        textBold: drawing.textBold === true,
        textItalic: drawing.textItalic === true,
        textAlignment: isDrawingTextAlignment(drawing.textAlignment) ? drawing.textAlignment : 'center',
        textVerticalAlignment: isDrawingTextVerticalAlignment(drawing.textVerticalAlignment)
          ? drawing.textVerticalAlignment
          : 'top',
        showMiddlePoint: drawing.showMiddlePoint === true,
        showPriceLabels: drawing.showPriceLabels === true,
        fibLevels: sanitizeFibLevels(drawing.fibLevels, drawing.kind),
        fibShowLevelLabels: drawing.fibShowLevelLabels !== false,
        fibShowPriceLabels: drawing.fibShowPriceLabels !== false,
        fibBackground: drawing.fibBackground !== false,
        fibReverse: drawing.fibReverse === true,
        stats: sanitizeDrawingStats(drawing.stats),
        timeframeVisibility: sanitizeDrawingTimeframeVisibility(drawing.timeframeVisibility),
        alertEnabled: drawing.alertEnabled === true,
        alertCondition: isDrawingAlertCondition(drawing.alertCondition) ? drawing.alertCondition : 'crossing',
        alertFrequency: isDrawingAlertFrequency(drawing.alertFrequency) ? drawing.alertFrequency : 'only-once',
        alertMessage: typeof drawing.alertMessage === 'string' ? drawing.alertMessage.slice(0, 160) : '',
        visibility: isDrawingVisibilityMode(drawing.visibility) ? drawing.visibility : 'all',
        syncInLayout: drawing.syncInLayout === true,
        syncGlobally: drawing.syncGlobally === true,
        createdAt: timestamp,
        updatedAt: Number.isFinite(drawing.updatedAt) ? drawing.updatedAt! : timestamp,
      };
    })
    .filter((drawing): drawing is ChartDrawing => drawing !== null);
};
const getDistanceToSegment = (
  x: number,
  y: number,
  start: { x: number; y: number },
  end: { x: number; y: number }
) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(x - start.x, y - start.y);

  const t = clamp(((x - start.x) * dx + (y - start.y) * dy) / lengthSquared, 0, 1);
  return Math.hypot(x - (start.x + t * dx), y - (start.y + t * dy));
};
const getRayBoundaryPoint = (
  start: { x: number; y: number },
  control: { x: number; y: number },
  chartArea: ChartCanvasArea
) => {
  const dx = control.x - start.x;
  const dy = control.y - start.y;
  if (Math.hypot(dx, dy) < 0.01) return control;

  const right = chartArea.left + chartArea.width;
  const bottom = chartArea.top + chartArea.height;
  const candidates = [
    dx > 0 ? (right - start.x) / dx : dx < 0 ? (chartArea.left - start.x) / dx : Number.POSITIVE_INFINITY,
    dy > 0 ? (bottom - start.y) / dy : dy < 0 ? (chartArea.top - start.y) / dy : Number.POSITIVE_INFINITY,
  ].filter((value) => Number.isFinite(value) && value >= 1);
  const t = candidates.length > 0 ? Math.min(...candidates) : 1;

  return {
    x: start.x + dx * t,
    y: start.y + dy * t,
  };
};
const getRenderedDrawingLinePoints = (
  drawing: ChartDrawing,
  start: { x: number; y: number },
  second: { x: number; y: number },
  chartArea: ChartCanvasArea
) => {
  if (drawing.kind === 'ray') {
    return {
      start,
      end: getRayBoundaryPoint(start, second, chartArea),
    };
  }

  if (drawing.kind === 'trend-line') {
    return {
      start:
        drawing.extend === 'left' || drawing.extend === 'both'
          ? getRayBoundaryPoint(second, start, chartArea)
          : start,
      end:
        drawing.extend === 'right' || drawing.extend === 'both'
          ? getRayBoundaryPoint(start, second, chartArea)
          : second,
    };
  }

  if (drawing.kind === 'extended-line') {
    return {
      start: getRayBoundaryPoint(second, start, chartArea),
      end: getRayBoundaryPoint(start, second, chartArea),
    };
  }

  return { start, end: second };
};
const getProjectedChannelOffset = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  control: { x: number; y: number }
) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < 0.01) {
    return { x: control.x - start.x, y: control.y - start.y };
  }

  const projection = ((control.x - start.x) * dx + (control.y - start.y) * dy) / lengthSquared;
  const projectedPoint = {
    x: start.x + dx * projection,
    y: start.y + dy * projection,
  };

  return {
    x: control.x - projectedPoint.x,
    y: control.y - projectedPoint.y,
  };
};
const getDrawingRenderedSegments = (
  drawing: ChartDrawing,
  points: Array<{ x: number; y: number }>,
  chartArea: ChartCanvasArea
): DrawingRenderedSegment[] => {
  const start = points[0];
  if (!start) return [];

  if (isFibDrawingTool(drawing.kind) || isPatternDrawingTool(drawing.kind)) return [];

  const right = chartArea.left + chartArea.width;
  const bottom = chartArea.top + chartArea.height;

  if (drawing.kind === 'horizontal-line') {
    return [{ start: { x: chartArea.left, y: start.y }, end: { x: right, y: start.y } }];
  }

  if (drawing.kind === 'horizontal-ray') {
    return [{ start, end: { x: right, y: start.y } }];
  }

  if (drawing.kind === 'vertical-line') {
    return [{ start: { x: start.x, y: chartArea.top }, end: { x: start.x, y: bottom } }];
  }

  if (drawing.kind === 'cross-line') {
    return [
      { start: { x: chartArea.left, y: start.y }, end: { x: right, y: start.y } },
      { start: { x: start.x, y: chartArea.top }, end: { x: start.x, y: bottom } },
    ];
  }

  const second = points[1];
  if (!second) return [];

  if (isTwoAnchorDrawingTool(drawing.kind)) {
    return [getRenderedDrawingLinePoints(drawing, start, second, chartArea)];
  }

  if (drawing.kind === 'flat-top-bottom') {
    const third = points[2];
    if (!third) return [];

    const leftX = clamp(Math.min(start.x, second.x), chartArea.left, right);
    const rightX = clamp(Math.max(start.x, second.x), chartArea.left, right);
    const topY = Math.min(start.y, third.y);
    const bottomY = Math.max(start.y, third.y);

    return [
      { start: { x: leftX, y: topY }, end: { x: rightX, y: topY } },
      { start: { x: leftX, y: bottomY }, end: { x: rightX, y: bottomY } },
      { start: { x: leftX, y: topY }, end: { x: leftX, y: bottomY }, muted: true },
      { start: { x: rightX, y: topY }, end: { x: rightX, y: bottomY }, muted: true },
    ];
  }

  if (drawing.kind === 'disjoint-channel') {
    const third = points[2];
    const fourth = points[3];
    if (!third || !fourth) return [];

    return [
      { start, end: second },
      { start: third, end: fourth },
      { start, end: third, muted: true },
      { start: second, end: fourth, muted: true },
    ];
  }

  const third = points[2];
  if (!third) return [];

  const offset = getProjectedChannelOffset(start, second, third);
  const upperStart = { x: start.x + offset.x, y: start.y + offset.y };
  const upperEnd = { x: second.x + offset.x, y: second.y + offset.y };

  if (drawing.kind === 'regression-trend') {
    const lowerStart = { x: start.x - offset.x, y: start.y - offset.y };
    const lowerEnd = { x: second.x - offset.x, y: second.y - offset.y };

    return [
      { start, end: second },
      { start: upperStart, end: upperEnd },
      { start: lowerStart, end: lowerEnd },
    ];
  }

  return [
    { start, end: second },
    { start: upperStart, end: upperEnd },
    { start: { x: (start.x + upperStart.x) / 2, y: (start.y + upperStart.y) / 2 }, end: { x: (second.x + upperEnd.x) / 2, y: (second.y + upperEnd.y) / 2 }, muted: true },
  ];
};
const createPaneHoverState = (): PaneHoverState => ({
  mousePos: null,
  pointerArea: 'outside',
  pointerX: null,
  pointerY: null,
  drawingHoverTarget: null,
});
const createChartPaneState = (
  symbol = DEFAULT_ACCOUNT_LAYOUT_SYMBOL,
  timeframe = DEFAULT_ACCOUNT_LAYOUT_TIMEFRAME
): ChartPaneState => ({
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
  const symbol =
    typeof snapshot?.symbol === 'string' && snapshot.symbol.length > 0
      ? snapshot.symbol
      : DEFAULT_ACCOUNT_LAYOUT_SYMBOL;
  const timeframe =
    typeof snapshot?.timeframe === 'string' && snapshot.timeframe.length > 0
      ? snapshot.timeframe
      : DEFAULT_ACCOUNT_LAYOUT_TIMEFRAME;

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

interface FibModelPoint {
  x: number;
  y: number;
}
interface FibModelLabel {
  text: string;
  x: number;
  y: number;
  align: CanvasTextAlign;
  baseline: CanvasTextBaseline;
  color: string;
}
interface FibModelLine {
  start: FibModelPoint;
  end: FibModelPoint;
  color: string;
  dashed?: boolean;
  muted?: boolean;
}
interface FibModelPolygon {
  points: FibModelPoint[];
  color: string;
}
interface FibModelArc {
  cx: number;
  cy: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  color: string;
}
interface FibModelBand {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  color: string;
}
interface FibModelPolyline {
  points: FibModelPoint[];
  color: string;
}
interface FibRenderModel {
  connectors: FibModelLine[];
  lines: FibModelLine[];
  polygons: FibModelPolygon[];
  arcs: FibModelArc[];
  bands: FibModelBand[];
  polylines: FibModelPolyline[];
  labels: FibModelLabel[];
}

const FIB_GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;
const createEmptyFibModel = (): FibRenderModel => ({
  connectors: [],
  lines: [],
  polygons: [],
  arcs: [],
  bands: [],
  polylines: [],
  labels: [],
});
const buildFibLevelLabelText = (drawing: ChartDrawing, value: number, price: number | null) => {
  if (!drawing.fibShowLevelLabels) return null;

  const valueText = formatFibLevelValue(value);
  return price !== null && drawing.fibShowPriceLabels ? `${valueText}(${formatPrice(price)})` : valueText;
};
const getSortedEnabledFibLevels = (drawing: ChartDrawing) =>
  drawing.fibLevels.filter((level) => level.enabled).slice().sort((first, second) => first.value - second.value);
const getFibRenderModel = (
  drawing: ChartDrawing,
  points: FibModelPoint[],
  chartArea: ChartCanvasArea
): FibRenderModel => {
  const model = createEmptyFibModel();
  const first = points[0];
  const second = points[1];
  if (!first || !second) return model;

  const chartLeft = chartArea.left;
  const chartRight = chartArea.left + chartArea.width;
  const chartTop = chartArea.top;
  const chartBottom = chartArea.top + chartArea.height;
  const enabledLevels = getSortedEnabledFibLevels(drawing);
  const anchors = drawing.anchors;
  const firstPrice = anchors[0]?.price ?? 0;
  const secondPrice = anchors[1]?.price ?? 0;
  const extendLeft = drawing.extend === 'left' || drawing.extend === 'both';
  const extendRight = drawing.extend === 'right' || drawing.extend === 'both';
  const pushHorizontalLevelLabel = (text: string | null, xLeft: number, y: number, color: string) => {
    if (!text) return;

    if (xLeft - chartLeft < 84) {
      model.labels.push({ text, x: xLeft + 6, y: y - 4, align: 'left', baseline: 'bottom', color });
    } else {
      model.labels.push({ text, x: xLeft - 8, y, align: 'right', baseline: 'middle', color });
    }
  };
  const pushHorizontalLevels = (
    levelOrigin: FibModelPoint,
    priceOrigin: number,
    deltaY: number,
    deltaPrice: number,
    xLeftRaw: number,
    xRightRaw: number
  ) => {
    const xLeft = extendLeft ? chartLeft : Math.min(xLeftRaw, xRightRaw);
    const xRight = extendRight ? chartRight : Math.max(xLeftRaw, xRightRaw);
    const levelLines = enabledLevels.map((level) => ({
      level,
      y: levelOrigin.y + deltaY * level.value,
      price: priceOrigin + deltaPrice * level.value,
    }));

    levelLines.forEach((line) => {
      model.lines.push({
        start: { x: xLeft, y: line.y },
        end: { x: xRight, y: line.y },
        color: line.level.color,
      });
      pushHorizontalLevelLabel(buildFibLevelLabelText(drawing, line.level.value, line.price), xLeft, line.y, line.level.color);
    });

    if (drawing.fibBackground) {
      for (let index = 0; index < levelLines.length - 1; index += 1) {
        const current = levelLines[index]!;
        const next = levelLines[index + 1]!;
        model.polygons.push({
          points: [
            { x: xLeft, y: current.y },
            { x: xRight, y: current.y },
            { x: xRight, y: next.y },
            { x: xLeft, y: next.y },
          ],
          color: next.level.color,
        });
      }
    }
  };
  const pushVerticalLevels = (origin: FibModelPoint, unit: number) => {
    if (Math.abs(unit) < 0.01) return;

    enabledLevels.forEach((level) => {
      const x = origin.x + unit * level.value;
      if (x < chartLeft - 1 || x > chartRight + 1) return;

      model.lines.push({
        start: { x, y: chartTop },
        end: { x, y: chartBottom },
        color: level.color,
      });
      if (drawing.fibShowLevelLabels) {
        model.labels.push({
          text: formatFibLevelValue(level.value),
          x: x + 4,
          y: chartBottom - 6,
          align: 'left',
          baseline: 'bottom',
          color: level.color,
        });
      }
    });
  };

  if (drawing.kind === 'fib-retracement') {
    const zeroPoint = drawing.fibReverse ? first : second;
    const onePoint = drawing.fibReverse ? second : first;
    const zeroPrice = drawing.fibReverse ? firstPrice : secondPrice;
    const onePrice = drawing.fibReverse ? secondPrice : firstPrice;

    model.connectors.push({ start: first, end: second, color: drawing.color, dashed: true, muted: true });
    pushHorizontalLevels(
      zeroPoint,
      zeroPrice,
      onePoint.y - zeroPoint.y,
      onePrice - zeroPrice,
      Math.min(first.x, second.x),
      Math.max(first.x, second.x)
    );
    return model;
  }

  if (drawing.kind === 'fib-extension') {
    const third = points[2];
    const thirdPrice = anchors[2]?.price ?? 0;
    if (!third) return model;

    const moveStart = drawing.fibReverse ? second : first;
    const moveEnd = drawing.fibReverse ? first : second;
    const moveStartPrice = drawing.fibReverse ? secondPrice : firstPrice;
    const moveEndPrice = drawing.fibReverse ? firstPrice : secondPrice;

    model.connectors.push({ start: first, end: second, color: drawing.color, dashed: true, muted: true });
    model.connectors.push({ start: second, end: third, color: drawing.color, dashed: true, muted: true });
    pushHorizontalLevels(
      third,
      thirdPrice,
      moveEnd.y - moveStart.y,
      moveEndPrice - moveStartPrice,
      third.x,
      third.x + (second.x - first.x)
    );
    return model;
  }

  if (drawing.kind === 'fib-channel') {
    const third = points[2];
    if (!third) return model;

    const offset = getProjectedChannelOffset(first, second, third);
    const levelEnds = enabledLevels.map((level) => {
      const startPoint = { x: first.x + offset.x * level.value, y: first.y + offset.y * level.value };
      const endPoint = { x: second.x + offset.x * level.value, y: second.y + offset.y * level.value };
      return { level, startPoint, endPoint };
    });

    levelEnds.forEach(({ level, startPoint, endPoint }) => {
      const renderStart = extendLeft ? getRayBoundaryPoint(endPoint, startPoint, chartArea) : startPoint;
      const renderEnd = extendRight ? getRayBoundaryPoint(startPoint, endPoint, chartArea) : endPoint;
      model.lines.push({ start: renderStart, end: renderEnd, color: level.color });
      if (drawing.fibShowLevelLabels) {
        const labelPoint = renderStart.x <= renderEnd.x ? renderStart : renderEnd;
        model.labels.push({
          text: formatFibLevelValue(level.value),
          x: Math.max(labelPoint.x - 8, chartLeft + 6),
          y: labelPoint.y,
          align: labelPoint.x - 8 <= chartLeft + 6 ? 'left' : 'right',
          baseline: 'middle',
          color: level.color,
        });
      }
    });

    if (drawing.fibBackground) {
      for (let index = 0; index < levelEnds.length - 1; index += 1) {
        const current = levelEnds[index]!;
        const next = levelEnds[index + 1]!;
        const currentStart = extendLeft ? getRayBoundaryPoint(current.endPoint, current.startPoint, chartArea) : current.startPoint;
        const currentEnd = extendRight ? getRayBoundaryPoint(current.startPoint, current.endPoint, chartArea) : current.endPoint;
        const nextStart = extendLeft ? getRayBoundaryPoint(next.endPoint, next.startPoint, chartArea) : next.startPoint;
        const nextEnd = extendRight ? getRayBoundaryPoint(next.startPoint, next.endPoint, chartArea) : next.endPoint;
        model.polygons.push({
          points: [currentStart, currentEnd, nextEnd, nextStart],
          color: next.level.color,
        });
      }
    }
    return model;
  }

  if (drawing.kind === 'fib-time-zone') {
    model.connectors.push({ start: first, end: second, color: drawing.color, dashed: true, muted: true });
    pushVerticalLevels(first, second.x - first.x);
    return model;
  }

  if (drawing.kind === 'fib-trend-time') {
    const third = points[2];
    if (!third) return model;

    model.connectors.push({ start: first, end: second, color: drawing.color, dashed: true, muted: true });
    model.connectors.push({ start: second, end: third, color: drawing.color, dashed: true, muted: true });
    pushVerticalLevels(third, second.x - first.x);
    return model;
  }

  if (drawing.kind === 'fib-speed-fan') {
    const spanX = second.x - first.x;
    const spanY = second.y - first.y;
    if (Math.abs(spanX) < 0.01 || Math.abs(spanY) < 0.01) {
      model.connectors.push({ start: first, end: second, color: drawing.color, dashed: true, muted: true });
      return model;
    }

    const gridColor = FIB_DEFAULT_TREND_COLOR;
    const yMin = Math.min(first.y, second.y);
    const yMax = Math.max(first.y, second.y);
    const xMin = Math.min(first.x, second.x);
    const xMax = Math.max(first.x, second.x);
    enabledLevels.forEach((level) => {
      const x = first.x + spanX * level.value;
      const y = first.y + spanY * level.value;
      model.lines.push({ start: { x, y: yMin }, end: { x, y: yMax }, color: gridColor, muted: true });
      model.lines.push({ start: { x: xMin, y }, end: { x: xMax, y }, color: gridColor, muted: true });
    });

    const priceFanTargets = enabledLevels.map((level) => ({
      level,
      point: { x: second.x, y: first.y + spanY * level.value },
    }));
    priceFanTargets.forEach(({ level, point }) => {
      model.lines.push({ start: first, end: point, color: level.color });
      if (drawing.fibShowLevelLabels) {
        model.labels.push({
          text: formatFibLevelValue(level.value),
          x: point.x + (spanX >= 0 ? 6 : -6),
          y: point.y,
          align: spanX >= 0 ? 'left' : 'right',
          baseline: 'middle',
          color: level.color,
        });
      }
    });
    enabledLevels.forEach((level) => {
      const point = { x: first.x + spanX * level.value, y: second.y };
      model.lines.push({ start: first, end: point, color: level.color });
      if (drawing.fibShowLevelLabels) {
        model.labels.push({
          text: formatFibLevelValue(level.value),
          x: point.x,
          y: point.y + (spanY >= 0 ? 6 : -6),
          align: 'center',
          baseline: spanY >= 0 ? 'top' : 'bottom',
          color: level.color,
        });
      }
    });

    if (drawing.fibBackground) {
      for (let index = 0; index < priceFanTargets.length - 1; index += 1) {
        const current = priceFanTargets[index]!;
        const next = priceFanTargets[index + 1]!;
        model.polygons.push({
          points: [first, current.point, next.point],
          color: next.level.color,
        });
      }
    }
    return model;
  }

  if (drawing.kind === 'fib-circles') {
    const cx = (first.x + second.x) / 2;
    const cy = (first.y + second.y) / 2;
    const baseRadius = Math.hypot(second.x - first.x, second.y - first.y) / 2;
    if (baseRadius < 0.5) return model;

    model.connectors.push({ start: first, end: second, color: drawing.color, dashed: true, muted: true });
    const radii = enabledLevels.map((level) => ({ level, radius: baseRadius * level.value }));
    radii.forEach(({ level, radius }) => {
      if (radius <= 0) return;

      model.arcs.push({ cx, cy, radius, startAngle: 0, endAngle: Math.PI * 2, color: level.color });
      if (drawing.fibShowLevelLabels) {
        model.labels.push({
          text: formatFibLevelValue(level.value),
          x: cx,
          y: cy + radius + 4,
          align: 'center',
          baseline: 'top',
          color: level.color,
        });
      }
    });

    if (drawing.fibBackground) {
      for (let index = 0; index < radii.length - 1; index += 1) {
        const current = radii[index]!;
        const next = radii[index + 1]!;
        model.bands.push({
          cx,
          cy,
          innerRadius: Math.max(0, current.radius),
          outerRadius: next.radius,
          startAngle: 0,
          endAngle: Math.PI * 2,
          color: next.level.color,
        });
      }
    }
    return model;
  }

  if (drawing.kind === 'fib-spiral') {
    const baseRadius = Math.hypot(second.x - first.x, second.y - first.y);
    model.connectors.push({ start: first, end: second, color: drawing.color, dashed: true, muted: true });
    if (baseRadius < 2) return model;

    const baseAngle = Math.atan2(second.y - first.y, second.x - first.x);
    const rotationDirection = drawing.fibReverse ? -1 : 1;
    const maxRadius = Math.hypot(chartArea.width, chartArea.height) * 1.2;
    const spiralPoints: FibModelPoint[] = [];
    for (let theta = -6 * Math.PI; theta <= 4 * Math.PI; theta += 0.06) {
      const radius = baseRadius * FIB_GOLDEN_RATIO ** (theta / (Math.PI / 2));
      if (radius > maxRadius) break;

      spiralPoints.push({
        x: first.x + Math.cos(baseAngle + rotationDirection * theta) * radius,
        y: first.y + Math.sin(baseAngle + rotationDirection * theta) * radius,
      });
    }
    model.polylines.push({ points: spiralPoints, color: drawing.color });
    return model;
  }

  if (drawing.kind === 'fib-arcs') {
    const baseRadius = Math.hypot(second.x - first.x, second.y - first.y);
    if (baseRadius < 0.5) return model;

    model.connectors.push({ start: first, end: second, color: drawing.color, dashed: true, muted: true });
    const faceAngle = Math.atan2(first.y - second.y, first.x - second.x);
    const startAngle = faceAngle - Math.PI / 2;
    const endAngle = faceAngle + Math.PI / 2;
    const radii = enabledLevels.map((level) => ({ level, radius: baseRadius * level.value }));
    radii.forEach(({ level, radius }) => {
      if (radius <= 0) return;

      model.arcs.push({ cx: second.x, cy: second.y, radius, startAngle, endAngle, color: level.color });
      if (drawing.fibShowLevelLabels) {
        model.labels.push({
          text: formatFibLevelValue(level.value),
          x: second.x + Math.cos(faceAngle) * radius,
          y: second.y + Math.sin(faceAngle) * radius - 4,
          align: 'center',
          baseline: 'bottom',
          color: level.color,
        });
      }
    });

    if (drawing.fibBackground) {
      for (let index = 0; index < radii.length - 1; index += 1) {
        const current = radii[index]!;
        const next = radii[index + 1]!;
        model.bands.push({
          cx: second.x,
          cy: second.y,
          innerRadius: Math.max(0, current.radius),
          outerRadius: next.radius,
          startAngle,
          endAngle,
          color: next.level.color,
        });
      }
    }
    return model;
  }

  if (drawing.kind === 'fib-wedge') {
    const third = points[2];
    if (!third) return model;

    const radius = Math.hypot(second.x - first.x, second.y - first.y);
    if (radius < 0.5) return model;

    const firstRayAngle = Math.atan2(second.y - first.y, second.x - first.x);
    const secondRayAngleRaw = Math.atan2(third.y - first.y, third.x - first.x);
    let sweep = secondRayAngleRaw - firstRayAngle;
    while (sweep > Math.PI) sweep -= Math.PI * 2;
    while (sweep < -Math.PI) sweep += Math.PI * 2;
    const startAngle = sweep >= 0 ? firstRayAngle : firstRayAngle + sweep;
    const endAngle = sweep >= 0 ? firstRayAngle + sweep : firstRayAngle;

    model.lines.push({ start: first, end: second, color: drawing.color });
    model.lines.push({
      start: first,
      end: { x: first.x + Math.cos(secondRayAngleRaw) * radius, y: first.y + Math.sin(secondRayAngleRaw) * radius },
      color: drawing.color,
    });

    const radii = enabledLevels.map((level) => ({ level, radius: radius * level.value }));
    radii.forEach((entry) => {
      if (entry.radius <= 0) return;

      model.arcs.push({
        cx: first.x,
        cy: first.y,
        radius: entry.radius,
        startAngle,
        endAngle,
        color: entry.level.color,
      });
      if (drawing.fibShowLevelLabels) {
        const labelDistance = entry.radius + 8;
        model.labels.push({
          text: formatFibLevelValue(entry.level.value),
          x: first.x + Math.cos(secondRayAngleRaw) * labelDistance,
          y: first.y + Math.sin(secondRayAngleRaw) * labelDistance,
          align: 'center',
          baseline: 'middle',
          color: entry.level.color,
        });
      }
    });

    if (drawing.fibBackground) {
      for (let index = 0; index < radii.length - 1; index += 1) {
        const current = radii[index]!;
        const next = radii[index + 1]!;
        model.bands.push({
          cx: first.x,
          cy: first.y,
          innerRadius: Math.max(0, current.radius),
          outerRadius: next.radius,
          startAngle,
          endAngle,
          color: next.level.color,
        });
      }
    }
    return model;
  }

  return model;
};
const isAngleWithinFibArc = (angle: number, startAngle: number, endAngle: number) => {
  const sweep = endAngle - startAngle;
  if (sweep >= Math.PI * 2 - 0.0001) return true;

  const normalized = ((angle - startAngle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  return normalized <= sweep;
};
const hitTestFibRenderModel = (model: FibRenderModel, x: number, y: number, tolerance: number) => {
  if (
    [...model.lines, ...model.connectors].some(
      (line) => getDistanceToSegment(x, y, line.start, line.end) <= tolerance
    )
  ) {
    return true;
  }

  if (
    model.arcs.some((arc) => {
      const distance = Math.hypot(x - arc.cx, y - arc.cy);
      if (Math.abs(distance - arc.radius) > tolerance) return false;

      return isAngleWithinFibArc(Math.atan2(y - arc.cy, x - arc.cx), arc.startAngle, arc.endAngle);
    })
  ) {
    return true;
  }

  return model.polylines.some((polyline) => {
    for (let index = 0; index < polyline.points.length - 1; index += 1) {
      if (getDistanceToSegment(x, y, polyline.points[index]!, polyline.points[index + 1]!) <= tolerance) {
        return true;
      }
    }
    return false;
  });
};

interface PatternModelPolyline extends FibModelPolyline {
  muted?: boolean;
}
interface PatternRenderModel {
  lines: FibModelLine[];
  polygons: FibModelPolygon[];
  arcs: FibModelArc[];
  polylines: PatternModelPolyline[];
  labels: FibModelLabel[];
}

const PATTERN_CYCLE_REPEAT_LIMIT = 400;
const formatPatternRatio = (numerator: number, denominator: number): string | null => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (Math.abs(denominator) < 1e-9) return null;

  const ratio = Math.abs(numerator) / Math.abs(denominator);
  if (!Number.isFinite(ratio)) return null;

  return String(Math.round(ratio * 1000) / 1000);
};
const getPatternRenderModel = (
  drawing: ChartDrawing,
  points: FibModelPoint[],
  chartArea: ChartCanvasArea
): PatternRenderModel => {
  const model: PatternRenderModel = { lines: [], polygons: [], arcs: [], polylines: [], labels: [] };
  const color = drawing.color;
  const anchors = drawing.anchors;
  const chartLeft = chartArea.left;
  const chartRight = chartArea.left + chartArea.width;
  const chartTop = chartArea.top;
  const chartBottom = chartArea.top + chartArea.height;
  const first = points[0];
  const second = points[1];
  if (!first) return model;

  const pushPointLabel = (index: number, text: string | null | undefined) => {
    const point = points[index];
    if (!point || !text) return;

    const previous = points[index - 1];
    const next = points[index + 1];
    const neighborYs = [previous?.y, next?.y].filter((value): value is number => Number.isFinite(value));
    const above =
      neighborYs.length > 0
        ? neighborYs.reduce((sum, value) => sum + value, 0) / neighborYs.length >= point.y
        : true;
    model.labels.push({
      text,
      x: point.x,
      y: above ? point.y - 9 : point.y + 9,
      align: 'center',
      baseline: above ? 'bottom' : 'top',
      color,
    });
  };
  const pushPointLabels = () => {
    const labels = PATTERN_POINT_LABELS[drawing.kind];
    if (!labels) return;

    labels.forEach((text, index) => pushPointLabel(index, text));
  };
  const pushZigzag = (zigzagPoints: FibModelPoint[], muted = false) => {
    if (zigzagPoints.length < 2) return;

    model.polylines.push({ points: zigzagPoints, color, muted });
  };
  const pushRatioLabel = (
    start: FibModelPoint,
    end: FibModelPoint,
    numerator: number | null,
    denominator: number | null
  ) => {
    if (numerator === null || denominator === null) return;

    const text = formatPatternRatio(numerator, denominator);
    if (!text) return;

    model.labels.push({
      text,
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2 - 5,
      align: 'center',
      baseline: 'bottom',
      color,
    });
  };
  const priceDelta = (firstIndex: number, secondIndex: number): number | null => {
    const firstAnchor = anchors[firstIndex];
    const secondAnchor = anchors[secondIndex];
    if (!firstAnchor || !secondAnchor) return null;

    return secondAnchor.price - firstAnchor.price;
  };

  switch (drawing.kind) {
    case 'xabcd-pattern':
    case 'cypher-pattern': {
      pushZigzag(points.slice(0, 5));
      const [pointX, pointA, pointB, pointC, pointD] = points;
      if (pointX && pointA && pointB) {
        model.lines.push({ start: pointX, end: pointB, color, dashed: true });
        model.polygons.push({ points: [pointX, pointA, pointB], color });
        pushRatioLabel(pointX, pointB, priceDelta(1, 2), priceDelta(0, 1));
      }
      if (pointB && pointC && pointD) {
        model.lines.push({ start: pointB, end: pointD, color, dashed: true });
        model.polygons.push({ points: [pointB, pointC, pointD], color });
        pushRatioLabel(pointB, pointD, priceDelta(3, 4), priceDelta(2, 3));
      }
      pushPointLabels();
      break;
    }
    case 'abcd-pattern': {
      const [pointA, pointB, pointC, pointD] = points;
      if (pointA && pointB) model.lines.push({ start: pointA, end: pointB, color });
      if (pointB && pointC) {
        model.lines.push({ start: pointB, end: pointC, color, dashed: true });
        pushRatioLabel(pointB, pointC, priceDelta(1, 2), priceDelta(0, 1));
      }
      if (pointC && pointD) model.lines.push({ start: pointC, end: pointD, color });
      pushPointLabels();
      break;
    }
    case 'triangle-pattern': {
      const [pointA, pointB, pointC, pointD] = points;
      if (pointA && pointB && pointC && pointD) {
        const minX = Math.min(pointA.x, pointB.x, pointC.x, pointD.x);
        const maxX = Math.max(pointA.x, pointB.x, pointC.x, pointD.x);
        const lineYAt = (start: FibModelPoint, end: FibModelPoint, x: number) => {
          const run = end.x - start.x;
          if (Math.abs(run) < 0.01) return start.y;

          return start.y + ((end.y - start.y) / run) * (x - start.x);
        };
        const upperStart = { x: minX, y: lineYAt(pointA, pointC, minX) };
        const upperEnd = { x: maxX, y: lineYAt(pointA, pointC, maxX) };
        const lowerStart = { x: minX, y: lineYAt(pointB, pointD, minX) };
        const lowerEnd = { x: maxX, y: lineYAt(pointB, pointD, maxX) };
        model.polygons.push({ points: [upperStart, upperEnd, lowerEnd, lowerStart], color });
        model.lines.push({ start: upperStart, end: upperEnd, color });
        model.lines.push({ start: lowerStart, end: lowerEnd, color });
        pushZigzag(points.slice(0, 4), true);
      } else {
        pushZigzag(points.slice(0, 4));
      }
      pushPointLabels();
      break;
    }
    case 'three-drives-pattern': {
      pushZigzag(points.slice(0, 7));
      pushPointLabels();
      break;
    }
    case 'head-and-shoulders': {
      pushZigzag(points.slice(0, 7));
      const leftTrough = points[2];
      const rightTrough = points[4];
      if (leftTrough && rightTrough) {
        const minX = Math.min(...points.map((point) => point.x));
        const maxX = Math.max(...points.map((point) => point.x));
        const run = rightTrough.x - leftTrough.x;
        const slope = Math.abs(run) < 0.01 ? 0 : (rightTrough.y - leftTrough.y) / run;
        const neckYAt = (x: number) => leftTrough.y + slope * (x - leftTrough.x);
        model.lines.push({
          start: { x: minX, y: neckYAt(minX) },
          end: { x: maxX, y: neckYAt(maxX) },
          color,
          dashed: true,
        });
        if (points.length >= 7) {
          model.polygons.push({ points: points.slice(0, 7), color });
        }
      }
      pushPointLabels();
      break;
    }
    case 'elliott-impulse-wave':
    case 'elliott-correction-wave':
    case 'elliott-triangle-wave':
    case 'elliott-double-combo-wave':
    case 'elliott-triple-combo-wave': {
      pushZigzag(points.slice(0, getRequiredDrawingAnchorCount(drawing.kind)));
      pushPointLabels();
      break;
    }
    case 'cyclic-lines': {
      if (!second) {
        model.lines.push({ start: { x: first.x, y: chartTop }, end: { x: first.x, y: chartBottom }, color });
        break;
      }

      const interval = second.x - first.x;
      if (Math.abs(interval) < 2) {
        model.lines.push({ start: { x: first.x, y: chartTop }, end: { x: first.x, y: chartBottom }, color });
        break;
      }

      const step = Math.abs(interval);
      const startX = Math.min(first.x, second.x);
      for (let index = 0; index < PATTERN_CYCLE_REPEAT_LIMIT; index += 1) {
        const x = startX + step * index;
        if (x > chartRight) break;
        if (x < chartLeft) continue;

        model.lines.push({ start: { x, y: chartTop }, end: { x, y: chartBottom }, color });
      }
      break;
    }
    case 'time-cycles': {
      if (!second) break;

      const width = Math.abs(second.x - first.x);
      if (width < 4) break;

      const baselineY = first.y;
      const startX = Math.min(first.x, second.x);
      for (let index = 0; index < PATTERN_CYCLE_REPEAT_LIMIT; index += 1) {
        const segmentLeft = startX + width * index;
        if (segmentLeft > chartRight) break;
        if (segmentLeft + width < chartLeft) continue;

        model.arcs.push({
          cx: segmentLeft + width / 2,
          cy: baselineY,
          radius: width / 2,
          startAngle: Math.PI,
          endAngle: Math.PI * 2,
          color,
        });
      }
      break;
    }
    case 'sine-line': {
      if (!second) break;

      const halfPeriod = second.x - first.x;
      if (Math.abs(halfPeriod) < 2) break;

      const midY = (first.y + second.y) / 2;
      const amplitude = (first.y - second.y) / 2;
      const sampleStep = 3;
      const wavePoints: FibModelPoint[] = [];
      for (let x = chartLeft; x <= chartRight; x += sampleStep) {
        wavePoints.push({ x, y: midY + amplitude * Math.cos((Math.PI * (x - first.x)) / halfPeriod) });
      }
      model.polylines.push({ points: wavePoints, color });
      break;
    }
    default:
      break;
  }

  return model;
};
const hitTestPatternRenderModel = (model: PatternRenderModel, x: number, y: number, tolerance: number) => {
  if (model.lines.some((line) => getDistanceToSegment(x, y, line.start, line.end) <= tolerance)) {
    return true;
  }

  if (
    model.arcs.some((arc) => {
      const distance = Math.hypot(x - arc.cx, y - arc.cy);
      if (Math.abs(distance - arc.radius) > tolerance) return false;

      return isAngleWithinFibArc(Math.atan2(y - arc.cy, x - arc.cx), arc.startAngle, arc.endAngle);
    })
  ) {
    return true;
  }

  return model.polylines.some((polyline) => {
    for (let index = 0; index < polyline.points.length - 1; index += 1) {
      if (getDistanceToSegment(x, y, polyline.points[index]!, polyline.points[index + 1]!) <= tolerance) {
        return true;
      }
    }
    return false;
  });
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
const createDefaultActiveIndicators = () =>
  DEFAULT_ACTIVE_INDICATORS.map((indicator) => ({
    ...indicator,
    settings: { ...indicator.settings },
  }));
const createDefaultSavedChartLayout = (timestamp = Date.now()): SavedChartLayout => {
  const pane = createChartPaneState(DEFAULT_ACCOUNT_LAYOUT_SYMBOL, DEFAULT_ACCOUNT_LAYOUT_TIMEFRAME);

  return {
    id: DEFAULT_ACCOUNT_LAYOUT_ID,
    name: DEFAULT_ACCOUNT_LAYOUT_NAME,
    createdAt: timestamp,
    updatedAt: timestamp,
    selectedLayoutId: DEFAULT_LAYOUT_ID,
    activePaneIndex: 0,
    chartStyle: 'candles',
    theme: DEFAULT_ACCOUNT_LAYOUT_THEME,
    layoutSync: { ...DEFAULT_LAYOUT_SYNC },
    chartSettings: { ...DEFAULT_CHART_SETTINGS },
    indicators: createDefaultActiveIndicators(),
    drawings: [],
    panes: [createSavedPaneSnapshot(pane)],
  };
};

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

const calculateMovingAverageValues = (values: number[], period: number, maType: IndicatorMaType) =>
  maType === 'SMA' ? simpleMovingAverageValues(values, period) : exponentialMovingAverageValues(values, period);

const calculateMovingAverageNullable = (values: Array<number | null>, period: number, maType: IndicatorMaType) =>
  maType === 'SMA' ? simpleMovingAverageNullable(values, period) : exponentialMovingAverageNullable(values, period);

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

const calculateMacdSeries = (
  values: number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number,
  oscillatorMaType: IndicatorMaType,
  signalMaType: IndicatorMaType
) => {
  const fast = calculateMovingAverageValues(values, fastPeriod, oscillatorMaType);
  const slow = calculateMovingAverageValues(values, slowPeriod, oscillatorMaType);
  const macd = values.map((_, index) =>
    fast[index] !== null && slow[index] !== null ? fast[index]! - slow[index]! : null
  );
  const signal = calculateMovingAverageNullable(macd, signalPeriod, signalMaType);
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
  const signalPeriod = sanitizePeriod(
    settings.signalPeriod,
    definition.defaults.signalPeriod ?? 9,
    1,
    definition.formula === 'macd' ? 50 : 500
  );
  const stdDev = clamp(settings.stdDev ?? definition.defaults.stdDev ?? 2, 0.1, 10);
  const oscillatorMaType = settings.oscillatorMaType ?? definition.defaults.oscillatorMaType ?? 'EMA';
  const signalMaType = settings.signalMaType ?? definition.defaults.signalMaType ?? 'EMA';
  const color = settings.color ?? definition.defaults.color ?? '#2962ff';
  const secondaryColor = settings.secondaryColor ?? definition.defaults.secondaryColor ?? '#ff6d00';
  const tertiaryColor = settings.tertiaryColor ?? definition.defaults.tertiaryColor ?? '#7c8da6';
  const histogramPositiveColor =
    settings.histogramPositiveColor ??
    definition.defaults.histogramPositiveColor ??
    settings.tertiaryColor ??
    definition.defaults.tertiaryColor ??
    '#26a69a';
  const histogramNegativeColor =
    settings.histogramNegativeColor ?? definition.defaults.histogramNegativeColor ?? '#ef5350';

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
    const macd = calculateMacdSeries(values, fastPeriod, slowPeriod, signalPeriod, oscillatorMaType, signalMaType);
    return {
      lines: [
        { label: 'MACD', color, values: macd.macd },
        { label: 'Signal', color: secondaryColor, values: macd.signal },
      ],
      histogram: macd.histogram,
      histogramPositive: histogramPositiveColor,
      histogramNegative: histogramNegativeColor,
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
  const signalPeriod = sanitizePeriod(
    settings.signalPeriod,
    definition.defaults.signalPeriod ?? 9,
    1,
    definition.formula === 'macd' ? 50 : 500
  );
  const stdDev = clamp(settings.stdDev ?? definition.defaults.stdDev ?? 2, 0.1, 10);

  if (definition.formula === 'volume') return `Vol · ${symbol.replace('USDT', '')}`;
  if (definition.formula === 'bb') return `BB ${period} SMA ${source} ${Number(stdDev.toFixed(2))}`;
  if (definition.formula === 'macd') return `MACD ${fastPeriod} ${slowPeriod} ${signalPeriod} ${source}`;
  if (definition.formula === 'vwap') return 'VWAP Session';
  if (definition.formula === 'donchian') return `DC ${period}`;
  if (definition.formula === 'stochastic') return `Stoch ${period} ${signalPeriod}`;
  if (definition.formula === 'atr') return `ATR ${period}`;
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

const getIndicatorLegendValues = ({
  indicator,
  definition,
  computed,
  legendIndex,
  legendCandle,
  defaultColor,
  positiveColor,
  negativeColor,
}: {
  indicator: ActiveIndicator;
  definition: IndicatorDefinition;
  computed: IndicatorComputedSeries | undefined;
  legendIndex: number;
  legendCandle: Candle | null;
  defaultColor: string;
  positiveColor: string;
  negativeColor: string;
}): IndicatorLegendValue[] => {
  if (definition.formula === 'volume') {
    const isPositiveVolume = !legendCandle || legendCandle.close >= legendCandle.open;

    return [
      {
        label: 'Volume',
        color: isPositiveVolume
          ? indicator.settings.color ?? definition.defaults.color ?? defaultColor
          : indicator.settings.secondaryColor ?? definition.defaults.secondaryColor ?? negativeColor,
        value: legendCandle?.volume ?? null,
      },
    ];
  }

  const values: IndicatorLegendValue[] =
    computed?.lines.map((line) => ({
      label: line.label,
      color: line.color,
      value: legendIndex >= 0 ? line.values[legendIndex] : null,
    })) ?? [];
  const histogramValue = legendIndex >= 0 ? computed?.histogram?.[legendIndex] : null;

  if (computed?.histogram) {
    values.push({
      label: 'Histogram',
      color:
        histogramValue !== null && histogramValue !== undefined && histogramValue < 0
          ? computed.histogramNegative ?? negativeColor
          : computed.histogramPositive ?? positiveColor,
      value: histogramValue,
    });
  }

  return values;
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
        <HeaderIcon name="indicators" />
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
  | 'indicators'
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
  indicators: (
    <>
      <path d="M3 13.5c1.8 0 2.4-7 4.4-7 2.5 0 2.3 7 4.8 7 2 0 2.6-5 4.8-5" />
      <circle cx="7.4" cy="6.5" r="1.1" />
      <circle cx="12.2" cy="13.5" r="1.1" />
      <path d="M3 16.5h14" />
    </>
  ),
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
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const socketRef = useRef<WebSocket | null>(null);
  const controlRackRef = useRef<HTMLDivElement>(null);
  const drawingToolsRef = useRef<HTMLDivElement>(null);
  const selectedDrawingToolbarRef = useRef<HTMLDivElement>(null);
  const symbolSearchInputRef = useRef<HTMLInputElement>(null);
  const indicatorLegendRef = useRef<HTMLDivElement>(null);
  const activeStreamsRef = useRef<Set<string>>(new Set());
  const paneStatesRef = useRef<ChartPaneState[]>([]);
  const chartBoundsRefs = useRef<ChartInteractionBounds[]>([createDefaultChartBounds()]);
  const dragStateRef = useRef<ChartDragState>(createDragState());
  const touchGestureRef = useRef<ChartTouchGestureState>(createTouchGestureState());
  const drawingDragRef = useRef<DrawingDragState>(createDrawingDragState());
  const drawingToolbarDragRef = useRef<DrawingToolbarDragState | null>(null);
  const drawingsRef = useRef<ChartDrawing[]>([]);
  const selectedDrawingIdRef = useRef<string | null>(null);
  const activePaneIndexRef = useRef(0);
  const indicatorSeriesCacheRef = useRef<PaneIndicatorSeriesCache[]>([]);
  const paneHoverStatesRef = useRef<PaneHoverState[]>([createPaneHoverState()]);
  const legendRenderFrameRef = useRef<number | undefined>(undefined);
  const authSessionRef = useRef<Session | null>(null);
  const isAuthenticatedRef = useRef(false);
  const wasAuthenticatedRef = useRef(false);
  const pendingAuthTrackingEventRef = useRef<UserTrackingEventType | null>(null);
  const trackedAuthEventsRef = useRef<Set<string>>(new Set());

  const [chartPanes, setChartPanes] = useState<ChartPaneState[]>(() => [
    createChartPaneState(DEFAULT_ACCOUNT_LAYOUT_SYMBOL, DEFAULT_ACCOUNT_LAYOUT_TIMEFRAME),
  ]);
  const [legendRenderVersion, setLegendRenderVersion] = useState(0);
  const [activePaneIndex, setActivePaneIndex] = useState(0);
  const [chartStyle, setChartStyle] = useState<ChartStyle>('candles');
  const [theme, setTheme] = useState<ThemeName>(DEFAULT_ACCOUNT_LAYOUT_THEME);
  const [cursorTool, setCursorTool] = useState<CursorToolId>('cross');
  const [favoriteCursorTools, setFavoriteCursorTools] = useState<Partial<Record<CursorToolId, boolean>>>({});
  const [valuesTooltipOnLongPress, setValuesTooltipOnLongPress] = useState(true);
  const [lastDrawingTool, setLastDrawingTool] = useState<DrawingToolId>('trend-line');
  const [lastFibTool, setLastFibTool] = useState<DrawingToolId>('fib-retracement');
  const [lastPatternTool, setLastPatternTool] = useState<DrawingToolId>('xabcd-pattern');
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingToolId | null>(null);
  const [activeDrawingMenu, setActiveDrawingMenu] = useState<DrawingMenuId | null>(null);
  const [drawingToolbarPosition, setDrawingToolbarPosition] = useState<DrawingToolbarPosition | null>(null);
  const [activeDrawingToolbarMenu, setActiveDrawingToolbarMenu] = useState<DrawingToolbarMenuId | null>(null);
  const [activeDrawingSettingsTab, setActiveDrawingSettingsTab] = useState<DrawingSettingsTab>('style');
  const [drawingStylePreset, setDrawingStylePreset] = useState<DrawingStylePreset>(DEFAULT_DRAWING_STYLE_PRESET);
  const [drawingToolbarStatus, setDrawingToolbarStatus] = useState('');
  const [drawings, setDrawings] = useState<ChartDrawing[]>([]);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [pendingDrawing, setPendingDrawing] = useState<PendingDrawing | null>(null);
  const [activeIndicators, setActiveIndicators] = useState<ActiveIndicator[]>(createDefaultActiveIndicators);
  const [settingsTarget, setSettingsTarget] = useState<IndicatorLegendTarget | null>(null);
  const [moreTarget, setMoreTarget] = useState<IndicatorLegendTarget | null>(null);
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [headerPanel, setHeaderPanel] = useState<HeaderPanelKey | null>(null);
  const [indicatorTemplates, setIndicatorTemplates] = useState<IndicatorTemplate[]>([]);
  const [templateName, setTemplateName] = useState('My indicator template');
  const [savedChartLayouts, setSavedChartLayouts] = useState<SavedChartLayout[]>(() => [
    createDefaultSavedChartLayout(),
  ]);
  const [layoutName, setLayoutName] = useState(DEFAULT_ACCOUNT_LAYOUT_NAME);
  const [activeSavedLayoutId, setActiveSavedLayoutId] = useState<string | null>(DEFAULT_ACCOUNT_LAYOUT_ID);
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
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [authForm, setAuthForm] = useState<AuthFormState>(DEFAULT_AUTH_FORM_STATE);
  const [authActionLabel, setAuthActionLabel] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authPasswordVisible, setAuthPasswordVisible] = useState(false);

  if (supabaseRef.current === null) {
    supabaseRef.current = createSupabaseBrowserClient();
  }

  const supabase = supabaseRef.current;
  const isAuthenticated = authUser !== null;
  const authUserLabel = authUser?.email ?? 'Account';
  isAuthenticatedRef.current = isAuthenticated;
  const trackAuthSessionEvent = (session: Session | null, eventType: UserTrackingEventType) => {
    if (!session?.access_token) return;

    const eventKey = `${eventType}:${session.access_token.slice(-32)}`;
    if (trackedAuthEventsRef.current.has(eventKey)) return;

    trackedAuthEventsRef.current.add(eventKey);
    void sendUserTrackingEvent(session, eventType);
  };
  const authPasswordSecurity = useMemo(
    () => getPasswordSecurityReport(authForm.password, authForm),
    [authForm]
  );
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
    const nextCache = chartPanes.map((pane, paneIndex) => {
      const cached = indicatorSeriesCacheRef.current[paneIndex];
      if (cached?.candles === pane.candles && cached.indicators === activeIndicators) {
        return cached;
      }

      return {
        candles: pane.candles,
        indicators: activeIndicators,
        seriesById: activeIndicators.reduce<Record<string, IndicatorComputedSeries>>((seriesById, indicator) => {
          seriesById[indicator.id] = computeIndicatorSeries(indicator, pane.candles);
          return seriesById;
        }, {}),
      };
    });

    indicatorSeriesCacheRef.current = nextCache;
    return nextCache.map((cache) => cache.seriesById);
  }, [activeIndicators, chartPanes]);
  paneStatesRef.current = chartPanes;
  drawingsRef.current = drawings;
  selectedDrawingIdRef.current = selectedDrawingId;
  activePaneIndexRef.current = activePaneIndex;
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
    paneHoverStatesRef.current = Array.from(
      { length: paneCount },
      (_unused, index) => paneHoverStatesRef.current[index] ?? createPaneHoverState()
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
    return () => {
      if (legendRenderFrameRef.current !== undefined) {
        window.cancelAnimationFrame(legendRenderFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;

    let isActive = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (isActive) {
        authSessionRef.current = data.session;
        setAuthUser(data.session?.user ?? null);
        trackAuthSessionEvent(data.session, 'session_seen');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      authSessionRef.current = session;
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        const trackingEvent =
          event === 'SIGNED_IN'
            ? pendingAuthTrackingEventRef.current ?? 'sign_in'
            : event === 'TOKEN_REFRESHED'
              ? 'token_refreshed'
              : event === 'INITIAL_SESSION'
                ? 'session_seen'
                : null;

        if (trackingEvent) {
          trackAuthSessionEvent(session, trackingEvent);
        }

        if (event === 'SIGNED_IN') {
          pendingAuthTrackingEventRef.current = null;
        }

        setAuthMode(null);
        setAuthActionLabel('');
        setAuthMessage('');
        setAuthForm(DEFAULT_AUTH_FORM_STATE);
        setAuthPasswordVisible(false);
      } else if (event === 'SIGNED_OUT') {
        authSessionRef.current = null;
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (headerPanel !== 'symbolSearch') return;

    window.requestAnimationFrame(() => {
      symbolSearchInputRef.current?.focus();
      symbolSearchInputRef.current?.select();
    });
  }, [headerPanel]);

  useEffect(() => {
    try {
      const rawFavorites = window.localStorage.getItem(CURSOR_FAVORITES_STORAGE_KEY);
      if (rawFavorites) {
        const parsedFavorites = JSON.parse(rawFavorites) as Partial<Record<CursorToolId, boolean>>;
        if (parsedFavorites && typeof parsedFavorites === 'object' && !Array.isArray(parsedFavorites)) {
          setFavoriteCursorTools(
            Object.fromEntries(
              Object.entries(parsedFavorites).filter(
                ([key, value]) => key in CURSOR_TOOL_LABELS && value === true
              )
            ) as Partial<Record<CursorToolId, boolean>>
          );
        }
      }

      const rawValuesTooltip = window.localStorage.getItem(VALUES_TOOLTIP_LONG_PRESS_STORAGE_KEY);
      if (rawValuesTooltip !== null) {
        setValuesTooltipOnLongPress(rawValuesTooltip === 'true');
      }
    } catch {
      setFavoriteCursorTools({});
    }
  }, []);

  const toggleCursorToolFavorite = (tool: CursorToolId) => {
    setFavoriteCursorTools((current) => {
      const next = { ...current, [tool]: current[tool] !== true };
      try {
        window.localStorage.setItem(CURSOR_FAVORITES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable
      }
      return next;
    });
  };

  const toggleValuesTooltipOnLongPress = () => {
    setValuesTooltipOnLongPress((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(VALUES_TOOLTIP_LONG_PRESS_STORAGE_KEY, String(next));
      } catch {
        // storage unavailable
      }
      return next;
    });
  };

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
    const seedDefaultSavedChartLayout = () => {
      const defaultLayout = createDefaultSavedChartLayout();
      const defaultLayouts = [defaultLayout];
      window.localStorage.setItem(CHART_LAYOUT_STORAGE_KEY, JSON.stringify(defaultLayouts));
      setSavedChartLayouts(defaultLayouts);
      setActiveSavedLayoutId(defaultLayout.id);
      setLayoutName(defaultLayout.name);
    };

    try {
      const rawLayouts = window.localStorage.getItem(CHART_LAYOUT_STORAGE_KEY);
      if (!rawLayouts) {
        seedDefaultSavedChartLayout();
        return;
      }

      const parsedLayouts = JSON.parse(rawLayouts) as SavedChartLayout[];
      if (!Array.isArray(parsedLayouts)) {
        seedDefaultSavedChartLayout();
        return;
      }

      const validLayouts = parsedLayouts
        .filter(
          (layout) =>
            typeof layout.id === 'string' &&
            typeof layout.name === 'string' &&
            typeof layout.selectedLayoutId === 'string' &&
            Array.isArray(layout.panes) &&
            Array.isArray(layout.indicators)
        )
        .slice(0, MAX_SAVED_CHART_LAYOUTS);

      setSavedChartLayouts(validLayouts);
      setActiveSavedLayoutId((current) =>
        current && validLayouts.some((layout) => layout.id === current) ? current : null
      );
    } catch {
      seedDefaultSavedChartLayout();
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

  const getPaneHoverState = (paneIndex: number) =>
    paneHoverStatesRef.current[paneIndex] ?? createPaneHoverState();

  const requestLegendRender = () => {
    if (legendRenderFrameRef.current !== undefined) return;

    legendRenderFrameRef.current = window.requestAnimationFrame(() => {
      legendRenderFrameRef.current = undefined;
      setLegendRenderVersion((current) => current + 1);
    });
  };

  const resetPaneHoverState = (paneIndex: number) => {
    const current = getPaneHoverState(paneIndex);
    paneHoverStatesRef.current[paneIndex] = createPaneHoverState();

    if (current.mousePos || current.pointerArea !== 'outside') {
      requestLegendRender();
    }
  };

  const resetPaneHoverStates = (shouldReset: (pane: ChartPaneState, index: number) => boolean) => {
    chartPanes.forEach((pane, index) => {
      if (shouldReset(pane, index)) {
        resetPaneHoverState(index);
      }
    });
  };

  const getCurrentHoverMousePosition = (paneIndex: number): MousePosition | null => {
    const hoverState = getPaneHoverState(paneIndex);
    if (hoverState.pointerX === null || hoverState.pointerY === null) {
      return hoverState.mousePos;
    }

    const snappedCrosshair = getSnappedCrosshairPosition(paneIndex, hoverState.pointerX);
    const currentPriceRange = getCurrentPriceRange(paneIndex);

    return {
      x: snappedCrosshair.x,
      y: hoverState.pointerY,
      dataY: currentPriceRange ? getPriceAtY(paneIndex, hoverState.pointerY, currentPriceRange) : 0,
      logicalIndex: snappedCrosshair.logicalIndex,
    };
  };

  const getHoverLegendIndex = (paneIndex: number, pane: ChartPaneState, mousePos: MousePosition | null) => {
    if (!mousePos || pane.candles.length === 0) return null;

    const { chartArea, crosshairAreas } = chartBoundsRefs.current[paneIndex] ?? createDefaultChartBounds();
    const paneAreas = crosshairAreas.length > 0 ? crosshairAreas : [chartArea];
    const mouseInsideCrosshairArea =
      mousePos.x >= chartArea.left &&
      mousePos.x <= chartArea.left + chartArea.width &&
      paneAreas.some(
        (area) =>
          mousePos.y >= area.top &&
          mousePos.y <= area.top + area.height
      );

    return mouseInsideCrosshairArea
      ? Math.floor(clamp(mousePos.logicalIndex, 0, pane.candles.length - 1))
      : null;
  };

  const getCursorToolCanvasCursor = () =>
    CURSOR_TOOL_CANVAS_CURSORS[isAuthenticated ? cursorTool : 'cross'];

  const getCanvasCursorForState = (
    dragMode: ChartDragMode,
    pointerArea: ChartPointerArea,
    drawingHoverTarget: DrawingHoverTarget = null
  ) => {
    const eraserActive = isAuthenticated && cursorTool === 'eraser';

    return dragMode === 'price-scale'
      ? 'ns-resize'
      : dragMode === 'chart-pan'
        ? 'grabbing'
        : drawingHoverTarget && eraserActive
          ? getCursorToolCanvasCursor()
        : drawingHoverTarget === 'body'
          ? 'grab'
          : drawingHoverTarget
            ? 'pointer'
        : pointerArea === 'price-scale'
          ? 'ns-resize'
          : pointerArea === 'time-scale'
            ? 'ew-resize'
            : getCursorToolCanvasCursor();
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

  const moveIndicator = (indicatorId: string, direction: -1 | 1, visualGroupIds?: string[]) => {
    setActiveIndicators((current) => {
      const orderedGroupIds = (visualGroupIds && visualGroupIds.length > 0 ? visualGroupIds : current.map((indicator) => indicator.id))
        .filter((id) => current.some((indicator) => indicator.id === id));
      const groupIndex = orderedGroupIds.indexOf(indicatorId);
      const targetId = orderedGroupIds[groupIndex + direction];
      if (groupIndex < 0 || !targetId) return current;

      const index = current.findIndex((indicator) => indicator.id === indicatorId);
      const targetIndex = current.findIndex((indicator) => indicator.id === targetId);
      if (index < 0 || targetIndex < 0) return current;

      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex]!, next[index]!];
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

      if (!drawingToolsRef.current?.contains(target)) {
        setActiveDrawingMenu(null);
      }

      if (!indicatorLegendRef.current?.contains(target)) {
        setSettingsTarget(null);
        setMoreTarget(null);
      }

      if (!selectedDrawingToolbarRef.current?.contains(target)) {
        setActiveDrawingToolbarMenu(null);
        setDrawingToolbarStatus('');
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const editableTarget = isEditableKeyboardTarget(event.target);

      if (event.key === 'Escape') {
        setOpenMenu(null);
        setHeaderPanel(null);
        setAuthMode(null);
        setQuickSearchQuery('');
        setSnapshotStatus('');
        setAuthActionLabel('');
        setAuthMessage('');
        setActiveDrawingTool(null);
        setActiveDrawingMenu(null);
        setActiveDrawingToolbarMenu(null);
        setDrawingToolbarStatus('');
        setPendingDrawing(null);
        setSelectedDrawingId(null);
        drawingDragRef.current = createDrawingDragState(activePaneIndex);
      }

      if (
        event.code === 'KeyF' &&
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        isAuthenticatedRef.current &&
        !editableTarget
      ) {
        setOpenMenu(null);
        setHeaderPanel(null);
        setSettingsTarget(null);
        setMoreTarget(null);
        setActiveDrawingToolbarMenu(null);
        setDrawingToolbarStatus('');
        setActiveDrawingMenu(null);
        setPendingDrawing(null);
        drawingDragRef.current = createDrawingDragState(activePaneIndexRef.current);
        setSelectedDrawingId(null);
        setLastFibTool('fib-retracement');
        setActiveDrawingTool((current) => (current === 'fib-retracement' ? null : 'fib-retracement'));
        event.preventDefault();
        return;
      }

      const drawingShortcutTool = DRAWING_TOOL_SHORTCUTS[event.key.toLowerCase()];
      if (
        drawingShortcutTool &&
        isAuthenticatedRef.current &&
        !editableTarget &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        setOpenMenu(null);
        setHeaderPanel(null);
        setSettingsTarget(null);
        setMoreTarget(null);
        setActiveDrawingToolbarMenu(null);
        setDrawingToolbarStatus('');
        setActiveDrawingMenu(null);
        setPendingDrawing(null);
        drawingDragRef.current = createDrawingDragState(activePaneIndexRef.current);
        setSelectedDrawingId(null);
        setLastDrawingTool(drawingShortcutTool);
        setActiveDrawingTool((current) => (current === drawingShortcutTool ? null : drawingShortcutTool));
        event.preventDefault();
        return;
      }

      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        isAuthenticatedRef.current &&
        selectedDrawingIdRef.current &&
        !editableTarget
      ) {
        const drawingId = selectedDrawingIdRef.current;
        const selectedDrawing = drawingsRef.current.find((drawing) => drawing.id === drawingId);
        if (selectedDrawing?.locked) {
          setDrawingToolbarStatus('Unlock drawing to delete it');
          event.preventDefault();
          return;
        }

        setDrawings((current) => current.filter((drawing) => drawing.id !== drawingId));
        setSelectedDrawingId(null);
        setActiveDrawingToolbarMenu(null);
        setDrawingToolbarStatus('');
        setPendingDrawing(null);
        drawingDragRef.current = createDrawingDragState(activePaneIndex);
        event.preventDefault();
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
    if (typeof ResizeObserver === 'undefined') {
      requestLegendRender();
      return;
    }

    const observer = new ResizeObserver(() => requestLegendRender());

    canvasRefs.current.slice(0, paneCount).forEach((canvas) => {
      if (canvas) observer.observe(canvas);
    });
    requestLegendRender();

    return () => observer.disconnect();
  }, [paneCount, selectedLayoutId]);

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
    const { chartArea, crosshairAreas, timeScaleArea } =
      chartBoundsRefs.current[paneIndex] ?? createDefaultChartBounds();
    const right = chartArea.left + chartArea.width;
    const bottom = chartArea.top + chartArea.height;
    const paneAreas = crosshairAreas.length > 0 ? crosshairAreas : [chartArea];

    if (chartArea.width <= 0 || chartArea.height <= 0) return 'outside';

    if (x >= right && y >= chartArea.top && y <= bottom) return 'price-scale';
    if (
      paneAreas.some(
        (area) =>
          x >= area.left &&
          x <= area.left + area.width &&
          y >= area.top &&
          y <= area.top + area.height
      )
    ) {
      return 'plot';
    }
    if (
      x >= timeScaleArea.left &&
      x <= timeScaleArea.left + timeScaleArea.width &&
      y >= timeScaleArea.top &&
      y <= timeScaleArea.top + timeScaleArea.height
    ) {
      return 'time-scale';
    }

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

  const getSnappedCrosshairPosition = (paneIndex: number, x: number) => {
    const pane = paneStatesRef.current[paneIndex];
    const { chartArea } = chartBoundsRefs.current[paneIndex] ?? createDefaultChartBounds();
    if (!pane || chartArea.width <= 0) {
      return { x, logicalIndex: 0 };
    }

    const candleSpacing = chartArea.width / Math.max(1, pane.viewRange.candlesPerView);
    const rawLogicalIndex =
      pane.viewRange.startIndex +
      clamp((x - chartArea.left) / Math.max(1, chartArea.width), 0, 1) * pane.viewRange.candlesPerView;
    const visibleStartIndex = Math.floor(pane.viewRange.startIndex);
    const visibleEndIndex = Math.max(visibleStartIndex, Math.ceil(pane.viewRange.endIndex) - 1);
    const logicalIndex = clamp(Math.floor(rawLogicalIndex), visibleStartIndex, visibleEndIndex);
    const snappedX = chartArea.left + (logicalIndex - pane.viewRange.startIndex + 0.5) * candleSpacing;

    return {
      x: clamp(snappedX, chartArea.left, chartArea.left + chartArea.width),
      logicalIndex,
    };
  };

  const getDrawingAnchorAtPoint = (paneIndex: number, x: number, y: number): ChartDrawingAnchor | null => {
    const pane = paneStatesRef.current[paneIndex];
    const currentPriceRange = getCurrentPriceRange(paneIndex);
    const { chartArea } = chartBoundsRefs.current[paneIndex] ?? createDefaultChartBounds();
    if (!pane || !currentPriceRange || chartArea.width <= 0 || chartArea.height <= 0) return null;

    return {
      logicalIndex:
        pane.viewRange.startIndex +
        clamp((x - chartArea.left) / Math.max(1, chartArea.width), 0, 1) * pane.viewRange.candlesPerView,
      price: getPriceAtY(paneIndex, y, currentPriceRange),
    };
  };

  const getDrawingPointForAnchor = (paneIndex: number, anchor: ChartDrawingAnchor) => {
    const pane = paneStatesRef.current[paneIndex];
    const currentPriceRange = getCurrentPriceRange(paneIndex);
    const { chartArea } = chartBoundsRefs.current[paneIndex] ?? createDefaultChartBounds();
    if (!pane || !currentPriceRange || chartArea.width <= 0 || chartArea.height <= 0) return null;

    const priceRange = currentPriceRange.maxPrice - currentPriceRange.minPrice || 1;
    return {
      x: chartArea.left + ((anchor.logicalIndex - pane.viewRange.startIndex) / Math.max(1, pane.viewRange.candlesPerView)) * chartArea.width,
      y: chartArea.top + ((currentPriceRange.maxPrice - anchor.price) / priceRange) * chartArea.height,
    };
  };

  const getDrawingHitResult = (paneIndex: number, x: number, y: number): DrawingHitResult | null => {
    const { chartArea } = chartBoundsRefs.current[paneIndex] ?? createDefaultChartBounds();
    if (chartArea.width <= 0 || chartArea.height <= 0) return null;

    const pane = paneStatesRef.current[paneIndex];
    const drawingsForPane = drawingsRef.current
      .filter(
        (drawing) =>
          drawing.paneIndex === paneIndex &&
          pane !== undefined &&
          shouldRenderDrawingForTimeframe(drawing, pane.timeframe)
      )
      .slice()
      .reverse();

    for (const drawing of drawingsForPane) {
      const points = drawing.anchors
        .map((anchor) => getDrawingPointForAnchor(paneIndex, anchor))
        .filter((point): point is { x: number; y: number } => point !== null);
      if (points.length < getRequiredDrawingAnchorCount(drawing.kind)) continue;

      for (let anchorIndex = 0; anchorIndex < points.length; anchorIndex += 1) {
        const point = points[anchorIndex]!;
        const target = getDrawingHitTargetForAnchorIndex(anchorIndex);
        if (target && Math.hypot(x - point.x, y - point.y) <= DRAWING_HIT_TOLERANCE) {
          return { drawing, target };
        }
      }

      if (isFibDrawingTool(drawing.kind)) {
        const fibModel = getFibRenderModel(drawing, points, chartArea);
        if (hitTestFibRenderModel(fibModel, x, y, DRAWING_HIT_TOLERANCE)) {
          return { drawing, target: 'body' };
        }
        continue;
      }

      if (isPatternDrawingTool(drawing.kind)) {
        const patternModel = getPatternRenderModel(drawing, points, chartArea);
        if (hitTestPatternRenderModel(patternModel, x, y, DRAWING_HIT_TOLERANCE)) {
          return { drawing, target: 'body' };
        }
        continue;
      }

      const renderedSegments = getDrawingRenderedSegments(drawing, points, chartArea);
      if (
        renderedSegments.some(
          (segment) => getDistanceToSegment(x, y, segment.start, segment.end) <= DRAWING_HIT_TOLERANCE
        )
      ) {
        return { drawing, target: 'body' };
      }
    }

    return null;
  };

  const updatePaneHoverAtPoint = (
    paneIndex: number,
    x: number,
    y: number,
    area: ChartPointerArea,
    canvas: HTMLCanvasElement | null
  ) => {
    const pane = paneStatesRef.current[paneIndex];
    if (!pane) return;

    const snappedCrosshair = getSnappedCrosshairPosition(paneIndex, x);
    const currentPriceRange = getCurrentPriceRange(paneIndex);
    const nextMousePos = {
      x: snappedCrosshair.x,
      y,
      dataY: currentPriceRange ? getPriceAtY(paneIndex, y, currentPriceRange) : 0,
      logicalIndex: snappedCrosshair.logicalIndex,
    };
    const currentLegendIndex = getHoverLegendIndex(paneIndex, pane, getCurrentHoverMousePosition(paneIndex));
    const nextLegendIndex = getHoverLegendIndex(paneIndex, pane, nextMousePos);
    const activeDrawingDrag = drawingDragRef.current;
    const drawingHit =
      isAuthenticated && !activeDrawingTool && area === 'plot' && activeDrawingDrag.mode === 'none'
        ? getDrawingHitResult(paneIndex, x, y)
        : null;
    const drawingHoverTarget =
      isAuthenticated && area === 'plot'
        ? activeDrawingDrag.mode !== 'none' && activeDrawingDrag.paneIndex === paneIndex
          ? activeDrawingDrag.mode
          : drawingHit && !drawingHit.drawing.locked
            ? drawingHit.target
            : null
        : null;

    paneHoverStatesRef.current[paneIndex] = {
      mousePos: nextMousePos,
      pointerArea: area,
      pointerX: x,
      pointerY: y,
      drawingHoverTarget,
    };

    if (canvas) {
      canvas.dataset.pointerArea = area;
      canvas.dataset.drawingHoverTarget = drawingHoverTarget ?? 'none';
      canvas.style.cursor =
        isAuthenticated && activeDrawingTool
          ? 'crosshair'
          : activeDrawingDrag.mode !== 'none' && activeDrawingDrag.paneIndex === paneIndex
            ? 'grabbing'
            : getCanvasCursorForState(pane.dragMode, area, drawingHoverTarget);
    }

    if (currentLegendIndex !== nextLegendIndex) {
      requestLegendRender();
    }
  };

  const getCanvasTouchPoints = (event: React.TouchEvent<HTMLCanvasElement>): ChartTouchPoint[] => {
    const rect = event.currentTarget.getBoundingClientRect();

    return Array.from(event.touches, (touch) => ({
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    }));
  };

  const getTouchMidpoint = (first: ChartTouchPoint, second: ChartTouchPoint): ChartTouchPoint => ({
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  });

  const getTouchDistance = (first: ChartTouchPoint, second: ChartTouchPoint) =>
    Math.hypot(first.x - second.x, first.y - second.y);

  const isChartNavigationArea = (area: ChartPointerArea) => area === 'plot' || area === 'time-scale';
  const clearDrawingInteractionState = (paneIndex = activePaneIndex) => {
    setActiveDrawingTool(null);
    setActiveDrawingMenu(null);
    setActiveDrawingToolbarMenu(null);
    setDrawingToolbarStatus('');
    setPendingDrawing(null);
    setSelectedDrawingId(null);
    drawingDragRef.current = createDrawingDragState(paneIndex);
  };
  const toggleDrawingMenu = (menu: DrawingMenuId) => {
    if (!isAuthenticated) {
      clearDrawingInteractionState();
      return;
    }

    setOpenMenu(null);
    setHeaderPanel(null);
    setSettingsTarget(null);
    setMoreTarget(null);
    setActiveDrawingToolbarMenu(null);
    setDrawingToolbarStatus('');
    setActiveDrawingMenu((current) => (current === menu ? null : menu));
  };
  const selectCursorTool = (tool: CursorToolId) => {
    if (!isAuthenticated) return;

    setCursorTool(tool);
    setActiveDrawingMenu(null);
    setActiveDrawingToolbarMenu(null);
    setDrawingToolbarStatus('');
    setActiveDrawingTool(null);
    setPendingDrawing(null);
    drawingDragRef.current = createDrawingDragState(activePaneIndex);
  };
  const selectDrawingTool = (tool: DrawingToolId) => {
    if (!isAuthenticated) {
      clearDrawingInteractionState();
      return;
    }

    setOpenMenu(null);
    setHeaderPanel(null);
    setSettingsTarget(null);
    setMoreTarget(null);
    setActiveDrawingToolbarMenu(null);
    setDrawingToolbarStatus('');
    setActiveDrawingMenu(null);
    setPendingDrawing(null);
    drawingDragRef.current = createDrawingDragState(activePaneIndex);
    setSelectedDrawingId(null);
    if (isFibDrawingTool(tool)) {
      setLastFibTool(tool);
    } else if (isPatternDrawingTool(tool)) {
      setLastPatternTool(tool);
    } else {
      setLastDrawingTool(tool);
    }
    setActiveDrawingTool((current) => (current === tool ? null : tool));
  };

  useEffect(() => {
    if (isAuthenticated) {
      wasAuthenticatedRef.current = true;
      return;
    }

    if (!wasAuthenticatedRef.current) return;

    wasAuthenticatedRef.current = false;
    clearDrawingInteractionState(activePaneIndex);
    drawingToolbarDragRef.current = null;
    setDrawingToolbarPosition(null);
    setDrawings([]);
  }, [activePaneIndex, isAuthenticated]);

  const createChartDrawing = (
    paneIndex: number,
    kind: DrawingToolId,
    anchors: ChartDrawingAnchor[]
  ): ChartDrawing => {
    const now = Date.now();
    const defaultStats =
      kind === 'info-line'
        ? { ...createDrawingStatsFromSelectValue(createDefaultDrawingStats(), 'all'), alwaysShow: true }
        : kind === 'trend-angle'
          ? { ...createDefaultDrawingStats(), angle: true, alwaysShow: true }
          : createDefaultDrawingStats();

    return {
      id: createDrawingId(kind),
      kind,
      paneIndex,
      anchors: cloneDrawingAnchors(anchors),
      locked: false,
      visible: true,
      color: isFibDrawingTool(kind)
        ? kind === 'fib-spiral'
          ? DRAWING_DEFAULT_COLOR
          : FIB_DEFAULT_TREND_COLOR
        : DRAWING_DEFAULT_COLOR,
      opacity: DRAWING_DEFAULT_OPACITY,
      lineWidth: 2,
      lineStyle: DRAWING_DEFAULT_LINE_STYLE,
      extend: 'none',
      leftEnd: 'none',
      rightEnd: 'none',
      text: '',
      showText: false,
      textColor: DRAWING_DEFAULT_TEXT_COLOR,
      textSize: 12,
      textBold: false,
      textItalic: false,
      textAlignment: 'center',
      textVerticalAlignment: 'top',
      showMiddlePoint: kind === 'parallel-channel' || kind === 'regression-trend',
      showPriceLabels: kind === 'horizontal-line' || kind === 'horizontal-ray' || kind === 'cross-line',
      fibLevels: createDefaultFibLevels(kind),
      fibShowLevelLabels: true,
      fibShowPriceLabels: true,
      fibBackground: true,
      fibReverse: false,
      stats: defaultStats,
      timeframeVisibility: createDefaultDrawingTimeframeVisibility(),
      alertEnabled: false,
      alertCondition: 'crossing',
      alertFrequency: 'only-once',
      alertMessage: '',
      visibility: 'all',
      syncInLayout: false,
      syncGlobally: false,
      createdAt: now,
      updatedAt: now,
    };
  };
  const addCompletedDrawing = (drawing: ChartDrawing) => {
    setDrawings((current) => [...current, drawing]);
    setSelectedDrawingId(drawing.id);
    setPendingDrawing(null);
    setActiveDrawingTool(null);
    setActiveDrawingMenu(null);
    setActiveDrawingToolbarMenu(null);
    setDrawingToolbarStatus('');
  };
  const updateSelectedDrawing = (updater: (drawing: ChartDrawing) => ChartDrawing) => {
    if (!isAuthenticated || !selectedDrawingId) return;

    setDrawings((current) =>
      current.map((drawing) =>
        drawing.id === selectedDrawingId ? updater({ ...drawing, anchors: cloneDrawingAnchors(drawing.anchors) }) : drawing
      )
    );
  };
  const patchSelectedDrawing = (updates: Partial<ChartDrawing>) => {
    updateSelectedDrawing((drawing) => ({ ...drawing, ...updates, updatedAt: Date.now() }));
  };
  const updateSelectedDrawingAnchor = (anchorIndex: number, updates: Partial<ChartDrawingAnchor>) => {
    updateSelectedDrawing((drawing) => {
      if (!drawing.anchors[anchorIndex]) return drawing;

      const anchors = cloneDrawingAnchors(drawing.anchors);
      anchors[anchorIndex] = { ...anchors[anchorIndex]!, ...updates };
      return { ...drawing, anchors, updatedAt: Date.now() };
    });
  };
  const applyDrawingStylePreset = () => {
    patchSelectedDrawing({
      color: drawingStylePreset.color,
      opacity: drawingStylePreset.opacity,
      lineWidth: drawingStylePreset.lineWidth,
      lineStyle: drawingStylePreset.lineStyle,
      extend: drawingStylePreset.extend,
      leftEnd: drawingStylePreset.leftEnd,
      rightEnd: drawingStylePreset.rightEnd,
    });
    setDrawingToolbarStatus('Drawing template applied');
  };
  const saveDrawingStylePreset = (drawing: ChartDrawing) => {
    setDrawingStylePreset({
      color: drawing.color,
      opacity: drawing.opacity,
      lineWidth: drawing.lineWidth,
      lineStyle: drawing.lineStyle,
      extend: drawing.extend,
      leftEnd: drawing.leftEnd,
      rightEnd: drawing.rightEnd,
    });
    setDrawingToolbarStatus('Drawing template saved');
  };
  const resetSelectedDrawingStyle = () => {
    patchSelectedDrawing(DEFAULT_DRAWING_STYLE_PRESET);
    setDrawingToolbarStatus('Drawing style reset');
  };
  const toggleSelectedDrawingLock = () => {
    if (!isAuthenticated || !selectedDrawingId) return;

    setDrawings((current) =>
      current.map((drawing) =>
        drawing.id === selectedDrawingId
          ? { ...drawing, locked: !drawing.locked, updatedAt: Date.now() }
          : drawing
      )
    );
  };
  const removeSelectedDrawing = () => {
    if (!isAuthenticated || !selectedDrawingId) return;

    const selectedDrawing = drawingsRef.current.find((drawing) => drawing.id === selectedDrawingId);
    if (selectedDrawing?.locked) {
      setDrawingToolbarStatus('Unlock drawing to delete it');
      return;
    }

    setDrawings((current) => current.filter((drawing) => drawing.id !== selectedDrawingId));
    setSelectedDrawingId(null);
    setActiveDrawingToolbarMenu(null);
    setDrawingToolbarStatus('');
    setPendingDrawing(null);
    drawingDragRef.current = createDrawingDragState(activePaneIndex);
  };
  const duplicateSelectedDrawing = () => {
    if (!isAuthenticated || !selectedDrawingId) return;

    const sourceIndex = drawingsRef.current.findIndex((drawing) => drawing.id === selectedDrawingId);
    const sourceDrawing = drawingsRef.current[sourceIndex];
    if (!sourceDrawing) return;

    const priceRange = getCurrentPriceRange(sourceDrawing.paneIndex);
    const priceOffset = priceRange ? (priceRange.maxPrice - priceRange.minPrice) * 0.025 : 0;
    const duplicate: ChartDrawing = {
      ...sourceDrawing,
      id: createDrawingId(sourceDrawing.kind),
      anchors: sourceDrawing.anchors.map((anchor) => ({
        logicalIndex: anchor.logicalIndex + 3,
        price: anchor.price + priceOffset,
      })),
      locked: false,
      visible: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setDrawings((current) => {
      const next = [...current];
      const insertIndex = current.findIndex((drawing) => drawing.id === selectedDrawingId);
      next.splice(insertIndex >= 0 ? insertIndex + 1 : current.length, 0, duplicate);
      return next;
    });
    setSelectedDrawingId(duplicate.id);
    setActiveDrawingToolbarMenu(null);
    setDrawingToolbarStatus('Drawing cloned');
  };
  const copySelectedDrawing = async () => {
    if (!isAuthenticated || !selectedDrawingId) return;

    const drawing = drawingsRef.current.find((currentDrawing) => currentDrawing.id === selectedDrawingId);
    if (!drawing) return;

    try {
      await navigator.clipboard?.writeText(JSON.stringify(drawing, null, 2));
      setDrawingToolbarStatus('Drawing copied');
    } catch {
      setDrawingToolbarStatus('Copy unavailable');
    }
  };
  const moveSelectedDrawingVisualOrder = (direction: 'front' | 'back') => {
    if (!isAuthenticated || !selectedDrawingId) return;

    setDrawings((current) => {
      const drawing = current.find((candidate) => candidate.id === selectedDrawingId);
      if (!drawing) return current;

      const remaining = current.filter((candidate) => candidate.id !== selectedDrawingId);
      return direction === 'front' ? [...remaining, drawing] : [drawing, ...remaining];
    });
    setDrawingToolbarStatus(direction === 'front' ? 'Drawing brought to front' : 'Drawing sent to back');
  };
  const toggleDrawingToolbarMenu = (menu: DrawingToolbarMenuId) => {
    setDrawingToolbarStatus('');
    if (menu === 'settings' && activeDrawingToolbarMenu !== 'settings') {
      setActiveDrawingSettingsTab('style');
    }
    setActiveDrawingToolbarMenu((current) => (current === menu ? null : menu));
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

    if (area === 'plot' && isAuthenticated && activeDrawingTool) {
      const anchor = getDrawingAnchorAtPoint(paneIndex, x, y);
      if (!anchor) return;

      if (isMultiAnchorDrawingTool(activeDrawingTool)) {
        const requiredAnchorCount = getRequiredDrawingAnchorCount(activeDrawingTool);
        if (pendingDrawing?.tool === activeDrawingTool && pendingDrawing.paneIndex === paneIndex) {
          const nextAnchors = [...pendingDrawing.anchors, anchor];
          if (nextAnchors.length >= requiredAnchorCount) {
            addCompletedDrawing(createChartDrawing(paneIndex, activeDrawingTool, nextAnchors));
          } else {
            setPendingDrawing({ tool: activeDrawingTool, paneIndex, anchors: nextAnchors, preview: anchor });
          }
        } else {
          setPendingDrawing({ tool: activeDrawingTool, paneIndex, anchors: [anchor], preview: anchor });
          setSelectedDrawingId(null);
          setActiveDrawingToolbarMenu(null);
          setDrawingToolbarStatus('');
        }
      } else {
        addCompletedDrawing(createChartDrawing(paneIndex, activeDrawingTool, [anchor]));
      }

      event.preventDefault();
      return;
    }

    if (area === 'plot' && isAuthenticated && cursorTool === 'eraser') {
      const drawingHit = getDrawingHitResult(paneIndex, x, y);
      if (drawingHit && !drawingHit.drawing.locked) {
        setDrawings((current) => current.filter((drawing) => drawing.id !== drawingHit.drawing.id));
        setSelectedDrawingId((current) => (current === drawingHit.drawing.id ? null : current));
        setActiveDrawingToolbarMenu(null);
        setDrawingToolbarStatus('');
        event.preventDefault();
        return;
      }
    } else if (area === 'plot' && isAuthenticated) {
      const drawingHit = getDrawingHitResult(paneIndex, x, y);
      if (drawingHit) {
        setSelectedDrawingId(drawingHit.drawing.id);
        setActiveDrawingToolbarMenu(null);
        setDrawingToolbarStatus('');
        setActiveDrawingTool(null);
        setPendingDrawing(null);

        if (!drawingHit.drawing.locked) {
          drawingDragRef.current = {
            mode: drawingHit.target,
            paneIndex,
            drawingId: drawingHit.drawing.id,
            startX: event.clientX,
            startY: event.clientY,
            startAnchors: cloneDrawingAnchors(drawingHit.drawing.anchors),
          };
        } else {
          drawingDragRef.current = createDrawingDragState(paneIndex);
        }

        event.preventDefault();
        return;
      }

      setSelectedDrawingId(null);
      setActiveDrawingToolbarMenu(null);
      setDrawingToolbarStatus('');
    }

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
    if (drawingDragRef.current.mode !== 'none') {
      drawingDragRef.current = createDrawingDragState(drawingDragRef.current.paneIndex);
    }

    if (dragStateRef.current.mode === 'none') return;

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

    if (
      isAuthenticated &&
      activeDrawingTool &&
      isMultiAnchorDrawingTool(activeDrawingTool) &&
      pendingDrawing?.tool === activeDrawingTool &&
      pendingDrawing.paneIndex === paneIndex &&
      area === 'plot'
    ) {
      const preview = getDrawingAnchorAtPoint(paneIndex, x, y);
      if (preview) {
        setPendingDrawing((current) => (current ? { ...current, preview } : current));
      }
    }

    const drawingDrag = drawingDragRef.current;
    if (!isAuthenticated && drawingDrag.mode !== 'none') {
      drawingDragRef.current = createDrawingDragState(paneIndex);
    }

    if (isAuthenticated && drawingDrag.mode !== 'none' && drawingDrag.paneIndex === paneIndex && drawingDrag.drawingId) {
      const currentPriceRange = getCurrentPriceRange(paneIndex);
      const { chartArea } = chartBoundsRefs.current[paneIndex] ?? createDefaultChartBounds();
      const currentAnchor = getDrawingAnchorAtPoint(paneIndex, x, y);

      if (currentPriceRange && chartArea.width > 0 && chartArea.height > 0 && currentAnchor) {
        const deltaX = event.clientX - drawingDrag.startX;
        const deltaY = event.clientY - drawingDrag.startY;
        const logicalDelta = (deltaX / Math.max(1, chartArea.width)) * pane.viewRange.candlesPerView;
        const priceDelta =
          -(deltaY / Math.max(1, chartArea.height)) * (currentPriceRange.maxPrice - currentPriceRange.minPrice);

        setDrawings((current) =>
          current.map((drawing) => {
            if (drawing.id !== drawingDrag.drawingId || drawing.locked) return drawing;

            let nextAnchors = cloneDrawingAnchors(drawingDrag.startAnchors);
            if (drawingDrag.mode === 'body') {
              nextAnchors = nextAnchors.map((anchor) => ({
                logicalIndex:
                  isHorizontalDrawingTool(drawing.kind) ? anchor.logicalIndex : anchor.logicalIndex + logicalDelta,
                price: anchor.price + priceDelta,
              }));
            } else {
              const anchorIndex = getDrawingAnchorIndexForHitTarget(drawingDrag.mode);
              if (anchorIndex !== null && nextAnchors[anchorIndex]) {
                nextAnchors[anchorIndex] = currentAnchor;
              }
            }

            return { ...drawing, anchors: nextAnchors, updatedAt: Date.now() };
          })
        );
      }

      updatePaneHoverAtPoint(paneIndex, x, y, area, event.currentTarget);
      event.preventDefault();
      return;
    }

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

    updatePaneHoverAtPoint(paneIndex, x, y, area, event.currentTarget);
  };

  const handleMouseLeave = (paneIndex: number, event: React.MouseEvent<HTMLCanvasElement>) => {
    resetPaneHoverState(paneIndex);
    event.currentTarget.dataset.pointerArea = 'outside';
    event.currentTarget.dataset.drawingHoverTarget = 'none';
    event.currentTarget.style.cursor = getCanvasCursorForState(dragStateRef.current.mode, 'outside');
    handleMouseUp();
  };

  const beginTouchPan = (paneIndex: number, point: ChartTouchPoint, pane: ChartPaneState) => {
    touchGestureRef.current = {
      mode: 'pan',
      paneIndex,
      startX: point.x,
      startViewRange: pane.viewRange,
      startDistance: 0,
      startMidX: point.x,
    };
    updatePaneState(paneIndex, (currentPane) => ({ ...currentPane, dragMode: 'chart-pan' }));
  };

  const beginTouchPinch = (
    paneIndex: number,
    firstPoint: ChartTouchPoint,
    secondPoint: ChartTouchPoint,
    pane: ChartPaneState
  ) => {
    const midpoint = getTouchMidpoint(firstPoint, secondPoint);

    touchGestureRef.current = {
      mode: 'pinch',
      paneIndex,
      startX: midpoint.x,
      startViewRange: pane.viewRange,
      startDistance: Math.max(1, getTouchDistance(firstPoint, secondPoint)),
      startMidX: midpoint.x,
    };
    updatePaneState(paneIndex, (currentPane) => ({ ...currentPane, dragMode: 'chart-pan' }));
  };

  const endTouchGesture = (paneIndex: number) => {
    touchGestureRef.current = createTouchGestureState(paneIndex);
    updatePaneState(paneIndex, (pane) => ({ ...pane, dragMode: 'none' }));
  };

  const handleTouchStart = (paneIndex: number, event: React.TouchEvent<HTMLCanvasElement>) => {
    const pane = paneStatesRef.current[paneIndex];
    setActivePaneIndex(paneIndex);
    if (!pane?.candles.length) return;

    const points = getCanvasTouchPoints(event);
    const firstPoint = points[0];
    if (!firstPoint) return;

    if (points.length >= 2 && points[1]) {
      const midpoint = getTouchMidpoint(firstPoint, points[1]);
      if (!isChartNavigationArea(getPointerArea(paneIndex, midpoint.x, midpoint.y))) return;

      beginTouchPinch(paneIndex, firstPoint, points[1], pane);
      updatePaneHoverAtPoint(paneIndex, midpoint.x, midpoint.y, 'plot', event.currentTarget);
      return;
    }

    const area = getPointerArea(paneIndex, firstPoint.x, firstPoint.y);
    if (!isChartNavigationArea(area)) return;

    beginTouchPan(paneIndex, firstPoint, pane);
    updatePaneHoverAtPoint(paneIndex, firstPoint.x, firstPoint.y, area, event.currentTarget);
  };

  const handleTouchMove = (paneIndex: number, event: React.TouchEvent<HTMLCanvasElement>) => {
    const pane = paneStatesRef.current[paneIndex];
    if (!pane?.candles.length) return;

    const points = getCanvasTouchPoints(event);
    const firstPoint = points[0];
    if (!firstPoint) return;

    const gesture = touchGestureRef.current;
    const { chartArea } = chartBoundsRefs.current[paneIndex] ?? createDefaultChartBounds();

    if (points.length >= 2 && points[1]) {
      const midpoint = getTouchMidpoint(firstPoint, points[1]);
      const area = getPointerArea(paneIndex, midpoint.x, midpoint.y);
      if (!isChartNavigationArea(area) && gesture.mode !== 'pinch') return;

      if (gesture.mode !== 'pinch' || gesture.paneIndex !== paneIndex) {
        beginTouchPinch(paneIndex, firstPoint, points[1], pane);
        return;
      }

      const chartWidth = chartArea.width || getEstimatedChartWidth(paneIndex);
      const distance = Math.max(1, getTouchDistance(firstPoint, points[1]));
      const distanceScale = clamp(gesture.startDistance / distance, 0.18, 5);
      const newCandlesPerView = Math.round(
        clamp(
          gesture.startViewRange.candlesPerView * distanceScale,
          MIN_VISIBLE_BARS,
          Math.min(MAX_VISIBLE_BARS, pane.candles.length + MAX_FUTURE_BARS)
        )
      );
      const startRatio = clamp((gesture.startMidX - chartArea.left) / Math.max(1, chartWidth), 0, 1);
      const currentRatio = clamp((midpoint.x - chartArea.left) / Math.max(1, chartWidth), 0, 1);
      const anchorIndex = gesture.startViewRange.startIndex + startRatio * gesture.startViewRange.candlesPerView;
      const newStartIndex = anchorIndex - newCandlesPerView * currentRatio;

      updatePaneState(paneIndex, (currentPane) => ({
        ...currentPane,
        viewRange: normalizeViewRange(newStartIndex, newCandlesPerView, currentPane.candles.length),
      }));
      updatePaneHoverAtPoint(paneIndex, midpoint.x, midpoint.y, area === 'outside' ? 'plot' : area, event.currentTarget);
      return;
    }

    if (gesture.mode === 'pinch' && gesture.paneIndex === paneIndex) {
      beginTouchPan(paneIndex, firstPoint, pane);
      return;
    }

    const area = getPointerArea(paneIndex, firstPoint.x, firstPoint.y);
    if (!isChartNavigationArea(area) && gesture.mode !== 'pan') return;

    if (gesture.mode !== 'pan' || gesture.paneIndex !== paneIndex) {
      beginTouchPan(paneIndex, firstPoint, pane);
      return;
    }

    const candleWidth = chartArea.width / Math.max(1, gesture.startViewRange.candlesPerView);
    const candlesDelta = (firstPoint.x - gesture.startX) / Math.max(1, candleWidth);
    const maxStartIndex = getMaxStartIndex(pane.candles.length, gesture.startViewRange.candlesPerView);
    const newStartIndex = clamp(gesture.startViewRange.startIndex - candlesDelta, 0, maxStartIndex);

    updatePaneState(paneIndex, (currentPane) => ({
      ...currentPane,
      viewRange: {
        ...gesture.startViewRange,
        startIndex: newStartIndex,
        endIndex: newStartIndex + gesture.startViewRange.candlesPerView,
      },
    }));
    updatePaneHoverAtPoint(paneIndex, firstPoint.x, firstPoint.y, area, event.currentTarget);
  };

  const handleTouchEnd = (paneIndex: number, event: React.TouchEvent<HTMLCanvasElement>) => {
    const pane = paneStatesRef.current[paneIndex];
    const points = getCanvasTouchPoints(event);
    const firstPoint = points[0];

    if (pane?.candles.length && firstPoint) {
      beginTouchPan(paneIndex, firstPoint, pane);
      return;
    }

    endTouchGesture(paneIndex);
    event.currentTarget.dataset.pointerArea = 'outside';
    event.currentTarget.dataset.drawingHoverTarget = 'none';
    event.currentTarget.style.cursor = getCanvasCursorForState('none', 'outside');
  };

  const handleTouchCancel = (paneIndex: number, event: React.TouchEvent<HTMLCanvasElement>) => {
    endTouchGesture(paneIndex);
    resetPaneHoverState(paneIndex);
    event.currentTarget.dataset.pointerArea = 'outside';
    event.currentTarget.dataset.drawingHoverTarget = 'none';
    event.currentTarget.style.cursor = getCanvasCursorForState('none', 'outside');
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

    const { candles, viewRange, manualPriceRange, timeframe } = pane;
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

    const {
      chartArea,
      volumeArea,
      oscillatorPaneAreas,
      crosshairAreas,
      timeScaleArea,
      rightAxisWidth,
      compactChart,
      narrowChart,
    } = getChartVisualLayout({
      width: rect.width,
      height: rect.height,
      showVolume,
      oscillatorIndicators: visibleOscillatorIndicators,
    });
    const axisFontSize = compactChart ? 13 : 14;
    const indicatorPaneFontSize = compactChart ? 12 : 13;

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
        crosshairAreas,
        timeScaleArea,
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
    const drawingPriceLabels: Array<{ y: number; price: number; color: string; selected: boolean }> = [];

    ctx.save();
    ctx.beginPath();
    ctx.rect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
    ctx.clip();

    ctx.font = getCanvasFont(axisFontSize);
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

    const pointForDrawingAnchor = (anchor: ChartDrawingAnchor) => ({
      x: chartArea.left + ((anchor.logicalIndex - viewRange.startIndex) / Math.max(1, viewRange.candlesPerView)) * chartArea.width,
      y: priceToY(anchor.price),
    });
    const applyDrawingLineStyle = (drawing: ChartDrawing) => {
      if (drawing.lineStyle === 'dashed') {
        ctx.setLineDash([drawing.lineWidth * 4, drawing.lineWidth * 2.5]);
      } else if (drawing.lineStyle === 'dotted') {
        ctx.setLineDash([drawing.lineWidth, drawing.lineWidth * 2.4]);
      } else {
        ctx.setLineDash([]);
      }
    };
    const getDrawingStrokeColor = (drawing: ChartDrawing) => hexToRgba(drawing.color, drawing.opacity);
    const drawDrawingArrowEnd = (
      drawing: ChartDrawing,
      tip: { x: number; y: number },
      tail: { x: number; y: number },
      endType: DrawingArrowEnd
    ) => {
      if (endType !== 'arrow') return;

      const angle = Math.atan2(tip.y - tail.y, tip.x - tail.x);
      const size = Math.max(8, drawing.lineWidth * 4.2);
      ctx.save();
      ctx.fillStyle = getDrawingStrokeColor(drawing);
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(tip.x - Math.cos(angle - Math.PI / 6) * size, tip.y - Math.sin(angle - Math.PI / 6) * size);
      ctx.lineTo(tip.x - Math.cos(angle + Math.PI / 6) * size, tip.y - Math.sin(angle + Math.PI / 6) * size);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    const drawDrawingHandle = (point: { x: number; y: number }, selected: boolean) => {
      if (!selected) return;

      ctx.fillStyle = theme === 'dark' ? '#150f23' : '#ffffff';
      ctx.strokeStyle = DRAWING_DEFAULT_COLOR;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(point.x, point.y, DRAWING_HANDLE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    };
    const getDrawingStatsLines = (drawing: ChartDrawing) => {
      if (drawing.anchors.length < 2 || isOneAnchorDrawingTool(drawing.kind) || !drawing.anchors[0] || !drawing.anchors[1]) {
        return [];
      }

      const [firstAnchor, secondAnchor] = drawing.anchors;
      const priceDelta = secondAnchor.price - firstAnchor.price;
      const barsDelta = secondAnchor.logicalIndex - firstAnchor.logicalIndex;
      const percentDelta = firstAnchor.price !== 0 ? (priceDelta / firstAnchor.price) * 100 : 0;
      const dateTimeDelta = Math.abs(timeForIndex(secondAnchor.logicalIndex) - timeForIndex(firstAnchor.logicalIndex));
      const days = Math.floor(dateTimeDelta / 86_400_000);
      const hours = Math.floor((dateTimeDelta % 86_400_000) / 3_600_000);
      const minutes = Math.round((dateTimeDelta % 3_600_000) / 60_000);
      const distance = Math.hypot(barsDelta, priceDelta);
      const angle = Math.atan2(priceDelta, Math.max(0.0001, Math.abs(barsDelta))) * (180 / Math.PI);

      return [
        drawing.stats.priceRange ? `Range ${formatPrice(Math.abs(priceDelta))}` : null,
        drawing.stats.percentChange ? `${percentDelta >= 0 ? '+' : ''}${percentDelta.toFixed(2)}%` : null,
        drawing.stats.change ? `Change ${priceDelta >= 0 ? '+' : ''}${formatPrice(priceDelta)}` : null,
        drawing.stats.barsRange ? `${Math.abs(barsDelta).toFixed(1)} bars` : null,
        drawing.stats.dateTimeRange
          ? `Time ${days > 0 ? `${days}d ` : ''}${hours > 0 ? `${hours}h ` : ''}${minutes}m`
          : null,
        drawing.stats.distance ? `Distance ${distance.toFixed(2)}` : null,
        drawing.stats.angle ? `Angle ${angle.toFixed(1)}deg` : null,
      ].filter((line): line is string => line !== null);
    };
    const drawDrawingStats = (
      drawing: ChartDrawing,
      start: { x: number; y: number },
      end: { x: number; y: number },
      selected: boolean
    ) => {
      if (!selected && !drawing.stats.alwaysShow) return;

      const lines = getDrawingStatsLines(drawing);
      if (lines.length === 0) return;

      ctx.font = getCanvasFont(11);
      const paddingX = 8;
      const paddingY = 6;
      const lineHeight = 15;
      const labelWidth = Math.min(260, Math.max(...lines.map((line) => ctx.measureText(line).width)) + paddingX * 2);
      const labelHeight = lines.length * lineHeight + paddingY * 2;
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const labelX = clamp(
        drawing.stats.position === 'right' ? midX + 14 : midX - labelWidth / 2,
        chartArea.left + 4,
        chartArea.left + chartArea.width - labelWidth - 4
      );
      const labelY = clamp(
        drawing.stats.position === 'above'
          ? midY - labelHeight - 14
          : drawing.stats.position === 'right'
            ? midY - labelHeight / 2
            : midY + 14,
        chartArea.top + 4,
        chartArea.top + chartArea.height - labelHeight - 4
      );

      ctx.fillStyle = theme === 'dark' ? 'rgba(15, 23, 42, 0.86)' : 'rgba(255, 255, 255, 0.92)';
      ctx.fillRect(labelX, labelY, labelWidth, labelHeight);
      ctx.strokeStyle = hexToRgba(drawing.color, 0.72);
      ctx.strokeRect(labelX, labelY, labelWidth, labelHeight);
      ctx.fillStyle = theme === 'dark' ? '#f8fafc' : '#1f2937';
      lines.forEach((line, index) => {
        ctx.fillText(line, labelX + paddingX, labelY + paddingY + 11 + index * lineHeight);
      });
    };
    const drawDrawingText = (drawing: ChartDrawing, start: { x: number; y: number }, end: { x: number; y: number }) => {
      const text = drawing.showText ? drawing.text.trim() : '';
      if (!text) return;

      const textAnchorRatio = drawing.textAlignment === 'left' ? 0.18 : drawing.textAlignment === 'right' ? 0.82 : 0.5;
      ctx.save();
      ctx.font = `${drawing.textItalic ? 'italic ' : ''}${drawing.textBold ? '700' : '500'} ${drawing.textSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      const paddingX = 6;
      const paddingY = 5;
      const textWidth = Math.min(220, ctx.measureText(text).width + paddingX * 2);
      const textHeight = drawing.textSize + paddingY * 2;
      const anchorX = start.x + (end.x - start.x) * textAnchorRatio;
      const anchorY = start.y + (end.y - start.y) * textAnchorRatio;
      const lineDeltaX = end.x - start.x;
      const lineDeltaY = end.y - start.y;
      const lineLength = Math.hypot(lineDeltaX, lineDeltaY) || 1;
      const normalX = -lineDeltaY / lineLength;
      const normalY = lineDeltaX / lineLength;
      const aboveNormalX = normalY <= 0 ? normalX : -normalX;
      const aboveNormalY = normalY <= 0 ? normalY : -normalY;
      const verticalDistance =
        drawing.textVerticalAlignment === 'top'
          ? textHeight / 2 + 8
          : drawing.textVerticalAlignment === 'bottom'
            ? -(textHeight / 2 + 8)
            : 0;
      const labelCenterX = anchorX + aboveNormalX * verticalDistance;
      const labelCenterY = anchorY + aboveNormalY * verticalDistance;
      const unclampedLabelX =
        drawing.textAlignment === 'left'
          ? labelCenterX + 4
          : drawing.textAlignment === 'right'
            ? labelCenterX - textWidth - 4
            : labelCenterX - textWidth / 2;
      const labelX = clamp(
        unclampedLabelX,
        chartArea.left + 4,
        chartArea.left + chartArea.width - textWidth - 4
      );
      const labelY = clamp(
        labelCenterY - textHeight / 2,
        chartArea.top + 4,
        chartArea.top + chartArea.height - textHeight - 4
      );

      ctx.fillStyle = theme === 'dark' ? 'rgba(15, 23, 42, 0.82)' : 'rgba(255, 255, 255, 0.92)';
      ctx.fillRect(labelX, labelY, textWidth, textHeight);
      ctx.fillStyle = drawing.textColor;
      ctx.fillText(text, labelX + paddingX, labelY + paddingY + drawing.textSize, textWidth - paddingX * 2);
      ctx.restore();
    };
    const drawFibDrawing = (drawing: ChartDrawing, points: Array<{ x: number; y: number }>, selected: boolean) => {
      const model = getFibRenderModel(drawing, points, chartArea);
      const fillAlpha = clamp(drawing.opacity * 0.14, 0.04, 0.4);

      model.polygons.forEach((polygon) => {
        if (polygon.points.length < 3) return;

        ctx.fillStyle = hexToRgba(polygon.color, fillAlpha);
        ctx.beginPath();
        polygon.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.closePath();
        ctx.fill();
      });

      model.bands.forEach((band) => {
        if (band.outerRadius <= band.innerRadius) return;

        ctx.fillStyle = hexToRgba(band.color, fillAlpha);
        ctx.beginPath();
        ctx.arc(band.cx, band.cy, band.outerRadius, band.startAngle, band.endAngle);
        ctx.arc(band.cx, band.cy, band.innerRadius, band.endAngle, band.startAngle, true);
        ctx.closePath();
        ctx.fill();
      });

      model.connectors.forEach((line) => {
        ctx.strokeStyle = hexToRgba(line.color, drawing.opacity * 0.62);
        ctx.lineWidth = Math.max(1, drawing.lineWidth - 1);
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(line.start.x, line.start.y);
        ctx.lineTo(line.end.x, line.end.y);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      model.lines.forEach((line) => {
        ctx.strokeStyle = hexToRgba(line.color, line.muted ? drawing.opacity * 0.38 : drawing.opacity);
        ctx.lineWidth = line.muted ? 1 : selected ? drawing.lineWidth + 0.6 : drawing.lineWidth;
        if (line.muted) {
          ctx.setLineDash([]);
        } else {
          applyDrawingLineStyle(drawing);
        }
        ctx.beginPath();
        ctx.moveTo(line.start.x, line.start.y);
        ctx.lineTo(line.end.x, line.end.y);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      model.arcs.forEach((arc) => {
        ctx.strokeStyle = hexToRgba(arc.color, drawing.opacity);
        ctx.lineWidth = selected ? drawing.lineWidth + 0.6 : drawing.lineWidth;
        applyDrawingLineStyle(drawing);
        ctx.beginPath();
        ctx.arc(arc.cx, arc.cy, arc.radius, arc.startAngle, arc.endAngle);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      model.polylines.forEach((polyline) => {
        if (polyline.points.length < 2) return;

        ctx.strokeStyle = hexToRgba(polyline.color, drawing.opacity);
        ctx.lineWidth = selected ? drawing.lineWidth + 0.6 : drawing.lineWidth;
        applyDrawingLineStyle(drawing);
        ctx.beginPath();
        polyline.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
        ctx.setLineDash([]);
      });

      if (model.labels.length > 0) {
        ctx.save();
        ctx.font = getCanvasFont(10);
        model.labels.forEach((label) => {
          ctx.fillStyle = hexToRgba(label.color, Math.min(1, drawing.opacity + 0.2));
          ctx.textAlign = label.align;
          ctx.textBaseline = label.baseline;
          ctx.fillText(label.text, label.x, label.y);
        });
        ctx.restore();
      }

      points.forEach((point) => drawDrawingHandle(point, selected));

      if (drawing.showPriceLabels || selected) {
        drawing.anchors.forEach((anchor, index) => {
          const point = points[index];
          if (!point) return;

          drawingPriceLabels.push({ y: point.y, price: anchor.price, color: drawing.color, selected });
        });
      }

      const connectorStart = points[0]!;
      const connectorEnd = points[1] ?? connectorStart;
      drawDrawingText(drawing, connectorStart, connectorEnd);
      drawDrawingStats(drawing, connectorStart, connectorEnd, selected);
    };
    const drawPatternDrawing = (drawing: ChartDrawing, points: Array<{ x: number; y: number }>, selected: boolean) => {
      const model = getPatternRenderModel(drawing, points, chartArea);
      const fillAlpha = clamp(drawing.opacity * 0.16, 0.05, 0.4);

      model.polygons.forEach((polygon) => {
        if (polygon.points.length < 3) return;

        ctx.fillStyle = hexToRgba(polygon.color, fillAlpha);
        ctx.beginPath();
        polygon.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.closePath();
        ctx.fill();
      });

      model.lines.forEach((line) => {
        ctx.strokeStyle = hexToRgba(line.color, line.dashed ? drawing.opacity * 0.72 : drawing.opacity);
        ctx.lineWidth = line.dashed ? Math.max(1, drawing.lineWidth - 1) : selected ? drawing.lineWidth + 0.6 : drawing.lineWidth;
        if (line.dashed) {
          ctx.setLineDash([5, 4]);
        } else {
          applyDrawingLineStyle(drawing);
        }
        ctx.beginPath();
        ctx.moveTo(line.start.x, line.start.y);
        ctx.lineTo(line.end.x, line.end.y);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      model.arcs.forEach((arc) => {
        ctx.strokeStyle = hexToRgba(arc.color, drawing.opacity);
        ctx.lineWidth = selected ? drawing.lineWidth + 0.6 : drawing.lineWidth;
        applyDrawingLineStyle(drawing);
        ctx.beginPath();
        ctx.arc(arc.cx, arc.cy, arc.radius, arc.startAngle, arc.endAngle);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      model.polylines.forEach((polyline) => {
        if (polyline.points.length < 2) return;

        ctx.strokeStyle = hexToRgba(polyline.color, polyline.muted ? drawing.opacity * 0.4 : drawing.opacity);
        ctx.lineWidth = polyline.muted ? 1 : selected ? drawing.lineWidth + 0.6 : drawing.lineWidth;
        applyDrawingLineStyle(drawing);
        ctx.beginPath();
        polyline.points.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
        ctx.setLineDash([]);
      });

      if (model.labels.length > 0) {
        ctx.save();
        ctx.font = getCanvasFont(10);
        model.labels.forEach((label) => {
          ctx.fillStyle = hexToRgba(label.color, Math.min(1, drawing.opacity + 0.2));
          ctx.textAlign = label.align;
          ctx.textBaseline = label.baseline;
          ctx.fillText(label.text, label.x, label.y);
        });
        ctx.restore();
      }

      points.forEach((point) => drawDrawingHandle(point, selected));

      if (drawing.showPriceLabels || selected) {
        drawing.anchors.forEach((anchor, index) => {
          const point = points[index];
          if (!point) return;

          drawingPriceLabels.push({ y: point.y, price: anchor.price, color: drawing.color, selected });
        });
      }

      const connectorStart = points[0]!;
      const connectorEnd = points[points.length - 1] ?? connectorStart;
      drawDrawingText(drawing, connectorStart, connectorEnd);
      drawDrawingStats(drawing, connectorStart, connectorEnd, selected);
    };
    const drawDrawing = (drawing: ChartDrawing, selected: boolean) => {
      const points = drawing.anchors.map(pointForDrawingAnchor);
      if (isPatternDrawingTool(drawing.kind)) {
        if (points.length < 2) return;

        drawPatternDrawing(drawing, points, selected);
        return;
      }
      if (points.length < getRequiredDrawingAnchorCount(drawing.kind)) return;

      if (isFibDrawingTool(drawing.kind)) {
        drawFibDrawing(drawing, points, selected);
        return;
      }

      const renderedSegments = getDrawingRenderedSegments(drawing, points, chartArea);
      const primarySegment = renderedSegments[0];
      if (!primarySegment) return;

      if (isChannelDrawingTool(drawing.kind)) {
        const fillSegments =
          drawing.kind === 'regression-trend' && renderedSegments[1] && renderedSegments[2]
            ? [renderedSegments[1], renderedSegments[2]]
            : renderedSegments[0] && renderedSegments[1]
              ? [renderedSegments[0], renderedSegments[1]]
              : null;
        if (fillSegments) {
          ctx.save();
          ctx.fillStyle = hexToRgba(drawing.color, drawing.opacity * 0.12);
          ctx.beginPath();
          ctx.moveTo(fillSegments[0].start.x, fillSegments[0].start.y);
          ctx.lineTo(fillSegments[0].end.x, fillSegments[0].end.y);
          ctx.lineTo(fillSegments[1].end.x, fillSegments[1].end.y);
          ctx.lineTo(fillSegments[1].start.x, fillSegments[1].start.y);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }

      renderedSegments.forEach((segment) => {
        ctx.strokeStyle = segment.muted ? hexToRgba(drawing.color, drawing.opacity * 0.56) : getDrawingStrokeColor(drawing);
        ctx.lineWidth = selected ? drawing.lineWidth + 0.6 : drawing.lineWidth;
        applyDrawingLineStyle(drawing);
        if (segment.muted && drawing.lineStyle === 'solid') {
          ctx.setLineDash([drawing.lineWidth * 2.5, drawing.lineWidth * 2.5]);
        }
        ctx.beginPath();
        ctx.moveTo(segment.start.x, segment.start.y);
        ctx.lineTo(segment.end.x, segment.end.y);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      if (!isChannelDrawingTool(drawing.kind)) {
        drawDrawingArrowEnd(drawing, primarySegment.start, primarySegment.end, drawing.leftEnd);
        drawDrawingArrowEnd(drawing, primarySegment.end, primarySegment.start, drawing.rightEnd);
      }

      points.forEach((point) => drawDrawingHandle(point, selected));
      if (drawing.showMiddlePoint && points[0] && points[1]) {
        drawDrawingHandle({ x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }, true);
      }

      if ((drawing.showPriceLabels || (selected && !isVerticalDrawingTool(drawing.kind))) && !isVerticalDrawingTool(drawing.kind)) {
        drawing.anchors.forEach((anchor, index) => {
          const point = points[index];
          if (!point) return;
          drawingPriceLabels.push({ y: point.y, price: anchor.price, color: drawing.color, selected });
        });
      }

      drawDrawingText(drawing, primarySegment.start, primarySegment.end);
      drawDrawingStats(drawing, primarySegment.start, primarySegment.end, selected);
    };

    const visiblePaneDrawings = isAuthenticated
      ? drawings.filter((drawing) => drawing.paneIndex === paneIndex && shouldRenderDrawingForTimeframe(drawing, pane.timeframe))
      : [];

    visiblePaneDrawings
      .forEach((drawing) => drawDrawing(drawing, drawing.id === selectedDrawingId));

    if (
      isAuthenticated &&
      pendingDrawing &&
      isMultiAnchorDrawingTool(pendingDrawing.tool) &&
      pendingDrawing.paneIndex === paneIndex
    ) {
      drawDrawing(
        {
          id: `pending-${pendingDrawing.tool}`,
          kind: pendingDrawing.tool,
          paneIndex,
          anchors: [...pendingDrawing.anchors, pendingDrawing.preview],
          locked: false,
          visible: true,
          color: isFibDrawingTool(pendingDrawing.tool)
            ? pendingDrawing.tool === 'fib-spiral'
              ? DRAWING_DEFAULT_COLOR
              : FIB_DEFAULT_TREND_COLOR
            : DRAWING_DEFAULT_COLOR,
          opacity: DRAWING_DEFAULT_OPACITY,
          lineWidth: 2,
          lineStyle: DRAWING_DEFAULT_LINE_STYLE,
          extend: 'none',
          leftEnd: 'none',
          rightEnd: 'none',
          text: '',
          showText: false,
          textColor: DRAWING_DEFAULT_TEXT_COLOR,
          textSize: 12,
          textBold: false,
          textItalic: false,
          textAlignment: 'center',
          textVerticalAlignment: 'top',
          showMiddlePoint: false,
          showPriceLabels: false,
          fibLevels: createDefaultFibLevels(pendingDrawing.tool),
          fibShowLevelLabels: true,
          fibShowPriceLabels: true,
          fibBackground: true,
          fibReverse: false,
          stats: createDefaultDrawingStats(),
          timeframeVisibility: createDefaultDrawingTimeframeVisibility(),
          alertEnabled: false,
          alertCondition: 'crossing',
          alertFrequency: 'only-once',
          alertMessage: '',
          visibility: 'all',
          syncInLayout: false,
          syncGlobally: false,
          createdAt: 0,
          updatedAt: 0,
        },
        true
      );
    }
    ctx.restore();

    drawingPriceLabels.forEach((label) => {
      if (label.y < chartArea.top || label.y > chartArea.top + chartArea.height) return;

      const labelText = formatPrice(label.price);
      const labelWidth = Math.min(rightAxisWidth - 8, Math.max(58, ctx.measureText(labelText).width + 14));
      const labelHeight = 22;
      const labelY = clamp(label.y - labelHeight / 2, chartArea.top, chartArea.top + chartArea.height - labelHeight);

      ctx.fillStyle = label.color;
      ctx.globalAlpha = label.selected ? 1 : 0.86;
      ctx.fillRect(chartArea.left + chartArea.width + 1, labelY, labelWidth, labelHeight);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.font = getCanvasFont(axisFontSize);
      ctx.textAlign = 'left';
      ctx.fillText(labelText, chartArea.left + chartArea.width + 7, labelY + 15);
    });

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

      ctx.textAlign = 'right';
      ctx.fillStyle = palette.text;
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
      ctx.fillStyle = theme === 'dark' ? '#150f23' : '#ffffff';
      ctx.font = getCanvasFont(axisFontSize);
      ctx.textAlign = 'left';
      ctx.fillText(formatPrice(latestCandle!.close), chartArea.left + chartArea.width + 7, markerY + 18);

      if (countdown) {
        ctx.globalAlpha = 0.84;
        ctx.font = getCanvasFont(Math.max(12, axisFontSize - 1));
        ctx.fillText(countdown, chartArea.left + chartArea.width + 7, markerY + 33);
        ctx.globalAlpha = 1;
      }
    }

    ctx.font = getCanvasFont(axisFontSize);
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

    const cursorToolShowsCrosshair =
      !isAuthenticated ||
      activeDrawingTool !== null ||
      !CURSOR_TOOLS_WITHOUT_CROSSHAIR.has(cursorTool);
    const crosshairXInside =
      chartSettings.showCrosshair &&
      cursorToolShowsCrosshair &&
      crosshairPosition &&
      crosshairPosition.x >= chartArea.left &&
      crosshairPosition.x <= chartArea.left + chartArea.width;
    const crosshairYInsidePane =
      crosshairPosition &&
      crosshairAreas.some(
        (area) =>
          crosshairPosition.y >= area.top &&
          crosshairPosition.y <= area.top + area.height
      );
    const crosshairInsidePricePane =
      crosshairPosition &&
      crosshairPosition.y >= chartArea.top &&
      crosshairPosition.y <= chartArea.top + chartArea.height;
    const crosshairInside = crosshairXInside && crosshairYInsidePane;

    if (crosshairInside && crosshairPosition) {
      const crosshairLogicalIndex = crosshairPosition.logicalIndex;

      if (isAuthenticated && cursorTool === 'demonstration') {
        const hoverState = paneHoverStatesRef.current[paneIndex];
        if (
          hoverState &&
          hoverState.pointerArea === 'plot' &&
          hoverState.pointerX !== null &&
          hoverState.pointerY !== null
        ) {
          ctx.fillStyle = 'rgba(242, 54, 69, 0.25)';
          ctx.beginPath();
          ctx.arc(hoverState.pointerX, hoverState.pointerY, 15, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.strokeStyle = palette.crosshair;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      crosshairAreas.forEach((area) => {
        ctx.moveTo(crosshairPosition.x, area.top);
        ctx.lineTo(crosshairPosition.x, area.top + area.height);
      });
      ctx.stroke();

      if (crosshairInsidePricePane) {
        ctx.beginPath();
        ctx.moveTo(chartArea.left, crosshairPosition.y);
        ctx.lineTo(chartArea.left + chartArea.width, crosshairPosition.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      if (crosshairInsidePricePane) {
        const priceLabel = formatPrice(crosshairPosition.dataY);
        ctx.fillStyle = palette.axisBg;
        ctx.fillRect(chartArea.left + chartArea.width + 1, crosshairPosition.y - 11, rightAxisWidth - 6, 22);
        ctx.fillStyle = palette.textBright;
        ctx.font = getCanvasFont(axisFontSize);
        ctx.textAlign = 'left';
        ctx.fillText(priceLabel, chartArea.left + chartArea.width + 7, crosshairPosition.y + 5);
      }

      const timeLabel = formatTime(timeForIndex(crosshairLogicalIndex), true);
      const timeLabelWidth = ctx.measureText(timeLabel).width + 18;
      const labelX = clamp(
        crosshairPosition.x - timeLabelWidth / 2,
        chartArea.left,
        chartArea.left + chartArea.width - timeLabelWidth
      );
      ctx.fillStyle = palette.axisBg;
      ctx.fillRect(labelX, timeScaleArea.top + 4, timeLabelWidth, 22);
      ctx.fillStyle = palette.textBright;
      ctx.textAlign = 'center';
      ctx.fillText(timeLabel, labelX + timeLabelWidth / 2, timeScaleArea.top + 19);
    }

  };

  useEffect(() => {
    const animate = () => {
      canvasRefs.current.forEach((canvas, paneIndex) => {
        if (canvas) {
          drawChart(canvas, paneIndex, {
            updateInteractionBounds: true,
            crosshairPosition: getCurrentHoverMousePosition(paneIndex),
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
    cursorTool,
    activeDrawingTool,
    drawings,
    pendingDrawing,
    selectedDrawingId,
    activeIndicators,
    paneIndicatorSeries,
    showVolume,
    theme,
    chartSettings,
    paneCount,
  ]);

  const getCanvasCursor = (paneIndex: number, pane: ChartPaneState) => {
    if (isAuthenticated && activeDrawingTool) return 'crosshair';
    if (isAuthenticated && drawingDragRef.current.mode !== 'none' && drawingDragRef.current.paneIndex === paneIndex) {
      return 'grabbing';
    }

    const hoverState = getPaneHoverState(paneIndex);
    return getCanvasCursorForState(
      pane.dragMode,
      hoverState.pointerArea,
      isAuthenticated ? hoverState.drawingHoverTarget : null
    );
  };
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
    const legendIndex =
      getHoverLegendIndex(paneIndex, pane, getCurrentHoverMousePosition(paneIndex)) ?? pane.candles.length - 1;
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
    setAuthMode(null);
    setQuickSearchQuery('');
    setSymbolSearchQuery(activeSymbol);
    setSnapshotStatus('');
    setLayoutSaveStatus('');
    setLayoutSaveTargetId(null);
    setAuthActionLabel('');
    setAuthMessage('');
    setAuthForm(DEFAULT_AUTH_FORM_STATE);
    setAuthPasswordVisible(false);
    setSettingsTarget(null);
    setMoreTarget(null);
    setActiveDrawingToolbarMenu(null);
    setDrawingToolbarStatus('');
  };
  const openAuthPanel = (mode: AuthMode, actionLabel = '') => {
    setOpenMenu(null);
    setHeaderPanel(null);
    setQuickSearchQuery('');
    setSnapshotStatus('');
    setLayoutSaveStatus('');
    setLayoutSaveTargetId(null);
    setSettingsTarget(null);
    setMoreTarget(null);
    setAuthForm(DEFAULT_AUTH_FORM_STATE);
    setAuthPasswordVisible(false);
    setAuthMode(mode);
    setAuthActionLabel(actionLabel);
    setAuthMessage(
      supabase ? '' : 'Accounts are not connected on this deployment yet.'
    );
  };
  const requireAuthenticatedAction = (actionId: HeaderPanelKey | QuickActionId) => {
    if (isAuthenticated) return true;

    openAuthPanel('signup', AUTH_ACTION_LABELS[actionId] ?? 'account tools');
    return false;
  };
  const switchAuthMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthForm((current) => ({
      ...DEFAULT_AUTH_FORM_STATE,
      email: current.email,
    }));
    setAuthPasswordVisible(false);
    setAuthMessage(supabase ? '' : 'Accounts are not connected on this deployment yet.');
  };
  const handleGenerateSignupPassword = () => {
    try {
      setAuthForm((current) => ({ ...current, password: generateSecurePassword() }));
      setAuthPasswordVisible(true);
      setAuthMessage('');
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Secure password generation failed.');
    }
  };
  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authMode) return;

    const email = authForm.email.trim();
    const password = authForm.password;
    if (!email || !password) {
      setAuthMessage('Enter your email and password.');
      return;
    }

    const passwordSecurity = getPasswordSecurityReport(password, {
      displayName: authForm.displayName,
      email,
    });

    if (authMode === 'signup' && !passwordSecurity.isValid) {
      setAuthMessage(formatPasswordSecurityMessage(passwordSecurity));
      return;
    }

    if (!supabase) {
      setAuthMessage('Accounts are not connected on this deployment yet.');
      return;
    }

    setAuthLoading(true);
    setAuthMessage('');

    try {
      pendingAuthTrackingEventRef.current = authMode === 'signup' ? 'sign_up' : 'sign_in';
      const result =
        authMode === 'signup'
          ? await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  display_name: authForm.displayName.trim() || undefined,
                },
              },
            })
          : await supabase.auth.signInWithPassword({ email, password });

      if (result.error) {
        pendingAuthTrackingEventRef.current = null;
        setAuthMessage(result.error.message);
        return;
      }

      if (authMode === 'signup' && !result.data.session) {
        pendingAuthTrackingEventRef.current = null;
        setAuthMessage('Check your email to confirm your account.');
        return;
      }

      closeHeaderOverlays();
    } catch (error) {
      pendingAuthTrackingEventRef.current = null;
      setAuthMessage(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };
  const handleOAuthSignIn = async (provider: AuthOAuthProvider) => {
    if (!supabase) {
      setAuthMessage('Accounts are not connected on this deployment yet.');
      return;
    }

    setAuthLoading(true);
    setAuthMessage('');

    try {
      pendingAuthTrackingEventRef.current = 'sign_in';
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        pendingAuthTrackingEventRef.current = null;
        setAuthMessage(error.message);
      }
    } catch (error) {
      pendingAuthTrackingEventRef.current = null;
      setAuthMessage(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };
  const handleSignOut = async () => {
    closeHeaderOverlays();
    clearDrawingInteractionState(activePaneIndex);
    drawingToolbarDragRef.current = null;
    setDrawingToolbarPosition(null);
    setDrawings([]);

    if (!supabase) {
      setAuthUser(null);
      return;
    }

    setAuthLoading(true);
    try {
      const currentSession = authSessionRef.current ?? (await supabase.auth.getSession()).data.session;
      await sendUserTrackingEvent(currentSession, 'sign_out');
      await supabase.auth.signOut();
      authSessionRef.current = null;
      setAuthUser(null);
    } finally {
      setAuthLoading(false);
    }
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
    resetPaneHoverStates((_pane, index) => layoutSync.symbol || index === activePaneIndex);
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
    resetPaneHoverStates((_pane, index) => layoutSync.interval || index === activePaneIndex);
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
    if (ACCOUNT_ONLY_HEADER_PANELS.has(panel) && !requireAuthenticatedAction(panel)) return;

    setOpenMenu(null);
    setSettingsTarget(null);
    setMoreTarget(null);
    setSnapshotStatus('');
    setHeaderPanel((current) => (current === panel ? null : panel));
  };
  const openQuickSearch = () => {
    if (!requireAuthenticatedAction('quickSearch')) return;

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
  const copyDrawingsForSnapshot = (sourceDrawings: ChartDrawing[]) =>
    sourceDrawings.map((drawing) => cloneDrawing(drawing));
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
      drawings: copyDrawingsForSnapshot(
        (isAuthenticated ? drawings : []).filter((drawing) => drawing.paneIndex < paneCount)
      ),
      panes: visiblePaneSnapshots.length > 0 ? visiblePaneSnapshots : [createSavedPaneSnapshot(activePane)],
    };
  };
  const openSaveLayoutDialog = (nameOverride?: string, targetLayoutId = activeSavedLayoutId) => {
    if (!requireAuthenticatedAction('save')) return;

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
    if (!requireAuthenticatedAction('save')) return;

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
    if (!requireAuthenticatedAction('manageLayouts')) return;

    const sourceName = activeSavedLayout?.name ?? (layoutName.trim() || `Chart layout ${savedChartLayouts.length + 1}`);
    const nextLayout = buildSavedChartLayout(`${sourceName} copy`);

    persistSavedChartLayouts([nextLayout, ...savedChartLayouts]);
    setActiveSavedLayoutId(nextLayout.id);
    setLayoutName(nextLayout.name);
    setLayoutSaveStatus('Saved copy');
  };
  const applySavedChartLayout = (layout: SavedChartLayout) => {
    if (!requireAuthenticatedAction('manageLayouts')) return;

    const layoutOption = getLayoutOptionById(layout.selectedLayoutId);
    const paneSnapshots = layout.panes.length > 0 ? layout.panes : [createSavedPaneSnapshot(createChartPaneState())];
    const restoreNonce = Date.now();
    const restoredPanes = Array.from({ length: layoutOption.cells.length }, (_unused, index) =>
      createChartPaneStateFromSnapshot(paneSnapshots[index] ?? paneSnapshots[0], restoreNonce)
    );

    paneHoverStatesRef.current = Array.from({ length: layoutOption.cells.length }, createPaneHoverState);
    requestLegendRender();
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
    setDrawings(
      sanitizeSavedDrawings(layout.drawings, layoutOption.cells.length).map((drawing, index) => ({
        ...drawing,
        id: `${drawing.kind}-${Date.now()}-${index}`,
      }))
    );
    setSelectedDrawingId(null);
    setActiveDrawingToolbarMenu(null);
    setDrawingToolbarStatus('');
    setPendingDrawing(null);
    setActiveDrawingTool(null);
    setChartPanes(restoredPanes);
    setActivePaneIndex(clamp(layout.activePaneIndex, 0, Math.max(0, layoutOption.cells.length - 1)));
    setActiveSavedLayoutId(layout.id);
    setLayoutName(layout.name);
    closeHeaderOverlays();
  };
  const removeSavedChartLayout = (layoutId: string) => {
    if (!requireAuthenticatedAction('manageLayouts')) return;

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
    if (!isAuthenticated || !layoutAutosave || !activeSavedLayoutId) return;

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
    drawings,
    isAuthenticated,
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
    if (!requireAuthenticatedAction('templates')) return;

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
    if (!requireAuthenticatedAction('templates')) return;

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
    if (!requireAuthenticatedAction('templates')) return;

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
    if (!requireAuthenticatedAction('snapshot')) return;

    closeHeaderOverlays();

    const canvas = canvasRefs.current[activePaneIndex];
    if (!canvas) return;

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `procharting-${activeSymbol.toLowerCase()}-${activeTimeframe}.png`;
    link.click();
  };
  const copySnapshotLink = async () => {
    if (!requireAuthenticatedAction('snapshot')) return;

    try {
      await navigator.clipboard.writeText(window.location.href);
      setSnapshotStatus('Link copied');
    } catch {
      setSnapshotStatus('Copy failed');
    }
  };
  const copySnapshotImage = () => {
    if (!requireAuthenticatedAction('snapshot')) return;

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
    if (!requireAuthenticatedAction('snapshot')) return;

    const canvas = canvasRefs.current[activePaneIndex];
    if (!canvas) return;

    window.open(canvas.toDataURL('image/png'), '_blank', 'noopener,noreferrer');
    setSnapshotStatus('Opened in new tab');
  };
  const executeQuickAction = (actionId: QuickActionId) => {
    setQuickSearchQuery('');

    if (ACCOUNT_ONLY_QUICK_ACTIONS.has(actionId) && !requireAuthenticatedAction(actionId)) return;

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
    const timeframeLabel = pane ? formatTimeframeLabel(pane.timeframe) : '';

    return chartSettings.showStatusLine && pane && legendCandle ? (
        <div
          className="instrument-legend-overlay"
          aria-label={`${formatSymbol(pane.symbol)} ${timeframeLabel} OHLC legend pane ${paneIndex + 1}`}
        >
          <span className="instrument-legend-symbol">
            {formatSymbol(pane.symbol)} {timeframeLabel}
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

    if (!chartSettings.showIndicatorLegend || activeIndicators.length === 0 || !pane || !legendCandle) {
      return null;
    }

    const canvas = canvasRefs.current[paneIndex];
    const rect = canvas?.getBoundingClientRect();
    const visualLayout = rect
      ? getChartVisualLayout({
          width: rect.width,
          height: rect.height,
          showVolume,
          oscillatorIndicators: visibleOscillatorIndicators,
        })
      : null;
    const visibleVolumeIndicatorId =
      showVolume && visualLayout?.volumeArea.height ? visibleVolumeIndicator?.id ?? null : null;
    const visibleOscillatorIndicatorIds = new Set(
      visualLayout?.oscillatorPaneAreas
        .filter((area) => area.height > 0)
        .map((area) => area.indicator.id) ?? []
    );
    const getLegendStyleForArea = (area: ChartCanvasArea): CSSProperties => ({
      left: area.left + 2,
      maxWidth: Math.max(168, area.width - 8),
      top: area.top + 4,
    });
    const getSettingsPlacementForArea = (area: ChartCanvasArea) =>
      rect && area.top + 260 > rect.height ? 'above' : 'below';
    const visibleOscillatorIndicatorOrder =
      visualLayout?.oscillatorPaneAreas
        .filter((area) => area.height > 0)
        .map((area) => area.indicator.id) ?? [];
    const priceIndicators = activeIndicators.filter((indicator) => {
      const definition = getIndicatorDefinition(indicator.definitionId);

      if (definition.pane === 'price') return true;
      if (!indicator.visible) return true;
      if (definition.pane === 'volume') return indicator.id !== visibleVolumeIndicatorId;
      if (definition.pane === 'oscillator') return !visibleOscillatorIndicatorIds.has(indicator.id);
      return false;
    });
    const priceIndicatorIds = priceIndicators.map((indicator) => indicator.id);
    const volumeIndicatorIds = visibleVolumeIndicatorId ? [visibleVolumeIndicatorId] : [];

    const renderLegendRow = (
      indicator: ActiveIndicator,
      settingsPlacement: 'above' | 'below',
      visualGroupIds: string[]
    ) => {
      const definition = getIndicatorDefinition(indicator.definitionId);
      const computed = activeIndicatorSeries[indicator.id];
      const indicatorValues = getIndicatorLegendValues({
        indicator,
        definition,
        computed,
        legendIndex,
        legendCandle,
        defaultColor: palette.text,
        positiveColor: palette.green,
        negativeColor: palette.red,
      });
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
      const signalPeriodMax = canEditMacd ? 50 : 200;
      const primaryColorLabel =
        definition.formula === 'volume'
          ? 'Up color'
          : definition.formula === 'bb'
            ? 'Basis color'
            : definition.formula === 'donchian'
              ? 'Upper color'
              : definition.formula === 'macd'
                ? 'MACD color'
                : definition.formula === 'stochastic'
                  ? '%K color'
                  : 'Color';
      const secondaryColorLabel =
        definition.formula === 'volume'
          ? 'Down color'
          : definition.formula === 'bb'
            ? 'Upper color'
            : definition.formula === 'donchian'
              ? 'Lower color'
              : definition.formula === 'macd'
                ? 'Signal color'
                : definition.formula === 'stochastic'
                  ? '%D color'
                  : null;
      const tertiaryColorLabel =
        definition.formula === 'bb'
          ? 'Lower color'
          : definition.formula === 'donchian'
            ? 'Basis color'
            : null;
      const canEditFillColor = definition.formula === 'bb';
      const canEditHistogramColors = definition.formula === 'macd';
      const visualGroupIndex = visualGroupIds.indexOf(indicator.id);
      const canMoveUp = visualGroupIndex > 0;
      const canMoveDown = visualGroupIndex >= 0 && visualGroupIndex < visualGroupIds.length - 1;

      return (
        <div
          key={`${paneIndex}-${indicator.id}`}
          className="indicator-legend-row"
          data-visible={indicator.visible}
          data-settings-open={settingsTarget?.indicatorId === indicator.id && settingsTarget.paneIndex === paneIndex}
          data-more-open={moreTarget?.indicatorId === indicator.id && moreTarget.paneIndex === paneIndex}
          data-settings-placement={settingsPlacement}
        >
          <div className="indicator-legend-main">
            <span className="indicator-legend-title">{getIndicatorLegendName(indicator, pane.symbol)}</span>
            {indicatorValues.map((item) => (
              <span
                key={`${paneIndex}-${indicator.id}-${item.label}`}
                className="indicator-legend-value"
                style={{ color: item.color }}
              >
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
                <span>{primaryColorLabel}</span>
                <input
                  type="color"
                  value={colorToInputValue(settings.color ?? definition.defaults.color)}
                  onChange={(event) => updateIndicatorSettings(indicator.id, { color: event.target.value })}
                />
              </label>
              {secondaryColorLabel && (
                <label>
                  <span>{secondaryColorLabel}</span>
                  <input
                    type="color"
                    value={colorToInputValue(settings.secondaryColor ?? definition.defaults.secondaryColor, '#ff6d00')}
                    onChange={(event) => updateIndicatorSettings(indicator.id, { secondaryColor: event.target.value })}
                  />
                </label>
              )}
              {tertiaryColorLabel && (
                <label>
                  <span>{tertiaryColorLabel}</span>
                  <input
                    type="color"
                    value={colorToInputValue(settings.tertiaryColor ?? definition.defaults.tertiaryColor, '#7c8da6')}
                    onChange={(event) => updateIndicatorSettings(indicator.id, { tertiaryColor: event.target.value })}
                  />
                </label>
              )}
              {canEditFillColor && (
                <label>
                  <span>Fill color</span>
                  <input
                    type="color"
                    value={colorToInputValue(settings.fillColor ?? definition.defaults.fillColor, '#2962ff')}
                    onChange={(event) =>
                      updateIndicatorSettings(indicator.id, { fillColor: hexToRgba(event.target.value, 0.08) })
                    }
                  />
                </label>
              )}
              {canEditHistogramColors && (
                <>
                  <label>
                    <span>Histogram positive</span>
                    <input
                      type="color"
                      value={colorToInputValue(
                        settings.histogramPositiveColor ?? definition.defaults.histogramPositiveColor,
                        '#26a69a'
                      )}
                      onChange={(event) =>
                        updateIndicatorSettings(indicator.id, { histogramPositiveColor: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span>Histogram negative</span>
                    <input
                      type="color"
                      value={colorToInputValue(
                        settings.histogramNegativeColor ?? definition.defaults.histogramNegativeColor,
                        '#ef5350'
                      )}
                      onChange={(event) =>
                        updateIndicatorSettings(indicator.id, { histogramNegativeColor: event.target.value })
                      }
                    />
                  </label>
                </>
              )}
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
                    <span>Fast length</span>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={sanitizePeriod(settings.fastPeriod, definition.defaults.fastPeriod ?? 12)}
                      onChange={(event) =>
                        updateIndicatorSettings(indicator.id, { fastPeriod: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label>
                    <span>Slow length</span>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={sanitizePeriod(settings.slowPeriod, definition.defaults.slowPeriod ?? 26)}
                      onChange={(event) =>
                        updateIndicatorSettings(indicator.id, { slowPeriod: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label>
                    <span>Oscillator MA type</span>
                    <select
                      value={settings.oscillatorMaType ?? definition.defaults.oscillatorMaType ?? 'EMA'}
                      onChange={(event) =>
                        updateIndicatorSettings(indicator.id, {
                          oscillatorMaType: event.target.value as IndicatorMaType,
                        })
                      }
                    >
                      {INDICATOR_MA_TYPE_OPTIONS.map((maType) => (
                        <option key={maType} value={maType}>
                          {maType}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {canEditSignal && (
                <label>
                  <span>{canEditMacd ? 'Signal smoothing' : 'Signal'}</span>
                  <input
                    type="number"
                    min="1"
                    max={signalPeriodMax}
                    value={sanitizePeriod(
                      settings.signalPeriod,
                      definition.defaults.signalPeriod ?? 9,
                      1,
                      signalPeriodMax
                    )}
                    onChange={(event) =>
                      updateIndicatorSettings(indicator.id, { signalPeriod: Number(event.target.value) })
                    }
                  />
                </label>
              )}
              {canEditMacd && (
                <label>
                  <span>Signal line MA type</span>
                  <select
                    value={settings.signalMaType ?? definition.defaults.signalMaType ?? 'EMA'}
                    onChange={(event) =>
                      updateIndicatorSettings(indicator.id, { signalMaType: event.target.value as IndicatorMaType })
                    }
                  >
                    {INDICATOR_MA_TYPE_OPTIONS.map((maType) => (
                      <option key={maType} value={maType}>
                        {maType}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          {moreTarget?.indicatorId === indicator.id && moreTarget.paneIndex === paneIndex && (
            <div className="indicator-more-panel" role="menu" aria-label={`${definition.name} actions`}>
              <button type="button" role="menuitem" onClick={() => duplicateIndicator(indicator.id)}>
                Duplicate
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={!canMoveUp}
                onClick={() => moveIndicator(indicator.id, -1, visualGroupIds)}
              >
                Move up
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={!canMoveDown}
                onClick={() => moveIndicator(indicator.id, 1, visualGroupIds)}
              >
                Move down
              </button>
            </div>
          )}
        </div>
      );
    };

    return (
      <div
        ref={attachRef ? indicatorLegendRef : undefined}
        className="indicator-legend-layer"
        aria-label={`Active indicators pane ${paneIndex + 1}`}
      >
        {priceIndicators.length > 0 && (
          <div
            className="indicator-legend-overlay indicator-legend-overlay-price"
            data-visual-pane="price"
            aria-label={`Price indicators pane ${paneIndex + 1}`}
          >
            {priceIndicators.map((indicator) => renderLegendRow(indicator, 'below', priceIndicatorIds))}
          </div>
        )}
        {visualLayout && visibleVolumeIndicatorId && visibleVolumeIndicator && (
          <div
            className="indicator-legend-overlay indicator-legend-overlay-floating"
            data-visual-pane="volume"
            style={getLegendStyleForArea(visualLayout.volumeArea)}
            aria-label={`Volume indicators pane ${paneIndex + 1}`}
          >
            {renderLegendRow(
              visibleVolumeIndicator,
              getSettingsPlacementForArea(visualLayout.volumeArea),
              volumeIndicatorIds
            )}
          </div>
        )}
        {visualLayout?.oscillatorPaneAreas
          .filter((area) => area.height > 0)
          .map((area) => (
            <div
              key={`${paneIndex}-${area.indicator.id}-pane-legend`}
              className="indicator-legend-overlay indicator-legend-overlay-floating"
              data-visual-pane="oscillator"
              style={getLegendStyleForArea(area)}
              aria-label={`${getIndicatorDefinition(area.indicator.definitionId).name} pane ${paneIndex + 1}`}
            >
              {renderLegendRow(area.indicator, getSettingsPlacementForArea(area), visibleOscillatorIndicatorOrder)}
            </div>
          ))}
      </div>
    );
  };
  const retryPane = (paneIndex: number) => {
    updatePaneState(paneIndex, (pane) => ({ ...pane, refreshNonce: pane.refreshNonce + 1 }));
  };
  const getPaneDrawingCount = (paneIndex: number) =>
    isAuthenticated ? drawings.filter((drawing) => drawing.paneIndex === paneIndex).length : 0;
  const getSelectedDrawingForPane = (paneIndex: number) =>
    isAuthenticated
      ? drawings.find((drawing) => drawing.id === selectedDrawingId && drawing.paneIndex === paneIndex) ?? null
      : null;
  const getSelectedDrawingStateLabel = (paneIndex: number) => {
    const drawing = getSelectedDrawingForPane(paneIndex);
    if (!drawing) return '';

    return [
      drawing.kind,
      drawing.locked ? 'locked' : 'unlocked',
      drawing.visible ? 'visible' : 'hidden',
      drawing.color,
      `opacity:${drawing.opacity.toFixed(2)}`,
      `${drawing.lineWidth}px`,
      drawing.lineStyle,
      `extend:${drawing.extend}`,
      `left:${drawing.leftEnd}`,
      `right:${drawing.rightEnd}`,
      drawing.showText ? `text:${drawing.text}` : 'text-off',
      `textColor:${drawing.textColor}`,
      `textSize:${drawing.textSize}`,
      drawing.textBold ? 'text-bold' : 'text-regular',
      drawing.textItalic ? 'text-italic' : 'text-normal',
      `textAlign:${drawing.textAlignment}`,
      `textVertical:${drawing.textVerticalAlignment}`,
      drawing.showMiddlePoint ? 'middle-on' : 'middle-off',
      drawing.showPriceLabels ? 'labels-on' : 'labels-off',
      drawing.stats.priceRange ? 'stats-price-on' : 'stats-price-off',
      drawing.stats.percentChange ? 'stats-percent-on' : 'stats-percent-off',
      drawing.stats.change ? 'stats-change-on' : 'stats-change-off',
      drawing.stats.barsRange ? 'stats-bars-on' : 'stats-bars-off',
      drawing.stats.dateTimeRange ? 'stats-time-on' : 'stats-time-off',
      drawing.stats.distance ? 'stats-distance-on' : 'stats-distance-off',
      drawing.stats.angle ? 'stats-angle-on' : 'stats-angle-off',
      drawing.stats.alwaysShow ? 'stats-always-on' : 'stats-always-off',
      `statsPosition:${drawing.stats.position}`,
      drawing.alertEnabled ? 'alert-on' : 'alert-off',
      `alertCondition:${drawing.alertCondition}`,
      `alertFrequency:${drawing.alertFrequency}`,
      `visibility:${drawing.visibility}`,
      ...DRAWING_TIMEFRAME_VALUES.map((timeframe) =>
        drawing.timeframeVisibility[timeframe] === false ? `${timeframe}:hidden` : `${timeframe}:visible`
      ),
      drawing.syncInLayout ? 'sync-layout-on' : 'sync-layout-off',
      drawing.syncGlobally ? 'sync-global-on' : 'sync-global-off',
      ...drawing.anchors.map((anchor) => `${anchor.logicalIndex.toFixed(2)},${anchor.price.toFixed(2)}`),
    ].join('|');
  };
  const getDrawingToolbarMetrics = (paneIndex: number) => {
    const canvas = canvasRefs.current[paneIndex];
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return null;

    const toolbarWidth = Math.min(430, Math.max(220, rect.width - 20));
    const toolbarHeight =
      selectedDrawingToolbarRef.current?.getBoundingClientRect().height || DRAWING_FLOATING_TOOLBAR_HEIGHT;
    const margin = DRAWING_FLOATING_TOOLBAR_MARGIN;

    return {
      canvasRect: rect,
      toolbarWidth,
      toolbarHeight,
      minLeft: margin,
      minTop: margin,
      maxLeft: Math.max(margin, rect.width - toolbarWidth - margin),
      maxTop: Math.max(margin, rect.height - toolbarHeight - margin),
    };
  };
  const clampDrawingToolbarPosition = (
    paneIndex: number,
    left: number,
    top: number,
    toolbarWidth?: number,
    toolbarHeight?: number
  ): DrawingToolbarPosition | null => {
    const metrics = getDrawingToolbarMetrics(paneIndex);
    if (!metrics) return null;

    const maxLeft = Math.max(
      metrics.minLeft,
      metrics.canvasRect.width - (toolbarWidth ?? metrics.toolbarWidth) - DRAWING_FLOATING_TOOLBAR_MARGIN
    );
    const maxTop = Math.max(
      metrics.minTop,
      metrics.canvasRect.height - (toolbarHeight ?? metrics.toolbarHeight) - DRAWING_FLOATING_TOOLBAR_MARGIN
    );

    return {
      paneIndex,
      left: clamp(left, metrics.minLeft, maxLeft),
      top: clamp(top, metrics.minTop, maxTop),
    };
  };
  const getSelectedDrawingToolbarStyle = (paneIndex: number): CSSProperties | null => {
    const drawing = getSelectedDrawingForPane(paneIndex);
    const metrics = getDrawingToolbarMetrics(paneIndex);
    if (!drawing || !metrics) return null;

    if (drawingToolbarPosition?.paneIndex === paneIndex) {
      const position = clampDrawingToolbarPosition(
        paneIndex,
        drawingToolbarPosition.left,
        drawingToolbarPosition.top
      );
      if (position) {
        return { left: position.left, top: position.top, width: metrics.toolbarWidth };
      }
    }

    const bounds = chartBoundsRefs.current[paneIndex] ?? createDefaultChartBounds();
    const chartArea = bounds.chartArea;

    const toolbarCenterX =
      chartArea.width > 0 ? chartArea.left + chartArea.width / 2 : metrics.canvasRect.width / 2;
    const left = clamp(
      toolbarCenterX - metrics.toolbarWidth / 2,
      metrics.minLeft,
      metrics.maxLeft
    );
    const top = clamp(
      chartArea.height > 0 ? chartArea.top + 14 : metrics.minTop,
      metrics.minTop,
      metrics.maxTop
    );

    return { left, top, width: metrics.toolbarWidth };
  };
  const handleDrawingToolbarDragStart = (paneIndex: number, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!isAuthenticated) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const toolbarRect = selectedDrawingToolbarRef.current?.getBoundingClientRect();
    const style = getSelectedDrawingToolbarStyle(paneIndex);
    if (!toolbarRect || !style || typeof style.left !== 'number' || typeof style.top !== 'number') return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);

    drawingToolbarDragRef.current = {
      paneIndex,
      pointerId: event.pointerId,
      left: style.left,
      top: style.top,
      startClientX: event.clientX,
      startClientY: event.clientY,
      toolbarWidth: toolbarRect.width,
      toolbarHeight: toolbarRect.height,
    };
  };
  const handleDrawingToolbarDragMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = drawingToolbarDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();

    const position = clampDrawingToolbarPosition(
      drag.paneIndex,
      drag.left + event.clientX - drag.startClientX,
      drag.top + event.clientY - drag.startClientY,
      drag.toolbarWidth,
      drag.toolbarHeight
    );
    if (position) {
      setDrawingToolbarPosition(position);
    }
  };
  const handleDrawingToolbarDragEnd = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = drawingToolbarDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.releasePointerCapture(event.pointerId);
    drawingToolbarDragRef.current = null;
  };
  const renderDrawingMenuEntry = (entry: DrawingMenuEntry) => {
    if (entry.type === 'section') {
      return (
        <span key={entry.label} className="drawing-tool-menu-section" role="presentation">
          {entry.label}
        </span>
      );
    }

    const active = entry.tool !== undefined && activeDrawingTool === entry.tool;
    const handleEntryClick = () => {
      if (entry.disabled) return;
      if (entry.tool) {
        selectDrawingTool(entry.tool);
      }
    };

    return (
      <button
        key={entry.id}
        type="button"
        role="menuitemradio"
        aria-checked={active}
        aria-disabled={entry.disabled ? 'true' : undefined}
        className="drawing-tool-menu-item"
        data-active={active}
        data-disabled={entry.disabled === true}
        onClick={handleEntryClick}
      >
        <span className={`drawing-tool-icon ${entry.icon}`} aria-hidden="true">
          {FIB_TOOL_ICONS[entry.icon] ?? PATTERN_TOOL_ICONS[entry.icon] ?? null}
        </span>
        <span>{entry.label}</span>
        {entry.shortcut && <kbd>{entry.shortcut}</kbd>}
      </button>
    );
  };
  const renderCursorMenuEntry = (entry: CursorMenuEntry, index: number) => {
    if (entry.type === 'divider') {
      return (
        <div key={`divider-${index}`} className="cursor-menu-divider" role="separator">
          <div className="cursor-menu-divider-line" />
        </div>
      );
    }

    const selected = cursorTool === entry.id;
    const favorite = favoriteCursorTools[entry.id] === true;
    const favoriteLabel = favorite ? 'Remove from favorites' : 'Add to favorites';

    return (
      <div
        key={entry.id}
        role="menuitemradio"
        aria-checked={selected}
        aria-label={CURSOR_TOOL_LABELS[entry.id]}
        tabIndex={0}
        className="cursor-menu-item"
        data-selected={selected}
        onClick={() => selectCursorTool(entry.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectCursorTool(entry.id);
          }
        }}
      >
        <span className="cursor-menu-item-icon" aria-hidden="true">
          {CURSOR_TOOL_ICONS[entry.id]}
        </span>
        <span className="cursor-menu-item-label">{CURSOR_TOOL_LABELS[entry.id]}</span>
        <button
          type="button"
          className="cursor-menu-item-favorite"
          data-favorite={favorite}
          aria-label={favoriteLabel}
          title={favoriteLabel}
          tabIndex={-1}
          onClick={(event) => {
            event.stopPropagation();
            toggleCursorToolFavorite(entry.id);
          }}
        >
          {favorite ? CURSOR_FAVORITE_FILLED_ICON : CURSOR_FAVORITE_OUTLINE_ICON}
        </button>
      </div>
    );
  };
  const handleCursorMainButtonClick = () => {
    if (!isAuthenticated) {
      clearDrawingInteractionState();
      return;
    }

    if (activeDrawingTool !== null) {
      selectCursorTool(cursorTool);
      return;
    }

    toggleDrawingMenu('cursor');
  };
  const renderDrawingToolRail = () => {
    if (!isAuthenticated) return null;

    const visibleLineTool =
      activeDrawingTool !== null && !isFibDrawingTool(activeDrawingTool) && !isPatternDrawingTool(activeDrawingTool)
        ? activeDrawingTool
        : lastDrawingTool;
    const visibleFibTool =
      activeDrawingTool !== null && isFibDrawingTool(activeDrawingTool) ? activeDrawingTool : lastFibTool;
    const visiblePatternTool =
      activeDrawingTool !== null && isPatternDrawingTool(activeDrawingTool) ? activeDrawingTool : lastPatternTool;

    return (
      <div className="drawing-tool-rail" role="toolbar" aria-label="Drawing tools" ref={drawingToolsRef}>
        <div className="drawing-tool-group">
          <div className="drawing-cursor-control">
            <button
              type="button"
              className="drawing-cursor-main"
              aria-label={`Cursor tool, ${CURSOR_TOOL_LABELS[cursorTool]}`}
              title={CURSOR_TOOL_LABELS[cursorTool]}
              aria-haspopup="menu"
              aria-expanded={activeDrawingMenu === 'cursor'}
              data-active={activeDrawingTool === null}
              onClick={handleCursorMainButtonClick}
            >
              <span className="drawing-cursor-icon" aria-hidden="true">
                {CURSOR_TOOL_ICONS[cursorTool]}
              </span>
            </button>
          </div>
          {activeDrawingMenu === 'cursor' && (
            <div className="drawing-tool-menu cursor-menu" role="menu" aria-label="Cursors">
              {CURSOR_MENU_ENTRIES.map(renderCursorMenuEntry)}
              <div className="cursor-menu-divider" role="separator">
                <div className="cursor-menu-divider-line" />
              </div>
              <div
                role="menuitemcheckbox"
                aria-checked={valuesTooltipOnLongPress}
                tabIndex={0}
                className="cursor-menu-toggle"
                onClick={toggleValuesTooltipOnLongPress}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleValuesTooltipOnLongPress();
                  }
                }}
              >
                <span className="cursor-menu-toggle-label">Values tooltip on long press</span>
                <span className="cursor-menu-switch" data-checked={valuesTooltipOnLongPress} aria-hidden="true">
                  <span className="cursor-menu-switch-thumb" />
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="drawing-tool-group">
          <button
            type="button"
            aria-label={`${DRAWING_TOOL_LABELS[visibleLineTool]} drawing tool group`}
            aria-haspopup="menu"
            aria-expanded={activeDrawingMenu === 'line-tools'}
            title={DRAWING_TOOL_LABELS[visibleLineTool]}
            data-active={
              activeDrawingMenu === 'line-tools' ||
              (activeDrawingTool !== null &&
                !isFibDrawingTool(activeDrawingTool) &&
                !isPatternDrawingTool(activeDrawingTool))
            }
            onClick={() => toggleDrawingMenu('line-tools')}
          >
            <span className={`drawing-tool-icon ${visibleLineTool}`} aria-hidden="true" />
          </button>
          {activeDrawingMenu === 'line-tools' && (
            <div className="drawing-tool-menu line-tools-menu" role="menu" aria-label="Trend line tools">
              {LINE_TOOL_MENU_ENTRIES.map(renderDrawingMenuEntry)}
            </div>
          )}
        </div>
        <div className="drawing-tool-group">
          <button
            type="button"
            aria-label={`${DRAWING_TOOL_LABELS[visibleFibTool]} drawing tool group`}
            aria-haspopup="menu"
            aria-expanded={activeDrawingMenu === 'fib-tools'}
            title={DRAWING_TOOL_LABELS[visibleFibTool]}
            data-active={
              activeDrawingMenu === 'fib-tools' || (activeDrawingTool !== null && isFibDrawingTool(activeDrawingTool))
            }
            onClick={() => toggleDrawingMenu('fib-tools')}
          >
            <span className={`drawing-tool-icon ${visibleFibTool}`} aria-hidden="true">
              {FIB_TOOL_ICONS[visibleFibTool] ?? null}
            </span>
          </button>
          {activeDrawingMenu === 'fib-tools' && (
            <div className="drawing-tool-menu line-tools-menu fib-tools-menu" role="menu" aria-label="Fibonacci tools">
              {FIB_TOOL_MENU_ENTRIES.map(renderDrawingMenuEntry)}
            </div>
          )}
        </div>
        <div className="drawing-tool-group">
          <button
            type="button"
            aria-label={`${DRAWING_TOOL_LABELS[visiblePatternTool]} drawing tool group`}
            aria-haspopup="menu"
            aria-expanded={activeDrawingMenu === 'pattern-tools'}
            title={DRAWING_TOOL_LABELS[visiblePatternTool]}
            data-active={
              activeDrawingMenu === 'pattern-tools' ||
              (activeDrawingTool !== null && isPatternDrawingTool(activeDrawingTool))
            }
            onClick={() => toggleDrawingMenu('pattern-tools')}
          >
            <span className={`drawing-tool-icon ${visiblePatternTool}`} aria-hidden="true">
              {PATTERN_TOOL_ICONS[visiblePatternTool] ?? null}
            </span>
          </button>
          {activeDrawingMenu === 'pattern-tools' && (
            <div
              className="drawing-tool-menu line-tools-menu pattern-tools-menu"
              role="menu"
              aria-label="Chart pattern tools"
            >
              {PATTERN_TOOL_MENU_ENTRIES.map(renderDrawingMenuEntry)}
            </div>
          )}
        </div>
      </div>
    );
  };
  const renderSelectedDrawingToolbar = (paneIndex: number) => {
    const drawing = getSelectedDrawingForPane(paneIndex);
    const style = getSelectedDrawingToolbarStyle(paneIndex);
    if (!isAuthenticated || !drawing || !style) return null;
    const drawingCoordinatePoints = drawing.anchors;
    const pointOne = drawing.anchors[0];
    const pointTwo = drawing.anchors[1];
    const usesTabbedSettingsDialog = true;
    const closeDrawingSettingsDialog = () => {
      setActiveDrawingToolbarMenu(null);
      setDrawingToolbarStatus('');
    };
    const handleDrawingSettingsTemplateAction = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const action = event.target.value;
      event.target.value = '';

      if (action === 'save') {
        saveDrawingStylePreset(drawing);
      } else if (action === 'apply') {
        applyDrawingStylePreset();
      } else if (action === 'reset') {
        resetSelectedDrawingStyle();
      }
    };
    const isVisibilityGroupChecked = (group: (typeof DRAWING_VISIBILITY_GROUPS)[number]) =>
      group.timeframes.length === 0 ||
      group.timeframes.every((timeframe) => drawing.timeframeVisibility[timeframe] !== false);
    const updateVisibilityGroup = (
      group: (typeof DRAWING_VISIBILITY_GROUPS)[number],
      checked: boolean
    ) => {
      if (group.timeframes.length === 0) return;

      patchSelectedDrawing({
        timeframeVisibility: {
          ...drawing.timeframeVisibility,
          ...group.timeframes.reduce<Record<string, boolean>>((nextVisibility, timeframe) => {
            nextVisibility[timeframe] = checked;
            return nextVisibility;
          }, {}),
        },
      });
    };
    const renderDialogFooter = () => (
      <div className="drawing-settings-dialog-footer">
        <select
          aria-label="Drawing template action"
          className="drawing-settings-template-select"
          defaultValue=""
          onChange={handleDrawingSettingsTemplateAction}
        >
          <option value="">Template</option>
          <option value="save">Save current style</option>
          <option value="apply">Apply saved style</option>
          <option value="reset">Reset style</option>
        </select>
        <div className="drawing-settings-dialog-actions">
          <button type="button" onClick={closeDrawingSettingsDialog}>
            Cancel
          </button>
          <button type="button" className="drawing-settings-ok-button" onClick={closeDrawingSettingsDialog}>
            Ok
          </button>
        </div>
      </div>
    );
    const renderDrawingSettingsTabPanel = () => {
      if (activeDrawingSettingsTab === 'style') {
        return (
          <div className="drawing-settings-tab-panel">
            <div className="drawing-settings-row">
              <span>Line</span>
              <div className="drawing-settings-inline-controls">
                <label className="drawing-settings-color-picker" aria-label="Line color">
                  <input
                    type="color"
                    value={colorToInputValue(drawing.color, DRAWING_DEFAULT_COLOR)}
                    onChange={(event) => patchSelectedDrawing({ color: event.target.value })}
                  />
                  <span style={{ backgroundColor: drawing.color }} aria-hidden="true" />
                </label>
                <select
                  aria-label="Line style"
                  className="drawing-settings-line-select"
                  value={drawing.lineStyle}
                  onChange={(event) => patchSelectedDrawing({ lineStyle: event.target.value as DrawingLineStyle })}
                >
                  {DRAWING_LINE_STYLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {!isFibDrawingTool(drawing.kind) && !isPatternDrawingTool(drawing.kind) && (
                  <>
                    <button
                      type="button"
                      className="drawing-settings-end-button"
                      aria-label="Toggle left arrow end"
                      data-active={drawing.leftEnd === 'arrow'}
                      onClick={() => patchSelectedDrawing({ leftEnd: drawing.leftEnd === 'arrow' ? 'none' : 'arrow' })}
                    >
                      <span className="drawing-settings-line-end-sample" data-end="left" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="drawing-settings-end-button"
                      aria-label="Toggle right arrow end"
                      data-active={drawing.rightEnd === 'arrow'}
                      onClick={() => patchSelectedDrawing({ rightEnd: drawing.rightEnd === 'arrow' ? 'none' : 'arrow' })}
                    >
                      <span className="drawing-settings-line-end-sample" data-end="right" aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            </div>
            {(drawing.kind === 'trend-line' || isFibExtendableDrawingTool(drawing.kind)) && (
              <label className="drawing-settings-row">
                <span>Extend</span>
                <select
                  value={drawing.extend}
                  onChange={(event) => patchSelectedDrawing({ extend: event.target.value as DrawingExtendMode })}
                >
                  {DRAWING_EXTEND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {isFibDrawingTool(drawing.kind) && (
              <>
                {(isFibExtendableDrawingTool(drawing.kind) || drawing.kind === 'fib-spiral') && (
                  <label className="drawing-settings-checkbox-row">
                    <input
                      type="checkbox"
                      checked={drawing.fibReverse}
                      onChange={(event) => patchSelectedDrawing({ fibReverse: event.target.checked })}
                    />
                    <span>{drawing.kind === 'fib-spiral' ? 'Counterclockwise' : 'Reverse'}</span>
                  </label>
                )}
                {drawing.fibLevels.length > 0 && (
                  <>
                    <label className="drawing-settings-checkbox-row">
                      <input
                        type="checkbox"
                        checked={drawing.fibShowLevelLabels}
                        onChange={(event) => patchSelectedDrawing({ fibShowLevelLabels: event.target.checked })}
                      />
                      <span>Level labels</span>
                    </label>
                    {(drawing.kind === 'fib-retracement' || drawing.kind === 'fib-extension') && (
                      <label className="drawing-settings-checkbox-row">
                        <input
                          type="checkbox"
                          checked={drawing.fibShowPriceLabels}
                          onChange={(event) => patchSelectedDrawing({ fibShowPriceLabels: event.target.checked })}
                        />
                        <span>Prices in labels</span>
                      </label>
                    )}
                    {drawing.kind !== 'fib-time-zone' && drawing.kind !== 'fib-trend-time' && (
                      <label className="drawing-settings-checkbox-row">
                        <input
                          type="checkbox"
                          checked={drawing.fibBackground}
                          onChange={(event) => patchSelectedDrawing({ fibBackground: event.target.checked })}
                        />
                        <span>Background</span>
                      </label>
                    )}
                    <span className="drawing-settings-section-label">Levels</span>
                    <div className="drawing-settings-fib-levels">
                      {drawing.fibLevels.map((level, index) => (
                        <div key={index} className="drawing-settings-fib-level-row">
                          <input
                            type="checkbox"
                            aria-label={`Toggle level ${formatFibLevelValue(level.value)}`}
                            checked={level.enabled}
                            onChange={(event) =>
                              patchSelectedDrawing({
                                fibLevels: drawing.fibLevels.map((current, currentIndex) =>
                                  currentIndex === index ? { ...current, enabled: event.target.checked } : current
                                ),
                              })
                            }
                          />
                          <input
                            type="number"
                            step="0.001"
                            aria-label={`Level ${index + 1} value`}
                            value={Number(formatFibLevelValue(level.value))}
                            onChange={(event) => {
                              const nextValue = Number(event.target.value);
                              if (!Number.isFinite(nextValue)) return;

                              patchSelectedDrawing({
                                fibLevels: drawing.fibLevels.map((current, currentIndex) =>
                                  currentIndex === index ? { ...current, value: nextValue } : current
                                ),
                              });
                            }}
                          />
                          <label className="drawing-settings-color-picker" aria-label={`Level ${index + 1} color`}>
                            <input
                              type="color"
                              value={colorToInputValue(level.color, DRAWING_DEFAULT_COLOR)}
                              onChange={(event) =>
                                patchSelectedDrawing({
                                  fibLevels: drawing.fibLevels.map((current, currentIndex) =>
                                    currentIndex === index ? { ...current, color: event.target.value } : current
                                  ),
                                })
                              }
                            />
                            <span style={{ backgroundColor: level.color }} aria-hidden="true" />
                          </label>
                          <button
                            type="button"
                            className="drawing-settings-fib-level-remove"
                            aria-label={`Remove level ${formatFibLevelValue(level.value)}`}
                            onClick={() =>
                              patchSelectedDrawing({
                                fibLevels: drawing.fibLevels.filter((_, currentIndex) => currentIndex !== index),
                              })
                            }
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="drawing-settings-fib-level-add"
                        disabled={drawing.fibLevels.length >= 24}
                        onClick={() => {
                          const lastLevel = drawing.fibLevels[drawing.fibLevels.length - 1];
                          const nextValue = lastLevel ? Number((lastLevel.value + 0.5).toFixed(3)) : 0;
                          patchSelectedDrawing({
                            fibLevels: [
                              ...drawing.fibLevels,
                              { value: nextValue, enabled: true, color: getFibLevelColor(nextValue) },
                            ],
                          });
                        }}
                      >
                        + Add level
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
            {!isFibDrawingTool(drawing.kind) && !isPatternDrawingTool(drawing.kind) && (
              <label className="drawing-settings-checkbox-row">
                <input
                  type="checkbox"
                  checked={drawing.showMiddlePoint}
                  onChange={(event) => patchSelectedDrawing({ showMiddlePoint: event.target.checked })}
                />
                <span>Middle point</span>
              </label>
            )}
            <label className="drawing-settings-checkbox-row">
              <input
                type="checkbox"
                checked={drawing.showPriceLabels}
                onChange={(event) => patchSelectedDrawing({ showPriceLabels: event.target.checked })}
              />
              <span>Price labels</span>
            </label>
            <span className="drawing-settings-section-label">Info</span>
            <label className="drawing-settings-row">
              <span>Stats</span>
              <select
                value={getDrawingStatsSelectValue(drawing.stats)}
                onChange={(event) =>
                  patchSelectedDrawing({
                    stats: createDrawingStatsFromSelectValue(
                      drawing.stats,
                      event.target.value as DrawingStatsSelectValue
                    ),
                  })
                }
              >
                {DRAWING_STATS_SELECT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="drawing-settings-row">
              <span>Stats position</span>
              <select
                value={drawing.stats.position}
                onChange={(event) =>
                  patchSelectedDrawing({
                    stats: { ...drawing.stats, position: event.target.value as DrawingStatsPosition },
                  })
                }
              >
                {DRAWING_STATS_POSITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="drawing-settings-checkbox-row">
              <input
                type="checkbox"
                checked={drawing.stats.alwaysShow}
                onChange={(event) =>
                  patchSelectedDrawing({ stats: { ...drawing.stats, alwaysShow: event.target.checked } })
                }
              />
              <span>Always show stats</span>
            </label>
          </div>
        );
      }

      if (activeDrawingSettingsTab === 'text') {
        return (
          <div className="drawing-settings-tab-panel">
            <div className="drawing-settings-text-toolbar">
              <label className="drawing-settings-color-picker" aria-label="Text color">
                <input
                  type="color"
                  value={colorToInputValue(drawing.textColor, DRAWING_DEFAULT_TEXT_COLOR)}
                  onChange={(event) => patchSelectedDrawing({ textColor: event.target.value })}
                />
                <span style={{ backgroundColor: drawing.textColor }} aria-hidden="true" />
              </label>
              <select
                aria-label="Text size"
                value={drawing.textSize}
                onChange={(event) => patchSelectedDrawing({ textSize: Number(event.target.value) })}
              >
                {DRAWING_TEXT_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="Bold text"
                data-active={drawing.textBold}
                onClick={() => patchSelectedDrawing({ textBold: !drawing.textBold })}
              >
                B
              </button>
              <button
                type="button"
                aria-label="Italic text"
                data-active={drawing.textItalic}
                onClick={() => patchSelectedDrawing({ textItalic: !drawing.textItalic })}
              >
                I
              </button>
            </div>
            <textarea
              aria-label="Drawing text"
              maxLength={120}
              placeholder="Add text"
              value={drawing.text}
              onChange={(event) =>
                patchSelectedDrawing({
                  text: event.target.value,
                  showText: event.target.value.trim().length > 0,
                })
              }
            />
            <label className="drawing-settings-row">
              <span>Text alignment</span>
              <div className="drawing-settings-inline-controls">
                <select
                  aria-label="Text vertical alignment"
                  value={drawing.textVerticalAlignment}
                  onChange={(event) =>
                    patchSelectedDrawing({
                      textVerticalAlignment: event.target.value as DrawingTextVerticalAlignment,
                    })
                  }
                >
                  {DRAWING_TEXT_VERTICAL_ALIGNMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Text horizontal alignment"
                  value={drawing.textAlignment}
                  onChange={(event) =>
                    patchSelectedDrawing({ textAlignment: event.target.value as DrawingTextAlignment })
                  }
                >
                  {DRAWING_TEXT_ALIGNMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>
        );
      }

      if (activeDrawingSettingsTab === 'coordinates') {
        return (
          <div className="drawing-settings-tab-panel">
            {drawingCoordinatePoints.map((point, index) => (
              <div key={index} className="drawing-settings-coordinate-row">
                <span>#{index + 1} (price, bar)</span>
                <input
                  type="number"
                  aria-label={`Point ${index + 1} price`}
                  value={Number(point.price.toFixed(2))}
                  step="0.01"
                  onChange={(event) => updateSelectedDrawingAnchor(index, { price: Number(event.target.value) })}
                />
                <input
                  type="number"
                  aria-label={`Point ${index + 1} bar`}
                  value={Number(point.logicalIndex.toFixed(2))}
                  step="0.25"
                  onChange={(event) =>
                    updateSelectedDrawingAnchor(index, { logicalIndex: Number(event.target.value) })
                  }
                />
              </div>
            ))}
          </div>
        );
      }

      return (
        <div className="drawing-settings-tab-panel visibility">
          {DRAWING_VISIBILITY_GROUPS.map((group) => (
            <div key={group.id} className="drawing-settings-visibility-row">
              <label>
                <input
                  type="checkbox"
                  checked={isVisibilityGroupChecked(group)}
                  onChange={(event) => updateVisibilityGroup(group, event.target.checked)}
                />
                <span>{group.label}</span>
              </label>
              {group.min !== undefined && group.max !== undefined && (
                <>
                  <input
                    type="number"
                    aria-label={`${group.label} minimum`}
                    min={group.min}
                    max={group.max}
                    defaultValue={group.min}
                  />
                  <span className="drawing-settings-range-track" aria-hidden="true">
                    <span />
                    <span />
                  </span>
                  <input
                    type="number"
                    aria-label={`${group.label} maximum`}
                    min={group.min}
                    max={group.max}
                    defaultValue={group.max}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      );
    };
    const renderDrawingSettingsDialog = () => {
      if (activeDrawingToolbarMenu !== 'settings' || !usesTabbedSettingsDialog) return null;

      return (
        <div
          className="drawing-settings-dialog"
          role="dialog"
          aria-label={`${DRAWING_TOOL_LABELS[drawing.kind]} settings`}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="drawing-settings-dialog-header">
            <div className="drawing-settings-dialog-title">
              <strong>{DRAWING_TOOL_LABELS[drawing.kind]}</strong>
              <button type="button" aria-label="Rename drawing">
                <Pencil size={17} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
            <button type="button" aria-label="Close drawing settings" onClick={closeDrawingSettingsDialog}>
              <X size={24} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
          <div className="drawing-settings-tabs" role="tablist" aria-label="Drawing settings tabs">
            {DRAWING_SETTINGS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={activeDrawingSettingsTab === tab.value}
                data-active={activeDrawingSettingsTab === tab.value}
                onClick={() => setActiveDrawingSettingsTab(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="drawing-settings-dialog-body">{renderDrawingSettingsTabPanel()}</div>
          {renderDialogFooter()}
        </div>
      );
    };
    const renderToolbarPanel = () => {
      if (!activeDrawingToolbarMenu) return null;
      if (activeDrawingToolbarMenu === 'settings' && usesTabbedSettingsDialog) return null;

      return (
        <div
          className={`drawing-toolbar-popover${
            activeDrawingToolbarMenu === 'more' ? ' drawing-toolbar-more-popover' : ''
          }`}
          role={activeDrawingToolbarMenu === 'more' || activeDrawingToolbarMenu === 'templates' ? 'menu' : 'group'}
          aria-label={`Drawing ${activeDrawingToolbarMenu} menu`}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {activeDrawingToolbarMenu === 'templates' && (
            <>
              <strong>Drawing template</strong>
              <button type="button" role="menuitem" onClick={() => saveDrawingStylePreset(drawing)}>
                Save current style
              </button>
              <button type="button" role="menuitem" onClick={applyDrawingStylePreset}>
                Apply saved style
              </button>
              <button type="button" role="menuitem" onClick={resetSelectedDrawingStyle}>
                Reset style
              </button>
            </>
          )}
          {activeDrawingToolbarMenu === 'color' && (
            <>
              <strong>Line color</strong>
              <div className="drawing-toolbar-swatch-grid" aria-label="Preset line colors">
                {DRAWING_COLOR_SWATCHES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="drawing-toolbar-color-option"
                    aria-label={`Set drawing color ${color}`}
                    data-active={drawing.color.toLowerCase() === color.toLowerCase()}
                    onClick={() => patchSelectedDrawing({ color })}
                  >
                    <span style={{ backgroundColor: color }} aria-hidden="true" />
                  </button>
                ))}
              </div>
              <label>
                <span>Custom</span>
                <input
                  type="color"
                  value={colorToInputValue(drawing.color, DRAWING_DEFAULT_COLOR)}
                  onChange={(event) => patchSelectedDrawing({ color: event.target.value })}
                />
              </label>
              <label>
                <span>Opacity</span>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={Math.round(drawing.opacity * 100)}
                  onChange={(event) => patchSelectedDrawing({ opacity: clamp(Number(event.target.value) / 100, 0.1, 1) })}
                />
              </label>
            </>
          )}
          {activeDrawingToolbarMenu === 'text' && (
            <>
              <strong>Text</strong>
              <label>
                <span>Show text</span>
                <input
                  type="checkbox"
                  checked={drawing.showText}
                  onChange={(event) => patchSelectedDrawing({ showText: event.target.checked })}
                />
              </label>
              <label className="drawing-toolbar-stacked-label">
                <span>Text</span>
                <input
                  type="text"
                  maxLength={120}
                  value={drawing.text}
                  placeholder="Drawing note"
                  onChange={(event) =>
                    patchSelectedDrawing({
                      text: event.target.value,
                      showText: event.target.value.trim().length > 0 ? true : drawing.showText,
                    })
                  }
                />
              </label>
              <label>
                <span>Color</span>
                <input
                  type="color"
                  value={colorToInputValue(drawing.textColor, DRAWING_DEFAULT_TEXT_COLOR)}
                  onChange={(event) => patchSelectedDrawing({ textColor: event.target.value })}
                />
              </label>
              <label>
                <span>Size</span>
                <select
                  value={drawing.textSize}
                  onChange={(event) => patchSelectedDrawing({ textSize: Number(event.target.value) })}
                >
                  {DRAWING_TEXT_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}px
                    </option>
                  ))}
                </select>
              </label>
              <div className="drawing-toolbar-choice-grid" role="group" aria-label="Text emphasis">
                <button
                  type="button"
                  data-active={drawing.textBold}
                  onClick={() => patchSelectedDrawing({ textBold: !drawing.textBold })}
                >
                  B
                </button>
                <button
                  type="button"
                  data-active={drawing.textItalic}
                  onClick={() => patchSelectedDrawing({ textItalic: !drawing.textItalic })}
                >
                  I
                </button>
              </div>
              <div className="drawing-toolbar-menu-list" role="radiogroup" aria-label="Text alignment">
                {DRAWING_TEXT_ALIGNMENT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={drawing.textAlignment === option.value}
                    data-active={drawing.textAlignment === option.value}
                    onClick={() => patchSelectedDrawing({ textAlignment: option.value })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {activeDrawingToolbarMenu === 'width' && (
            <>
              <strong>Line width</strong>
              <div className="drawing-toolbar-choice-grid" role="radiogroup" aria-label="Line width">
                {DRAWING_LINE_WIDTH_OPTIONS.map((lineWidth) => (
                  <button
                    key={lineWidth}
                    type="button"
                    role="radio"
                    aria-checked={drawing.lineWidth === lineWidth}
                    data-active={drawing.lineWidth === lineWidth}
                    onClick={() => patchSelectedDrawing({ lineWidth })}
                  >
                    {lineWidth}px
                  </button>
                ))}
              </div>
            </>
          )}
          {activeDrawingToolbarMenu === 'style' && (
            <>
              <strong>Line style</strong>
              <div className="drawing-toolbar-menu-list" role="radiogroup" aria-label="Line style">
                {DRAWING_LINE_STYLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={drawing.lineStyle === option.value}
                    data-active={drawing.lineStyle === option.value}
                    onClick={() => patchSelectedDrawing({ lineStyle: option.value })}
                  >
                    <span className="drawing-line-sample" data-style={option.value} aria-hidden="true" />
                    {option.label}
                  </button>
                ))}
              </div>
              <label>
                <span>Opacity</span>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={Math.round(drawing.opacity * 100)}
                  onChange={(event) => patchSelectedDrawing({ opacity: clamp(Number(event.target.value) / 100, 0.1, 1) })}
                />
              </label>
              <label>
                <span>Left end</span>
                <select
                  value={drawing.leftEnd}
                  onChange={(event) => patchSelectedDrawing({ leftEnd: event.target.value as DrawingArrowEnd })}
                >
                  {DRAWING_ARROW_END_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Right end</span>
                <select
                  value={drawing.rightEnd}
                  onChange={(event) => patchSelectedDrawing({ rightEnd: event.target.value as DrawingArrowEnd })}
                >
                  {DRAWING_ARROW_END_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {activeDrawingToolbarMenu === 'settings' && (
            <>
              <strong>{DRAWING_TOOL_LABELS[drawing.kind]} settings</strong>
              <label>
                <span>Line</span>
                <select
                  value={drawing.lineStyle}
                  onChange={(event) => patchSelectedDrawing({ lineStyle: event.target.value as DrawingLineStyle })}
                >
                  {DRAWING_LINE_STYLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Width</span>
                <input
                  type="number"
                  min="1"
                  max="6"
                  value={drawing.lineWidth}
                  onChange={(event) => patchSelectedDrawing({ lineWidth: clamp(Number(event.target.value), 1, 6) })}
                />
              </label>
              <label>
                <span>Middle point</span>
                <input
                  type="checkbox"
                  checked={drawing.showMiddlePoint}
                  onChange={(event) => patchSelectedDrawing({ showMiddlePoint: event.target.checked })}
                />
              </label>
              <label>
                <span>Price labels</span>
                <input
                  type="checkbox"
                  checked={drawing.showPriceLabels}
                  onChange={(event) => patchSelectedDrawing({ showPriceLabels: event.target.checked })}
                />
              </label>
              <span className="drawing-toolbar-section-label">Stats</span>
              <label>
                <span>Price range</span>
                <input
                  type="checkbox"
                  checked={drawing.stats.priceRange}
                  onChange={(event) =>
                    patchSelectedDrawing({ stats: { ...drawing.stats, priceRange: event.target.checked } })
                  }
                />
              </label>
              <label>
                <span>Percent change</span>
                <input
                  type="checkbox"
                  checked={drawing.stats.percentChange}
                  onChange={(event) =>
                    patchSelectedDrawing({ stats: { ...drawing.stats, percentChange: event.target.checked } })
                  }
                />
              </label>
              <label>
                <span>Change</span>
                <input
                  type="checkbox"
                  checked={drawing.stats.change}
                  onChange={(event) =>
                    patchSelectedDrawing({ stats: { ...drawing.stats, change: event.target.checked } })
                  }
                />
              </label>
              <label>
                <span>Bars range</span>
                <input
                  type="checkbox"
                  checked={drawing.stats.barsRange}
                  onChange={(event) =>
                    patchSelectedDrawing({ stats: { ...drawing.stats, barsRange: event.target.checked } })
                  }
                />
              </label>
              <label>
                <span>Date/time range</span>
                <input
                  type="checkbox"
                  checked={drawing.stats.dateTimeRange}
                  onChange={(event) =>
                    patchSelectedDrawing({ stats: { ...drawing.stats, dateTimeRange: event.target.checked } })
                  }
                />
              </label>
              <label>
                <span>Distance</span>
                <input
                  type="checkbox"
                  checked={drawing.stats.distance}
                  onChange={(event) =>
                    patchSelectedDrawing({ stats: { ...drawing.stats, distance: event.target.checked } })
                  }
                />
              </label>
              <label>
                <span>Angle</span>
                <input
                  type="checkbox"
                  checked={drawing.stats.angle}
                  onChange={(event) =>
                    patchSelectedDrawing({ stats: { ...drawing.stats, angle: event.target.checked } })
                  }
                />
              </label>
              <label>
                <span>Always show stats</span>
                <input
                  type="checkbox"
                  checked={drawing.stats.alwaysShow}
                  onChange={(event) =>
                    patchSelectedDrawing({ stats: { ...drawing.stats, alwaysShow: event.target.checked } })
                  }
                />
              </label>
              <label>
                <span>Stats position</span>
                <select
                  value={drawing.stats.position}
                  onChange={(event) =>
                    patchSelectedDrawing({ stats: { ...drawing.stats, position: event.target.value as DrawingStatsPosition } })
                  }
                >
                  {DRAWING_STATS_POSITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {pointOne && (
                <div className="drawing-toolbar-coordinate-grid">
                  <span>Point 1</span>
                  <input
                    type="number"
                    aria-label="Point 1 bar"
                    value={Number(pointOne.logicalIndex.toFixed(2))}
                    step="0.25"
                    onChange={(event) =>
                      updateSelectedDrawingAnchor(0, { logicalIndex: Number(event.target.value) })
                    }
                  />
                  <input
                    type="number"
                    aria-label="Point 1 price"
                    value={Number(pointOne.price.toFixed(2))}
                    step="0.01"
                    onChange={(event) => updateSelectedDrawingAnchor(0, { price: Number(event.target.value) })}
                  />
                </div>
              )}
              {isTwoAnchorDrawingTool(drawing.kind) && pointTwo && (
                <div className="drawing-toolbar-coordinate-grid">
                  <span>Point 2</span>
                  <input
                    type="number"
                    aria-label="Point 2 bar"
                    value={Number(pointTwo.logicalIndex.toFixed(2))}
                    step="0.25"
                    onChange={(event) =>
                      updateSelectedDrawingAnchor(1, { logicalIndex: Number(event.target.value) })
                    }
                  />
                  <input
                    type="number"
                    aria-label="Point 2 price"
                    value={Number(pointTwo.price.toFixed(2))}
                    step="0.01"
                    onChange={(event) => updateSelectedDrawingAnchor(1, { price: Number(event.target.value) })}
                  />
                </div>
              )}
            </>
          )}
          {activeDrawingToolbarMenu === 'alert' && (
            <>
              <strong>{DRAWING_TOOL_LABELS[drawing.kind]} alert</strong>
              <label>
                <span>Condition</span>
                <select
                  value={drawing.alertCondition}
                  onChange={(event) =>
                    patchSelectedDrawing({ alertCondition: event.target.value as DrawingAlertCondition })
                  }
                >
                  {DRAWING_ALERT_CONDITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Frequency</span>
                <select
                  value={drawing.alertFrequency}
                  onChange={(event) =>
                    patchSelectedDrawing({ alertFrequency: event.target.value as DrawingAlertFrequency })
                  }
                >
                  {DRAWING_ALERT_FREQUENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="drawing-toolbar-stacked-label">
                <span>Message</span>
                <input
                  type="text"
                  maxLength={160}
                  value={drawing.alertMessage}
                  placeholder="Drawing crossed"
                  onChange={(event) => patchSelectedDrawing({ alertMessage: event.target.value })}
                />
              </label>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  patchSelectedDrawing({ alertEnabled: !drawing.alertEnabled });
                  setDrawingToolbarStatus(drawing.alertEnabled ? 'Alert removed' : 'Alert created');
                }}
              >
                {drawing.alertEnabled ? 'Remove alert' : 'Create alert'}
              </button>
            </>
          )}
          {activeDrawingToolbarMenu === 'more' && (
            <div className="drawing-more-menu-shell">
              <div className="drawing-more-menu-branch">
                <button type="button" className="drawing-more-menu-row" role="menuitem" aria-haspopup="menu">
                  <Layers className="drawing-more-menu-icon" size={19} strokeWidth={1.8} aria-hidden="true" />
                  <span>Visual order</span>
                  <ChevronRight className="drawing-more-menu-chevron" size={16} strokeWidth={1.8} aria-hidden="true" />
                </button>
                <div className="drawing-more-submenu" role="menu" aria-label="Visual order">
                  <button type="button" className="drawing-more-menu-row" role="menuitem" onClick={() => moveSelectedDrawingVisualOrder('front')}>
                    <span className="drawing-more-menu-icon" aria-hidden="true" />
                    <span>Bring to front</span>
                  </button>
                  <button type="button" className="drawing-more-menu-row" role="menuitem" onClick={() => moveSelectedDrawingVisualOrder('back')}>
                    <span className="drawing-more-menu-icon" aria-hidden="true" />
                    <span>Send to back</span>
                  </button>
                </div>
              </div>
              <div className="drawing-more-menu-branch">
                <button type="button" className="drawing-more-menu-row" role="menuitem" aria-haspopup="menu">
                  <span className="drawing-more-menu-icon" aria-hidden="true" />
                  <span>Visibility on intervals</span>
                  <ChevronRight className="drawing-more-menu-chevron" size={16} strokeWidth={1.8} aria-hidden="true" />
                </button>
                <div className="drawing-more-submenu visibility" role="menu" aria-label="Visibility on intervals">
                  {DRAWING_VISIBILITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className="drawing-more-menu-row"
                      role="menuitemradio"
                      aria-checked={drawing.visibility === option.value}
                      data-active={drawing.visibility === option.value}
                      onClick={() => patchSelectedDrawing({ visibility: option.value })}
                    >
                      <span className="drawing-more-menu-icon" aria-hidden="true">
                        {drawing.visibility === option.value && <Check size={16} strokeWidth={1.8} />}
                      </span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                  <span className="drawing-more-menu-separator" role="presentation" />
                  <div className="drawing-more-timeframes" role="group" aria-label="Timeframe visibility">
                    {TIMEFRAME_OPTIONS.map((option) => (
                      <label key={option.value}>
                        <span>{option.label}</span>
                        <input
                          type="checkbox"
                          checked={drawing.timeframeVisibility[option.value] !== false}
                          onChange={(event) =>
                            patchSelectedDrawing({
                              timeframeVisibility: {
                                ...drawing.timeframeVisibility,
                                [option.value]: event.target.checked,
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <span className="drawing-more-menu-separator" role="presentation" />
              <button type="button" className="drawing-more-menu-row" role="menuitem" onClick={duplicateSelectedDrawing}>
                <Copy className="drawing-more-menu-icon" size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>Clone</span>
                <kbd>⌘ + Drag</kbd>
              </button>
              <button type="button" className="drawing-more-menu-row" role="menuitem" onClick={() => void copySelectedDrawing()}>
                <span className="drawing-more-menu-icon" aria-hidden="true" />
                <span>Copy</span>
                <kbd>⌘ + C</kbd>
              </button>
              <span className="drawing-more-menu-separator" role="presentation" />
              <button
                type="button"
                className="drawing-more-menu-row"
                role="menuitemradio"
                aria-checked={!drawing.syncInLayout && !drawing.syncGlobally}
                data-active={!drawing.syncInLayout && !drawing.syncGlobally}
                onClick={() => patchSelectedDrawing({ syncInLayout: false, syncGlobally: false })}
              >
                <span className="drawing-more-menu-icon" aria-hidden="true">
                  {!drawing.syncInLayout && !drawing.syncGlobally && <Check size={17} strokeWidth={1.8} />}
                </span>
                <span>No sync</span>
              </button>
              <button
                type="button"
                className="drawing-more-menu-row"
                role="menuitemradio"
                aria-checked={drawing.syncInLayout && !drawing.syncGlobally}
                data-active={drawing.syncInLayout && !drawing.syncGlobally}
                onClick={() => patchSelectedDrawing({ syncInLayout: true, syncGlobally: false })}
              >
                <span className="drawing-more-menu-icon" aria-hidden="true">
                  {drawing.syncInLayout && !drawing.syncGlobally && <Check size={17} strokeWidth={1.8} />}
                </span>
                <span>Sync in layout</span>
              </button>
              <button
                type="button"
                className="drawing-more-menu-row"
                role="menuitemradio"
                aria-checked={drawing.syncGlobally}
                data-active={drawing.syncGlobally}
                onClick={() => patchSelectedDrawing({ syncInLayout: false, syncGlobally: true })}
              >
                <span className="drawing-more-menu-icon" aria-hidden="true">
                  {drawing.syncGlobally && <Check size={17} strokeWidth={1.8} />}
                </span>
                <span>Sync globally</span>
              </button>
              <span className="drawing-more-menu-separator" role="presentation" />
              <button
                type="button"
                className="drawing-more-menu-row"
                role="menuitemcheckbox"
                aria-checked={!drawing.visible}
                onClick={() => patchSelectedDrawing({ visible: !drawing.visible })}
              >
                {drawing.visible ? (
                  <EyeOff className="drawing-more-menu-icon" size={18} strokeWidth={1.8} aria-hidden="true" />
                ) : (
                  <Eye className="drawing-more-menu-icon" size={18} strokeWidth={1.8} aria-hidden="true" />
                )}
                <span>{drawing.visible ? 'Hide' : 'Show'}</span>
              </button>
            </div>
          )}
          {drawingToolbarStatus && activeDrawingToolbarMenu !== 'more' && (
            <span className="drawing-toolbar-status">{drawingToolbarStatus}</span>
          )}
        </div>
      );
    };
    const lineSampleStyle = {
      color: hexToRgba(drawing.color, drawing.opacity),
      backgroundColor: drawing.lineStyle === 'solid' ? hexToRgba(drawing.color, drawing.opacity) : undefined,
    };

    return (
      <div
        className="drawing-floating-toolbar"
        ref={selectedDrawingToolbarRef}
        role="toolbar"
        aria-label="Selected drawing actions"
        data-locked={drawing.locked}
        data-user-positioned={drawingToolbarPosition?.paneIndex === paneIndex}
        style={style}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="drawing-toolbar-drag-handle"
          aria-label="Move drawing toolbar"
          title="Move toolbar"
          onPointerDown={(event) => handleDrawingToolbarDragStart(paneIndex, event)}
          onPointerMove={handleDrawingToolbarDragMove}
          onPointerUp={handleDrawingToolbarDragEnd}
          onPointerCancel={handleDrawingToolbarDragEnd}
        >
          <GripVertical className="drawing-toolbar-icon" size={17} strokeWidth={2} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Drawing templates"
          title="Templates"
          aria-expanded={activeDrawingToolbarMenu === 'templates'}
          data-active={activeDrawingToolbarMenu === 'templates'}
          onClick={() => toggleDrawingToolbarMenu('templates')}
        >
          <Bookmark className="drawing-toolbar-icon" size={16} strokeWidth={2} aria-hidden="true" />
        </button>
        <span className="drawing-toolbar-divider" aria-hidden="true" />
        <button
          type="button"
          aria-label="Drawing line color"
          title="Line color"
          aria-expanded={activeDrawingToolbarMenu === 'color'}
          data-active={activeDrawingToolbarMenu === 'color'}
          onClick={() => toggleDrawingToolbarMenu('color')}
        >
          <span className="drawing-color-swatch" style={{ backgroundColor: drawing.color }} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Drawing text settings"
          title="Text"
          aria-expanded={activeDrawingToolbarMenu === 'text'}
          data-active={activeDrawingToolbarMenu === 'text'}
          onClick={() => toggleDrawingToolbarMenu('text')}
        >
          <Type className="drawing-toolbar-icon" size={16} strokeWidth={2} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="drawing-toolbar-wide-button"
          aria-label="Drawing line width"
          title="Line width"
          aria-expanded={activeDrawingToolbarMenu === 'width'}
          data-active={activeDrawingToolbarMenu === 'width'}
          onClick={() => toggleDrawingToolbarMenu('width')}
        >
          <span className="drawing-line-sample" data-style={drawing.lineStyle} style={lineSampleStyle} aria-hidden="true" />
          <span className="drawing-toolbar-value">{drawing.lineWidth}px</span>
        </button>
        <button
          type="button"
          aria-label="Drawing line style"
          title="Line style"
          aria-expanded={activeDrawingToolbarMenu === 'style'}
          data-active={activeDrawingToolbarMenu === 'style'}
          onClick={() => toggleDrawingToolbarMenu('style')}
        >
          <span className="drawing-line-sample" data-style={drawing.lineStyle} style={lineSampleStyle} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Drawing settings"
          title="Settings"
          aria-expanded={activeDrawingToolbarMenu === 'settings'}
          data-active={activeDrawingToolbarMenu === 'settings'}
          onClick={() => toggleDrawingToolbarMenu('settings')}
        >
          <Settings className="drawing-toolbar-icon" size={16} strokeWidth={2} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Add alert to drawing"
          title="Add alert"
          aria-expanded={activeDrawingToolbarMenu === 'alert'}
          data-active={activeDrawingToolbarMenu === 'alert' || drawing.alertEnabled}
          onClick={() => toggleDrawingToolbarMenu('alert')}
        >
          <Bell className="drawing-toolbar-icon" size={16} strokeWidth={2} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={drawing.locked ? 'Unlock drawing' : 'Lock drawing'}
          title={drawing.locked ? 'Unlock' : 'Lock'}
          onClick={toggleSelectedDrawingLock}
        >
          {drawing.locked ? (
            <Lock className="drawing-toolbar-icon" size={16} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Unlock className="drawing-toolbar-icon" size={16} strokeWidth={2} aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          aria-label="Delete drawing"
          title={drawing.locked ? 'Unlock to delete' : 'Delete'}
          disabled={drawing.locked}
          onClick={removeSelectedDrawing}
        >
          <Trash2 className="drawing-toolbar-icon" size={16} strokeWidth={2} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="More drawing actions"
          title="More"
          aria-expanded={activeDrawingToolbarMenu === 'more'}
          data-active={activeDrawingToolbarMenu === 'more'}
          onClick={() => toggleDrawingToolbarMenu('more')}
        >
          <MoreHorizontal className="drawing-toolbar-icon" size={17} strokeWidth={2} aria-hidden="true" />
        </button>
        {renderToolbarPanel()}
        {renderDrawingSettingsDialog()}
      </div>
    );
  };
  const renderPaneOverlays = (paneIndex: number, attachLegendRef: boolean) => {
    const pane = chartPanes[paneIndex];
    if (!pane) return null;

    return (
      <>
        {renderInstrumentLegend(paneIndex)}
        {renderIndicatorLegend(paneIndex, attachLegendRef)}
        {renderSelectedDrawingToolbar(paneIndex)}

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

          {isAuthenticated && (
            <>
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
            </>
          )}

          <span className="header-spacer" aria-hidden="true" />

          {isAuthenticated ? (
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
            <button
              type="button"
              className="tool-toggle tv-account-button"
              aria-label={`Signed in as ${authUserLabel}. Sign out`}
              title="Sign out"
              onClick={() => void handleSignOut()}
            >
              <span>{authUserLabel}</span>
            </button>
          </div>
          ) : (
            <div className="header-right-cluster signed-out-auth-cluster" aria-label="Account actions">
              <button
                type="button"
                className="tool-toggle auth-entry-button"
                aria-label="Log in"
                onClick={() => openAuthPanel('login')}
              >
                <span>Log in</span>
              </button>
              <button
                type="button"
                className="tool-toggle auth-entry-button primary"
                aria-label="Sign up"
                onClick={() => openAuthPanel('signup')}
              >
                <span>Sign up</span>
              </button>
            </div>
          )}
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
                      <small>{formatTimeframeLabel(activeTimeframe)} active pane</small>
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
          {authMode && (
            <div className="header-modal-backdrop" onMouseDown={closeHeaderOverlays}>
              <form
                className="header-modal auth-dialog"
                role="dialog"
                aria-modal="true"
                aria-label={authMode === 'signup' ? 'Sign up' : 'Log in'}
                onMouseDown={(event) => event.stopPropagation()}
                onSubmit={handleAuthSubmit}
              >
                <div className="header-modal-title auth-dialog-title">
                  <div className="auth-dialog-title-copy">
                    <span>{authMode === 'signup' ? 'Start trading workspace' : 'Return to workspace'}</span>
                    <strong>{authMode === 'signup' ? 'Create your account' : 'Log in'}</strong>
                    <small>
                      {authMode === 'signup'
                        ? 'Save layouts, templates, alerts, and publishing tools.'
                        : 'Open your saved layouts and account-only chart tools.'}
                    </small>
                  </div>
                  <button type="button" aria-label="Close menu" onClick={closeHeaderOverlays}>
                    ×
                  </button>
                </div>
                <div className="auth-dialog-body">
                  {authActionLabel && (
                    <span className="auth-dialog-copy">
                      {authMode === 'signup' ? 'Sign up' : 'Log in'} to use {authActionLabel}.
                    </span>
                  )}
                  <div className="auth-provider-list" aria-label="Social sign in options">
                    {AUTH_OAUTH_PROVIDERS.map((option) => (
                      <button
                        key={option.provider}
                        type="button"
                        className={`auth-provider-button ${option.provider}`}
                        disabled={authLoading}
                        onClick={() => void handleOAuthSignIn(option.provider)}
                      >
                        <span className="auth-provider-mark" aria-hidden="true">
                          <img className="auth-provider-icon" src={option.iconSrc} alt="" />
                        </span>
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                  <span className="auth-dialog-divider" aria-hidden="true">
                    <span />
                    <small>Email</small>
                    <span />
                  </span>
                  {authMode === 'signup' && (
                    <label className="header-panel-field">
                      <span>Name</span>
                      <input
                        autoComplete="name"
                        placeholder="Jordan Lee"
                        value={authForm.displayName}
                        onChange={(event) => setAuthForm((current) => ({ ...current, displayName: event.target.value }))}
                      />
                    </label>
                  )}
                  <label className="header-panel-field">
                    <span>Email</span>
                    <input
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      required
                      type="email"
                      value={authForm.email}
                      onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                    />
                  </label>
                  <div className="header-panel-field auth-password-field">
                    <label htmlFor="auth-password-input">Password</label>
                    <div className="auth-password-control">
                      <input
                        id="auth-password-input"
                        aria-describedby={authMode === 'signup' ? 'auth-password-guidance auth-password-requirements' : undefined}
                        aria-invalid={
                          authMode === 'signup' && authForm.password.length > 0 && !authPasswordSecurity.isValid
                            ? true
                            : undefined
                        }
                        autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                        maxLength={authMode === 'signup' ? PASSWORD_MAX_LENGTH : undefined}
                        minLength={authMode === 'signup' ? PASSWORD_MIN_LENGTH : undefined}
                        placeholder={authMode === 'signup' ? '15+ unique characters' : 'Your password'}
                        required
                        type={authPasswordVisible ? 'text' : 'password'}
                        value={authForm.password}
                        onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                      />
                      <button
                        type="button"
                        className="auth-password-visibility"
                        aria-label={authPasswordVisible ? 'Hide password' : 'Show password'}
                        title={authPasswordVisible ? 'Hide password' : 'Show password'}
                        onClick={() => setAuthPasswordVisible((current) => !current)}
                      >
                        {authPasswordVisible ? (
                          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
                            <path d="M3 3l18 18" />
                            <path d="M10.6 10.6A2 2 0 0 0 12 14a2 2 0 0 0 1.4-.6" />
                            <path d="M9.9 5.2A10.4 10.4 0 0 1 12 5c5.5 0 9 5.3 9 7a6.8 6.8 0 0 1-1.8 2.8" />
                            <path d="M6.6 6.6C4.4 8 3 10.5 3 12c0 1.7 3.5 7 9 7 1.3 0 2.5-.3 3.5-.8" />
                          </svg>
                        ) : (
                          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
                            <path d="M2.8 12s3.4-7 9.2-7 9.2 7 9.2 7-3.4 7-9.2 7-9.2-7-9.2-7Z" />
                            <circle cx="12" cy="12" r="2.7" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  {authMode === 'signup' && (
                    <div className="auth-password-guidance" id="auth-password-guidance">
                      <div className="auth-password-guidance-header">
                        <strong>Secure password standard</strong>
                        <button
                          type="button"
                          className="auth-generate-password-button"
                          disabled={authLoading}
                          onClick={handleGenerateSignupPassword}
                        >
                          Generate secure password
                        </button>
                      </div>
                      <p>
                        Use a unique password from a password manager or generate one here. ProCharting public tables
                        never store your password.
                      </p>
                      <ul className="auth-password-requirements" id="auth-password-requirements" aria-live="polite">
                        {authPasswordSecurity.requirements.map((requirement) => (
                          <li key={requirement.id} className={requirement.isMet ? 'met' : 'missing'}>
                            <span className="auth-password-requirement-dot" aria-hidden="true" />
                            <span>{requirement.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {authMessage && <span className="auth-dialog-status">{authMessage}</span>}
                </div>
                <div className="settings-footer auth-dialog-footer">
                  <button type="button" onClick={() => switchAuthMode(authMode === 'signup' ? 'login' : 'signup')}>
                    {authMode === 'signup' ? 'Log in instead' : 'Create account'}
                  </button>
                  <button type="submit" className="settings-ok" disabled={authLoading}>
                    {authLoading ? 'Working...' : authMode === 'signup' ? 'Sign up' : 'Log in'}
                  </button>
                </div>
              </form>
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

      <section
        className="chart-stage"
        data-layout-count={selectedLayout.count}
        data-layout-id={selectedLayout.id}
        data-legend-version={legendRenderVersion}
      >
        {renderDrawingToolRail()}
        <div
          className="chart-layout-grid"
          style={{
            gridTemplateColumns: selectedLayout.templateColumns,
            gridTemplateRows: selectedLayout.templateRows,
          }}
        >
          {selectedLayoutCells.map((cellSpec, paneIndex) => {
            const pane = chartPanes[paneIndex] ?? activePane;
            const hoverState = getPaneHoverState(paneIndex);

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
                  'data-active-drawing-tool': isAuthenticated ? activeDrawingTool ?? '' : '',
                  'data-cursor-tool': isAuthenticated ? cursorTool : 'cross',
                  'data-drag-mode': pane.dragMode,
                  'data-drawing-drag-mode':
                    drawingDragRef.current.paneIndex === paneIndex ? drawingDragRef.current.mode : 'none',
                  'data-drawing-hover-target': isAuthenticated ? hoverState.drawingHoverTarget ?? 'none' : 'none',
                  'data-drawings-count': getPaneDrawingCount(paneIndex),
                  'data-manual-price-scale': pane.manualPriceRange ? 'true' : 'false',
                  'data-pointer-area': hoverState.pointerArea,
                  'data-price-max': pane.manualPriceRange ? pane.manualPriceRange.maxPrice.toFixed(2) : '',
                  'data-price-min': pane.manualPriceRange ? pane.manualPriceRange.minPrice.toFixed(2) : '',
                  'data-selected-drawing': getSelectedDrawingStateLabel(paneIndex),
                  'data-view-end': pane.viewRange.endIndex.toFixed(2),
                  'data-view-start': pane.viewRange.startIndex.toFixed(2),
                  style: { cursor: getCanvasCursor(paneIndex, pane) },
                  onMouseMove: (event) => handleMouseMove(paneIndex, event),
                  onMouseDown: (event) => handleMouseDown(paneIndex, event),
                  onMouseUp: handleMouseUp,
                  onMouseLeave: (event) => handleMouseLeave(paneIndex, event),
                  onTouchStart: (event) => handleTouchStart(paneIndex, event),
                  onTouchMove: (event) => handleTouchMove(paneIndex, event),
                  onTouchEnd: (event) => handleTouchEnd(paneIndex, event),
                  onTouchCancel: (event) => handleTouchCancel(paneIndex, event),
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
