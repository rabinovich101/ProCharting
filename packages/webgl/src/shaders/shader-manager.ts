import { createShader, createProgram } from '../utils';
import { candlestickShaders } from './candlestick-shader';
import { lineShaders } from './line-shader';
import { barShaders } from './bar-shader';

export interface ShaderProgram {
  program: WebGLProgram;
  attributes: Record<string, number>;
  uniforms: Record<string, WebGLUniformLocation>;
}

export class ShaderManager {
  private programs = new Map<string, ShaderProgram>();
  private shaders = new Map<string, WebGLShader>();
  
  constructor(private gl: WebGL2RenderingContext) {
    this.initializeShaders();
  }
  
  private initializeShaders(): void {
    // Register built-in shaders
    this.registerShader('candlestick', candlestickShaders);
    this.registerShader('line', lineShaders);
    this.registerShader('bar', barShaders);
  }
  
  registerShader(
    name: string,
    shaderSource: { vertex: string; fragment: string },
  ): void {
    const gl = this.gl;
    
    // Compile shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, shaderSource.vertex);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, shaderSource.fragment);
    
    // Store for cleanup
    this.shaders.set(`${name}_vertex`, vertexShader);
    this.shaders.set(`${name}_fragment`, fragmentShader);
    
    // Create program
    const program = createProgram(gl, vertexShader, fragmentShader);
    
    // Get attribute locations
    const attributes: Record<string, number> = {};
    const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    
    for (let i = 0; i < numAttributes; i++) {
      const info = gl.getActiveAttrib(program, i);
      if (info) {
        attributes[info.name] = gl.getAttribLocation(program, info.name);
      }
    }
    
    // Get uniform locations
    const uniforms: Record<string, WebGLUniformLocation> = {};
    const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    
    for (let i = 0; i < numUniforms; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info) {
        const location = gl.getUniformLocation(program, info.name);
        if (location) {
          uniforms[info.name] = location;
        }
      }
    }
    
    this.programs.set(name, { program, attributes, uniforms });
  }
  
  getProgram(name: string): ShaderProgram | undefined {
    return this.programs.get(name);
  }
  
  useProgram(name: string): ShaderProgram | null {
    const shaderProgram = this.programs.get(name);
    if (!shaderProgram) {
      console.error(`Shader program '${name}' not found`);
      return null;
    }
    
    this.gl.useProgram(shaderProgram.program);
    return shaderProgram;
  }
  
  setUniform1f(program: ShaderProgram, name: string, value: number): void {
    const location = program.uniforms[name];
    if (location) {
      this.gl.uniform1f(location, value);
    }
  }
  
  setUniform2f(program: ShaderProgram, name: string, x: number, y: number): void {
    const location = program.uniforms[name];
    if (location) {
      this.gl.uniform2f(location, x, y);
    }
  }
  
  setUniform3f(program: ShaderProgram, name: string, x: number, y: number, z: number): void {
    const location = program.uniforms[name];
    if (location) {
      this.gl.uniform3f(location, x, y, z);
    }
  }
  
  setUniform4f(program: ShaderProgram, name: string, x: number, y: number, z: number, w: number): void {
    const location = program.uniforms[name];
    if (location) {
      this.gl.uniform4f(location, x, y, z, w);
    }
  }
  
  setUniformMatrix4fv(program: ShaderProgram, name: string, matrix: Float32Array): void {
    const location = program.uniforms[name];
    if (location) {
      this.gl.uniformMatrix4fv(location, false, matrix);
    }
  }
  
  setUniform1i(program: ShaderProgram, name: string, value: number): void {
    const location = program.uniforms[name];
    if (location) {
      this.gl.uniform1i(location, value);
    }
  }
  
  destroy(): void {
    // Delete all programs
    for (const { program } of this.programs.values()) {
      this.gl.deleteProgram(program);
    }
    this.programs.clear();
    
    // Delete all shaders
    for (const shader of this.shaders.values()) {
      this.gl.deleteShader(shader);
    }
    this.shaders.clear();
  }
}