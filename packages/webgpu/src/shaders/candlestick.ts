export const CandlestickShader = {
  vertex: /* wgsl */ `
    struct Uniforms {
      mvp: mat4x4<f32>,
      viewport: vec4<f32>, // x, y, width, height
      dataRange: vec4<f32>, // minX, maxX, minY, maxY
    }
    
    @group(0) @binding(0) var<uniform> uniforms: Uniforms;
    
    struct VertexInput {
      @location(0) position: vec2<f32>,
      @location(1) ohlc: vec4<f32>, // open, high, low, close
      @location(2) volume: f32,
      @location(3) color: f32,
    }
    
    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) uv: vec2<f32>,
      @location(1) ohlc: vec4<f32>,
      @location(2) color: f32,
    }
    
    @vertex
    fn vs_main(input: VertexInput, @builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
      var output: VertexOutput;
      
      // Transform data coordinates to screen coordinates
      let x = (input.position.x - uniforms.dataRange.x) / (uniforms.dataRange.y - uniforms.dataRange.x);
      let y = (input.position.y - uniforms.dataRange.z) / (uniforms.dataRange.w - uniforms.dataRange.z);
      
      output.position = uniforms.mvp * vec4<f32>(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);
      output.uv = vec2<f32>(x, y);
      output.ohlc = input.ohlc;
      output.color = input.color;
      
      return output;
    }
  `,
  
  fragment: /* wgsl */ `
    struct FragmentInput {
      @location(0) uv: vec2<f32>,
      @location(1) ohlc: vec4<f32>,
      @location(2) color: f32,
    }
    
    @fragment
    fn fs_main(input: FragmentInput) -> @location(0) vec4<f32> {
      // Simple candlestick coloring
      let isGreen = input.ohlc.w > input.ohlc.x; // close > open
      
      if (isGreen) {
        return vec4<f32>(0.0, 0.8, 0.0, 1.0); // Green
      } else {
        return vec4<f32>(0.8, 0.0, 0.0, 1.0); // Red
      }
    }
  `,
  
  compute: /* wgsl */ `
    struct DataPoint {
      time: f32,
      open: f32,
      high: f32,
      low: f32,
      close: f32,
      volume: f32,
    }
    
    struct DecimationParams {
      inputSize: u32,
      outputSize: u32,
      tolerance: f32,
    }
    
    @group(0) @binding(0) var<storage, read> inputData: array<DataPoint>;
    @group(0) @binding(1) var<storage, read_write> outputData: array<DataPoint>;
    @group(0) @binding(2) var<uniform> params: DecimationParams;
    
    // Douglas-Peucker algorithm for GPU
    fn perpendicularDistance(point: DataPoint, lineStart: DataPoint, lineEnd: DataPoint) -> f32 {
      let dx = lineEnd.time - lineStart.time;
      let dy = lineEnd.close - lineStart.close;
      
      if (dx == 0.0 && dy == 0.0) {
        let d1 = point.time - lineStart.time;
        let d2 = point.close - lineStart.close;
        return sqrt(d1 * d1 + d2 * d2);
      }
      
      let t = ((point.time - lineStart.time) * dx + (point.close - lineStart.close) * dy) / (dx * dx + dy * dy);
      let closestX = lineStart.time + t * dx;
      let closestY = lineStart.close + t * dy;
      
      let distX = point.time - closestX;
      let distY = point.close - closestY;
      return sqrt(distX * distX + distY * distY);
    }
    
    @compute @workgroup_size(64)
    fn main(@builtin(global_invocation_id) id: vec3<u32>) {
      let index = id.x;
      if (index >= params.inputSize) {
        return;
      }
      
      // Simplified decimation - in production, implement full Douglas-Peucker
      let stride = params.inputSize / params.outputSize;
      if (index % stride == 0u) {
        let outputIndex = index / stride;
        if (outputIndex < params.outputSize) {
          outputData[outputIndex] = inputData[index];
        }
      }
    }
  `,
};