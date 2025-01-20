import * as THREE from "three";
import * as dat from "dat.gui";
import { Perlin } from "three-noise";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import heightmap from "../public/heightmap.jpg";

var perlin = new Perlin();

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
  resolution: 100,
  color: "#00ff00",
  amplitude: 2,
  persistance: 0.4,
  octaves: 8,
  seed: Math.random() * 1000,
};

export const setupCanvas = () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  camera.position.z = 10;
  camera.position.y = 10;
  camera.position.x = 10;
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  new OrbitControls(camera, renderer.domElement);

  const { vertices } = createGridGeometry(terrain);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 2)
  );

  const vertexShader = `
  uniform float size;
  uniform sampler2D heightMap;

  void main() {
    float y = texture2D(heightMap, vec2(position.x, position.y)).r * 2.0;
    vec4 modelViewPosition = modelViewMatrix * vec4((position.x - 0.5) * size , y, (position.y - 0.5) * size, 1.0); 
    gl_Position = projectionMatrix * modelViewPosition;
  }
`;

  const fragmentShader = `
  void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
  }
    `;

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      size: { value: terrain.size },
      heightMap: { value: new THREE.TextureLoader().load(heightmap) },
    },
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  createGUI({ mesh, material, terrain });

  requestAnimationFrame(function animate() {
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  });

  return { scene, camera, renderer };
};

const computeHeight = (
  x: number,
  z: number,
  {
    amplitude,
    persistance,
    octaves,
  }: {
    amplitude: number;
    persistance: number;
    octaves: number;
  }
) => {
  let curAmplitude = amplitude;
  let curFrequency = 0.2;
  let y = 0;

  for (let i = 0; i < octaves; i++) {
    y +=
      curAmplitude *
      perlin.get2(new THREE.Vector2(x * curFrequency, z * curFrequency));
    curAmplitude *= persistance;
    curFrequency /= persistance;
  }

  return y;
};

const createGridGeometry = ({ resolution }: Terrain) => {
  const vertices = [];

  const step = 1 / resolution;

  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const x0 = i * step;
      const z0 = j * step;
      const x1 = (i + 1) * step;
      const z1 = (j + 1) * step;

      vertices.push(x0, z0);
      vertices.push(x1, z1);
      vertices.push(x1, z0);

      vertices.push(x0, z0);
      vertices.push(x0, z1);
      vertices.push(x1, z1);
    }
  }

  return {
    vertices,
  };
};

const createGUI = ({
  mesh,
  material,
  terrain,
}: {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  terrain: Terrain;
}) => {
  const gui = new dat.GUI();

  const terrainFolder = gui.addFolder("Terrain");
  terrainFolder.addColor({ color: "#00ff00" }, "color").onChange((color) => {
    // @ts-ignore
    mesh.material.color.set(color);
  });
  terrainFolder.add(material, "wireframe");

  terrainFolder.add(terrain, "resolution", 1, 100).onChange((value) => {
    remakeGeometry(mesh, terrain, { resolution: value });
  });
  terrainFolder.add(terrain, "size", 1, 100).onChange((value) => {
    material.uniforms.size.value = value;
  });

  terrainFolder.add(terrain, "amplitude", 0, 2).onChange((value) => {
    remakeGeometry(mesh, terrain, { amplitude: value });
  });

  terrainFolder.add(terrain, "persistance", 0.01, 1).onChange((value) => {
    remakeGeometry(mesh, terrain, { persistance: value });
  });

  terrainFolder.add(terrain, "octaves", 1, 10).onChange((value) => {
    remakeGeometry(mesh, terrain, { octaves: value });
  });

  terrainFolder.add(terrain, "seed", 0, 1000).onChange((value) => {
    remakeGeometry(mesh, terrain, { seed: value });
  });

  terrainFolder.open();

  return gui;
};

const remakeGeometry = (
  mesh: THREE.Mesh,
  terrain: Terrain,
  newTerrain: Partial<Terrain>
) => {
  const { vertices } = createGridGeometry({
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
};
