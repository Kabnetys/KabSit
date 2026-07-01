/**
 * LandscapeScene — architecture fidèle à hubtown.co.in
 *
 * Sources : analyse du code source hubtown (_nuxt/CBIW8Dul.js)
 *
 * Techniques confirmées par le source :
 * - Terrain : PlaneGeometry + displacementMap + normalMap (texture-based)
 * - FOV setFocalLength(50) → ~38° (téléobjectif, pas grand-angle)
 * - Fog gradient 3 couches : top/middle/bottom (shader custom)
 * - Camera pivot souris : pointerLerpSpeed 0.032
 * - UnrealBloomPass piloté par GSAP (strength/threshold/radius par chapitre)
 * - GSAP ScrollTrigger scrub → sequence.position (leur architecture exacte)
 * - Palette : #020A19 fond + #D5E0FF toute la lumière
 */

import * as THREE from 'three';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

gsap.registerPlugin(ScrollTrigger);

// ─── Palette ──────────────────────────────────────────────────────────────────
const BG_COLOR   = new THREE.Color(0x020a19);
const LIGHT_COL  = new THREE.Color(0xd5e0ff);

// ─── Génération des textures en Canvas (remplace square-displacement.png) ────
/**
 * Crée une heightmap 512×512 par FBM Perlin, retourne CanvasTexture.
 * Hubtown charge square-displacement.png depuis leur CDN —
 * on génère l'équivalent procéduralement.
 */
function makeDisplacementTexture(): THREE.CanvasTexture {
  const SIZE = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(SIZE, SIZE);

  // Perlin-like gradient noise
  const P: number[] = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor((i / 255) * 41651 + 19) % (i + 1);
    [P[i], P[j]] = [P[j]!, P[i]!];
  }
  const PERM = [...P, ...P];

  function fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
  function grad(h: number, x: number, y: number): number {
    const g = h & 3;
    return ((g & 1) ? x : -x) + ((g & 2) ? y : -y);
  }
  function pn(x: number, y: number): number {
    const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = PERM[xi]! + yi, ab = PERM[xi]! + yi + 1;
    const ba = PERM[xi + 1]! + yi, bb = PERM[xi + 1]! + yi + 1;
    return (
      u * v * grad(PERM[bb]!, xf - 1, yf - 1) +
      (1 - u) * v * grad(PERM[ab]!, xf, yf - 1) +
      u * (1 - v) * grad(PERM[ba]!, xf - 1, yf) +
      (1 - u) * (1 - v) * grad(PERM[aa]!, xf, yf)
    );
  }
  function fbm(x: number, y: number): number {
    let v = 0, a = 1.0, f = 1.0, n = 0;
    for (let i = 0; i < 7; i++) { v += a * pn(x * f, y * f); n += a; a *= 0.48; f *= 2.09; }
    return v / n;
  }

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const nx = x / SIZE * 3 + 1.7;
      const ny = y / SIZE * 3 + 0.9;
      let h = fbm(nx, ny);
      // Ridgeline effect (accentue les crêtes — caractéristique hubtown)
      const ridge = 1 - Math.abs(fbm(nx * 0.6 + 5, ny * 0.6 + 3));
      h = h * 0.6 + ridge * ridge * 0.4;
      // Normalisé 0-255
      const v = Math.max(0, Math.min(255, (h * 0.5 + 0.5) * 255));
      const i = (y * SIZE + x) * 4;
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Calcule une normal map à partir de la heightmap (sobel filter).
 * Hubtown charge terrain_normal.jpg — on l'approxime depuis la displacement map.
 */
