/**
 * LandscapeScene — reproduction fidèle de l'esthétique hubtown.co.in
 *
 * Ce qui fait la différence visuellement :
 * 1. UnrealBloomPass → le beacon brille vraiment (pas juste un point)
 * 2. Terrain à fort relief (amplitude 35u) lisible depuis le ciel
 * 3. Caméra top-down au départ → tilt progressif au scroll
 * 4. Ombres fortes + lune directionnelle puissante
 * 5. Palette stricte : #020A19 fond / #D5E0FF toute la lumière
 */

import * as THREE from 'three';
import gsap from 'gsap';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// ─── Palette ──────────────────────────────────────────────────────────────────
const BG    = 0x020a19;
const LIGHT = new THREE.Color(0xd5e0ff);

// Terrain : tons très sombres — la lumière fait tout le relief
const T_LOW  = new THREE.Color(0x040a14);
const T_MID  = new THREE.Color(0x081220);
const T_HIGH = new THREE.Color(0x0d1c32);

// ─── Bruit Perlin-like (gradient noise sans artefacts de grille) ──────────────
function fade(t: number): number { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

function grad(hash: number, x: number, y: number): number {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

const P: number[] = [];
for (let i = 0; i < 256; i++) P[i] = i;
for (let i = 255; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [P[i], P[j]] = [P[j]!, P[i]!];
}
const PERM = [...P, ...P];

function pnoise(x: number, y: number): number {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x), yf = y - Math.floor(y);
  const u = fade(xf), v = fade(yf);
  const a  = PERM[X]!     + Y, b  = PERM[X + 1]! + Y;
  return lerp(
    lerp(grad(PERM[a]!,     xf,     yf),     grad(PERM[b]!,     xf - 1, yf),     u),
    lerp(grad(PERM[a + 1]!, xf,     yf - 1), grad(PERM[b + 1]!, xf - 1, yf - 1), u),
    v,
  );
}

function fbm(x: number, y: number): number {
  let v = 0, a = 0.5, f = 1.0, norm = 0;
  for (let i = 0; i < 6; i++) {
    v += a * pnoise(x * f, y * f); norm += a; a *= 0.48; f *= 2.07;
  }
  return v / norm;
}

// ─── Chapitres scroll ─────────────────────────────────────────────────────────
interface Chapter {
  p: number;
  r: number;       // rayon orbital
  theta: number;   // azimut (rotation horizontale)
  camY: number;    // hauteur
  tilt: number;    // inclinaison du lookAt (0 = regard vers centre, 1 = vers horizon)
  fogD: number;
  beaI: number;
  moonI: number;
  stars: number;
  bloom: number;   // force du bloom
}

const CHAPTERS: Chapter[] = [
  { p: 0.00, r: 10,  theta: 0.00, camY: 160, tilt: 0.0, fogD: 0.0003, beaI:  8, moonI: 2.0, stars: 0.0, bloom: 0.4 },
  { p: 0.17, r: 40,  theta: 0.20, camY: 130, tilt: 0.1, fogD: 0.0005, beaI: 16, moonI: 2.2, stars: 0.1, bloom: 0.5 },
  { p: 0.35, r: 80,  theta: 0.45, camY: 100, tilt: 0.3, fogD: 0.0008, beaI: 24, moonI: 2.4, stars: 0.3, bloom: 0.7 },
  { p: 0.52, r: 110, theta: 0.75, camY:  72, tilt: 0.5, fogD: 0.0015, beaI: 36, moonI: 2.0, stars: 0.6, bloom: 1.0 },
  { p: 0.68, r: 120, theta: 1.05, camY:  55, tilt: 0.6, fogD: 0.0012, beaI: 28, moonI: 2.3, stars: 0.8, bloom: 0.9 },
  { p: 0.84, r: 115, theta: 1.30, camY:  42, tilt: 0.7, fogD: 0.0009, beaI: 20, moonI: 2.6, stars: 0.9, bloom: 0.7 },
  { p: 1.00, r: 105, theta: 1.55, camY:  34, tilt: 0.8, fogD: 0.0007, beaI: 14, moonI: 2.8, stars: 1.0, bloom: 0.6 },
];

const state = {
  r: 10, theta: 0, camY: 160, tilt: 0,
  fogD: 0.0003, beaI: 8, moonI: 2.0, stars: 0, bloom: 0.4,
};

function seekChapter(progress: number): void {
  let lo = CHAPTERS[0]!, hi = CHAPTERS[CHAPTERS.length - 1]!;
  for (let i = 0; i < CHAPTERS.length - 1; i++) {
    if (progress >= CHAPTERS[i]!.p && progress <= CHAPTERS[i + 1]!.p) {
      lo = CHAPTERS[i]!; hi = CHAPTERS[i + 1]!; break;
    }
  }
  const span = hi.p - lo.p;
  const t    = span < 0.0001 ? 0 : (progress - lo.p) / span;
  const e    = t * t * (3 - 2 * t);
  const L = (a: number, b: number): number => a + (b - a) * e;
  gsap.to(state, {
    duration:  1.4,
    ease:      'power2.inOut',
    r:     L(lo.r,     hi.r),
    theta: L(lo.theta, hi.theta),
    camY:  L(lo.camY,  hi.camY),
    tilt:  L(lo.tilt,  hi.tilt),
    fogD:  L(lo.fogD,  hi.fogD),
    beaI:  L(lo.beaI,  hi.beaI),
    moonI: L(lo.moonI, hi.moonI),
    stars: L(lo.stars, hi.stars),
    bloom: L(lo.bloom, hi.bloom),
    overwrite: true,
  });
}

// ─── Terrain ──────────────────────────────────────────────────────────────────
function buildTerrain(): THREE.Mesh {
  const SEGS = 300, SIZE = 250;
  const geo  = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
  geo.rotateX(-Math.PI / 2);

  const pos    = geo.attributes['position'] as THREE.BufferAttribute;
  const n      = pos.count;
  const colors = new Float32Array(n * 3);
  const c      = new THREE.Color();

  for (let i = 0; i < n; i++) {
    const wx = pos.getX(i), wz = pos.getZ(i);
    const nx = wx / SIZE * 2.8 + 3.0;
    const nz = wz / SIZE * 2.8 + 1.5;

    // Terrain à fort relief — FBM Perlin 6 octaves
    const h0 = fbm(nx, nz);
    // Amplification des crêtes (ridges)
    const ridge = 1 - Math.abs(fbm(nx * 0.5 + 5, nz * 0.5 + 2));
    let h = h0 * 22 + ridge * ridge * 14;

    // Légère cuvette au centre (zone calme pour le beacon)
    const d  = Math.sqrt(wx * wx + wz * wz) / (SIZE * 0.45);
    h       -= Math.max(0, 1 - d) * 5;

    pos.setY(i, h);

    // Couleur vertex : sombre absolu → bleu nuit profond sur les hauteurs
    const t = Math.max(0, Math.min(1, (h + 2) / 26));
    c.lerpColors(T_LOW, t < 0.5 ? T_MID : T_HIGH, t);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.08,
    fog: true,
  }));
  mesh.receiveShadow = true;
  mesh.castShadow    = true;
  return mesh;
}

