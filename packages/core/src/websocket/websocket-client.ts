import type { ConnectionOptions } from '@procharting/types';
import { EventEmitter } from '@procharting/utils';

type WebSocketEvents = {
  open: Event;
  close: CloseEvent;
  error: Event;
  message: ArrayBuffer | string;
  reconnecting: { attempt: number; delay: number };
};

export class WebSocketClient extends EventEmitter<WebSocketEvents> {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private isClosing = false;
  private messageQueue: ArrayBuffer[] = [];
  private decoder?: TextDecoder;
  
  constructor(private options: ConnectionOptions) {
    super();
    if (this.options.protocol === 'json') {
      this.decoder = new TextDecoder();
    }
  }
  
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    
    this.isClosing = false;
    this.createWebSocket();
  }
  
  private createWebSocket(): void {
    try {
      this.ws = new WebSocket(this.options.url);
      this.ws.binaryType = 'arraybuffer';
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
    } catch (error) {
      this.handleError(new Event('error'));
    }
  }
  
  private handleOpen(event: Event): void {
    this.reconnectAttempts = 0;
    this.flushMessageQueue();
    this.emit('open', event);
  }
  
  private handleClose(event: CloseEvent): void {
    this.ws = null;
    this.emit('close', event);
    
    if (!this.isClosing && this.shouldReconnect()) {
      this.scheduleReconnect();
    }
  }
  
  private handleError(event: Event): void {
    this.emit('error', event);
  }
  
  private async handleMessage(event: MessageEvent): Promise<void> {
    let data: ArrayBuffer | string = event.data;
    
    // Handle compression if enabled
    if (this.options.compression && this.options.compression !== 'none') {
      data = await this.decompress(data as ArrayBuffer);
    }
    
    // Convert to appropriate format
    if (this.options.protocol === 'json' && data instanceof ArrayBuffer) {
      data = this.decoder!.decode(data);
    }
    
    this.emit('message', data);
  }
  
  private async decompress(data: ArrayBuffer): Promise<ArrayBuffer> {
    switch (this.options.compression) {
      case 'gzip': {
        const stream = new Response(data).body!;
        const decompressed = stream.pipeThrough(new DecompressionStream('gzip'));
        const buffer = await new Response(decompressed).arrayBuffer();
        return buffer;
      }
      case 'zstd':
        // TODO: Implement zstd decompression
        console.warn('zstd compression not yet implemented');
        return data;
      default:
        return data;
    }
  }
  
  send(data: ArrayBuffer | string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      // Queue messages if not connected
      if (data instanceof ArrayBuffer) {
        this.messageQueue.push(data);
      } else {
        this.messageQueue.push(new TextEncoder().encode(data));
      }
    }
  }
  
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift()!;
      this.ws.send(message);
    }
  }
  
  close(): void {
    this.isClosing = true;
    
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.messageQueue = [];
  }
  
  private shouldReconnect(): boolean {
    const reconnect = this.options.reconnect;
    if (!reconnect) return false;
    
    const maxAttempts = reconnect.attempts ?? Infinity;
    return this.reconnectAttempts < maxAttempts;
  }
  
  private scheduleReconnect(): void {
    const reconnect = this.options.reconnect!;
    const baseDelay = reconnect.delay ?? 1000;
    const maxDelay = reconnect.maxDelay ?? 30000;
    
    let delay: number;
    if (reconnect.backoff === 'exponential') {
      delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts), maxDelay);
    } else {
      delay = Math.min(baseDelay * (this.reconnectAttempts + 1), maxDelay);
    }
    
    this.reconnectAttempts++;
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });
    
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.createWebSocket();
    }, delay);
  }
  
  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }
  
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}