/* The home page's 3D hero: the gold AA emblem, a rising city of lit buildings, stars, and a camera
   that flies in as the page scrolls. A plain three.js port of the React Three Fiber HeroScene
   (same materials, timings, bloom and vignette), with these changes: the emblem is built from the
   logo's own outlines (two upright A's sharing a chevron, the diamond on top) instead of block letters,
   it sways facing the visitor instead of spinning, and a front light shows its face.

   Source for site/hero3d.js. Rebuild with: sh site/tools/build-hero3d.sh
   Exposes window.HERO3D.mount(stage, getProgress) -> handle | null (null when WebGL is unavailable). */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { VignetteShader } from "three/examples/jsm/shaders/VignetteShader.js";

const GOLD = "#C9A04F";
const LIGHT_GOLD = "#E8C77B";
const OBSIDIAN = "#0D0E10";
const BUILDING_COUNT = 170;
const GROUND_Y = -2.1;
const { clamp, lerp, smoothstep } = THREE.MathUtils;

// The emblem's own outlines (site/shell.html #emblem: 17-unit strokes with mitred joins, clipped as in
// the logo), converted to scene units: x = (svgX - 273) / 170, y = (251 - svgY) / 170.
// The left A is a slanted leg and an upright meeting in a sharp apex; the bar is the left half of the
// shared chevron. The right side is the mirror image.
const A_LEFT = [[-1.1157, -0.9588], [-1.1781, -0.9213], [-0.1088, 0.8566], [-0.1088, -1.1118], [-0.2088, -1.1118], [-0.2088, 0.4963], [-1.0848, -0.9602]];
const BAR_LEFT = [[-0.6142, -0.8471], [0, -0.1478], [0, -0.2993], [-0.4811, -0.8471]];
const DIAMOND_Y = 0.9412, DIAMOND_R = 0.1706;
const mirror = (pts) => pts.map(([x, y]) => [-x, y]).reverse();

function piece(points) {
  const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.012, bevelSegments: 2 });
  geo.translate(0, 0, -0.08);
  return geo;
}

function makeWindowTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, 64, 128);
  for (let y = 0; y < 14; y += 1) {
    for (let x = 0; x < 5; x += 1) {
      if (Math.random() < 0.45) {
        const r = Math.random();
        ctx.fillStyle = r > 0.85 ? "#3F6EA6" : r > 0.4 ? "#E8C77B" : "#C9A04F";
        ctx.globalAlpha = 0.5 + Math.random() * 0.5;
        ctx.fillRect(6 + x * 11, 6 + y * 8.6, 6, 4.4);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function emblem(scene) {
  const gold = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.24, emissive: "#7a5c1e", emissiveIntensity: 0.6 });
  const group = new THREE.Group();
  group.position.set(0, 0.35, 0);
  group.scale.setScalar(1.15);
  const half = (a, bar) => { const g = new THREE.Group(); g.add(new THREE.Mesh(piece(a), gold), new THREE.Mesh(piece(bar), gold)); return g; };
  const leftA = half(A_LEFT, BAR_LEFT);                  // left A with its half of the chevron
  const rightA = half(mirror(A_LEFT), mirror(BAR_LEFT)); // the mirror image: upright, like the logo
  const float = new THREE.Group();                       // drei <Float speed={2.4} rotationIntensity={0.9} floatIntensity={0.9}>
  // the diamond glows: a bright light-gold material the bloom picks up, and a small light inside it
  const glow = new THREE.MeshStandardMaterial({ color: LIGHT_GOLD, metalness: 0.6, roughness: 0.18, emissive: "#D9A445", emissiveIntensity: 1.2 });
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(DIAMOND_R, 0), glow);
  diamond.position.set(0, DIAMOND_Y, 0);
  const halo = new THREE.PointLight(LIGHT_GOLD, 2.5, 2.2, 2);
  diamond.add(halo);
  float.add(diamond);
  group.add(leftA, rightA, float);
  scene.add(group);
  const floatOffset = Math.random() * 10000;
  return (p, t, delta, pointer) => {
    const split = smoothstep(p, 0.3, 0.62);
    // a gentle sway that keeps the emblem facing the visitor
    group.rotation.y = lerp(group.rotation.y, (Math.sin(t * 0.5) * 0.32 + pointer.x * 0.18) * (1 - split * 0.6), 0.08);
    group.rotation.x = lerp(group.rotation.x, pointer.y * 0.14 * (1 - split), 0.06);
    group.position.y = 0.35 + Math.sin(t * 0.8) * 0.05;
    leftA.position.x = -split * 7.5;
    rightA.position.x = split * 7.5;
    leftA.rotation.z = split * 0.4;     // each A leans outward as they part
    rightA.rotation.z = -split * 0.4;
    diamond.position.y = DIAMOND_Y + split * 5;
    diamond.scale.setScalar(Math.max(1 - split * 0.5, 0.001));
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.6);   // a slow breathing glow
    glow.emissiveIntensity = 0.9 + 0.7 * pulse;
    halo.intensity = 2 + 1.5 * pulse;
    const ft = (floatOffset + t) / 4 * 2.4;
    float.rotation.set((Math.cos(ft) / 8) * 0.9, (Math.sin(ft) / 8) * 0.9, (Math.sin(ft) / 20) * 0.9);
    float.position.y = (Math.sin(ft) / 10) * 0.5;   // a smaller drift than drei's default, so the diamond stays on its apex
  };
}

