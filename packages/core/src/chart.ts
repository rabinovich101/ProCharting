import type { Chart, ChartOptions, ChartEventMap, ChartGridControlId, ConnectionOptions, InteractionOptions, Renderer, RenderableSeries, RenderTheme, Series, SeriesOptions } from '@procharting/types';
import type { StreamingOptions } from '@procharting/types';
import { EventEmitter, type EventHandler } from '@procharting/utils';
import { createCssGridLayout, getBottomControlAt, getGridArea, resolveGridOptions, type CssGridLayout, type GridHitArea } from './grid-layout';
import { RendererFactory } from './renderer-factory';
import { WebSocketClient } from './websocket/websocket-client';
import { BinaryProtocol, MessageType } from './websocket/binary-protocol';

type ChartEventPayloadMap = {
  [K in keyof ChartEventMap]: Parameters<ChartEventMap[K]>[0];
};

type NumericRecord = Record<string, unknown>;
type DragMode = 'none' | 'time-pan' | 'price-scale';

type RenderSeriesStyle = {
  color?: string;
  lineWidth?: number;
  fillOpacity?: number;
  strokeOpacity?: number;
  upColor?: string;
  downColor?: string;
  wickUpColor?: string;
  wickDownColor?: string;
};

const LIGHT_RENDER_THEME: RenderTheme = {
  backgroundColor: '#ffffff',
  gridColor: 'rgba(42, 46, 57, 0.08)',
  textColor: '#131722',
  fontFamily: 'system-ui',
  fontSize: 12,
};

const DARK_RENDER_THEME: RenderTheme = {
  backgroundColor: '#0f0f0f',
  gridColor: 'rgba(255, 255, 255, 0.08)',
  textColor: '#d1d4dc',
  fontFamily: 'system-ui',
  fontSize: 12,
};

export function createChart(container: HTMLElement | string, options: ChartOptions = {}): Chart {
  const element = typeof container === 'string' 
    ? document.querySelector<HTMLElement>(container)! 
    : container;
    
  if (!element) {
    throw new Error('Container element not found');
  }

  return new ChartImpl(element, options);
}

class ChartImpl implements Chart {
  readonly container: HTMLElement;
  readonly renderer: Chart['renderer'];
  
  private readonly events = new EventEmitter<ChartEventPayloadMap>();
  private readonly canvas: HTMLCanvasElement;
  private readonly rendererInstance: Renderer;
  private readonly series = new Map<string, SeriesImpl<SeriesOptions>>();
  private nextSeriesId = 0;
  private animationFrame: number | null = null;
  private resizeObserver: ResizeObserver;
  private wsClient: WebSocketClient | null = null;
  
  // View state for zoom/pan
  private viewState = {
    dataMinX: 0,
    dataMaxX: 100,
    dataMinY: 0,
    dataMaxY: 100,
    dragMode: 'none' as DragMode,
    dragStart: { x: 0, y: 0 },
    lastDataX: 0,
    lastPriceScaleAnchorY: 0,
    lastYRange: { min: 0, max: 100 },
    autoScaleY: true,
  };
  
  // Mouse state for interactions
  private mouseState = {
    position: { x: 0, y: 0 },
    dataPosition: { x: 0, y: 0 },
    showCrosshair: false,
    isOverChart: false,
    isOverYAxis: false,
    area: 'outside' as GridHitArea,
  };

  constructor(container: HTMLElement, private options: ChartOptions) {
    this.container = container;
    
    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    this.container.appendChild(this.canvas);
    
    // Initialize renderer
    this.rendererInstance = RendererFactory.create(options.renderer ?? 'auto');
    this.renderer = this.rendererInstance.type;
    
    // Set initial size
    this.updateCanvasSize();
    
    // Initialize renderer
    this.initializeRenderer();
    
    // Setup resize observer
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
    
    // Setup mouse event handlers if interactions enabled
    const interactions = options.interactions ?? { 
      enableZoom: true, 
      enablePan: true, 
      enableCrosshair: true,
      enableYAxisScale: true 
    };
    if (interactions.enableZoom || interactions.enablePan || interactions.enableCrosshair || interactions.enableYAxisScale) {
      this.setupMouseEvents();
    }
    
    // Start render loop
    this.startRenderLoop();
  }

