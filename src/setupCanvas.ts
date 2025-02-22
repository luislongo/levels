import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import brushTex from "./assets/brush3.png";
import heightMapPreviewFrag from "./assets/shaders/heightMapPreview.frag.glsl?url&raw";
import heightMapPreviewVtx from "./assets/shaders/heightMapPreview.vert.glsl?url&raw";
import fragmentUVShader from "./assets/shaders/sceneUV.frag.glsl?url&raw";
import fragmentShader from "./assets/shaders/scene.frag.glsl?url&raw";
import vertexShader from "./assets/shaders/scene.vert.glsl?url&raw";
import dat from "dat.gui";

type Terrain = {
  size: number;
  resolution: number;
  amplitude: number;
};

const brushPrefs = {
  up: false,
};

const pointer = new THREE.Vector2();
let isDrawing = false;

const createHeightMapScene = ({ resolution }: { resolution: number }) => {
  const heightMapScene = new THREE.Scene();
  const heightMapCamera = new THREE.OrthographicCamera(
    0,
    resolution,
    0,
    resolution,
    0.01,
    1000
  );
  heightMapCamera.position.z = 10;

  const brush = new THREE.PlaneGeometry(200, 200);
  const brushTexture = new THREE.TextureLoader().load(brushTex);
  const brushMaterial = new THREE.MeshBasicMaterial({
    map: brushTexture,
    side: THREE.DoubleSide,
    opacity: 0.1,
    transparent: true,
    blendEquation: THREE.ReverseSubtractEquation,
  });
  const brushQuad = new THREE.Mesh(brush, brushMaterial);
  brushQuad.position.x = 100;
  brushQuad.position.y = 100;
  brushQuad.position.z = 3;
  heightMapScene.add(brushQuad);

  return { heightMapScene, heightMapCamera, brushQuad, brushMaterial };
};

const createTerrainScene = ({
  size,
  resolution,
  amplitude,
  heightMap,
}: Terrain & {
  heightMap: THREE.WebGLRenderTarget;
}) => {
  const uvScene = new THREE.Scene();
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

  const uvMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: fragmentUVShader,
    uniforms: {
      size: { value: size },
      heightMap: { value: heightMap.texture },
      resolution: { value: resolution },
      amplitude: { value: amplitude },
      kernelSize: { value: 1.0 },
    },
    wireframe: false,
  });

  const terrainMaterial = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: fragmentShader,
    uniforms: {
      size: { value: size },
      heightMap: { value: heightMap.texture },
      resolution: { value: resolution },
      amplitude: { value: amplitude },
      kernelSize: { value: 1.0 },
      flatAreaColor: { value: [0.0, 1.0, 0.0, 1.0] },
      steepAreaColor: { value: [171.0 / 255, 168 / 255, 168 / 255, 1.0] },
    },
    wireframe: false,
  });

  const uvMesh = new THREE.Mesh(geometry, uvMaterial);
  uvMesh.position.x = -size / 2;
  uvMesh.position.z = -size / 2;
  uvScene.add(uvMesh);

  const terrainMesh = new THREE.Mesh(geometry, terrainMaterial);
  terrainMesh.position.x = -size / 2;
  terrainMesh.position.z = -size / 2;
  terrainScene.add(terrainMesh);

  const terrainCamera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  terrainCamera.position.z = -5;
  terrainCamera.position.y = 5;
  terrainCamera.position.x = -5;
  terrainCamera.lookAt(0, 0, 0);

  return { uvScene, terrainScene, terrainCamera, terrainMaterial };
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
  const uvTarget = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight
  );
  const terrainTarget = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight
  );

  const { heightMapScene, heightMapCamera, brushQuad, brushMaterial } =
    createHeightMapScene({
      resolution,
    });
  const { uvScene, terrainScene, terrainCamera, terrainMaterial } =
    createTerrainScene({
      size: 10,
      resolution,
      amplitude: 1,
      heightMap: heightMapTarget,
    });
  const { visualScene, visualCamera } = createVisualScene({
    heightMap: heightMapTarget,
    terrainTarget: terrainTarget,
  });

  document.body.appendChild(renderer.domElement);

  window.addEventListener("mousemove", (e) => {
    const x = e.clientX;
    const y = e.clientY;

    pointer.set(x, y);
  });

  window.addEventListener("mousedown", () => {
    isDrawing = true;
  });

  window.addEventListener("mouseup", () => {
    isDrawing = false;
  });

  renderer.setRenderTarget(heightMapTarget);
  renderer.setClearColor(0x000000);
  renderer.clear();

  const gui = new dat.GUI();
  gui.add(brushPrefs, "up", true).onChange((value) => {
    if (value) {
      brushMaterial.blendEquationAlpha = THREE.AddEquation;
    } else {
      brushMaterial.blendEquationAlpha = THREE.SubtractEquation;
    }
  });

  gui
    .addColor(terrainMaterial.uniforms.flatAreaColor, "value")
    .onChange((v) => {
      terrainMaterial.uniforms.flatAreaColor.value = [
        v[0] / 255,
        v[1] / 255,
        v[2] / 255,
        1,
      ];
    });
  gui
    .addColor(terrainMaterial.uniforms.steepAreaColor, "value")
    .onChange((v) => {
      terrainMaterial.uniforms.steepAreaColor.value = [
        v[0] / 255,
        v[1] / 255,
        v[2] / 255,
        1,
      ];
    });

  setInterval(() => {
    renderer.setRenderTarget(uvTarget);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(uvScene, terrainCamera);

    renderer.setRenderTarget(terrainTarget);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(terrainScene, terrainCamera);

    renderer.setRenderTarget(null);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(visualScene, visualCamera);

    if (isDrawing && pointer.x !== 0 && pointer.y !== 0) {
      const pixelBuffer = new Uint8Array(4);
      renderer.readRenderTargetPixels(
        uvTarget,
        pointer.x,
        window.innerHeight - pointer.y,
        1,
        1,
        pixelBuffer
      );

      const xFromPixel = pixelBuffer[0] / 255;
      const yFromPixel = pixelBuffer[1] / 255;

      brushQuad.position.x = xFromPixel * resolution;
      brushQuad.position.y = (1 - yFromPixel) * resolution;

      renderer.setRenderTarget(heightMapTarget);
      renderer.autoClear = false;
      renderer.render(heightMapScene, heightMapCamera);
      renderer.autoClear = true;
      renderer.setRenderTarget(null);
    } //Read color under pointer for scene texture
  }, 1000 / 30);
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
