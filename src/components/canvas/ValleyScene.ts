import * as THREE from 'three';

// ─── CPU noise ────────────────────────────────────────────────────────────────

function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function vnoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix,        fy = y - iy;
  const ux = fx*fx*(3-2*fx), uy = fy*fy*(3-2*fy);
  return hash2(ix,iy)
       +(hash2(ix+1,iy)-hash2(ix,iy))*ux
       +(hash2(ix,iy+1)-hash2(ix,iy))*uy
       +(hash2(ix+1,iy+1)-hash2(ix+1,iy)-hash2(ix,iy+1)+hash2(ix,iy))*ux*uy;
}
function fbm(x: number, y: number, oct = 6): number {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += a*vnoise(x*f, y*f); f *= 2.1; a *= 0.44; }
  return v;
}

// ─── Terrain height ───────────────────────────────────────────────────────────
// Camera path Z: +160 (aerial start) → -110 (panorama end).
// t=0 at start, t=1 at end. Valley opens wide at t>0.72.

function terrainH(wx: number, wz: number): number {
  const t    = Math.max(0, Math.min(1, (160 - wz) / 270));
  const open = Math.max(0, (t - 0.72) / 0.28);   // 0→1 as valley opens

  // Valley half-width: 32 inside → 100 at panorama (so walls visible from Y=120)
  const vHalf = 32 + open * 68;

  // Multi-scale noise for natural terrain
  const n1 = (fbm(wx * 0.055, wz * 0.028)     * 2 - 1);         // large ridges
  const n2 = (fbm(wx * 0.18,  wz * 0.11, 4)   * 2 - 1) * 0.28; // medium bumps
  const n3 = (fbm(wx * 0.55,  wz * 0.40, 3)   * 2 - 1) * 0.09; // surface roughness
  const n  = n1 + n2 + n3;

  // Cross-section: U-shaped valley, walls reach Y=35 at nd=1, floor at Y=-8
  const nd   = Math.abs(wx) / vHalf;
  const base = Math.pow(nd, 1.7) * 43 - 8;

  // Noise amplitude scales with distance from valley centre and closes near panorama
  const rocky = (7.0 + Math.max(0, nd - 0.45) * 12.0) * (1 - open * 0.60);

  // Valley floor dips slightly as it opens toward the lake
  const dip = open > 0.08 ? -(open - 0.08) * 7.5 : 0;

  return base + n * rocky + dip;
}

// ─── GLSL rock shader ────────────────────────────────────────────────────────
// Triplanar-mapped sedimentary stone — strata banding + surface grain.
// Injected into MeshStandardMaterial via onBeforeCompile (keeps Three.js PBR).
// Color palette: realistic moonlit limestone (no neon, no purple).

