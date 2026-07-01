import * as THREE from 'three';

// ─── CPU noise ────────────────────────────────────────────────────────────────

function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function vnoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return hash2(ix, iy)
    + (hash2(ix + 1, iy) - hash2(ix, iy)) * ux
    + (hash2(ix, iy + 1) - hash2(ix, iy)) * uy
    + (hash2(ix + 1, iy + 1) - hash2(ix + 1, iy) - hash2(ix, iy + 1) + hash2(ix, iy)) * ux * uy;
}
function fbm(x: number, y: number, oct = 6): number {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += a * vnoise(x * f, y * f); f *= 2.1; a *= 0.44; }
  return v;
}

// ─── Terrain ──────────────────────────────────────────────────────────────────
// U-shaped valley. Floor at Y≈-6. Walls reach Y=42. Half-width=45 units.
// At camera start Y=100, FOV=62°: visible width ≈ 230 units → valley reads as
// a clear dark groove in bright terrain, exactly like a topographic satellite image.

function terrainH(wx: number, wz: number): number {
  const t    = Math.max(0, Math.min(1, (160 - wz) / 270));
  const open = Math.max(0, (t - 0.70) / 0.30);     // valley opens near panorama

  const vHalf = 45 + open * 65;                     // 45 → 110 units half-width

  const n1 = (fbm(wx * 0.050, wz * 0.025)     * 2 - 1);
  const n2 = (fbm(wx * 0.160, wz * 0.090, 4)  * 2 - 1) * 0.30;
  const n3 = (fbm(wx * 0.480, wz * 0.330, 3)  * 2 - 1) * 0.10;
  const n  = n1 + n2 + n3;

  const nd   = Math.abs(wx) / vHalf;
  // U-shape: gentler than V (pow 2.2), high walls
  const base = Math.pow(nd, 2.2) * 48 - 6;
  const rugged = (6.0 + Math.max(0, nd - 0.4) * 14.0) * (1 - open * 0.55);
  const dip    = open > 0.10 ? -(open - 0.10) * 8.0 : 0;

  return base + n * rugged + dip;
}

// ─── GLSL material — dark video game style ────────────────────────────────────
// Three clear zones (like a game engine landscape material):
//   FLAT (slope<0.30) → dark forest green grass    #1e3615
//   MID  (0.30–0.60)  → earthy soil transition     #3a2e22
//   STEEP(slope>0.60) → moonlit rock face          #6a5e52
// HemisphereLight sky color tints grass blue-green at night.
// Strong directional moon creates shadows that define terrain relief.

const TERRAIN_GLSL = /* glsl */`
  float tHash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float tNoise(vec2 p){
    vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
    return mix(mix(tHash(i),tHash(i+vec2(1,0)),u.x),
               mix(tHash(i+vec2(0,1)),tHash(i+vec2(1,1)),u.x),u.y);
  }
  float tFbm(vec2 p){
    float v=0.0,a=0.5;
    for(int i=0;i<5;i++){v+=a*tNoise(p);p*=2.1;a*=0.46;}
    return v;
  }

  vec3 terrainColor(vec3 wp, vec3 wn, float slope, float height){
    // ── Material zones (video game landscape layers) ──────────────────────
    // Grass — dark forest green, slightly blue-tinted from night sky
    vec3 grass  = vec3(0.118, 0.212, 0.082);  // #1e3615  flat ground
    // Soil — earthy dark brown, transition zone
    vec3 soil   = vec3(0.220, 0.176, 0.133);  // #382d22  mid slope
    // Rock — warm grey-brown, cliff face (catches moonlight)
    vec3 rock   = vec3(0.408, 0.361, 0.310);  // #685c4f  steep wall
    // Stone highlight — lighter grey for upper moonlit faces
    vec3 stoneHi= vec3(0.533, 0.490, 0.443);  // #887d71  high exposed face

    // Smooth but clear zone boundaries (game-engine style blend)
    float grassZone = smoothstep(0.42, 0.18, slope);  // 1=flat, 0=slope
    float rockZone  = smoothstep(0.38, 0.68, slope);  // 1=cliff, 0=flat

    vec3 col = grass;
    col = mix(col,  soil, smoothstep(0.15, 0.42, slope));
    col = mix(col,  rock, rockZone);

    // ── Height tint: upper rocky faces catch more moonlight ───────────────
    float topFace = smoothstep(10.0, 32.0, height) * rockZone;
    col = mix(col, stoneHi, topFace * 0.65);

    // ── Surface variation (breaks up flat areas, adds micro detail) ───────
    float detail = tFbm(wp.xz * 0.18);
    col *= (0.82 + detail * 0.32);

    // ── Rock strata on cliff faces (horizontal banding — reads as stone) ──
    float strata = sin(height * 1.6 + tFbm(wp.xz * 0.12) * 5.0) * 0.5 + 0.5;
    float strataFac = rockZone * (0.88 + strataSharpened(strata) * 0.18);
    col *= strataFac;

    // ── Grass variation: small noise patches for natural lawn feel ────────
    float gPatch = tFbm(wp.xz * 0.55);
    col = mix(col, col * 1.15, grassZone * gPatch * 0.4);

    // ── Large-scale brightness (hill exposure vs sheltered ravine) ────────
    float macro = tFbm(wp.xz * 0.022);
    col *= (0.78 + macro * 0.38);

    return col;
  }

  float strataSharpened(float s){ return smoothstep(0.3, 0.7, s); }
`;

