varying vec2 vUv;
uniform sampler2D heightMap;

void main() {
    gl_FragColor = texture2D(heightMap, vec2(vUv.x, 1.0 - vUv.y));
}