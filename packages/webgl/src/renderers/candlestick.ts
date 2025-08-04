import type { RenderScene, RenderableSeries } from '@procharting/types';
import type { Mat4 } from '@procharting/utils';
import type { ShaderManager } from '../shaders/shader-manager';
import type { BufferManager } from '../buffer-manager';
import { createVertexArray, setVertexAttribute } from '../utils';

export class CandlestickRenderer {
  private vao: WebGLVertexArrayObject | null = null;
  private instanceCount = 0;
  private maxInstances = 100000;
  
  constructor(
    private gl: WebGL2RenderingContext,
    private shaderManager: ShaderManager,
    private bufferManager: BufferManager,
  ) {
    this.initialize();
  }
  
  private initialize(): void {
    const gl = this.gl;
    
    // Create vertex array object
    this.vao = createVertexArray(gl);
    gl.bindVertexArray(this.vao);
    
    // Create quad vertices (will be instanced)
    const quadVertices = new Float32Array([
      0, 0, 0, 0,  // Bottom-left
      1, 0, 1, 0,  // Bottom-right
      0, 1, 0, 1,  // Top-left
      1, 1, 1, 1,  // Top-right
    ]);
    
    const quadIndices = new Uint16Array([
      0, 1, 2,
      2, 1, 3,
    ]);
    
    // Create buffers
    this.bufferManager.createVertexBuffer('candlestick_quad', quadVertices);
    this.bufferManager.createIndexBuffer('candlestick_indices', quadIndices);
    
    // Pre-allocate instance buffer
    const instanceSize = 8; // time, open, high, low, close, volume, id (7 floats)
    const instanceBuffer = new Float32Array(this.maxInstances * instanceSize);
    this.bufferManager.createVertexBuffer('candlestick_instances', instanceBuffer, true);
    
    gl.bindVertexArray(null);
  }
  
  render(series: RenderableSeries, scene: RenderScene, projection: Mat4): void {
    const gl = this.gl;
    const program = this.shaderManager.useProgram('candlestick');
    if (!program) return;
    
    // Parse candlestick data from binary format
    const dataView = new DataView(series.data);
    const pointSize = 24; // 6 floats: time, open, high, low, close, volume
    const pointCount = series.data.byteLength / pointSize;
    
    if (pointCount === 0) return;
    
    // Update instance buffer
    const instanceData = new Float32Array(pointCount * 7);
    for (let i = 0; i < pointCount; i++) {
      const offset = i * pointSize;
      const instanceOffset = i * 7;
      
      instanceData[instanceOffset] = dataView.getFloat32(offset, true); // time
      instanceData[instanceOffset + 1] = dataView.getFloat32(offset + 4, true); // open
      instanceData[instanceOffset + 2] = dataView.getFloat32(offset + 8, true); // high
      instanceData[instanceOffset + 3] = dataView.getFloat32(offset + 12, true); // low
      instanceData[instanceOffset + 4] = dataView.getFloat32(offset + 16, true); // close
      instanceData[instanceOffset + 5] = dataView.getFloat32(offset + 20, true); // volume
      instanceData[instanceOffset + 6] = i; // instance ID
    }
    
    this.bufferManager.updateBuffer('candlestick_instances', instanceData);
    this.instanceCount = pointCount;
    
    // Bind VAO
    gl.bindVertexArray(this.vao);
    
    // Setup vertex attributes
    const quadBuffer = this.bufferManager.getBuffer('candlestick_quad')!;
    const instanceBuffer = this.bufferManager.getBuffer('candlestick_instances')!;
    
    // Quad attributes (per vertex)
    setVertexAttribute(gl, program.attributes['a_position']!, quadBuffer, 2, gl.FLOAT, false, 16, 0);
    setVertexAttribute(gl, program.attributes['a_uv']!, quadBuffer, 2, gl.FLOAT, false, 16, 8);
    
    // Instance attributes (per instance)
    const instanceStride = 28; // 7 floats * 4 bytes
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    
    // Time
    gl.enableVertexAttribArray(program.attributes['a_time']!);
    gl.vertexAttribPointer(program.attributes['a_time']!, 1, gl.FLOAT, false, instanceStride, 0);
    gl.vertexAttribDivisor(program.attributes['a_time']!, 1);
    
    // OHLC
    gl.enableVertexAttribArray(program.attributes['a_ohlc']!);
    gl.vertexAttribPointer(program.attributes['a_ohlc']!, 4, gl.FLOAT, false, instanceStride, 4);
    gl.vertexAttribDivisor(program.attributes['a_ohlc']!, 1);
    
    // Volume
    gl.enableVertexAttribArray(program.attributes['a_volume']!);
    gl.vertexAttribPointer(program.attributes['a_volume']!, 1, gl.FLOAT, false, instanceStride, 20);
    gl.vertexAttribDivisor(program.attributes['a_volume']!, 1);
    
    // Instance ID
    gl.enableVertexAttribArray(program.attributes['a_instanceId']!);
    gl.vertexAttribPointer(program.attributes['a_instanceId']!, 1, gl.FLOAT, false, instanceStride, 24);
    gl.vertexAttribDivisor(program.attributes['a_instanceId']!, 1);
    
    // Set uniforms
    this.shaderManager.setUniformMatrix4fv(program, 'u_projection', projection.m);
    this.shaderManager.setUniform4f(
      program,
      'u_viewport',
      scene.viewport.x,
      scene.viewport.y,
      scene.viewport.width,
      scene.viewport.height,
    );
    this.shaderManager.setUniform4f(
      program,
      'u_dataRange',
      scene.viewport.dataMinX,
      scene.viewport.dataMaxX,
      scene.viewport.dataMinY,
      scene.viewport.dataMaxY,
    );
    this.shaderManager.setUniform1f(program, 'u_barWidth', 5); // TODO: Calculate based on zoom
    
    // Colors
    this.shaderManager.setUniform4f(program, 'u_greenColor', 0, 0.8, 0, 1);
    this.shaderManager.setUniform4f(program, 'u_redColor', 0.8, 0, 0, 1);
    this.shaderManager.setUniform4f(program, 'u_wickColor', 0.5, 0.5, 0.5, 1);
    this.shaderManager.setUniform1f(program, 'u_opacity', 1);
    
    // Draw instanced
    const indexBuffer = this.bufferManager.getBuffer('candlestick_indices')!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.drawElementsInstanced(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0, this.instanceCount);
    
    // Cleanup
    gl.bindVertexArray(null);
  }
  
  destroy(): void {
    if (this.vao) {
      this.gl.deleteVertexArray(this.vao);
      this.vao = null;
    }
  }
}