// The strata helper needs to be declared before use — move it before rockColor call
const TERRAIN_GLSL_FIXED = /* glsl */`
  float tHash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float tNoise(vec2 p){
    vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
    return mix(mix(tHash(i),tHash(i+vec2(1,0)),u.x),
               mix(tHash(i+vec2(0,1)),tHash(i+vec2(1,1)),u.x),u.y);
  }
  float tFbm(vec2 p){
    float v=0.0,a=0.5;
    for(int i=0;i<5;i++){v+=a*tNoise(p);p*=2.1;a*=0.46;}
    return v;
  }

  vec3 terrainColor(vec3 wp, vec3 wn){
    float slope  = 1.0 - abs(wn.y);    // 0=flat, 1=vertical
    float height = wp.y;

    // ── Material zones ────────────────────────────────────────────────────
    vec3 grass   = vec3(0.118, 0.212, 0.082);  // dark forest green  #1e3615
    vec3 soil    = vec3(0.220, 0.176, 0.133);  // earthy brown       #382d22
    vec3 rock    = vec3(0.408, 0.361, 0.310);  // warm grey-brown    #685c4f
    vec3 stoneHi = vec3(0.533, 0.490, 0.443);  // moonlit stone top  #887d71

    float rockZone = smoothstep(0.38, 0.68, slope);

    vec3 col = grass;
    col = mix(col, soil, smoothstep(0.15, 0.42, slope));
    col = mix(col, rock, rockZone);

    // ── Upper exposed rock faces catch moonlight ──────────────────────────
    float topFace = smoothstep(8.0, 28.0, height) * rockZone;
    col = mix(col, stoneHi, topFace * 0.60);

    // ── Surface micro-detail (prevents flat plastic look) ─────────────────
    float detail = tFbm(wp.xz * 0.20);
    col *= (0.80 + detail * 0.35);

    // ── Rock strata on cliff faces: horizontal banding = "this is stone" ──
    float strata    = sin(height * 1.8 + tFbm(wp.xz * 0.14) * 5.5) * 0.5 + 0.5;
    float strataS   = smoothstep(0.30, 0.70, strata);
    col *= mix(1.0, 0.86 + strataS * 0.20, rockZone);

    // ── Grass micro-variation (subtle patches) ────────────────────────────
    float gVar = tFbm(wp.xz * 0.60);
    float isGrass = smoothstep(0.42, 0.18, slope);
    col += vec3(0.0, gVar * 0.018, 0.0) * isGrass;

    // ── Large-scale luminosity: exposure vs shelter ────────────────────────
    float macro = tFbm(wp.xz * 0.020);
    col *= (0.76 + macro * 0.42);

    return col;
  }
`;

