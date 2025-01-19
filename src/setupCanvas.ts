import * as THREE from "three";
import * as dat from "dat.gui";

type Terrain = {
  size: number;
  resolution: number;
  color: string;
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

  const terrain: Terrain = {
    size: 10,
    resolution: 10,
    color: "#00ff00",
  };

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

const createGridGeometry = ({
  size,
  resolution,
}: {
  size: number;
  resolution: number;
}) => {
  const halfSize = size / 2;
  const vertices = [];

  const step = size / resolution;

  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const x0 = i * step - halfSize;
      const z0 = j * step - halfSize;
      const x1 = (i + 1) * step - halfSize;
      const z1 = (j + 1) * step - halfSize;

      vertices.push(x0, 0, z0);
      vertices.push(x1, 0, z1);
      vertices.push(x1, 0, z0);

      vertices.push(x0, 0, z0);
      vertices.push(x0, 0, z1);
      vertices.push(x1, 0, z1);
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
    });
    mesh.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );

    mesh.geometry.computeVertexNormals();
  });
  terrainFolder.add(terrain, "size", 1, 100).onChange((value) => {
    const { vertices } = createGridGeometry({
      size: value,
      resolution: terrain.resolution,
    });
    mesh.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );

    mesh.geometry.computeVertexNormals();
  });

  terrainFolder.open();

  return gui;
};
