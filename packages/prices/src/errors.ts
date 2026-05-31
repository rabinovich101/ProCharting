export type PriceClientErrorCode =
  | 'INVALID_SYMBOL'
  | 'INVALID_PRICE_QUERY'
  | 'PROVIDER_CONFIGURATION_ERROR'
  | 'PROVIDER_REQUEST_FAILED'
  | 'PRICE_NORMALIZATION_ERROR';

export class PriceClientError extends Error {
  readonly code: PriceClientErrorCode;
  override readonly cause?: unknown;

  constructor(message: string, code: PriceClientErrorCode, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.cause = cause;
  }
}

export class InvalidSymbolError extends PriceClientError {
  constructor(message: string) {
    super(message, 'INVALID_SYMBOL');
  }
}

export class InvalidPriceQueryError extends PriceClientError {
  constructor(message: string) {
    super(message, 'INVALID_PRICE_QUERY');
  }
}

export class ProviderConfigurationError extends PriceClientError {
  constructor(message: string) {
    super(message, 'PROVIDER_CONFIGURATION_ERROR');
  }
}

export class ProviderRequestError extends PriceClientError {
  constructor(message: string, cause?: unknown) {
    super(message, 'PROVIDER_REQUEST_FAILED', cause);
  }
}

export class PriceNormalizationError extends PriceClientError {
  constructor(message: string) {
    super(message, 'PRICE_NORMALIZATION_ERROR');
  }
}
