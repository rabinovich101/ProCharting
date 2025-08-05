import type { Chart, ChartOptions, ChartEventMap, ConnectionOptions, Series, SeriesOptions } from '@procharting/types';
import type { StreamingOptions } from '@procharting/types';
import { EventEmitter } from '@procharting/utils';
import { RendererFactory } from './renderer-factory';
import type { Renderer } from '@procharting/types';
import { WebSocketClient } from './websocket/websocket-client';
import { BinaryProtocol, MessageType } from './websocket/binary-protocol';

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
  readonly renderer: 'webgpu' | 'webgl2' | 'canvas2d';
  
  private readonly events = new EventEmitter<ChartEventMap>();
  private readonly canvas: HTMLCanvasElement;
  private readonly rendererInstance: Renderer;
  private readonly series = new Map<string, Series<SeriesOptions>>();
  private nextSeriesId = 0;
  private animationFrame: number | null = null;
  private resizeObserver: ResizeObserver;
  private wsClient: WebSocketClient | null = null;
  private streamingData = new Map<string, Float32Array>();
  
  // View state for zoom/pan
  private viewState = {
    dataMinX: 0,
    dataMaxX: 100,
    dataMinY: 0,
    dataMaxY: 100,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    lastDataX: 0,
    lastDataY: 0,
  };
  
  // Mouse state for interactions
  private mouseState = {
    position: { x: 0, y: 0 },
    dataPosition: { x: 0, y: 0 },
    showCrosshair: false,
    isOverChart: false,
  };

  constructor(container: HTMLElement, private readonly options: ChartOptions) {
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
      enableCrosshair: true 
    };
    if (interactions.enableZoom || interactions.enablePan || interactions.enableCrosshair) {
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
    
    // Calculate zoom factor
    const zoomSpeed = this.options.interactions?.zoomSpeed ?? 0.1;
    const zoomFactor = e.deltaY > 0 ? 1 + zoomSpeed : 1 - zoomSpeed;
    
    // Get data coordinates at mouse position
    const dataX = this.viewState.dataMinX + (x / rect.width) * (this.viewState.dataMaxX - this.viewState.dataMinX);
    const dataY = this.viewState.dataMaxY - (y / rect.height) * (this.viewState.dataMaxY - this.viewState.dataMinY);
    
    // Apply zoom
    const rangeX = this.viewState.dataMaxX - this.viewState.dataMinX;
    const rangeY = this.viewState.dataMaxY - this.viewState.dataMinY;
    
    const newRangeX = rangeX * zoomFactor;
    const newRangeY = rangeY * zoomFactor;
    
    // Calculate new bounds to zoom towards mouse position
    const ratioX = (dataX - this.viewState.dataMinX) / rangeX;
    const ratioY = (dataY - this.viewState.dataMinY) / rangeY;
    
    this.viewState.dataMinX = dataX - newRangeX * ratioX;
    this.viewState.dataMaxX = dataX + newRangeX * (1 - ratioX);
    this.viewState.dataMinY = dataY - newRangeY * ratioY;
    this.viewState.dataMaxY = dataY + newRangeY * (1 - ratioY);
    
    this.events.emit('zoom', {
      level: 1 / zoomFactor,
      centerX: dataX,
      centerY: dataY,
    });
  }
  
  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return; // Only left mouse button
    
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    this.viewState.isDragging = true;
    this.viewState.dragStart = { x: e.clientX, y: e.clientY };
    this.viewState.lastDataX = this.viewState.dataMinX;
    this.viewState.lastDataY = this.viewState.dataMinY;
    
    this.canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
  
  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update mouse position
    this.mouseState.position = { x, y };
    
    // Calculate data position
    const dataX = this.viewState.dataMinX + (x / rect.width) * (this.viewState.dataMaxX - this.viewState.dataMinX);
    const dataY = this.viewState.dataMaxY - (y / rect.height) * (this.viewState.dataMaxY - this.viewState.dataMinY);
    this.mouseState.dataPosition = { x: dataX, y: dataY };
    
    const interactions = this.options.interactions ?? {};
    
    if (this.viewState.isDragging && interactions.enablePan !== false) {
      // Calculate drag delta
      const deltaX = e.clientX - this.viewState.dragStart.x;
      const deltaY = e.clientY - this.viewState.dragStart.y;
      
      // Convert pixel delta to data delta
      const dataRangeX = this.viewState.dataMaxX - this.viewState.dataMinX;
      const dataRangeY = this.viewState.dataMaxY - this.viewState.dataMinY;
      
      const panSpeed = interactions.panSpeed ?? 1;
      const dataDeltaX = (deltaX / rect.width) * dataRangeX * panSpeed;
      const dataDeltaY = (deltaY / rect.height) * dataRangeY * panSpeed;
      
      // Update view bounds
      this.viewState.dataMinX = this.viewState.lastDataX - dataDeltaX;
      this.viewState.dataMaxX = this.viewState.dataMinX + dataRangeX;
      this.viewState.dataMinY = this.viewState.lastDataY + dataDeltaY;
      this.viewState.dataMaxY = this.viewState.dataMinY + dataRangeY;
      
      this.events.emit('pan', {
        deltaX: -dataDeltaX,
        deltaY: dataDeltaY,
      });
    } else if (!this.viewState.isDragging) {
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
    this.viewState.isDragging = false;
    this.canvas.style.cursor = this.mouseState.isOverChart ? 'crosshair' : 'default';
  }
  
  private handleMouseEnter(): void {
    this.mouseState.isOverChart = true;
    const interactions = this.options.interactions ?? {};
    if (interactions.enableCrosshair !== false) {
      this.mouseState.showCrosshair = true;
      if (!this.viewState.isDragging) {
        this.canvas.style.cursor = 'crosshair';
      }
    }
  }
  
  private handleMouseLeave(): void {
    this.mouseState.isOverChart = false;
    this.mouseState.showCrosshair = false;
    this.viewState.isDragging = false;
    this.canvas.style.cursor = 'default';
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
      series: Array.from(this.series.values()).map(s => ({
        type: s.type,
        data: new ArrayBuffer(0), // TODO: Convert series data to binary
        style: {},
        visible: true,
      })),
      overlays: this.createOverlays(),
      theme: {
        backgroundColor: '#ffffff',
        gridColor: '#e0e0e0',
        textColor: '#333333',
        fontFamily: 'system-ui',
        fontSize: 12,
      },
      mouseState: this.mouseState,
    };
    
    this.rendererInstance.render(renderScene);
  }
  
  private createOverlays(): any[] {
    const overlays: any[] = [];
    
    // Add crosshair overlay if enabled and mouse is over chart
    if (this.mouseState.showCrosshair && this.mouseState.isOverChart) {
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
          color: '#999999',
          lineWidth: 1,
          lineDash: [5, 5],
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
    
    // Auto-fit Y axis based on visible data
    this.autoFitYAxis();
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
      const paddingX = (maxX - minX) * 0.05;
      const paddingY = (maxY - minY) * 0.1;
      
      this.viewState.dataMinX = minX - paddingX;
      this.viewState.dataMaxX = maxX + paddingX;
      this.viewState.dataMinY = minY - paddingY;
      this.viewState.dataMaxY = maxY + paddingY;
    } else {
      // Default view
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
      const padding = (maxY - minY) * 0.1;
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
    if (!this.viewState.isDragging && this.mouseState.isOverChart) {
      this.canvas.style.cursor = options.enableCrosshair ? 'crosshair' : 'default';
    }
  }

  addSeries<T extends SeriesOptions>(options: T): Series<T> {
    const id = `series-${this.nextSeriesId++}`;
    const series = new SeriesImpl(id, options, this);
    this.series.set(id, series as Series<SeriesOptions>);
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
    this.events.on(event, handler);
  }

  off<K extends keyof ChartEventMap>(event: K, handler: ChartEventMap[K]): void {
    this.events.off(event, handler);
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
    this.options.data = data;
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
    }
  }
  
  updateLast(data: Partial<T['data'][0]>): void {
    if (Array.isArray(this.options.data) && this.options.data.length > 0) {
      const lastIndex = this.options.data.length - 1;
      (this.options.data as any[])[lastIndex] = {
        ...(this.options.data as any[])[lastIndex],
        ...data
      };
    }
  }
}