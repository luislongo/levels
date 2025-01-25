import * as dat from "dat.gui";
import * as THREE from "three";
import heightMapVtx from "./assets/shaders/heightMap.vert.glsl?url&raw";
import heightMapFrag from "./assets/shaders/heightMap.frag.glsl?url&raw";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import vertexShader from "./assets/shaders/scene.vert.glsl?url&raw";
import fragmentShader from "./assets/shaders/scene.frag.glsl?url&raw";
import { screenSize } from "three/tsl";

type Terrain = {
  size: number;
  resolution: number;
  color: string;
  amplitude: number;
  persistance: number;
  octaves: number;
  seed: number;
};

const terrain: Terrain = {
  size: 10,
  resolution: 2000,
  color: "#00ff00",
  amplitude: 2,
  persistance: 0.4,
  octaves: 8,
  seed: Math.random() * 1000,
};

const createTexture = (
  renderer: THREE.WebGLRenderer,
  renderTarget: THREE.WebGLRenderTarget,
  resolution = 2000
) => {
  return { renderTarget, material: targetMaterial };
};

export const setupCanvas = () => {
  const renderer = new THREE.WebGLRenderer();

  const mainScene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  const resolution = 2048;
  const textureTarget = new THREE.WebGLRenderTarget(resolution, resolution);

  const targetScene = new THREE.Scene();
  const targetCamera = new THREE.OrthographicCamera(
    0,
    resolution,
    0,
    resolution,
    -1,
    1000
  );

  const targetgeometry = new THREE.PlaneGeometry(resolution, resolution);
  const targetMaterial = new THREE.ShaderMaterial({
    uniforms: {
      resolution: { value: resolution },
      persistence: { value: 0.01 },
      octaves: { value: 8 },
      lacunarity: { value: 2.0 },
      scale: { value: 0.1 },
    },
    vertexShader: heightMapVtx,
    fragmentShader: heightMapFrag,
    wireframe: false,
  });

  const quad = new THREE.Mesh(targetgeometry, targetMaterial);

  targetScene.add(quad);

  renderer.setSize(resolution, resolution);
  renderer.setRenderTarget(textureTarget);
  renderer.render(targetScene, targetCamera);
  renderer.setRenderTarget(null);
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.position.z = -10;
  camera.position.y = 10;
  camera.position.x = -10;
  camera.lookAt(0, 0, 0);

  document.body.appendChild(renderer.domElement);

  new OrbitControls(camera, renderer.domElement);
  const { vertices, indices } = createGridGeometry(terrain);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 2)
  );
  geometry.setIndex(indices);

  const terrainMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      size: { value: terrain.size },
      heightMap: { value: textureTarget.texture },
      resolution: { value: terrain.resolution },
      amplitude: { value: terrain.amplitude },
      kernelSize: { value: 1.0 },
    },
    wireframe: false,
  });
  const mesh = new THREE.Mesh(geometry, terrainMaterial);
  mesh.position.x = -terrain.size / 2;
  mesh.position.z = -terrain.size / 2;
  mainScene.add(mesh);

  const heightMapQuadGeometry = new THREE.PlaneGeometry(1, 1);
  heightMapQuadGeometry.translate(0.5, 0.5, 0);

  const heightMapQuad = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      uniforms: {
        heightMap: { value: textureTarget.texture },
        screenSize: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        size: { value: 300 },
      },
      vertexShader: `
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
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D heightMap;

        void main() {
          gl_FragColor = texture2D(heightMap, vec2(1.0) - vUv );
        }
      `,
    })
  );
  heightMapQuad.position.z = -1;
  heightMapQuad.position.x = -1;
  mainScene.add(heightMapQuad);

  const gui = new dat.GUI();

  const terrainFolder = gui.addFolder("Terrain");
  terrainFolder.add(targetMaterial.uniforms.persistence, "value", 0, 1);
  terrainFolder.add(targetMaterial.uniforms.octaves, "value", 1, 10);
  terrainFolder.add(targetMaterial.uniforms.lacunarity, "value", 1, 10);
  terrainFolder.add(targetMaterial.uniforms.scale, "value", 0.01, 1);

  requestAnimationFrame(function animate() {
    terrainMaterial.uniforms.heightMap.value = textureTarget.texture;

    renderer.setRenderTarget(textureTarget);
    renderer.render(targetScene, targetCamera);
    renderer.setRenderTarget(null);

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(mainScene, camera);
    requestAnimationFrame(animate);
  });
};

const createGridGeometry = ({ resolution }: Terrain) => {
  const vertices = [];
  const indices = [];

  const step = 1 / resolution;

  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const x = i * step;
      const z = j * step;

      vertices.push(x, z);
    }
  }

  for (let i = 0; i < resolution - 1; i++) {
    for (let j = 0; j < resolution - 1; j++) {
      const a = i * resolution + j;
      const b = a + 1;
      const c = a + resolution;
      const d = c + 1;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  return {
    vertices,
    indices,
  };
};

const remakeGeometry = (
  mesh: THREE.Mesh,
  terrain: Terrain,
  newTerrain: Partial<Terrain>
) => {
  const { vertices, indices } = createGridGeometry({
    size: newTerrain.size || terrain.size,
    resolution: newTerrain.resolution || terrain.resolution,
    amplitude: newTerrain.amplitude || terrain.amplitude,
    persistance: newTerrain.persistance || terrain.persistance,
    octaves: newTerrain.octaves || terrain.octaves,
    color: newTerrain.color || terrain.color,
    seed: newTerrain.seed || terrain.seed,
  });

  mesh.geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 2)
  );
  mesh.geometry.setIndex(indices);
  mesh.geometry.attributes.position.needsUpdate = true;
};
