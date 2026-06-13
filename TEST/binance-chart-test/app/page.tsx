'use client';

import {
  Fragment,
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
  INDICATOR_DEFINITIONS,
  INDICATOR_MA_TYPE_OPTIONS,
  INDICATOR_SMOOTHING_OPTIONS,
  INDICATOR_SOURCE_OPTIONS,
  computeIndicatorSeries,
  getIndicatorColorLabel,
  getIndicatorDefinition,
  getIndicatorLegendSuffix,
  getIndicatorSettingLabel,
  sanitizePeriod,
  type ActiveIndicator,
  type IndicatorComputedSeries,
  type IndicatorDefinition,
  type IndicatorMaType,
  type IndicatorSettings,
  type IndicatorSmoothingType,
  type IndicatorSource,
} from '@/lib/indicators';
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
  | 'sine-line'
  | 'long-position'
  | 'short-position'
  | 'forecast'
  | 'bars-pattern'
  | 'ghost-feed'
  | 'projection'
  | 'anchored-vwap'
  | 'fixed-volume-profile'
  | 'anchored-volume-profile'
  | 'price-range'
  | 'date-range'
  | 'date-price-range'
  | 'brush'
  | 'highlighter'
  | 'arrow-marker'
  | 'arrow'
  | 'arrow-mark-up'
  | 'arrow-mark-down'
  | 'rectangle'
  | 'rotated-rectangle'
  | 'path'
  | 'circle'
  | 'ellipse'
  | 'polyline'
  | 'triangle'
  | 'arc'
  | 'curve'
  | 'double-curve'
  | 'text'
  | 'note'
  | 'price-note'
  | 'pin'
  | 'table'
  | 'callout'
  | 'comment'
  | 'price-label'
  | 'signpost'
  | 'flag-mark'
  | 'image'
  | 'post'
  | 'idea';
type DrawingMenuId = 'cursor' | 'line-tools' | 'fib-tools' | 'pattern-tools' | 'forecast-tools' | 'shape-tools' | 'text-tools';
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
type AuthMode = 'login' | 'signup';
type AuthOAuthProvider = 'google' | 'github';
type UserTrackingEventType = 'session_seen' | 'sign_in' | 'sign_up' | 'token_refreshed' | 'sign_out';
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

interface DrawingPatternBar {
  open: number;
  high: number;
  low: number;
  close: number;
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
  patternBars?: DrawingPatternBar[] | undefined;
  seed?: number | undefined;
  tableRows?: number | undefined;
  tableCols?: number | undefined;
  tableCells?: string[][] | undefined;
  imageSrc?: string | undefined;
  contentUrl?: string | undefined;
  contentMeta?: string | undefined;
  createdAt: number;
  updatedAt: number;
}

interface DrawingTextEditorState {
  drawingId: string;
  paneIndex: number;
  cellRow?: number;
  cellCol?: number;
}

interface ContentToolDialogState {
  kind: 'image' | 'post' | 'idea';
  paneIndex: number;
  anchor: ChartDrawingAnchor;
  x: number;
  y: number;
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

interface FreehandDrawingState {
  tool: DrawingToolId;
  paneIndex: number;
  anchors: ChartDrawingAnchor[];
  lastPoint: { x: number; y: number };
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

interface IndicatorLegendTarget {
  indicatorId: string;
  paneIndex: number;
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

interface BinanceTickerOption {
  symbol: string;
  base: string;
  quote: string;
}

const BINANCE_TICKERS_ENDPOINT = '/api/binance/tickers';
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
const FREEHAND_DRAWING_MAX_ANCHORS = 180;
const VARIABLE_SHAPE_DRAWING_MAX_ANCHORS = 12;
const FREEHAND_DRAWING_MIN_SAMPLE_DISTANCE = 4;
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
const INDICATOR_FAVORITES_STORAGE_KEY = 'procharting.indicatorFavorites';
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
  'long-position': 'Long position',
  'short-position': 'Short position',
  forecast: 'Position forecast',
  'bars-pattern': 'Bars pattern',
  'ghost-feed': 'Ghost feed',
  projection: 'Sector',
  'anchored-vwap': 'Anchored VWAP',
  'fixed-volume-profile': 'Fixed range volume profile',
  'anchored-volume-profile': 'Anchored volume profile',
  'price-range': 'Price range',
  'date-range': 'Date range',
  'date-price-range': 'Date and price range',
  brush: 'Brush',
  highlighter: 'Highlighter',
  'arrow-marker': 'Arrow marker',
  arrow: 'Arrow',
  'arrow-mark-up': 'Arrow mark up',
  'arrow-mark-down': 'Arrow mark down',
  rectangle: 'Rectangle',
  'rotated-rectangle': 'Rotated rectangle',
  path: 'Path',
  circle: 'Circle',
  ellipse: 'Ellipse',
  polyline: 'Polyline',
  triangle: 'Triangle',
  arc: 'Arc',
  curve: 'Curve',
  'double-curve': 'Double curve',
  text: 'Text',
  note: 'Note',
  'price-note': 'Price note',
  pin: 'Pin',
  table: 'Table',
  callout: 'Callout',
  comment: 'Comment',
  'price-label': 'Price label',
  signpost: 'Signpost',
  'flag-mark': 'Flag mark',
  image: 'Image',
  post: 'Post',
  idea: 'Idea',
};
const FIB_DEFAULT_TREND_COLOR = '#787b86';
const POSITION_RISK_AMOUNT = 250;
const POSITION_PRICE_TICK = 0.01;
const formatPositionQty = (qty: number) => {
  if (!Number.isFinite(qty) || qty <= 0) return '0';
  return qty >= 10 ? Math.round(qty).toLocaleString() : Number(qty.toPrecision(4)).toString();
};
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
const FORECAST_TOOL_MENU_ENTRIES: DrawingMenuEntry[] = [
  { type: 'section', label: 'Forecasting' },
  { type: 'tool', id: 'long-position', label: 'Long position', icon: 'long-position', tool: 'long-position' },
  { type: 'tool', id: 'short-position', label: 'Short position', icon: 'short-position', tool: 'short-position' },
  { type: 'tool', id: 'forecast', label: 'Position forecast', icon: 'forecast', tool: 'forecast' },
  { type: 'tool', id: 'bars-pattern', label: 'Bars pattern', icon: 'bars-pattern', tool: 'bars-pattern' },
  { type: 'tool', id: 'ghost-feed', label: 'Ghost feed', icon: 'ghost-feed', tool: 'ghost-feed' },
  { type: 'tool', id: 'projection', label: 'Sector', icon: 'projection', tool: 'projection' },
  { type: 'section', label: 'Volume-based' },
  { type: 'tool', id: 'anchored-vwap', label: 'Anchored VWAP', icon: 'anchored-vwap', tool: 'anchored-vwap' },
  {
    type: 'tool',
    id: 'fixed-volume-profile',
    label: 'Fixed range volume profile',
    icon: 'fixed-volume-profile',
    tool: 'fixed-volume-profile',
  },
  {
    type: 'tool',
    id: 'anchored-volume-profile',
    label: 'Anchored volume profile',
    icon: 'anchored-volume-profile',
    tool: 'anchored-volume-profile',
  },
  { type: 'section', label: 'Measurers' },
  { type: 'tool', id: 'price-range', label: 'Price range', icon: 'price-range', tool: 'price-range' },
  { type: 'tool', id: 'date-range', label: 'Date range', icon: 'date-range', tool: 'date-range' },
  {
    type: 'tool',
    id: 'date-price-range',
    label: 'Date and price range',
    icon: 'date-price-range',
    tool: 'date-price-range',
  },
];
const FORECAST_TOOL_ICONS: Record<string, ReactNode> = {
  'long-position': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="2" d="M4 5.5h20M4 22.5h20" />
      <path stroke="currentColor" strokeWidth="1.6" d="M4 14h6M18 14h6" />
      <path stroke="currentColor" strokeWidth="1.6" d="M14 19V9.6M10.6 12.8 14 9.4l3.4 3.4" />
    </svg>
  ),
  'short-position': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="2" d="M4 5.5h20M4 22.5h20" />
      <path stroke="currentColor" strokeWidth="1.6" d="M4 14h6M18 14h6" />
      <path stroke="currentColor" strokeWidth="1.6" d="M14 9v9.4M10.6 15.2 14 18.6l3.4-3.4" />
    </svg>
  ),
  forecast: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <circle cx="5" cy="21.5" r="1.8" fill="currentColor" />
      <path stroke="currentColor" strokeWidth="1.6" d="M6.8 21c6.2-1.4 12.2-5.4 15.5-13" />
      <path stroke="currentColor" strokeWidth="1.6" d="M17.6 8.4 22.5 7.6l.9 4.8" />
    </svg>
  ),
  'bars-pattern': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="M7 4.5v4M7 17v4.5" />
      <rect x="5" y="8.5" width="4" height="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path stroke="currentColor" strokeWidth="1.6" d="M14 3v3M14 15v4" />
      <rect x="12" y="6" width="4" height="9" stroke="currentColor" strokeWidth="1.6" />
      <path stroke="currentColor" strokeWidth="1.6" d="M21 7v4M21 19v4.5" />
      <rect x="19" y="11" width="4" height="8" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  'ghost-feed': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1" strokeDasharray="2.6 2.2" d="M3 18.5 25 8" />
      <path stroke="currentColor" strokeWidth="1.6" d="M7 9.5V12M7 19v2.5" />
      <rect x="5" y="12" width="4" height="7" stroke="currentColor" strokeWidth="1.6" />
      <path stroke="currentColor" strokeWidth="1.6" d="M14 6.5V9M14 16v2.5" />
      <rect x="12" y="9" width="4" height="7" stroke="currentColor" strokeWidth="1.6" />
      <path stroke="currentColor" strokeWidth="1.6" d="M21 3.5V6M21 13v2.5" />
      <rect x="19" y="6" width="4" height="7" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  projection: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="M5 23 20.5 5.5M5 23l19.5-6" />
      <path stroke="currentColor" strokeWidth="1.6" d="M20.5 5.5A23.4 23.4 0 0 1 24.5 17" />
      <circle cx="5" cy="23" r="1.6" fill="currentColor" />
      <circle cx="20.5" cy="5.5" r="1.6" fill="currentColor" />
      <circle cx="24.5" cy="17" r="1.6" fill="currentColor" />
    </svg>
  ),
  'anchored-vwap': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="M10 6v10M10 20v3M17 4v8M17 16v7" />
      <circle cx="5" cy="20" r="1.8" fill="currentColor" />
      <path stroke="currentColor" strokeWidth="1.6" d="M6.8 19.3C11.5 17.5 17.5 13.5 24 8" />
    </svg>
  ),
  'fixed-volume-profile': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.6" d="M4.5 4v20M23.5 4v20" />
      <path stroke="currentColor" strokeWidth="2" d="M7.5 9h9M7.5 14h13M7.5 19h6" />
    </svg>
  ),
  'anchored-volume-profile': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <circle cx="5" cy="23" r="1.8" fill="currentColor" />
      <path stroke="currentColor" strokeWidth="1.6" d="M5 21V4.5" />
      <path stroke="currentColor" strokeWidth="2" d="M8.5 7.5h10M8.5 12.5h14M8.5 17.5h7" />
    </svg>
  ),
  'price-range': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="2" d="M5 4.5h18M5 23.5h18" />
      <path stroke="currentColor" strokeWidth="1.6" d="M14 8v12M10.8 10.6 14 7.4l3.2 3.2M10.8 17.4 14 20.6l3.2-3.2" />
    </svg>
  ),
  'date-range': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="2" d="M4.5 5v18M23.5 5v18" />
      <path stroke="currentColor" strokeWidth="1.6" d="M8 14h12M10.6 10.8 7.4 14l3.2 3.2M17.4 10.8 20.6 14l-3.2 3.2" />
    </svg>
  ),
  'date-price-range': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <rect x="4.5" y="5.5" width="19" height="17" stroke="currentColor" strokeWidth="1.6" />
      <path stroke="currentColor" strokeWidth="1.6" d="m8.5 19 10.5-9.5M14.4 9 19.6 8.6l.4 5.2" />
    </svg>
  ),
};
const SHAPE_TOOL_MENU_ENTRIES: DrawingMenuEntry[] = [
  { type: 'section', label: 'Brushes' },
  { type: 'tool', id: 'brush', label: 'Brush', icon: 'brush', tool: 'brush' },
  { type: 'tool', id: 'highlighter', label: 'Highlighter', icon: 'highlighter', tool: 'highlighter' },
  { type: 'section', label: 'Arrows' },
  { type: 'tool', id: 'arrow-marker', label: 'Arrow marker', icon: 'arrow-marker', tool: 'arrow-marker' },
  { type: 'tool', id: 'arrow', label: 'Arrow', icon: 'arrow', tool: 'arrow' },
  { type: 'tool', id: 'arrow-mark-up', label: 'Arrow mark up', icon: 'arrow-mark-up', tool: 'arrow-mark-up' },
  { type: 'tool', id: 'arrow-mark-down', label: 'Arrow mark down', icon: 'arrow-mark-down', tool: 'arrow-mark-down' },
  { type: 'section', label: 'Shapes' },
  { type: 'tool', id: 'rectangle', label: 'Rectangle', icon: 'rectangle', tool: 'rectangle' },
  { type: 'tool', id: 'rotated-rectangle', label: 'Rotated rectangle', icon: 'rotated-rectangle', tool: 'rotated-rectangle' },
  { type: 'tool', id: 'path', label: 'Path', icon: 'path', tool: 'path' },
  { type: 'tool', id: 'circle', label: 'Circle', icon: 'circle', tool: 'circle' },
  { type: 'tool', id: 'ellipse', label: 'Ellipse', icon: 'ellipse', tool: 'ellipse' },
  { type: 'tool', id: 'polyline', label: 'Polyline', icon: 'polyline', tool: 'polyline' },
  { type: 'tool', id: 'triangle', label: 'Triangle', icon: 'triangle', tool: 'triangle' },
  { type: 'tool', id: 'arc', label: 'Arc', icon: 'arc', tool: 'arc' },
  { type: 'tool', id: 'curve', label: 'Curve', icon: 'curve', tool: 'curve' },
  { type: 'tool', id: 'double-curve', label: 'Double curve', icon: 'double-curve', tool: 'double-curve' },
];
const SHAPE_TOOL_ICONS: Record<string, ReactNode> = {
  brush: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 20c3-9 8 5 11-4 2-6 6-5 9-9" />
      <path stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" d="M4 23c4-1 8-1 12 0" />
    </svg>
  ),
  highlighter: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.36" d="M5 19c4-8 8 4 12-4 2-4 4-5 7-7" />
      <path stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" d="M5 22h13" />
    </svg>
  ),
  'arrow-marker': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path fill="currentColor" d="M3.6 6.4 12.4 18.8 9.9 21.3 22 22 21.3 9.9 18.8 12.4 6.4 3.6Z" />
    </svg>
  ),
  arrow: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M5 22 22 5M16 5h6v6" />
    </svg>
  ),
  'arrow-mark-up': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path fill="currentColor" d="M14 5 23 19h-6v5h-6v-5H5z" />
    </svg>
  ),
  'arrow-mark-down': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path fill="currentColor" d="M14 23 5 9h6V4h6v5h6z" />
    </svg>
  ),
  rectangle: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <rect x="5" y="7" width="18" height="14" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  'rotated-rectangle': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.8" d="m9 5 15 7-5 11-15-7z" />
    </svg>
  ),
  path: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M4 21c5-14 9 5 13-7 2-6 5-5 7-7" />
      <circle cx="4" cy="21" r="1.8" fill="currentColor" />
      <circle cx="17" cy="14" r="1.8" fill="currentColor" />
      <circle cx="24" cy="7" r="1.8" fill="currentColor" />
    </svg>
  ),
  circle: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="14" cy="14" r="1.8" fill="currentColor" />
    </svg>
  ),
  ellipse: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <ellipse cx="14" cy="14" rx="10" ry="6.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  polyline: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="m4 21 6-11 6 6 8-10" />
      <circle cx="4" cy="21" r="1.6" fill="currentColor" />
      <circle cx="10" cy="10" r="1.6" fill="currentColor" />
      <circle cx="16" cy="16" r="1.6" fill="currentColor" />
      <circle cx="24" cy="6" r="1.6" fill="currentColor" />
    </svg>
  ),
  triangle: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="m14 5 10 18H4z" />
    </svg>
  ),
  arc: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M5 21c2-10 16-10 18 0" />
      <path stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.5 2" d="M5 21h18" />
    </svg>
  ),
  curve: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M4 21c6-18 14 16 20-10" />
    </svg>
  ),
  'double-curve': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M4 20c5-15 9 11 14-4 2-6 4-7 6-6" />
      <path stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" d="M4 13c5-9 9 8 14-2 2-4 4-5 6-4" />
    </svg>
  ),
};
const TEXT_TOOL_MENU_ENTRIES: DrawingMenuEntry[] = [
  { type: 'section', label: 'Text and notes' },
  { type: 'tool', id: 'text', label: 'Text', icon: 'text', tool: 'text' },
  { type: 'tool', id: 'note', label: 'Note', icon: 'note', tool: 'note' },
  { type: 'tool', id: 'price-note', label: 'Price note', icon: 'price-note', tool: 'price-note' },
  { type: 'tool', id: 'pin', label: 'Pin', icon: 'pin', tool: 'pin' },
  { type: 'tool', id: 'table', label: 'Table', icon: 'table', tool: 'table' },
  { type: 'tool', id: 'callout', label: 'Callout', icon: 'callout', tool: 'callout' },
  { type: 'tool', id: 'comment', label: 'Comment', icon: 'comment', tool: 'comment' },
  { type: 'tool', id: 'price-label', label: 'Price label', icon: 'price-label', tool: 'price-label' },
  { type: 'tool', id: 'signpost', label: 'Signpost', icon: 'signpost', tool: 'signpost' },
  { type: 'tool', id: 'flag-mark', label: 'Flag mark', icon: 'flag-mark', tool: 'flag-mark' },
  { type: 'section', label: 'Content' },
  { type: 'tool', id: 'image', label: 'Image', icon: 'image', tool: 'image' },
  { type: 'tool', id: 'post', label: 'Post', icon: 'post', tool: 'post' },
  { type: 'tool', id: 'idea', label: 'Idea', icon: 'idea', tool: 'idea' },
];
const TEXT_TOOL_ICONS: Record<string, ReactNode> = {
  text: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
      <path
        fill="currentColor"
        d="M8 6.5c0-.28.22-.5.5-.5H14v16h-2v1h5v-1h-2V6h5.5c.28 0 .5.22.5.5V9h1V6.5c0-.83-.67-1.5-1.5-1.5h-12C7.67 5 7 5.67 7 6.5V9h1V6.5Z"
      />
    </svg>
  ),
  note: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M5 3h17v13H5V3Zm8 14H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h17a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-8v4.05a2.5 2.5 0 1 1-1 0V17Zm.5 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM14 5h3a1 1 0 0 1 1 1v2h-1V6h-3v7h2v1h-5v-1h2V6h-3v2H9V6a1 1 0 0 1 1-1h4Z"
      />
    </svg>
  ),
  'price-note': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M22 3H5v13h17V3ZM5 17h8v4.05a2.5 2.5 0 1 0 1 0V17h8a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1Zm10 6.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM13 4h1v1h.5A2.5 2.5 0 0 1 17 7.5V8h-1v-.5c0-.83-.67-1.5-1.5-1.5H14v3h.5a2.5 2.5 0 0 1 0 5H14v1h-1v-1h-.5a2.5 2.5 0 0 1-2.5-2.5V11h1v.5c0 .83.67 1.5 1.5 1.5h.5v-3h-.5a2.5 2.5 0 0 1 0-5h.5V4Zm0 2h-.5a1.5 1.5 0 0 0 0 3h.5V6Zm1 4v3h.5a1.5 1.5 0 0 0 0-3H14Z"
      />
    </svg>
  ),
  pin: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M21 11.25c0 1.97-1.03 4.2-2.6 6.53a67.74 67.74 0 0 1-4.23 5.45l-.17.2-.17-.2a67.74 67.74 0 0 1-4.23-5.45C8.03 15.44 7 13.22 7 11.25A7.13 7.13 0 0 1 14 4c3.84 0 7 3.22 7 7.25Zm-6.07 12.63-.28.34L14 25l-.65-.78-.28-.34C9.9 20.06 6 15.4 6 11.25A8.13 8.13 0 0 1 14 3c4.42 0 8 3.7 8 8.25 0 4.14-3.89 8.81-7.07 12.63ZM17 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm1 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
      />
    </svg>
  ),
  table: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M4 5a1 1 0 0 0-1 1v17a1 1 0 0 0 1 1h20a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H4Zm0 1h5v5H4V6Zm0 12v5h5v-5H4Zm6 0v5h14v-5H10Zm14-1v-5H10v5h14ZM9 17H4v-5h5v5Zm1-6V6h14v5H10Z"
      />
    </svg>
  ),
  callout: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
      <path
        fill="currentColor"
        fillRule="nonzero"
        d="M6 21.586l3.586-3.586h13.407c.004 0 .007-11.993.007-11.993 0-.007-17-.007-17-.007v15.586zm-1 2.414v-18.005c0-.549.451-.995.995-.995h17.01c.549 0 .995.45.995 1.007v11.986c0 .556-.45 1.007-1.007 1.007h-12.993l-5 5z"
      />
    </svg>
  ),
  comment: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="none">
      <path
        fill="currentColor"
        fillRule="nonzero"
        d="M12 8C8.68629 8 6 10.6863 6 14V20H18C21.3137 20 24 17.3137 24 14C24 10.6863 21.3137 8 18 8H12ZM5 14C5 10.134 8.13401 7 12 7H18C21.866 7 25 10.134 25 14C25 17.866 21.866 21 18 21H6C5.44772 21 5 20.5523 5 20V14Z"
      />
    </svg>
  ),
  'price-label': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
      <g fill="currentColor" fillRule="nonzero">
        <path d="M6.995 5c.008 0 .005 15.5.005 15.5h-1v-15.493c0-.556.451-1.007.995-1.007h17.01c.549 0 .995.45.995 1.007v11.986c0 .556-.45 1.007-1.007 1.007h-12.993l-3.104 3.104-.707-.707 3.397-3.397h13.407c.004 0 .007-11.993.007-11.993 0-.007-17.005-.007-17.005-.007z" />
        <path d="M6.5 24c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z" />
      </g>
    </svg>
  ),
  signpost: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
      <g fill="currentColor" fillRule="nonzero">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M14.48 5.46a.5.5 0 0 0-.96 0l-.98 3.03a.5.5 0 0 1-.47.35H8.88a.5.5 0 0 0-.3.9l2.58 1.87a.5.5 0 0 1 .18.56l-.98 3.03a.5.5 0 0 0 .77.56l2.58-1.87a.5.5 0 0 1 .58 0l2.58 1.87c.4.28.92-.1.77-.56l-.98-3.03a.5.5 0 0 1 .18-.56l2.57-1.87a.5.5 0 0 0-.3-.9h-3.18a.5.5 0 0 1-.47-.35l-.98-3.03zM14 7.24l-.5 1.56a1.5 1.5 0 0 1-1.43 1.04h-1.65l1.33.96c.53.39.75 1.06.55 1.68l-.51 1.57 1.33-.97a1.5 1.5 0 0 1 1.76 0l1.33.97-.5-1.57c-.2-.62.01-1.3.54-1.68l1.33-.96h-1.65a1.5 1.5 0 0 1-1.42-1.04L14 7.24z"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M15 20.95a10 10 0 1 0-1 .05v6h1v-6.05zM14 20a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"
        />
      </g>
    </svg>
  ),
  'flag-mark': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
      <path
        fill="currentColor"
        fillRule="nonzero"
        d="M7.382 16h14.483l-4.167-5 4.167-5h-15.865v12.764l1.382-2.764zm-2.382 7v-18h19l-5 6 5 6h-16l-3 6z"
      />
    </svg>
  ),
  image: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M21 5H7a3 3 0 0 0-3 3v12q0 .71.3 1.32l5.31-6.63.38-.48.4.47 2.6 3.15 4.61-6.13.4-.53.4.53 5.6 7.32V8a3 3 0 0 0-3-3m2.94 15.6L18 12.82l-4.36 5.8 3.6 4.37H21a3 3 0 0 0 2.94-2.4m-8 2.4-3.33-4.04-2.6-3.17-5.1 6.37c.54.52 1.28.84 2.09.84zM7 4a4 4 0 0 0-4 4v12a4 4 0 0 0 4 4h14a4 4 0 0 0 4-4V8a4 4 0 0 0-4-4zm3 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2m0 1a2 2 0 1 0 0-4 2 2 0 0 0 0 4"
      />
    </svg>
  ),
  post: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28" fill="currentColor">
      <path
        fillRule="evenodd"
        d="m22.3 22 .7 1h-5.35l-4.95-7.04L6.54 23H5.2l6.9-7.88L5.71 6 5 5h5.35l4.73 6.73L20.96 5h1.33l-6.62 7.57L22.3 22Zm-8.92-6.82-.6-.84L6.94 6h2.9l11.24 16h-2.9l-4.79-6.82Z"
      />
    </svg>
  ),
  idea: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
      <path
        fill="currentColor"
        d="M9.5 21H9h.5zm8 0H17h.5zm-6-10H11v1h.5v-1zm4 1h.5v-1h-.5v1zm-6 7.5h.5-.5zm8 0h.5-.5zm.29-1.59A7.97 7.97 0 0 0 21 11.5h-1a6.97 6.97 0 0 1-2.79 5.59l.58.82zM21 11.5A7.5 7.5 0 0 0 13.5 4v1a6.5 6.5 0 0 1 6.5 6.5h1zM13.5 4A7.5 7.5 0 0 0 6 11.5h1A6.5 6.5 0 0 1 13.5 5V4zM6 11.5a7.98 7.98 0 0 0 3.21 6.41l.57-.82A6.98 6.98 0 0 1 7 11.5H6zM9 21a1 1 0 0 0 1 1v-1H9zm8 1a1 1 0 0 0 1-1h-1v1zm-6-.5V23h1v-1.5h-1zm0 1.5a1 1 0 0 0 1 1v-1h-1zm1 1h3v-1h-3v1zm3 0a1 1 0 0 0 1-1h-1v1zm1-1v-1.5h-1V23h1zm-3-11.5v6h1v-6h-1zm-4 6v2h1v-2H9zm0 2V21h1v-1.5H9zm9 1.5v-1.5h-1V21h1zm0-1.5v-2h-1v2h1zM9.5 18h4v-1h-4v1zm4 0h4v-1h-4v1zm-2-6h2v-1h-2v1zm2 0h2v-1h-2v1zM10 22h1.5v-1H10v1zm1.5 0h4v-1h-4v1zm4 0H17v-1h-1.5v1z"
      />
    </svg>
  ),
};
const ALL_DRAWING_MENU_ENTRIES = [
  ...LINE_TOOL_MENU_ENTRIES,
  ...FIB_TOOL_MENU_ENTRIES,
  ...PATTERN_TOOL_MENU_ENTRIES,
  ...FORECAST_TOOL_MENU_ENTRIES,
  ...SHAPE_TOOL_MENU_ENTRIES,
  ...TEXT_TOOL_MENU_ENTRIES,
];
const DRAWING_TOOL_SHORTCUTS = ALL_DRAWING_MENU_ENTRIES.reduce<Record<string, DrawingToolId>>((shortcuts, entry) => {
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
const BINANCE_QUOTE_SUFFIXES = [
  'FDUSD',
  'USDT',
  'USDC',
  'TUSD',
  'BUSD',
  'USDP',
  'DAI',
  'BTC',
  'ETH',
  'BNB',
  'TRY',
  'EUR',
  'BRL',
  'AUD',
  'BIDR',
  'IDRT',
  'NGN',
  'RUB',
  'UAH',
  'ZAR',
  'GBP',
  'JPY',
  'ARS',
  'MXN',
  'PLN',
  'RON',
  'VAI',
] as const;
const CHART_STYLE_OPTIONS: Array<MenuOption<ChartStyle>> = [
  { value: 'candles', label: 'Candles', shortLabel: 'Candle', description: 'OHLC candles' },
  { value: 'line', label: 'Line', description: 'Close price line' },
  { value: 'area', label: 'Area', description: 'Filled close price line' },
];

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
  patternBars: drawing.patternBars?.map((bar) => ({ ...bar })),
});
const isDrawingToolId = (value: unknown): value is DrawingToolId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(DRAWING_TOOL_LABELS, value);
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
const FORECAST_DRAWING_ANCHOR_COUNTS: Partial<Record<DrawingToolId, number>> = {
  'long-position': 4,
  'short-position': 4,
  forecast: 2,
  'bars-pattern': 2,
  'ghost-feed': 2,
  projection: 3,
  'anchored-vwap': 1,
  'fixed-volume-profile': 2,
  'anchored-volume-profile': 1,
  'price-range': 2,
  'date-range': 2,
  'date-price-range': 2,
};
const GHOST_FEED_MAX_ANCHORS = 16;
const isForecastDrawingTool = (kind: DrawingToolId) => FORECAST_DRAWING_ANCHOR_COUNTS[kind] !== undefined;
const isPositionDrawingTool = (kind: DrawingToolId) => kind === 'long-position' || kind === 'short-position';
const SHAPE_DRAWING_TOOL_IDS: ReadonlySet<DrawingToolId> = new Set([
  'brush',
  'highlighter',
  'arrow-marker',
  'arrow',
  'arrow-mark-up',
  'arrow-mark-down',
  'rectangle',
  'rotated-rectangle',
  'path',
  'circle',
  'ellipse',
  'polyline',
  'triangle',
  'arc',
  'curve',
  'double-curve',
]);
const SHAPE_DRAWING_ANCHOR_COUNTS: Partial<Record<DrawingToolId, number>> = {
  'arrow-mark-up': 1,
  'arrow-mark-down': 1,
  'arrow-marker': 2,
  arrow: 2,
  rectangle: 2,
  circle: 2,
  curve: 2,
  'double-curve': 2,
  ellipse: 3,
  'rotated-rectangle': 3,
  triangle: 3,
  arc: 3,
};
const isShapeDrawingTool = (kind: DrawingToolId) => SHAPE_DRAWING_TOOL_IDS.has(kind);
const TEXT_DRAWING_TOOL_IDS: ReadonlySet<DrawingToolId> = new Set([
  'text',
  'note',
  'price-note',
  'pin',
  'table',
  'callout',
  'comment',
  'price-label',
  'signpost',
  'flag-mark',
  'image',
  'post',
  'idea',
]);
const TEXT_DRAWING_ANCHOR_COUNTS: Partial<Record<DrawingToolId, number>> = {
  text: 1,
  note: 2,
  'price-note': 2,
  pin: 1,
  table: 2,
  callout: 2,
  comment: 1,
  'price-label': 2,
  signpost: 1,
  'flag-mark': 1,
  image: 2,
  post: 1,
  idea: 1,
};
const isTextDrawingTool = (kind: DrawingToolId) => TEXT_DRAWING_TOOL_IDS.has(kind);
// Content tools collect their payload (file, link, title) in a dialog before the drawing is created.
const isContentDrawingTool = (kind: DrawingToolId): kind is 'image' | 'post' | 'idea' =>
  kind === 'image' || kind === 'post' || kind === 'idea';
