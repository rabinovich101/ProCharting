import type { RenderScene, RenderableSeries } from '@procharting/types';
import type { Mat4 } from '@procharting/utils';
import type { ShaderManager } from '../shaders/shader-manager';
import type { BufferManager } from '../buffer-manager';
import { createVertexArray } from '../utils';

export class LineRenderer {
  private vao: WebGLVertexArrayObject | null = null;
  private maxVertices = 1000000;
  
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
    
    // Pre-allocate vertex buffer for line strip
    const vertexSize = 3; // x, y, direction
    const vertexBuffer = new Float32Array(this.maxVertices * vertexSize);
    this.bufferManager.createVertexBuffer('line_vertices', vertexBuffer, true);
    
    gl.bindVertexArray(null);
  }
  
  render(series: RenderableSeries, scene: RenderScene, projection: Mat4): void {
    const gl = this.gl;
    const program = this.shaderManager.useProgram('line');
    if (!program) return;
    
    // Parse line data from binary format
    const dataView = new DataView(series.data);
    const pointSize = 8; // 2 floats: time, value
    const pointCount = series.data.byteLength / pointSize;
    
    if (pointCount < 2) return; // Need at least 2 points for a line
    
    // Generate line vertices with thickness
    const vertices: number[] = [];
    
    for (let i = 0; i < pointCount; i++) {
      const offset = i * pointSize;
      const time = dataView.getFloat32(offset, true);
      const value = dataView.getFloat32(offset + 4, true);
      
      // Add two vertices per point for line thickness
      vertices.push(time, value, -1); // Below line
      vertices.push(time, value, 1);  // Above line
    }
    
    const vertexData = new Float32Array(vertices);
    this.bufferManager.updateBuffer('line_vertices', vertexData);
    
    // Generate index buffer for triangle strip
    const indices: number[] = [];
    for (let i = 0; i < pointCount - 1; i++) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2);
      indices.push(base + 1, base + 2, base + 3);
    }
    
    const indexData = new Uint16Array(indices);
    this.bufferManager.createIndexBuffer('line_indices', indexData);
    
    // Bind VAO
    gl.bindVertexArray(this.vao);
    
    // Setup vertex attributes
    const vertexBuffer = this.bufferManager.getBuffer('line_vertices')!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    
    // Position attribute
    gl.enableVertexAttribArray(program.attributes['a_position']!);
    gl.vertexAttribPointer(program.attributes['a_position']!, 2, gl.FLOAT, false, 12, 0);
    
    // Direction attribute
    gl.enableVertexAttribArray(program.attributes['a_direction']!);
    gl.vertexAttribPointer(program.attributes['a_direction']!, 1, gl.FLOAT, false, 12, 8);
    
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
    this.shaderManager.setUniform1f(program, 'u_lineWidth', 2);
    
    // Line color
    const color = this.parseColor(series.style.color || '#0066ff');
    this.shaderManager.setUniform4f(program, 'u_color', color.r, color.g, color.b, color.a);
    this.shaderManager.setUniform1f(program, 'u_opacity', series.style.strokeOpacity || 1);
    
    // Draw
    const indexBuffer = this.bufferManager.getBuffer('line_indices')!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    
    // Cleanup
    gl.bindVertexArray(null);
  }
  
  private parseColor(color: string): { r: number; g: number; b: number; a: number } {
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return { r, g, b, a: 1 };
    }
    return { r: 0, g: 0.4, b: 1, a: 1 };
  }
  
  destroy(): void {
    if (this.vao) {
      this.gl.deleteVertexArray(this.vao);
      this.vao = null;
    }
  }
}