function skyline(scene) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(0, 0.5, 0);
  const rng = (a, b) => a + Math.random() * (b - a);
  const list = [];
  for (let i = 0; i < BUILDING_COUNT; i += 1) {
    const z = -3 - Math.random() * 13;
    let x = rng(-16, 16);
    if (Math.abs(x) < 2.2) x = Math.sign(x || 1) * rng(2.2, 4.5);
    const h = rng(1.2, 7) * (1 - Math.abs(x) / 26);
    list.push({ x, z, h, w: rng(0.7, 1.7), d: rng(0.7, 1.7), jitter: Math.random() * 0.12 });
  }
  list.sort((a, b) => a.z - b.z);
  list.forEach((b, i) => { b.t = (i / list.length) * 0.5 + b.jitter; });
  const mat = new THREE.MeshStandardMaterial({ color: "#0f1218", roughness: 0.85, metalness: 0.2, emissive: "#f5d9a0", emissiveMap: makeWindowTexture(), emissiveIntensity: 0 });
  const mesh = new THREE.InstancedMesh(geo, mat, BUILDING_COUNT);
  mesh.frustumCulled = false;
  scene.add(mesh);
  const dummy = new THREE.Object3D();
  return (p) => {
    const rise = clamp((p - 0.42) / 0.42, 0, 1);
    for (let i = 0; i < list.length; i += 1) {
      const b = list[i];
      const local = clamp((rise - b.t) / 0.5, 0, 1);
      const e = 1 - (1 - local) ** 3;
      dummy.position.set(b.x, GROUND_Y, b.z);
      // a building that hasn't started rising is hidden, not left as a flat tile on the ground
      if (e > 0) dummy.scale.set(b.w, b.h * e, b.d); else dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mat.emissiveIntensity = 1.7 * smoothstep(p, 0.55, 0.95);
  };
}

function stars(scene) {
  const arr = new Float32Array(260 * 3);
  for (let i = 0; i < 260; i += 1) {
    arr[i * 3] = (Math.random() - 0.5) * 60;
    arr[i * 3 + 1] = Math.random() * 22 - 2;
    arr[i * 3 + 2] = -6 - Math.random() * 30;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: LIGHT_GOLD, size: 0.045, transparent: true, opacity: 0.7, sizeAttenuation: true, depthWrite: false })));
}

function cameraRig(camera) {
  return (p, pointer) => {
    const fly = smoothstep(p, 0, 0.45);
    const settle = smoothstep(p, 0.6, 1);
    camera.position.z = lerp(9.5, 4.6, fly) + settle * 1.4;
    camera.position.y = lerp(0.5, 0.1, fly) + settle * 1.15;
    camera.position.x = lerp(camera.position.x, pointer.x * 0.5 * (1 - settle * 0.5), 0.05);
    camera.lookAt(0, lerp(0.4, 0.2, fly) + settle * 0.3, -settle * 5);
  };
}

function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (e) {
    return false;
  }
}

function mount(stage, getProgress) {
  if (!stage || !webglOK()) return null;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  } catch (e) {
    return null;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;   // React Three Fiber's defaults
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = "hero3d";
  canvas.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(OBSIDIAN);
  scene.fog = new THREE.Fog(OBSIDIAN, 9, 30);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 70);
  camera.position.set(0, 0.5, 9.5);
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const key = new THREE.DirectionalLight("#fff1d4", 1.8); key.position.set(5, 7, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(LIGHT_GOLD, 3); rim.position.set(-6, 4, -8); scene.add(rim);
  const fill = new THREE.PointLight("#ffe9bd", 40, 26); fill.position.set(0, 2.5, 5); scene.add(fill);
  const face = new THREE.SpotLight("#fff1d4", 9, 22, 0.35, 0.8); face.position.set(0, 1.2, 9); face.target.position.set(0, 0.4, 0);   // lights the emblem's face from the front
  scene.add(face, face.target);
  const updEmblem = emblem(scene), updSky = skyline(scene);
  stars(scene);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 60), new THREE.MeshStandardMaterial({ color: "#0a0b0f", roughness: 1, metalness: 0 }));
  ground.position.set(0, GROUND_Y - 0.01, -6);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const rig = cameraRig(camera);

  // <EffectComposer><Bloom mipmapBlur intensity={0.5} luminanceThreshold={0.22} luminanceSmoothing={0.65}/><Vignette offset={0.22} darkness={0.6}/>
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.65, 0.22);
  composer.addPass(bloom);
  const vignette = new ShaderPass(VignetteShader);
  vignette.uniforms.offset.value = 0.22 * 4;   // the shader's offset runs on a wider scale than postprocessing's
  vignette.uniforms.darkness.value = 0.6 * 1.6;
  composer.addPass(vignette);
  composer.addPass(new OutputPass());

  const pointer = { x: 0, y: 0 };
  const onPointer = (e) => { pointer.x = (e.clientX / innerWidth) * 2 - 1; pointer.y = -((e.clientY / innerHeight) * 2 - 1); };
  window.addEventListener("pointermove", onPointer, { passive: true });

  function size() {
    const w = stage.clientWidth || innerWidth, h = stage.clientHeight || innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 760 ? 1.5 : 2));
    renderer.setSize(w, h, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", size);
  stage.prepend(canvas);
  size();

  const clock = new THREE.Clock();
  let raf = 0, alive = true;
  function frame() {
    raf = 0;
    if (!alive) return;
    if (!canvas.isConnected) return dispose();     // the page re-rendered: free the GPU context
    const delta = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
    const r = stage.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) {     // draw only while the hero is on screen
      const p = getProgress();
      updEmblem(p, t, delta, pointer);
      updSky(p);
      rig(p, pointer);
      composer.render(delta);
    }
    raf = requestAnimationFrame(frame);
  }
  function dispose() {
    alive = false;
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("resize", size);
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { if (o.material.emissiveMap) o.material.emissiveMap.dispose(); o.material.dispose(); }
    });
    composer.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }
  raf = requestAnimationFrame(frame);
  return { dispose, canvas };
}

window.HERO3D = { mount };
