import { BinaryEncoder, BinaryDecoder } from '@procharting/utils';

export enum MessageType {
  Subscribe = 1,
  Unsubscribe = 2,
  Update = 3,
  Snapshot = 4,
  Error = 5,
  Heartbeat = 6,
}

export interface SubscribeMessage {
  type: MessageType.Subscribe;
  symbols: string[];
  dataTypes: string[];
}

export interface UpdateMessage {
  type: MessageType.Update;
  symbol: string;
  timestamp: number;
  data: {
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
    bid?: number;
    ask?: number;
    bidSize?: number;
    askSize?: number;
  };
}

export class BinaryProtocol {
  static encodeSubscribe(symbols: string[], dataTypes: string[]): ArrayBuffer {
    const encoder = new BinaryEncoder();
    
    encoder.writeUint8(MessageType.Subscribe);
    encoder.writeUint16(symbols.length);
    
    for (const symbol of symbols) {
      encoder.writeString(symbol);
    }
    
    encoder.writeUint16(dataTypes.length);
    for (const dataType of dataTypes) {
      encoder.writeString(dataType);
    }
    
    return encoder.getBuffer();
  }
  
  static encodeUnsubscribe(symbols: string[]): ArrayBuffer {
    const encoder = new BinaryEncoder();
    
    encoder.writeUint8(MessageType.Unsubscribe);
    encoder.writeUint16(symbols.length);
    
    for (const symbol of symbols) {
      encoder.writeString(symbol);
    }
    
    return encoder.getBuffer();
  }
  
  static decodeMessage(buffer: ArrayBuffer): UpdateMessage | null {
    const decoder = new BinaryDecoder(buffer);
    const messageType = decoder.readUint8();
    
    switch (messageType) {
      case MessageType.Update:
        return this.decodeUpdate(decoder);
      case MessageType.Snapshot:
        // TODO: Implement snapshot decoding
        return null;
      case MessageType.Error:
        // TODO: Implement error decoding
        return null;
      case MessageType.Heartbeat:
        // Heartbeat messages don't need processing
        return null;
      default:
        console.warn('Unknown message type:', messageType);
        return null;
    }
  }
  
  private static decodeUpdate(decoder: BinaryDecoder): UpdateMessage {
    const symbol = decoder.readString();
    const timestamp = decoder.readFloat64();
    
    // Read data fields (bitmap-based for efficiency)
    const fieldMask = decoder.readUint16();
    const data: UpdateMessage['data'] = {};
    
    if (fieldMask & 0x0001) data.open = decoder.readFloat32();
    if (fieldMask & 0x0002) data.high = decoder.readFloat32();
    if (fieldMask & 0x0004) data.low = decoder.readFloat32();
    if (fieldMask & 0x0008) data.close = decoder.readFloat32();
    if (fieldMask & 0x0010) data.volume = decoder.readFloat32();
    if (fieldMask & 0x0020) data.bid = decoder.readFloat32();
    if (fieldMask & 0x0040) data.ask = decoder.readFloat32();
    if (fieldMask & 0x0080) data.bidSize = decoder.readFloat32();
    if (fieldMask & 0x0100) data.askSize = decoder.readFloat32();
    
    return {
      type: MessageType.Update,
      symbol,
      timestamp,
      data,
    };
  }
  
  static encodeHeartbeat(): ArrayBuffer {
    const encoder = new BinaryEncoder(5);
    encoder.writeUint8(MessageType.Heartbeat);
    encoder.writeUint32(Date.now());
    return encoder.getBuffer();
  }
}