function applyTerrainShader(mat: THREE.MeshStandardMaterial): void {
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
      `#include <common>\nvarying vec3 vWP;\nvarying vec3 vWN;\n${TERRAIN_GLSL_FIXED}`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      'diffuseColor.rgb = terrainColor(vWP, vWN);',
    );
  };
  mat.customProgramCacheKey = () => 'terrain-night-v3';
}

// ─── Atmospheres — dark video game night ──────────────────────────────────────
// Dark theme preserved. But lights are strong enough to read terrain clearly.
// Key: HemisphereLight gives sky-blue tint to grass tops, warm ground bounce.
// Sky colors: deep navy #0c1428, not black. Water: dark blue-teal.
// No purple. No neon. Just night.

interface Atm {
  p: number;
  sky: THREE.Color; fd: number;
  moonC: THREE.Color; moonI: number;
  hemSkyC: THREE.Color; hemGndC: THREE.Color; hemI: number;
  beaC: THREE.Color; beaI: number;
  stars: number; water: number;
}
const C = (h: number) => new THREE.Color(h);

const ATMS: Atm[] = [
  // 0 — Aerial: high above, valley visible as dark groove in moonlit terrain
  { p:0.00, sky:C(0x0c1428), fd:0.0006,
    moonC:C(0xd0dff0), moonI:2.80,
    hemSkyC:C(0x1a2c48), hemGndC:C(0x0a1408), hemI:1.20,
    beaC:C(0xb8d0f0), beaI: 6, stars:0.0, water:0.0 },

  // 0.17 — Descending: valley walls grow, terrain detail visible
  { p:0.17, sky:C(0x0a1020), fd:0.0015,
    moonC:C(0xc8dce8), moonI:2.50,
    hemSkyC:C(0x162438), hemGndC:C(0x080e06), hemI:1.10,
    beaC:C(0xaac4e8), beaI:14, stars:0.10, water:0.0 },

  // 0.35 — Entering valley: grass on slopes clearly visible, walls rise
  { p:0.35, sky:C(0x080e1c), fd:0.0030,
    moonC:C(0xbcd0e4), moonI:2.20,
    hemSkyC:C(0x122030), hemGndC:C(0x060c04), hemI:1.00,
    beaC:C(0x98b8e0), beaI:24, stars:0.30, water:0.0 },

  // 0.54 — Deep valley: grass floor, stone walls towering, beacon primary light
  { p:0.54, sky:C(0x060a14), fd:0.0048,
    moonC:C(0xb0c4dc), moonI:1.60,
    hemSkyC:C(0x0e1a28), hemGndC:C(0x040a02), hemI:0.90,
    beaC:C(0x88acd8), beaI:32, stars:0.60, water:0.0 },

  // 0.71 — Valley opens: sky returns, stars bright, horizon reappears
  { p:0.71, sky:C(0x0a1020), fd:0.0022,
    moonC:C(0xbcd0e8), moonI:2.00,
    hemSkyC:C(0x14223a), hemGndC:C(0x080e06), hemI:1.05,
    beaC:C(0xa0c0e4), beaI:20, stars:0.80, water:0.20 },

  // 0.87 — Approaching lake: wide panorama, moonlight on water
  { p:0.87, sky:C(0x0e1830), fd:0.0014,
    moonC:C(0xc8dce8), moonI:2.40,
    hemSkyC:C(0x182840), hemGndC:C(0x0a1008), hemI:1.15,
    beaC:C(0xc0d4f4), beaI:14, stars:0.90, water:0.60 },

  // 1.00 — Lake panorama: full starfield, silver lake, dark mountains
  { p:1.00, sky:C(0x0c1428), fd:0.0010,
    moonC:C(0xd0e0f0), moonI:2.60,
    hemSkyC:C(0x1a2c48), hemGndC:C(0x0c1208), hemI:1.20,
    beaC:C(0xd8ecff), beaI:10, stars:1.00, water:0.90 },
];

