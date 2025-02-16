  varying vec3 v_normal;
  varying vec2 v_uv;
  uniform sampler2D heightMap;
  
  void main() {
    float height = texture2D(heightMap, v_uv).r;
    float intensity = dot(v_normal, vec3(1.0, 1.0, 0.0));
    gl_FragColor =  vec4(v_uv, 0.0, 1.0);
  }