// ─── Étoiles ──────────────────────────────────────────────────────────────────
function buildStars(): THREE.Points {
  const count = 1600;
  const pos   = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 600;
    pos[i * 3 + 1] = 80 + Math.random() * 280;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 600;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    color: LIGHT, size: 0.5, sizeAttenuation: true,
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
  private beaconHalo: THREE.Mesh;

  private time      = 0;
  private raf: number | null = null;
  private mouseX    = 0;
  private mouseY    = 0;
  private beaTarget = new THREE.Vector3(0, 4, 0);

  constructor(canvas: HTMLCanvasElement) {
    // ── Renderer ──
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure  = 1.0;
    this.renderer.shadowMap.enabled   = true;
    this.renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(BG, 1);

    // ── Scene ──
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG);
    this.scene.fog         = new THREE.FogExp2(BG, 0.0003);

    // ── Camera ──
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.5, 1000);
    this.camera.position.set(0, 160, 0);
    this.camera.lookAt(0, 0, 0);

    // ── Post-processing : Bloom ──
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.4,   // strength
      0.5,   // radius
      0.82,  // threshold — seul ce qui est très lumineux brille
    );
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderPass);
    this.composer.addPass(this.bloomPass);

    // ── Terrain ──
    this.terrain = buildTerrain();
    this.scene.add(this.terrain);

    // ── Étoiles ──
    this.stars = buildStars();
    this.scene.add(this.stars);

    // ── Ambiance ──
    this.scene.add(new THREE.AmbientLight(0x020810, 0.25));

    // ── Lune (directionnelle forte — crée les ombres portées) ──
    this.moon = new THREE.DirectionalLight(LIGHT, 2.0);
    this.moon.position.set(60, 100, 30);
    this.moon.castShadow           = true;
    this.moon.shadow.camera.near   = 1;
    this.moon.shadow.camera.far    = 500;
    this.moon.shadow.camera.left   = -160;
    this.moon.shadow.camera.right  =  160;
    this.moon.shadow.camera.top    =  160;
    this.moon.shadow.camera.bottom = -160;
    this.moon.shadow.mapSize.set(2048, 2048);
    this.moon.shadow.bias          = -0.001;
    this.scene.add(this.moon);
    this.scene.add(this.moon.target);

    // ── Beacon (point light très intense pour déclencher le bloom) ──
    this.beacon = new THREE.PointLight(LIGHT, 8, 100, 1.5);
    this.beacon.position.set(0, 5, 0);
    this.scene.add(this.beacon);

    // Sphère lumineuse — emissive pour que le bloom la capte
    const haloMat = new THREE.MeshStandardMaterial({
      color:           LIGHT,
      emissive:        LIGHT,
      emissiveIntensity: 3.0,
      transparent:     true,
      opacity:         0.9,
    });
    this.beaconHalo = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 12), haloMat);
    this.scene.add(this.beaconHalo);
  }

  setSize(w: number, h: number): void {
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloomPass.resolution.set(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setScroll(p: number): void {
    seekChapter(Math.max(0, Math.min(1, p)));
  }

  onMouseMove(x: number, y: number): void {
    this.mouseX = (x / window.innerWidth  - 0.5) * 2;
    this.mouseY = (y / window.innerHeight - 0.5) * 2;
  }

  start(): void {
    if (this.raf !== null) return;
    const tick = (): void => { this.raf = requestAnimationFrame(tick); this.update(); };
    tick();
  }

  private update(): void {
    this.time += 0.006;

    // Caméra : position orbitale (top-down → oblique selon tilt)
    const cx = state.r * Math.sin(state.theta);
    const cz = state.r * Math.cos(state.theta);
    this.camera.position.set(cx, state.camY, cz);

    // lookAt : tilt=0 → regarde directement en bas, tilt=1 → horizon
    const lookY  = state.camY * (1 - state.tilt) * -0.3;
    const lookXZ = state.tilt * 25;
    this.camera.lookAt(
      this.mouseX * 4 + lookXZ * Math.sin(state.theta + Math.PI),
      lookY + this.mouseY * 2,
      lookXZ * Math.cos(state.theta + Math.PI),
    );

    // Fog + lune
    (this.scene.fog as THREE.FogExp2).density = state.fogD;
    this.moon.intensity = state.moonI;

    // Beacon : Lissajous organique sur le terrain
    const bx = Math.sin(this.time * 0.27) * 55 + Math.sin(this.time * 0.15) * 25;
    const bz = Math.cos(this.time * 0.20) * 55 + Math.cos(this.time * 0.11) * 20;
    this.beaTarget.set(bx, 4.5 + Math.sin(this.time * 0.35) * 1.5, bz);
    this.beacon.position.lerp(this.beaTarget, 0.018);
    this.beacon.intensity = state.beaI;
    this.beaconHalo.position.copy(this.beacon.position);

    // Bloom dynamique
    this.bloomPass.strength = state.bloom;

    // Étoiles
    (this.stars.material as THREE.PointsMaterial).opacity = state.stars;

    // Render via composer (bloom actif)
    this.composer.render();
  }

  dispose(): void {
    if (this.raf !== null) { cancelAnimationFrame(this.raf); this.raf = null; }
    gsap.killTweensOf(state);
    this.terrain.geometry.dispose();
    (this.terrain.material as THREE.Material).dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
