import * as THREE from 'three';

// ─── Procedural noise ────────────────────────────────────────────────────────

function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const v00 = hash2(ix,     iy);
  const v10 = hash2(ix + 1, iy);
  const v01 = hash2(ix,     iy + 1);
  const v11 = hash2(ix + 1, iy + 1);
  return v00 + (v10 - v00) * ux + (v01 - v00) * uy + (v11 - v10 - v01 + v00) * ux * uy;
}

function fbm(x: number, y: number): number {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < 5; i++) {
    v += a * valueNoise(x * f, y * f);
    f *= 2.1; a *= 0.45;
  }
  return v; // ~0..1
}

// ─── Terrain ─────────────────────────────────────────────────────────────────
// Camera path: world Z from +90 (hero) to -140 (contact). t in [0,1].

function terrainHeight(worldX: number, worldZ: number): number {
  const t = Math.max(0, Math.min(1, (90 - worldZ) / 230));

  // Valley progressively opens toward panorama end
  const openFactor = Math.max(0, (t - 0.70) / 0.30);
  const valleyHalf = 14 + openFactor * 36;

  // Noise variation (smoother at panorama end)
  const noiseAmp = 4.0 * (1 - openFactor * 0.72);
  const n = fbm(worldX * 0.09, worldZ * 0.045) * 2 - 1; // −1..+1
  const noiseVal = n * noiseAmp;

  // Valley walls — rise sharply outside valleyHalf
  const dist = Math.max(0, Math.abs(worldX) - valleyHalf);
  const wall = Math.pow(dist * 0.13, 1.5) * 10;

  // Floor dips at panorama (to reveal water surface below camera)
  const dip = openFactor > 0.2 ? -(openFactor - 0.2) * 6.0 : 0;

  // Subtract baseline so camera (Y=2.5) is safely above floor
  return noiseVal + wall + dip - 1.5;
}

// ─── Atmosphere stops ────────────────────────────────────────────────────────

interface Atm {
  p: number;
  skyColor:    THREE.Color; // clear color + fog
  fogDensity:  number;
  moonColor:   THREE.Color;
  moonInt:     number;
  ambientColor:THREE.Color;
  ambientInt:  number;
  beaconColor: THREE.Color;
  beaconInt:   number;
  stars:       number; // opacity
  water:       number; // opacity
}

function c(hex: number) { return new THREE.Color(hex); }

const ATMS: Atm[] = [
  // Hero — mystical indigo dawn, gentle mist
  { p: 0.00, skyColor: c(0x07061e), fogDensity: 0.010,
    moonColor: c(0x5544aa), moonInt: 0.55,
    ambientColor: c(0x1a1040), ambientInt: 0.80,
    beaconColor: c(0x8866dd), beaconInt: 18,
    stars: 0.0, water: 0.0 },

  // Pain — heavy charcoal-purple, oppressive, thick mist
  { p: 0.18, skyColor: c(0x08060f), fogDensity: 0.018,
    moonColor: c(0x221133), moonInt: 0.25,
    ambientColor: c(0x100820), ambientInt: 0.55,
    beaconColor: c(0x3a1866), beaconInt: 10,
    stars: 0.0, water: 0.0 },

  // Services — teal-cyan, valley opens, mist clears
  { p: 0.36, skyColor: c(0x011422), fogDensity: 0.008,
    moonColor: c(0x224466), moonInt: 0.70,
    ambientColor: c(0x0a2030), ambientInt: 0.90,
    beaconColor: c(0x00aacc), beaconInt: 22,
    stars: 0.0, water: 0.0 },

  // AI — deep space, electric blue, stars emerge
  { p: 0.55, skyColor: c(0x000208), fogDensity: 0.006,
    moonColor: c(0x112244), moonInt: 0.40,
    ambientColor: c(0x040a1a), ambientInt: 0.70,
    beaconColor: c(0x0044ff), beaconInt: 28,
    stars: 0.90, water: 0.0 },

  // Team — soft ivory-lavender warmth
  { p: 0.72, skyColor: c(0x0c0a10), fogDensity: 0.012,
    moonColor: c(0x332244), moonInt: 0.50,
    ambientColor: c(0x1a1422), ambientInt: 0.75,
    beaconColor: c(0xd0c4e8), beaconInt: 15,
    stars: 0.30, water: 0.0 },

  // Contact approach — clear night, water appears
  { p: 0.87, skyColor: c(0x010209), fogDensity: 0.005,
    moonColor: c(0x223355), moonInt: 0.60,
    ambientColor: c(0x0a0c18), ambientInt: 0.80,
    beaconColor: c(0xb8c0e0), beaconInt: 20,
    stars: 1.0, water: 0.50 },

  // Contact full — starry sky, calm water, horizon glow
  { p: 1.00, skyColor: c(0x000005), fogDensity: 0.004,
    moonColor: c(0x334466), moonInt: 0.70,
    ambientColor: c(0x0c0e1a), ambientInt: 0.85,
    beaconColor: c(0xffffff), beaconInt: 25,
    stars: 1.0, water: 0.82 },
];

