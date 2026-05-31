'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

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

interface MenuOption<T extends string> {
  value: T;
  label: string;
  shortLabel?: string;
  description?: string;
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
const CHART_STYLE_OPTIONS: Array<MenuOption<ChartStyle>> = [
  { value: 'candles', label: 'Candles', shortLabel: 'Candle', description: 'OHLC candles' },
  { value: 'line', label: 'Line', description: 'Close price line' },
  { value: 'area', label: 'Area', description: 'Filled close price line' },
];

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

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

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

const calculateNiceInterval = (range: number) => {
  if (!Number.isFinite(range) || range <= 0) return 1;

  const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
  const normalized = range / magnitude;

  if (normalized <= 1.5) return magnitude * 0.2;
  if (normalized <= 3) return magnitude * 0.5;
  if (normalized <= 7) return magnitude;
  return magnitude * 2;
};

const movingAverage = (candles: Candle[], period: number) => {
  const values: Array<number | null> = new Array(candles.length).fill(null);
  let rollingSum = 0;

  candles.forEach((candle, index) => {
    rollingSum += candle.close;

    if (index >= period) {
      rollingSum -= candles[index - period].close;
    }

    if (index >= period - 1) {
      values[index] = rollingSum / period;
    }
  });

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
  showMovingAverage: boolean;
  showVolume: boolean;
  onToggleMovingAverage: () => void;
  onToggleVolume: () => void;
}

function IndicatorsDropdown({
  count,
  openMenu,
  setOpenMenu,
  showMovingAverage,
  showVolume,
  onToggleMovingAverage,
  onToggleVolume,
}: IndicatorsDropdownProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isOpen = openMenu === 'indicators';
  const options = [
    {
      id: 'ma20',
      label: 'MA20',
      description: 'Moving average',
      enabled: showMovingAverage,
      onToggle: onToggleMovingAverage,
    },
    {
      id: 'volume',
      label: 'Volume',
      description: 'Volume pane',
      enabled: showVolume,
      onToggle: onToggleVolume,
    },
  ];

  const closeMenu = () => {
    setOpenMenu(null);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpenMenu('indicators');
      focusMenuItem('indicators', 0);
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
      option.onToggle();
    }
  };

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
        <div className="toolbar-menu indicator-menu-panel" id="indicators-menu" role="menu" aria-label="Indicators">
          {options.map((option, index) => (
            <button
              key={option.id}
              type="button"
              role="menuitemcheckbox"
              aria-checked={option.enabled}
              className="toolbar-menu-item indicator-menu-item"
              data-active={option.enabled}
              data-menu-key="indicators"
              data-menu-value={option.id}
              onClick={option.onToggle}
              onKeyDown={(event) => handleItemKeyDown(event, option, index)}
            >
              <span className="menu-check" aria-hidden="true" />
              <span className="menu-item-copy">
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
              <span className="indicator-switch" data-enabled={option.enabled} aria-hidden="true">
                <span />
              </span>
            </button>
          ))}
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
  const activeStreamRef = useRef('');
  const selectedMarketRef = useRef({ symbol: 'BTCUSDT', timeframe: '1m' });
  const viewRangeRef = useRef<ViewRange>({
    startIndex: 0,
    endIndex: 100,
    candlesPerView: 100,
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
  const [showVolume, setShowVolume] = useState(true);
  const [showMovingAverage, setShowMovingAverage] = useState(true);
  const [feedStatus, setFeedStatus] = useState<FeedStatus>('connecting');
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [mousePos, setMousePos] = useState<MousePosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
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
  const indicatorCount = Number(showMovingAverage) + Number(showVolume);

  const resetView = (sourceCandles = candles) => {
    const candlesPerView = Math.min(140, Math.max(60, sourceCandles.length || 100));
    const endIndex = sourceCandles.length;

    setViewRange({
      startIndex: Math.max(0, endIndex - candlesPerView),
      endIndex,
      candlesPerView,
    });
  };

  useEffect(() => {
    viewRangeRef.current = viewRange;
  }, [viewRange]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!controlRackRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
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
        resetView(formattedCandles);
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
        const wasPinnedToLatest = viewRangeRef.current.endIndex >= previous.length;

        if (lastCandle && lastCandle.time === newCandle.time) {
          updated[updated.length - 1] = newCandle;
        } else if (!lastCandle || newCandle.time > lastCandle.time) {
          updated.push(newCandle);

          if (wasPinnedToLatest) {
            setViewRange((current) => ({
              ...current,
              startIndex: Math.max(0, updated.length - current.candlesPerView),
              endIndex: updated.length,
            }));
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

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    if (!candles.length) return;

    const zoomSpeed = 0.12;
    const delta = event.deltaY > 0 ? 1 + zoomSpeed : 1 - zoomSpeed;
    const newCandlesPerView = clamp(
      Math.round(viewRange.candlesPerView * delta),
      18,
      Math.min(420, Math.max(18, candles.length))
    );

    const rect = event.currentTarget.getBoundingClientRect();
    const { chartArea } = chartBounds.current;
    const mouseRatio = clamp((event.clientX - rect.left - chartArea.left) / chartArea.width, 0, 1);
    const currentVisibleCandles = viewRange.endIndex - viewRange.startIndex;
    const candleDiff = newCandlesPerView - currentVisibleCandles;
    const leftShift = Math.round(candleDiff * mouseRatio);

    let newStartIndex = viewRange.startIndex - leftShift;
    let newEndIndex = newStartIndex + newCandlesPerView;

    if (newEndIndex > candles.length) {
      newEndIndex = candles.length;
      newStartIndex = Math.max(0, newEndIndex - newCandlesPerView);
    }
    if (newStartIndex < 0) {
      newStartIndex = 0;
      newEndIndex = Math.min(candles.length, newCandlesPerView);
    }

    setViewRange({
      startIndex: newStartIndex,
      endIndex: newEndIndex,
      candlesPerView: newCandlesPerView,
    });
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (isDragging && candles.length) {
      const { chartArea } = chartBounds.current;
      const deltaX = event.clientX - dragStart.x;
      const candleWidth = chartArea.width / viewRange.candlesPerView;
      const candlesDelta = Math.round(deltaX / candleWidth);

      if (candlesDelta !== 0) {
        let newStartIndex = viewRange.startIndex - candlesDelta;
        let newEndIndex = viewRange.endIndex - candlesDelta;

        if (newStartIndex < 0) {
          newStartIndex = 0;
          newEndIndex = viewRange.candlesPerView;
        }
        if (newEndIndex > candles.length) {
          newEndIndex = candles.length;
          newStartIndex = Math.max(0, candles.length - viewRange.candlesPerView);
        }

        setViewRange({
          ...viewRange,
          startIndex: newStartIndex,
          endIndex: newEndIndex,
        });
        setDragStart({ x: event.clientX, y: event.clientY });
      }
    }

    const { chartArea, minPrice, maxPrice } = chartBounds.current;
    const priceRange = maxPrice - minPrice || 1;
    const dataY = maxPrice - ((y - chartArea.top) / chartArea.height) * priceRange;
    setMousePos({ x, y, dataY });
  };

  const handleMouseLeave = () => {
    setMousePos(null);
    setIsDragging(false);
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
    const volumeHeight = showVolume ? clamp(rect.height * 0.17, 48, 104) : 0;
    const chartArea = {
      left: rect.width < 520 ? 8 : 12,
      top: topLegendHeight,
      width: Math.max(80, rect.width - rightAxisWidth - (rect.width < 520 ? 10 : 18)),
      height: Math.max(120, rect.height - bottomAxisHeight - topLegendHeight - volumeHeight),
    };
    const volumeArea = {
      left: chartArea.left,
      top: chartArea.top + chartArea.height + 10,
      width: chartArea.width,
      height: Math.max(0, volumeHeight - 14),
    };

    const visibleCandles = candles.slice(viewRange.startIndex, viewRange.endIndex);
    if (visibleCandles.length === 0) return;

    const prices = visibleCandles.flatMap((candle) => [candle.high, candle.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const rawPriceRange = maxPrice - minPrice || Math.max(1, maxPrice * 0.001);
    const padding = rawPriceRange * 0.08;
    const minPaddedPrice = minPrice - padding;
    const maxPaddedPrice = maxPrice + padding;
    const paddedPriceRange = maxPaddedPrice - minPaddedPrice || 1;

    chartBounds.current = {
      minPrice: minPaddedPrice,
      maxPrice: maxPaddedPrice,
      chartArea,
    };

    const priceToY = (price: number) =>
      chartArea.top + ((maxPaddedPrice - price) / paddedPriceRange) * chartArea.height;
    const candleSpacing = chartArea.width / visibleCandles.length;
    const candleWidth = clamp(candleSpacing * 0.64, 1, 12);
    const xForIndex = (index: number) => chartArea.left + (index + 0.5) * candleSpacing;

    ctx.save();
    ctx.beginPath();
    ctx.rect(chartArea.left, chartArea.top, chartArea.width, chartArea.height);
    ctx.clip();

    const priceStep = calculateNiceInterval(rawPriceRange);
    const startPrice = Math.floor(minPaddedPrice / priceStep) * priceStep;
    ctx.font = '11px var(--font-geist-sans), ui-sans-serif, sans-serif';
    ctx.lineWidth = 1;

    for (let price = startPrice; price <= maxPaddedPrice + priceStep; price += priceStep) {
      const y = priceToY(price);
      if (y < chartArea.top || y > chartArea.top + chartArea.height) continue;

      ctx.strokeStyle = Math.abs(price - latestCandle!.close) < priceStep * 0.1 ? palette.gridStrong : palette.grid;
      ctx.beginPath();
      ctx.moveTo(chartArea.left, y);
      ctx.lineTo(chartArea.left + chartArea.width, y);
      ctx.stroke();
    }

    const timeInterval = Math.max(1, Math.ceil(visibleCandles.length / (rect.width < 620 ? 4 : 9)));
    for (let index = 0; index < visibleCandles.length; index += timeInterval) {
      const x = xForIndex(index);
      ctx.strokeStyle = palette.grid;
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.top + chartArea.height);
      ctx.stroke();
    }

    const closePoints = visibleCandles.map((candle, index) => ({
      x: xForIndex(index),
      y: priceToY(candle.close),
    }));

    if (chartStyle === 'area') {
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
      visibleCandles.forEach((candle, index) => {
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

    if (showMovingAverage) {
      const averages = movingAverage(candles, 20);
      const averagePoints = visibleCandles
        .map((_, index) => {
          const average = averages[viewRange.startIndex + index];
          return average === null
            ? null
            : {
                x: xForIndex(index),
                y: priceToY(average),
              };
        })
        .filter((point): point is { x: number; y: number } => point !== null);

      drawLinePath(ctx, averagePoints, palette.ma, 1.6);
    }

    const currentPriceY = priceToY(latestCandle!.close);
    ctx.strokeStyle = latestCandle!.close >= latestCandle!.open ? palette.green : palette.red;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(chartArea.left, currentPriceY);
    ctx.lineTo(chartArea.left + chartArea.width, currentPriceY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    if (showVolume && volumeArea.height > 0) {
      const maxVolume = Math.max(...visibleCandles.map((candle) => candle.volume), 1);
      ctx.strokeStyle = palette.grid;
      ctx.beginPath();
      ctx.moveTo(volumeArea.left, volumeArea.top);
      ctx.lineTo(volumeArea.left + volumeArea.width, volumeArea.top);
      ctx.stroke();

      visibleCandles.forEach((candle, index) => {
        const x = xForIndex(index);
        const barHeight = Math.max(1, (candle.volume / maxVolume) * volumeArea.height);
        ctx.fillStyle = candle.close >= candle.open ? palette.greenSoft : palette.redSoft;
        ctx.fillRect(x - candleWidth / 2, volumeArea.top + volumeArea.height - barHeight, candleWidth, barHeight);
      });

      ctx.fillStyle = palette.text;
      ctx.font = '11px var(--font-geist-sans), ui-sans-serif, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Vol ${formatCompact(latestCandle!.volume)}`, volumeArea.left + 2, volumeArea.top + 14);
    }

    ctx.strokeStyle = palette.axisBorder;
    ctx.beginPath();
    ctx.moveTo(chartArea.left + chartArea.width, chartArea.top);
    ctx.lineTo(chartArea.left + chartArea.width, chartArea.top + chartArea.height);
    ctx.lineTo(chartArea.left, chartArea.top + chartArea.height);
    ctx.stroke();

    ctx.fillStyle = palette.axisBg;
    ctx.fillRect(chartArea.left + chartArea.width + 1, currentPriceY - 12, rightAxisWidth - 6, 24);
    ctx.fillStyle = palette.textBright;
    ctx.font = '12px var(--font-geist-mono), ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(formatPrice(latestCandle!.close), chartArea.left + chartArea.width + 7, currentPriceY + 4);

    ctx.font = '11px var(--font-geist-mono), ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = palette.text;
    for (let price = startPrice; price <= maxPaddedPrice + priceStep; price += priceStep) {
      const y = priceToY(price);
      if (y < chartArea.top + 8 || y > chartArea.top + chartArea.height - 8) continue;
      ctx.fillText(formatPrice(price), rect.width - 8, y + 4);
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = palette.text;
    for (let index = 0; index < visibleCandles.length; index += timeInterval) {
      const x = xForIndex(index);
      const label = formatTime(visibleCandles[index].time);
      const labelWidth = ctx.measureText(label).width;
      const labelX = clamp(
        x,
        chartArea.left + labelWidth / 2,
        chartArea.left + chartArea.width - labelWidth / 2
      );
      ctx.fillText(label, labelX, rect.height - 10);
    }

    let activeCandleIndex = visibleCandles.length - 1;
    const crosshairInside =
      mousePos &&
      mousePos.x >= chartArea.left &&
      mousePos.x <= chartArea.left + chartArea.width &&
      mousePos.y >= chartArea.top &&
      mousePos.y <= chartArea.top + chartArea.height;

    if (crosshairInside) {
      activeCandleIndex = clamp(
        Math.floor(((mousePos.x - chartArea.left) / chartArea.width) * visibleCandles.length),
        0,
        visibleCandles.length - 1
      );

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

      const timeLabel = formatTime(visibleCandles[activeCandleIndex].time, true);
      const timeLabelWidth = ctx.measureText(timeLabel).width + 18;
      const labelX = clamp(mousePos.x - timeLabelWidth / 2, chartArea.left, chartArea.left + chartArea.width - timeLabelWidth);
      ctx.fillStyle = palette.axisBg;
      ctx.fillRect(labelX, chartArea.top + chartArea.height + 2, timeLabelWidth, 22);
      ctx.fillStyle = palette.textBright;
      ctx.textAlign = 'center';
      ctx.fillText(timeLabel, labelX + timeLabelWidth / 2, chartArea.top + chartArea.height + 17);
    }

    const activeCandle = visibleCandles[activeCandleIndex];
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

    ctx.fillStyle = palette.text;
    ctx.textAlign = 'right';
    ctx.font = '11px var(--font-geist-sans), ui-sans-serif, sans-serif';
    ctx.fillText(
      `${viewRange.startIndex + 1}-${viewRange.endIndex} of ${candles.length}`,
      chartArea.left + chartArea.width - 4,
      chartArea.top + 14
    );
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
    isDragging,
    chartStyle,
    showVolume,
    showMovingAverage,
    theme,
    symbol,
    timeframe,
  ]);

  return (
    <main className="chart-terminal" data-theme={theme}>
      <header className="chart-topbar">
        <div className="instrument-block">
          <div className="symbol-row">
            <select
              aria-label="Symbol"
              className="symbol-select"
              value={symbol}
              onChange={(event) => setSymbol(event.target.value)}
            >
              {SYMBOLS.map((option) => (
                <option key={option} value={option}>
                  {formatSymbol(option)}
                </option>
              ))}
            </select>
            <span className={`feed-pill ${feedStatus}`}>{feedStatus}</span>
          </div>

          <div className="price-row">
            <span className="last-price">{latestCandle ? formatPrice(latestCandle.close) : '-'}</span>
            <span className={`price-change ${changeTone}`}>
              {priceChange >= 0 ? '+' : ''}
              {formatPrice(priceChange)} ({priceChangePercent >= 0 ? '+' : ''}
              {priceChangePercent.toFixed(2)}%)
            </span>
            <span className="muted">Binance Spot</span>
          </div>
        </div>

        <div ref={controlRackRef} className="control-rack" aria-label="Chart controls">
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
            showMovingAverage={showMovingAverage}
            showVolume={showVolume}
            onToggleMovingAverage={() => setShowMovingAverage((value) => !value)}
            onToggleVolume={() => setShowVolume((value) => !value)}
          />

          <button
            type="button"
            className="tool-toggle"
            onClick={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button type="button" className="tool-toggle" onClick={() => resetView()}>
            Reset
          </button>
        </div>
      </header>

      <section className="market-strip" aria-label="Market status">
        <span>{candles.length.toLocaleString()} candles</span>
        <span>{viewRange.candlesPerView} bars visible</span>
        <span>{latestCandle ? `Vol ${formatCompact(latestCandle.volume)}` : 'Vol -'}</span>
        <span>{showMovingAverage ? 'MA20 on' : 'MA20 off'}</span>
      </section>

      <section className="chart-stage">
        <canvas
          ref={canvasRef}
          aria-label={`${formatSymbol(symbol)} ${timeframe} chart`}
          className="chart-canvas"
          style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
        />

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
