export interface DataPoint {
  readonly time: number;
  readonly value: number;
}

export interface OHLC {
  readonly time: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
}

export interface OHLCWithVolume extends OHLC {
  readonly volume: number;
}

export interface CandlestickData extends OHLCWithVolume {}

export interface BarData extends DataPoint {
  readonly color?: string;
}

export interface LineData extends DataPoint {}

export interface StreamingOptions {
  readonly mode: 'append' | 'replace';
  readonly data: AsyncIterable<DataPoint[]> | ReadableStream<ArrayBuffer>;
  readonly bufferSize?: number;
  readonly aggregation?: AggregationOptions;
}

export interface AggregationOptions {
  readonly enabled: boolean;
  readonly levels: number[];
  readonly method: 'ohlc' | 'average' | 'sum' | 'first' | 'last';
}

export type TimeRange = {
  readonly from: number;
  readonly to: number;
};

export interface DataBuffer {
  readonly capacity: number;
  readonly length: number;
  readonly data: ArrayBuffer;
  
  append(data: ArrayBuffer): void;
  clear(): void;
  slice(range?: TimeRange): ArrayBuffer;
}

export interface DataDecimator {
  decimate(data: ArrayBuffer, targetPoints: number): ArrayBuffer;
}

export type DataFormat = 'binary' | 'json' | 'msgpack' | 'protobuf';

export interface DataEncoder<T> {
  encode(data: T[]): ArrayBuffer;
  decode(buffer: ArrayBuffer): T[];
}