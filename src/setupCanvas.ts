import * as dat from "dat.gui";
import * as THREE from "three";
import heightMapVtx from "./assets/shaders/heightMap.vert.glsl?url&raw";
import heightMapFrag from "./assets/shaders/heightMap.frag.glsl?url&raw";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import vertexShader from "./assets/shaders/scene.vert.glsl?url&raw";
import fragmentShader from "./assets/shaders/scene.frag.glsl?url&raw";
import heightMapPreviewFrag from "./assets/shaders/heightMapPreview.frag.glsl?url&raw";
import heightMapPreviewVtx from "./assets/shaders/heightMapPreview.vert.glsl?url&raw";

type Terrain = {
  size: number;
  resolution: number;
  amplitude: number;
};

const createScene = ({
  size,
  resolution,
  amplitude,
  renderTarget,
}: Terrain & {
  renderTarget: THREE.WebGLRenderTarget;
}) => {
  const mainScene = new THREE.Scene();
  const { vertices, indices } = createGridGeometry({
    size,
    resolution,
    amplitude,
  });
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
      size: { value: size },
      heightMap: { value: renderTarget.texture },
      resolution: { value: resolution },
      amplitude: { value: amplitude },
      kernelSize: { value: 1.0 },
    },
    wireframe: false,
  });

  const mesh = new THREE.Mesh(geometry, terrainMaterial);
  mesh.position.x = -size / 2;
  mesh.position.z = -size / 2;
  mainScene.add(mesh);

  const heightMapQuadGeometry = new THREE.PlaneGeometry(1, 1);
  heightMapQuadGeometry.translate(0.5, 0.5, 0);

  const heightMapQuad = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      uniforms: {
        heightMap: { value: renderTarget.texture },
        screenSize: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        size: { value: 300 },
      },
      vertexShader: heightMapPreviewVtx,
      fragmentShader: heightMapPreviewFrag,
    })
  );
  heightMapQuad.position.z = -1;
  heightMapQuad.position.x = -1;
  mainScene.add(heightMapQuad);

  return { mainScene, terrainMaterial };
};

const createTargetScene = ({
  resolution,
  renderTarget,
}: {
  resolution: number;
  renderTarget: THREE.WebGLRenderTarget;
}) => {
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

  return { targetScene, targetCamera, targetMaterial, renderTarget };
};

export const setupCanvas = () => {
  const resolution = 512;

  const renderer = new THREE.WebGLRenderer();
  const renderTarget = new THREE.WebGLRenderTarget(resolution, resolution);

  const { mainScene, terrainMaterial } = createScene({
    size: 10,
    resolution,
    amplitude: 1,
    renderTarget,
  });
  const { targetScene, targetCamera, targetMaterial } = createTargetScene({
    resolution,
    renderTarget,
  });

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  camera.position.z = -10;
  camera.position.y = 10;
  camera.position.x = -10;
  camera.lookAt(0, 0, 0);

  new OrbitControls(camera, renderer.domElement);
  document.body.appendChild(renderer.domElement);

  const gui = new dat.GUI();

  const terrainFolder = gui.addFolder("Terrain");
  terrainFolder
    .add(targetMaterial.uniforms.persistence, "value", 0, 1)
    .name("Persistence");
  terrainFolder
    .add(targetMaterial.uniforms.octaves, "value", 1, 10)
    .name("Octaves");
  terrainFolder
    .add(targetMaterial.uniforms.lacunarity, "value", 1, 10)
    .name("Lacunarity");
  terrainFolder
    .add(targetMaterial.uniforms.scale, "value", 0.01, 1)
    .name("Scale");
  terrainFolder.add(terrainMaterial, "wireframe").name("Wireframe");

  terrainFolder.open();

  requestAnimationFrame(function animate() {
    terrainMaterial.uniforms.heightMap.value = renderTarget.texture;

    renderer.setRenderTarget(renderTarget);
    renderer.setSize(resolution, resolution);
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