  private async initializeRenderer(): Promise<void> {
    try {
      await this.rendererInstance.initialize(this.canvas);
    } catch (error) {
      console.error('Failed to initialize renderer:', error);
      throw error;
    }
  }

  private updateCanvasSize(): void {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
  }

  private handleResize(): void {
    this.updateCanvasSize();
    this.rendererInstance.resize(this.canvas.width, this.canvas.height);
    this.events.emit('resize', {
      width: this.canvas.width,
      height: this.canvas.height,
    });
  }
  
  private setupMouseEvents(): void {
    const interactions = this.options.interactions ?? {
      enableZoom: true,
      enablePan: true,
      enableCrosshair: true,
    };
    
    // Mouse wheel for zoom
    if (interactions.enableZoom) {
      this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
    }
    
    // Mouse down for drag start
    if (interactions.enablePan) {
      this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
      this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
      window.addEventListener('mouseup', () => this.handleMouseUp());
    }
    
    // Mouse move for drag and crosshair
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    
    // Mouse enter/leave for crosshair
    if (interactions.enableCrosshair) {
      this.canvas.addEventListener('mouseenter', () => this.handleMouseEnter());
      this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
    }
  }
  
  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const layout = this.createGridLayout(rect);
    const area = getGridArea(x, y, layout, this.options.grid);
    
    // Calculate zoom factor
    const zoomSpeed = this.options.interactions?.zoomSpeed ?? 0.0002;
    const zoomFactor = this.clamp(Math.exp(e.deltaY * zoomSpeed), 0.05, 20);

    if (area === 'price-scale' && this.options.interactions?.enableYAxisScale !== false) {
      this.scaleYAxis(zoomFactor);
      return;
    }

    if (area !== 'plot' && area !== 'time-scale' && area !== 'bottom-control') {
      return;
    }

