import type { DataDecimator as IDataDecimator } from '@procharting/types';
import { douglasPeucker, Vec2 } from '@procharting/utils';

export class DataDecimator implements IDataDecimator {
  decimate(data: ArrayBuffer, targetPoints: number): ArrayBuffer {
    // Decode data points
    const points = this.decodePoints(data);
    
    if (points.length <= targetPoints) {
      return data;
    }
    
    // Convert to Vec2 for Douglas-Peucker algorithm
    const vec2Points: Vec2[] = points.map((p, i) => ({
      x: i,
      y: p.value,
    }));
    
    // Calculate tolerance based on data range
    const minY = Math.min(...points.map(p => p.value));
    const maxY = Math.max(...points.map(p => p.value));
    const tolerance = (maxY - minY) / 100;
    
    // Apply Douglas-Peucker simplification
    const simplified = douglasPeucker(vec2Points, tolerance);
    
    // Convert back to data points
    const simplifiedPoints = simplified.map(v => points[Math.round(v.x)]!);
    
    // Encode back to ArrayBuffer
    return this.encodePoints(simplifiedPoints);
  }
  
  private decodePoints(buffer: ArrayBuffer): Array<{ time: number; value: number }> {
    const view = new DataView(buffer);
    const points: Array<{ time: number; value: number }> = [];
    const pointSize = 8; // 4 bytes time + 4 bytes value
    
    for (let i = 0; i < buffer.byteLength; i += pointSize) {
      points.push({
        time: view.getFloat32(i, true),
        value: view.getFloat32(i + 4, true),
      });
    }
    
    return points;
  }
  
  private encodePoints(points: Array<{ time: number; value: number }>): ArrayBuffer {
    const buffer = new ArrayBuffer(points.length * 8);
    const view = new DataView(buffer);
    
    points.forEach((point, i) => {
      const offset = i * 8;
      view.setFloat32(offset, point.time, true);
      view.setFloat32(offset + 4, point.value, true);
    });
    
    return buffer;
  }
}