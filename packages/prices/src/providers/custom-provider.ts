import { PriceClientError, ProviderConfigurationError, ProviderRequestError } from '../errors.js';
import { normalizeLatestPrice, normalizePriceCandles } from '../normalize.js';
import type { LatestPrice, PriceApiFunction, PriceCandle, PriceProvider, PriceRequest } from '../types.js';

export class CustomPriceProvider implements PriceProvider {
  readonly source: string;
  private readonly pricesApi: PriceApiFunction;

  constructor(pricesApi: PriceApiFunction, source = 'custom') {
    if (typeof pricesApi !== 'function') {
      throw new ProviderConfigurationError('Custom provider requires a pricesApi function.');
    }

    this.pricesApi = pricesApi;
    this.source = source;
  }

  async getPrices(request: PriceRequest): Promise<PriceCandle[]> {
    const payload = await this.callPricesApi(request);
    return normalizePriceCandles(payload, this.source);
  }

  async getLatestPrice(request: PriceRequest): Promise<LatestPrice> {
    const payload = await this.callPricesApi(request);
    return normalizeLatestPrice(payload, request.symbol, this.source);
  }

  private async callPricesApi(request: PriceRequest): Promise<unknown> {
    try {
      return await this.pricesApi(request);
    } catch (error) {
      if (error instanceof PriceClientError) {
        throw error;
      }

      throw new ProviderRequestError(`Custom price API failed for ${request.symbol}.`, error);
    }
  }
}