function lerpAtm(progress: number): Atm {
  const p = Math.max(0, Math.min(1, progress));
  for (let i = 0; i < ATMS.length - 1; i++) {
    const a = ATMS[i]!, b = ATMS[i + 1]!;
    if (p >= a.p && p <= b.p) {
      const t = (p - a.p) / (b.p - a.p);
      return {
        p,
        skyColor:    a.skyColor.clone().lerp(b.skyColor, t),
        fogDensity:  a.fogDensity  + (b.fogDensity  - a.fogDensity)  * t,
        moonColor:   a.moonColor.clone().lerp(b.moonColor, t),
        moonInt:     a.moonInt     + (b.moonInt     - a.moonInt)     * t,
        ambientColor:a.ambientColor.clone().lerp(b.ambientColor, t),
        ambientInt:  a.ambientInt  + (b.ambientInt  - a.ambientInt)  * t,
        beaconColor: a.beaconColor.clone().lerp(b.beaconColor, t),
        beaconInt:   a.beaconInt   + (b.beaconInt   - a.beaconInt)   * t,
        stars:       a.stars       + (b.stars        - a.stars)      * t,
        water:       a.water       + (b.water        - a.water)      * t,
      };
    }
  }
  return { ...ATMS[ATMS.length - 1]! };
}

// ─── Water shaders ───────────────────────────────────────────────────────────

const WATER_VERT = /* glsl */`
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float w = sin(pos.x * 0.16 + uTime * 0.35) * 0.055
            + cos(pos.z * 0.12 + uTime * 0.28) * 0.048
            + sin((pos.x + pos.z) * 0.08 + uTime * 0.20) * 0.036;
    pos.y += w;
    vWave = w;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const WATER_FRAG = /* glsl */`
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    float f = clamp(0.5 + vWave * 7.0, 0.0, 1.0);
    vec3 col = mix(uDeep, uShallow, f);
    float ex = smoothstep(0.0, 0.10, vUv.x) * smoothstep(1.0, 0.90, vUv.x);
    float ey = smoothstep(0.0, 0.08, vUv.y) * smoothstep(1.0, 0.92, vUv.y);
    gl_FragColor = vec4(col, uOpacity * ex * ey);
  }
