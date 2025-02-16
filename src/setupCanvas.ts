import * as dat from "dat.gui";
import * as THREE from "three";
import heightMapVtx from "./assets/shaders/heightMap.vert.glsl?url&raw";
import heightMapFrag from "./assets/shaders/heightMap.frag.glsl?url&raw";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import vertexShader from "./assets/shaders/scene.vert.glsl?url&raw";
import fragmentShader from "./assets/shaders/scene.frag.glsl?url&raw";
import heightMapPreviewFrag from "./assets/shaders/heightMapPreview.frag.glsl?url&raw";
import heightMapPreviewVtx from "./assets/shaders/heightMapPreview.vert.glsl?url&raw";
import { rotate } from "three/tsl";

type Terrain = {
  size: number;
  resolution: number;
  amplitude: number;
};

const pointer = new THREE.Vector2();

const createHeightMapScene = ({ resolution }: { resolution: number }) => {
  const heightMapScene = new THREE.Scene();
  const heightMapCamera = new THREE.OrthographicCamera(
    0,
    resolution,
    0,
    resolution,
    -1,
    1000
  );

  const targetgeometry = new THREE.PlaneGeometry(resolution, resolution);
  const heightMapMaterial = new THREE.ShaderMaterial({
    uniforms: {
      resolution: { value: resolution },
      persistence: { value: 0.01 },
      octaves: { value: 8 },
      lacunarity: { value: 2.0 },
      scale: { value: 1 },
      offsetX: { value: 0.0 },
      offsetY: { value: 0.0 },
    },
    vertexShader: heightMapVtx,
    fragmentShader: heightMapFrag,
    wireframe: false,
  });

  const quad = new THREE.Mesh(targetgeometry, heightMapMaterial);

  heightMapScene.add(quad);

  return { heightMapScene, heightMapCamera, heightMapMaterial };
};

const createTerrainScene = ({
  size,
  resolution,
  amplitude,
  heightMap,
}: Terrain & {
  heightMap: THREE.WebGLRenderTarget;
}) => {
  const terrainScene = new THREE.Scene();
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
      heightMap: { value: heightMap.texture },
      resolution: { value: resolution },
      amplitude: { value: amplitude },
      kernelSize: { value: 1.0 },
    },
    wireframe: false,
  });

  const mesh = new THREE.Mesh(geometry, terrainMaterial);
  mesh.position.x = -size / 2;
  mesh.position.z = -size / 2;
  terrainScene.add(mesh);

  const terrainCamera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  terrainCamera.position.z = -10;
  terrainCamera.position.y = 10;
  terrainCamera.position.x = -10;
  terrainCamera.lookAt(0, 0, 0);

  return { terrainScene, terrainMaterial, terrainCamera };
};

const createVisualScene = ({
  heightMap,
  terrainTarget,
}: {
  heightMap: THREE.WebGLRenderTarget;
  terrainTarget: THREE.WebGLRenderTarget;
}) => {
  const visualCamera = new THREE.OrthographicCamera(
    -0.5,
    0.5,
    -0.5,
    0.5,
    -1,
    1000
  );
  visualCamera.position.z = -1;
  visualCamera.lookAt(0, 0, 0);

  const visualScene = new THREE.Scene();

  const heightMapQuad = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      uniforms: {
        heightMap: { value: heightMap.texture },
        screenSize: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        size: { value: 300 },
      },
      vertexShader: heightMapPreviewVtx,
      fragmentShader: heightMapPreviewFrag,
      side: THREE.DoubleSide,
    })
  );

  const visualQuadGeometry = new THREE.PlaneGeometry(1, 1);
  visualQuadGeometry.rotateZ(Math.PI);

  const visualQuad = new THREE.Mesh(
    visualQuadGeometry,
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      map: terrainTarget.texture,
    })
  );

  visualQuad.position.z = 1;
  visualQuad.position.x = 0;

  visualScene.add(visualQuad);
  visualScene.add(heightMapQuad);

  return { visualScene, visualCamera };
};

export const setupCanvas = () => {
  const resolution = 512;

  const renderer = new THREE.WebGLRenderer();
  const heightMapTarget = new THREE.WebGLRenderTarget(resolution, resolution);
  const terrainTarget = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight
  );

  const { heightMapMaterial, heightMapScene, heightMapCamera } =
    createHeightMapScene({
      resolution,
    });
  const { terrainScene, terrainMaterial, terrainCamera } = createTerrainScene({
    size: 10,
    resolution,
    amplitude: 1,
    heightMap: heightMapTarget,
  });
  const { visualScene, visualCamera } = createVisualScene({
    heightMap: heightMapTarget,
    terrainTarget,
  });

  new OrbitControls(terrainCamera, renderer.domElement);
  document.body.appendChild(renderer.domElement);

  const gui = new dat.GUI();

  const terrainFolder = gui.addFolder("Terrain");
  terrainFolder
    .add(heightMapMaterial.uniforms.persistence, "value", 0, 1)
    .name("Persistence");
  terrainFolder
    .add(heightMapMaterial.uniforms.octaves, "value", 1, 10)
    .name("Octaves");
  terrainFolder
    .add(heightMapMaterial.uniforms.lacunarity, "value", 1, 10)
    .name("Lacunarity");
  terrainFolder
    .add(heightMapMaterial.uniforms.scale, "value", 0.01, 3)
    .name("Scale");
  terrainFolder.add(terrainMaterial, "wireframe").name("Wireframe");
  terrainFolder
    .add(heightMapMaterial.uniforms.offsetX, "value", -1000, 1000)
    .name("Offset X");
  terrainFolder
    .add(heightMapMaterial.uniforms.offsetY, "value", -1000, 1000)
    .name("Offset Y");

  terrainFolder.open();

  window.addEventListener("mousemove", (e) => {
    const x = e.offsetX / window.innerWidth;
    const y = e.offsetY / window.innerHeight;

    pointer.set(x, y);
  });

  requestAnimationFrame(function animate() {
    terrainMaterial.uniforms.heightMap.value = heightMapTarget.texture;

    renderer.setRenderTarget(heightMapTarget);
    renderer.setSize(resolution, resolution);
    renderer.render(heightMapScene, heightMapCamera);

    renderer.setRenderTarget(terrainTarget);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(terrainScene, terrainCamera);

    renderer.setRenderTarget(null);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(visualScene, visualCamera);

    //Read color under pointer for scene texture

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
