/**
 * LandscapeScene — paysage nocturne orbital, animé par Theatre.js
 *
 * Architecture inspirée de hubtown.co.in :
 * - Theatre.js séquence toutes les propriétés (caméra, lumières, fog)
 * - scroll 0→1 → sequence.position 0→10
 * - Caméra haute qui ORBITE et descend (pas de flythrough)
 * - Beacon #D5E0FF se balade en Lissajous sur le terrain
 * - 2 couleurs : #020A19 fond + #D5E0FF lumière — le terrain est sombre,
 *   la lumière révèle le relief par les ombres et les reflets
 */

import * as THREE from 'three';
import { getProject, types } from '@theatre/core';
import { theatreState } from './theatre-state';

// ─── Palette ──────────────────────────────────────────────────────────────────
const BG     = 0x020a19;
const LIGHT  = new THREE.Color(0xd5e0ff);
const T_DARK = new THREE.Color(0x050c17);
const T_MID  = new THREE.Color(0x091422);
const T_EDGE = new THREE.Color(0x0e1c30);

// ─── Bruit 2D (value noise + FBM) ────────────────────────────────────────────
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

function fbm(x: number, y: number, octaves = 5): number {
  let v = 0, a = 0.5, f = 1.0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    v    += a * vnoise(x * f, y * f);
    norm += a;
    a    *= 0.5;
    f    *= 2.13;
  }
  return v / norm;
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
    const wx = pos.getX(i);
    const wz = pos.getZ(i);
    const nx = wx / SIZE + 0.5;
    const nz = wz / SIZE + 0.5;

    // FBM + relief sur les bords (plaine centrale calme)
    let h = (fbm(nx * 4, nz * 4) - 0.5) * 18;
    const d = Math.sqrt(wx * wx + wz * wz) / (SIZE * 0.5);
    h      += Math.pow(Math.max(0, d - 0.55), 1.8) * 14;

    pos.setY(i, h);

    // Couleur vertex : profondeur → arrête (bleu nuit progressif)
    const t = Math.max(0, Math.min(1, (h + 4) / 20));
    c.lerpColors(T_DARK, t < 0.45 ? T_MID : T_EDGE, t);
    colors[i * 3]     = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness:    0.88,
    metalness:    0.06,
    fog:          true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}

// ─── Étoiles ──────────────────────────────────────────────────────────────────
function buildStars(count = 1400): THREE.Points {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 520;
    pos[i * 3 + 1] = 60 + Math.random() * 240;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 520;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    color:           LIGHT,
    size:            0.42,
    sizeAttenuation: true,
    transparent:     true,
    opacity:         0,
    fog:             false,
  }));
}

// ─── Classe principale ────────────────────────────────────────────────────────
const SEQ_LENGTH = 10; // doit correspondre à theatre-state.ts

export class LandscapeScene {
  private renderer: THREE.WebGLRenderer;
  private scene:    THREE.Scene;
  private camera:   THREE.PerspectiveCamera;

  private terrain:    THREE.Mesh;
  private stars:      THREE.Points;
  private moon:       THREE.DirectionalLight;
  private beacon:     THREE.PointLight;
  private beaconHalo: THREE.Mesh;

  // Theatre.js
  private sheet:      ReturnType<ReturnType<typeof getProject>['sheet']>;
  private camObj:     { r: number; theta: number; camY: number };
  private atmoObj:    { fogD: number; beaI: number; moonI: number; stars: number };

  private time      = 0;
  private raf: number | null = null;
  private mouseX    = 0;
  private mouseY    = 0;
  private beaTarget = new THREE.Vector3(0, 5, 0);

  constructor(canvas: HTMLCanvasElement) {
    // ── Renderer ──
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure  = 1.15;
    this.renderer.shadowMap.enabled   = true;
    this.renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(BG, 1);

    // ── Scene ──
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG);
    this.scene.fog         = new THREE.FogExp2(BG, 0.0004);

    // ── Camera ──
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.5, 900);
    this.camera.position.set(0, 90, 140);
    this.camera.lookAt(0, 0, 0);

    // ── Terrain ──
    this.terrain = buildTerrain();
    this.scene.add(this.terrain);

    // ── Étoiles ──
    this.stars = buildStars();
    this.scene.add(this.stars);

    // ── Ambiance ──
    this.scene.add(new THREE.AmbientLight(0x020810, 0.3));

    // ── Lune ──
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

    // ── Beacon ──
    this.beacon = new THREE.PointLight(LIGHT, 6, 90, 1.6);
    this.beacon.position.set(0, 6, 0);
    this.scene.add(this.beacon);

    const haloMat = new THREE.MeshBasicMaterial({
      color:       LIGHT,
      transparent: true,
      opacity:     0.5,
    });
    this.beaconHalo = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), haloMat);
    this.scene.add(this.beaconHalo);

    // ── Theatre.js ──
    const project = getProject('KabNetys', { state: theatreState });
    this.sheet     = project.sheet('KabNetys');

    // État initial des objets animés
    this.camObj  = { r: 140, theta: 0, camY: 90 };
    this.atmoObj = { fogD: 0.0004, beaI: 6, moonI: 2.5, stars: 0 };

    const camTh = this.sheet.object('Camera', {
      r:     types.number(140, { range: [60, 160] }),
      theta: types.number(0,   { range: [-1, 3]   }),
      camY:  types.number(90,  { range: [20, 100] }),
    });
    camTh.onValuesChange(v => { this.camObj = v; });

    const atmoTh = this.sheet.object('Atmosphere', {
      fogD:  types.number(0.0004, { range: [0, 0.005] }),
      beaI:  types.number(6,      { range: [0, 50]    }),
      moonI: types.number(2.5,    { range: [0, 5]     }),
      stars: types.number(0,      { range: [0, 1]     }),
    });
    atmoTh.onValuesChange(v => { this.atmoObj = v; });
  }

  setSize(w: number, h: number): void {
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setScroll(p: number): void {
    this.sheet.sequence.position = Math.max(0, Math.min(1, p)) * SEQ_LENGTH;
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
    const { r, theta, camY } = this.camObj;
    const { fogD, beaI, moonI, stars } = this.atmoObj;

    // Caméra orbitale + drift souris sur lookAt
    this.camera.position.set(
      r * Math.sin(theta),
      camY,
      r * Math.cos(theta),
    );
    this.camera.lookAt(this.mouseX * 3.5, this.mouseY * 1.8, 0);

    // Fog
    (this.scene.fog as THREE.FogExp2).density = fogD;

    // Lune
    this.moon.intensity = moonI;

    // Beacon Lissajous (mouvement autonome, indépendant du scroll)
    const bx = Math.sin(this.time * 0.29) * 48 + Math.sin(this.time * 0.17) * 22;
    const bz = Math.cos(this.time * 0.22) * 48 + Math.cos(this.time * 0.13) * 20;
    this.beaTarget.set(bx, 5.5 + Math.sin(this.time * 0.38) * 1.6, bz);
    this.beacon.position.lerp(this.beaTarget, 0.022);
    this.beacon.intensity = beaI;
    this.beaconHalo.position.copy(this.beacon.position);
    (this.beaconHalo.material as THREE.MeshBasicMaterial).opacity =
      Math.min(0.85, beaI / 42);

    // Étoiles
    (this.stars.material as THREE.PointsMaterial).opacity = stars;

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    if (this.raf !== null) { cancelAnimationFrame(this.raf); this.raf = null; }
    this.terrain.geometry.dispose();
    (this.terrain.material as THREE.Material).dispose();
    this.renderer.dispose();
  }
}
