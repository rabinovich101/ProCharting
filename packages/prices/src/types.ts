export type PriceProviderName = 'default' | 'custom' | 'tradingview-mcp';

export type PriceInterval =
  | '1m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '1d'
  | '1wk'
  | '1mo';

export type PriceTimeframe =
  | '1d'
  | '5d'
  | '1mo'
  | '3mo'
  | '6mo'
  | '1y'
  | '2y'
  | '5y'
  | 'max';

export type PriceIntervalInput = PriceInterval | (string & { readonly __customPriceInterval?: never });
export type PriceTimeframeInput = PriceTimeframe | (string & { readonly __customPriceTimeframe?: never });

export interface PriceCandle {
  readonly timestamp: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume?: number;
}

export interface LatestPrice {
  readonly symbol: string;
  readonly price: number;
  readonly timestamp: number;
  readonly source: string;
}

export interface PriceRequest {
  readonly symbol: string;
  readonly timeframe?: PriceTimeframeInput;
  readonly interval?: PriceIntervalInput;
  readonly from?: Date | number | string;
  readonly to?: Date | number | string;
  readonly limit?: number;
}

export type PriceQueryOptions = Omit<PriceRequest, 'symbol'>;

export interface PriceProvider {
  readonly source: string;
  getPrices(request: PriceRequest): Promise<PriceCandle[]>;
  getLatestPrice?(request: PriceRequest): Promise<LatestPrice>;
}

export type PriceApiFunction = (request: PriceRequest) => unknown;

export interface FetchResponseLike {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  text(): Promise<string>;
}

export type FetchLike = (input: string) => Promise<FetchResponseLike>;

export interface DefaultProviderOptions {
  readonly fetch?: FetchLike;
  readonly baseUrl?: string;
  readonly source?: string;
  readonly symbolMap?: Record<string, string>;
}

export interface TradingViewMcpClient {
  yahooPrice?(request: { readonly symbol: string }): Promise<unknown>;
  getCandles?(request: PriceRequest): Promise<unknown>;
}

export interface BasePriceClientOptions {
  readonly symbol: string;
  readonly timeframe?: PriceTimeframeInput;
  readonly interval?: PriceIntervalInput;
}

export interface DefaultPriceClientOptions extends BasePriceClientOptions {
  readonly provider?: 'default';
  readonly defaultProvider?: DefaultProviderOptions;
}

export interface CustomPriceClientOptions extends BasePriceClientOptions {
  readonly provider: 'custom';
  readonly pricesApi: PriceApiFunction;
  readonly source?: string;
}

export interface TradingViewMcpPriceClientOptions extends BasePriceClientOptions {
  readonly provider: 'tradingview-mcp';
  readonly mcpClient: TradingViewMcpClient;
  readonly source?: string;
}

export type CreatePriceClientOptions =
  | DefaultPriceClientOptions
  | CustomPriceClientOptions
  | TradingViewMcpPriceClientOptions;

export interface PriceClient {
  readonly symbol: string;
  readonly provider: PriceProviderName;
  getPrices(options?: PriceQueryOptions): Promise<PriceCandle[]>;
  getLatestPrice(options?: PriceQueryOptions): Promise<LatestPrice>;
}
