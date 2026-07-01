import * as THREE from 'three';

// ─── Noise ───────────────────────────────────────────────────────────────────

function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const v00 = hash2(ix, iy), v10 = hash2(ix+1, iy);
  const v01 = hash2(ix, iy+1), v11 = hash2(ix+1, iy+1);
  return v00 + (v10-v00)*ux + (v01-v00)*uy + (v11-v10-v01+v00)*ux*uy;
}
function fbm(x: number, y: number, oct = 5): number {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += a * valueNoise(x*f, y*f); f *= 2.1; a *= 0.45; }
  return v; // ~0..1
}

// ─── Terrain height + vertex color ──────────────────────────────────────────
// Camera Z path: +85 (hero) → -110 (panorama). t = (85-z)/195 clamped 0..1

function terrainHeight(wx: number, wz: number): number {
  const t = Math.max(0, Math.min(1, (85 - wz) / 195));

  // Valley opens progressively into panorama
  const open = Math.max(0, (t - 0.68) / 0.32);
  const half = 22 + open * 55; // 22 → 77 units half-width

  // Terrain noise (less noisy in panorama for calm lake basin)
  const noiseAmp = 5.5 * (1 - open * 0.8);
  const n = fbm(wx * 0.08, wz * 0.04) * 2 - 1;
  const noise = n * noiseAmp;

  // Valley walls (quadratic rise outside half-width)
  const dist = Math.max(0, Math.abs(wx) - half);
  const wall = Math.pow(dist * 0.10, 1.6) * 11;

  // Floor dips for the lake basin at panorama
  const dip = open > 0.15 ? -(open - 0.15) * 7.5 : 0;

  // Shift down so camera at Y≈5 is above the valley floor
  return noise + wall + dip - 2.5;
}

function terrainColor(wx: number, wz: number, y: number): [number, number, number] {
  const n = fbm(wx * 0.22 + 3.1, wz * 0.18 + 1.7); // independent noise for color
  const jitter = (n - 0.5) * 0.12;

  // Height zones — all dark but with visible hue variation
  if (y < -1.5) {
    // Deep rock / bare earth
    return [0.10 + jitter, 0.08 + jitter, 0.12 + jitter];
  } else if (y < 1.5) {
    // Valley floor — dark rich green (forest floor, moss)
    return [0.11 + jitter, 0.20 + jitter * 1.5, 0.06 + jitter * 0.5];
  } else if (y < 4.5) {
    // Low slope — dark green vegetation
    return [0.10 + jitter, 0.17 + jitter, 0.07 + jitter * 0.5];
  } else if (y < 8.0) {
    // Upper slope — olive/rocky green fading to grey
    return [0.13 + jitter, 0.16 + jitter * 0.8, 0.11 + jitter * 0.6];
  } else {
    // High ridges — grey-purple rock
    return [0.16 + jitter, 0.14 + jitter * 0.7, 0.18 + jitter * 0.8];
  }
}

// ─── Atmosphere stops ────────────────────────────────────────────────────────

interface Atm {
  p: number;
  sky: THREE.Color; fogDensity: number;
  moonCol: THREE.Color; moonInt: number;
  ambCol: THREE.Color; ambInt: number;
  beaconCol: THREE.Color; beaconInt: number;
  stars: number; water: number;
}
const C = (h: number) => new THREE.Color(h);