function makeNormalTexture(dispTex: THREE.CanvasTexture): THREE.CanvasTexture {
  const src = dispTex.source.data as HTMLCanvasElement;
  const SIZE = src.width;
  const srcCtx = src.getContext('2d')!;
  const srcData = srcCtx.getImageData(0, 0, SIZE, SIZE);

  const nCanvas = document.createElement('canvas');
  nCanvas.width = nCanvas.height = SIZE;
  const nCtx = nCanvas.getContext('2d')!;
  const nImg = nCtx.createImageData(SIZE, SIZE);

  const h = (x: number, y: number): number => {
    const xi = Math.max(0, Math.min(SIZE - 1, x));
    const yi = Math.max(0, Math.min(SIZE - 1, y));
    return (srcData.data[(yi * SIZE + xi) * 4]! / 255) * 2 - 1;
  };

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const strength = 4.0;
      const dx = (h(x - 1, y) - h(x + 1, y)) * strength;
      const dy = (h(x, y - 1) - h(x, y + 1)) * strength;
      const nx = dx * 0.5 + 0.5;
      const ny = dy * 0.5 + 0.5;
      const nz = 1.0;
      const i = (y * SIZE + x) * 4;
      nImg.data[i]     = Math.round(nx * 255);
      nImg.data[i + 1] = Math.round(ny * 255);
      nImg.data[i + 2] = Math.round(nz * 255);
      nImg.data[i + 3] = 255;
    }
  }
  nCtx.putImageData(nImg, 0, 0);
  const tex = new THREE.CanvasTexture(nCanvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ─── Fog 3-couches (distance + hauteur) — reproduit uFogColorTop/Middle/Bottom ─
/**
 * Injection GLSL dans le fragment shader standard de Three.js.
 * Remplace le fog exp2 plat par un dégradé vertical (bottom→middle→top)
 * modulé par la distance à la caméra — exactement le principe du shader
 * hubtown (uFogStep1/2/3, uFogColorTop/Middle/Bottom, vFogHeight/vFogDepth).
 */
const layeredFogUniforms = {
  uFogColorBottom: { value: new THREE.Color(0x010308) },
  uFogColorMiddle: { value: new THREE.Color(0x081226) },
  uFogColorTop:    { value: new THREE.Color(0x0e1c3a) },
  uFogHeightMin:   { value: -10 },
  uFogHeightMax:   { value: 60 },
  uFogNear:        { value: 40 },
  uFogFar:         { value: 260 },
};

function applyLayeredFog(material: THREE.Material): void {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, layeredFogUniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
varying float vFogDepth;
varying float vFogHeight;`,
      )
      .replace(
        '#include <fog_vertex>',
        `#include <fog_vertex>
vFogDepth  = -mvPosition.z;
vFogHeight = worldPosition.y;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying float vFogDepth;
varying float vFogHeight;
uniform vec3 uFogColorBottom;
uniform vec3 uFogColorMiddle;
uniform vec3 uFogColorTop;
uniform float uFogHeightMin;
uniform float uFogHeightMax;
uniform float uFogNear;
uniform float uFogFar;`,
      )
      .replace(
        '#include <fog_fragment>',
        `
float heightT = clamp((vFogHeight - uFogHeightMin) / (uFogHeightMax - uFogHeightMin), 0.0, 1.0);
vec3 fogColorH = heightT < 0.5
  ? mix(uFogColorBottom, uFogColorMiddle, heightT * 2.0)
  : mix(uFogColorMiddle, uFogColorTop, (heightT - 0.5) * 2.0);
float distT = clamp((vFogDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
distT = distT * distT * (3.0 - 2.0 * distT);
gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColorH, distT);
`,
      );
  };
  material.needsUpdate = true;
}

// ─── Chapitres scroll ─────────────────────────────────────────────────────────
// Architecture hubtown : GSAP ScrollTrigger scrub → state → position caméra
interface Chapter {
  p:     number;
  // Position caméra (orbitale)
  r:     number;
  theta: number;
  camY:  number;
  lookY: number;   // hauteur du lookAt
  // Post-fx (Theatre.js-equivalent)
  bloomStr:   number;
  bloomThr:   number;
  bloomRad:   number;
  // Lumières
  moonI:      number;
  beaI:       number;
  // Fog (inspiré du fog gradient hubtown)
  fogDensity: number;
  fogNear:    number;
  fogFar:     number;
  fogBottom:  THREE.Color;
  fogMiddle:  THREE.Color;
  fogTop:     THREE.Color;
  // Étoiles
  stars:      number;
}

function fc(hex: number): THREE.Color { return new THREE.Color(hex); }

const CHAPTERS: Chapter[] = [
  { p:0.00, r:  8, theta:0.00, camY:180, lookY:0, bloomStr:0.3, bloomThr:0.88, bloomRad:0.4, moonI:1.8, beaI: 8, fogDensity:0.0003, fogNear: 60, fogFar:300, fogBottom:fc(0x010308), fogMiddle:fc(0x040a18), fogTop:fc(0x081430), stars:0.0 },
  { p:0.17, r: 35, theta:0.22, camY:145, lookY:2, bloomStr:0.5, bloomThr:0.82, bloomRad:0.5, moonI:2.1, beaI:16, fogDensity:0.0005, fogNear: 50, fogFar:280, fogBottom:fc(0x01050c), fogMiddle:fc(0x081226), fogTop:fc(0x0c1c3a), stars:0.1 },
  { p:0.35, r: 75, theta:0.50, camY:110, lookY:3, bloomStr:0.7, bloomThr:0.78, bloomRad:0.5, moonI:2.4, beaI:26, fogDensity:0.0008, fogNear: 42, fogFar:250, fogBottom:fc(0x020610), fogMiddle:fc(0x0a1530), fogTop:fc(0x102248), stars:0.3 },
  { p:0.52, r:105, theta:0.78, camY: 78, lookY:4, bloomStr:1.1, bloomThr:0.72, bloomRad:0.6, moonI:2.0, beaI:38, fogDensity:0.0015, fogNear: 35, fogFar:220, fogBottom:fc(0x030814), fogMiddle:fc(0x0c1938), fogTop:fc(0x142850), stars:0.6 },
  { p:0.68, r:115, theta:1.08, camY: 58, lookY:4, bloomStr:0.9, bloomThr:0.75, bloomRad:0.6, moonI:2.3, beaI:30, fogDensity:0.0011, fogNear: 40, fogFar:240, fogBottom:fc(0x020712), fogMiddle:fc(0x0a1730), fogTop:fc(0x102448), stars:0.8 },
  { p:0.84, r:110, theta:1.32, camY: 44, lookY:3, bloomStr:0.7, bloomThr:0.80, bloomRad:0.5, moonI:2.6, beaI:20, fogDensity:0.0008, fogNear: 48, fogFar:260, fogBottom:fc(0x01060e), fogMiddle:fc(0x08132a), fogTop:fc(0x0d1e3e), stars:0.9 },
  { p:1.00, r:100, theta:1.58, camY: 35, lookY:2, bloomStr:0.5, bloomThr:0.84, bloomRad:0.4, moonI:2.9, beaI:14, fogDensity:0.0006, fogNear: 55, fogFar:290, fogBottom:fc(0x01050c), fogMiddle:fc(0x061024), fogTop:fc(0x0a1a34), stars:1.0 },
];

const state = {
  ...CHAPTERS[0]!,
  p: 0,
  fogBottom: CHAPTERS[0]!.fogBottom.clone(),
  fogMiddle: CHAPTERS[0]!.fogMiddle.clone(),
  fogTop:    CHAPTERS[0]!.fogTop.clone(),
};

function seekTo(progress: number): void {
  let lo = CHAPTERS[0]!, hi = CHAPTERS[CHAPTERS.length - 1]!;
  for (let i = 0; i < CHAPTERS.length - 1; i++) {
    if (progress >= CHAPTERS[i]!.p && progress <= CHAPTERS[i + 1]!.p) {
      lo = CHAPTERS[i]!; hi = CHAPTERS[i + 1]!; break;
    }
  }
  const span = hi.p - lo.p;
  const t    = span < 1e-5 ? 0 : (progress - lo.p) / span;
  const e    = t * t * (3 - 2 * t);
  const L = (a: number, b: number): number => a + (b - a) * e;

  gsap.to(state, {
    duration:  1.2,
    ease:      'sine.inOut',
    r:          L(lo.r,          hi.r),
    theta:      L(lo.theta,      hi.theta),
    camY:       L(lo.camY,       hi.camY),
    lookY:      L(lo.lookY,      hi.lookY),
    bloomStr:   L(lo.bloomStr,   hi.bloomStr),
    bloomThr:   L(lo.bloomThr,   hi.bloomThr),
    bloomRad:   L(lo.bloomRad,   hi.bloomRad),
    moonI:      L(lo.moonI,      hi.moonI),
    beaI:       L(lo.beaI,       hi.beaI),
    fogDensity: L(lo.fogDensity, hi.fogDensity),
    fogNear:    L(lo.fogNear,    hi.fogNear),
    fogFar:     L(lo.fogFar,     hi.fogFar),
    stars:      L(lo.stars,      hi.stars),
    overwrite: true,
  });

  // Couleurs fog interpolées séparément (THREE.Color n'est pas un number GSAP)
  state.fogBottom.copy(lo.fogBottom).lerp(hi.fogBottom, e);
  state.fogMiddle.copy(lo.fogMiddle).lerp(hi.fogMiddle, e);
  state.fogTop.copy(lo.fogTop).lerp(hi.fogTop, e);
}

// ─── Étoiles ──────────────────────────────────────────────────────────────────
function buildStars(): THREE.Points {
  const count = 1800;
  const pos   = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 700;
    pos[i * 3 + 1] = 90 + Math.random() * 310;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 700;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    color: LIGHT_COL, size: 0.48, sizeAttenuation: true,
    transparent: true, opacity: 0, fog: false,
  }));
}

// ─── Classe principale ────────────────────────────────────────────────────────
export class LandscapeScene {
  private renderer:   THREE.WebGLRenderer;
  private composer:   EffectComposer;
  private bloomPass:  UnrealBloomPass;
  private scene:      THREE.Scene;
  private camera:     THREE.PerspectiveCamera;
  private terrain:    THREE.Mesh;
  private stars:      THREE.Points;
  private moon:       THREE.DirectionalLight;
  private beacon:     THREE.PointLight;
  private beaconGlow: THREE.Mesh;

  private time       = 0;
  private raf: number | null = null;

  // Camera pivot — hubtown : pointerLerpSpeed 0.032
  private pivotTarget = new THREE.Vector2(0, 0);
  private pivotCurrent = new THREE.Vector2(0, 0);
  private readonly PIVOT_SPEED = 0.032;

  private beaTarget = new THREE.Vector3(0, 4, 0);

  constructor(canvas: HTMLCanvasElement) {
    // ── Renderer ──
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure  = 1.05;
    this.renderer.shadowMap.enabled   = true;
    this.renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(BG_COLOR, 1);

    // ── Scene ──
    this.scene = new THREE.Scene();
    this.scene.background = BG_COLOR.clone();
    // Fog : distance-based (hubtown utilise aussi un height fog en custom shader —
    // on approxime avec FogExp2 pour l'instant)
    this.scene.fog = new THREE.FogExp2(BG_COLOR.getHex(), CHAPTERS[0]!.fogDensity);

    // ── Camera — FOV via setFocalLength(50) comme hubtown ──
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 800);
    this.camera.setFocalLength(50); // → FOV ~38° en 35mm
    this.camera.position.set(0, 180, 0);
    this.camera.lookAt(0, 0, 0);

    // ── Post-processing ──
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      CHAPTERS[0]!.bloomStr,
      CHAPTERS[0]!.bloomRad,
      CHAPTERS[0]!.bloomThr,
    );
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(this.bloomPass);

    // ── Terrain (displacement + normal texture) ──
    const dispTex = makeDisplacementTexture();
    const normTex = makeNormalTexture(dispTex);

    const geo = new THREE.PlaneGeometry(280, 280, 300, 300);
    geo.rotateX(-Math.PI / 2);

    // Couleur unique du terrain : très sombre, la lumière fait le travail
    const mat = new THREE.MeshStandardMaterial({
      color:            new THREE.Color(0x0a1525),
      displacementMap:  dispTex,
      displacementScale: 32,
      displacementBias: -8,
      normalMap:        normTex,
      normalScale:      new THREE.Vector2(1.5, 1.5),
      roughness:        0.88,
      metalness:        0.08,
      fog:              true,
    });

    applyLayeredFog(mat);

    this.terrain = new THREE.Mesh(geo, mat);
    this.terrain.receiveShadow = true;
    this.terrain.castShadow    = true;
    this.scene.add(this.terrain);

    // ── Étoiles ──
    this.stars = buildStars();
    this.scene.add(this.stars);

    // ── Ambiance (très faible — on veut le contraste) ──
    this.scene.add(new THREE.AmbientLight(0x010509, 0.3));

    // ── Lune (forte pour générer des ombres portées lisibles) ──
    this.moon = new THREE.DirectionalLight(LIGHT_COL, CHAPTERS[0]!.moonI);
    this.moon.position.set(80, 120, 50);
    this.moon.castShadow           = true;
    this.moon.shadow.camera.near   = 1;
    this.moon.shadow.camera.far    = 600;
    this.moon.shadow.camera.left   = -180;
    this.moon.shadow.camera.right  =  180;
    this.moon.shadow.camera.top    =  180;
    this.moon.shadow.camera.bottom = -180;
    this.moon.shadow.mapSize.set(2048, 2048);
    this.moon.shadow.bias = -0.001;
    this.scene.add(this.moon);
    this.scene.add(this.moon.target);

    // ── Beacon — emissive pour déclencher le bloom ──
    this.beacon = new THREE.PointLight(LIGHT_COL, CHAPTERS[0]!.beaI, 110, 1.4);
    this.beacon.position.set(0, 5, 0);
    this.scene.add(this.beacon);

    this.beaconGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 12, 12),
      new THREE.MeshStandardMaterial({
        color:             LIGHT_COL,
        emissive:          LIGHT_COL,
        emissiveIntensity: 4.0,
        transparent:       true,
        opacity:           0.9,
      }),
    );
    this.scene.add(this.beaconGlow);
  }

  setSize(w: number, h: number): void {
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloomPass.resolution.set(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setScroll(p: number): void {
    seekTo(Math.max(0, Math.min(1, p)));
  }

  // hubtown pointerLerpSpeed : 0.032 — lerp très lent sur la position souris
  onMouseMove(clientX: number, clientY: number): void {
    this.pivotTarget.set(
      (clientX / window.innerWidth  - 0.5) * 2,
      (clientY / window.innerHeight - 0.5) * 2,
    );
  }

  start(): void {
    if (this.raf !== null) return;
    const tick = (): void => { this.raf = requestAnimationFrame(tick); this.update(); };
    tick();
  }

  private update(): void {
    this.time += 0.006;

    // Camera pivot — lerp lent (hubtown pointerLerpSpeed 0.032)
    this.pivotCurrent.lerp(this.pivotTarget, this.PIVOT_SPEED);

    // Position orbitale
    const cx = state.r * Math.sin(state.theta);
    const cz = state.r * Math.cos(state.theta);
    this.camera.position.set(cx, state.camY, cz);

    // LookAt + pivot souris (très subtil comme hubtown)
    this.camera.lookAt(
      this.pivotCurrent.x * 5,
      state.lookY + this.pivotCurrent.y * 2.5,
      0,
    );

    // Fog exp2 (background/scene) + fog 3-couches (terrain shader)
    (this.scene.fog as THREE.FogExp2).density = state.fogDensity;
    layeredFogUniforms.uFogColorBottom.value.copy(state.fogBottom);
    layeredFogUniforms.uFogColorMiddle.value.copy(state.fogMiddle);
    layeredFogUniforms.uFogColorTop.value.copy(state.fogTop);
    layeredFogUniforms.uFogNear.value = state.fogNear;
    layeredFogUniforms.uFogFar.value  = state.fogFar;
    // La couleur de fond de scène suit le fog bottom pour une cohérence parfaite
    (this.scene.background as THREE.Color).copy(state.fogBottom);
    (this.scene.fog as THREE.FogExp2).color.copy(state.fogBottom);

    // Lune
    this.moon.intensity = state.moonI;

    // Bloom (mis à jour chaque frame comme hubtown onUpdate)
    this.bloomPass.strength  = state.bloomStr;
    this.bloomPass.threshold = state.bloomThr;
    this.bloomPass.radius    = state.bloomRad;

    // Beacon Lissajous
    const bx = Math.sin(this.time * 0.27) * 60 + Math.sin(this.time * 0.14) * 28;
    const bz = Math.cos(this.time * 0.20) * 60 + Math.cos(this.time * 0.11) * 22;
    this.beaTarget.set(bx, 4 + Math.sin(this.time * 0.33) * 1.8, bz);
    this.beacon.position.lerp(this.beaTarget, 0.016);
    this.beacon.intensity = state.beaI;
    this.beaconGlow.position.copy(this.beacon.position);

    // Étoiles
    (this.stars.material as THREE.PointsMaterial).opacity = state.stars;

    this.composer.render();
  }

  dispose(): void {
    if (this.raf !== null) { cancelAnimationFrame(this.raf); this.raf = null; }
    gsap.killTweensOf(state);
    (this.terrain.material as THREE.MeshStandardMaterial).displacementMap?.dispose();
    (this.terrain.material as THREE.MeshStandardMaterial).normalMap?.dispose();
    this.terrain.geometry.dispose();
    (this.terrain.material as THREE.Material).dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
