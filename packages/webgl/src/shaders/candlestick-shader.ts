export const candlestickShaders = {
  vertex: `#version 300 es
    precision highp float;
    
    // Instanced attributes
    in vec2 a_position;      // Vertex position (quad corners)
    in vec2 a_uv;           // UV coordinates
    
    // Per-instance attributes
    in float a_time;        // X position (time)
    in vec4 a_ohlc;         // Open, High, Low, Close
    in float a_volume;      // Volume
    in float a_instanceId;  // Instance ID for coloring
    
    // Uniforms
    uniform mat4 u_projection;
    uniform vec4 u_viewport;    // x, y, width, height
    uniform vec4 u_dataRange;   // minTime, maxTime, minPrice, maxPrice
    uniform float u_barWidth;   // Width of each candle in pixels
    
    // Outputs
    out vec2 v_uv;
    out vec4 v_ohlc;
    out float v_isGreen;
    out float v_instanceId;
    
    void main() {
      // Normalize time to viewport space
      float normalizedTime = (a_time - u_dataRange.x) / (u_dataRange.y - u_dataRange.x);
      float xPos = u_viewport.x + normalizedTime * u_viewport.z;
      
      // Calculate candle body bounds
      float bodyTop = max(a_ohlc.x, a_ohlc.w);    // max(open, close)
      float bodyBottom = min(a_ohlc.x, a_ohlc.w); // min(open, close)
      float wickTop = a_ohlc.y;                    // high
      float wickBottom = a_ohlc.z;                 // low
      
      // Normalize prices to viewport space
      vec2 bodyTopPos = vec2(xPos, u_viewport.y + (1.0 - (bodyTop - u_dataRange.z) / (u_dataRange.w - u_dataRange.z)) * u_viewport.w);
      vec2 bodyBottomPos = vec2(xPos, u_viewport.y + (1.0 - (bodyBottom - u_dataRange.z) / (u_dataRange.w - u_dataRange.z)) * u_viewport.w);
      vec2 wickTopPos = vec2(xPos, u_viewport.y + (1.0 - (wickTop - u_dataRange.z) / (u_dataRange.w - u_dataRange.z)) * u_viewport.w);
      vec2 wickBottomPos = vec2(xPos, u_viewport.y + (1.0 - (wickBottom - u_dataRange.z) / (u_dataRange.w - u_dataRange.z)) * u_viewport.w);
      
      // Determine if we're rendering body or wick based on vertex position
      vec2 finalPos;
      if (a_uv.y < 0.25) {
        // Wick top
        finalPos = mix(
          vec2(xPos - 0.5, wickTopPos.y),
          vec2(xPos + 0.5, bodyTopPos.y),
          a_position
        );
      } else if (a_uv.y < 0.75) {
        // Body
        finalPos = mix(
          vec2(xPos - u_barWidth * 0.5, bodyBottomPos.y),
          vec2(xPos + u_barWidth * 0.5, bodyTopPos.y),
          a_position
        );
      } else {
        // Wick bottom
        finalPos = mix(
          vec2(xPos - 0.5, bodyBottomPos.y),
          vec2(xPos + 0.5, wickBottomPos.y),
          a_position
        );
      }
      
      gl_Position = u_projection * vec4(finalPos, 0.0, 1.0);
      
      // Pass data to fragment shader
      v_uv = a_uv;
      v_ohlc = a_ohlc;
      v_isGreen = a_ohlc.w > a_ohlc.x ? 1.0 : 0.0; // close > open
      v_instanceId = a_instanceId;
    }
  `,
  
  fragment: `#version 300 es
    precision highp float;
    
    in vec2 v_uv;
    in vec4 v_ohlc;
    in float v_isGreen;
    in float v_instanceId;
    
    uniform vec4 u_greenColor;
    uniform vec4 u_redColor;
    uniform vec4 u_wickColor;
    uniform float u_opacity;
    
    out vec4 fragColor;
    
    void main() {
      vec4 color;
      
      // Determine if we're rendering wick or body
      if (v_uv.y < 0.25 || v_uv.y > 0.75) {
        // Wick
        color = u_wickColor;
      } else {
        // Body
        color = v_isGreen > 0.5 ? u_greenColor : u_redColor;
      }
      
      color.a *= u_opacity;
      fragColor = color;
    }
  `,
};