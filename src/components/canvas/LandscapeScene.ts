/**
 * LandscapeScene — paysage nocturne orbital, animé par GSAP
 *
 * Architecture inspirée de hubtown.co.in :
 * - Caméra haute (Y=90) qui orbite et descend sur le scroll
 * - Terrain ouvert, plaine centrale calme, reliefs sur les bords
 * - Beacon #D5E0FF en Lissajous — la lumière révèle le relief
 * - 2 couleurs : #020A19 fond + #D5E0FF lumière
 */

import * as THREE from 'three';
import gsap from 'gsap';

// ─── Palette ──────────────────────────────────────────────────────────────────
const BG     = 0x020a19;
const LIGHT  = new THREE.Color(0xd5e0ff);
const T_DARK = new THREE.Color(0x050c17);
const T_MID  = new THREE.Color(0x091422);
const T_EDGE = new THREE.Color(0x0e1c30);

// ─── Bruit FBM ────────────────────────────────────────────────────────────────
function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function vnoise(x: number, y: number): number {
  const ix = Math.floor(x), fx = x - ix;
  const iy = Math.floor(y), fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return (
    hash2(ix,     iy)     * (1 - ux) * (1 - uy) +
    hash2(ix + 1, iy)     *      ux  * (1 - uy) +
    hash2(ix,     iy + 1) * (1 - ux) *      uy  +
    hash2(ix + 1, iy + 1) *      ux  *      uy
  );
}
function fbm(x: number, y: number): number {
  let v = 0, a = 0.5, f = 1.0, norm = 0;
  for (let i = 0; i < 5; i++) {
    v += a * vnoise(x * f, y * f); norm += a; a *= 0.5; f *= 2.13;
  }
  return v / norm;
}

// ─── Chapitres scroll ─────────────────────────────────────────────────────────
interface Chapter {
  p: number; r: number; theta: number; camY: number;
  fogD: number; beaI: number; moonI: number; stars: number;
}
const CHAPTERS: Chapter[] = [
  { p: 0.00, r: 140, theta: 0.00, camY: 90, fogD: 0.0004, beaI:  6, moonI: 2.5, stars: 0.0 },
  { p: 0.17, r: 130, theta: 0.25, camY: 75, fogD: 0.0008, beaI: 14, moonI: 2.2, stars: 0.2 },
  { p: 0.35, r: 118, theta: 0.55, camY: 62, fogD: 0.0014, beaI: 22, moonI: 1.9, stars: 0.4 },
  { p: 0.52, r: 105, theta: 0.80, camY: 50, fogD: 0.0022, beaI: 32, moonI: 1.6, stars: 0.6 },
  { p: 0.68, r:  92, theta: 1.10, camY: 40, fogD: 0.0016, beaI: 26, moonI: 2.0, stars: 0.8 },
  { p: 0.84, r:  80, theta: 1.35, camY: 33, fogD: 0.0010, beaI: 18, moonI: 2.4, stars: 0.9 },
  { p: 1.00, r:  72, theta: 1.60, camY: 28, fogD: 0.0007, beaI: 12, moonI: 2.8, stars: 1.0 },
];

// État animé par GSAP — tweened vers le chapitre cible
const state = { r: 140, theta: 0, camY: 90, fogD: 0.0004, beaI: 6, moonI: 2.5, stars: 0 };

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
  const L = (a: number, b: number) => a + (b - a) * e;
  gsap.to(state, {
    duration: 1.2,
    ease:     'power2.out',
    r:     L(lo.r,     hi.r),
    theta: L(lo.theta, hi.theta),
    camY:  L(lo.camY,  hi.camY),
    fogD:  L(lo.fogD,  hi.fogD),
    beaI:  L(lo.beaI,  hi.beaI),
    moonI: L(lo.moonI, hi.moonI),
    stars: L(lo.stars, hi.stars),
    overwrite: true,
  });
}

