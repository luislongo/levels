import * as dat from "dat.gui";
import * as THREE from "three";
import heightMapVtx from "./assets/shaders/heightMap.vert.glsl?url&raw";
import heightMapFrag from "./assets/shaders/heightMap.frag.glsl?url&raw";

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

const createTexture = (renderer: THREE.WebGLRenderer) => {
  const resolution = 512;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    0,
    resolution,
    0,
    resolution,
    -1,
    1000
  );

  renderer.setSize(resolution, resolution);

  const geometry = new THREE.PlaneGeometry(resolution, resolution);

  const quad = new THREE.Mesh(
    geometry,
    new THREE.ShaderMaterial({
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
    })
  );

  scene.add(quad);

  renderer.render(scene, camera);

  requestAnimationFrame(function animate() {
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  });

  const gui = new dat.GUI();
  gui.add(quad.material.uniforms.persistence, "value", 0.01, 1);
  gui.add(quad.material.uniforms.octaves, "value", 1, 10);
  gui.add(quad.material.uniforms.lacunarity, "value", 0, 10);
  gui.add(quad.material.uniforms.scale, "value", 0, 1);
};

export const setupCanvas = () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.position.z = -10;
  camera.position.y = 10;
  camera.position.x = -10;
  camera.lookAt(0, 0, 0);

  createTexture(renderer);
  document.body.appendChild(renderer.domElement);

  // new OrbitControls(camera, renderer.domElement);

  // const { vertices, indices } = createGridGeometry(terrain);
  // const geometry = new THREE.BufferGeometry();
  // geometry.setAttribute(
  //   "position",
  //   new THREE.Float32BufferAttribute(vertices, 2)
  // );
  // geometry.setIndex(indices);

  // const material = new THREE.ShaderMaterial({
  //   vertexShader,
  //   fragmentShader,
  //   uniforms: {
  //     size: { value: terrain.size },
  //     heightMap: { value: textureFromScene.texture },
  //     resolution: { value: terrain.resolution },
  //     amplitude: { value: terrain.amplitude },
  //     kernelSize: { value: 1.0 },
  //   },
  //   wireframe: false,
  // });
  // const mesh = new THREE.Mesh(geometry, material);
  // scene.add(mesh);

  // createGUI({ mesh, material, terrain });

  // requestAnimationFrame(function animate() {
  //   camera.lookAt(0, 0, 0);
  //   renderer.render(scene, camera);
  //   requestAnimationFrame(animate);
  // });

  // return { scene, camera, renderer };
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

  terrainFolder.add(terrain, "resolution", 1, 1000).onChange((value) => {
    material.uniforms.resolution.value = value;
    remakeGeometry(mesh, terrain, { resolution: value });
  });
  terrainFolder.add(terrain, "size", 1, 100).onChange((value) => {
    material.uniforms.size.value = value;
  });

  terrainFolder.add(terrain, "amplitude", 0, 2).onChange((value) => {
    material.uniforms.amplitude.value = value;
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

  terrainFolder.add(material.uniforms.kernelSize, "value", 0, 10);

  terrainFolder.open();

  return gui;
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
