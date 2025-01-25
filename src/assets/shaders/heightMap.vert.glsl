varying vec2 v_Uv;

void main() {
    v_Uv = position.xy;
    gl_Position = vec4(position, 1.0);
}