const ATMS: Atm[] = [
  { p:0.00, sky:C(0x07061e), fogDensity:0.009,  moonCol:C(0x5544aa), moonInt:0.60, ambCol:C(0x1a1040), ambInt:0.85, beaconCol:C(0x8866dd), beaconInt:20, stars:0.0, water:0.0 },
  { p:0.18, sky:C(0x08060f), fogDensity:0.016,  moonCol:C(0x221133), moonInt:0.28, ambCol:C(0x100820), ambInt:0.60, beaconCol:C(0x3a1866), beaconInt:12, stars:0.0, water:0.0 },
  { p:0.36, sky:C(0x011422), fogDensity:0.007,  moonCol:C(0x224466), moonInt:0.75, ambCol:C(0x0a2030), ambInt:0.95, beaconCol:C(0x00aacc), beaconInt:24, stars:0.0, water:0.0 },
  { p:0.55, sky:C(0x000208), fogDensity:0.005,  moonCol:C(0x112244), moonInt:0.45, ambCol:C(0x040a1a), ambInt:0.75, beaconCol:C(0x0044ff), beaconInt:30, stars:0.90, water:0.0 },
  { p:0.72, sky:C(0x0c0a10), fogDensity:0.011,  moonCol:C(0x332244), moonInt:0.55, ambCol:C(0x1a1422), ambInt:0.80, beaconCol:C(0xd0c4e8), beaconInt:18, stars:0.30, water:0.0 },
  { p:0.86, sky:C(0x010209), fogDensity:0.0045, moonCol:C(0x223355), moonInt:0.65, ambCol:C(0x0a0c18), ambInt:0.85, beaconCol:C(0xb8c0e0), beaconInt:22, stars:1.00, water:0.40 },
  { p:1.00, sky:C(0x000005), fogDensity:0.0030, moonCol:C(0x334466), moonInt:0.75, ambCol:C(0x0c0e1a), ambInt:0.90, beaconCol:C(0xffffff), beaconInt:28, stars:1.00, water:0.80 },
];

function lerpAtm(p: number): Atm {
  p = Math.max(0, Math.min(1, p));
  for (let i = 0; i < ATMS.length - 1; i++) {
    const a = ATMS[i]!, b = ATMS[i+1]!;
    if (p >= a.p && p <= b.p) {
      const t = (p - a.p) / (b.p - a.p);
      return { p,
        sky:       a.sky.clone().lerp(b.sky, t),
        fogDensity:a.fogDensity + (b.fogDensity - a.fogDensity) * t,
        moonCol:   a.moonCol.clone().lerp(b.moonCol, t),
        moonInt:   a.moonInt   + (b.moonInt   - a.moonInt)   * t,
        ambCol:    a.ambCol.clone().lerp(b.ambCol, t),
        ambInt:    a.ambInt    + (b.ambInt    - a.ambInt)    * t,
        beaconCol: a.beaconCol.clone().lerp(b.beaconCol, t),
        beaconInt: a.beaconInt + (b.beaconInt - a.beaconInt) * t,
        stars:     a.stars     + (b.stars     - a.stars)     * t,
        water:     a.water     + (b.water     - a.water)     * t,
      };
    }
  }
  return { ...ATMS[ATMS.length - 1]! };
}

// ─── Water shaders ───────────────────────────────────────────────────────────

const WATER_VERT = /* glsl */`
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Gentle multi-layer wave
    float w = sin(pos.x * 0.14 + uTime * 0.32) * 0.060
            + cos(pos.z * 0.11 + uTime * 0.25) * 0.048
            + sin((pos.x * 0.7 + pos.z * 0.9) * 0.09 + uTime * 0.18) * 0.035
            + cos((pos.x - pos.z) * 0.06 + uTime * 0.22) * 0.028;
    pos.y += w;

    // Approximate normal from wave gradient
    float eps = 0.5;
    float wx2 = sin((pos.x+eps) * 0.14 + uTime * 0.32) * 0.060
              + cos(pos.z * 0.11 + uTime * 0.25) * 0.048;
    float wz2 = sin(pos.x * 0.14 + uTime * 0.32) * 0.060
              + cos((pos.z+eps) * 0.11 + uTime * 0.25) * 0.048;
    vNormal = normalize(vec3(-(wx2 - w)/eps, 1.0, -(wz2 - w)/eps));

    vec4 worldPos4 = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos4.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos4;
  }
`;

