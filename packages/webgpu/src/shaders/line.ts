export const LineShader = {
  vertex: /* wgsl */ `
    struct Uniforms {
      mvp: mat4x4<f32>,
      viewport: vec4<f32>,
      dataRange: vec4<f32>,
      lineWidth: f32,
    }
    
    @group(0) @binding(0) var<uniform> uniforms: Uniforms;
    
    struct VertexInput {
      @location(0) position: vec2<f32>,
      @location(1) value: f32,
      @builtin(vertex_index) vertexIndex: u32,
    }
    
    struct VertexOutput {
      @builtin(position) position: vec4<f32>,
      @location(0) color: vec4<f32>,
    }
    
    @vertex
    fn vs_main(input: VertexInput) -> VertexOutput {
      var output: VertexOutput;
      
      // Transform to normalized coordinates
      let x = (input.position.x - uniforms.dataRange.x) / (uniforms.dataRange.y - uniforms.dataRange.x);
      let y = (input.value - uniforms.dataRange.z) / (uniforms.dataRange.w - uniforms.dataRange.z);
      
      output.position = uniforms.mvp * vec4<f32>(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);
      output.color = vec4<f32>(0.2, 0.6, 1.0, 1.0);
      
      return output;
    }
  `,
  
  fragment: /* wgsl */ `
    struct FragmentInput {
      @location(0) color: vec4<f32>,
    }
    
    @fragment
    fn fs_main(input: FragmentInput) -> @location(0) vec4<f32> {
      return input.color;
    }
  `,
};