const ROCK_GLSL = /* glsl */`
  // ── Smooth noise ─────────────────────────────────────────────────────────
  float rHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float rNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(rHash(i),           rHash(i+vec2(1,0)), u.x),
               mix(rHash(i+vec2(0,1)), rHash(i+vec2(1,1)), u.x), u.y);
  }
  float rFbm(vec2 p, int oct) {
    float v=0.0, a=0.5;
    for(int i=0;i<8;i++){
      if(i>=oct) break;
      v += a*rNoise(p); p*=2.07; a*=0.46;
    }
    return v;
  }

  // ── Triplanar UV ─────────────────────────────────────────────────────────
  // Avoids UV stretch on steep terrain by blending three projections.
  vec4 triplanarSample(vec3 wp, vec3 n, float scale) {
    vec3 blend = pow(abs(n), vec3(4.0));
    blend /= (blend.x + blend.y + blend.z + 0.001);
    float sx = rFbm(wp.yz * scale, 5);
    float sy = rFbm(wp.xz * scale, 5);
    float sz = rFbm(wp.xy * scale, 5);
    return vec4(sx*blend.x + sy*blend.y + sz*blend.z);
  }

  // ── Rock color ───────────────────────────────────────────────────────────
  // Based on real limestone / granite moonlit by a cold silver moon.
  vec3 rockColor(vec3 wp, vec3 wn, float slope, float height) {
    // ─ Triplanar grain at 3 scales
    float grain_lg = triplanarSample(wp, wn, 0.055).r;   // large rock face variation
    float grain_md = triplanarSample(wp, wn, 0.22).r;    // medium surface texture
    float grain_sm = triplanarSample(wp, wn, 0.70).r;    // fine grain / micro-roughness

    // ─ Horizontal strata banding (sedimentary layers — the key "real rock" cue)
    // Height-based, perturbed by noise for natural look
    float strataNoise = rFbm(wp.xz * 0.035, 4) * 6.0;
    float strata      = sin((height + strataNoise) * 0.45) * 0.5 + 0.5;  // 0..1
    float strataSharp = smoothstep(0.35, 0.65, strata);   // sharpen the band edge

    // ─ Fracture lines (dark cracks between strata)
    float crackNoise = rFbm(wp.xz * 0.18 + wp.y * 0.04, 3);
    float crack      = smoothstep(0.44, 0.50, crackNoise); // thin dark seam

    // ─ Realistic stone palette — moonlit limestone / granite (#8a8e94 range):
    //   These are real-world albedo values for limestone exposed to cold moonlight.
    //   The PBR lighting will multiply these by the moon color (#c4d4e6) to give
    //   the final perceived cool grey.
    vec3 colCliff  = vec3(0.541, 0.557, 0.580); // #8a8e94 — lit cliff face
    vec3 colShade  = vec3(0.353, 0.369, 0.392); // #5a5e64 — sheltered / shadow face
    vec3 colFloor  = vec3(0.431, 0.447, 0.471); // #6e7278 — valley floor / worn rock
    vec3 colStain  = vec3(0.235, 0.243, 0.267); // #3c3e44 — dark mineral band / crack

    // Slope splits cliff face from floor surface
    float cliffBlend = smoothstep(0.75, 0.35, slope); // 0=floor, 1=cliff
    vec3 baseCol = mix(colFloor, colCliff, cliffBlend);

    // Large grain variation: shifts between lit face and sheltered face
    baseCol = mix(colShade, baseCol, grain_lg * 0.80 + 0.20);

    // Medium grain: surface micro-roughness (brightness variation)
    baseCol *= (0.82 + grain_md * 0.28);

    // Fine grain: very subtle speckle
    baseCol *= (0.92 + grain_sm * 0.16);

    // Strata banding: alternate between base color and darker mineral layer
    vec3 col = mix(colStain, baseCol, 0.30 + strataSharp * 0.70);

    // Crack darkening — fracture lines
    col = mix(colStain * 0.5, col, crack);

    // Height tint: upper walls catch more moonlight historically → slightly brighter
    float heightFac = smoothstep(-4.0, 12.0, height);
    col *= (0.88 + heightFac * 0.18);

    // ─ Large-scale luminosity variation (cliff exposure / overhang shadow)
    float macro = rFbm(wp.xz * 0.016, 4);
    col *= (0.74 + macro * 0.44);

    return col;
  }
`;