// Tools whose double-click opens the inline text editor.
const hasInlineTextEditor = (kind: DrawingToolId) =>
  kind === 'text' ||
  kind === 'note' ||
  kind === 'pin' ||
  kind === 'table' ||
  kind === 'callout' ||
  kind === 'comment' ||
  kind === 'signpost' ||
  kind === 'idea';
const CONTENT_IMAGE_MAX_DIMENSION = 1024;
const CONTENT_IMAGE_MAX_PLACED_WIDTH = 240;
const CONTENT_IMAGE_MAX_DATA_URL_LENGTH = 2_400_000;
const textDrawingImageCache = new Map<string, HTMLImageElement>();
const getTextDrawingImage = (src: string): HTMLImageElement | null => {
  if (typeof document === 'undefined') return null;
  let image = textDrawingImageCache.get(src);
  if (!image) {
    image = document.createElement('img');
    image.src = src;
    textDrawingImageCache.set(src, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : null;
};
// These tools drop straight into inline text editing once placed (TradingView behavior).
const isInlineEditTextDrawingTool = (kind: DrawingToolId) =>
  kind === 'text' || kind === 'callout' || kind === 'comment' || kind === 'signpost' || kind === 'pin';
// Single-click tools that store a second, independently draggable label anchor.
const isAutoLabelTextDrawingTool = (kind: DrawingToolId) => kind === 'note' || kind === 'price-label';
const TEXT_TABLE_DEFAULT_ROWS = 3;
const TEXT_TABLE_DEFAULT_COLS = 3;
const TEXT_TABLE_MAX_ROWS = 10;
const TEXT_TABLE_MAX_COLS = 10;
const createDefaultTableCells = (rows: number, cols: number): string[][] =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
const resizeTableCells = (cells: string[][] | undefined, rows: number, cols: number): string[][] =>
  Array.from({ length: rows }, (_, rowIndex) =>
    Array.from({ length: cols }, (_, colIndex) => cells?.[rowIndex]?.[colIndex] ?? '')
  );
const isFreehandDrawingTool = (kind: DrawingToolId) => kind === 'brush' || kind === 'highlighter';
const isVariableAnchorShapeDrawingTool = (kind: DrawingToolId) => kind === 'path' || kind === 'polyline';
// Curve tools complete after two clicks; their bend handles are appended automatically and dragged afterwards.
const isAutoControlCurveDrawingTool = (kind: DrawingToolId) => kind === 'curve' || kind === 'double-curve';
const isClassicLineDrawingTool = (kind: DrawingToolId) =>
  !isFibDrawingTool(kind) &&
  !isPatternDrawingTool(kind) &&
  !isForecastDrawingTool(kind) &&
  !isShapeDrawingTool(kind) &&
  !isTextDrawingTool(kind);
const getMaxDrawingAnchorCount = (kind: DrawingToolId) =>
  kind === 'ghost-feed'
    ? GHOST_FEED_MAX_ANCHORS
    : isFreehandDrawingTool(kind)
      ? FREEHAND_DRAWING_MAX_ANCHORS
      : isVariableAnchorShapeDrawingTool(kind)
        ? VARIABLE_SHAPE_DRAWING_MAX_ANCHORS + 1
        : kind === 'curve'
          ? 3
          : kind === 'double-curve'
            ? 4
            : getRequiredDrawingAnchorCount(kind);
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
  SHAPE_DRAWING_ANCHOR_COUNTS[kind] === 1 ||
  kind === 'horizontal-line' ||
  kind === 'horizontal-ray' ||
  kind === 'vertical-line' ||
  kind === 'cross-line' ||
  kind === 'anchored-vwap' ||
  kind === 'anchored-volume-profile' ||
  // Single-click text tools; note/price-label derive their label anchor automatically.
  kind === 'text' ||
  kind === 'pin' ||
  kind === 'comment' ||
  kind === 'signpost' ||
  kind === 'flag-mark' ||
  isAutoLabelTextDrawingTool(kind) ||
  isContentDrawingTool(kind);
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
  SHAPE_DRAWING_ANCHOR_COUNTS[kind] ??
  TEXT_DRAWING_ANCHOR_COUNTS[kind] ??
  (isFreehandDrawingTool(kind) || isVariableAnchorShapeDrawingTool(kind)
    ? 2
    : PATTERN_DRAWING_ANCHOR_COUNTS[kind] ??
      FORECAST_DRAWING_ANCHOR_COUNTS[kind] ??
      (kind === 'disjoint-channel'
        ? 4
        : isChannelDrawingTool(kind) || isThreeAnchorFibDrawingTool(kind)
          ? 3
          : isTwoAnchorDrawingTool(kind) || isFibDrawingTool(kind)
            ? 2
            : 1));
const SHAPE_TOOL_DEFAULT_COLORS: Partial<Record<DrawingToolId, string>> = {
  brush: '#2962ff',
  highlighter: '#f23645',
  'arrow-marker': '#2962ff',
  arrow: '#2962ff',
  'arrow-mark-up': '#089981',
  'arrow-mark-down': '#f23645',
  rectangle: '#9c27b0',
  'rotated-rectangle': '#089981',
  path: '#2962ff',
  circle: '#ff9800',
  ellipse: '#f23645',
  polyline: '#00bcd4',
  triangle: '#089981',
  arc: '#e91e63',
  curve: '#2962ff',
  'double-curve': '#9c27b0',
};
const TEXT_TOOL_DEFAULT_COLORS: Partial<Record<DrawingToolId, string>> = {
  text: '#2962ff',
  note: '#2962ff',
  'price-note': '#2962ff',
  pin: '#2962ff',
  table: '#2962ff',
  callout: '#00bcd4',
  comment: '#2962ff',
  'price-label': '#2962ff',
  signpost: '#787b86',
  'flag-mark': '#2962ff',
  image: '#2962ff',
  post: '#2962ff',
  idea: '#2962ff',
};
const getDefaultDrawingColor = (kind: DrawingToolId) =>
  isFibDrawingTool(kind)
    ? kind === 'fib-spiral'
      ? DRAWING_DEFAULT_COLOR
      : FIB_DEFAULT_TREND_COLOR
    : SHAPE_TOOL_DEFAULT_COLORS[kind] ?? TEXT_TOOL_DEFAULT_COLORS[kind] ?? DRAWING_DEFAULT_COLOR;
const getDefaultDrawingOpacity = (kind: DrawingToolId) =>
  kind === 'highlighter' ? 0.3 : kind === 'callout' ? 0.75 : DRAWING_DEFAULT_OPACITY;
const getDefaultDrawingLineWidth = (kind: DrawingToolId) =>
  kind === 'highlighter' ? 20 : kind === 'brush' ? 3 : 2;
const getDefaultDrawingLeftEnd = (_kind: DrawingToolId): DrawingArrowEnd => 'none';
const getDefaultDrawingRightEnd = (kind: DrawingToolId): DrawingArrowEnd => (kind === 'arrow' ? 'arrow' : 'none');
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
    .map((drawing, index): ChartDrawing | null => {
      const requiredAnchors = getRequiredDrawingAnchorCount(drawing.kind);
      const anchors = drawing.anchors
        .slice(0, getMaxDrawingAnchorCount(drawing.kind))
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
        color: typeof drawing.color === 'string' ? drawing.color : getDefaultDrawingColor(drawing.kind),
        opacity: Number.isFinite(drawing.opacity) ? clamp(drawing.opacity!, 0.1, 1) : getDefaultDrawingOpacity(drawing.kind),
        lineWidth: Number.isFinite(drawing.lineWidth)
          ? clamp(drawing.lineWidth!, 1, isFreehandDrawingTool(drawing.kind) ? 24 : 6)
          : getDefaultDrawingLineWidth(drawing.kind),
        lineStyle: isDrawingLineStyle(drawing.lineStyle) ? drawing.lineStyle : DRAWING_DEFAULT_LINE_STYLE,
        extend: isDrawingExtendMode(drawing.extend) ? drawing.extend : 'none',
        leftEnd: isDrawingArrowEnd(drawing.leftEnd) ? drawing.leftEnd : getDefaultDrawingLeftEnd(drawing.kind),
        rightEnd: isDrawingArrowEnd(drawing.rightEnd) ? drawing.rightEnd : getDefaultDrawingRightEnd(drawing.kind),
        text: typeof drawing.text === 'string' ? drawing.text.slice(0, isTextDrawingTool(drawing.kind) ? 500 : 120) : '',
        showText: drawing.showText === true || isTextDrawingTool(drawing.kind),
        textColor: typeof drawing.textColor === 'string' ? drawing.textColor : DRAWING_DEFAULT_TEXT_COLOR,
        textSize: Number.isFinite(drawing.textSize) ? clamp(drawing.textSize!, 10, 40) : isTextDrawingTool(drawing.kind) ? 14 : 12,
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
        patternBars: Array.isArray(drawing.patternBars)
          ? drawing.patternBars
              .filter(
                (bar): bar is DrawingPatternBar =>
                  bar !== null &&
                  typeof bar === 'object' &&
                  Number.isFinite(bar.open) &&
                  Number.isFinite(bar.high) &&
                  Number.isFinite(bar.low) &&
                  Number.isFinite(bar.close)
              )
              .slice(0, 500)
              .map((bar) => ({ open: bar.open, high: bar.high, low: bar.low, close: bar.close }))
          : undefined,
        seed: Number.isFinite(drawing.seed) ? drawing.seed : undefined,
        tableRows:
          drawing.kind === 'table'
            ? Number.isFinite(drawing.tableRows)
              ? clamp(Math.round(drawing.tableRows!), 1, TEXT_TABLE_MAX_ROWS)
              : TEXT_TABLE_DEFAULT_ROWS
            : undefined,
        tableCols:
          drawing.kind === 'table'
            ? Number.isFinite(drawing.tableCols)
              ? clamp(Math.round(drawing.tableCols!), 1, TEXT_TABLE_MAX_COLS)
              : TEXT_TABLE_DEFAULT_COLS
            : undefined,
        tableCells:
          drawing.kind === 'table'
            ? resizeTableCells(
                Array.isArray(drawing.tableCells)
                  ? drawing.tableCells.map((row) =>
                      Array.isArray(row) ? row.map((cell) => (typeof cell === 'string' ? cell.slice(0, 200) : '')) : []
                    )
                  : undefined,
                Number.isFinite(drawing.tableRows)
                  ? clamp(Math.round(drawing.tableRows!), 1, TEXT_TABLE_MAX_ROWS)
                  : TEXT_TABLE_DEFAULT_ROWS,
                Number.isFinite(drawing.tableCols)
                  ? clamp(Math.round(drawing.tableCols!), 1, TEXT_TABLE_MAX_COLS)
                  : TEXT_TABLE_DEFAULT_COLS
              )
            : undefined,
        imageSrc:
          drawing.kind === 'image' &&
          typeof drawing.imageSrc === 'string' &&
          drawing.imageSrc.startsWith('data:image/') &&
          drawing.imageSrc.length <= CONTENT_IMAGE_MAX_DATA_URL_LENGTH
            ? drawing.imageSrc
            : undefined,
        contentUrl:
          isContentDrawingTool(drawing.kind) && typeof drawing.contentUrl === 'string'
            ? drawing.contentUrl.slice(0, 300)
            : undefined,
        contentMeta:
          isContentDrawingTool(drawing.kind) && typeof drawing.contentMeta === 'string'
            ? drawing.contentMeta.slice(0, 120)
            : undefined,
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
const isPointInPolygon = (x: number, y: number, polygon: Array<{ x: number; y: number }>) => {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const current = polygon[index]!;
    const before = polygon[previous]!;
    if (
      current.y > y !== before.y > y &&
      x < ((before.x - current.x) * (y - current.y)) / (before.y - current.y) + current.x
    ) {
      inside = !inside;
    }
  }
  return inside;
};
const mulberry32 = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
interface GhostFeedCandle {
  logicalIndex: number;
  open: number;
  high: number;
  low: number;
  close: number;
}
const buildGhostFeedCandles = (anchors: ChartDrawingAnchor[], seed: number): GhostFeedCandle[] => {
  const random = mulberry32(Number.isFinite(seed) ? Math.floor(Math.abs(seed)) : 7);
  const candles: GhostFeedCandle[] = [];
  let previousClose: number | null = null;

  for (let segment = 0; segment < anchors.length - 1; segment += 1) {
    const start = anchors[segment]!;
    const end = anchors[segment + 1]!;
    const span = end.logicalIndex - start.logicalIndex;
    if (span < 0.5) continue;

    const count = Math.max(1, Math.round(span));
    const step = (end.price - (previousClose ?? start.price)) / count;
    const amplitude = Math.abs(step) * 0.9 + Math.abs(end.price - start.price) * 0.03;
    let open = previousClose ?? start.price;

    for (let index = 0; index < count; index += 1) {
      const close = index === count - 1 ? end.price : open + step * (0.2 + 1.6 * random());
      const high = Math.max(open, close) + amplitude * random();
      const low = Math.min(open, close) - amplitude * random();
      candles.push({
        logicalIndex: start.logicalIndex + (index / count) * span,
        open,
        high,
        low,
        close,
      });
      open = close;
    }
    previousClose = end.price;
  }

  return candles;
};
const captureBarsPatternData = (candles: Candle[], anchors: ChartDrawingAnchor[]): DrawingPatternBar[] => {
  const [first, second] = anchors;
  if (!first || !second || candles.length === 0) return [];

  const leftAnchor = first.logicalIndex <= second.logicalIndex ? first : second;
  const rightAnchor = first.logicalIndex <= second.logicalIndex ? second : first;
  const startIndex = clamp(Math.round(leftAnchor.logicalIndex), 0, candles.length - 1);
  const endIndex = clamp(Math.round(rightAnchor.logicalIndex), 0, candles.length - 1);
  if (endIndex < startIndex) return [];

  const basePrice = leftAnchor.price;
  return candles.slice(startIndex, Math.min(endIndex + 1, startIndex + 500)).map((candle) => ({
    open: candle.open - basePrice,
    high: candle.high - basePrice,
    low: candle.low - basePrice,
    close: candle.close - basePrice,
  }));
};
const createPositionDrawingAnchors = (
  kind: DrawingToolId,
  anchor: ChartDrawingAnchor,
  candlesPerView: number,
  visiblePriceSpan: number
): ChartDrawingAnchor[] => {
  const barSpan = Math.max(4, Math.round(candlesPerView * 0.16));
  const priceDelta = Math.max(visiblePriceSpan * 0.16, Math.abs(anchor.price) * 0.0001);
  const direction = kind === 'long-position' ? 1 : -1;

  return [
    { logicalIndex: anchor.logicalIndex, price: anchor.price },
    { logicalIndex: anchor.logicalIndex + barSpan, price: anchor.price },
    { logicalIndex: anchor.logicalIndex, price: anchor.price + priceDelta * direction },
    { logicalIndex: anchor.logicalIndex, price: anchor.price - priceDelta * direction },
  ];
};
const normalizePositionDrawingAnchors = (
  kind: DrawingToolId,
  anchors: ChartDrawingAnchor[],
  draggedIndex: number
) => {
  const entry = anchors[0];
  const entryEnd = anchors[1];
  const target = anchors[2];
  const stop = anchors[3];
  if (!entry || !entryEnd || !target || !stop) return;

  const direction = kind === 'long-position' ? 1 : -1;
  entryEnd.price = entry.price;
  entryEnd.logicalIndex = Math.max(entryEnd.logicalIndex, entry.logicalIndex + 1);
  target.logicalIndex = entry.logicalIndex;
  stop.logicalIndex = entry.logicalIndex;
  if (draggedIndex === 2) {
    target.price = direction === 1 ? Math.max(target.price, entry.price) : Math.min(target.price, entry.price);
  } else if (draggedIndex === 3) {
    stop.price = direction === 1 ? Math.min(stop.price, entry.price) : Math.max(stop.price, entry.price);
  } else {
    target.price = direction === 1 ? Math.max(target.price, entry.price) : Math.min(target.price, entry.price);
    stop.price = direction === 1 ? Math.min(stop.price, entry.price) : Math.max(stop.price, entry.price);
  }
};
const sampleForecastCurve = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  segments = 24
): Array<{ x: number; y: number }> => {
  const control = { x: start.x + (end.x - start.x) * 0.55, y: start.y };
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const inverse = 1 - t;
    points.push({
      x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
      y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
    });
  }
  return points;
};
const buildProjectionSectorPolygon = (
  apex: { x: number; y: number },
  first: { x: number; y: number },
  second: { x: number; y: number },
  segments = 32
): Array<{ x: number; y: number }> => {
  const firstRadius = Math.hypot(first.x - apex.x, first.y - apex.y);
  const secondRadius = Math.hypot(second.x - apex.x, second.y - apex.y);
  const firstAngle = Math.atan2(first.y - apex.y, first.x - apex.x);
  const secondAngle = Math.atan2(second.y - apex.y, second.x - apex.x);
  let sweep = secondAngle - firstAngle;
  if (sweep > Math.PI) sweep -= Math.PI * 2;
  if (sweep < -Math.PI) sweep += Math.PI * 2;

  const polygon: Array<{ x: number; y: number }> = [{ x: apex.x, y: apex.y }];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const angle = firstAngle + sweep * t;
    const radius = firstRadius + (secondRadius - firstRadius) * t;
    polygon.push({ x: apex.x + Math.cos(angle) * radius, y: apex.y + Math.sin(angle) * radius });
  }
  return polygon;
};
const computeAnchoredVwap = (candles: Candle[], anchorIndex: number): Array<{ logicalIndex: number; value: number }> => {
  const startIndex = clamp(Math.round(anchorIndex), 0, Math.max(0, candles.length - 1));
  const series: Array<{ logicalIndex: number; value: number }> = [];
  let cumulativeVolume = 0;
  let cumulativeTypicalVolume = 0;

  for (let index = startIndex; index < candles.length; index += 1) {
    const candle = candles[index]!;
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    const volume = Math.max(0, candle.volume);
    cumulativeVolume += volume;
    cumulativeTypicalVolume += typicalPrice * volume;
    series.push({
      logicalIndex: index,
      value: cumulativeVolume > 0 ? cumulativeTypicalVolume / cumulativeVolume : typicalPrice,
    });
  }
  return series;
};
interface VolumeProfileRow {
  priceLow: number;
  priceHigh: number;
  upVolume: number;
  downVolume: number;
}
interface VolumeProfileData {
  rows: VolumeProfileRow[];
  minPrice: number;
  maxPrice: number;
  maxRowVolume: number;
  totalVolume: number;
  pocIndex: number;
  valueAreaLow: number;
  valueAreaHigh: number;
}
const VOLUME_PROFILE_ROW_COUNT = 24;
const computeVolumeProfile = (candles: Candle[], fromIndex: number, toIndex: number): VolumeProfileData | null => {
  if (candles.length === 0) return null;

  const startIndex = clamp(Math.round(Math.min(fromIndex, toIndex)), 0, candles.length - 1);
  const endIndex = clamp(Math.round(Math.max(fromIndex, toIndex)), 0, candles.length - 1);
  const slice = candles.slice(startIndex, endIndex + 1);
  if (slice.length === 0) return null;

  let minPrice = Number.POSITIVE_INFINITY;
  let maxPrice = Number.NEGATIVE_INFINITY;
  slice.forEach((candle) => {
    minPrice = Math.min(minPrice, candle.low);
    maxPrice = Math.max(maxPrice, candle.high);
  });
  if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice)) return null;
  if (maxPrice - minPrice <= 0) {
    maxPrice = minPrice + Math.max(Math.abs(minPrice) * 0.001, 0.0001);
  }

  const rowHeight = (maxPrice - minPrice) / VOLUME_PROFILE_ROW_COUNT;
  const rows: VolumeProfileRow[] = Array.from({ length: VOLUME_PROFILE_ROW_COUNT }, (_, index) => ({
    priceLow: minPrice + rowHeight * index,
    priceHigh: minPrice + rowHeight * (index + 1),
    upVolume: 0,
    downVolume: 0,
  }));

  slice.forEach((candle) => {
    const span = Math.max(candle.high - candle.low, rowHeight * 0.01);
    const volume = Math.max(0, candle.volume);
    const isUp = candle.close >= candle.open;
    const firstRow = clamp(Math.floor((candle.low - minPrice) / rowHeight), 0, VOLUME_PROFILE_ROW_COUNT - 1);
    const lastRow = clamp(Math.floor((candle.high - minPrice) / rowHeight), 0, VOLUME_PROFILE_ROW_COUNT - 1);
    for (let rowIndex = firstRow; rowIndex <= lastRow; rowIndex += 1) {
      const row = rows[rowIndex]!;
      const overlap = Math.min(candle.high, row.priceHigh) - Math.max(candle.low, row.priceLow);
      const portion = volume * clamp(overlap / span, 0, 1);
      if (isUp) {
        row.upVolume += portion;
      } else {
        row.downVolume += portion;
      }
    }
  });

  let maxRowVolume = 0;
  let totalVolume = 0;
  let pocIndex = 0;
  rows.forEach((row, index) => {
    const rowTotal = row.upVolume + row.downVolume;
    totalVolume += rowTotal;
    if (rowTotal > maxRowVolume) {
      maxRowVolume = rowTotal;
      pocIndex = index;
    }
  });
  if (maxRowVolume <= 0) return null;

  let valueAreaLow = pocIndex;
  let valueAreaHigh = pocIndex;
  let coveredVolume = rows[pocIndex]!.upVolume + rows[pocIndex]!.downVolume;
  while (coveredVolume < totalVolume * 0.7 && (valueAreaLow > 0 || valueAreaHigh < rows.length - 1)) {
    const lowerRow = valueAreaLow > 0 ? rows[valueAreaLow - 1]! : null;
    const upperRow = valueAreaHigh < rows.length - 1 ? rows[valueAreaHigh + 1]! : null;
    const lowerTotal = lowerRow ? lowerRow.upVolume + lowerRow.downVolume : -1;
    const upperTotal = upperRow ? upperRow.upVolume + upperRow.downVolume : -1;
    if (upperTotal >= lowerTotal && upperRow) {
      valueAreaHigh += 1;
      coveredVolume += upperTotal;
    } else if (lowerRow) {
      valueAreaLow -= 1;
      coveredVolume += lowerTotal;
    } else {
      break;
    }
  }

  return { rows, minPrice, maxPrice, maxRowVolume, totalVolume, pocIndex, valueAreaLow, valueAreaHigh };
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
const getPolylineHit = (
  points: Array<{ x: number; y: number }>,
  x: number,
  y: number,
  tolerance: number
) => {
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index]!;
    const end = points[index + 1]!;
    if (getDistanceToSegment(x, y, start, end) <= tolerance) return true;
  }

  return false;
};
const getRectangleCorners = (start: { x: number; y: number }, end: { x: number; y: number }) => [
  { x: start.x, y: start.y },
  { x: end.x, y: start.y },
  { x: end.x, y: end.y },
  { x: start.x, y: end.y },
];
const getRotatedRectangleCorners = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  control: { x: number; y: number }
) => {
  const offset = getProjectedChannelOffset(start, end, control);
  return [
    start,
    end,
    { x: end.x + offset.x, y: end.y + offset.y },
    { x: start.x + offset.x, y: start.y + offset.y },
  ];
};
const sampleQuadraticCurve = (
  start: { x: number; y: number },
  control: { x: number; y: number },
  end: { x: number; y: number },
  segments = 32
): Array<{ x: number; y: number }> => {
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const inverse = 1 - t;
    points.push({
      x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
      y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
    });
  }
  return points;
};
const sampleCubicCurve = (
  start: { x: number; y: number },
  controlA: { x: number; y: number },
  controlB: { x: number; y: number },
  end: { x: number; y: number },
  segments = 36
): Array<{ x: number; y: number }> => {
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const inverse = 1 - t;
    points.push({
      x:
        inverse * inverse * inverse * start.x +
        3 * inverse * inverse * t * controlA.x +
        3 * inverse * t * t * controlB.x +
        t * t * t * end.x,
      y:
        inverse * inverse * inverse * start.y +
        3 * inverse * inverse * t * controlA.y +
        3 * inverse * t * t * controlB.y +
        t * t * t * end.y,
    });
  }
  return points;
};
const getPointAlongWithPerpOffset = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  t: number,
  offsetRatio: number
) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const perpX = -dy / length;
  const perpY = dx / length;
  return {
    x: start.x + dx * t + perpX * offsetRatio * length,
    y: start.y + dy * t + perpY * offsetRatio * length,
  };
};
// Default bend handles used while previewing and when a curve completes after its two clicks.
const getDefaultShapeCurveControls = (
  kind: DrawingToolId,
  start: { x: number; y: number },
  end: { x: number; y: number }
) =>
  kind === 'double-curve'
    ? [
        getPointAlongWithPerpOffset(start, end, 1 / 3, 0.18),
        getPointAlongWithPerpOffset(start, end, 2 / 3, -0.18),
      ]
    : [getPointAlongWithPerpOffset(start, end, 0.5, 0.18)];
