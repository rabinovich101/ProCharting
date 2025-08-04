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

  constructor(container: HTMLElement, options: ChartOptions) {
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
        dataMinX: 0,
        dataMaxX: 100,
        dataMinY: 0,
        dataMaxY: 100,
      },
      series: Array.from(this.series.values()).map(s => ({
        type: s.type,
        data: new ArrayBuffer(0), // TODO: Convert series data to binary
        style: {},
        visible: true,
      })),
      overlays: [],
      theme: {
        backgroundColor: '#ffffff',
        gridColor: '#e0e0e0',
        textColor: '#333333',
        fontFamily: 'system-ui',
        fontSize: 12,
      },
    };
    
    this.rendererInstance.render(renderScene);
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
}