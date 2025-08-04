import type { RenderScene, RenderableSeries } from '@procharting/types';
import type { Mat4 } from '@procharting/utils';
import type { ShaderManager } from '../shaders/shader-manager';
import type { BufferManager } from '../buffer-manager';
import { createVertexArray, setVertexAttribute } from '../utils';

export class BarRenderer {
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
      0, 0,  // Bottom-left
      1, 0,  // Bottom-right
      0, 1,  // Top-left
      1, 1,  // Top-right
    ]);
    
    const quadIndices = new Uint16Array([
      0, 1, 2,
      2, 1, 3,
    ]);
    
    // Create buffers
    this.bufferManager.createVertexBuffer('bar_quad', quadVertices);
    this.bufferManager.createIndexBuffer('bar_indices', quadIndices);
    
    // Pre-allocate instance buffer
    const instanceSize = 4; // time, value, color, id (4 floats)
    const instanceBuffer = new Float32Array(this.maxInstances * instanceSize);
    this.bufferManager.createVertexBuffer('bar_instances', instanceBuffer, true);
    
    gl.bindVertexArray(null);
  }
  
  render(series: RenderableSeries, scene: RenderScene, projection: Mat4): void {
    const gl = this.gl;
    const program = this.shaderManager.useProgram('bar');
    if (!program) return;
    
    // Parse bar data from binary format
    const dataView = new DataView(series.data);
    const pointSize = 12; // 3 floats: time, value, color
    const pointCount = series.data.byteLength / pointSize;
    
    if (pointCount === 0) return;
    
    // Update instance buffer
    const instanceData = new Float32Array(pointCount * 4);
    let previousValue = 0;
    
    for (let i = 0; i < pointCount; i++) {
      const offset = i * pointSize;
      const instanceOffset = i * 4;
      
      const time = dataView.getFloat32(offset, true);
      const value = dataView.getFloat32(offset + 4, true);
      const customColor = dataView.getFloat32(offset + 8, true);
      
      instanceData[instanceOffset] = time;
      instanceData[instanceOffset + 1] = value;
      instanceData[instanceOffset + 2] = customColor || (value > previousValue ? 1 : -1);
      instanceData[instanceOffset + 3] = i;
      
      previousValue = value;
    }
    
    this.bufferManager.updateBuffer('bar_instances', instanceData);
    this.instanceCount = pointCount;
    
    // Bind VAO
    gl.bindVertexArray(this.vao);
    
    // Setup vertex attributes
    const quadBuffer = this.bufferManager.getBuffer('bar_quad')!;
    const instanceBuffer = this.bufferManager.getBuffer('bar_instances')!;
    
    // Quad attributes (per vertex)
    setVertexAttribute(gl, program.attributes['a_position']!, quadBuffer, 2, gl.FLOAT, false, 8, 0);
    
    // Instance attributes (per instance)
    const instanceStride = 16; // 4 floats * 4 bytes
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    
    // Time
    gl.enableVertexAttribArray(program.attributes['a_time']!);
    gl.vertexAttribPointer(program.attributes['a_time']!, 1, gl.FLOAT, false, instanceStride, 0);
    gl.vertexAttribDivisor(program.attributes['a_time']!, 1);
    
    // Value
    gl.enableVertexAttribArray(program.attributes['a_value']!);
    gl.vertexAttribPointer(program.attributes['a_value']!, 1, gl.FLOAT, false, instanceStride, 4);
    gl.vertexAttribDivisor(program.attributes['a_value']!, 1);
    
    // Color
    gl.enableVertexAttribArray(program.attributes['a_color']!);
    gl.vertexAttribPointer(program.attributes['a_color']!, 1, gl.FLOAT, false, instanceStride, 8);
    gl.vertexAttribDivisor(program.attributes['a_color']!, 1);
    
    // Instance ID
    gl.enableVertexAttribArray(program.attributes['a_instanceId']!);
    gl.vertexAttribPointer(program.attributes['a_instanceId']!, 1, gl.FLOAT, false, instanceStride, 12);
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
    this.shaderManager.setUniform1f(program, 'u_barWidth', 3); // TODO: Calculate based on zoom
    
    // Colors
    this.shaderManager.setUniform4f(program, 'u_positiveColor', 0, 0.6, 0, 0.8);
    this.shaderManager.setUniform4f(program, 'u_negativeColor', 0.6, 0, 0, 0.8);
    this.shaderManager.setUniform1f(program, 'u_opacity', 1);
    
    // Draw instanced
    const indexBuffer = this.bufferManager.getBuffer('bar_indices')!;
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