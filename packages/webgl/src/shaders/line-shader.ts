export const lineShaders = {
  vertex: `#version 300 es
    precision highp float;
    
    in vec2 a_position;     // x: time, y: value
    in float a_direction;   // -1 or 1 for line thickness
    
    uniform mat4 u_projection;
    uniform vec4 u_viewport;    // x, y, width, height
    uniform vec4 u_dataRange;   // minTime, maxTime, minValue, maxValue
    uniform float u_lineWidth;
    
    out float v_alpha;
    
    void main() {
      // Normalize position to viewport
      float normalizedX = (a_position.x - u_dataRange.x) / (u_dataRange.y - u_dataRange.x);
      float normalizedY = 1.0 - (a_position.y - u_dataRange.z) / (u_dataRange.w - u_dataRange.z);
      
      vec2 screenPos = vec2(
        u_viewport.x + normalizedX * u_viewport.z,
        u_viewport.y + normalizedY * u_viewport.w
      );
      
      // Calculate line direction for thickness
      // This is a simplified approach - in production, calculate proper normals
      vec2 offset = vec2(0.0, a_direction * u_lineWidth * 0.5);
      
      gl_Position = u_projection * vec4(screenPos + offset, 0.0, 1.0);
      
      // Anti-aliasing alpha
      v_alpha = 1.0 - abs(a_direction);
    }
  `,
  
  fragment: `#version 300 es
    precision highp float;
    
    in float v_alpha;
    
    uniform vec4 u_color;
    uniform float u_opacity;
    
    out vec4 fragColor;
    
    void main() {
      fragColor = u_color;
      fragColor.a *= u_opacity * (1.0 - v_alpha * 0.5); // Smooth edges
    }
  `,
};