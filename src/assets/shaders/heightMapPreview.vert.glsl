varying vec2 vUv;
uniform vec2 screenSize;
uniform float size;

void main() {
    float right = (position.x / screenSize.x) * size + 1.0 - 0.5 * size / screenSize.x;
    float bottom = position.y / screenSize.y * size - 1.0 + 0.5 * size / screenSize.y;
    vec4 screenPos = vec4(right, bottom, 0.0, 1.0);
    vUv = uv;
    gl_Position = screenPos;
}