import * as THREE from "three";
import * as dat from "dat.gui";
import { Perlin } from "three-noise";

const perlin = new Perlin();

type Terrain = {
  size: number;
  resolution: number;
  color: string;
  amplitude: number;
  persistance: number;
  octaves: number;
};

const terrain: Terrain = {
  size: 10,
  resolution: 10,
  color: "#00ff00",
  amplitude: 1,
  persistance: 1,
  octaves: 1,
};

export const setupCanvas = () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  camera.position.z = 5;
  camera.position.y = 5;
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const { vertices } = createGridGeometry(terrain);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    wireframe: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  createGUI({ camera, mesh, material, terrain });

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
  let curFrequency = 1;
  let y = 0;

  for (let i = 0; i < octaves; i++) {
    y +=
      curAmplitude *
      perlin.get2(new THREE.Vector2(x * curFrequency, z * curFrequency));
    curAmplitude /= persistance;
    curFrequency *= persistance;
  }

  return y;
};

const createGridGeometry = ({ size, resolution, ...rest }: Terrain) => {
  const halfSize = size / 2;
  const vertices = [];

  const step = size / resolution;

  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const x0 = i * step - halfSize;
      const z0 = j * step - halfSize;
      const x1 = (i + 1) * step - halfSize;
      const z1 = (j + 1) * step - halfSize;
      const yx0z0 = computeHeight(x0, z0, rest);
      const yx1z0 = computeHeight(x1, z0, rest);
      const yx0z1 = computeHeight(x0, z1, rest);
      const yx1z1 = computeHeight(x1, z1, rest);

      vertices.push(x0, yx0z0, z0);
      vertices.push(x1, yx1z1, z1);
      vertices.push(x1, yx1z0, z0);

      vertices.push(x0, yx0z0, z0);
      vertices.push(x0, yx0z1, z1);
      vertices.push(x1, yx1z1, z1);
    }
  }

  return {
    vertices: new Float32Array(vertices),
  };
};

const createGUI = ({
  camera,
  mesh,
  material,
  terrain,
}: {
  camera: THREE.PerspectiveCamera;
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  terrain: Terrain;
}) => {
  const gui = new dat.GUI();
  const cameraFolder = gui.addFolder("Camera");
  cameraFolder.add(camera.position, "x", -10, 10);
  cameraFolder.add(camera.position, "y", -10, 10);
  cameraFolder.add(camera.position, "z", -10, 10);
  cameraFolder.open();

  const terrainFolder = gui.addFolder("Terrain");
  terrainFolder.addColor({ color: "#00ff00" }, "color").onChange((color) => {
    // @ts-ignore
    mesh.material.color.set(color);
  });
  terrainFolder.add(material, "wireframe");
  terrainFolder.add(terrain, "resolution", 1, 100).onChange((value) => {
    const { vertices } = createGridGeometry({
      size: terrain.size,
      resolution: value,
      amplitude: terrain.amplitude,
      persistance: terrain.persistance,
      octaves: terrain.octaves,
      color: terrain.color,
    });
    mesh.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
  });
  terrainFolder.add(terrain, "size", 1, 100).onChange((value) => {
    const { vertices } = createGridGeometry({
      size: value,
      resolution: terrain.resolution,
      amplitude: terrain.amplitude,
      persistance: terrain.persistance,
      octaves: terrain.octaves,
      color: terrain.color,
    });
    mesh.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
  });

  terrainFolder.add(terrain, "amplitude", 0, 1).onChange((value) => {
    const { vertices } = createGridGeometry({
      size: terrain.size,
      resolution: terrain.resolution,
      amplitude: value,
      persistance: terrain.persistance,
      octaves: terrain.octaves,
      color: terrain.color,
    });

    mesh.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
  });

  terrainFolder.add(terrain, "persistance", 0.01, 1).onChange((value) => {
    const { vertices } = createGridGeometry({
      size: terrain.size,
      resolution: terrain.resolution,
      amplitude: terrain.amplitude,
      persistance: value,
      octaves: terrain.octaves,
      color: terrain.color,
    });

    mesh.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
  });

  terrainFolder.add(terrain, "octaves", 1, 10).onChange((value) => {
    const { vertices } = createGridGeometry({
      size: terrain.size,
      resolution: terrain.resolution,
      amplitude: terrain.amplitude,
      persistance: terrain.persistance,
      octaves: value,
      color: terrain.color,
    });

    mesh.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
  });

  terrainFolder.open();

  return gui;
};
