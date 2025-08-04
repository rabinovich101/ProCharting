export interface BinanceWsKline {
  t: number;  // Kline start time
  T: number;  // Kline close time
  s: string;  // Symbol
  i: string;  // Interval
  f: number;  // First trade ID
  L: number;  // Last trade ID
  o: string;  // Open price
  c: string;  // Close price
  h: string;  // High price
  l: string;  // Low price
  v: string;  // Base asset volume
  n: number;  // Number of trades
  x: boolean; // Is this kline closed?
  q: string;  // Quote asset volume
  V: string;  // Taker buy base asset volume
  Q: string;  // Taker buy quote asset volume
  B: string;  // Ignore
}

export interface BinanceWsMessage {
  e: string;  // Event type
  E: number;  // Event time
  s: string;  // Symbol
  k: BinanceWsKline;
}

export class BinanceWebSocket {
  private ws: WebSocket | null = null;
  private symbol: string;
  private interval: string;
  private onUpdate?: (kline: BinanceWsKline) => void;
  private reconnectTimeout?: NodeJS.Timeout;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(symbol: string = 'btcusdt', interval: string = '1m') {
    this.symbol = symbol.toLowerCase();
    this.interval = interval;
  }

  connect(onUpdate: (kline: BinanceWsKline) => void): void {
    this.onUpdate = onUpdate;
    this.createWebSocket();
  }

  private createWebSocket(): void {
    const wsUrl = `wss://stream.binance.com:9443/ws/${this.symbol}@kline_${this.interval}`;
    
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Binance WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data: BinanceWsMessage = JSON.parse(event.data);
          if (data.e === 'kline' && this.onUpdate) {
            this.onUpdate(data.k);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.handleReconnect();
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.handleReconnect();
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);
      
      this.reconnectTimeout = setTimeout(() => {
        this.createWebSocket();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  changeSymbol(symbol: string, interval: string): void {
    this.symbol = symbol.toLowerCase();
    this.interval = interval;
    
    // Reconnect with new symbol/interval
    this.disconnect();
    if (this.onUpdate) {
      this.connect(this.onUpdate);
    }
  }
}