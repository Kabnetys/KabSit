/**
 * LandscapeScene — paysage nocturne vu du ciel
 *
 * Inspiré de hubtown.co.in :
 * - Caméra haute (Y=90) qui ORBITE et descend lentement (Y=90→28)
 * - Terrain ouvert, pas de canyon — la lumière révèle le relief
 * - Beacon (#D5E0FF) qui se balade en Lissajous sur le paysage
 * - 2 couleurs seulement : #020A19 fond + #D5E0FF lumière
 */

import * as THREE from 'three';

// ─── Palette ──────────────────────────────────────────────────────────────────
const BG     = 0x020a19;
const LIGHT  = new THREE.Color(0xd5e0ff);
const T_DARK = new THREE.Color(0x060d18);
const T_MID  = new THREE.Color(0x0b1625);
const T_EDGE = new THREE.Color(0x101f33);

// ─── Bruit inline (hash + smooth noise 2D) ────────────────────────────────────
function hash(n: number): number {
  const x = Math.sin(n) * 43758.5453123;
  return x - Math.floor(x);
}

function noise2(ix: number, iz: number): number {
  const a = hash(ix + iz * 57);
  const b = hash(ix + 1 + iz * 57);
  const c = hash(ix + (iz + 1) * 57);
  const d = hash(ix + 1 + (iz + 1) * 57);
  return a; // valeur brute du coin — fbm va faire la moyenne
}

function smoothNoise(x: number, z: number): number {
  const ix = Math.floor(x), fx = x - ix;
  const iz = Math.floor(z), fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = noise2(ix,     iz);
  const b = noise2(ix + 1, iz);
  const c = noise2(ix,     iz + 1);
  const d = noise2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm(x: number, z: number): number {
  let v = 0, amp = 0.5, freq = 1.0;
  for (let i = 0; i < 5; i++) {
    v    += amp * (smoothNoise(x * freq, z * freq) * 2 - 1);
    amp  *= 0.5;
    freq *= 2.1;
  }
  return v;
}

// ─── Chapitres scroll ─────────────────────────────────────────────────────────
interface Chapter {
  p:     number;
  r:     number;  // rayon orbital
  theta: number;  // angle azimutal
  camY:  number;  // hauteur caméra
  fogD:  number;  // densité fog
  beaI:  number;  // intensité beacon
  moonI: number;  // intensité lune
  stars: number;  // opacité étoiles
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

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

function interpChapters(progress: number): Chapter {
  const last = CHAPTERS[CHAPTERS.length - 1]!;
  let lo: Chapter = CHAPTERS[0]!;
  let hi: Chapter = last;

  for (let i = 0; i < CHAPTERS.length - 1; i++) {
    const ca = CHAPTERS[i]!;
    const cb = CHAPTERS[i + 1]!;
    if (progress >= ca.p && progress <= cb.p) {
      lo = ca; hi = cb; break;
    }
  }

  const span = hi.p - lo.p;
  const t    = span < 0.0001 ? 0 : (progress - lo.p) / span;
  const e    = t * t * (3 - 2 * t); // smoothstep

  return {
    p:     progress,
    r:     lerp(lo.r,     hi.r,     e),
    theta: lerp(lo.theta, hi.theta, e),
    camY:  lerp(lo.camY,  hi.camY,  e),
    fogD:  lerp(lo.fogD,  hi.fogD,  e),
    beaI:  lerp(lo.beaI,  hi.beaI,  e),
    moonI: lerp(lo.moonI, hi.moonI, e),
    stars: lerp(lo.stars, hi.stars, e),
  };
}

// ─── Construction terrain ─────────────────────────────────────────────────────
const GRID = 220;
const SIZE = 200;

function buildTerrain(): THREE.Mesh {
  const geo    = new THREE.PlaneGeometry(SIZE, SIZE, GRID, GRID);
  geo.rotateX(-Math.PI / 2);

  const pos    = geo.attributes['position'] as THREE.BufferAttribute;
  const count  = pos.count;
  const colors = new Float32Array(count * 3);
  const col    = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const wx = pos.getX(i);
    const wz = pos.getZ(i);
    const nx = wx / SIZE * 3.2;
    const nz = wz / SIZE * 3.2;

    let h = fbm(nx, nz) * 12;
    // Légère bosse périphérique (plaine centrale calme)
    const d = Math.sqrt(wx * wx + wz * wz) / (SIZE * 0.5);
    h      += Math.max(0, d - 0.6) * d * 6;

    pos.setY(i, h);

    const t = Math.max(0, Math.min(1, (h + 4) / 18));
    col.lerpColors(T_DARK, t < 0.5 ? T_MID : T_EDGE, t);
    colors[i * 3]     = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness:    0.90,
    metalness:    0.05,
    fog:          true,
  });

  return new THREE.Mesh(geo, mat);
}