// Quadratic curve that PASSES THROUGH the apex point (apex = point on curve at t=0.5).
const sampleQuadraticThroughPoints = (
  start: { x: number; y: number },
  apex: { x: number; y: number },
  end: { x: number; y: number }
) =>
  sampleQuadraticCurve(
    start,
    { x: 2 * apex.x - (start.x + end.x) / 2, y: 2 * apex.y - (start.y + end.y) / 2 },
    end
  );
// Cubic curve that passes through two on-curve handles at t=1/3 and t=2/3.
const sampleCubicThroughPoints = (
  start: { x: number; y: number },
  handleA: { x: number; y: number },
  handleB: { x: number; y: number },
  end: { x: number; y: number }
) =>
  sampleCubicCurve(
    start,
    {
      x: (-5 * start.x + 18 * handleA.x - 9 * handleB.x + 2 * end.x) / 6,
      y: (-5 * start.y + 18 * handleA.y - 9 * handleB.y + 2 * end.y) / 6,
    },
    {
      x: (2 * start.x - 9 * handleA.x + 18 * handleB.x - 5 * end.x) / 6,
      y: (2 * start.y - 9 * handleA.y + 18 * handleB.y - 5 * end.y) / 6,
    },
    end
  );
const getShapeCurvePoints = (kind: DrawingToolId, points: Array<{ x: number; y: number }>) => {
  const [first, second, third, fourth] = points;
  if (!first || !second) return points;

  if (kind === 'arc') {
    return third ? sampleQuadraticThroughPoints(first, third, second) : points;
  }

  if (kind === 'curve') {
    const apex = third ?? getDefaultShapeCurveControls(kind, first, second)[0]!;
    return sampleQuadraticThroughPoints(first, apex, second);
  }

  if (kind === 'double-curve') {
    const defaults = getDefaultShapeCurveControls(kind, first, second);
    const handleA = third ?? defaults[0]!;
    const handleB = fourth ?? defaults[1]!;
    return sampleCubicThroughPoints(first, handleA, handleB, second);
  }

  return points;
};
const getArrowMarkerPolygon = (
  from: { x: number; y: number },
  to: { x: number; y: number },
  lineWidth: number
) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length < 2) return null;

  const dirX = dx / length;
  const dirY = dy / length;
  const perpX = -dirY;
  const perpY = dirX;
  const headLength = clamp(length * 0.42, 8, 18 + lineWidth * 6);
  const tailHalfWidth = Math.max(2, lineWidth * 1.1);
  const baseHalfWidth = Math.max(5.5, lineWidth * 2.8);
  const headHalfWidth = baseHalfWidth * 1.9;
  const baseX = to.x - dirX * headLength;
  const baseY = to.y - dirY * headLength;

  return [
    { x: from.x + perpX * tailHalfWidth, y: from.y + perpY * tailHalfWidth },
    { x: baseX + perpX * baseHalfWidth, y: baseY + perpY * baseHalfWidth },
    { x: baseX + perpX * headHalfWidth, y: baseY + perpY * headHalfWidth },
    { x: to.x, y: to.y },
    { x: baseX - perpX * headHalfWidth, y: baseY - perpY * headHalfWidth },
    { x: baseX - perpX * baseHalfWidth, y: baseY - perpY * baseHalfWidth },
    { x: from.x - perpX * tailHalfWidth, y: from.y - perpY * tailHalfWidth },
  ];
};
// Ellipse: first two anchors are the ends of the major axis, third sets the perpendicular radius.
const getEllipseGeometry = (
  first: { x: number; y: number },
  second: { x: number; y: number },
  third: { x: number; y: number } | undefined
) => {
  const centerX = (first.x + second.x) / 2;
  const centerY = (first.y + second.y) / 2;
  const radiusX = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y) / 2);
  const rotation = Math.atan2(second.y - first.y, second.x - first.x);
  let radiusY = 1;
  if (third) {
    const length = Math.hypot(second.x - first.x, second.y - first.y) || 1;
    radiusY = Math.max(
      1,
      Math.abs(
        ((second.x - first.x) * (first.y - third.y) - (second.y - first.y) * (first.x - third.x)) / length
      )
    );
  }
  return { centerX, centerY, radiusX, radiusY, rotation };
};
const arePolylinePointsClosed = (points: Array<{ x: number; y: number }>) => {
  if (points.length < 4) return false;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  return Math.hypot(last.x - first.x, last.y - first.y) <= 1.5;
};
const isPointNearEllipse = (
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  tolerance: number
) => {
  if (radiusX < 1 || radiusY < 1) {
    return Math.abs(x - centerX) <= Math.max(radiusX, tolerance) && Math.abs(y - centerY) <= Math.max(radiusY, tolerance);
  }

  const normalizedX = (x - centerX) / radiusX;
  const normalizedY = (y - centerY) / radiusY;
  const normalizedDistance = normalizedX * normalizedX + normalizedY * normalizedY;
  if (normalizedDistance <= 1) return true;

  const edgeDistance = Math.abs(Math.sqrt(normalizedDistance) - 1) * Math.max(radiusX, radiusY);
  return edgeDistance <= tolerance;
};
const hitTestPolygonBody = (
  polygon: Array<{ x: number; y: number }>,
  x: number,
  y: number,
  tolerance: number
) => {
  if (polygon.length < 3) return false;
  return isPointInPolygon(x, y, polygon) || getPolylineHit([...polygon, polygon[0]!], x, y, tolerance);
};
const hitTestShapeDrawingAt = (
  drawing: ChartDrawing,
  points: Array<{ x: number; y: number }>,
  x: number,
  y: number,
  tolerance: number
) => {
  const [first, second, third] = points;
  if (!first) return false;

  if (drawing.kind === 'arrow-mark-up' || drawing.kind === 'arrow-mark-down') {
    const sign = drawing.kind === 'arrow-mark-up' ? 1 : -1;
    const top = sign === 1 ? first.y - tolerance : first.y - 22 - tolerance;
    const bottom = sign === 1 ? first.y + 22 + tolerance : first.y + tolerance;
    return Math.abs(x - first.x) <= 11 + tolerance && y >= top && y <= bottom;
  }

  if (drawing.kind === 'brush' || drawing.kind === 'highlighter') {
    return getPolylineHit(points, x, y, Math.max(tolerance, drawing.lineWidth * 0.85));
  }

  if (drawing.kind === 'path') {
    return getPolylineHit(points, x, y, tolerance);
  }

  if (drawing.kind === 'polyline') {
    return arePolylinePointsClosed(points)
      ? hitTestPolygonBody(points.slice(0, -1), x, y, tolerance)
      : getPolylineHit(points, x, y, tolerance);
  }

  if (!second) return false;

  if (drawing.kind === 'arrow-marker') {
    const polygon = getArrowMarkerPolygon(first, second, drawing.lineWidth);
    return polygon ? hitTestPolygonBody(polygon, x, y, tolerance) : Math.hypot(x - first.x, y - first.y) <= tolerance;
  }

  if (drawing.kind === 'arrow') {
    return getDistanceToSegment(x, y, first, second) <= tolerance;
  }

  if (drawing.kind === 'rectangle') {
    return hitTestPolygonBody(getRectangleCorners(first, second), x, y, tolerance);
  }

  if (drawing.kind === 'rotated-rectangle') {
    if (!third) return getDistanceToSegment(x, y, first, second) <= tolerance;
    return hitTestPolygonBody(getRotatedRectangleCorners(first, second, third), x, y, tolerance);
  }

  if (drawing.kind === 'circle') {
    const radius = Math.hypot(second.x - first.x, second.y - first.y);
    return Math.hypot(x - first.x, y - first.y) <= radius + tolerance;
  }

  if (drawing.kind === 'ellipse') {
    if (!third) return getDistanceToSegment(x, y, first, second) <= tolerance;
    const { centerX, centerY, radiusX, radiusY, rotation } = getEllipseGeometry(first, second, third);
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    const localX = (x - centerX) * cos - (y - centerY) * sin;
    const localY = (x - centerX) * sin + (y - centerY) * cos;
    return isPointNearEllipse(localX + centerX, localY + centerY, centerX, centerY, radiusX, radiusY, tolerance);
  }

  if (drawing.kind === 'triangle') {
    if (!third) return getDistanceToSegment(x, y, first, second) <= tolerance;
    return hitTestPolygonBody([first, second, third], x, y, tolerance);
  }

  if (drawing.kind === 'arc') {
    const curvePoints = getShapeCurvePoints(drawing.kind, points);
    if (third && curvePoints.length > 2) {
      return hitTestPolygonBody(curvePoints, x, y, tolerance);
    }
    return getPolylineHit(curvePoints, x, y, tolerance);
  }

  if (drawing.kind === 'curve' || drawing.kind === 'double-curve') {
    return getPolylineHit(getShapeCurvePoints(drawing.kind, points), x, y, tolerance);
  }

  return false;
};
const getDrawingRenderedSegments = (
  drawing: ChartDrawing,
  points: Array<{ x: number; y: number }>,
  chartArea: ChartCanvasArea
): DrawingRenderedSegment[] => {
  const start = points[0];
  if (!start) return [];

  if (isFibDrawingTool(drawing.kind) || isPatternDrawingTool(drawing.kind) || isShapeDrawingTool(drawing.kind)) return [];

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

const TEXT_DRAWING_FONT_STACK = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const TEXT_DRAWING_CARD_BG = '#ffffff';
const TEXT_DRAWING_CARD_BORDER = '#d1d4dc';
const TEXT_DRAWING_CARD_TEXT = '#131722';
const TEXT_DRAWING_PLACEHOLDER = 'Add text';
const TEXT_DRAWING_LINE_HEIGHT_RATIO = 1.35;
const TEXT_DRAWING_MAX_LINE_WIDTH = 400;

let textDrawingMeasureCtx: CanvasRenderingContext2D | null = null;
const measureTextDrawingWidth = (text: string, font: string) => {
  if (typeof document === 'undefined') return text.length * 7;
  if (!textDrawingMeasureCtx) {
    textDrawingMeasureCtx = document.createElement('canvas').getContext('2d');
  }
  if (!textDrawingMeasureCtx) return text.length * 7;
  textDrawingMeasureCtx.font = font;
  return textDrawingMeasureCtx.measureText(text).width;
};

const buildTextDrawingFont = (drawing: ChartDrawing, sizeOverride?: number) =>
  `${drawing.textItalic ? 'italic ' : ''}${drawing.textBold ? '700' : '400'} ${sizeOverride ?? drawing.textSize}px ${TEXT_DRAWING_FONT_STACK}`;

interface TextDrawingPoint {
  x: number;
  y: number;
}

interface TextDrawingRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TextDrawingTextBlock {
  lines: string[];
  x: number;
  y: number;
  lineHeight: number;
  font: string;
  color: string;
  align: 'left' | 'center';
  placeholder: boolean;
}

interface TextDrawingRenderModel {
  boxes: Array<TextDrawingRect & { r: number; fill: string | null; stroke: string | null; strokeWidth?: number; shadow?: boolean }>;
  polygons: Array<{ points: TextDrawingPoint[]; fill: string | null; stroke: string | null }>;
  lines: Array<{ start: TextDrawingPoint; end: TextDrawingPoint; color: string; width: number; dash?: number[] }>;
  circles: Array<{ x: number; y: number; r: number; fill: string | null; stroke: string | null; strokeWidth?: number }>;
  texts: TextDrawingTextBlock[];
  gridLines: Array<{ start: TextDrawingPoint; end: TextDrawingPoint }>;
  hitRects: TextDrawingRect[];
  hitSegments: Array<{ start: TextDrawingPoint; end: TextDrawingPoint }>;
  selectionRect: TextDrawingRect | null;
  editorRect: TextDrawingRect | null;
  editorTextIndex: number | null;
  tableCellRects: TextDrawingRect[][] | null;
}

interface TextDrawingModelOptions {
  mutedTextColor: string;
  popupVisible?: boolean;
  editingCell?: { row: number; col: number } | null;
}

const splitTextDrawingLines = (text: string) => {
  const lines = text.replace(/\r/g, '').split('\n');
  return lines.length > 0 ? lines : [''];
};

const measureTextDrawingBlock = (lines: string[], font: string, textSize: number) => {
  const lineHeight = Math.round(textSize * TEXT_DRAWING_LINE_HEIGHT_RATIO);
  const width = Math.min(
    TEXT_DRAWING_MAX_LINE_WIDTH,
    Math.max(...lines.map((line) => measureTextDrawingWidth(line, font)), 8)
  );
  return { width, height: lines.length * lineHeight, lineHeight };
};

const nearestPointOnTextDrawingRect = (rect: TextDrawingRect, point: TextDrawingPoint): TextDrawingPoint => ({
  x: clamp(point.x, rect.x, rect.x + rect.w),
  y: clamp(point.y, rect.y, rect.y + rect.h),
});

const getTextDrawingRenderModel = (
  drawing: ChartDrawing,
  points: TextDrawingPoint[],
  options: TextDrawingModelOptions
): TextDrawingRenderModel => {
  const model: TextDrawingRenderModel = {
    boxes: [],
    polygons: [],
    lines: [],
    circles: [],
    texts: [],
    gridLines: [],
    hitRects: [],
    hitSegments: [],
    selectionRect: null,
    editorRect: null,
    editorTextIndex: null,
    tableCellRects: null,
  };
  const [p0, p1] = points;
  if (!p0) return model;

  const font = buildTextDrawingFont(drawing);
  const rawText = drawing.text;
  const hasText = rawText.trim().length > 0;
  const textLines = hasText ? splitTextDrawingLines(rawText) : [TEXT_DRAWING_PLACEHOLDER];

  if (drawing.kind === 'text') {
    const block = measureTextDrawingBlock(textLines, font, drawing.textSize);
    const pad = 5;
    const box: TextDrawingRect = {
      x: p0.x - pad,
      y: p0.y - pad,
      w: block.width + pad * 2,
      h: block.height + pad * 2,
    };
    model.texts.push({
      lines: textLines,
      x: p0.x,
      y: p0.y,
      lineHeight: block.lineHeight,
      font,
      color: hasText ? drawing.textColor : options.mutedTextColor,
      align: 'left',
      placeholder: !hasText,
    });
    model.hitRects.push(box);
    model.selectionRect = box;
    model.editorRect = { x: p0.x, y: p0.y, w: Math.max(block.width, 120), h: block.height };
    model.editorTextIndex = 0;
    return model;
  }

  if (drawing.kind === 'note') {
    const labelPoint = p1 ?? { x: p0.x + 36, y: p0.y };
    const block = measureTextDrawingBlock(textLines, font, drawing.textSize);
    const padX = 9;
    const padY = 7;
    const box: TextDrawingRect = {
      x: labelPoint.x,
      y: labelPoint.y - block.height / 2 - padY,
      w: block.width + padX * 2,
      h: block.height + padY * 2,
    };
    model.lines.push({
      start: p0,
      end: nearestPointOnTextDrawingRect(box, p0),
      color: TEXT_DRAWING_CARD_BORDER,
      width: 1,
    });
    model.circles.push({ x: p0.x, y: p0.y, r: 2.4, fill: drawing.color, stroke: null });
    model.boxes.push({ ...box, r: 4, fill: TEXT_DRAWING_CARD_BG, stroke: TEXT_DRAWING_CARD_BORDER, shadow: true });
    model.texts.push({
      lines: textLines,
      x: box.x + padX,
      y: box.y + padY,
      lineHeight: block.lineHeight,
      font,
      color: hasText ? drawing.textColor : options.mutedTextColor,
      align: 'left',
      placeholder: !hasText,
    });
    model.hitRects.push(box);
    model.hitSegments.push({ start: p0, end: labelPoint });
    model.selectionRect = box;
    model.editorRect = { x: box.x + padX, y: box.y + padY, w: Math.max(block.width, 110), h: block.height };
    model.editorTextIndex = model.texts.length - 1;
    return model;
  }

  if (drawing.kind === 'price-note') {
    const labelPoint = p1 ?? { x: p0.x + 40, y: p0.y - 24 };
    const priceText = formatPrice(drawing.anchors[0]?.price ?? 0);
    const userText = rawText.trim().replace(/\s*\n\s*/g, ' ');
    const pillText = userText.length > 0 ? `${priceText}  ${userText}` : priceText;
    const pillFont = buildTextDrawingFont(drawing);
    const textWidth = measureTextDrawingWidth(pillText, pillFont);
    const padX = 9;
    const dotRadius = 3;
    const pillHeight = drawing.textSize + 13;
    const pill: TextDrawingRect = {
      x: labelPoint.x,
      y: labelPoint.y - pillHeight / 2,
      w: textWidth + padX * 2 + dotRadius * 2 + 6,
      h: pillHeight,
    };
    model.lines.push({
      start: p0,
      end: nearestPointOnTextDrawingRect(pill, p0),
      color: drawing.color,
      width: 1,
    });
    model.circles.push({ x: p0.x, y: p0.y, r: 3, fill: null, stroke: drawing.color, strokeWidth: 1.4 });
    model.boxes.push({ ...pill, r: 4, fill: drawing.color, stroke: null });
    model.circles.push({
      x: pill.x + padX + dotRadius,
      y: pill.y + pill.h / 2,
      r: dotRadius,
      fill: '#ffffff',
      stroke: null,
    });
    model.texts.push({
      lines: [pillText],
      x: pill.x + padX + dotRadius * 2 + 6,
      y: pill.y + (pill.h - drawing.textSize * TEXT_DRAWING_LINE_HEIGHT_RATIO) / 2,
      lineHeight: Math.round(drawing.textSize * TEXT_DRAWING_LINE_HEIGHT_RATIO),
      font: pillFont,
      color: '#ffffff',
      align: 'left',
      placeholder: false,
    });
    model.hitRects.push(pill);
    model.hitSegments.push({ start: p0, end: labelPoint });
    model.selectionRect = pill;
    return model;
  }

  if (drawing.kind === 'pin') {
    const balloonCenter = { x: p0.x, y: p0.y - 13 };
    const balloonRadius = 9;
    model.polygons.push({
      points: [
        { x: p0.x, y: p0.y },
        { x: p0.x - 5, y: balloonCenter.y + 6 },
        { x: p0.x + 5, y: balloonCenter.y + 6 },
      ],
      fill: drawing.color,
      stroke: null,
    });
    model.circles.push({ x: balloonCenter.x, y: balloonCenter.y, r: balloonRadius, fill: drawing.color, stroke: null });
    model.circles.push({ x: balloonCenter.x, y: balloonCenter.y, r: 3, fill: '#ffffff', stroke: null });
    const balloonBox: TextDrawingRect = {
      x: balloonCenter.x - balloonRadius,
      y: balloonCenter.y - balloonRadius,
      w: balloonRadius * 2,
      h: balloonRadius * 2 + 13,
    };
    model.hitRects.push(balloonBox);
    model.selectionRect = balloonBox;

    if (options.popupVisible) {
      const block = measureTextDrawingBlock(textLines, font, drawing.textSize);
      const padX = 10;
      const padY = 8;
      const popup: TextDrawingRect = {
        x: balloonCenter.x - Math.max(block.width + padX * 2, 130) * 0.3,
        y: balloonCenter.y - balloonRadius - block.height - padY * 2 - 8,
        w: Math.max(block.width + padX * 2, 130),
        h: block.height + padY * 2,
      };
      model.boxes.push({ ...popup, r: 6, fill: TEXT_DRAWING_CARD_BG, stroke: TEXT_DRAWING_CARD_BORDER, shadow: true });
      model.texts.push({
        lines: textLines,
        x: popup.x + padX,
        y: popup.y + padY,
        lineHeight: block.lineHeight,
        font,
        color: hasText ? drawing.textColor : options.mutedTextColor,
        align: 'left',
        placeholder: !hasText,
      });
      model.hitRects.push(popup);
      model.editorRect = { x: popup.x + padX, y: popup.y + padY, w: popup.w - padX * 2, h: block.height };
      model.editorTextIndex = model.texts.length - 1;
    }
    return model;
  }

  if (drawing.kind === 'table') {
    const corner = p1 ?? { x: p0.x + 160, y: p0.y + 90 };
    const rect: TextDrawingRect = {
      x: Math.min(p0.x, corner.x),
      y: Math.min(p0.y, corner.y),
      w: Math.max(24, Math.abs(corner.x - p0.x)),
      h: Math.max(24, Math.abs(corner.y - p0.y)),
    };
    const rows = clamp(drawing.tableRows ?? TEXT_TABLE_DEFAULT_ROWS, 1, TEXT_TABLE_MAX_ROWS);
    const cols = clamp(drawing.tableCols ?? TEXT_TABLE_DEFAULT_COLS, 1, TEXT_TABLE_MAX_COLS);
    model.boxes.push({ ...rect, r: 2, fill: TEXT_DRAWING_CARD_BG, stroke: TEXT_DRAWING_CARD_BORDER });
    const cellWidth = rect.w / cols;
    const cellHeight = rect.h / rows;
    for (let col = 1; col < cols; col += 1) {
      model.gridLines.push({
        start: { x: rect.x + col * cellWidth, y: rect.y },
        end: { x: rect.x + col * cellWidth, y: rect.y + rect.h },
      });
    }
    for (let row = 1; row < rows; row += 1) {
      model.gridLines.push({
        start: { x: rect.x, y: rect.y + row * cellHeight },
        end: { x: rect.x + rect.w, y: rect.y + row * cellHeight },
      });
    }
    const cellRects: TextDrawingRect[][] = [];
    const cellPad = 6;
    for (let row = 0; row < rows; row += 1) {
      const rowRects: TextDrawingRect[] = [];
      for (let col = 0; col < cols; col += 1) {
        const cellRect: TextDrawingRect = {
          x: rect.x + col * cellWidth,
          y: rect.y + row * cellHeight,
          w: cellWidth,
          h: cellHeight,
        };
        rowRects.push(cellRect);
        const cellText = drawing.tableCells?.[row]?.[col] ?? '';
        const isEditingCell = options.editingCell?.row === row && options.editingCell?.col === col;
        if (cellText.trim().length > 0 && !isEditingCell) {
          model.texts.push({
            lines: splitTextDrawingLines(cellText),
            x: cellRect.x + cellPad,
            y: cellRect.y + cellPad,
            lineHeight: Math.round(drawing.textSize * TEXT_DRAWING_LINE_HEIGHT_RATIO),
            font,
            color: drawing.textColor,
            align: 'left',
            placeholder: false,
          });
        }
        if (isEditingCell) {
          model.editorRect = {
            x: cellRect.x + cellPad,
            y: cellRect.y + cellPad,
            w: cellRect.w - cellPad * 2,
            h: cellRect.h - cellPad * 2,
          };
        }
      }
      cellRects.push(rowRects);
    }
    model.tableCellRects = cellRects;
    model.hitRects.push(rect);
    model.selectionRect = rect;
    return model;
  }

  if (drawing.kind === 'callout') {
    const bubbleCenter = p1 ?? { x: p0.x + 70, y: p0.y - 50 };
    const block = measureTextDrawingBlock(textLines, font, drawing.textSize);
    const padX = 12;
    const padY = 9;
    const bubble: TextDrawingRect = {
      x: bubbleCenter.x - Math.max(block.width + padX * 2, 76) / 2,
      y: bubbleCenter.y - (block.height + padY * 2) / 2,
      w: Math.max(block.width + padX * 2, 76),
      h: block.height + padY * 2,
    };
    const tailBase = nearestPointOnTextDrawingRect(bubble, p0);
    const tailDeltaX = p0.x - tailBase.x;
    const tailDeltaY = p0.y - tailBase.y;
    const tailLength = Math.hypot(tailDeltaX, tailDeltaY) || 1;
    const perpX = (-tailDeltaY / tailLength) * 7;
    const perpY = (tailDeltaX / tailLength) * 7;
    if (tailLength > 4) {
      model.polygons.push({
        points: [
          { x: p0.x, y: p0.y },
          { x: tailBase.x + perpX, y: tailBase.y + perpY },
          { x: tailBase.x - perpX, y: tailBase.y - perpY },
        ],
        fill: drawing.color,
        stroke: null,
      });
    }
    model.boxes.push({
      ...bubble,
      r: 6,
      fill: hexToRgba(drawing.color, drawing.opacity),
      stroke: drawing.color,
      strokeWidth: 1,
    });
    model.texts.push({
      lines: textLines,
      x: bubble.x + bubble.w / 2,
      y: bubble.y + padY,
      lineHeight: block.lineHeight,
      font,
      color: hasText ? drawing.textColor : 'rgba(255, 255, 255, 0.75)',
      align: 'center',
      placeholder: !hasText,
    });
    model.hitRects.push(bubble);
    model.hitSegments.push({ start: p0, end: tailBase });
    model.circles.push({ x: p0.x, y: p0.y, r: 2.4, fill: drawing.color, stroke: null });
    model.selectionRect = bubble;
    model.editorRect = { x: bubble.x + padX, y: bubble.y + padY, w: bubble.w - padX * 2, h: block.height };
    model.editorTextIndex = model.texts.length - 1;
    return model;
  }

  if (drawing.kind === 'comment') {
    const block = measureTextDrawingBlock(textLines, font, drawing.textSize);
    const padX = 12;
    const padY = 8;
    const pill: TextDrawingRect = {
      x: p0.x - 6,
      y: p0.y - 10 - (block.height + padY * 2),
      w: Math.max(block.width + padX * 2, 60),
      h: block.height + padY * 2,
    };
    model.polygons.push({
      points: [
        { x: p0.x, y: p0.y },
        { x: p0.x + 4, y: pill.y + pill.h - 1 },
        { x: p0.x + 16, y: pill.y + pill.h - 1 },
      ],
      fill: drawing.color,
      stroke: null,
    });
    model.boxes.push({ ...pill, r: Math.min(12, pill.h / 2), fill: drawing.color, stroke: null });
    model.texts.push({
      lines: textLines,
      x: pill.x + padX,
      y: pill.y + padY,
      lineHeight: block.lineHeight,
      font,
      color: hasText ? drawing.textColor : 'rgba(255, 255, 255, 0.75)',
      align: 'left',
      placeholder: !hasText,
    });
    model.hitRects.push(pill);
    model.hitRects.push({ x: p0.x - 4, y: pill.y + pill.h - 2, w: 22, h: p0.y - (pill.y + pill.h) + 4 });
    model.selectionRect = pill;
    model.editorRect = { x: pill.x + padX, y: pill.y + padY, w: Math.max(block.width, 90), h: block.height };
    model.editorTextIndex = model.texts.length - 1;
    return model;
  }

  if (drawing.kind === 'price-label') {
    const labelPoint = p1 ?? { x: p0.x + 34, y: p0.y - 30 };
    const priceText = formatPrice(drawing.anchors[0]?.price ?? 0);
    const labelFont = `${drawing.textItalic ? 'italic ' : ''}700 ${drawing.textSize}px ${TEXT_DRAWING_FONT_STACK}`;
    const textWidth = measureTextDrawingWidth(priceText, labelFont);
    const padX = 9;
    const labelHeight = drawing.textSize + 13;
    const box: TextDrawingRect = {
      x: labelPoint.x - (textWidth + padX * 2) / 2,
      y: labelPoint.y - labelHeight / 2,
      w: textWidth + padX * 2,
      h: labelHeight,
    };
    model.lines.push({
      start: p0,
      end: nearestPointOnTextDrawingRect(box, p0),
      color: drawing.color,
      width: 1,
    });
    model.circles.push({ x: p0.x, y: p0.y, r: 3, fill: null, stroke: drawing.color, strokeWidth: 1.4 });
    model.boxes.push({ ...box, r: 5, fill: drawing.color, stroke: null });
    model.texts.push({
      lines: [priceText],
      x: box.x + box.w / 2,
      y: box.y + (box.h - drawing.textSize * TEXT_DRAWING_LINE_HEIGHT_RATIO) / 2,
      lineHeight: Math.round(drawing.textSize * TEXT_DRAWING_LINE_HEIGHT_RATIO),
      font: labelFont,
      color: '#ffffff',
      align: 'center',
      placeholder: false,
    });
    model.hitRects.push(box);
    model.hitSegments.push({ start: p0, end: labelPoint });
    model.selectionRect = box;
    return model;
  }

  if (drawing.kind === 'signpost') {
    const stemTop = { x: p0.x, y: p0.y - 44 };
    const block = measureTextDrawingBlock(textLines, font, drawing.textSize);
    const textRect: TextDrawingRect = {
      x: p0.x - block.width / 2 - 4,
      y: stemTop.y - block.height - 6,
      w: block.width + 8,
      h: block.height + 4,
    };
    model.lines.push({ start: p0, end: stemTop, color: drawing.color, width: 1 });
    model.circles.push({ x: p0.x, y: p0.y, r: 2.4, fill: drawing.color, stroke: null });
    model.texts.push({
      lines: textLines,
      x: p0.x,
      y: textRect.y + 2,
      lineHeight: block.lineHeight,
      font,
      color: hasText ? drawing.textColor : options.mutedTextColor,
      align: 'center',
      placeholder: !hasText,
    });
    model.hitRects.push(textRect);
    model.hitSegments.push({ start: p0, end: stemTop });
    model.selectionRect = textRect;
    model.editorRect = { x: textRect.x + 4, y: textRect.y + 2, w: Math.max(block.width, 110), h: block.height };
    model.editorTextIndex = model.texts.length - 1;
    return model;
  }

  if (drawing.kind === 'flag-mark') {
    const poleTop = { x: p0.x, y: p0.y - 20 };
    model.lines.push({ start: p0, end: poleTop, color: drawing.color, width: 1.6 });
    model.polygons.push({
      points: [
        { x: p0.x, y: poleTop.y },
        { x: p0.x + 14, y: poleTop.y + 4.5 },
        { x: p0.x, y: poleTop.y + 9 },
      ],
      fill: drawing.color,
      stroke: null,
    });
    const flagBox: TextDrawingRect = { x: p0.x - 3, y: poleTop.y - 2, w: 19, h: 24 };
    model.hitRects.push(flagBox);
    model.selectionRect = flagBox;
    return model;
  }

  if (drawing.kind === 'image') {
    const corner = p1 ?? { x: p0.x + 120, y: p0.y + 90 };
    const rect: TextDrawingRect = {
      x: Math.min(p0.x, corner.x),
      y: Math.min(p0.y, corner.y),
      w: Math.max(16, Math.abs(corner.x - p0.x)),
      h: Math.max(16, Math.abs(corner.y - p0.y)),
    };
    model.hitRects.push(rect);
    model.selectionRect = rect;
    return model;
  }

  if (drawing.kind === 'post' || drawing.kind === 'idea') {
    const isIdea = drawing.kind === 'idea';
    const title = isIdea
      ? hasText
        ? splitTextDrawingLines(rawText)[0]!
        : 'Idea'
      : drawing.contentMeta && drawing.contentMeta.length > 0
        ? drawing.contentMeta
        : 'Post';
    const subtitle = isIdea
      ? drawing.contentMeta ?? ''
      : (drawing.contentUrl ?? '').replace(/^https?:\/\//, '').slice(0, 42);
    const titleFont = `${drawing.textItalic ? 'italic ' : ''}700 ${drawing.textSize}px ${TEXT_DRAWING_FONT_STACK}`;
    const subtitleSize = Math.max(10, drawing.textSize - 3);
    const subtitleFont = `400 ${subtitleSize}px ${TEXT_DRAWING_FONT_STACK}`;
    const padX = 12;
    const padY = 9;
    const glyphWidth = 26;
    const titleLineHeight = Math.round(drawing.textSize * TEXT_DRAWING_LINE_HEIGHT_RATIO);
    const subtitleLineHeight = Math.round(subtitleSize * TEXT_DRAWING_LINE_HEIGHT_RATIO);
    const textWidth = Math.min(
      260,
      Math.max(measureTextDrawingWidth(title, titleFont), measureTextDrawingWidth(subtitle, subtitleFont), 64)
    );
    const card: TextDrawingRect = {
      x: p0.x,
      y: p0.y,
      w: glyphWidth + textWidth + padX * 2,
      h: titleLineHeight + (subtitle ? subtitleLineHeight : 0) + padY * 2,
    };
    model.boxes.push({ ...card, r: 8, fill: TEXT_DRAWING_CARD_BG, stroke: TEXT_DRAWING_CARD_BORDER, shadow: true });
    model.texts.push({
      lines: [isIdea ? '💡' : 'X'],
      x: card.x + padX,
      y: card.y + padY + (subtitle ? subtitleLineHeight / 2 : 0),
      lineHeight: titleLineHeight,
      font: `700 ${drawing.textSize + 2}px ${TEXT_DRAWING_FONT_STACK}`,
      color: '#0f1419',
      align: 'left',
      placeholder: false,
    });
    const titleIndex = model.texts.length;
    model.texts.push({
      lines: [title],
      x: card.x + padX + glyphWidth,
      y: card.y + padY,
      lineHeight: titleLineHeight,
      font: titleFont,
      color: isIdea && !hasText ? options.mutedTextColor : TEXT_DRAWING_CARD_TEXT,
      align: 'left',
      placeholder: isIdea && !hasText,
    });
    if (subtitle) {
      model.texts.push({
        lines: [subtitle],
        x: card.x + padX + glyphWidth,
        y: card.y + padY + titleLineHeight,
        lineHeight: subtitleLineHeight,
        font: subtitleFont,
        color: options.mutedTextColor,
        align: 'left',
        placeholder: false,
      });
    }
    model.hitRects.push(card);
    model.selectionRect = card;
    if (isIdea) {
      model.editorRect = {
        x: card.x + padX + glyphWidth,
        y: card.y + padY,
        w: Math.max(textWidth, 110),
        h: titleLineHeight,
      };
      model.editorTextIndex = titleIndex;
    }
    return model;
  }

  return model;
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

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isBinanceTickerOption = (value: unknown): value is BinanceTickerOption =>
  isObjectRecord(value) &&
  typeof value.symbol === 'string' &&
  typeof value.base === 'string' &&
  typeof value.quote === 'string' &&
  value.symbol.length > 0 &&
  value.base.length > 0 &&
  value.quote.length > 0;

const findSymbolQuote = (symbol: string) =>
  BINANCE_QUOTE_SUFFIXES.find((quote) => symbol.endsWith(quote) && symbol.length > quote.length);

const getGeneratedSymbolColor = (symbol: string) => {
  let hash = 0;

  for (const character of symbol) {
    hash = (hash * 31 + character.charCodeAt(0)) % 360;
  }

  return `hsl(${hash}, 68%, 48%)`;
};

const createFallbackSymbolSearchOption = (symbol: string): SymbolSearchOption => {
  const quote = findSymbolQuote(symbol);
  const base = quote ? symbol.slice(0, -quote.length) : symbol;

  return {
    symbol,
    base,
    quote: quote ?? '',
    name: quote ? `${base} / ${quote}` : symbol,
    exchange: 'Binance',
    tags: ['spot', 'crypto'],
    categories: ['spot'],
    color: getGeneratedSymbolColor(symbol),
  };
};

const normalizeBinanceSymbolOptions = (payload: unknown): SymbolSearchOption[] => {
  if (!isObjectRecord(payload) || !Array.isArray(payload.tickers)) {
    return [];
  }

  const curatedBySymbol = new Map(SYMBOL_SEARCH_OPTIONS.map((option) => [option.symbol, option]));
  const seenSymbols = new Set<string>();

  return payload.tickers.reduce<SymbolSearchOption[]>((options, ticker) => {
    if (!isBinanceTickerOption(ticker) || seenSymbols.has(ticker.symbol)) {
      return options;
    }

    seenSymbols.add(ticker.symbol);

    const curated = curatedBySymbol.get(ticker.symbol);
    if (curated) {
      options.push({ ...curated, base: ticker.base, quote: ticker.quote });
      return options;
    }

    options.push({
      symbol: ticker.symbol,
      base: ticker.base,
      quote: ticker.quote,
      name: `${ticker.base} / ${ticker.quote}`,
      exchange: 'Binance',
      tags: ['spot', 'crypto', ticker.quote.toLowerCase()],
      categories: ['spot'],
      color: getGeneratedSymbolColor(ticker.symbol),
    });

    return options;
  }, []);
};

const formatSymbol = (symbol: string, options: readonly SymbolSearchOption[] = SYMBOL_SEARCH_OPTIONS) => {
  const option = options.find((searchOption) => searchOption.symbol === symbol);

  if (option) {
    return `${option.base}/${option.quote}`;
  }

  const quote = findSymbolQuote(symbol);
  return quote ? `${symbol.slice(0, -quote.length)}/${quote}` : symbol;
};

const getSymbolSearchOption = (
  symbol: string,
  options: readonly SymbolSearchOption[] = SYMBOL_SEARCH_OPTIONS
) => options.find((option) => option.symbol === symbol) ?? createFallbackSymbolSearchOption(symbol);

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
  {
    ...createActiveIndicator('sma', 'default'),
    settings: { period: 20, source: 'close', color: '#f5c84b' },
  },
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


const getIndicatorLegendName = (indicator: ActiveIndicator, symbol: string) => {
  const definition = getIndicatorDefinition(indicator.definitionId);

  if (definition.formula === 'volume') return `Vol · ${formatSymbol(symbol).split('/')[0]}`;
  if (definition.formula === 'vwap') return 'VWAP Session';

  const suffix = getIndicatorLegendSuffix(definition, indicator.settings);
  return suffix ? `${definition.shortName} ${suffix}` : definition.shortName;
};

const formatIndicatorNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  if (Math.abs(value) >= 1000) return formatCompact(value);
  return value.toFixed(Math.abs(value) < 10 ? 2 : 2);
};

type IndicatorComputedLine = IndicatorComputedSeries['lines'][number];

const lastDrawableIndex = (computed: IndicatorComputedSeries, candleCount: number, viewEndIndex: number) => {
  const longestLine = computed.lines.reduce((max, line) => Math.max(max, line.values.length), candleCount);
  return Math.min(longestLine - 1, Math.ceil(viewEndIndex) - 1);
};

const drawIndicatorSeriesLine = (
  ctx: CanvasRenderingContext2D,
  line: IndicatorComputedLine,
  startIndex: number,
  endIndex: number,
  xForIndex: (index: number) => number,
  valueToY: (value: number) => number,
  defaultLineWidth: number
) => {
  const style = line.style ?? 'line';
  const lineWidth = line.lineWidth ?? defaultLineWidth;
  const firstIndex = Math.max(0, startIndex);
  const maxIndex = Math.min(endIndex, line.values.length - 1);

  if (style === 'dots' || style === 'cross') {
    for (let index = firstIndex; index <= maxIndex; index += 1) {
      const value = line.values[index];
      if (value === null || value === undefined || !Number.isFinite(value)) continue;

      const x = xForIndex(index);
      const y = valueToY(value);
      const pointColor = line.colors?.[index] ?? line.color;

      if (style === 'dots') {
        ctx.fillStyle = pointColor;
        ctx.beginPath();
        ctx.arc(x, y, 1.7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = pointColor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x - 3, y);
        ctx.lineTo(x + 3, y);
        ctx.moveTo(x, y - 3);
        ctx.lineTo(x, y + 3);
        ctx.stroke();
      }
    }
    return;
  }

  let pathColor: string | null = null;
  let pathPoints: Array<{ x: number; y: number }> = [];

  const flushPath = () => {
    if (pathColor !== null && pathPoints.length > 1) {
      ctx.strokeStyle = pathColor;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      pathPoints.forEach((point, pointIndex) => {
        if (pointIndex === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }
    pathColor = null;
    pathPoints = [];
  };

  for (let index = firstIndex; index <= maxIndex; index += 1) {
    const value = line.values[index];
    if (value === null || value === undefined || !Number.isFinite(value)) {
      if (!line.connectNulls) flushPath();
      continue;
    }

    const x = xForIndex(index);
    const y = valueToY(value);
    const pointColor = line.colors?.[index] ?? line.color;

    if (pathColor !== null && pointColor !== pathColor) {
      flushPath();
    }

    if (pathColor === null) {
      pathColor = pointColor;
      pathPoints.push({ x, y });
      continue;
    }

    if (style === 'step') {
      const previous = pathPoints[pathPoints.length - 1];
      if (previous && previous.y !== y) {
        pathPoints.push({ x, y: previous.y });
      }
    }
    pathPoints.push({ x, y });
  }

  flushPath();
};

const drawIndicatorFills = (
  ctx: CanvasRenderingContext2D,
  computed: IndicatorComputedSeries,
  startIndex: number,
  endIndex: number,
  xForIndex: (index: number) => number,
  valueToY: (value: number) => number
) => {
  computed.fills?.forEach((fill) => {
    const upperLine = computed.lines[fill.upper];
    const lowerLine = computed.lines[fill.lower];
    if (!upperLine || !lowerLine) return;

    const firstIndex = Math.max(0, startIndex);
    const maxIndex = Math.min(endIndex, upperLine.values.length - 1, lowerLine.values.length - 1);
    let runColor: string | null = null;
    let topPoints: Array<{ x: number; y: number }> = [];
    let bottomPoints: Array<{ x: number; y: number }> = [];

    const flushRun = () => {
      if (runColor !== null && topPoints.length > 1) {
        ctx.fillStyle = runColor;
        ctx.beginPath();
        topPoints.forEach((point, pointIndex) => {
          if (pointIndex === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        for (let pointIndex = bottomPoints.length - 1; pointIndex >= 0; pointIndex -= 1) {
          ctx.lineTo(bottomPoints[pointIndex].x, bottomPoints[pointIndex].y);
        }
        ctx.closePath();
        ctx.fill();
      }
      runColor = null;
      topPoints = [];
      bottomPoints = [];
    };

    for (let index = firstIndex; index <= maxIndex; index += 1) {
      const upperValue = upperLine.values[index];
      const lowerValue = lowerLine.values[index];
      if (
        upperValue === null ||
        upperValue === undefined ||
        lowerValue === null ||
        lowerValue === undefined ||
        !Number.isFinite(upperValue) ||
        !Number.isFinite(lowerValue)
      ) {
        flushRun();
        continue;
      }

      const color = fill.color ?? (upperValue >= lowerValue ? fill.upColor : fill.downColor);
      if (!color) {
        flushRun();
        continue;
      }

      const top = { x: xForIndex(index), y: valueToY(upperValue) };
      const bottom = { x: xForIndex(index), y: valueToY(lowerValue) };

      if (runColor !== null && color !== runColor) {
        topPoints.push(top);
        bottomPoints.push(bottom);
        flushRun();
      }

      if (runColor === null) runColor = color;
      topPoints.push(top);
      bottomPoints.push(bottom);
    }

    flushRun();
  });
};

const drawIndicatorMarkers = (
  ctx: CanvasRenderingContext2D,
  computed: IndicatorComputedSeries,
  startIndex: number,
  endIndex: number,
  xForIndex: (index: number) => number,
  priceToY: (price: number) => number,
  fontSize: number
) => {
  computed.markers?.forEach((marker) => {
    if (marker.index < startIndex || marker.index > endIndex) return;

    const x = xForIndex(marker.index);
    const baseY = priceToY(marker.price);
    ctx.fillStyle = marker.color;

    if (marker.shape === 'triangleUp' || marker.shape === 'triangleDown') {
      const y = marker.position === 'above' ? baseY - 9 : baseY + 9;
      ctx.beginPath();
      if (marker.shape === 'triangleUp') {
        ctx.moveTo(x, y - 3.5);
        ctx.lineTo(x - 4, y + 3.5);
        ctx.lineTo(x + 4, y + 3.5);
      } else {
        ctx.moveTo(x, y + 3.5);
        ctx.lineTo(x - 4, y - 3.5);
        ctx.lineTo(x + 4, y - 3.5);
      }
      ctx.closePath();
      ctx.fill();
      return;
    }

    if (marker.shape === 'cross') {
      ctx.strokeStyle = marker.color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - 4, baseY);
      ctx.lineTo(x + 4, baseY);
      ctx.moveTo(x, baseY - 4);
      ctx.lineTo(x, baseY + 4);
      ctx.stroke();
      return;
    }

    const text = marker.text ?? formatPrice(marker.price);
    ctx.font = getCanvasFont(Math.max(11, fontSize - 3));
    ctx.textAlign = 'center';
    ctx.fillText(text, x, marker.position === 'above' ? baseY - 7 : baseY + 15);
  });
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
  favoriteIndicatorIds: string[];
  onToggleFavorite: (definitionId: string) => void;
}

type IndicatorPickerCategory = 'Favorites' | 'Technicals' | 'Fundamentals';

function IndicatorsDropdown({
  count,
  openMenu,
  setOpenMenu,
  activeIndicators,
  onAddIndicator,
  favoriteIndicatorIds,
  onToggleFavorite,
}: IndicatorsDropdownProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<IndicatorPickerCategory>('Technicals');
  const isOpen = openMenu === 'indicators';
  const favoriteIdSet = useMemo(() => new Set(favoriteIndicatorIds), [favoriteIndicatorIds]);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const options = INDICATOR_DEFINITIONS.filter((definition) => {
    const matchesCategory =
      category === 'Favorites'
        ? favoriteIdSet.has(definition.id)
        : category === 'Fundamentals'
          ? definition.category === 'Fundamental'
          : definition.category !== 'Fundamental';
    const matchesSearch =
      normalizedQuery.length === 0 ||
      definition.name.toLowerCase().includes(normalizedQuery) ||
      definition.shortName.toLowerCase().includes(normalizedQuery) ||
      definition.description.toLowerCase().includes(normalizedQuery);

    return matchesCategory && matchesSearch;
  });

  // Fundamentals stay grouped by statement; other categories are alphabetical like TradingView.
  if (category !== 'Fundamentals') {
    options.sort((a, b) => a.name.localeCompare(b.name));
  }

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
              <button
                type="button"
                className="indicator-category-button"
                data-active={category === 'Favorites'}
                onClick={() => setCategory('Favorites')}
              >
                <svg className="category-glyph" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10 2.1l2.39 4.84 5.34.78-3.86 3.77.91 5.32L10 14.3l-4.78 2.51.91-5.32-3.86-3.77 5.34-.78L10 2.1z" />
                </svg>
                Favorites
              </button>
              <button type="button" disabled>
                My scripts
              </button>
              <span>Built-in</span>
              <button
                type="button"
                className="indicator-category-button"
                data-active={category === 'Technicals'}
                onClick={() => setCategory('Technicals')}
              >
                Technicals
              </button>
              <button
                type="button"
                className="indicator-category-button"
                data-active={category === 'Fundamentals'}
                onClick={() => setCategory('Fundamentals')}
              >
                Fundamentals
              </button>
            </div>

            <div className="indicator-results" role="menu" aria-label={`${category} indicators`}>
              <div className="indicator-tabs" aria-hidden="true">
                <span data-active="true">Indicators</span>
                <span>Strategies</span>
                <span>Profiles</span>
                <span>Patterns</span>
              </div>
              <span className="indicator-results-label">Script name</span>
              {category === 'Favorites' && options.length === 0 && (
                <div className="indicator-favorites-empty">
                  <svg viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M10 2.1l2.39 4.84 5.34.78-3.86 3.77.91 5.32L10 14.3l-4.78 2.51.91-5.32-3.86-3.77 5.34-.78L10 2.1z" />
                  </svg>
                  <strong>{normalizedQuery.length === 0 ? 'You have no favorites yet' : 'No favorites match your search'}</strong>
                  <small>Click the star next to any indicator to add it to your favorites.</small>
                </div>
              )}
              {options.map((option, index) => {
                const active = activeIndicators.some((indicator) => indicator.definitionId === option.id);
                const favorited = favoriteIdSet.has(option.id);
                const groupLabel =
                  category === 'Fundamentals' &&
                  (index === 0 || options[index - 1].description !== option.description)
                    ? option.description
                    : null;

                return (
                  <Fragment key={option.id}>
                    {groupLabel && <span className="indicator-results-label indicator-group-label">{groupLabel}</span>}
                    <div className="indicator-row" data-favorited={favorited}>
                      <button
                        type="button"
                        className="indicator-fav-toggle"
                        aria-label={
                          favorited
                            ? `Remove ${option.name} from favorites`
                            : `Add ${option.name} to favorites`
                        }
                        aria-pressed={favorited}
                        title={favorited ? 'Remove from favorites' : 'Add to favorites'}
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleFavorite(option.id);
                        }}
                      >
                        <svg viewBox="0 0 20 20" aria-hidden="true">
                          <path d="M10 2.1l2.39 4.84 5.34.78-3.86 3.77.91 5.32L10 14.3l-4.78 2.51.91-5.32-3.86-3.77 5.34-.78L10 2.1z" />
                        </svg>
                      </button>
                      <button
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
                    </div>
                  </Fragment>
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
  const freehandDrawingRef = useRef<FreehandDrawingState | null>(null);
  const drawingToolbarDragRef = useRef<DrawingToolbarDragState | null>(null);
  const drawingsRef = useRef<ChartDrawing[]>([]);
  const selectedDrawingIdRef = useRef<string | null>(null);
  const pendingDrawingRef = useRef<PendingDrawing | null>(null);
  const drawingTextEditorRef = useRef<DrawingTextEditorState | null>(null);
  const drawingTextEditorInputRef = useRef<HTMLTextAreaElement | null>(null);
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
  const [favoriteIndicatorIds, setFavoriteIndicatorIds] = useState<string[]>([]);
  const [valuesTooltipOnLongPress, setValuesTooltipOnLongPress] = useState(true);
  const [lastDrawingTool, setLastDrawingTool] = useState<DrawingToolId>('trend-line');
  const [lastFibTool, setLastFibTool] = useState<DrawingToolId>('fib-retracement');
  const [lastPatternTool, setLastPatternTool] = useState<DrawingToolId>('xabcd-pattern');
  const [lastForecastTool, setLastForecastTool] = useState<DrawingToolId>('long-position');
  const [lastShapeTool, setLastShapeTool] = useState<DrawingToolId>('brush');
  const [lastTextTool, setLastTextTool] = useState<DrawingToolId>('text');
  const [drawingTextEditor, setDrawingTextEditor] = useState<DrawingTextEditorState | null>(null);
  const [contentToolDialog, setContentToolDialog] = useState<ContentToolDialogState | null>(null);
  const [contentToolDialogValue, setContentToolDialogValue] = useState('');
  const [contentToolDialogError, setContentToolDialogError] = useState('');
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
  const [symbolSearchOptions, setSymbolSearchOptions] = useState<SymbolSearchOption[]>(SYMBOL_SEARCH_OPTIONS);
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
  const selectedSymbolOption = getSymbolSearchOption(activeSymbol, symbolSearchOptions);
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
  pendingDrawingRef.current = pendingDrawing;
  selectedDrawingIdRef.current = selectedDrawingId;
  drawingTextEditorRef.current = drawingTextEditor;
  activePaneIndexRef.current = activePaneIndex;
  const filteredSymbolOptions = useMemo(() => {
    return symbolSearchOptions.filter((option) =>
      matchesSymbolSearch(option, symbolSearchCategory, symbolSearchQuery)
    );
  }, [symbolSearchCategory, symbolSearchOptions, symbolSearchQuery]);
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
    let cancelled = false;

    const loadBinanceTickers = async () => {
      try {
        const response = await fetch(BINANCE_TICKERS_ENDPOINT);

        if (!response.ok) {
          throw new Error('Binance ticker list unavailable.');
        }

        const data = await response.json();
        const nextOptions = normalizeBinanceSymbolOptions(data);

        if (!cancelled && nextOptions.length > 0) {
          setSymbolSearchOptions(nextOptions);
        }
      } catch {
        if (!cancelled) {
          setSymbolSearchOptions(SYMBOL_SEARCH_OPTIONS);
        }
      }
    };

    void loadBinanceTickers();

    return () => {
      cancelled = true;
    };
  }, []);

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

      const rawIndicatorFavorites = window.localStorage.getItem(INDICATOR_FAVORITES_STORAGE_KEY);
      if (rawIndicatorFavorites) {
        const parsedIndicatorFavorites = JSON.parse(rawIndicatorFavorites) as string[];
        if (Array.isArray(parsedIndicatorFavorites)) {
          setFavoriteIndicatorIds(
            parsedIndicatorFavorites.filter(
              (id) => typeof id === 'string' && INDICATOR_DEFINITIONS.some((definition) => definition.id === id)
            )
          );
        }
      }
    } catch {
      setFavoriteCursorTools({});
    }
  }, []);

  const toggleIndicatorFavorite = (definitionId: string) => {
    setFavoriteIndicatorIds((current) => {
      const next = current.includes(definitionId)
        ? current.filter((id) => id !== definitionId)
        : [...current, definitionId];
      try {
        window.localStorage.setItem(INDICATOR_FAVORITES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable
      }
      return next;
    });
  };

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
        const pendingEscapedDrawing = pendingDrawingRef.current;
        if (
          pendingEscapedDrawing &&
          (pendingEscapedDrawing.tool === 'ghost-feed' ||
            isVariableAnchorShapeDrawingTool(pendingEscapedDrawing.tool)) &&
          pendingEscapedDrawing.anchors.length >= 2
        ) {
          addCompletedDrawing(
            createChartDrawing(
              pendingEscapedDrawing.paneIndex,
              pendingEscapedDrawing.tool,
              pendingEscapedDrawing.anchors
            )
          );
        }
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
        closeDrawingTextEditor();
        setContentToolDialog(null);
        freehandDrawingRef.current = null;
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
        freehandDrawingRef.current = null;
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
        freehandDrawingRef.current = null;
        drawingDragRef.current = createDrawingDragState(activePaneIndexRef.current);
        setSelectedDrawingId(null);
        if (isFibDrawingTool(drawingShortcutTool)) {
          setLastFibTool(drawingShortcutTool);
        } else if (isPatternDrawingTool(drawingShortcutTool)) {
          setLastPatternTool(drawingShortcutTool);
        } else if (isForecastDrawingTool(drawingShortcutTool)) {
          setLastForecastTool(drawingShortcutTool);
        } else if (isShapeDrawingTool(drawingShortcutTool)) {
          setLastShapeTool(drawingShortcutTool);
        } else if (isTextDrawingTool(drawingShortcutTool)) {
          setLastTextTool(drawingShortcutTool);
        } else {
          setLastDrawingTool(drawingShortcutTool);
        }
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

  const getTextDrawingModelForHitTest = (drawing: ChartDrawing, points: Array<{ x: number; y: number }>) =>
    getTextDrawingRenderModel(drawing, points, {
      mutedTextColor: '#9598a1',
      popupVisible:
        selectedDrawingIdRef.current === drawing.id || drawingTextEditorRef.current?.drawingId === drawing.id,
    });

  const hitTestTextDrawingAt = (
    drawing: ChartDrawing,
    points: Array<{ x: number; y: number }>,
    x: number,
    y: number,
    tolerance: number
  ): boolean => {
    const model = getTextDrawingModelForHitTest(drawing, points);
    if (
      model.hitRects.some(
        (rect) =>
          x >= rect.x - tolerance && x <= rect.x + rect.w + tolerance && y >= rect.y - tolerance && y <= rect.y + rect.h + tolerance
      )
    ) {
      return true;
    }
    return model.hitSegments.some((segment) => getDistanceToSegment(x, y, segment.start, segment.end) <= tolerance);
  };

  const getTableCellAtPoint = (
    drawing: ChartDrawing,
    paneIndex: number,
    x: number,
    y: number
  ): { row: number; col: number } | null => {
    if (drawing.kind !== 'table') return null;

    const points = drawing.anchors
      .map((anchor) => getDrawingPointForAnchor(paneIndex, anchor))
      .filter((point): point is { x: number; y: number } => point !== null);
    const model = getTextDrawingModelForHitTest(drawing, points);
    if (!model.tableCellRects) return null;

    for (let row = 0; row < model.tableCellRects.length; row += 1) {
      const rowRects = model.tableCellRects[row]!;
      for (let col = 0; col < rowRects.length; col += 1) {
        const rect = rowRects[col]!;
        if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
          return { row, col };
        }
      }
    }
    return null;
  };

  const hitTestForecastDrawingAt = (
    drawing: ChartDrawing,
    points: Array<{ x: number; y: number }>,
    paneIndex: number,
    x: number,
    y: number
  ): boolean => {
    const tolerance = DRAWING_HIT_TOLERANCE;

    if (isPositionDrawingTool(drawing.kind)) {
      const [entry, entryEnd, target, stop] = points;
      if (!entry || !entryEnd || !target || !stop) return false;

      const left = Math.min(entry.x, entryEnd.x);
      const right = Math.max(entry.x, entryEnd.x);
      const top = Math.min(target.y, stop.y);
      const bottom = Math.max(target.y, stop.y);
      return x >= left - tolerance && x <= right + tolerance && y >= top - tolerance && y <= bottom + tolerance;
    }

    if (drawing.kind === 'forecast') {
      const [start, end] = points;
      if (!start || !end) return false;

      const curve = sampleForecastCurve(start, end);
      for (let index = 0; index < curve.length - 1; index += 1) {
        if (getDistanceToSegment(x, y, curve[index]!, curve[index + 1]!) <= tolerance) return true;
      }
      return false;
    }

    if (drawing.kind === 'bars-pattern') {
      const [start, end] = points;
      if (!start || !end) return false;

      const bars = drawing.patternBars ?? [];
      const leftAnchorIndex = drawing.anchors[0]!.logicalIndex <= drawing.anchors[1]!.logicalIndex ? 0 : 1;
      const baseAnchor = drawing.anchors[leftAnchorIndex]!;
      let minPrice = baseAnchor.price;
      let maxPrice = baseAnchor.price;
      bars.forEach((bar) => {
        minPrice = Math.min(minPrice, baseAnchor.price + bar.low);
        maxPrice = Math.max(maxPrice, baseAnchor.price + bar.high);
      });
      const topPoint = getDrawingPointForAnchor(paneIndex, { logicalIndex: baseAnchor.logicalIndex, price: maxPrice });
      const bottomPoint = getDrawingPointForAnchor(paneIndex, { logicalIndex: baseAnchor.logicalIndex, price: minPrice });
      if (!topPoint || !bottomPoint) return false;

      const left = Math.min(start.x, end.x);
      const right = Math.max(start.x, end.x);
      return x >= left - tolerance && x <= right + tolerance && y >= topPoint.y - tolerance && y <= bottomPoint.y + tolerance;
    }

    if (drawing.kind === 'ghost-feed') {
      for (let index = 0; index < points.length - 1; index += 1) {
        if (getDistanceToSegment(x, y, points[index]!, points[index + 1]!) <= tolerance * 2) return true;
      }
      return false;
    }

    if (drawing.kind === 'projection') {
      const [apex, first, second] = points;
      if (!apex || !first || !second) return false;

      const polygon = buildProjectionSectorPolygon(apex, first, second);
      if (isPointInPolygon(x, y, polygon)) return true;
      for (let index = 0; index < polygon.length - 1; index += 1) {
        if (getDistanceToSegment(x, y, polygon[index]!, polygon[index + 1]!) <= tolerance) return true;
      }
      return false;
    }

    if (drawing.kind === 'anchored-vwap') {
      const anchor = drawing.anchors[0];
      const paneCandles = paneStatesRef.current[paneIndex]?.candles;
      if (!anchor || !paneCandles || paneCandles.length === 0) return false;

      const series = computeAnchoredVwap(paneCandles, anchor.logicalIndex);
      const stride = Math.max(1, Math.floor(series.length / 400));
      let previous: { x: number; y: number } | null = null;
      for (let index = 0; index < series.length; index += stride) {
        const sample = series[index]!;
        const point = getDrawingPointForAnchor(paneIndex, { logicalIndex: sample.logicalIndex, price: sample.value });
        if (!point) continue;
        if (previous && getDistanceToSegment(x, y, previous, point) <= tolerance) return true;
        previous = point;
      }
      return false;
    }

    if (drawing.kind === 'fixed-volume-profile' || drawing.kind === 'anchored-volume-profile') {
      const anchor = drawing.anchors[0];
      const paneCandles = paneStatesRef.current[paneIndex]?.candles;
      if (!anchor || !paneCandles || paneCandles.length === 0 || points.length === 0) return false;

      const anchoredToEnd = drawing.kind === 'anchored-volume-profile';
      const secondAnchor = drawing.anchors[1];
      const toIndex = anchoredToEnd ? paneCandles.length - 1 : secondAnchor?.logicalIndex;
      if (toIndex === undefined) return false;

      const profile = computeVolumeProfile(paneCandles, anchor.logicalIndex, toIndex);
      if (!profile) return false;

      const endPoint = anchoredToEnd
        ? getDrawingPointForAnchor(paneIndex, { logicalIndex: paneCandles.length - 1, price: anchor.price })
        : points[1];
      if (!endPoint) return false;

      const topPoint = getDrawingPointForAnchor(paneIndex, { logicalIndex: anchor.logicalIndex, price: profile.maxPrice });
      const bottomPoint = getDrawingPointForAnchor(paneIndex, { logicalIndex: anchor.logicalIndex, price: profile.minPrice });
      if (!topPoint || !bottomPoint) return false;

      const left = Math.min(points[0]!.x, endPoint.x);
      const right = Math.max(points[0]!.x, endPoint.x);
      return x >= left - tolerance && x <= right + tolerance && y >= topPoint.y - tolerance && y <= bottomPoint.y + tolerance;
    }

    if (drawing.kind === 'price-range' || drawing.kind === 'date-range' || drawing.kind === 'date-price-range') {
      const [start, end] = points;
      if (!start || !end) return false;

      const left = Math.min(start.x, end.x);
      const right = Math.max(start.x, end.x);
      const top = Math.min(start.y, end.y);
      const bottom = Math.max(start.y, end.y);
      return x >= left - tolerance && x <= right + tolerance && y >= top - tolerance && y <= bottom + tolerance;
    }

    return false;
  };

  const getDrawingHitResult = (paneIndex: number, x: number, y: number): DrawingHitResult | null => {
    const { chartArea } = chartBoundsRefs.current[paneIndex] ?? createDefaultChartBounds();
    if (chartArea.width <= 0 || chartArea.height <= 0) return null;

    const selectedDrawing = drawingsRef.current.find(
      (drawing) => drawing.id === selectedDrawingIdRef.current && drawing.paneIndex === paneIndex
    );
    if (selectedDrawing) {
      const selectedPoints = selectedDrawing.anchors
        .map((anchor) => getDrawingPointForAnchor(paneIndex, anchor))
        .filter((point): point is { x: number; y: number } => point !== null);
      for (let anchorIndex = 0; anchorIndex < selectedPoints.length; anchorIndex += 1) {
        const point = selectedPoints[anchorIndex]!;
        const target = getDrawingHitTargetForAnchorIndex(anchorIndex);
        if (target && Math.hypot(x - point.x, y - point.y) <= DRAWING_HIT_TOLERANCE) {
          return { drawing: selectedDrawing, target };
        }
      }
    }

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

      if (isForecastDrawingTool(drawing.kind)) {
        if (hitTestForecastDrawingAt(drawing, points, paneIndex, x, y)) {
          return { drawing, target: 'body' };
        }
        continue;
      }

      if (isShapeDrawingTool(drawing.kind)) {
        if (hitTestShapeDrawingAt(drawing, points, x, y, DRAWING_HIT_TOLERANCE)) {
          return { drawing, target: 'body' };
        }
        continue;
      }

      if (isTextDrawingTool(drawing.kind)) {
        if (hitTestTextDrawingAt(drawing, points, x, y, DRAWING_HIT_TOLERANCE)) {
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
    setDrawingTextEditor(null);
    freehandDrawingRef.current = null;
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
    freehandDrawingRef.current = null;
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
    freehandDrawingRef.current = null;
    drawingDragRef.current = createDrawingDragState(activePaneIndex);
    setSelectedDrawingId(null);
    if (isFibDrawingTool(tool)) {
      setLastFibTool(tool);
    } else if (isPatternDrawingTool(tool)) {
      setLastPatternTool(tool);
    } else if (isForecastDrawingTool(tool)) {
      setLastForecastTool(tool);
    } else if (isShapeDrawingTool(tool)) {
      setLastShapeTool(tool);
    } else if (isTextDrawingTool(tool)) {
      setLastTextTool(tool);
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

  const getDefaultTextToolTextColor = (kind: DrawingToolId) => {
    if (kind === 'text') return '#2962ff';
    // Pin's popup is a light card in both themes, so its text stays dark.
    if (kind === 'note' || kind === 'table' || kind === 'pin') return TEXT_DRAWING_CARD_TEXT;
    if (kind === 'signpost') return theme === 'dark' ? '#d1d4dc' : '#131722';
    return '#ffffff';
  };

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
      color: getDefaultDrawingColor(kind),
      opacity: getDefaultDrawingOpacity(kind),
      lineWidth: getDefaultDrawingLineWidth(kind),
      lineStyle: DRAWING_DEFAULT_LINE_STYLE,
      extend: 'none',
      leftEnd: getDefaultDrawingLeftEnd(kind),
      rightEnd: getDefaultDrawingRightEnd(kind),
      text: '',
      showText: isTextDrawingTool(kind),
      textColor: isTextDrawingTool(kind) ? getDefaultTextToolTextColor(kind) : DRAWING_DEFAULT_TEXT_COLOR,
      textSize: isTextDrawingTool(kind) ? 14 : 12,
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
      seed: kind === 'ghost-feed' ? Math.floor(Math.random() * 0xffffffff) : undefined,
      tableRows: kind === 'table' ? TEXT_TABLE_DEFAULT_ROWS : undefined,
      tableCols: kind === 'table' ? TEXT_TABLE_DEFAULT_COLS : undefined,
      tableCells: kind === 'table' ? createDefaultTableCells(TEXT_TABLE_DEFAULT_ROWS, TEXT_TABLE_DEFAULT_COLS) : undefined,
      createdAt: now,
      updatedAt: now,
    };
  };
  const addCompletedDrawing = (drawing: ChartDrawing) => {
    setDrawings((current) => [...current, drawing]);
    setSelectedDrawingId(drawing.id);
    setPendingDrawing(null);
    freehandDrawingRef.current = null;
    setActiveDrawingTool(null);
    setActiveDrawingMenu(null);
    setActiveDrawingToolbarMenu(null);
    setDrawingToolbarStatus('');
  };
  const closeDrawingTextEditor = (commit = true) => {
    const editor = drawingTextEditorRef.current;
    if (!editor) return;

    if (commit) {
      const drawing = drawingsRef.current.find((current) => current.id === editor.drawingId);
      // TradingView discards a Text drawing committed with no content.
      if (drawing && drawing.kind === 'text' && drawing.text.trim().length === 0) {
        setDrawings((current) => current.filter((item) => item.id !== editor.drawingId));
        setSelectedDrawingId((current) => (current === editor.drawingId ? null : current));
      }
    }
    setDrawingTextEditor(null);
  };
  const updateDrawingTextEditorValue = (value: string) => {
    const editor = drawingTextEditorRef.current;
    if (!editor) return;

    setDrawings((current) =>
      current.map((drawing) => {
        if (drawing.id !== editor.drawingId) return drawing;

        if (drawing.kind === 'table' && editor.cellRow !== undefined && editor.cellCol !== undefined) {
          const rows = clamp(drawing.tableRows ?? TEXT_TABLE_DEFAULT_ROWS, 1, TEXT_TABLE_MAX_ROWS);
          const cols = clamp(drawing.tableCols ?? TEXT_TABLE_DEFAULT_COLS, 1, TEXT_TABLE_MAX_COLS);
          const cells = resizeTableCells(drawing.tableCells, rows, cols);
          if (cells[editor.cellRow]) cells[editor.cellRow]![editor.cellCol] = value.slice(0, 200);
          return { ...drawing, tableCells: cells, updatedAt: Date.now() };
        }

        return { ...drawing, text: value.slice(0, 500), showText: true, updatedAt: Date.now() };
      })
    );
  };
  const closeContentToolDialog = () => {
    setContentToolDialog(null);
    setContentToolDialogValue('');
    setContentToolDialogError('');
  };
  const placeContentDrawing = (
    request: ContentToolDialogState,
    updates: Partial<ChartDrawing>,
    secondPoint?: { x: number; y: number }
  ) => {
    const anchors: ChartDrawingAnchor[] = [request.anchor];
    if (secondPoint) {
      const second = getDrawingAnchorAtPoint(request.paneIndex, secondPoint.x, secondPoint.y);
      anchors.push(second ?? { logicalIndex: request.anchor.logicalIndex + 10, price: request.anchor.price });
    }
    addCompletedDrawing({ ...createChartDrawing(request.paneIndex, request.kind, anchors), ...updates });
    closeContentToolDialog();
  };
  const submitContentToolDialog = () => {
    const request = contentToolDialog;
    if (!request) return;

    const value = contentToolDialogValue.trim();
    if (request.kind === 'post') {
      if (!/^https?:\/\/(www\.)?(x\.com|twitter\.com)\/\S+$/i.test(value)) {
        setContentToolDialogError('Enter a link to an X post, e.g. https://x.com/user/status/123');
        return;
      }
      const handleMatch = value.match(/(?:x\.com|twitter\.com)\/(@?[A-Za-z0-9_]+)/i);
      placeContentDrawing(request, {
        contentUrl: value.slice(0, 300),
        contentMeta: handleMatch ? `@${handleMatch[1]!.replace(/^@/, '')}` : 'Post',
      });
      return;
    }
    if (request.kind === 'idea') {
      if (value.length === 0) {
        setContentToolDialogError('Give your idea a title');
        return;
      }
      const pane = paneStatesRef.current[request.paneIndex];
      placeContentDrawing(request, {
        text: value.slice(0, 120),
        contentMeta: pane ? `${formatSymbol(pane.symbol, symbolSearchOptions)} · ${pane.timeframe}` : '',
      });
    }
  };
  const handleContentImageFile = (file: File | null) => {
    const request = contentToolDialog;
    if (!request || !file) return;
    if (!file.type.startsWith('image/')) {
      setContentToolDialogError('Choose an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : null;
      if (!src) {
        setContentToolDialogError('Could not read that file');
        return;
      }
      const image = document.createElement('img');
      image.onload = () => {
        const naturalWidth = image.naturalWidth;
        const naturalHeight = image.naturalHeight;
        if (!naturalWidth || !naturalHeight) {
          setContentToolDialogError('Could not read that image');
          return;
        }
        let finalSrc = src;
        const maxDimension = Math.max(naturalWidth, naturalHeight);
        if (maxDimension > CONTENT_IMAGE_MAX_DIMENSION || src.length > CONTENT_IMAGE_MAX_DATA_URL_LENGTH) {
          const scale = Math.min(1, CONTENT_IMAGE_MAX_DIMENSION / maxDimension);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(naturalHeight * scale));
          const context = canvas.getContext('2d');
          if (context) {
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            finalSrc = canvas.toDataURL('image/png');
            if (finalSrc.length > CONTENT_IMAGE_MAX_DATA_URL_LENGTH) {
              finalSrc = canvas.toDataURL('image/jpeg', 0.82);
            }
          }
        }
        if (finalSrc.length > CONTENT_IMAGE_MAX_DATA_URL_LENGTH) {
          setContentToolDialogError('That image is too large — try one under 2 MB');
          return;
        }
        const displayWidth = Math.min(CONTENT_IMAGE_MAX_PLACED_WIDTH, naturalWidth);
        const displayHeight = (displayWidth * naturalHeight) / naturalWidth;
        placeContentDrawing(request, { imageSrc: finalSrc }, { x: request.x + displayWidth, y: request.y + displayHeight });
      };
      image.onerror = () => setContentToolDialogError('Could not read that image');
      image.src = src;
    };
    reader.onerror = () => setContentToolDialogError('Could not read that file');
    reader.readAsDataURL(file);
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

  const createTextToolAnchors = (
    paneIndex: number,
    kind: DrawingToolId,
    anchor: ChartDrawingAnchor
  ): ChartDrawingAnchor[] => {
    if (!isAutoLabelTextDrawingTool(kind)) return [anchor];

    const pane = paneStatesRef.current[paneIndex];
    const priceRange = getCurrentPriceRange(paneIndex);
    const barsOffset = Math.max(2, (pane?.viewRange.candlesPerView ?? 60) * 0.05);
    const priceSpan = priceRange ? priceRange.maxPrice - priceRange.minPrice : Math.abs(anchor.price) * 0.02;

    if (kind === 'note') {
      return [anchor, { logicalIndex: anchor.logicalIndex + barsOffset, price: anchor.price }];
    }

    // Price label floats up and to the right of its anchor, like TradingView.
    return [anchor, { logicalIndex: anchor.logicalIndex + barsOffset, price: anchor.price + priceSpan * 0.06 }];
  };

  const handleMouseDown = (paneIndex: number, event: React.MouseEvent<HTMLCanvasElement>) => {
    const pane = paneStatesRef.current[paneIndex];
    setActivePaneIndex(paneIndex);
    if (!pane?.candles.length) return;

    if (drawingTextEditorRef.current) {
      closeDrawingTextEditor();
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const area = getPointerArea(paneIndex, x, y);

    if (area === 'outside') return;

    if (area === 'plot' && isAuthenticated && activeDrawingTool) {
      const anchor = getDrawingAnchorAtPoint(paneIndex, x, y);
      if (!anchor) return;

      if (isContentDrawingTool(activeDrawingTool)) {
        // Content tools collect their payload in a dialog before anything lands on the chart.
        setContentToolDialog({ kind: activeDrawingTool, paneIndex, anchor, x, y });
        setContentToolDialogValue('');
        setContentToolDialogError('');
        setActiveDrawingTool(null);
        setSelectedDrawingId(null);
        setActiveDrawingToolbarMenu(null);
        setDrawingToolbarStatus('');
        event.preventDefault();
        return;
      }

      if (isFreehandDrawingTool(activeDrawingTool)) {
        freehandDrawingRef.current = {
          tool: activeDrawingTool,
          paneIndex,
          anchors: [anchor],
          lastPoint: { x, y },
        };
        setPendingDrawing({ tool: activeDrawingTool, paneIndex, anchors: [anchor], preview: anchor });
        setSelectedDrawingId(null);
        setActiveDrawingToolbarMenu(null);
        setDrawingToolbarStatus('');
      } else if (isPositionDrawingTool(activeDrawingTool)) {
        const currentPriceRange = getCurrentPriceRange(paneIndex);
        const visiblePriceSpan = currentPriceRange
          ? currentPriceRange.maxPrice - currentPriceRange.minPrice
          : Math.abs(anchor.price) * 0.02;
        addCompletedDrawing(
          createChartDrawing(
            paneIndex,
            activeDrawingTool,
            createPositionDrawingAnchors(activeDrawingTool, anchor, pane.viewRange.candlesPerView, visiblePriceSpan)
          )
        );
      } else if (activeDrawingTool === 'ghost-feed' || isVariableAnchorShapeDrawingTool(activeDrawingTool)) {
        if (pendingDrawing?.tool === activeDrawingTool && pendingDrawing.paneIndex === paneIndex) {
          // Polyline closes (and fills) when the user clicks back on the first point.
          if (activeDrawingTool === 'polyline' && pendingDrawing.anchors.length >= 3) {
            const firstAnchor = pendingDrawing.anchors[0]!;
            const firstPoint = getDrawingPointForAnchor(paneIndex, firstAnchor);
            if (firstPoint && Math.hypot(x - firstPoint.x, y - firstPoint.y) <= DRAWING_HIT_TOLERANCE) {
              addCompletedDrawing(
                createChartDrawing(paneIndex, activeDrawingTool, [...pendingDrawing.anchors, { ...firstAnchor }])
              );
              event.preventDefault();
              return;
            }
          }
          const nextAnchors = [...pendingDrawing.anchors, anchor];
          if (
            (event.detail >= 2 && nextAnchors.length >= 2) ||
            nextAnchors.length >= getMaxDrawingAnchorCount(activeDrawingTool)
          ) {
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
      } else if (isMultiAnchorDrawingTool(activeDrawingTool)) {
        const requiredAnchorCount = getRequiredDrawingAnchorCount(activeDrawingTool);
        if (pendingDrawing?.tool === activeDrawingTool && pendingDrawing.paneIndex === paneIndex) {
          const nextAnchors = [...pendingDrawing.anchors, anchor];
          if (nextAnchors.length >= requiredAnchorCount) {
            // Curve tools finish on the second click; their bend anchors are derived
            // from the default bow so they can be dragged afterwards (TradingView behavior).
            if (isAutoControlCurveDrawingTool(activeDrawingTool) && nextAnchors.length === 2) {
              const startPoint = getDrawingPointForAnchor(paneIndex, nextAnchors[0]!);
              const endPoint = getDrawingPointForAnchor(paneIndex, nextAnchors[1]!);
              if (startPoint && endPoint) {
                getDefaultShapeCurveControls(activeDrawingTool, startPoint, endPoint).forEach((controlPoint) => {
                  const controlAnchor = getDrawingAnchorAtPoint(paneIndex, controlPoint.x, controlPoint.y);
                  if (controlAnchor) nextAnchors.push(controlAnchor);
                });
              }
            }
            const completedDrawing = createChartDrawing(paneIndex, activeDrawingTool, nextAnchors);
            if (activeDrawingTool === 'bars-pattern') {
              completedDrawing.patternBars = captureBarsPatternData(pane.candles, nextAnchors);
            }
            addCompletedDrawing(completedDrawing);
            if (isInlineEditTextDrawingTool(activeDrawingTool)) {
              setDrawingTextEditor({ drawingId: completedDrawing.id, paneIndex });
            }
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
        const completedDrawing = createChartDrawing(
          paneIndex,
          activeDrawingTool,
          createTextToolAnchors(paneIndex, activeDrawingTool, anchor)
        );
        addCompletedDrawing(completedDrawing);
        if (isInlineEditTextDrawingTool(activeDrawingTool)) {
          setDrawingTextEditor({ drawingId: completedDrawing.id, paneIndex });
        }
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

        if (event.detail >= 2 && hasInlineTextEditor(drawingHit.drawing.kind) && !drawingHit.drawing.locked) {
          const cell = getTableCellAtPoint(drawingHit.drawing, paneIndex, x, y);
          if (drawingHit.drawing.kind !== 'table' || cell) {
            setDrawingTextEditor({
              drawingId: drawingHit.drawing.id,
              paneIndex,
              ...(cell ? { cellRow: cell.row, cellCol: cell.col } : {}),
            });
            drawingDragRef.current = createDrawingDragState(paneIndex);
            event.preventDefault();
            return;
          }
        }

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
    const freehandDrawing = freehandDrawingRef.current;
    if (freehandDrawing) {
      if (freehandDrawing.anchors.length >= getRequiredDrawingAnchorCount(freehandDrawing.tool)) {
        addCompletedDrawing(
          createChartDrawing(freehandDrawing.paneIndex, freehandDrawing.tool, freehandDrawing.anchors)
        );
      } else {
        setPendingDrawing(null);
      }
      freehandDrawingRef.current = null;
    }

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

    const freehandDrawing = freehandDrawingRef.current;
    if (isAuthenticated && freehandDrawing && freehandDrawing.paneIndex === paneIndex && area === 'plot') {
      const anchor = getDrawingAnchorAtPoint(paneIndex, x, y);
      if (anchor) {
        const sampleDistance = Math.hypot(x - freehandDrawing.lastPoint.x, y - freehandDrawing.lastPoint.y);
        if (
          sampleDistance >= FREEHAND_DRAWING_MIN_SAMPLE_DISTANCE &&
          freehandDrawing.anchors.length < FREEHAND_DRAWING_MAX_ANCHORS
        ) {
          const nextAnchors = [...freehandDrawing.anchors, anchor];
          freehandDrawingRef.current = {
            ...freehandDrawing,
            anchors: nextAnchors,
            lastPoint: { x, y },
          };
          setPendingDrawing({ tool: freehandDrawing.tool, paneIndex, anchors: nextAnchors, preview: anchor });
        }
      }
      updatePaneHoverAtPoint(paneIndex, x, y, area, event.currentTarget);
      event.preventDefault();
      return;
    }

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
                if (isPositionDrawingTool(drawing.kind)) {
                  normalizePositionDrawingAnchors(drawing.kind, nextAnchors, anchorIndex);
                }
                // A closed polyline keeps its duplicated closing anchor glued to the first one.
                if (drawing.kind === 'polyline' && anchorIndex === 0 && nextAnchors.length >= 4) {
                  const lastIndex = nextAnchors.length - 1;
                  const startFirst = drawingDrag.startAnchors[0];
                  const startLast = drawingDrag.startAnchors[lastIndex];
                  if (
                    startFirst &&
                    startLast &&
                    startFirst.price === startLast.price &&
                    startFirst.logicalIndex === startLast.logicalIndex
                  ) {
                    nextAnchors[lastIndex] = { ...currentAnchor };
                  }
                }
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

      const defaultLineWidth = computed.lines.length > 1 ? 1.25 : 1.7;
      const endIndex = lastDrawableIndex(computed, candles.length, viewRange.endIndex);

      drawIndicatorFills(ctx, computed, firstVisibleIndex, endIndex, xForIndex, priceToY);
      computed.lines.forEach((line) => {
        drawIndicatorSeriesLine(ctx, line, firstVisibleIndex, endIndex, xForIndex, priceToY, defaultLineWidth);
      });
      drawIndicatorMarkers(
        ctx,
        computed,
        firstVisibleIndex,
        Math.min(candles.length - 1, endIndex),
        xForIndex,
        priceToY,
        axisFontSize
      );
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
    const getShapeFillStyle = (drawing: ChartDrawing) =>
      hexToRgba(drawing.color, clamp(drawing.opacity * 0.2, 0.05, 0.4));
    const drawShapePath = (
      drawing: ChartDrawing,
      points: Array<{ x: number; y: number }>,
      selected: boolean,
      smooth: boolean,
      arrowEnd = false
    ) => {
      if (points.length < 2) return;

      ctx.save();
      ctx.strokeStyle = getDrawingStrokeColor(drawing);
      ctx.lineWidth = selected ? drawing.lineWidth + 0.6 : drawing.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      applyDrawingLineStyle(drawing);
      ctx.beginPath();
      ctx.moveTo(points[0]!.x, points[0]!.y);
      if (smooth && points.length > 2) {
        for (let index = 1; index < points.length - 1; index += 1) {
          const current = points[index]!;
          const next = points[index + 1]!;
          ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2);
        }
        const last = points[points.length - 1]!;
        ctx.lineTo(last.x, last.y);
      } else {
        points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      if (arrowEnd) {
        const tip = points[points.length - 1]!;
        const tail = points[points.length - 2]!;
        drawDrawingArrowEnd(drawing, tip, tail, 'arrow');
      }
    };
    const drawShapePolygon = (
      drawing: ChartDrawing,
      polygon: Array<{ x: number; y: number }>,
      selected: boolean
    ) => {
      if (polygon.length < 3) return;

      ctx.save();
      ctx.fillStyle = getShapeFillStyle(drawing);
      ctx.strokeStyle = getDrawingStrokeColor(drawing);
      ctx.lineWidth = selected ? drawing.lineWidth + 0.6 : drawing.lineWidth;
      applyDrawingLineStyle(drawing);
      ctx.beginPath();
      polygon.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    };
    // Arrow mark glyph: the TIP sits exactly at the anchor (up arrow hangs below it, down arrow sits above it).
    const drawShapeArrowMarkGlyph = (
      drawing: ChartDrawing,
      point: { x: number; y: number },
      selected: boolean,
      direction: 'up' | 'down'
    ) => {
      const height = selected ? 22 : 20;
      const width = height * 0.78;
      const sign = direction === 'up' ? 1 : -1;

      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.fillStyle = getDrawingStrokeColor(drawing);
      ctx.strokeStyle = getDrawingStrokeColor(drawing);
      ctx.lineWidth = 1;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(sign * (width / 2), sign * (height * 0.45));
      ctx.lineTo(sign * (width * 0.2), sign * (height * 0.45));
      ctx.lineTo(sign * (width * 0.2), sign * height);
      ctx.lineTo(sign * (-width * 0.2), sign * height);
      ctx.lineTo(sign * (-width * 0.2), sign * (height * 0.45));
      ctx.lineTo(sign * (-width / 2), sign * (height * 0.45));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };
    // Arrow marker: fat solid tapered arrow from the first anchor to the second.
    const drawShapeArrowMarkerArrow = (
      drawing: ChartDrawing,
      from: { x: number; y: number },
      to: { x: number; y: number },
      selected: boolean
    ) => {
      const polygon = getArrowMarkerPolygon(from, to, selected ? drawing.lineWidth + 0.6 : drawing.lineWidth);
      if (!polygon) return;

      ctx.save();
      ctx.fillStyle = getDrawingStrokeColor(drawing);
      ctx.strokeStyle = getDrawingStrokeColor(drawing);
      ctx.lineWidth = 1;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      polygon.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };
    const drawShapeDrawing = (
      drawing: ChartDrawing,
      points: Array<{ x: number; y: number }>,
      selected: boolean
    ) => {
      const [first, second, third] = points;
      if (!first) return;

      const drawSegmentPreview = (from: { x: number; y: number }, to: { x: number; y: number }) => {
        ctx.save();
        ctx.strokeStyle = getDrawingStrokeColor(drawing);
        ctx.lineWidth = selected ? drawing.lineWidth + 0.6 : drawing.lineWidth;
        ctx.lineCap = 'round';
        applyDrawingLineStyle(drawing);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      };

      if (drawing.kind === 'brush' || drawing.kind === 'highlighter') {
        drawShapePath(drawing, points, selected, true);
      } else if (drawing.kind === 'path') {
        drawShapePath(drawing, points, selected, false, true);
      } else if (drawing.kind === 'polyline') {
        if (arePolylinePointsClosed(points)) {
          drawShapePolygon(drawing, points.slice(0, -1), selected);
        } else {
          drawShapePath(drawing, points, selected, false);
        }
      } else if (drawing.kind === 'arrow-mark-up') {
        drawShapeArrowMarkGlyph(drawing, first, selected, 'up');
      } else if (drawing.kind === 'arrow-mark-down') {
        drawShapeArrowMarkGlyph(drawing, first, selected, 'down');
      } else if (drawing.kind === 'arrow-marker' && second) {
        drawShapeArrowMarkerArrow(drawing, first, second, selected);
      } else if (drawing.kind === 'arrow' && second) {
        drawSegmentPreview(first, second);
        drawDrawingArrowEnd(drawing, first, second, drawing.leftEnd);
        drawDrawingArrowEnd(drawing, second, first, drawing.rightEnd);
      } else if (drawing.kind === 'rectangle' && second) {
        drawShapePolygon(drawing, getRectangleCorners(first, second), selected);
      } else if (drawing.kind === 'rotated-rectangle' && second) {
        if (third) {
          drawShapePolygon(drawing, getRotatedRectangleCorners(first, second, third), selected);
        } else {
          drawSegmentPreview(first, second);
        }
      } else if (drawing.kind === 'circle' && second) {
        const radius = Math.hypot(second.x - first.x, second.y - first.y);
        ctx.save();
        ctx.fillStyle = getShapeFillStyle(drawing);
        ctx.strokeStyle = getDrawingStrokeColor(drawing);
        ctx.lineWidth = selected ? drawing.lineWidth + 0.6 : drawing.lineWidth;
        applyDrawingLineStyle(drawing);
        ctx.beginPath();
        ctx.arc(first.x, first.y, Math.max(1, radius), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      } else if (drawing.kind === 'ellipse' && second) {
        if (third) {
          const { centerX, centerY, radiusX, radiusY, rotation } = getEllipseGeometry(first, second, third);
          ctx.save();
          ctx.fillStyle = getShapeFillStyle(drawing);
          ctx.strokeStyle = getDrawingStrokeColor(drawing);
          ctx.lineWidth = selected ? drawing.lineWidth + 0.6 : drawing.lineWidth;
          applyDrawingLineStyle(drawing);
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, radiusX, radiusY, rotation, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        } else {
          drawSegmentPreview(first, second);
        }
      } else if (drawing.kind === 'triangle' && second) {
        if (third) {
          drawShapePolygon(drawing, [first, second, third], selected);
        } else {
          drawSegmentPreview(first, second);
        }
      } else if (drawing.kind === 'arc' && second) {
        if (third) {
          const curvePoints = getShapeCurvePoints(drawing.kind, points);
          ctx.save();
          ctx.fillStyle = getShapeFillStyle(drawing);
          ctx.beginPath();
          curvePoints.forEach((point, index) => {
            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          drawShapePath(drawing, curvePoints, selected, false);
        } else {
          drawSegmentPreview(first, second);
        }
      } else if ((drawing.kind === 'curve' || drawing.kind === 'double-curve') && second) {
        drawShapePath(drawing, getShapeCurvePoints(drawing.kind, points), selected, false);
      }

      if (isFreehandDrawingTool(drawing.kind)) {
        drawDrawingHandle(first, selected);
        const last = points[points.length - 1];
        if (last && last !== first) drawDrawingHandle(last, selected);
      } else {
        points.forEach((point) => drawDrawingHandle(point, selected));
      }

      if (drawing.showPriceLabels && !isFreehandDrawingTool(drawing.kind)) {
        drawing.anchors.forEach((anchor, index) => {
          const point = points[index];
          if (!point) return;
          drawingPriceLabels.push({ y: point.y, price: anchor.price, color: drawing.color, selected });
        });
      }

      const connectorStart = first;
      const connectorEnd = points[points.length - 1] ?? { x: first.x + 1, y: first.y };
      const textEnd = connectorStart === connectorEnd ? { x: connectorStart.x + 1, y: connectorStart.y } : connectorEnd;
      drawDrawingText(drawing, connectorStart, textEnd);
      drawDrawingStats(drawing, connectorStart, textEnd, selected);
    };
    const traceTextDrawingRoundedRect = (rect: { x: number; y: number; w: number; h: number }, radius: number) => {
      const r = Math.min(radius, rect.w / 2, rect.h / 2);
      ctx.beginPath();
      ctx.moveTo(rect.x + r, rect.y);
      ctx.lineTo(rect.x + rect.w - r, rect.y);
      ctx.arcTo(rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + r, r);
      ctx.lineTo(rect.x + rect.w, rect.y + rect.h - r);
      ctx.arcTo(rect.x + rect.w, rect.y + rect.h, rect.x + rect.w - r, rect.y + rect.h, r);
      ctx.lineTo(rect.x + r, rect.y + rect.h);
      ctx.arcTo(rect.x, rect.y + rect.h, rect.x, rect.y + rect.h - r, r);
      ctx.lineTo(rect.x, rect.y + r);
      ctx.arcTo(rect.x, rect.y, rect.x + r, rect.y, r);
      ctx.closePath();
    };
    const drawTextDrawing = (drawing: ChartDrawing, points: Array<{ x: number; y: number }>, selected: boolean) => {
      const editor = drawingTextEditor && drawingTextEditor.drawingId === drawing.id ? drawingTextEditor : null;
      const model = getTextDrawingRenderModel(drawing, points, {
        mutedTextColor: theme === 'dark' ? '#787b86' : '#9598a1',
        popupVisible: selected || editor !== null,
        editingCell:
          editor && editor.cellRow !== undefined && editor.cellCol !== undefined
            ? { row: editor.cellRow, col: editor.cellCol }
            : null,
      });

      ctx.save();
      if (drawing.kind === 'image' && model.selectionRect) {
        const rect = model.selectionRect;
        const bitmap = drawing.imageSrc ? getTextDrawingImage(drawing.imageSrc) : null;
        if (bitmap) {
          ctx.save();
          ctx.globalAlpha = clamp(drawing.opacity, 0.1, 1);
          ctx.drawImage(bitmap, rect.x, rect.y, rect.w, rect.h);
          ctx.restore();
        } else {
          ctx.fillStyle = hexToRgba('#787b86', 0.12);
          ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
          ctx.strokeStyle = TEXT_DRAWING_CARD_BORDER;
          ctx.lineWidth = 1;
          ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        }
      }
      model.lines.forEach((line) => {
        ctx.strokeStyle = line.color;
        ctx.lineWidth = line.width;
        ctx.setLineDash(line.dash ?? []);
        ctx.beginPath();
        ctx.moveTo(line.start.x, line.start.y);
        ctx.lineTo(line.end.x, line.end.y);
        ctx.stroke();
        ctx.setLineDash([]);
      });
      model.boxes.forEach((box) => {
        if (box.shadow) {
          ctx.save();
          ctx.shadowColor = 'rgba(15, 23, 42, 0.18)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetY = 2;
        }
        traceTextDrawingRoundedRect(box, box.r);
        if (box.fill) {
          ctx.fillStyle = box.fill;
          ctx.fill();
        }
        if (box.shadow) ctx.restore();
        if (box.stroke) {
          traceTextDrawingRoundedRect(box, box.r);
          ctx.strokeStyle = box.stroke;
          ctx.lineWidth = box.strokeWidth ?? 1;
          ctx.stroke();
        }
      });
      if (model.gridLines.length > 0) {
        ctx.strokeStyle = TEXT_DRAWING_CARD_BORDER;
        ctx.lineWidth = 1;
        ctx.beginPath();
        model.gridLines.forEach((line) => {
          ctx.moveTo(line.start.x, line.start.y);
          ctx.lineTo(line.end.x, line.end.y);
        });
        ctx.stroke();
      }
      model.polygons.forEach((polygon) => {
        if (polygon.points.length < 3) return;
        ctx.beginPath();
        polygon.points.forEach((point, index) => {
          if (index === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
        if (polygon.fill) {
          ctx.fillStyle = polygon.fill;
          ctx.fill();
        }
        if (polygon.stroke) {
          ctx.strokeStyle = polygon.stroke;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
      model.circles.forEach((circle) => {
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
        if (circle.fill) {
          ctx.fillStyle = circle.fill;
          ctx.fill();
        }
        if (circle.stroke) {
          ctx.strokeStyle = circle.stroke;
          ctx.lineWidth = circle.strokeWidth ?? 1;
          ctx.stroke();
        }
      });
      model.texts.forEach((block, index) => {
        // The inline textarea overlay replaces this block while editing.
        if (editor && model.editorTextIndex === index) return;
        if (block.placeholder && !selected && !editor) return;
        ctx.font = block.font;
        ctx.fillStyle = block.color;
        ctx.textAlign = block.align === 'center' ? 'center' : 'left';
        ctx.textBaseline = 'alphabetic';
        block.lines.forEach((line, lineIndex) => {
          ctx.fillText(line, block.x, block.y + lineIndex * block.lineHeight + block.lineHeight * 0.78);
        });
        ctx.textAlign = 'left';
      });
      if ((selected || editor) && model.selectionRect) {
        const outline = {
          x: model.selectionRect.x - 3,
          y: model.selectionRect.y - 3,
          w: model.selectionRect.w + 6,
          h: model.selectionRect.h + 6,
        };
        traceTextDrawingRoundedRect(outline, 5);
        ctx.strokeStyle = DRAWING_DEFAULT_COLOR;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();

      points.forEach((point) => drawDrawingHandle(point, selected));
    };
    const forecastPillTextColor = theme === 'dark' ? '#150f23' : '#ffffff';
    const drawForecastPill = (
      lines: string[],
      centerX: number,
      edgeY: number,
      background: string,
      placement: 'above' | 'below',
      textColor = forecastPillTextColor
    ) => {
      if (lines.length === 0) return null;

      ctx.save();
      ctx.font = getCanvasFont(11);
      const paddingX = 8;
      const paddingY = 5;
      const lineHeight = 14;
      const pillWidth = Math.max(...lines.map((line) => ctx.measureText(line).width)) + paddingX * 2;
      const pillHeight = lines.length * lineHeight + paddingY * 2;
      const pillX = clamp(centerX - pillWidth / 2, chartArea.left + 4, chartArea.left + chartArea.width - pillWidth - 4);
      const pillY = placement === 'above' ? edgeY - pillHeight - 6 : edgeY + 6;

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 4);
      } else {
        ctx.rect(pillX, pillY, pillWidth, pillHeight);
      }
      ctx.fillStyle = background;
      ctx.fill();
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      lines.forEach((line, index) => {
        ctx.fillText(line, pillX + pillWidth / 2, pillY + paddingY + lineHeight * index + lineHeight / 2);
      });
      ctx.restore();

      return { x: pillX, y: pillY, width: pillWidth, height: pillHeight };
    };
    const formatForecastDate = (ms: number) => {
      const date = new Date(ms);
      const datePart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
      ).padStart(2, '0')}`;
      if (isDailyPlusTimeframe(timeframe)) return datePart;

      return `${datePart} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };
    const drawForecastCandle = (
      centerX: number,
      bar: { open: number; high: number; low: number; close: number },
      width: number,
      bullColor: string,
      bearColor: string,
      alpha: number,
      hollow: boolean
    ) => {
      const isBullish = bar.close >= bar.open;
      const color = isBullish ? bullColor : bearColor;
      const highY = priceToY(bar.high);
      const lowY = priceToY(bar.low);
      const openY = priceToY(bar.open);
      const closeY = priceToY(bar.close);
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX, highY);
      ctx.lineTo(centerX, lowY);
      ctx.stroke();
      if (hollow) {
        ctx.fillStyle = hexToRgba(color.startsWith('#') ? color : DRAWING_DEFAULT_COLOR, 0.24);
        ctx.fillRect(centerX - width / 2, bodyTop, width, bodyHeight);
        ctx.strokeRect(centerX - width / 2, bodyTop, width, bodyHeight);
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(centerX - width / 2, bodyTop, width, bodyHeight);
      }
      ctx.restore();
    };
    const drawPositionDrawing = (drawing: ChartDrawing, points: Array<{ x: number; y: number }>, selected: boolean) => {
      const [entry, entryEnd, target, stop] = points;
      const entryAnchor = drawing.anchors[0];
      const targetAnchor = drawing.anchors[2];
      const stopAnchor = drawing.anchors[3];
      if (!entry || !entryEnd || !target || !stop || !entryAnchor || !targetAnchor || !stopAnchor) return;

      const isLong = drawing.kind === 'long-position';
      const left = Math.min(entry.x, entryEnd.x);
      const right = Math.max(entry.x, entryEnd.x);
      const zoneWidth = Math.max(1, right - left);

      ctx.save();
      ctx.fillStyle = palette.greenSoft;
      ctx.fillRect(left, Math.min(entry.y, target.y), zoneWidth, Math.max(1, Math.abs(target.y - entry.y)));
      ctx.fillStyle = palette.redSoft;
      ctx.fillRect(left, Math.min(entry.y, stop.y), zoneWidth, Math.max(1, Math.abs(stop.y - entry.y)));

      ctx.lineWidth = selected ? drawing.lineWidth + 0.6 : drawing.lineWidth;
      ctx.strokeStyle = hexToRgba(FIB_DEFAULT_TREND_COLOR, Math.min(1, drawing.opacity + 0.1));
      ctx.beginPath();
      ctx.moveTo(left, entry.y);
      ctx.lineTo(right, entry.y);
      ctx.stroke();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = palette.green;
      ctx.beginPath();
      ctx.moveTo(left, target.y);
      ctx.lineTo(right, target.y);
      ctx.stroke();
      ctx.strokeStyle = palette.red;
      ctx.beginPath();
      ctx.moveTo(left, stop.y);
      ctx.lineTo(right, stop.y);
      ctx.stroke();
      ctx.restore();

      const targetDelta = Math.abs(targetAnchor.price - entryAnchor.price);
      const stopDelta = Math.abs(entryAnchor.price - stopAnchor.price);
      const qty = stopDelta > 0 ? POSITION_RISK_AMOUNT / stopDelta : 0;
      const ratio = stopDelta > 0 ? targetDelta / stopDelta : 0;
      const lastClose = candles[candles.length - 1]?.close ?? entryAnchor.price;
      const openPnl = (lastClose - entryAnchor.price) * qty * (isLong ? 1 : -1);
      const centerX = (left + right) / 2;

      if (selected) {
        const targetPercent = entryAnchor.price !== 0 ? (targetDelta / entryAnchor.price) * 100 : 0;
        const stopPercent = entryAnchor.price !== 0 ? (stopDelta / entryAnchor.price) * 100 : 0;
        const targetTicks = Math.round(targetDelta / POSITION_PRICE_TICK).toLocaleString();
        const stopTicks = Math.round(stopDelta / POSITION_PRICE_TICK).toLocaleString();
        const zoneTop = Math.min(target.y, stop.y);
        const zoneBottom = Math.max(target.y, stop.y);

        drawForecastPill(
          [`Target: ${formatPrice(targetDelta)} (${targetPercent.toFixed(2)}%) ${targetTicks}, Amount: ${formatPrice(
            qty * targetDelta
          )}`],
          centerX,
          isLong ? zoneTop : zoneBottom,
          palette.green,
          isLong ? 'above' : 'below'
        );
        drawForecastPill(
          [`Stop: ${formatPrice(stopDelta)} (${stopPercent.toFixed(2)}%) ${stopTicks}, Amount: ${formatPrice(
            qty * stopDelta
          )}`],
          centerX,
          isLong ? zoneBottom : zoneTop,
          palette.red,
          isLong ? 'below' : 'above'
        );
        drawForecastPill(
          [`Open PnL: ${formatPrice(openPnl)}, Qty: ${formatPositionQty(qty)}`, `Risk/reward ratio: ${ratio.toFixed(2)}`],
          centerX,
          entry.y,
          openPnl >= 0 ? palette.green : palette.red,
          'below'
        );

        drawingPriceLabels.push({ y: entry.y, price: entryAnchor.price, color: FIB_DEFAULT_TREND_COLOR, selected });
        drawingPriceLabels.push({ y: target.y, price: targetAnchor.price, color: palette.green, selected });
        drawingPriceLabels.push({ y: stop.y, price: stopAnchor.price, color: palette.red, selected });
      }

      points.forEach((point) => drawDrawingHandle(point, selected));
    };
    const drawForecastArrowDrawing = (
      drawing: ChartDrawing,
      points: Array<{ x: number; y: number }>,
      selected: boolean
    ) => {
      const [start, end] = points;
      const startAnchor = drawing.anchors[0];
      const endAnchor = drawing.anchors[1] ?? startAnchor;
      if (!start || !end || !startAnchor || !endAnchor) return;

      const curve = sampleForecastCurve(start, end);
      ctx.save();
      ctx.strokeStyle = getDrawingStrokeColor(drawing);
      ctx.lineWidth = selected ? drawing.lineWidth + 0.6 : drawing.lineWidth;
      applyDrawingLineStyle(drawing);
      ctx.beginPath();
      curve.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = getDrawingStrokeColor(drawing);
      [start, end].forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      drawForecastPill(
        [formatPrice(startAnchor.price), formatForecastDate(timeForIndex(startAnchor.logicalIndex))],
        start.x,
        start.y,
        drawing.color,
        'below',
        '#ffffff'
      );

      const priceDelta = endAnchor.price - startAnchor.price;
      const percentDelta = startAnchor.price !== 0 ? (priceDelta / startAnchor.price) * 100 : 0;
      const timeDelta = Math.abs(timeForIndex(endAnchor.logicalIndex) - timeForIndex(startAnchor.logicalIndex));
      const dayCount = Math.round(timeDelta / 86_400_000);
      const barCount = Math.round(Math.abs(endAnchor.logicalIndex - startAnchor.logicalIndex));
      const durationText = dayCount >= 1 ? `${dayCount}d` : `${barCount} bars`;
      const sign = priceDelta >= 0 ? '' : '-';
      const targetPill = drawForecastPill(
        [
          `${sign}${formatPrice(Math.abs(priceDelta))} (${percentDelta.toFixed(2)}%) in ${durationText}`,
          `${formatPrice(endAnchor.price)} · ${formatForecastDate(timeForIndex(endAnchor.logicalIndex))}`,
        ],
        end.x,
        end.y,
        drawing.color,
        'above',
        '#ffffff'
      );

      const lastIndex = candles.length - 1;
      if (endAnchor.logicalIndex <= lastIndex + 0.0001 && lastIndex >= 0) {
        const fromIndex = Math.max(0, Math.ceil(Math.min(startAnchor.logicalIndex, endAnchor.logicalIndex)));
        const toIndex = Math.min(lastIndex, Math.floor(Math.max(startAnchor.logicalIndex, endAnchor.logicalIndex)));
        const isUp = endAnchor.price >= startAnchor.price;
        let reached = false;
        for (let index = fromIndex; index <= toIndex; index += 1) {
          const candle = candles[index];
          if (!candle) continue;
          if (isUp ? candle.high >= endAnchor.price : candle.low <= endAnchor.price) {
            reached = true;
            break;
          }
        }
        const badgeEdgeY = (targetPill ? targetPill.y : end.y) - 4;
        drawForecastPill([reached ? 'SUCCESS' : 'FAILURE'], end.x, badgeEdgeY, reached ? palette.green : palette.red, 'above');
      }

      points.forEach((point) => drawDrawingHandle(point, selected));
    };
    const drawBarsPatternDrawing = (
      drawing: ChartDrawing,
      points: Array<{ x: number; y: number }>,
      selected: boolean
    ) => {
      const [start, end] = points;
      const firstAnchor = drawing.anchors[0];
      const secondAnchor = drawing.anchors[1];
      if (!start || !end || !firstAnchor || !secondAnchor) return;

      const baseAnchor = firstAnchor.logicalIndex <= secondAnchor.logicalIndex ? firstAnchor : secondAnchor;
      const bars =
        drawing.patternBars && drawing.patternBars.length > 0
          ? drawing.patternBars
          : captureBarsPatternData(candles, drawing.anchors);
      const leftX = Math.min(start.x, end.x);
      const rightX = Math.max(start.x, end.x);

      if (bars.length === 0) {
        ctx.save();
        ctx.strokeStyle = hexToRgba(drawing.color, drawing.opacity * 0.6);
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.restore();
      } else {
        const step = (rightX - leftX) / bars.length;
        const barWidth = clamp(step * 0.64, 1, 12);
        bars.forEach((bar, index) => {
          drawForecastCandle(
            leftX + step * (index + 0.5),
            {
              open: baseAnchor.price + bar.open,
              high: baseAnchor.price + bar.high,
              low: baseAnchor.price + bar.low,
              close: baseAnchor.price + bar.close,
            },
            barWidth,
            drawing.color,
            drawing.color,
            Math.min(1, drawing.opacity + 0.1),
            true
          );
        });
      }

      points.forEach((point) => drawDrawingHandle(point, selected));
    };
    const drawGhostFeedDrawing = (
      drawing: ChartDrawing,
      points: Array<{ x: number; y: number }>,
      selected: boolean
    ) => {
      const ghostCandles = buildGhostFeedCandles(drawing.anchors, drawing.seed ?? 7);
      const ghostWidth = clamp(candleSpacing * 0.64, 1, 12);

      ghostCandles.forEach((bar) => {
        drawForecastCandle(xForIndex(bar.logicalIndex), bar, ghostWidth, palette.green, palette.red, 0.45, false);
      });

      ctx.save();
      ctx.strokeStyle = hexToRgba(FIB_DEFAULT_TREND_COLOR, selected ? 0.9 : 0.55);
      ctx.lineWidth = 1;
      ctx.beginPath();
      points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
      ctx.restore();

      points.forEach((point) => drawDrawingHandle(point, selected));
    };
    const drawProjectionDrawing = (
      drawing: ChartDrawing,
      points: Array<{ x: number; y: number }>,
      selected: boolean
    ) => {
      const [apex, first, second] = points;
      if (!apex || !first) return;

      ctx.save();
      if (!second) {
        ctx.strokeStyle = hexToRgba(drawing.color, drawing.opacity * 0.7);
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(apex.x, apex.y);
        ctx.lineTo(first.x, first.y);
        ctx.stroke();
        ctx.restore();
        points.forEach((point) => drawDrawingHandle(point, selected));
        return;
      }

      const polygon = buildProjectionSectorPolygon(apex, first, second);
      ctx.fillStyle = hexToRgba(drawing.color, clamp(drawing.opacity * 0.16, 0.05, 0.4));
      ctx.beginPath();
      polygon.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = getDrawingStrokeColor(drawing);
      ctx.lineWidth = selected ? drawing.lineWidth + 0.6 : drawing.lineWidth;
      applyDrawingLineStyle(drawing);
      ctx.beginPath();
      polygon.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      points.forEach((point) => drawDrawingHandle(point, selected));
    };
    const drawAnchoredVwapDrawing = (
      drawing: ChartDrawing,
      points: Array<{ x: number; y: number }>,
      selected: boolean
    ) => {
      const anchor = drawing.anchors[0];
      const anchorPoint = points[0];
      if (!anchor || !anchorPoint) return;

      const series = computeAnchoredVwap(candles, anchor.logicalIndex);
      ctx.save();
      ctx.strokeStyle = getDrawingStrokeColor(drawing);
      ctx.lineWidth = selected ? drawing.lineWidth + 0.6 : drawing.lineWidth;
      applyDrawingLineStyle(drawing);
      ctx.beginPath();
      series.forEach((sample, index) => {
        const x = xForIndex(sample.logicalIndex);
        const y = priceToY(sample.value);
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = getDrawingStrokeColor(drawing);
      ctx.beginPath();
      ctx.arc(anchorPoint.x, anchorPoint.y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      points.forEach((point) => drawDrawingHandle(point, selected));
    };
    const drawVolumeProfileDrawing = (
      drawing: ChartDrawing,
      points: Array<{ x: number; y: number }>,
      selected: boolean
    ) => {
      const firstAnchor = drawing.anchors[0];
      if (!firstAnchor || points.length === 0) return;

      const anchoredToEnd = drawing.kind === 'anchored-volume-profile';
      const secondAnchor = anchoredToEnd ? null : drawing.anchors[1];
      if (!anchoredToEnd && !secondAnchor) return;

      const fromIndex = firstAnchor.logicalIndex;
      const toIndex = anchoredToEnd ? candles.length - 1 : secondAnchor!.logicalIndex;
      const profile = computeVolumeProfile(candles, fromIndex, toIndex);
      const leftX = anchoredToEnd
        ? points[0]!.x
        : Math.min(points[0]!.x, points[1]!.x);
      const rightX = anchoredToEnd
        ? xForIndex(candles.length - 1) + candleSpacing / 2
        : Math.max(points[0]!.x, points[1]!.x);

      ctx.save();
      ctx.strokeStyle = hexToRgba(FIB_DEFAULT_TREND_COLOR, 0.7);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftX, chartArea.top);
      ctx.lineTo(leftX, chartArea.top + chartArea.height);
      if (!anchoredToEnd) {
        ctx.moveTo(rightX, chartArea.top);
        ctx.lineTo(rightX, chartArea.top + chartArea.height);
      }
      ctx.stroke();

      if (profile && rightX - leftX > 2) {
        const topY = priceToY(profile.maxPrice);
        const bottomY = priceToY(profile.minPrice);
        if (!anchoredToEnd) {
          ctx.strokeStyle = hexToRgba(drawing.color, 0.35);
          ctx.strokeRect(leftX, topY, rightX - leftX, bottomY - topY);
        }

        profile.rows.forEach((row, index) => {
          const rowTotal = row.upVolume + row.downVolume;
          if (rowTotal <= 0) return;

          const rowTop = priceToY(row.priceHigh);
          const rowBottom = priceToY(row.priceLow);
          const rowHeight = Math.max(1, rowBottom - rowTop - 1);
          const rowWidth = (rowTotal / profile.maxRowVolume) * (rightX - leftX);
          const upWidth = rowWidth * (row.upVolume / rowTotal);
          const inValueArea = index >= profile.valueAreaLow && index <= profile.valueAreaHigh;
          const alpha = inValueArea ? 0.5 : 0.24;

          ctx.fillStyle = hexToRgba(palette.green, alpha);
          ctx.fillRect(leftX, rowTop, upWidth, rowHeight);
          ctx.fillStyle = hexToRgba(palette.red, alpha);
          ctx.fillRect(leftX + upWidth, rowTop, rowWidth - upWidth, rowHeight);
        });

        const pocRow = profile.rows[profile.pocIndex]!;
        const pocY = priceToY((pocRow.priceLow + pocRow.priceHigh) / 2);
        ctx.strokeStyle = palette.ma;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(leftX, pocY);
        ctx.lineTo(rightX, pocY);
        ctx.stroke();
      }
      ctx.restore();

      points.forEach((point) => drawDrawingHandle(point, selected));
    };
    const drawMeasureArrowHead = (
      tip: { x: number; y: number },
      angle: number,
      color: string
    ) => {
      const size = 8;
      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(tip.x - Math.cos(angle - Math.PI / 6) * size, tip.y - Math.sin(angle - Math.PI / 6) * size);
      ctx.lineTo(tip.x - Math.cos(angle + Math.PI / 6) * size, tip.y - Math.sin(angle + Math.PI / 6) * size);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    const drawMeasureLabel = (lines: string[], centerX: number, edgeY: number, placement: 'above' | 'below', color: string) => {
      if (lines.length === 0) return;

      ctx.save();
      ctx.font = getCanvasFont(11);
      const paddingX = 9;
      const paddingY = 6;
      const lineHeight = 15;
      const labelWidth = Math.max(...lines.map((line) => ctx.measureText(line).width)) + paddingX * 2;
      const labelHeight = lines.length * lineHeight + paddingY * 2;
      const labelX = clamp(centerX - labelWidth / 2, chartArea.left + 4, chartArea.left + chartArea.width - labelWidth - 4);
      const labelY = clamp(
        placement === 'above' ? edgeY - labelHeight - 8 : edgeY + 8,
        chartArea.top + 4,
        chartArea.top + chartArea.height - labelHeight - 4
      );

      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 4);
      } else {
        ctx.rect(labelX, labelY, labelWidth, labelHeight);
      }
      ctx.fillStyle = theme === 'dark' ? 'rgba(15, 23, 42, 0.86)' : 'rgba(255, 255, 255, 0.94)';
      ctx.fill();
      ctx.strokeStyle = hexToRgba(color, 0.72);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = theme === 'dark' ? '#f8fafc' : '#1f2937';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      lines.forEach((line, index) => {
        ctx.fillText(line, labelX + labelWidth / 2, labelY + paddingY + lineHeight * index + lineHeight / 2);
      });
      ctx.restore();
    };
    const drawMeasureDrawing = (drawing: ChartDrawing, points: Array<{ x: number; y: number }>, selected: boolean) => {
      const [start, end] = points;
      const startAnchor = drawing.anchors[0];
      const endAnchor = drawing.anchors[1];
      if (!start || !end || !startAnchor || !endAnchor) return;

      const left = Math.min(start.x, end.x);
      const right = Math.max(start.x, end.x);
      const top = Math.min(start.y, end.y);
      const bottom = Math.max(start.y, end.y);
      const centerX = (left + right) / 2;
      const centerY = (top + bottom) / 2;
      const strokeColor = getDrawingStrokeColor(drawing);

      ctx.save();
      ctx.fillStyle = hexToRgba(drawing.color, 0.12);
      ctx.fillRect(left, top, Math.max(1, right - left), Math.max(1, bottom - top));
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = selected ? drawing.lineWidth + 0.6 : drawing.lineWidth;
      applyDrawingLineStyle(drawing);

      if (drawing.kind === 'price-range' || drawing.kind === 'date-price-range') {
        if (drawing.kind === 'price-range') {
          ctx.beginPath();
          ctx.moveTo(left, start.y);
          ctx.lineTo(right, start.y);
          ctx.moveTo(left, end.y);
          ctx.lineTo(right, end.y);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(centerX, start.y);
        ctx.lineTo(centerX, end.y);
        ctx.stroke();
        drawMeasureArrowHead({ x: centerX, y: end.y }, end.y >= start.y ? Math.PI / 2 : -Math.PI / 2, strokeColor);
      }
      if (drawing.kind === 'date-range' || drawing.kind === 'date-price-range') {
        if (drawing.kind === 'date-range') {
          ctx.beginPath();
          ctx.moveTo(start.x, top);
          ctx.lineTo(start.x, bottom);
          ctx.moveTo(end.x, top);
          ctx.lineTo(end.x, bottom);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(start.x, centerY);
        ctx.lineTo(end.x, centerY);
        ctx.stroke();
        drawMeasureArrowHead({ x: end.x, y: centerY }, end.x >= start.x ? 0 : Math.PI, strokeColor);
      }
      ctx.setLineDash([]);
      ctx.restore();

      const priceDelta = endAnchor.price - startAnchor.price;
      const percentDelta = startAnchor.price !== 0 ? (priceDelta / startAnchor.price) * 100 : 0;
      const ticks = Math.round(Math.abs(priceDelta) / POSITION_PRICE_TICK).toLocaleString();
      const priceSign = priceDelta >= 0 ? '' : '-';
      const barsDelta = Math.round(Math.abs(endAnchor.logicalIndex - startAnchor.logicalIndex));
      const timeDelta = Math.abs(timeForIndex(endAnchor.logicalIndex) - timeForIndex(startAnchor.logicalIndex));
      const dayCount = Math.floor(timeDelta / 86_400_000);
      const hourCount = Math.floor((timeDelta % 86_400_000) / 3_600_000);
      const minuteCount = Math.round((timeDelta % 3_600_000) / 60_000);
      const durationText =
        dayCount >= 1 ? `${dayCount}d` : hourCount >= 1 ? `${hourCount}h ${minuteCount}m` : `${minuteCount}m`;
      const volumeFrom = clamp(Math.ceil(Math.min(startAnchor.logicalIndex, endAnchor.logicalIndex)), 0, candles.length - 1);
      const volumeTo = clamp(Math.floor(Math.max(startAnchor.logicalIndex, endAnchor.logicalIndex)), 0, candles.length - 1);
      let rangeVolume = 0;
      for (let index = volumeFrom; index <= volumeTo; index += 1) {
        rangeVolume += candles[index]?.volume ?? 0;
      }

      const priceLine = `${priceSign}${formatPrice(Math.abs(priceDelta))} (${percentDelta.toFixed(2)}%) ${ticks}`;
      const dateLine = `${barsDelta} bars, ${durationText}`;
      const volumeLine = `Vol ${formatCompact(rangeVolume)}`;
      const labelLines =
        drawing.kind === 'price-range'
          ? [priceLine]
          : drawing.kind === 'date-range'
            ? [dateLine, volumeLine]
            : [priceLine, dateLine, volumeLine];
      const placement: 'above' | 'below' = end.y <= start.y ? 'above' : 'below';
      drawMeasureLabel(labelLines, centerX, placement === 'above' ? top : bottom, placement, drawing.color);

      points.forEach((point) => drawDrawingHandle(point, selected));
    };
    const drawForecastDrawing = (drawing: ChartDrawing, points: Array<{ x: number; y: number }>, selected: boolean) => {
      if (isPositionDrawingTool(drawing.kind)) {
        drawPositionDrawing(drawing, points, selected);
      } else if (drawing.kind === 'forecast') {
        drawForecastArrowDrawing(drawing, points, selected);
      } else if (drawing.kind === 'bars-pattern') {
        drawBarsPatternDrawing(drawing, points, selected);
      } else if (drawing.kind === 'ghost-feed') {
        drawGhostFeedDrawing(drawing, points, selected);
      } else if (drawing.kind === 'projection') {
        drawProjectionDrawing(drawing, points, selected);
      } else if (drawing.kind === 'anchored-vwap') {
        drawAnchoredVwapDrawing(drawing, points, selected);
      } else if (drawing.kind === 'fixed-volume-profile' || drawing.kind === 'anchored-volume-profile') {
        drawVolumeProfileDrawing(drawing, points, selected);
      } else if (
        drawing.kind === 'price-range' ||
        drawing.kind === 'date-range' ||
        drawing.kind === 'date-price-range'
      ) {
        drawMeasureDrawing(drawing, points, selected);
      }
    };
    const drawDrawing = (drawing: ChartDrawing, selected: boolean) => {
      const points = drawing.anchors.map(pointForDrawingAnchor);
      if (isPatternDrawingTool(drawing.kind)) {
        if (points.length < 2) return;

        drawPatternDrawing(drawing, points, selected);
        return;
      }
      if (isForecastDrawingTool(drawing.kind)) {
        if (points.length < Math.min(2, getRequiredDrawingAnchorCount(drawing.kind))) return;

        drawForecastDrawing(drawing, points, selected);
        return;
      }
      if (isShapeDrawingTool(drawing.kind)) {
        // Shape tools render stage previews (e.g. the baseline of an ellipse) before all anchors exist.
        if (points.length < Math.min(2, getRequiredDrawingAnchorCount(drawing.kind))) return;

        drawShapeDrawing(drawing, points, selected);
        return;
      }

      if (isTextDrawingTool(drawing.kind)) {
        if (points.length < 1) return;

        drawTextDrawing(drawing, points, selected);
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
          color: getDefaultDrawingColor(pendingDrawing.tool),
          opacity: getDefaultDrawingOpacity(pendingDrawing.tool),
          lineWidth: getDefaultDrawingLineWidth(pendingDrawing.tool),
          lineStyle: DRAWING_DEFAULT_LINE_STYLE,
          extend: 'none',
          leftEnd: getDefaultDrawingLeftEnd(pendingDrawing.tool),
          rightEnd: getDefaultDrawingRightEnd(pendingDrawing.tool),
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

      if (computed.noData || visibleValues.length === 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(pane.left, pane.top, pane.width, pane.height);
        ctx.clip();
        ctx.fillStyle = theme === 'dark' ? 'rgba(13, 18, 27, 0.46)' : 'rgba(255, 255, 255, 0.42)';
        ctx.fillRect(pane.left, pane.top, pane.width, pane.height);

        if (computed.noData) {
          ctx.fillStyle = palette.text;
          ctx.globalAlpha = 0.66;
          ctx.font = getCanvasFont(indicatorPaneFontSize);
          ctx.textAlign = 'center';
          ctx.fillText(
            'No data available for this symbol',
            pane.left + pane.width / 2,
            pane.top + pane.height / 2 + 4
          );
          ctx.globalAlpha = 1;
        }
        ctx.restore();

        ctx.strokeStyle = palette.axisBorder;
        ctx.beginPath();
        ctx.moveTo(pane.left, pane.top);
        ctx.lineTo(pane.left + pane.width, pane.top);
        ctx.lineTo(pane.left + pane.width, pane.top + pane.height);
        ctx.stroke();
        return;
      }

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

      if (computed.guideBand) {
        const bandTop = valueToY(Math.max(computed.guideBand.from, computed.guideBand.to));
        const bandBottom = valueToY(Math.min(computed.guideBand.from, computed.guideBand.to));
        ctx.fillStyle = computed.guideBand.color;
        ctx.fillRect(pane.left, bandTop, pane.width, Math.max(1, bandBottom - bandTop));
      }

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

      const paneEndIndex = lastDrawableIndex(computed, candles.length, viewRange.endIndex);
      drawIndicatorFills(ctx, computed, firstVisibleIndex, paneEndIndex, xForIndex, valueToY);

      if (computed.histogram) {
        const zeroY = valueToY(0);
        visibleIndexedCandles.forEach(({ index }) => {
          const value = computed.histogram?.[index];
          if (value === null || value === undefined) return;

          const x = xForIndex(index);
          const y = valueToY(value);
          ctx.fillStyle =
            computed.histogramColors?.[index] ??
            (value >= 0
              ? computed.histogramPositive ?? palette.greenSoft
              : computed.histogramNegative ?? palette.redSoft);
          ctx.fillRect(
            x - candleWidth / 2,
            Math.min(zeroY, y),
            Math.max(1, candleWidth),
            Math.max(1, Math.abs(zeroY - y))
          );
        });
      }

      computed.lines.forEach((line) => {
        drawIndicatorSeriesLine(ctx, line, firstVisibleIndex, paneEndIndex, xForIndex, valueToY, 1.35);
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
        const midLabelY = valueToY(50) + 4;
        if (midLabelY > pane.top + indicatorPaneFontSize + 10 && midLabelY < pane.top + pane.height - 12) {
          ctx.fillText('50.00', rect.width - 8, midLabelY);
        }
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
    drawingTextEditor,
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
          aria-label={`${formatSymbol(pane.symbol, symbolSearchOptions)} ${timeframeLabel} OHLC legend pane ${paneIndex + 1}`}
        >
          <span className="instrument-legend-symbol">
            {formatSymbol(pane.symbol, symbolSearchOptions)} {timeframeLabel}
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
      const defaults = definition.defaults;
      const isFundamental = definition.formula === 'fundamental';
      const canEditPeriod = !isFundamental && (defaults.period !== undefined || settings.period !== undefined);
      const canEditPeriod2 = defaults.period2 !== undefined;
      const canEditPeriod3 = defaults.period3 !== undefined;
      const canEditPeriod4 = defaults.period4 !== undefined;
      const canEditFast = defaults.fastPeriod !== undefined;
      const canEditSlow = defaults.slowPeriod !== undefined;
      const canEditSource = defaults.source !== undefined || settings.source !== undefined;
      const canEditDeviation = defaults.stdDev !== undefined;
      const canEditMultiplier = defaults.multiplier !== undefined;
      const canEditPercent = defaults.percent !== undefined;
      const canEditOffset = defaults.offset !== undefined;
      const canEditSigma = defaults.sigma !== undefined;
      const canEditPsar = defaults.startValue !== undefined;
      const canEditSmoothingType = defaults.smoothingType !== undefined;
      const canEditMacd = definition.formula === 'macd';
      const canEditMaType = defaults.oscillatorMaType !== undefined;
      const canEditSignal = defaults.signalPeriod !== undefined;
      const signalPeriodMax = canEditMacd ? 50 : 200;
      const settingLabel = (field: string) => getIndicatorSettingLabel(definition.formula, field);
      const primaryColorLabel = getIndicatorColorLabel(definition.formula, 'color') ?? 'Color';
      const secondaryColorLabel =
        defaults.secondaryColor !== undefined
          ? getIndicatorColorLabel(definition.formula, 'secondaryColor') ?? 'Color 2'
          : null;
      const tertiaryColorLabel =
        defaults.tertiaryColor !== undefined
          ? getIndicatorColorLabel(definition.formula, 'tertiaryColor') ?? 'Color 3'
          : null;
      const quaternaryColorLabel =
        defaults.quaternaryColor !== undefined
          ? getIndicatorColorLabel(definition.formula, 'quaternaryColor') ?? 'Color 4'
          : null;
      const quinaryColorLabel =
        defaults.quinaryColor !== undefined
          ? getIndicatorColorLabel(definition.formula, 'quinaryColor') ?? 'Color 5'
          : null;
      const canEditFillColor = defaults.fillColor !== undefined;
      const canEditHistogramColors = defaults.histogramPositiveColor !== undefined;
      const canEditPrimaryColor = !isFundamental && defaults.color !== undefined;
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
              {canEditPrimaryColor && (
                <label>
                  <span>{primaryColorLabel}</span>
                  <input
                    type="color"
                    value={colorToInputValue(settings.color ?? defaults.color)}
                    onChange={(event) => updateIndicatorSettings(indicator.id, { color: event.target.value })}
                  />
                </label>
              )}
              {secondaryColorLabel && (
                <label>
                  <span>{secondaryColorLabel}</span>
                  <input
                    type="color"
                    value={colorToInputValue(settings.secondaryColor ?? defaults.secondaryColor, '#ff6d00')}
                    onChange={(event) => updateIndicatorSettings(indicator.id, { secondaryColor: event.target.value })}
                  />
                </label>
              )}
              {tertiaryColorLabel && (
                <label>
                  <span>{tertiaryColorLabel}</span>
                  <input
                    type="color"
                    value={colorToInputValue(settings.tertiaryColor ?? defaults.tertiaryColor, '#7c8da6')}
                    onChange={(event) => updateIndicatorSettings(indicator.id, { tertiaryColor: event.target.value })}
                  />
                </label>
              )}
              {quaternaryColorLabel && (
                <label>
                  <span>{quaternaryColorLabel}</span>
                  <input
                    type="color"
                    value={colorToInputValue(settings.quaternaryColor ?? defaults.quaternaryColor, '#43a047')}
                    onChange={(event) =>
                      updateIndicatorSettings(indicator.id, { quaternaryColor: event.target.value })
                    }
                  />
                </label>
              )}
              {quinaryColorLabel && (
                <label>
                  <span>{quinaryColorLabel}</span>
                  <input
                    type="color"
                    value={colorToInputValue(settings.quinaryColor ?? defaults.quinaryColor, '#f23645')}
                    onChange={(event) => updateIndicatorSettings(indicator.id, { quinaryColor: event.target.value })}
                  />
                </label>
              )}
              {canEditFillColor && (
                <label>
                  <span>Fill color</span>
                  <input
                    type="color"
                    value={colorToInputValue(settings.fillColor ?? defaults.fillColor, '#2962ff')}
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
                        settings.histogramPositiveColor ?? defaults.histogramPositiveColor,
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
                        settings.histogramNegativeColor ?? defaults.histogramNegativeColor,
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
                  <span>{settingLabel('period')}</span>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={sanitizePeriod(settings.period, defaults.period ?? 20)}
                    onChange={(event) => updateIndicatorSettings(indicator.id, { period: Number(event.target.value) })}
                  />
                </label>
              )}
              {canEditPeriod2 && (
                <label>
                  <span>{settingLabel('period2')}</span>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={sanitizePeriod(settings.period2, defaults.period2 ?? 20)}
                    onChange={(event) => updateIndicatorSettings(indicator.id, { period2: Number(event.target.value) })}
                  />
                </label>
              )}
              {canEditPeriod3 && (
                <label>
                  <span>{settingLabel('period3')}</span>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={sanitizePeriod(settings.period3, defaults.period3 ?? 20)}
                    onChange={(event) => updateIndicatorSettings(indicator.id, { period3: Number(event.target.value) })}
                  />
                </label>
              )}
              {canEditPeriod4 && (
                <label>
                  <span>{settingLabel('period4')}</span>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={sanitizePeriod(settings.period4, defaults.period4 ?? 20)}
                    onChange={(event) => updateIndicatorSettings(indicator.id, { period4: Number(event.target.value) })}
                  />
                </label>
              )}
              {canEditFast && !canEditMacd && (
                <label>
                  <span>{settingLabel('fastPeriod')}</span>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={sanitizePeriod(settings.fastPeriod, defaults.fastPeriod ?? 12)}
                    onChange={(event) =>
                      updateIndicatorSettings(indicator.id, { fastPeriod: Number(event.target.value) })
                    }
                  />
                </label>
              )}
              {canEditSlow && !canEditMacd && (
                <label>
                  <span>{settingLabel('slowPeriod')}</span>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={sanitizePeriod(settings.slowPeriod, defaults.slowPeriod ?? 26)}
                    onChange={(event) =>
                      updateIndicatorSettings(indicator.id, { slowPeriod: Number(event.target.value) })
                    }
                  />
                </label>
              )}
              {canEditSource && (
                <label>
                  <span>Source</span>
                  <select
                    value={settings.source ?? defaults.source ?? 'close'}
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
                  <span>{settingLabel('stdDev')}</span>
                  <input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={settings.stdDev ?? defaults.stdDev ?? 2}
                    onChange={(event) => updateIndicatorSettings(indicator.id, { stdDev: Number(event.target.value) })}
                  />
                </label>
              )}
              {canEditMultiplier && (
                <label>
                  <span>{settingLabel('multiplier')}</span>
                  <input
                    type="number"
                    min="0.1"
                    max="100000"
                    step="0.1"
                    value={settings.multiplier ?? defaults.multiplier ?? 2}
                    onChange={(event) =>
                      updateIndicatorSettings(indicator.id, { multiplier: Number(event.target.value) })
                    }
                  />
                </label>
              )}
              {canEditPercent && (
                <label>
                  <span>{settingLabel('percent')}</span>
                  <input
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.1"
                    value={settings.percent ?? defaults.percent ?? 10}
                    onChange={(event) => updateIndicatorSettings(indicator.id, { percent: Number(event.target.value) })}
                  />
                </label>
              )}
              {canEditOffset && (
                <label>
                  <span>{settingLabel('offset')}</span>
                  <input
                    type="number"
                    min="-100"
                    max="100"
                    step="0.05"
                    value={settings.offset ?? defaults.offset ?? 0}
                    onChange={(event) => updateIndicatorSettings(indicator.id, { offset: Number(event.target.value) })}
                  />
                </label>
              )}
              {canEditSigma && (
                <label>
                  <span>{settingLabel('sigma')}</span>
                  <input
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.5"
                    value={settings.sigma ?? defaults.sigma ?? 6}
                    onChange={(event) => updateIndicatorSettings(indicator.id, { sigma: Number(event.target.value) })}
                  />
                </label>
              )}
              {canEditPsar && (
                <>
                  <label>
                    <span>{settingLabel('startValue')}</span>
                    <input
                      type="number"
                      min="0.001"
                      max="1"
                      step="0.01"
                      value={settings.startValue ?? defaults.startValue ?? 0.02}
                      onChange={(event) =>
                        updateIndicatorSettings(indicator.id, { startValue: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label>
                    <span>{settingLabel('increment')}</span>
                    <input
                      type="number"
                      min="0.001"
                      max="1"
                      step="0.01"
                      value={settings.increment ?? defaults.increment ?? 0.02}
                      onChange={(event) =>
                        updateIndicatorSettings(indicator.id, { increment: Number(event.target.value) })
                      }
                    />
                  </label>
                  <label>
                    <span>{settingLabel('maxValue')}</span>
                    <input
                      type="number"
                      min="0.01"
                      max="1"
                      step="0.01"
                      value={settings.maxValue ?? defaults.maxValue ?? 0.2}
                      onChange={(event) =>
                        updateIndicatorSettings(indicator.id, { maxValue: Number(event.target.value) })
                      }
                    />
                  </label>
                </>
              )}
              {canEditSmoothingType && (
                <label>
                  <span>Smoothing</span>
                  <select
                    value={settings.smoothingType ?? defaults.smoothingType ?? 'RMA'}
                    onChange={(event) =>
                      updateIndicatorSettings(indicator.id, {
                        smoothingType: event.target.value as IndicatorSmoothingType,
                      })
                    }
                  >
                    {INDICATOR_SMOOTHING_OPTIONS.map((smoothingOption) => (
                      <option key={smoothingOption} value={smoothingOption}>
                        {smoothingOption}
                      </option>
                    ))}
                  </select>
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
                      value={sanitizePeriod(settings.fastPeriod, defaults.fastPeriod ?? 12)}
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
                      value={sanitizePeriod(settings.slowPeriod, defaults.slowPeriod ?? 26)}
                      onChange={(event) =>
                        updateIndicatorSettings(indicator.id, { slowPeriod: Number(event.target.value) })
                      }
                    />
                  </label>
                </>
              )}
              {canEditMaType && (
                <label>
                  <span>{canEditMacd ? 'Oscillator MA type' : 'MA type'}</span>
                  <select
                    value={settings.oscillatorMaType ?? defaults.oscillatorMaType ?? 'EMA'}
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
              )}
              {canEditSignal && (
                <label>
                  <span>{canEditMacd ? 'Signal smoothing' : settingLabel('signalPeriod')}</span>
                  <input
                    type="number"
                    min="1"
                    max={signalPeriodMax}
                    value={sanitizePeriod(settings.signalPeriod, defaults.signalPeriod ?? 9, 1, signalPeriodMax)}
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
                    value={settings.signalMaType ?? defaults.signalMaType ?? 'EMA'}
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
              {isFundamental && (
                <p className="indicator-settings-note">
                  Fundamental data is not available for crypto symbols.
                </p>
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
          {FIB_TOOL_ICONS[entry.icon] ??
            PATTERN_TOOL_ICONS[entry.icon] ??
            FORECAST_TOOL_ICONS[entry.icon] ??
            SHAPE_TOOL_ICONS[entry.icon] ??
            TEXT_TOOL_ICONS[entry.icon] ??
            null}
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
      activeDrawingTool !== null && isClassicLineDrawingTool(activeDrawingTool)
        ? activeDrawingTool
        : lastDrawingTool;
    const visibleFibTool =
      activeDrawingTool !== null && isFibDrawingTool(activeDrawingTool) ? activeDrawingTool : lastFibTool;
    const visiblePatternTool =
      activeDrawingTool !== null && isPatternDrawingTool(activeDrawingTool) ? activeDrawingTool : lastPatternTool;
    const visibleForecastTool =
      activeDrawingTool !== null && isForecastDrawingTool(activeDrawingTool) ? activeDrawingTool : lastForecastTool;
    const visibleShapeTool =
      activeDrawingTool !== null && isShapeDrawingTool(activeDrawingTool) ? activeDrawingTool : lastShapeTool;
    const visibleTextTool =
      activeDrawingTool !== null && isTextDrawingTool(activeDrawingTool) ? activeDrawingTool : lastTextTool;

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
              (activeDrawingTool !== null && isClassicLineDrawingTool(activeDrawingTool))
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
        <div className="drawing-tool-group">
          <button
            type="button"
            aria-label={`${DRAWING_TOOL_LABELS[visibleForecastTool]} drawing tool group`}
            aria-haspopup="menu"
            aria-expanded={activeDrawingMenu === 'forecast-tools'}
            title={DRAWING_TOOL_LABELS[visibleForecastTool]}
            data-active={
              activeDrawingMenu === 'forecast-tools' ||
              (activeDrawingTool !== null && isForecastDrawingTool(activeDrawingTool))
            }
            onClick={() => toggleDrawingMenu('forecast-tools')}
          >
            <span className={`drawing-tool-icon ${visibleForecastTool}`} aria-hidden="true">
              {FORECAST_TOOL_ICONS[visibleForecastTool] ?? null}
            </span>
          </button>
          {activeDrawingMenu === 'forecast-tools' && (
            <div
              className="drawing-tool-menu line-tools-menu forecast-tools-menu"
              role="menu"
              aria-label="Forecasting tools"
            >
              {FORECAST_TOOL_MENU_ENTRIES.map(renderDrawingMenuEntry)}
            </div>
          )}
        </div>
        <div className="drawing-tool-group">
          <button
            type="button"
            aria-label={`${DRAWING_TOOL_LABELS[visibleShapeTool]} drawing tool group`}
            aria-haspopup="menu"
            aria-expanded={activeDrawingMenu === 'shape-tools'}
            title={DRAWING_TOOL_LABELS[visibleShapeTool]}
            data-active={
              activeDrawingMenu === 'shape-tools' ||
              (activeDrawingTool !== null && isShapeDrawingTool(activeDrawingTool))
            }
            onClick={() => toggleDrawingMenu('shape-tools')}
          >
            <span className={`drawing-tool-icon ${visibleShapeTool}`} aria-hidden="true">
              {SHAPE_TOOL_ICONS[visibleShapeTool] ?? null}
            </span>
          </button>
          {activeDrawingMenu === 'shape-tools' && (
            <div
              className="drawing-tool-menu line-tools-menu shape-tools-menu"
              role="menu"
              aria-label="Brushes, arrows, and shapes"
            >
              {SHAPE_TOOL_MENU_ENTRIES.map(renderDrawingMenuEntry)}
            </div>
          )}
        </div>
        <div className="drawing-tool-group">
          <button
            type="button"
            aria-label={`${DRAWING_TOOL_LABELS[visibleTextTool]} drawing tool group`}
            aria-haspopup="menu"
            aria-expanded={activeDrawingMenu === 'text-tools'}
            title={DRAWING_TOOL_LABELS[visibleTextTool]}
            data-active={
              activeDrawingMenu === 'text-tools' ||
              (activeDrawingTool !== null && isTextDrawingTool(activeDrawingTool))
            }
            onClick={() => toggleDrawingMenu('text-tools')}
          >
            <span className={`drawing-tool-icon ${visibleTextTool}`} aria-hidden="true">
              {TEXT_TOOL_ICONS[visibleTextTool] ?? null}
            </span>
          </button>
          {activeDrawingMenu === 'text-tools' && (
            <div
              className="drawing-tool-menu line-tools-menu text-tools-menu"
              role="menu"
              aria-label="Text and notes"
            >
              {TEXT_TOOL_MENU_ENTRIES.map(renderDrawingMenuEntry)}
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
    const isTextToolDrawing = isTextDrawingTool(drawing.kind);
    // The plain Text tool has no shape fill — its toolbar color button edits the text color instead.
    const toolbarColorTargetsText = drawing.kind === 'text';
    const toolbarColorValue = toolbarColorTargetsText ? drawing.textColor : drawing.color;
    const patchToolbarColor = (value: string) =>
      patchSelectedDrawing(toolbarColorTargetsText ? { textColor: value } : { color: value });
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
      if (activeDrawingSettingsTab === 'style' && isTextToolDrawing) {
        const tableRows = clamp(drawing.tableRows ?? TEXT_TABLE_DEFAULT_ROWS, 1, TEXT_TABLE_MAX_ROWS);
        const tableCols = clamp(drawing.tableCols ?? TEXT_TABLE_DEFAULT_COLS, 1, TEXT_TABLE_MAX_COLS);
        const updateTableSize = (rows: number, cols: number) => {
          const nextRows = clamp(Math.round(rows), 1, TEXT_TABLE_MAX_ROWS);
          const nextCols = clamp(Math.round(cols), 1, TEXT_TABLE_MAX_COLS);
          patchSelectedDrawing({
            tableRows: nextRows,
            tableCols: nextCols,
            tableCells: resizeTableCells(drawing.tableCells, nextRows, nextCols),
          });
        };

        return (
          <div className="drawing-settings-tab-panel">
            {drawing.kind === 'image' && (
              <label className="drawing-settings-row">
                <span>Opacity</span>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={Math.round(drawing.opacity * 100)}
                  onChange={(event) =>
                    patchSelectedDrawing({ opacity: clamp(Number(event.target.value) / 100, 0.1, 1) })
                  }
                />
              </label>
            )}
            {drawing.kind === 'post' && (
              <label className="drawing-settings-row">
                <span>Post link</span>
                <input
                  type="text"
                  value={drawing.contentUrl ?? ''}
                  onChange={(event) => {
                    const nextUrl = event.target.value.slice(0, 300);
                    const handleMatch = nextUrl.match(/(?:x\.com|twitter\.com)\/(@?[A-Za-z0-9_]+)/i);
                    patchSelectedDrawing({
                      contentUrl: nextUrl,
                      contentMeta: handleMatch ? `@${handleMatch[1]!.replace(/^@/, '')}` : 'Post',
                    });
                  }}
                />
              </label>
            )}
            {drawing.kind !== 'text' && !isContentDrawingTool(drawing.kind) && (
              <div className="drawing-settings-row">
                <span>
                  {drawing.kind === 'signpost'
                    ? 'Stem color'
                    : drawing.kind === 'note'
                      ? 'Accent color'
                      : drawing.kind === 'flag-mark'
                        ? 'Flag color'
                        : 'Background color'}
                </span>
                <div className="drawing-settings-inline-controls">
                  <label className="drawing-settings-color-picker" aria-label="Drawing color">
                    <input
                      type="color"
                      value={colorToInputValue(drawing.color, DRAWING_DEFAULT_COLOR)}
                      onChange={(event) => patchSelectedDrawing({ color: event.target.value })}
                    />
                    <span style={{ backgroundColor: drawing.color }} aria-hidden="true" />
                  </label>
                  {drawing.kind === 'callout' && (
                    <input
                      type="range"
                      aria-label="Background opacity"
                      min="10"
                      max="100"
                      value={Math.round(drawing.opacity * 100)}
                      onChange={(event) =>
                        patchSelectedDrawing({ opacity: clamp(Number(event.target.value) / 100, 0.1, 1) })
                      }
                    />
                  )}
                </div>
              </div>
            )}
            {drawing.kind === 'table' && (
              <>
                <label className="drawing-settings-row">
                  <span>Rows</span>
                  <input
                    type="number"
                    min={1}
                    max={TEXT_TABLE_MAX_ROWS}
                    value={tableRows}
                    onChange={(event) => updateTableSize(Number(event.target.value), tableCols)}
                  />
                </label>
                <label className="drawing-settings-row">
                  <span>Columns</span>
                  <input
                    type="number"
                    min={1}
                    max={TEXT_TABLE_MAX_COLS}
                    value={tableCols}
                    onChange={(event) => updateTableSize(tableRows, Number(event.target.value))}
                  />
                </label>
              </>
            )}
            {hasInlineTextEditor(drawing.kind) && drawing.kind !== 'table' && (
              <span className="drawing-settings-section-label">
                Double-click the drawing on the chart to edit its text inline.
              </span>
            )}
            {drawing.kind === 'table' && (
              <span className="drawing-settings-section-label">
                Double-click a cell on the chart to edit its content.
              </span>
            )}
          </div>
        );
      }

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
                {(isClassicLineDrawingTool(drawing.kind) || drawing.kind === 'arrow') && (
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
            {isClassicLineDrawingTool(drawing.kind) && (
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
              <strong>{toolbarColorTargetsText ? 'Text color' : isTextToolDrawing ? 'Color' : 'Line color'}</strong>
              <div className="drawing-toolbar-swatch-grid" aria-label="Preset colors">
                {DRAWING_COLOR_SWATCHES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="drawing-toolbar-color-option"
                    aria-label={`Set drawing color ${color}`}
                    data-active={toolbarColorValue.toLowerCase() === color.toLowerCase()}
                    onClick={() => patchToolbarColor(color)}
                  >
                    <span style={{ backgroundColor: color }} aria-hidden="true" />
                  </button>
                ))}
              </div>
              <label>
                <span>Custom</span>
                <input
                  type="color"
                  value={colorToInputValue(toolbarColorValue, DRAWING_DEFAULT_COLOR)}
                  onChange={(event) => patchToolbarColor(event.target.value)}
                />
              </label>
              {!toolbarColorTargetsText && (
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
              )}
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
              {(isClassicLineDrawingTool(drawing.kind) || drawing.kind === 'arrow') && (
                <>
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
              {isClassicLineDrawingTool(drawing.kind) && (
                <label>
                  <span>Middle point</span>
                  <input
                    type="checkbox"
                    checked={drawing.showMiddlePoint}
                    onChange={(event) => patchSelectedDrawing({ showMiddlePoint: event.target.checked })}
                  />
                </label>
              )}
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
          aria-label={toolbarColorTargetsText ? 'Drawing text color' : 'Drawing line color'}
          title={toolbarColorTargetsText ? 'Text color' : isTextToolDrawing ? 'Color' : 'Line color'}
          aria-expanded={activeDrawingToolbarMenu === 'color'}
          data-active={activeDrawingToolbarMenu === 'color'}
          onClick={() => toggleDrawingToolbarMenu('color')}
        >
          <span className="drawing-color-swatch" style={{ backgroundColor: toolbarColorValue }} aria-hidden="true" />
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
        {!isTextToolDrawing && (
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
        )}
        {!isTextToolDrawing && (
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
        )}
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
        {!isTextToolDrawing && (
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
        )}
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
  const renderDrawingTextEditor = (paneIndex: number) => {
    if (!isAuthenticated || !drawingTextEditor || drawingTextEditor.paneIndex !== paneIndex) return null;

    const drawing = drawings.find((current) => current.id === drawingTextEditor.drawingId);
    if (!drawing) return null;

    const points = drawing.anchors
      .map((anchor) => getDrawingPointForAnchor(paneIndex, anchor))
      .filter((point): point is { x: number; y: number } => point !== null);
    if (points.length === 0) return null;

    const editingCell =
      drawingTextEditor.cellRow !== undefined && drawingTextEditor.cellCol !== undefined
        ? { row: drawingTextEditor.cellRow, col: drawingTextEditor.cellCol }
        : null;
    const model = getTextDrawingRenderModel(drawing, points, {
      mutedTextColor: theme === 'dark' ? '#787b86' : '#9598a1',
      popupVisible: true,
      editingCell,
    });
    if (!model.editorRect) return null;

    const value = editingCell
      ? drawing.tableCells?.[editingCell.row]?.[editingCell.col] ?? ''
      : drawing.text;
    const lineHeight = Math.round(drawing.textSize * TEXT_DRAWING_LINE_HEIGHT_RATIO);
    const editorColor = drawing.kind === 'table' ? TEXT_DRAWING_CARD_TEXT : drawing.textColor;
    const align = drawing.kind === 'callout' || drawing.kind === 'signpost' ? 'center' : 'left';
    const width = editingCell ? model.editorRect.w : Math.max(model.editorRect.w + 30, 140);
    const height = editingCell ? model.editorRect.h : model.editorRect.h + lineHeight;
    const left = align === 'center' && !editingCell ? model.editorRect.x - (width - model.editorRect.w) / 2 : model.editorRect.x;

    return (
      <textarea
        ref={drawingTextEditorInputRef}
        className="drawing-text-editor"
        aria-label={`${DRAWING_TOOL_LABELS[drawing.kind]} text`}
        autoFocus
        spellCheck={false}
        placeholder={TEXT_DRAWING_PLACEHOLDER}
        value={value}
        style={{
          left,
          top: model.editorRect.y - 1,
          width,
          height,
          color: editorColor,
          caretColor: editorColor,
          fontStyle: drawing.textItalic ? 'italic' : 'normal',
          fontWeight: drawing.textBold ? 700 : 400,
          fontSize: drawing.textSize,
          lineHeight: `${lineHeight}px`,
          textAlign: align,
        }}
        onChange={(event) => updateDrawingTextEditorValue(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            closeDrawingTextEditor();
          }
        }}
        onBlur={() => closeDrawingTextEditor()}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      />
    );
  };
  const renderContentToolDialog = () => {
    if (!isAuthenticated || !contentToolDialog) return null;

    const kind = contentToolDialog.kind;
    return (
      <div className="content-tool-overlay" role="presentation" onMouseDown={closeContentToolDialog}>
        <div
          className="content-tool-dialog"
          role="dialog"
          aria-label={`Add ${DRAWING_TOOL_LABELS[kind].toLowerCase()}`}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <strong>{kind === 'image' ? 'Add image' : kind === 'post' ? 'Add post' : 'Add idea'}</strong>
          {kind === 'image' ? (
            <label className="content-tool-file">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleContentImageFile(event.target.files?.[0] ?? null)}
              />
              <span>Choose an image — PNG, JPG or GIF up to ~2 MB. It will be pinned to the spot you clicked.</span>
            </label>
          ) : (
            <label className="content-tool-field">
              <span>{kind === 'post' ? 'Link to an X post' : 'Idea title'}</span>
              <input
                type="text"
                autoFocus
                value={contentToolDialogValue}
                placeholder={kind === 'post' ? 'https://x.com/user/status/…' : 'My trade idea'}
                onChange={(event) => {
                  setContentToolDialogValue(event.target.value);
                  setContentToolDialogError('');
                }}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === 'Enter') submitContentToolDialog();
                  if (event.key === 'Escape') closeContentToolDialog();
                }}
              />
            </label>
          )}
          {contentToolDialogError && <span className="content-tool-error">{contentToolDialogError}</span>}
          <div className="content-tool-actions">
            <button type="button" onClick={closeContentToolDialog}>
              Cancel
            </button>
            {kind !== 'image' && (
              <button type="button" className="content-tool-add" onClick={submitContentToolDialog}>
                Add
              </button>
            )}
          </div>
        </div>
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
        {renderDrawingTextEditor(paneIndex)}

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
            favoriteIndicatorIds={favoriteIndicatorIds}
            onToggleFavorite={toggleIndicatorFavorite}
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
                        <span className="settings-current-symbol">{formatSymbol(activeSymbol, symbolSearchOptions)}</span>
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
                  'aria-label': `${formatSymbol(pane.symbol, symbolSearchOptions)} ${pane.timeframe} chart pane ${paneIndex + 1}`,
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
        {renderContentToolDialog()}
      </section>
    </main>
  );
}