const WATER_FRAG = /* glsl */`
  uniform vec3  uDeep;
  uniform vec3  uShallow;
  uniform vec3  uSpecular;
  uniform float uOpacity;
  uniform vec3  uCameraPos;
  uniform vec3  uBeaconPos;
  uniform float uTime;
  varying vec2  vUv;
  varying vec3  vNormal;
  varying vec3  vWorldPos;

  void main() {
    // Base color — depth gradient
    float depth = clamp(dot(vNormal, vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
    vec3 col = mix(uDeep, uShallow, depth * 0.6);

    // Specular reflection of beacon on water
    vec3 viewDir   = normalize(uCameraPos - vWorldPos);
    vec3 lightDir  = normalize(uBeaconPos - vWorldPos);
    vec3 halfVec   = normalize(viewDir + lightDir);
    float spec     = pow(max(dot(vNormal, halfVec), 0.0), 80.0);
    col += uSpecular * spec * 0.55;

    // Subtle shimmer lines (horizon-style caustics)
    float caustic = sin(vUv.x * 35.0 + uTime * 0.8) * sin(vUv.y * 28.0 + uTime * 0.6);
    col += uShallow * max(0.0, caustic) * 0.06;

    // Edge fade
    float ex = smoothstep(0.0, 0.09, vUv.x) * smoothstep(1.0, 0.91, vUv.x);
    float ey = smoothstep(0.0, 0.07, vUv.y) * smoothstep(1.0, 0.93, vUv.y);

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

  private ambient!:  THREE.AmbientLight;
  private moon!:     THREE.DirectionalLight;
  private beacon!:   THREE.PointLight;

  private camPath!:  THREE.CatmullRomCurve3;

  private scrollProgress = 0;
  private targetScroll   = 0;
  private mouse          = new THREE.Vector2();
  private targetMouse    = new THREE.Vector2();
  private animId         = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.scene    = new THREE.Scene();
    // Wider FOV and raised near plane for comfortable depth perception
    this.camera   = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.5, 700);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const a0 = ATMS[0]!;
    this.fog = new THREE.FogExp2(a0.sky.getHex(), a0.fogDensity);
    this.scene.fog = this.fog;
    this.renderer.setClearColor(a0.sky, 1);

    this.clock = new THREE.Clock();

    this.buildPath();
    this.buildTerrain();
    this.buildWater();
    this.buildStars();
    this.buildLights();
    this.positionCamera(0);
  }

  // ── Camera path ────────────────────────────────────────────────────────────
  // Camera is elevated (Y 5–9) so you see the valley spread below, not a tube.
  // Last segment lowers gaze toward the water basin.

  private buildPath(): void {
    this.camPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(  0,  5.0,  85),  // Hero — elevated valley entrance
      new THREE.Vector3( -2,  5.0,  48),  // Pain — slight left
      new THREE.Vector3(  1,  5.2,  12),  // Services
      new THREE.Vector3(  0,  5.5, -24),  // AI
      new THREE.Vector3(  2,  5.2, -60),  // Team
      new THREE.Vector3(0.5,  6.5, -90),  // Method — panorama begins
      new THREE.Vector3(  0,  9.0, -110), // Contact — elevated, looking at lake
    ], false, 'catmullrom', 0.5);
  }

  private positionCamera(t: number): void {
    const pos = this.camPath.getPoint(t);
    this.camera.position.copy(pos);

    // Use path tangent so camera always looks forward along the valley
    const clampedT = Math.min(t, 0.998);
    const tangent  = this.camPath.getTangent(clampedT);
    let lookTarget = pos.clone().addScaledVector(tangent, 10);

    // At panorama end (t > 0.85) blend look toward the water surface
    const panoramaBlend = Math.max(0, (t - 0.85) / 0.15);
    if (panoramaBlend > 0) {
      const waterLook = new THREE.Vector3(
        pos.x + this.mouse.x * 4,
        -0.5,   // water Y
        -125,   // water Z
      );
      lookTarget = lookTarget.lerp(waterLook, panoramaBlend);
    }

    lookTarget.x += this.mouse.x * 4.0 * (1 - panoramaBlend);
    lookTarget.y += this.mouse.y * 2.5 * (1 - panoramaBlend * 0.6);
    this.camera.lookAt(lookTarget);
  }

  // ── Terrain ────────────────────────────────────────────────────────────────

  private buildTerrain(): void {
    // Plane at origin — vertex world coords = geometry coords
    const geo = new THREE.PlaneGeometry(220, 360, 130, 200);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes['position'] as THREE.BufferAttribute;
    const colArr = new Float32Array(pos.count * 3);

    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i);
      const wz = pos.getZ(i);
      const wy = terrainHeight(wx, wz);
      pos.setY(i, wy);

      const [r, g, b] = terrainColor(wx, wz, wy);
      colArr[i * 3]     = r;
      colArr[i * 3 + 1] = g;
      colArr[i * 3 + 2] = b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.04,
      fog: true,
    });

    this.terrain = new THREE.Mesh(geo, mat);
    this.scene.add(this.terrain);
  }

  // ── Water ──────────────────────────────────────────────────────────────────

  private buildWater(): void {
    const geo = new THREE.PlaneGeometry(160, 90, 50, 32);
    geo.rotateX(-Math.PI / 2);

    this.waterUni = {
      uTime:      { value: 0 },
      uDeep:      { value: new THREE.Color(0x000c1e) },
      uShallow:   { value: new THREE.Color(0x00243a) },
      uSpecular:  { value: new THREE.Color(0x6699cc) },
      uOpacity:   { value: 0 },
      uCameraPos: { value: new THREE.Vector3() },
      uBeaconPos: { value: new THREE.Vector3() },
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
    // Positioned in the lake basin at panorama end
    this.water.position.set(0, -0.5, -125);
    this.scene.add(this.water);
  }

  // ── Stars ──────────────────────────────────────────────────────────────────

  private buildStars(): void {
    const N = 1100;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      arr[i*3]   = (Math.random() - 0.5) * 240;
      arr[i*3+1] = 22 + Math.random() * 35;
      arr[i*3+2] = -260 + Math.random() * 380;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.starsMat = new THREE.PointsMaterial({
      color: 0xeeeeff, size: 0.16, sizeAttenuation: true,
      transparent: true, opacity: 0,
    });
    this.stars = new THREE.Points(geo, this.starsMat);
    this.scene.add(this.stars);
  }

  // ── Lighting ───────────────────────────────────────────────────────────────

  private buildLights(): void {
    const a0 = ATMS[0]!;

    this.ambient = new THREE.AmbientLight(a0.ambCol, a0.ambInt);
    this.scene.add(this.ambient);

    // Moon — primary terrain fill, from high above-behind
    this.moon = new THREE.DirectionalLight(a0.moonCol, a0.moonInt);
    this.moon.position.set(5, 40, 55);
    this.scene.add(this.moon);

    // Beacon — travels ahead with gentle side-drift
    // decay=0 → linear falloff within distance (no inverse-square)
    this.beacon = new THREE.PointLight(a0.beaconCol, a0.beaconInt, 85, 0);
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
      (x / window.innerWidth) * 2 - 1,
      -((y / window.innerHeight) * 2 - 1),
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  private render(): void {
    const delta   = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.scrollProgress += (this.targetScroll - this.scrollProgress) * (1 - Math.exp(-delta * 3.5));
    this.mouse.lerp(this.targetMouse, 0.04);

    this.positionCamera(this.scrollProgress);

    const atm = lerpAtm(this.scrollProgress);

    this.fog.color.copy(atm.sky);
    this.fog.density = atm.fogDensity;
    this.renderer.setClearColor(atm.sky, 1);

    this.ambient.color.copy(atm.ambCol);
    this.ambient.intensity = atm.ambInt;

    this.moon.color.copy(atm.moonCol);
    this.moon.intensity = atm.moonInt;

    // Beacon drifts ahead — the wandering light
    const bT = Math.min(this.scrollProgress + 0.038, 0.998);
    const bp = this.camPath.getPoint(bT);
    bp.x += Math.sin(elapsed * 0.16) * 2.2 + this.mouse.x * 1.5;
    bp.y += 1.5 + Math.sin(elapsed * 0.12) * 0.6;
    this.beacon.position.copy(bp);
    this.beacon.color.copy(atm.beaconCol);
    this.beacon.intensity = atm.beaconInt;

    this.starsMat.opacity = atm.stars;

    // Water
    (this.waterUni['uOpacity']   as THREE.IUniform).value = atm.water;
    (this.waterUni['uTime']      as THREE.IUniform).value = elapsed;
    (this.waterUni['uCameraPos'] as THREE.IUniform).value.copy(this.camera.position);
    (this.waterUni['uBeaconPos'] as THREE.IUniform).value.copy(bp);

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