function lerpAtm(p: number): Atm {
  p = Math.max(0, Math.min(1, p));
  for (let i = 0; i < ATMS.length - 1; i++) {
    const a = ATMS[i]!, b = ATMS[i + 1]!;
    if (p >= a.p && p <= b.p) {
      const t = (p - a.p) / (b.p - a.p);
      return {
        p,
        sky:     a.sky.clone().lerp(b.sky, t),      fd:     a.fd + (b.fd - a.fd) * t,
        moonC:   a.moonC.clone().lerp(b.moonC, t),  moonI:  a.moonI + (b.moonI - a.moonI) * t,
        hemSkyC: a.hemSkyC.clone().lerp(b.hemSkyC, t),
        hemGndC: a.hemGndC.clone().lerp(b.hemGndC, t),
        hemI:    a.hemI + (b.hemI - a.hemI) * t,
        beaC:    a.beaC.clone().lerp(b.beaC, t),    beaI:   a.beaI + (b.beaI - a.beaI) * t,
        stars:   a.stars + (b.stars - a.stars) * t, water:  a.water + (b.water - a.water) * t,
      };
    }
  }
  return { ...ATMS[ATMS.length - 1]! };
}

// ─── Water — dark alpine lake ──────────────────────────────────────────────────

const WATER_VERT = /* glsl */`
  uniform float uTime;
  varying vec2 vUv; varying vec3 vNorm; varying vec3 vWP;
  void main() {
    vUv = uv;
    vec3 p = position;
    float w = sin(p.x*0.09+uTime*0.20)*0.10 + cos(p.z*0.07+uTime*0.16)*0.08
            + sin((p.x+p.z)*0.05+uTime*0.12)*0.05;
    p.y += w;
    float e=1.0;
    float wx=sin((p.x+e)*0.09+uTime*0.20)*0.10+cos(p.z*0.07+uTime*0.16)*0.08;
    float wz=sin(p.x*0.09+uTime*0.20)*0.10+cos((p.z+e)*0.07+uTime*0.16)*0.08;
    vNorm=normalize(vec3(-(wx-w)/e,1.0,-(wz-w)/e));
    vec4 wp4=modelMatrix*vec4(p,1.0); vWP=wp4.xyz;
    gl_Position=projectionMatrix*viewMatrix*wp4;
  }
`;
const WATER_FRAG = /* glsl */`
  uniform vec3  uDeep, uShallow, uMoonDir, uMoonColor;
  uniform float uOpacity, uTime;
  uniform vec3  uCamPos;
  varying vec2 vUv; varying vec3 vNorm; varying vec3 vWP;
  void main(){
    float depth = clamp(dot(vNorm,vec3(0,1,0)),0.0,1.0);
    vec3 col = mix(uDeep, uShallow, depth*0.4);
    vec3 vd   = normalize(uCamPos-vWP);
    vec3 refl = reflect(-uMoonDir, vNorm);
    float spec = pow(max(dot(refl,vd),0.0),220.0);
    col += uMoonColor * spec * 1.5;
    float shim = sin(vUv.x*25.0+uTime*0.5)*sin(vUv.y*20.0+uTime*0.4);
    col += uShallow * max(0.0,shim) * 0.030;
    float ex=smoothstep(0.0,0.05,vUv.x)*smoothstep(1.0,0.95,vUv.x);
    float ey=smoothstep(0.0,0.05,vUv.y)*smoothstep(1.0,0.95,vUv.y);
    gl_FragColor=vec4(col, uOpacity*ex*ey);
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
  private hemi!:     THREE.HemisphereLight;
  private moon!:     THREE.DirectionalLight;
  private beacon!:   THREE.PointLight;
  private camPath!:  THREE.CatmullRomCurve3;

  private scroll = 0; private tScroll = 0;
  private mouse  = new THREE.Vector2();
  private tMouse = new THREE.Vector2();
  private animId = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.scene    = new THREE.Scene();
    // FOV=62°: wide enough to feel game-like, still shows aerial depth
    this.camera   = new THREE.PerspectiveCamera(62, canvas.width / canvas.height, 0.5, 1200);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.10;

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

  // ── Camera path ──────────────────────────────────────────────────────────────
  // At t=0: Y=100, Z=150. Tangent toward (-3,62,100) gives pitch ≈ -38° (aerial).
  // At this height with FOV=62° the terrain spans ~240 units → valley clearly visible
  // as a dark U-groove in the lit landscape. No need to scroll to "find" the valley.

  private buildPath(): void {
    this.camPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(  0, 100, 150),  // 0.00 — satellite altitude, full valley map
      new THREE.Vector3( -3,  62, 100),  // 0.17 — descent, walls gaining height
      new THREE.Vector3(  2,  26,  52),  // 0.35 — valley walls frame scene
      new THREE.Vector3(  0,   8,   8),  // 0.54 — floor level, walls tower
      new THREE.Vector3(  2,   7, -46),  // 0.71 — deep floor, beacon dominant
      new THREE.Vector3(0.5,  12, -84),  // 0.87 — valley opens, horizon returns
      new THREE.Vector3(  0,  22,-108),  // 1.00 — elevated lookout above lake
    ], false, 'catmullrom', 0.5);
  }

  private positionCamera(t: number): void {
    const pos  = this.camPath.getPoint(t);
    this.camera.position.copy(pos);

    const tang = this.camPath.getTangent(Math.min(t, 0.998));
    let target = pos.clone().addScaledVector(tang, 18);

    // Panorama: gaze blends down toward lake surface
    const pano = Math.max(0, (t - 0.82) / 0.18);
    if (pano > 0) {
      const lakeGaze = new THREE.Vector3(pos.x + this.mouse.x * 5, 2.0, -150);
      target = target.clone().lerp(lakeGaze, pano);
    }

    target.x += this.mouse.x * 5.0 * (1 - pano * 0.6);
    target.y += this.mouse.y * 3.0 * (1 - pano * 0.5);
    this.camera.lookAt(target);
  }

  // ── Terrain ───────────────────────────────────────────────────────────────────

  private buildTerrain(): void {
    const geo = new THREE.PlaneGeometry(360, 540, 190, 300);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, terrainH(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.90,
      metalness: 0.02,
      fog: true,
    });
    applyTerrainShader(mat);
    this.scene.add(new THREE.Mesh(geo, mat));
  }

  // ── Mountain silhouette — panorama anchor ─────────────────────────────────────

  private buildMountains(): void {
    const mat = new THREE.MeshBasicMaterial({ color: 0x050810, fog: true });

    // Wide low range
    const pts1: THREE.Vector2[] = [];
    for (let i = 0; i <= 32; i++) {
      const x = -170 + (i / 32) * 340;
      const h = 14 + Math.sin(i * 0.65) * 5 + Math.sin(i * 1.5) * 2.5;
      pts1.push(new THREE.Vector2(x, h));
    }
    pts1.push(new THREE.Vector2(170, -4), new THREE.Vector2(-170, -4));
    const m1 = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts1)), mat);
    m1.position.set(0, 0, -245);
    this.scene.add(m1);

    // Taller peak, right-offset
    const pts2: THREE.Vector2[] = [];
    for (let i = 0; i <= 20; i++) {
      const x = -55 + (i / 20) * 140;
      const h = 22 + Math.sin(i * 0.85) * 4 + Math.sin(i * 2.2) * 2;
      pts2.push(new THREE.Vector2(x, h));
    }
    pts2.push(new THREE.Vector2(85, -4), new THREE.Vector2(-55, -4));
    const m2 = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts2)), mat);
    m2.position.set(22, 0, -238);
    this.scene.add(m2);
  }

  // ── Water ─────────────────────────────────────────────────────────────────────

  private buildWater(): void {
    const geo = new THREE.PlaneGeometry(220, 120, 64, 40);
    geo.rotateX(-Math.PI / 2);
    const moonDir = new THREE.Vector3(40, 80, 60).normalize();
    this.wUni = {
      uTime:      { value: 0 },
      uDeep:      { value: new THREE.Color(0x060c18) },  // near-black deep water
      uShallow:   { value: new THREE.Color(0x0a1828) },  // slightly lighter surface
      uMoonDir:   { value: moonDir },
      uMoonColor: { value: new THREE.Color(0xa8c0dc) },  // silver moon streak on water
      uOpacity:   { value: 0 },
      uCamPos:    { value: new THREE.Vector3() },
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader: WATER_VERT, fragmentShader: WATER_FRAG,
      uniforms: this.wUni, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this.water = new THREE.Mesh(geo, mat);
    this.water.position.set(0, -0.6, -128);
    this.scene.add(this.water);
  }

  // ── Stars ─────────────────────────────────────────────────────────────────────

  private buildStars(): void {
    const N = 2000;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI * 0.45;
      const r     = 400 + Math.random() * 60;
      arr[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.abs(Math.cos(phi)) + 15;
      arr[i * 3 + 2] = -80 + (Math.random() - 0.5) * 360;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.starsMat = new THREE.PointsMaterial({
      color: 0xdce8f8, size: 0.30, sizeAttenuation: true, transparent: true, opacity: 0,
    });
    this.stars = new THREE.Points(geo, this.starsMat);
    this.scene.add(this.stars);
  }

  // ── Lights ────────────────────────────────────────────────────────────────────
  // HemisphereLight: critical for making grass look GREEN in a dark scene.
  //   Sky color (top) = deep blue tints grass tops
  //   Ground color (bottom) = very dark green tints ground shadows
  // Moon DirectionalLight: strong silver key light, creates shadow-defined terrain.

  private buildLights(): void {
    const a0 = ATMS[0]!;

    // HemisphereLight — sky/ground color separation (game-engine standard)
    this.hemi = new THREE.HemisphereLight(a0.hemSkyC, a0.hemGndC, a0.hemI);
    this.scene.add(this.hemi);

    // Moon: strong directional, rakes across terrain, defines relief through shadows
    this.moon = new THREE.DirectionalLight(a0.moonC, a0.moonI);
    this.moon.position.set(40, 80, 60);
    this.moon.target.position.set(0, 0, -20);
    this.scene.add(this.moon);
    this.scene.add(this.moon.target);

    // Beacon: PointLight ahead of camera, wanders through valley
    this.beacon = new THREE.PointLight(a0.beaC, a0.beaI, 110, 2);
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
    this.tMouse.set((x / window.innerWidth) * 2 - 1, -((y / window.innerHeight) * 2 - 1));
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  private render(): void {
    const delta   = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.scroll += (this.tScroll - this.scroll) * (1 - Math.exp(-delta * 3.5));
    this.mouse.lerp(this.tMouse, 0.04);

    this.positionCamera(this.scroll);
    const atm = lerpAtm(this.scroll);

    this.fog.color.copy(atm.sky);
    this.fog.density = atm.fd;
    this.renderer.setClearColor(atm.sky, 1);

    this.hemi.color.copy(atm.hemSkyC);
    this.hemi.groundColor.copy(atm.hemGndC);
    this.hemi.intensity = atm.hemI;
    this.moon.color.copy(atm.moonC);
    this.moon.intensity = atm.moonI;

    // Beacon drifts 5% ahead, sways like wind
    const bT = Math.min(this.scroll + 0.050, 0.998);
    const bp = this.camPath.getPoint(bT);
    bp.x += Math.sin(elapsed * 0.14) * 3.0 + Math.sin(elapsed * 0.07) * 1.5 + this.mouse.x * 1.8;
    bp.y += 2.0 + Math.sin(elapsed * 0.09) * 0.8;
    this.beacon.position.copy(bp);
    this.beacon.color.copy(atm.beaC);
    this.beacon.intensity = atm.beaI;

    this.starsMat.opacity = atm.stars;
    (this.wUni['uOpacity']  as THREE.IUniform).value = atm.water;
    (this.wUni['uTime']     as THREE.IUniform).value = elapsed;
    (this.wUni['uCamPos']   as THREE.IUniform).value.copy(this.camera.position);

    this.renderer.render(this.scene, this.camera);
  }

  start():   void { const l = (): void => { this.animId = requestAnimationFrame(l); this.render(); }; l(); }
  dispose(): void { cancelAnimationFrame(this.animId); this.renderer.dispose(); this.scene.clear(); }
}