`;

// ─── ValleyScene ─────────────────────────────────────────────────────────────

export class ValleyScene {
  private scene:    THREE.Scene;
  private camera:   THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock:    THREE.Clock;
  private fog:      THREE.FogExp2;

  private terrain!:  THREE.Mesh;
  private water!:    THREE.Mesh;
  private waterUni:  Record<string, THREE.IUniform> = {};
  private stars!:    THREE.Points;
  private starsMat!: THREE.PointsMaterial;

  private ambient!: THREE.AmbientLight;
  private moon!:    THREE.DirectionalLight;  // primary fill from above
  private beacon!:  THREE.PointLight;        // traveling light ahead

  private camPath!: THREE.CatmullRomCurve3;

  private scrollProgress = 0;
  private targetScroll   = 0;
  private mouse       = new THREE.Vector2();
  private targetMouse = new THREE.Vector2();
  private animId      = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.scene    = new THREE.Scene();
    this.camera   = new THREE.PerspectiveCamera(65, canvas.width / canvas.height, 0.1, 600);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const a0 = ATMS[0]!;
    this.fog = new THREE.FogExp2(a0.skyColor.getHex(), a0.fogDensity);
    this.scene.fog = this.fog;
    this.renderer.setClearColor(a0.skyColor, 1);

    this.clock = new THREE.Clock();

    this.buildPath();
    this.buildTerrain();
    this.buildWater();
    this.buildStars();
    this.buildLights();
    this.positionCamera(0);
  }

  // ── Camera path ────────────────────────────────────────────────────────────
  // World Z: +90 (hero entrance) → -140 (contact panorama)

  private buildPath(): void {
    this.camPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(  0,  2.5,  90),  // Hero
      new THREE.Vector3( -2,  2.5,  52),  // Pain — slight left drift
      new THREE.Vector3(  1,  2.5,  14),  // Services — bends
      new THREE.Vector3(  0,  2.8, -25),  // AI — deeper
      new THREE.Vector3(  2,  2.6, -65),  // Team — right
      new THREE.Vector3(0.5,  3.5, -105), // Method — approaching opening
      new THREE.Vector3(  0,  5.5, -140), // Contact — elevated panorama
    ], false, 'catmullrom', 0.5);
  }

  private positionCamera(t: number): void {
    const pos = this.camPath.getPoint(t);
    this.camera.position.copy(pos);
    const ahead = this.camPath.getPoint(Math.min(t + 0.025, 1));
    ahead.x += this.mouse.x * 3.5;
    ahead.y += this.mouse.y * 2.0;
    this.camera.lookAt(ahead);
  }

  // ── Terrain ────────────────────────────────────────────────────────────────

  private buildTerrain(): void {
    // Terrain at WORLD origin — no position offset so worldX/Z = vertex X/Z
    // Covers X: ±100, Z: ±170 — camera path fits entirely inside
    const geo = new THREE.PlaneGeometry(200, 340, 120, 190);
    geo.rotateX(-Math.PI / 2);
    // After rotation: vertex (x, y_orig, 0) → (x, 0, -y_orig)
    // So pos.getX(i) = world X, pos.getZ(i) = world Z (no offset needed)

    const pos = geo.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color:     new THREE.Color(0x181530),
      roughness: 0.90,
      metalness: 0.05,
      fog: true,
    });

    this.terrain = new THREE.Mesh(geo, mat);
    // position.y = 0 — terrain occupies world Y based on terrainHeight output
    this.scene.add(this.terrain);
  }

  // ── Water ──────────────────────────────────────────────────────────────────

  private buildWater(): void {
    const geo = new THREE.PlaneGeometry(140, 80, 45, 28);
    geo.rotateX(-Math.PI / 2);

    this.waterUni = {
      uTime:    { value: 0 },
      uDeep:    { value: new THREE.Color(0x00091c) },
      uShallow: { value: new THREE.Color(0x001e38) },
      uOpacity: { value: 0 },
    };

    const mat = new THREE.ShaderMaterial({
      vertexShader:   WATER_VERT,
      fragmentShader: WATER_FRAG,
      uniforms: this.waterUni,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.water = new THREE.Mesh(geo, mat);
    this.water.position.set(0, -0.5, -148); // at panorama, slightly below valley floor
    this.scene.add(this.water);
  }

  // ── Stars ──────────────────────────────────────────────────────────────────

  private buildStars(): void {
    const N = 900;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 200;
      arr[i * 3 + 1] = 20 + Math.random() * 30;
      arr[i * 3 + 2] = -220 + Math.random() * 340;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.starsMat = new THREE.PointsMaterial({
      color: 0xeeeeff, size: 0.14, sizeAttenuation: true,
      transparent: true, opacity: 0,
    });
    this.stars = new THREE.Points(geo, this.starsMat);
    this.scene.add(this.stars);
  }

  // ── Lighting ───────────────────────────────────────────────────────────────

  private buildLights(): void {
    const a0 = ATMS[0]!;

    // Ambient — fills shadows gently
    this.ambient = new THREE.AmbientLight(a0.ambientColor, a0.ambientInt);
    this.scene.add(this.ambient);

    // Moon — directional from high above-behind, gives terrain shape/shadow
    this.moon = new THREE.DirectionalLight(a0.moonColor, a0.moonInt);
    this.moon.position.set(0, 40, 60); // above and behind camera start
    this.scene.add(this.moon);

    // Beacon — point light traveling ~30 units ahead in the valley
    // decay=0: linear with distance, no inverse-square falloff
    this.beacon = new THREE.PointLight(a0.beaconColor, a0.beaconInt, 75, 0);
    this.scene.add(this.beacon);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  setSize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  setScroll(progress: number): void {
    this.targetScroll = Math.max(0, Math.min(1, progress));
  }

  onMouseMove(x: number, y: number): void {
    this.targetMouse.set(
      (x / window.innerWidth)  * 2 - 1,
      -((y / window.innerHeight) * 2 - 1),
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  private render(): void {
    const delta   = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Smooth scroll and mouse
    this.scrollProgress += (this.targetScroll - this.scrollProgress) * (1 - Math.exp(-delta * 3.5));
    this.mouse.lerp(this.targetMouse, 0.04);

    // Camera
    this.positionCamera(this.scrollProgress);

    // Atmosphere
    const atm = lerpAtm(this.scrollProgress);

    this.fog.color.copy(atm.skyColor);
    this.fog.density = atm.fogDensity;
    this.renderer.setClearColor(atm.skyColor, 1);

    this.ambient.color.copy(atm.ambientColor);
    this.ambient.intensity = atm.ambientInt;

    this.moon.color.copy(atm.moonColor);
    this.moon.intensity = atm.moonInt;

    // Beacon drifts slowly ahead — the "light wandering in the valley"
    const beaconT = Math.min(this.scrollProgress + 0.035, 1);
    const bp = this.camPath.getPoint(beaconT);
    bp.x += Math.sin(elapsed * 0.17) * 2.0 + this.mouse.x * 1.5;
    bp.y += 1.8 + Math.sin(elapsed * 0.13) * 0.5;
    this.beacon.position.copy(bp);
    this.beacon.color.copy(atm.beaconColor);
    this.beacon.intensity = atm.beaconInt;

    // Stars
    this.starsMat.opacity = atm.stars;

    // Water
    (this.waterUni['uOpacity'] as THREE.IUniform).value = atm.water;
    (this.waterUni['uTime']    as THREE.IUniform).value = elapsed;

    this.renderer.render(this.scene, this.camera);
  }

  start(): void {
    const loop = (): void => {
      this.animId = requestAnimationFrame(loop);
      this.render();
    };
    loop();
  }

  dispose(): void {
    cancelAnimationFrame(this.animId);
    this.renderer.dispose();
    this.scene.clear();
  }
}
