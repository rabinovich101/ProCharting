import { ProviderConfigurationError } from './errors.js';
import { latestPriceFromCandles } from './normalize.js';
import { CustomPriceProvider } from './providers/custom-provider.js';
import { DefaultPriceProvider } from './providers/default-provider.js';
import { TradingViewMcpProvider } from './providers/tradingview-mcp-provider.js';
import type {
  CreatePriceClientOptions,
  PriceClient,
  PriceProvider,
  PriceProviderName,
  PriceQueryOptions,
  PriceRequest
} from './types.js';
import { normalizeSymbolInput, validatePriceQueryOptions } from './validation.js';

export function createPriceClient(options: CreatePriceClientOptions): PriceClient {
  const symbol = normalizeSymbolInput(options.symbol);
  const providerName = resolveProviderName(options);
  const provider = createProvider(options, providerName);

  return new PriceClientImpl(symbol, providerName, provider, {
    interval: options.interval,
    timeframe: options.timeframe
  });
}

class PriceClientImpl implements PriceClient {
  readonly symbol: string;
  readonly provider: PriceProviderName;
  private readonly priceProvider: PriceProvider;
  private readonly defaults: PriceQueryOptions;

  constructor(
    symbol: string,
    provider: PriceProviderName,
    priceProvider: PriceProvider,
    defaults: PriceQueryOptions
  ) {
    this.symbol = symbol;
    this.provider = provider;
    this.priceProvider = priceProvider;
    this.defaults = defaults;
  }

  async getPrices(options: PriceQueryOptions = {}): Promise<Awaited<ReturnType<PriceProvider['getPrices']>>> {
    const request = this.createRequest(options);
    return this.priceProvider.getPrices(request);
  }

  async getLatestPrice(options: PriceQueryOptions = {}): Promise<Awaited<ReturnType<NonNullable<PriceProvider['getLatestPrice']>>>> {
    const request = this.createRequest(options);

    if (this.priceProvider.getLatestPrice !== undefined) {
      return this.priceProvider.getLatestPrice(request);
    }

    const candles = await this.priceProvider.getPrices(request);
    return latestPriceFromCandles(candles, request.symbol, this.priceProvider.source);
  }

  private createRequest(options: PriceQueryOptions): PriceRequest {
    const request: PriceRequest = {
      symbol: this.symbol,
      interval: options.interval ?? this.defaults.interval,
      timeframe: options.timeframe ?? this.defaults.timeframe,
      from: options.from,
      to: options.to,
      limit: options.limit
    };

    validatePriceQueryOptions(request);

    return request;
  }
}

function resolveProviderName(options: CreatePriceClientOptions): PriceProviderName {
  const provider = options.provider ?? 'default';

  if (provider === 'default' || provider === 'custom' || provider === 'tradingview-mcp') {
    return provider;
  }

  throw new ProviderConfigurationError(`Unsupported price provider "${String(provider)}".`);
}

function createProvider(options: CreatePriceClientOptions, providerName: PriceProviderName): PriceProvider {
  if (providerName === 'default') {
    return new DefaultPriceProvider('defaultProvider' in options ? options.defaultProvider : undefined);
  }

  if (providerName === 'custom') {
    if (!('pricesApi' in options)) {
      throw new ProviderConfigurationError('Custom provider requires a pricesApi function.');
    }

    return new CustomPriceProvider(options.pricesApi, options.source);
  }

  if (!('mcpClient' in options)) {
    throw new ProviderConfigurationError(
      'TradingView MCP provider requires an mcpClient adapter.'
    );
  }

  return new TradingViewMcpProvider(options.mcpClient, options.source);
}
