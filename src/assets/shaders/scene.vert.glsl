
uniform float size;
uniform sampler2D heightMap;
uniform float resolution;
uniform float amplitude;
uniform float kernelSize;
varying vec3 v_normal;
varying vec2 v_uv;

void main() {
    float step = 1.0f / resolution * 5.0;
    float x0 = position.x;
    float z0 = position.y;
    float xl = position.x - step ;
    float xr = position.x + step;
    float zl = position.y - step;
    float zr = position.y + step;
    
    float y0 = texture2D(heightMap, vec2(x0, z0)).r * amplitude;
    float yl = texture2D(heightMap, vec2(xl, z0)).r * amplitude;
    float yr = texture2D(heightMap, vec2(xr, z0)).r * amplitude;
    float yd = texture2D(heightMap, vec2(x0, zl)).r * amplitude;
    float yu = texture2D(heightMap, vec2(x0, zr)).r * amplitude;

    vec3 dx = vec3(step, yr - yl, 0.0);
    vec3 dy = vec3(0.0, yu - yd, step);
    v_normal = normalize(cross(dy, dx));
    v_uv = vec2(x0, z0);

    vec4 modelViewPosition = vec4(x0 * size , y0 * 2.0, z0 * size, 1.0); 
    gl_Position = projectionMatrix * modelViewMatrix * modelViewPosition;
}