    this.zoomTimeAt(x, zoomFactor, layout);
  }

  private scaleYAxis(scaleFactor: number): void {
    const centerY = (this.viewState.dataMinY + this.viewState.dataMaxY) / 2;
    const halfRange = (this.viewState.dataMaxY - this.viewState.dataMinY) / 2;
    const nextHalfRange = halfRange * Math.max(0.05, scaleFactor);

    this.viewState.autoScaleY = false;
    this.viewState.dataMinY = centerY - nextHalfRange;
    this.viewState.dataMaxY = centerY + nextHalfRange;

    this.events.emit('zoom', {
      level: scaleFactor,
      centerX: (this.viewState.dataMinX + this.viewState.dataMaxX) / 2,
      centerY,
    });
  }

  private zoomTimeAt(x: number, zoomFactor: number, layout: CssGridLayout): void {
    const dataX = this.dataXAtCssX(x, layout);
    const rangeX = this.viewState.dataMaxX - this.viewState.dataMinX || 1;
    const newRangeX = rangeX * zoomFactor;
    const ratioX = (dataX - this.viewState.dataMinX) / rangeX;

    this.viewState.dataMinX = dataX - newRangeX * ratioX;
    this.viewState.dataMaxX = dataX + newRangeX * (1 - ratioX);

    this.events.emit('zoom', {
      level: 1 / zoomFactor,
      centerX: dataX,
      centerY: (this.viewState.dataMinY + this.viewState.dataMaxY) / 2,
    });
  }
  
  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return; // Only left mouse button
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const layout = this.createGridLayout(rect);
    const area = getGridArea(x, y, layout, this.options.grid);
    const interactions = this.options.interactions ?? {};

    if (area === 'bottom-control' || area === 'axis-corner' || area === 'outside') {
      this.viewState.dragMode = 'none';
      return;
    }
    
    if (area === 'price-scale' && interactions.enableYAxisScale !== false) {
      this.viewState.dragMode = 'price-scale';
      this.viewState.dragStart = { x: e.clientX, y: e.clientY };
      this.viewState.lastPriceScaleAnchorY = this.dataYAtCssY(y, layout);
      this.viewState.lastYRange = { 
        min: this.viewState.dataMinY, 
        max: this.viewState.dataMaxY 
      };
      this.canvas.style.cursor = 'ns-resize';
    } else if ((area === 'plot' || area === 'time-scale') && interactions.enablePan !== false) {
      this.viewState.dragMode = 'time-pan';
      this.viewState.dragStart = { x: e.clientX, y: e.clientY };
      this.viewState.lastDataX = this.viewState.dataMinX;
      this.canvas.style.cursor = 'grabbing';
    } else {
      this.viewState.dragMode = 'none';
    }
    
    e.preventDefault();
  }
  
  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const layout = this.createGridLayout(rect);
    const area = getGridArea(x, y, layout, this.options.grid);
    
    // Update mouse position
    this.mouseState.position = { x, y };
    this.mouseState.area = area;
    this.mouseState.isOverYAxis = area === 'price-scale';
    this.mouseState.isOverChart = area !== 'outside';
    
    // Calculate data position
    const dataX = this.dataXAtCssX(x, layout);
    const dataY = this.dataYAtCssY(y, layout);
    this.mouseState.dataPosition = { x: dataX, y: dataY };
    
    const interactions = this.options.interactions ?? {};
    
    // Handle Y-axis dragging
    if (this.viewState.dragMode === 'price-scale' && interactions.enableYAxisScale !== false) {
      const deltaY = e.clientY - this.viewState.dragStart.y;
      if (Math.abs(deltaY) < 0.5) {
        return;
      }
      
      const scaleSpeed = interactions.yAxisScaleSpeed ?? 1.6;
      const scaleFactor = Math.exp((deltaY / Math.max(1, layout.plot.height)) * scaleSpeed);
      
      const anchorY = this.viewState.lastPriceScaleAnchorY;
      const { min, max } = this.viewState.lastYRange;
      
      this.viewState.autoScaleY = false;
      this.viewState.dataMinY = anchorY - (anchorY - min) * scaleFactor;
      this.viewState.dataMaxY = anchorY + (max - anchorY) * scaleFactor;
      
      this.events.emit('zoom', {
        level: scaleFactor,
        centerX: (this.viewState.dataMinX + this.viewState.dataMaxX) / 2,
        centerY: anchorY,
      });
    }
    // Handle TradingView-style time pan
    else if (this.viewState.dragMode === 'time-pan' && interactions.enablePan !== false) {
      // Calculate drag delta
      const deltaX = e.clientX - this.viewState.dragStart.x;
      
      // Convert pixel delta to data delta
      const dataRangeX = this.viewState.dataMaxX - this.viewState.dataMinX;
      
      const panSpeed = interactions.panSpeed ?? 1;
      const dataDeltaX = (deltaX / Math.max(1, layout.plot.width)) * dataRangeX * panSpeed;
      
      // Update view bounds
      this.viewState.dataMinX = this.viewState.lastDataX - dataDeltaX;
      this.viewState.dataMaxX = this.viewState.dataMinX + dataRangeX;
      
      this.events.emit('pan', {
        deltaX: -dataDeltaX,
        deltaY: 0,
      });
    } else if (this.viewState.dragMode === 'none') {
      // Update cursor based on position
      this.updateCursorForArea(area);
      
      // Emit hover event
      this.events.emit('hover', {
        x,
        y,
        dataX,
        dataY,
      });
    }
  }
  
  private handleMouseUp(): void {
    this.viewState.dragMode = 'none';
    
    // Update cursor based on current position
    this.updateCursorForArea(this.mouseState.area);
  }
  
  private handleMouseEnter(): void {
    this.mouseState.isOverChart = true;
    const interactions = this.options.interactions ?? {};
    if (interactions.enableCrosshair !== false) {
      this.mouseState.showCrosshair = true;
      if (this.viewState.dragMode === 'none') {
        this.canvas.style.cursor = 'crosshair';
      }
    }
  }
  
  private handleMouseLeave(): void {
    this.mouseState.isOverChart = false;
    this.mouseState.isOverYAxis = false;
    this.mouseState.showCrosshair = false;
    this.mouseState.area = 'outside';
    this.viewState.dragMode = 'none';
    this.canvas.style.cursor = 'default';
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const layout = this.createGridLayout(rect);
    const control = getBottomControlAt(x, y, layout.plot);

    if (control && resolveGridOptions(this.options.grid).bottomControls) {
      this.handleGridControl(control, layout);
      e.preventDefault();
      return;
    }

    const area = getGridArea(x, y, layout, this.options.grid);
    const dataX = this.dataXAtCssX(x, layout);
    const dataY = this.dataYAtCssY(y, layout);

    this.events.emit('click', {
      x,
      y,
      dataX,
      dataY,
      area,
    });
  }

  private handleGridControl(control: ChartGridControlId, layout: CssGridLayout): void {
    const centerX = layout.plot.x + layout.plot.width / 2;

    switch (control) {
      case 'zoom-out':
        this.zoomTimeAt(centerX, 1.1, layout);
        break;
      case 'zoom-in':
        this.zoomTimeAt(centerX, 0.9, layout);
        break;
      case 'scroll-left':
        this.pan(-0.12);
        break;
      case 'scroll-right':
        this.pan(0.12);
        break;
      case 'reset':
        this.resetView();
        break;
      case 'latest':
        this.scrollToLatest();
        break;
    }
  }

  private createGridLayout(rect: DOMRect): CssGridLayout {
    return createCssGridLayout(rect.width, rect.height, this.options.grid);
  }

  private dataXAtCssX(x: number, layout: CssGridLayout): number {
    const range = this.viewState.dataMaxX - this.viewState.dataMinX || 1;
    const localX = this.clamp(x - layout.plot.x, 0, layout.plot.width);
    return this.viewState.dataMinX + (localX / Math.max(1, layout.plot.width)) * range;
  }

  private dataYAtCssY(y: number, layout: CssGridLayout): number {
    const range = this.viewState.dataMaxY - this.viewState.dataMinY || 1;
    const localY = this.clamp(y - layout.plot.y, 0, layout.plot.height);
    return this.viewState.dataMaxY - (localY / Math.max(1, layout.plot.height)) * range;
  }

  private updateCursorForArea(area: GridHitArea): void {
    const interactions = this.options.interactions ?? {};

    if (area === 'bottom-control') {
      this.canvas.style.cursor = 'pointer';
    } else if (area === 'price-scale' && interactions.enableYAxisScale !== false) {
      this.canvas.style.cursor = 'ns-resize';
    } else if (area === 'plot' && interactions.enableCrosshair !== false) {
      this.canvas.style.cursor = 'crosshair';
    } else {
      this.canvas.style.cursor = 'default';
    }
  }

  private scrollToLatest(): void {
    const latestX = this.getLatestDataX();
    if (latestX === null) {
      return;
    }

    const rangeX = this.viewState.dataMaxX - this.viewState.dataMinX || 1;
    this.viewState.dataMaxX = latestX + this.getRightOffsetRange();
    this.viewState.dataMinX = this.viewState.dataMaxX - rangeX;
    if (this.viewState.autoScaleY) {
      this.autoFitYAxis();
    }
  }

  private getLatestDataX(): number | null {
    let latest = -Infinity;

    for (const series of this.series.values()) {
      if (!Array.isArray(series.options.data)) {
        continue;
      }

      for (const point of series.options.data as unknown[]) {
        if (typeof point !== 'object' || point === null) {
          continue;
        }

        const time = (point as NumericRecord)['time'];
        if (typeof time === 'number' && Number.isFinite(time)) {
          latest = Math.max(latest, time);
        }
      }
    }

    return latest === -Infinity ? null : latest;
  }

  private getRightOffsetRange(): number {
    const timeStep = this.getPrimaryTimeStep() ?? 1;
    return timeStep * resolveGridOptions(this.options.grid).rightOffsetBars;
  }

  private getPrimaryTimeStep(): number | null {
    const times: number[] = [];

    for (const series of this.series.values()) {
      if (!Array.isArray(series.options.data)) {
        continue;
      }

      for (const point of series.options.data as unknown[]) {
        if (typeof point !== 'object' || point === null) {
          continue;
        }

        const time = (point as NumericRecord)['time'];
        if (typeof time === 'number' && Number.isFinite(time)) {
          times.push(time);
        }
      }
    }

    if (times.length < 2) {
      return null;
    }

    times.sort((a, b) => a - b);
    let minStep = Infinity;
    for (let index = 1; index < times.length; index += 1) {
      const current = times[index];
      const previous = times[index - 1];
      if (current === undefined || previous === undefined) {
        continue;
      }

      const step = current - previous;
      if (step > 0) {
        minStep = Math.min(minStep, step);
      }
    }

    return Number.isFinite(minStep) ? minStep : null;
  }

  private clamp(value: number, min: number, max: number): number {
    if (max < min) {
      return min;
    }

    return Math.min(Math.max(value, min), max);
  }

  private startRenderLoop(): void {
    const render = (): void => {
      this.render();
      this.animationFrame = requestAnimationFrame(render);
    };
    render();
  }

  private render(): void {
    const renderScene = {
      viewport: {
        x: 0,
        y: 0,
        width: this.canvas.width,
        height: this.canvas.height,
        dataMinX: this.viewState.dataMinX,
        dataMaxX: this.viewState.dataMaxX,
        dataMinY: this.viewState.dataMinY,
        dataMaxY: this.viewState.dataMaxY,
      },
      series: Array.from(this.series.values()).map((series) => this.createRenderableSeries(series)),
      overlays: this.createOverlays(),
      theme: this.createRenderTheme(),
      grid: resolveGridOptions(this.options.grid),
      mouseState: this.mouseState,
    };
    
    this.rendererInstance.render(renderScene);
  }

  private createRenderableSeries(series: SeriesImpl<SeriesOptions>): RenderableSeries {
    const options = series.options;

    return {
      type: series.type,
      name: options.name,
      data: this.encodeSeriesData(options),
      sourceData: options.data,
      style: this.createSeriesStyle(options),
      visible: options.visible !== false,
    };
  }

  private createSeriesStyle(options: SeriesOptions): RenderSeriesStyle {
    const style: RenderSeriesStyle = {};

    if (typeof options.color === 'string') {
      style.color = options.color;
    }
    if ('lineWidth' in options && typeof options.lineWidth === 'number') {
      style.lineWidth = options.lineWidth;
    }
    if ('upColor' in options && typeof options.upColor === 'string') {
      style.upColor = options.upColor;
    }
    if ('downColor' in options && typeof options.downColor === 'string') {
      style.downColor = options.downColor;
    }
    if ('wickUpColor' in options && typeof options.wickUpColor === 'string') {
      style.wickUpColor = options.wickUpColor;
    }
    if ('wickDownColor' in options && typeof options.wickDownColor === 'string') {
      style.wickDownColor = options.wickDownColor;
    }

    return style;
  }

  private createRenderTheme(): RenderTheme {
    const theme = this.options.theme;

    if (typeof theme === 'object') {
      return {
        backgroundColor: theme.background,
        gridColor: theme.grid,
        textColor: theme.text,
        fontFamily: 'system-ui',
        fontSize: 12,
      };
    }

    return theme === 'dark' ? DARK_RENDER_THEME : LIGHT_RENDER_THEME;
  }

  private getCrosshairColor(): string {
    const theme = this.options.theme;
    if (typeof theme === 'object') {
      return theme.crosshair;
    }

    return theme === 'dark' ? 'rgba(160, 160, 160, 0.9)' : 'rgba(120, 123, 134, 0.85)';
  }

  private encodeSeriesData(options: SeriesOptions): ArrayBuffer {
    switch (options.type) {
      case 'candlestick':
        return this.encodeNumericRows(options.data, ['time', 'open', 'high', 'low', 'close', 'volume']);
      case 'line':
        return this.encodeNumericRows(options.data, ['time', 'value']);
      case 'bar':
      case 'volume':
        return this.encodeNumericRows(options.data, ['time', 'value', 'colorCode']);
    }
  }

  private encodeNumericRows(data: readonly unknown[], fields: readonly string[]): ArrayBuffer {
    const bytesPerValue = Float32Array.BYTES_PER_ELEMENT;
    const buffer = new ArrayBuffer(data.length * fields.length * bytesPerValue);
    const view = new DataView(buffer);
    let offset = 0;

    for (const point of data) {
      for (const field of fields) {
        view.setFloat32(offset, this.readNumberField(point, field), true);
        offset += bytesPerValue;
      }
    }

    return buffer;
  }

  private readNumberField(point: unknown, field: string): number {
    if (typeof point !== 'object' || point === null) {
      return 0;
    }

    const value = (point as NumericRecord)[field];
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }
  
  private createOverlays(): any[] {
    const overlays: any[] = [];
    
    // Add crosshair overlay if enabled and mouse is over chart
    if (
      this.mouseState.showCrosshair &&
      this.mouseState.isOverChart &&
      this.mouseState.area === 'plot'
    ) {
      overlays.push({
        type: 'crosshair',
        data: {
          x: this.mouseState.position.x,
          y: this.mouseState.position.y,
          dataX: this.mouseState.dataPosition.x,
          dataY: this.mouseState.dataPosition.y,
          snapToCandle: this.options.interactions?.snapToCandle ?? false,
        },
        style: {
          color: this.getCrosshairColor(),
          lineWidth: 1,
          lineDash: [4, 4],
        },
      });
    }
    
    return overlays;
  }

  resize(width: number, height: number): void {
    this.container.style.width = `${width}px`;
    this.container.style.height = `${height}px`;
    this.handleResize();
  }

  destroy(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    this.resizeObserver.disconnect();
    this.rendererInstance.destroy();
    this.canvas.remove();
    this.events.clear();
    this.series.clear();
    
    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = null;
    }
  }
  
  // Zoom and pan control methods
  setVisibleRange(from: number, to: number): void {
    this.viewState.dataMinX = from;
    this.viewState.dataMaxX = to;
    
    if (this.viewState.autoScaleY) {
      this.autoFitYAxis();
    }
  }
  
  setYAxisRange(min: number, max: number): void {
    this.viewState.autoScaleY = false;
    this.viewState.dataMinY = min;
    this.viewState.dataMaxY = max;
  }
  
  zoomIn(factor: number = 0.9): void {
    const centerX = (this.viewState.dataMinX + this.viewState.dataMaxX) / 2;
    const centerY = (this.viewState.dataMinY + this.viewState.dataMaxY) / 2;
    
    const rangeX = this.viewState.dataMaxX - this.viewState.dataMinX;
    const rangeY = this.viewState.dataMaxY - this.viewState.dataMinY;
    
    const newRangeX = rangeX * factor;
    const newRangeY = rangeY * factor;
    
    this.viewState.dataMinX = centerX - newRangeX / 2;
    this.viewState.dataMaxX = centerX + newRangeX / 2;
    this.viewState.dataMinY = centerY - newRangeY / 2;
    this.viewState.dataMaxY = centerY + newRangeY / 2;
    
    this.events.emit('zoom', {
      level: 1 / factor,
      centerX,
      centerY,
    });
  }
  
  zoomOut(factor: number = 1.1): void {
    this.zoomIn(factor);
  }
  
  pan(offset: number): void {
    const range = this.viewState.dataMaxX - this.viewState.dataMinX;
    const delta = range * offset;
    
    this.viewState.dataMinX += delta;
    this.viewState.dataMaxX += delta;
    
    this.events.emit('pan', {
      deltaX: delta,
      deltaY: 0,
    });
  }
  
  resetView(): void {
    // Find data bounds from all series
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const series of this.series.values()) {
      if (Array.isArray(series.options.data)) {
        const data = series.options.data as any[];
        for (const point of data) {
          if (point.time !== undefined) {
            minX = Math.min(minX, point.time);
            maxX = Math.max(maxX, point.time);
          }
          if (point.value !== undefined) {
            minY = Math.min(minY, point.value);
            maxY = Math.max(maxY, point.value);
          }
          if (point.high !== undefined && point.low !== undefined) {
            minY = Math.min(minY, point.low);
            maxY = Math.max(maxY, point.high);
          }
        }
      }
    }
    
    if (minX !== Infinity) {
      const rangeX = maxX - minX;
      const rangeY = maxY - minY;
      const timeStep = this.getPrimaryTimeStep() ?? (rangeX > 0 ? rangeX : 1);
      const paddingX = rangeX > 0 ? Math.min(timeStep, rangeX * 0.05) : timeStep;
      const rightOffset = timeStep * resolveGridOptions(this.options.grid).rightOffsetBars;
      const paddingY = rangeY > 0 ? rangeY * 0.1 : Math.max(Math.abs(maxY) * 0.01, 1);
      
      this.viewState.autoScaleY = true;
      this.viewState.dataMinX = minX - paddingX;
      this.viewState.dataMaxX = maxX + rightOffset;
      this.viewState.dataMinY = minY - paddingY;
      this.viewState.dataMaxY = maxY + paddingY;
    } else {
      // Default view
      this.viewState.autoScaleY = true;
      this.viewState.dataMinX = 0;
      this.viewState.dataMaxX = 100;
      this.viewState.dataMinY = 0;
      this.viewState.dataMaxY = 100;
    }
  }
  
  private autoFitYAxis(): void {
    // Find min/max Y values in visible range
    let minY = Infinity, maxY = -Infinity;
    
    for (const series of this.series.values()) {
      if (Array.isArray(series.options.data)) {
        const data = series.options.data as any[];
        for (const point of data) {
          const time = point.time || point.x;
          if (time >= this.viewState.dataMinX && time <= this.viewState.dataMaxX) {
            if (point.value !== undefined) {
              minY = Math.min(minY, point.value);
              maxY = Math.max(maxY, point.value);
            }
            if (point.high !== undefined && point.low !== undefined) {
              minY = Math.min(minY, point.low);
              maxY = Math.max(maxY, point.high);
            }
          }
        }
      }
    }
    
    if (minY !== Infinity) {
      const rangeY = maxY - minY;
      const padding = rangeY > 0 ? rangeY * 0.1 : Math.max(Math.abs(maxY) * 0.01, 1);
      this.viewState.dataMinY = minY - padding;
      this.viewState.dataMaxY = maxY + padding;
    }
  }
  
  updateInteractions(options: Partial<InteractionOptions>): void {
    // Merge with existing options
    this.options = {
      ...this.options,
      interactions: {
        ...this.options.interactions,
        ...options,
      },
    };
    
    // Update cursor if needed
    if (this.viewState.dragMode === 'none' && this.mouseState.isOverChart) {
      this.updateCursorForArea(this.mouseState.area);
    }
  }

  addSeries<T extends SeriesOptions>(options: T): Series<T> {
    const id = `series-${this.nextSeriesId++}`;
    const series = new SeriesImpl(id, options, this);
    this.series.set(id, series as unknown as SeriesImpl<SeriesOptions>);
    this.resetView();
    return series;
  }

  removeSeries(series: Series<SeriesOptions>): void {
    this.series.delete(series.id);
  }

  streamData(_options: StreamingOptions): void {
    // TODO: Implement streaming
  }

  connect(options: ConnectionOptions): void {
    // Close existing connection
    if (this.wsClient) {
      this.wsClient.close();
    }
    
    // Create new WebSocket client
    this.wsClient = new WebSocketClient(options);
    
    // Handle messages
    this.wsClient.on('message', (data) => {
      if (data instanceof ArrayBuffer) {
        const message = BinaryProtocol.decodeMessage(data);
        if (message && message.type === MessageType.Update) {
          this.handleRealtimeUpdate(message);
        }
      } else {
        // Handle JSON messages
        try {
          const message = JSON.parse(data);
          this.handleJSONUpdate(message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      }
    });
    
    // Handle connection events
    this.wsClient.on('open', () => {
      console.log('WebSocket connected');
      // Subscribe to symbols from all series
      const symbols: string[] = [];
      for (const series of this.series.values()) {
        if (series.options.name) {
          symbols.push(series.options.name);
        }
      }
      if (symbols.length > 0 && options.protocol === 'binary') {
        const subscribeMsg = BinaryProtocol.encodeSubscribe(symbols, ['ohlc']);
        this.wsClient?.send(subscribeMsg);
      }
    });
    
    this.wsClient.on('close', () => {
      console.log('WebSocket disconnected');
    });
    
    this.wsClient.on('reconnecting', ({ attempt, delay }) => {
      console.log(`Reconnecting... Attempt ${attempt}, delay ${delay}ms`);
    });
    
    // Connect
    this.wsClient.connect();
  }
  
  private handleRealtimeUpdate(message: any): void {
    // Find series by symbol
    for (const series of this.series.values()) {
      if (series.options.name === message.symbol) {
        // Update series data with new values
        const data = message.data;
        if (data.close !== undefined) {
          // TODO: Update series data efficiently
          console.log('Realtime update:', message.symbol, data);
        }
      }
    }
  }
  
  private handleJSONUpdate(message: any): void {
    // Handle JSON format updates
    if (message.type === 'update' && message.data) {
      this.handleRealtimeUpdate(message);
    }
  }

  on<K extends keyof ChartEventMap>(event: K, handler: ChartEventMap[K]): void {
    this.events.on(event, handler as EventHandler<ChartEventPayloadMap[K]>);
  }

  off<K extends keyof ChartEventMap>(event: K, handler: ChartEventMap[K]): void {
    this.events.off(event, handler as EventHandler<ChartEventPayloadMap[K]>);
  }
}

class SeriesImpl<T extends SeriesOptions> implements Series<T> {
  readonly type: T['type'];
  readonly id: string;
  
  options: T;
  private readonly chart: ChartImpl;

  constructor(id: string, options: T, chart: ChartImpl) {
    this.id = id;
    this.type = options.type;
    this.options = options;
    this.chart = chart;
  }

  setData(data: T['data']): void {
    (this.options as { data: T['data'] }).data = data;
    this.chart.resetView();
  }

  update(options: Partial<T>): void {
    this.options = { ...this.options, ...options };
  }

  remove(): void {
    this.chart.removeSeries(this);
  }
  
  appendData(data: T['data'][0]): void {
    if (Array.isArray(this.options.data)) {
      (this.options.data as any[]).push(data);
      this.chart.resetView();
    }
  }
  
  updateLast(data: Partial<T['data'][0]>): void {
    if (Array.isArray(this.options.data) && this.options.data.length > 0) {
      const lastIndex = this.options.data.length - 1;
      (this.options.data as any[])[lastIndex] = {
        ...(this.options.data as any[])[lastIndex],
        ...data
      };
      this.chart.resetView();
    }
  }
}