// ─── Terrain ──────────────────────────────────────────────────────────────────
function buildTerrain(): THREE.Mesh {
  const SEGS = 256, SIZE = 220;
  const geo  = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
  geo.rotateX(-Math.PI / 2);
  const pos    = geo.attributes['position'] as THREE.BufferAttribute;
  const n      = pos.count;
  const colors = new Float32Array(n * 3);
  const c      = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const wx = pos.getX(i), wz = pos.getZ(i);
    const nx = wx / SIZE + 0.5, nz = wz / SIZE + 0.5;
    let h = (fbm(nx * 4, nz * 4) - 0.5) * 18;
    const d = Math.sqrt(wx * wx + wz * wz) / (SIZE * 0.5);
    h += Math.pow(Math.max(0, d - 0.55), 1.8) * 14;
    pos.setY(i, h);
    const t = Math.max(0, Math.min(1, (h + 4) / 20));
    c.lerpColors(T_DARK, t < 0.45 ? T_MID : T_EDGE, t);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.06, fog: true });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

// ─── Étoiles ──────────────────────────────────────────────────────────────────
function buildStars(): THREE.Points {
  const pos = new Float32Array(1400 * 3);
  for (let i = 0; i < 1400; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 520;
    pos[i * 3 + 1] = 60 + Math.random() * 240;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 520;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    color: LIGHT, size: 0.42, sizeAttenuation: true, transparent: true, opacity: 0, fog: false,
  }));
}

// ─── Classe principale ────────────────────────────────────────────────────────
export class LandscapeScene {
  private renderer:   THREE.WebGLRenderer;
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
  private beaTarget = new THREE.Vector3(0, 5, 0);

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled  = true;
    this.renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(BG, 1);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG);
    this.scene.fog         = new THREE.FogExp2(BG, 0.0004);

    this.camera = new THREE.PerspectiveCamera(52, 1, 0.5, 900);
    this.camera.position.set(0, 90, 140);
    this.camera.lookAt(0, 0, 0);

    this.terrain = buildTerrain();
    this.scene.add(this.terrain);

    this.stars = buildStars();
    this.scene.add(this.stars);

    this.scene.add(new THREE.AmbientLight(0x020810, 0.3));

    this.moon = new THREE.DirectionalLight(LIGHT, 2.5);
    this.moon.position.set(55, 85, 35);
    this.moon.castShadow           = true;
    this.moon.shadow.camera.near   = 1;
    this.moon.shadow.camera.far    = 450;
    this.moon.shadow.camera.left   = -140;
    this.moon.shadow.camera.right  =  140;
    this.moon.shadow.camera.top    =  140;
    this.moon.shadow.camera.bottom = -140;
    this.moon.shadow.mapSize.set(2048, 2048);
    this.moon.shadow.bias = -0.0008;
    this.scene.add(this.moon);
    this.scene.add(this.moon.target);

    this.beacon = new THREE.PointLight(LIGHT, 6, 90, 1.6);
    this.beacon.position.set(0, 6, 0);
    this.scene.add(this.beacon);

    this.beaconHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 8, 8),
      new THREE.MeshBasicMaterial({ color: LIGHT, transparent: true, opacity: 0.5 }),
    );
    this.scene.add(this.beaconHalo);
  }

  setSize(w: number, h: number): void {
    this.renderer.setSize(w, h);
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
    this.time += 0.007;

    this.camera.position.set(
      state.r * Math.sin(state.theta),
      state.camY,
      state.r * Math.cos(state.theta),
    );
    this.camera.lookAt(this.mouseX * 3.5, this.mouseY * 1.8, 0);

    (this.scene.fog as THREE.FogExp2).density = state.fogD;
    this.moon.intensity = state.moonI;

    const bx = Math.sin(this.time * 0.29) * 48 + Math.sin(this.time * 0.17) * 22;
    const bz = Math.cos(this.time * 0.22) * 48 + Math.cos(this.time * 0.13) * 20;
    this.beaTarget.set(bx, 5.5 + Math.sin(this.time * 0.38) * 1.6, bz);
    this.beacon.position.lerp(this.beaTarget, 0.022);
    this.beacon.intensity = state.beaI;
    this.beaconHalo.position.copy(this.beacon.position);
    (this.beaconHalo.material as THREE.MeshBasicMaterial).opacity = Math.min(0.85, state.beaI / 42);

    (this.stars.material as THREE.PointsMaterial).opacity = state.stars;

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    if (this.raf !== null) { cancelAnimationFrame(this.raf); this.raf = null; }
    gsap.killTweensOf(state);
    this.terrain.geometry.dispose();
    (this.terrain.material as THREE.Material).dispose();
    this.renderer.dispose();
  }
}
