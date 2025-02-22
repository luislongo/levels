  varying vec3 v_normal;
  varying vec2 v_uv;
  uniform sampler2D heightMap;

  uniform vec4 flatAreaColor;
  uniform vec4 steepAreaColor;
  
  void main() {
    float height = texture2D(heightMap, v_uv).r;
    float steepness = 1.0 - abs(dot(v_normal, vec3(0.0, 1.0, 0.0)));
    vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
    float intensity = v_normal.y;
    if (steepness < 0.8) {
      color = flatAreaColor;
    } else {
      color = steepAreaColor;
    }

    gl_FragColor = intensity* color;
    
  }