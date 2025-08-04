export const barShaders = {
  vertex: `#version 300 es
    precision highp float;
    
    // Instanced attributes
    in vec2 a_position;      // Vertex position (quad corners)
    
    // Per-instance attributes
    in float a_time;        // X position (time)
    in float a_value;       // Bar height
    in float a_color;       // Color index
    in float a_instanceId;  // Instance ID
    
    // Uniforms
    uniform mat4 u_projection;
    uniform vec4 u_viewport;    // x, y, width, height
    uniform vec4 u_dataRange;   // minTime, maxTime, minValue, maxValue
    uniform float u_barWidth;   // Width of each bar in pixels
    
    // Outputs
    out float v_color;
    out float v_instanceId;
    
    void main() {
      // Normalize time to viewport space
      float normalizedTime = (a_time - u_dataRange.x) / (u_dataRange.y - u_dataRange.x);
      float xPos = u_viewport.x + normalizedTime * u_viewport.z;
      
      // Normalize value to viewport space
      float normalizedValue = (a_value - u_dataRange.z) / (u_dataRange.w - u_dataRange.z);
      float yTop = u_viewport.y + (1.0 - normalizedValue) * u_viewport.w;
      float yBottom = u_viewport.y + u_viewport.w; // Bottom of viewport
      
      // Calculate bar position
      vec2 finalPos = mix(
        vec2(xPos - u_barWidth * 0.5, yBottom),
        vec2(xPos + u_barWidth * 0.5, yTop),
        a_position
      );
      
      gl_Position = u_projection * vec4(finalPos, 0.0, 1.0);
      
      // Pass data to fragment shader
      v_color = a_color;
      v_instanceId = a_instanceId;
    }
  `,
  
  fragment: `#version 300 es
    precision highp float;
    
    in float v_color;
    in float v_instanceId;
    
    uniform vec4 u_positiveColor;
    uniform vec4 u_negativeColor;
    uniform float u_opacity;
    
    out vec4 fragColor;
    
    void main() {
      vec4 color = v_color > 0.0 ? u_positiveColor : u_negativeColor;
      color.a *= u_opacity;
      fragColor = color;
    }
  `,
};