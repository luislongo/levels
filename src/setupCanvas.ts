import * as THREE from "three";

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

  const { vertices } = createGridGeometry({ size: 10, resolution: 10 });
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

  renderer.render(scene, camera);

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