function applyRockShader(mat: THREE.MeshStandardMaterial): void {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;',
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvWP=(modelMatrix*vec4(position,1.0)).xyz;\nvWN=normalize(mat3(modelMatrix)*normal);',
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;\n${ROCK_GLSL}`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `float rSlope = 1.0 - abs(vWN.y);
       diffuseColor.rgb = rockColor(vWP, vWN, rSlope, vWP.y);`,
    );
  };
  mat.customProgramCacheKey = () => 'rock-strata-v2';
}

// ─── Atmospheres — realistic moonlit night ────────────────────────────────────
// All colors derived from real night-sky photography:
//   Sky: deep navy #050810 → near black #020305
//   Moon: cool silver-blue directional light
//   Fog: dark blue-grey haze, NOT dense (mountains must stay visible)
//   Beacon: warm silver-white (like a lantern ahead on a trail)

interface Atm {
  p: number;
  sky: THREE.Color;   fd: number;
  moonC: THREE.Color; moonI: number;
  ambC: THREE.Color;  ambI: number;
  beaC: THREE.Color;  beaI: number;
  stars: number;      water: number;
}
const C = (h: number) => new THREE.Color(h);

const ATMS: Atm[] = [
  // p=0.00 — Hero: satellite altitude. Full valley visible from above as a dark groove.
  //   Sky: deep navy #0a0d1a. Moon strong (1.8) — cold silver. Fog nearly absent.
  { p:0.00, sky:C(0x0a0d1a), fd:0.0008,
    moonC:C(0xd4dde8), moonI:1.80, ambC:C(0x0d1520), ambI:0.55,
    beaC:C(0xc8d8f0), beaI: 8, stars:0.00, water:0.0 },

  // p=0.17 — Descending. Valley walls gain height. Beacon faintly visible.
  { p:0.17, sky:C(0x080c18), fd:0.0020,
    moonC:C(0xc4d4e6), moonI:1.60, ambC:C(0x0a1218), ambI:0.50,
    beaC:C(0xb8ccec), beaI:16, stars:0.05, water:0.0 },

  // p=0.35 — Entering valley. Walls frame the scene. Blue-grey haze pools on floor.
  { p:0.35, sky:C(0x070a14), fd:0.0045,
    moonC:C(0xb8cce0), moonI:1.40, ambC:C(0x0a1220), ambI:0.65,
    beaC:C(0xa8c0e8), beaI:28, stars:0.30, water:0.0 },

  // p=0.54 — Deep valley floor. Walls tower. Beacon is primary floor light.
  { p:0.54, sky:C(0x060810), fd:0.0055,
    moonC:C(0xb0c8dc), moonI:0.90, ambC:C(0x0c1422), ambI:0.75,
    beaC:C(0x98b4e4), beaI:36, stars:0.60, water:0.0 },

  // p=0.71 — Valley opens. Horizon returns. Stars become prominent.
  { p:0.71, sky:C(0x080b16), fd:0.0030,
    moonC:C(0xb8cce2), moonI:1.20, ambC:C(0x0a1220), ambI:0.70,
    beaC:C(0xa8bce8), beaI:24, stars:0.80, water:0.25 },

  // p=0.87 — Approaching lake. Wide panorama. Moon reflection starts.
  { p:0.87, sky:C(0x080c1e), fd:0.0016,
    moonC:C(0xc4d4e8), moonI:1.50, ambC:C(0x080e1a), ambI:0.78,
    beaC:C(0xc4d4f4), beaI:16, stars:0.95, water:0.60 },

  // p=1.00 — Alpine lake panorama. Full starfield. Silver moon on dark water.
  { p:1.00, sky:C(0x080c1e), fd:0.0012,
    moonC:C(0xccd8e8), moonI:1.60, ambC:C(0x0c1428), ambI:0.80,
    beaC:C(0xe8f0ff), beaI:12, stars:1.00, water:0.90 },
];

function lerpAtm(p: number): Atm {
  p = Math.max(0, Math.min(1, p));
  for (let i = 0; i < ATMS.length-1; i++) {
    const a = ATMS[i]!, b = ATMS[i+1]!;
    if (p >= a.p && p <= b.p) {
      const t = (p-a.p)/(b.p-a.p);
      return { p,
        sky:  a.sky.clone().lerp(b.sky,t),   fd:    a.fd+(b.fd-a.fd)*t,
        moonC:a.moonC.clone().lerp(b.moonC,t),moonI: a.moonI+(b.moonI-a.moonI)*t,
        ambC: a.ambC.clone().lerp(b.ambC,t),  ambI:  a.ambI+(b.ambI-a.ambI)*t,
        beaC: a.beaC.clone().lerp(b.beaC,t),  beaI:  a.beaI+(b.beaI-a.beaI)*t,
        stars:a.stars+(b.stars-a.stars)*t,    water: a.water+(b.water-a.water)*t,
      };
    }
  }
  return { ...ATMS[ATMS.length-1]! };
}

// ─── Water shaders — alpine lake, gentle swell, silver moonlight ──────────────

const WATER_VERT = /* glsl */`
  uniform float uTime;
  varying vec2 vUv; varying vec3 vNorm; varying vec3 vWP;
  void main() {
    vUv = uv;
    vec3 p = position;
    // Calm lake: low-amplitude, low-frequency swell
    float w = sin(p.x*0.08+uTime*0.22)*0.12 + cos(p.z*0.065+uTime*0.18)*0.09
            + sin((p.x+p.z)*0.045+uTime*0.14)*0.06;
    p.y += w;
    float e=1.2;
    float wx = sin((p.x+e)*0.08+uTime*0.22)*0.12+cos(p.z*0.065+uTime*0.18)*0.09;
    float wz = sin(p.x*0.08+uTime*0.22)*0.12+cos((p.z+e)*0.065+uTime*0.18)*0.09;
    vNorm = normalize(vec3(-(wx-w)/e, 1.0, -(wz-w)/e));
    vec4 wp4 = modelMatrix*vec4(p,1.0); vWP=wp4.xyz;
    gl_Position = projectionMatrix*viewMatrix*wp4;
  }
`;
const WATER_FRAG = /* glsl */`
  uniform vec3  uDeep, uShallow, uSpec, uMoonDir, uMoonColor;
  uniform float uOpacity, uTime;
  uniform vec3  uCamPos;
  varying vec2 vUv; varying vec3 vNorm; varying vec3 vWP;
  void main() {
    // Base water color: near-black deep water
    float depth = clamp(dot(vNorm, vec3(0,1,0)), 0.0, 1.0);
    vec3 col = mix(uDeep, uShallow, depth * 0.5);

    // Moon specular reflection
    vec3 vd   = normalize(uCamPos - vWP);
    vec3 refl = reflect(-uMoonDir, vNorm);
    float spec = pow(max(dot(refl, vd), 0.0), 180.0);
    col += uMoonColor * spec * 1.2;

    // Subtle surface shimmer (caustics-like, very calm)
    float shim = sin(vUv.x*22.0+uTime*0.5)*sin(vUv.y*18.0+uTime*0.4);
    col += uShallow * max(0.0, shim) * 0.035;

    // Edge fade
    float ex = smoothstep(0.0, 0.06, vUv.x)*smoothstep(1.0, 0.94, vUv.x);
    float ey = smoothstep(0.0, 0.05, vUv.y)*smoothstep(1.0, 0.95, vUv.y);
    gl_FragColor = vec4(col, uOpacity * ex * ey);
  }
`;

// ─── ValleyScene ──────────────────────────────────────────────────────────────

export class ValleyScene {
  private scene:    THREE.Scene;
  private camera:   THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock:    THREE.Clock;
  private fog:      THREE.FogExp2;

  private water!:    THREE.Mesh;
  private wUni:      Record<string, THREE.IUniform> = {};
  private stars!:    THREE.Points;
  private starsMat!: THREE.PointsMaterial;
  private ambient!:  THREE.AmbientLight;
  private moon!:     THREE.DirectionalLight;
  private beacon!:   THREE.PointLight;
  private camPath!:  THREE.CatmullRomCurve3;

  private scroll = 0; private tScroll = 0;
  private mouse  = new THREE.Vector2();
  private tMouse = new THREE.Vector2();
  private animId = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.scene    = new THREE.Scene();
    // FOV=48 — telephoto feel, accentuates depth, makes aerial altitude obvious
    this.camera   = new THREE.PerspectiveCamera(48, canvas.width/canvas.height, 0.5, 1200);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    const a0 = ATMS[0]!;
    this.fog = new THREE.FogExp2(a0.sky.getHex(), a0.fd);
    this.scene.fog = this.fog;
    this.renderer.setClearColor(a0.sky, 1);
    this.clock = new THREE.Clock();

    this.buildPath();
    this.buildTerrain();
    this.buildMountains();
    this.buildWater();
    this.buildStars();
    this.buildLights();
    this.positionCamera(0);
  }

  // ── Camera path ─────────────────────────────────────────────────────────────
  // Control points chosen so that at t=0 the camera is at Y=120, looking DOWN
  // the valley at ~35° below horizontal — a true satellite/topo-map feel.
  // The tangent at t=0 points from (0,120,160) toward (-3,78,110):
  //   ΔY=-42, ΔZ=-50 → angle = atan(42/50) ≈ 40° below horizontal. ✓

  private buildPath(): void {
    // Y=88 at start: at this altitude with FOV=48°, the full valley is visible
    // as a topographic map. Tangent toward next point gives ~42° downward pitch.
    this.camPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(  0,  88, 140),  // Hero: satellite altitude, full valley map
      new THREE.Vector3( -3,  52,  96),  // Descending: horizon visible, depth apparent
      new THREE.Vector3(  2,  22,  48),  // Entering: valley walls frame scene
      new THREE.Vector3(  0,   8,   8),  // Inside valley: walls tower on both sides
      new THREE.Vector3(  2.5, 7, -48),  // Deep floor: most enclosed, beacon dominant
      new THREE.Vector3(0.5,  12, -84),  // Opening: valley widens, horizon returns
      new THREE.Vector3(  0,  20,-106),  // Panorama: elevated lookout above the lake
    ], false, 'catmullrom', 0.5);
  }

  private positionCamera(t: number): void {
    const pos  = this.camPath.getPoint(t);
    this.camera.position.copy(pos);

    const tang = this.camPath.getTangent(Math.min(t, 0.998));
    let target = pos.clone().addScaledVector(tang, 18);

    // Panorama end (t > 0.82): blend gaze toward the lake surface
    const pano = Math.max(0, (t - 0.82) / 0.18);
    if (pano > 0) {
      // Look across the lake toward distant shore — slightly below horizon
      const lakeGaze = new THREE.Vector3(
        pos.x + this.mouse.x * 5,
        2.0,   // just above water surface
        -148,
      );
      target = target.clone().lerp(lakeGaze, pano);
    }

    // Gentle mouse tilt (less at panorama end)
    target.x += this.mouse.x * 5.0 * (1 - pano * 0.6);
    target.y += this.mouse.y * 3.0 * (1 - pano * 0.5);
    this.camera.lookAt(target);
  }

  // ── Terrain ──────────────────────────────────────────────────────────────────

  private buildTerrain(): void {
    // 340×520 world-units, 180×280 segments — high enough for visible strata detail
    const geo = new THREE.PlaneGeometry(340, 520, 180, 280);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, terrainH(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.92,
      metalness: 0.02,
      fog: true,
    });
    applyRockShader(mat);

    this.scene.add(new THREE.Mesh(geo, mat));
  }

  // ── Distant mountain silhouette — panorama anchor ────────────────────────────
  // Two unlit dark meshes at Z≈-240: a wide low range + one taller peak.
  // At fog density 0.0012, these read as a real distant mountain range.

  private buildMountains(): void {
    const mat = new THREE.MeshBasicMaterial({ color: 0x040608, fog: true });

    // Wide low range — base ridge
    const pts1: THREE.Vector2[] = [];
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const x = -160 + (i / steps) * 320;
      const nv = Math.sin(i * 0.7) * 4 + Math.sin(i * 1.4) * 2.5 + Math.sin(i * 2.3) * 1.2;
      pts1.push(new THREE.Vector2(x, 12 + nv));
    }
    pts1.push(new THREE.Vector2(160, -5));
    pts1.push(new THREE.Vector2(-160, -5));
    const shape1 = new THREE.Shape(pts1);
    const geo1 = new THREE.ShapeGeometry(shape1);
    const m1 = new THREE.Mesh(geo1, mat);
    m1.position.set(0, 0, -240);
    this.scene.add(m1);

    // Taller peak offset right
    const pts2: THREE.Vector2[] = [];
    for (let i = 0; i <= 20; i++) {
      const x = -50 + (i / 20) * 130;
      const nv = Math.sin(i * 0.9) * 3 + Math.sin(i * 2.1) * 1.5;
      pts2.push(new THREE.Vector2(x, 20 + nv));
    }
    pts2.push(new THREE.Vector2(80, -5));
    pts2.push(new THREE.Vector2(-50, -5));
    const shape2 = new THREE.Shape(pts2);
    const geo2 = new THREE.ShapeGeometry(shape2);
    const m2 = new THREE.Mesh(geo2, mat);
    m2.position.set(20, 0, -235);
    this.scene.add(m2);
  }

  // ── Water — calm alpine lake ──────────────────────────────────────────────────

  private buildWater(): void {
    const geo = new THREE.PlaneGeometry(220, 120, 64, 40);
    geo.rotateX(-Math.PI / 2);

    // Moon direction uniform — used in water specular
    const moonDir = new THREE.Vector3(20, 60, 50).normalize();

    this.wUni = {
      uTime:     { value: 0 },
      uDeep:     { value: new THREE.Color(0x020810) }, // near-black deep water
      uShallow:  { value: new THREE.Color(0x061828) }, // slightly lighter at surface
      uSpec:     { value: new THREE.Color(0x8faac8) }, // unused, kept for compat
      uMoonDir:  { value: moonDir },
      uMoonColor:{ value: new THREE.Color(0xa0b8d8) }, // cool silver moonlight on water
      uOpacity:  { value: 0 },
      uCamPos:   { value: new THREE.Vector3() },
    };

    const mat = new THREE.ShaderMaterial({
      vertexShader:   WATER_VERT,
      fragmentShader: WATER_FRAG,
      uniforms:       this.wUni,
      transparent:    true,
      depthWrite:     false,
      side:           THREE.DoubleSide,
    });

    this.water = new THREE.Mesh(geo, mat);
    this.water.position.set(0, -0.8, -128);
    this.scene.add(this.water);
  }

  // ── Stars — realistic density and size ────────────────────────────────────────

  private buildStars(): void {
    const N = 2200;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      // Scatter across a hemisphere above the scene
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI * 0.48; // upper hemisphere only
      const r     = 380 + Math.random() * 60;
      arr[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      arr[i*3+1] = r * Math.abs(Math.cos(phi)) + 20; // always above horizon
      arr[i*3+2] = -60 + (Math.random() - 0.5) * 320;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.starsMat = new THREE.PointsMaterial({
      color:          0xd8e4f4,  // cool white, slight blue tint
      size:           0.28,
      sizeAttenuation:true,
      transparent:    true,
      opacity:        0,
    });
    this.stars = new THREE.Points(geo, this.starsMat);
    this.scene.add(this.stars);
  }

  // ── Lights ────────────────────────────────────────────────────────────────────

  private buildLights(): void {
    const a0 = ATMS[0]!;

    this.ambient = new THREE.AmbientLight(a0.ambC, a0.ambI);
    this.scene.add(this.ambient);

    // Moon: cold silver directional from upper-right, rakes across cliff faces.
    // High angle (80,80,60) so stone walls catch rim light readable from satellite altitude.
    this.moon = new THREE.DirectionalLight(a0.moonC, a0.moonI);
    this.moon.position.set(45, 80, 60);
    this.moon.target.position.set(0, 0, -20);
    this.scene.add(this.moon);
    this.scene.add(this.moon.target);

    // Beacon: wandering guide light, drifts ahead of camera. decay=2 (physically correct).
    this.beacon = new THREE.PointLight(a0.beaC, a0.beaI, 120, 2);
    this.scene.add(this.beacon);
  }

  // ── API ───────────────────────────────────────────────────────────────────────

  setSize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  setScroll(p: number): void { this.tScroll = Math.max(0, Math.min(1, p)); }

  onMouseMove(x: number, y: number): void {
    this.tMouse.set(
      (x / window.innerWidth)  * 2 - 1,
      -((y / window.innerHeight) * 2 - 1),
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  private render(): void {
    const delta   = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Smooth scroll and mouse
    this.scroll += (this.tScroll - this.scroll) * (1 - Math.exp(-delta * 3.5));
    this.mouse.lerp(this.tMouse, 0.04);

    this.positionCamera(this.scroll);
    const atm = lerpAtm(this.scroll);

    // Atmosphere
    this.fog.color.copy(atm.sky);
    this.fog.density = atm.fd;
    this.renderer.setClearColor(atm.sky, 1);
    this.ambient.color.copy(atm.ambC);
    this.ambient.intensity = atm.ambI;
    this.moon.color.copy(atm.moonC);
    this.moon.intensity = atm.moonI;

    // Beacon drifts ~6% ahead on the path, sways laterally with time
    const bT = Math.min(this.scroll + 0.055, 0.998);
    const bp = this.camPath.getPoint(bT);
    bp.x += Math.sin(elapsed * 0.14) * 3.5 + this.mouse.x * 2.0;
    bp.y += 2.5 + Math.sin(elapsed * 0.09) * 1.0;
    this.beacon.position.copy(bp);
    this.beacon.color.copy(atm.beaC);
    this.beacon.intensity = atm.beaI;

    // Stars and water
    this.starsMat.opacity = atm.stars;
    (this.wUni['uOpacity']  as THREE.IUniform).value = atm.water;
    (this.wUni['uTime']     as THREE.IUniform).value = elapsed;
    (this.wUni['uCamPos']   as THREE.IUniform).value.copy(this.camera.position);

    this.renderer.render(this.scene, this.camera);
  }

  start():   void { const l = (): void => { this.animId = requestAnimationFrame(l); this.render(); }; l(); }
  dispose(): void { cancelAnimationFrame(this.animId); this.renderer.dispose(); this.scene.clear(); }
}