// ─── Étoiles ──────────────────────────────────────────────────────────────────
function buildStars(): THREE.Points {
  const count = 1200;
  const pos   = new Float32Array(count * 3);
  const rng   = (a: number, b: number): number => a + Math.random() * (b - a);
  for (let i = 0; i < count; i++) {
    pos[i * 3]     = rng(-260, 260);
    pos[i * 3 + 1] = rng( 55,  280);
    pos[i * 3 + 2] = rng(-260, 260);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: LIGHT, size: 0.45, sizeAttenuation: true, transparent: true, opacity: 0, fog: false }),
  );
}

// ─── Classe principale ────────────────────────────────────────────────────────
export class LandscapeScene {
  private renderer: THREE.WebGLRenderer;
  private scene:    THREE.Scene;
  private camera:   THREE.PerspectiveCamera;

  private terrain:    THREE.Mesh;
  private stars:      THREE.Points;
  private moon:       THREE.DirectionalLight;
  private beacon:     THREE.PointLight;
  private beaconHalo: THREE.Mesh;

  private progress  = 0;
  private time      = 0;
  private raf: number | null = null;
  private mouseX    = 0;
  private mouseY    = 0;
  private beaTarget = new THREE.Vector3(20, 5, -10);

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping        = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled  = true;
    this.renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(BG, 1);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG);
    this.scene.fog         = new THREE.FogExp2(BG, CHAPTERS[0]!.fogD);

    this.camera = new THREE.PerspectiveCamera(52, 1, 0.5, 800);
    this.applyChapter(CHAPTERS[0]!);

    // Terrain
    this.terrain = buildTerrain();
    this.scene.add(this.terrain);

    // Étoiles
    this.stars = buildStars();
    this.scene.add(this.stars);

    // Ambiance très faible
    this.scene.add(new THREE.AmbientLight(0x020810, 0.35));

    // Lune
    this.moon = new THREE.DirectionalLight(LIGHT, CHAPTERS[0]!.moonI);
    this.moon.position.set(60, 90, 40);
    this.moon.castShadow = true;
    this.moon.shadow.camera.near   = 1;
    this.moon.shadow.camera.far    = 400;
    this.moon.shadow.camera.left   = -130;
    this.moon.shadow.camera.right  =  130;
    this.moon.shadow.camera.top    =  130;
    this.moon.shadow.camera.bottom = -130;
    this.moon.shadow.mapSize.set(2048, 2048);
    this.moon.shadow.bias = -0.001;
    this.scene.add(this.moon);
    this.scene.add(this.moon.target);

    // Beacon
    this.beacon = new THREE.PointLight(LIGHT, CHAPTERS[0]!.beaI, 80, 1.8);
    this.beacon.position.set(20, 6, -10);
    this.scene.add(this.beacon);

    const haloMat = new THREE.MeshBasicMaterial({ color: LIGHT, transparent: true, opacity: 0.6 });
    this.beaconHalo = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), haloMat);
    this.scene.add(this.beaconHalo);
  }

  private applyChapter(ch: Chapter): void {
    const x = ch.r * Math.sin(ch.theta);
    const z = ch.r * Math.cos(ch.theta);
    this.camera.position.set(x, ch.camY, z);
    this.camera.lookAt(0, 0, 0);
  }

  setSize(w: number, h: number): void {
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setScroll(p: number): void {
    this.progress = Math.max(0, Math.min(1, p));
  }

  onMouseMove(x: number, y: number): void {
    this.mouseX = (x / window.innerWidth  - 0.5) * 2;
    this.mouseY = (y / window.innerHeight - 0.5) * 2;
  }

  start(): void {
    if (this.raf !== null) return;
    const tick = (): void => {
      this.raf = requestAnimationFrame(tick);
      this.update();
    };
    tick();
  }

  private update(): void {
    this.time += 0.007;
    const ch = interpChapters(this.progress);

    // Caméra : position orbitale + léger drift souris sur lookAt
    const cx = ch.r * Math.sin(ch.theta);
    const cz = ch.r * Math.cos(ch.theta);
    this.camera.position.set(cx, ch.camY, cz);
    this.camera.lookAt(this.mouseX * 3, this.mouseY * 1.5, 0);

    // Fog
    (this.scene.fog as THREE.FogExp2).density = ch.fogD;

    // Lune
    this.moon.intensity = ch.moonI;

    // Beacon Lissajous
    const bx = Math.sin(this.time * 0.31) * 44 + Math.sin(this.time * 0.18) * 20;
    const bz = Math.cos(this.time * 0.23) * 44 + Math.cos(this.time * 0.13) * 18;
    this.beaTarget.set(bx, 5 + Math.sin(this.time * 0.42) * 1.5, bz);
    this.beacon.position.lerp(this.beaTarget, 0.025);
    this.beacon.intensity = ch.beaI;
    this.beaconHalo.position.copy(this.beacon.position);
    (this.beaconHalo.material as THREE.MeshBasicMaterial).opacity = Math.min(0.8, ch.beaI / 44);

    // Étoiles
    (this.stars.material as THREE.PointsMaterial).opacity = ch.stars;

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    if (this.raf !== null) { cancelAnimationFrame(this.raf); this.raf = null; }
    this.terrain.geometry.dispose();
    (this.terrain.material as THREE.Material).dispose();
    this.renderer.dispose();
  }
}
