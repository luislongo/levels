  varying vec3 v_normal;
  
  void main() {
    float intensity = dot(v_normal, vec3(1.0, 1.0, 0.0));
    gl_FragColor =  vec4(vec3(intensity), 1.0);
  }