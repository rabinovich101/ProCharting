export const DecimationShader = /* wgsl */ `
  struct DataPoint {
    time: f32,
    value: f32,
  }
  
  struct DecimationParams {
    inputSize: u32,
    outputSize: u32,
    tolerance: f32,
    algorithm: u32, // 0: Douglas-Peucker, 1: LTTB, 2: MinMax
  }
  
  @group(0) @binding(0) var<storage, read> inputData: array<DataPoint>;
  @group(0) @binding(1) var<storage, read_write> outputData: array<DataPoint>;
  @group(0) @binding(2) var<storage, read_write> outputIndices: array<u32>;
  @group(0) @binding(3) var<uniform> params: DecimationParams;
  
  // Largest Triangle Three Buckets (LTTB) algorithm
  fn lttb(bucketIndex: u32, bucketSize: u32) -> u32 {
    let startIndex = bucketIndex * bucketSize;
    let endIndex = min(startIndex + bucketSize, params.inputSize);
    
    if (bucketIndex == 0u || bucketIndex == params.outputSize - 1u) {
      return startIndex;
    }
    
    // Calculate average point for next bucket
    let nextBucketStart = endIndex;
    let nextBucketEnd = min(nextBucketStart + bucketSize, params.inputSize);
    var avgX = 0.0;
    var avgY = 0.0;
    let count = f32(nextBucketEnd - nextBucketStart);
    
    for (var i = nextBucketStart; i < nextBucketEnd; i = i + 1u) {
      avgX += inputData[i].time;
      avgY += inputData[i].value;
    }
    avgX /= count;
    avgY /= count;
    
    // Find point with largest triangle area
    let prevPoint = outputData[bucketIndex - 1u];
    var maxArea = 0.0;
    var maxIndex = startIndex;
    
    for (var i = startIndex; i < endIndex; i = i + 1u) {
      let point = inputData[i];
      let area = abs((prevPoint.time - avgX) * (point.value - prevPoint.value) - 
                     (prevPoint.time - point.time) * (avgY - prevPoint.value));
      
      if (area > maxArea) {
        maxArea = area;
        maxIndex = i;
      }
    }
    
    return maxIndex;
  }
  
  // MinMax decimation for preserving extremes
  fn minmax(bucketIndex: u32, bucketSize: u32) -> vec2<u32> {
    let startIndex = bucketIndex * bucketSize;
    let endIndex = min(startIndex + bucketSize, params.inputSize);
    
    var minIndex = startIndex;
    var maxIndex = startIndex;
    var minValue = inputData[startIndex].value;
    var maxValue = inputData[startIndex].value;
    
    for (var i = startIndex + 1u; i < endIndex; i = i + 1u) {
      let value = inputData[i].value;
      if (value < minValue) {
        minValue = value;
        minIndex = i;
      }
      if (value > maxValue) {
        maxValue = value;
        maxIndex = i;
      }
    }
    
    return vec2<u32>(minIndex, maxIndex);
  }
  
  @compute @workgroup_size(64)
  fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let bucketIndex = id.x;
    if (bucketIndex >= params.outputSize) {
      return;
    }
    
    let bucketSize = max(1u, params.inputSize / params.outputSize);
    
    switch (params.algorithm) {
      case 0u: { // Douglas-Peucker (simplified)
        let index = bucketIndex * bucketSize;
        outputData[bucketIndex] = inputData[index];
        outputIndices[bucketIndex] = index;
      }
      case 1u: { // LTTB
        let index = lttb(bucketIndex, bucketSize);
        outputData[bucketIndex] = inputData[index];
        outputIndices[bucketIndex] = index;
      }
      case 2u: { // MinMax
        let indices = minmax(bucketIndex, bucketSize);
        let outputIndex = bucketIndex * 2u;
        if (outputIndex < params.outputSize) {
          outputData[outputIndex] = inputData[indices.x];
          outputIndices[outputIndex] = indices.x;
        }
        if (outputIndex + 1u < params.outputSize) {
          outputData[outputIndex + 1u] = inputData[indices.y];
          outputIndices[outputIndex + 1u] = indices.y;
        }
      }
      default: {
        // Fallback to simple sampling
        let index = bucketIndex * bucketSize;
        outputData[bucketIndex] = inputData[index];
        outputIndices[bucketIndex] = index;
      }
    }
  }
`;