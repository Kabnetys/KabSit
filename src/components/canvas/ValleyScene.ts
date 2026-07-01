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

function fbm(x: number, y: number, octaves = 5): number {
  let v = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    v += amp * valueNoise(x * freq, y * freq);
    freq *= 2.1; amp *= 0.45;
  }
  return v; // 0..~1
}

// ─── Terrain displacement ────────────────────────────────────────────────────
// Camera path: z from +95 (hero) to -145 (contact), t = (95 - z) / 240

function terrainY(x: number, z: number): number {
  const t = Math.max(0, Math.min(1, (95 - z) / 240));

  // Valley progressively opens into panorama at the end
  const openFactor = Math.max(0, (t - 0.72) / 0.28);
  const valleyHalf = 13 + openFactor * 38;

  // Terrain noise — smoother at panorama opening
  const noiseAmp = 3.8 * (1 - openFactor * 0.75);
  const n = fbm(x * 0.1, z * 0.05) * 2 - 1; // -1..+1
  const noiseVal = n * noiseAmp;

  // Valley walls
  const dist = Math.max(0, Math.abs(x) - valleyHalf);
  const wall = Math.pow(dist * 0.14, 1.5) * 9;

  // Floor dips at panorama end — reveals the water
  const dip = openFactor > 0.25 ? -(openFactor - 0.25) * 5.5 : 0;

  // Baseline offset to keep camera (Y=2.5) above floor
  return noiseVal + wall + dip - 1.2;
}

// ─── Atmosphere per section ──────────────────────────────────────────────────

interface Atm {
  p: number;
  fog: THREE.Color;
  beam: THREE.Color;
  beamI: number;
  ambient: THREE.Color;
  stars: number;   // opacity
  water: number;   // opacity
  fogDensity: number;
}

const ATMS: Atm[] = [
  // Hero — mystical indigo dawn, dense mist
  { p: 0.00, fog: new THREE.Color(0x06041c), beam: new THREE.Color(0x7744cc), beamI: 1.6, ambient: new THREE.Color(0x120920), stars: 0,   water: 0,   fogDensity: 0.018 },
  // Pain — heavy charcoal-purple, oppressive
  { p: 0.18, fog: new THREE.Color(0x07050e), beam: new THREE.Color(0x2d1550), beamI: 0.7, ambient: new THREE.Color(0x0e0818), stars: 0,   water: 0,   fogDensity: 0.025 },
  // Services — teal-cyan, valley opens
  { p: 0.36, fog: new THREE.Color(0x011422), beam: new THREE.Color(0x0099bb), beamI: 2.4, ambient: new THREE.Color(0x041c2a), stars: 0,   water: 0,   fogDensity: 0.012 },
  // AI — deep space, electric blue, stars appear
  { p: 0.55, fog: new THREE.Color(0x000209), beam: new THREE.Color(0x0044ee), beamI: 3.2, ambient: new THREE.Color(0x000616), stars: 0.85, water: 0,   fogDensity: 0.008 },
  // Team — soft ivory warmth (NOT orange/red)
  { p: 0.72, fog: new THREE.Color(0x0a080e), beam: new THREE.Color(0xd4c8e0), beamI: 1.3, ambient: new THREE.Color(0x16121c), stars: 0.3, water: 0,   fogDensity: 0.014 },
  // Contact approach — night, stars full, water emerges
  { p: 0.87, fog: new THREE.Color(0x010209), beam: new THREE.Color(0xb0b8d8), beamI: 1.9, ambient: new THREE.Color(0x080a12), stars: 1.0, water: 0.55, fogDensity: 0.007 },
  // Contact full — clear night, water fully visible
  { p: 1.00, fog: new THREE.Color(0x000005), beam: new THREE.Color(0xffffff), beamI: 2.6, ambient: new THREE.Color(0x0a0a14), stars: 1.0, water: 0.82, fogDensity: 0.006 },
];

function lerpAtm(progress: number): Atm {
  const p = Math.max(0, Math.min(1, progress));
  for (let i = 0; i < ATMS.length - 1; i++) {
    const a = ATMS[i]!, b = ATMS[i + 1]!;
    if (p >= a.p && p <= b.p) {
      const t = (p - a.p) / (b.p - a.p);
      return {
        p,
        fog:       a.fog.clone().lerp(b.fog, t),
        beam:      a.beam.clone().lerp(b.beam, t),
        beamI:     a.beamI + (b.beamI - a.beamI) * t,
        ambient:   a.ambient.clone().lerp(b.ambient, t),
        stars:     a.stars + (b.stars - a.stars) * t,
        water:     a.water + (b.water - a.water) * t,
        fogDensity: a.fogDensity + (b.fogDensity - a.fogDensity) * t,
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
    float w = sin(pos.x * 0.18 + uTime * 0.38) * 0.055
            + cos(pos.z * 0.13 + uTime * 0.27) * 0.048
            + sin((pos.x + pos.z) * 0.09 + uTime * 0.22) * 0.035;
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
    float ex = smoothstep(0.0, 0.09, vUv.x) * smoothstep(1.0, 0.91, vUv.x);
    float ey = smoothstep(0.0, 0.06, vUv.y) * smoothstep(1.0, 0.94, vUv.y);
    gl_FragColor = vec4(col, uOpacity * ex * ey);
  }
`;

// ─── Main class ──────────────────────────────────────────────────────────────

export class ValleyScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private fog: THREE.FogExp2;

  // Geometry
  private terrain!: THREE.Mesh;
  private waterMesh!: THREE.Mesh;
  private waterUniforms: Record<string, THREE.IUniform>;
  private starsMesh!: THREE.Points;
  private starsMat!: THREE.PointsMaterial;

  // Lighting
  private ambientLight!: THREE.AmbientLight;
  private beaconLight!: THREE.PointLight;
  private fillLight!: THREE.DirectionalLight;

  // Camera path
  private camPath!: THREE.CatmullRomCurve3;

  // State
  private scrollProgress = 0;
  private targetScroll = 0;
  private mouse = new THREE.Vector2(0, 0);
  private targetMouse = new THREE.Vector2(0, 0);
  private animId = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, canvas.width / canvas.height, 0.1, 500);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;

    this.fog = new THREE.FogExp2(ATMS[0]!.fog.getHex(), ATMS[0]!.fogDensity);
    this.scene.fog = this.fog;
    this.renderer.setClearColor(ATMS[0]!.fog, 1);

    this.clock = new THREE.Clock();
    this.waterUniforms = {};

    this.buildCameraPath();
    this.buildTerrain();
    this.buildWater();
    this.buildStars();
    this.buildLighting();

    // Initialize camera at start of path
    this.updateCameraFromScroll(0);
  }

  // ── Camera path ────────────────────────────────────────────────────────────

  private buildCameraPath(): void {
    this.camPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3( 0.0, 2.5,  95),   // Hero: valley entrance
      new THREE.Vector3(-2.0, 2.5,  55),   // Pain: slight left
      new THREE.Vector3( 1.5, 2.5,  12),   // Services: valley bends
      new THREE.Vector3( 0.0, 2.8, -28),   // AI: deeper
      new THREE.Vector3( 1.8, 2.6, -68),   // Team: gentle right
      new THREE.Vector3( 0.5, 3.5, -108),  // Method: approaching opening
      new THREE.Vector3( 0.0, 5.2, -145),  // Contact: elevated panorama
    ], false, 'catmullrom', 0.5);
  }

  private updateCameraFromScroll(progress: number): void {
    const camPos = this.camPath.getPoint(progress);
    this.camera.position.copy(camPos);

    // Look ahead + mouse offset
    const aheadT = Math.min(progress + 0.025, 1);
    const lookTarget = this.camPath.getPoint(aheadT);
    lookTarget.x += this.mouse.x * 3.5;
    lookTarget.y += this.mouse.y * 2.0;
    this.camera.lookAt(lookTarget);
  }

  // ── Terrain ────────────────────────────────────────────────────────────────

  private buildTerrain(): void {
    // Wide (X:±100) and long (Z: -200 to +110) plane
    const geo = new THREE.PlaneGeometry(200, 310, 110, 170);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, terrainY(x, z));
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x0d0d1a),
      roughness: 0.92,
      metalness: 0.08,
      fog: true,
    });

    this.terrain = new THREE.Mesh(geo, mat);
    this.terrain.position.set(0, 0, -45); // center the plane along camera path
    this.scene.add(this.terrain);
  }

  // ── Water ──────────────────────────────────────────────────────────────────

  private buildWater(): void {
    const geo = new THREE.PlaneGeometry(130, 90, 40, 28);
    geo.rotateX(-Math.PI / 2);

    this.waterUniforms = {
      uTime:    { value: 0 },
      uDeep:    { value: new THREE.Color(0x00091a) },
      uShallow: { value: new THREE.Color(0x001e3a) },
      uOpacity: { value: 0 },
    };

    const mat = new THREE.ShaderMaterial({
      vertexShader:   WATER_VERT,
      fragmentShader: WATER_FRAG,
      uniforms: this.waterUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.waterMesh = new THREE.Mesh(geo, mat);
    // Position at panorama end, below the opened valley
    this.waterMesh.position.set(0, -0.6, -150);
    this.scene.add(this.waterMesh);
  }

  // ── Stars ──────────────────────────────────────────────────────────────────

  private buildStars(): void {
    const count = 900;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 180;
      arr[i * 3 + 1] = 18 + Math.random() * 28;
      arr[i * 3 + 2] = -220 + Math.random() * 330;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));

    this.starsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.12,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
    });

    this.starsMesh = new THREE.Points(geo, this.starsMat);
    this.scene.add(this.starsMesh);
  }

  // ── Lighting ───────────────────────────────────────────────────────────────

  private buildLighting(): void {
    this.ambientLight = new THREE.AmbientLight(ATMS[0]!.ambient, 0.8);
    this.scene.add(this.ambientLight);

    // The beacon — moves ahead of camera
    this.beaconLight = new THREE.PointLight(ATMS[0]!.beam.getHex(), ATMS[0]!.beamI, 80, 1.2);
    this.scene.add(this.beaconLight);

    // Very subtle fill from above
    this.fillLight = new THREE.DirectionalLight(0x111122, 0.15);
    this.fillLight.position.set(0, 20, 0);
    this.scene.add(this.fillLight);
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

  // ── Render loop ────────────────────────────────────────────────────────────

  private render(): void {
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Smooth scroll & mouse
    const scrollDamp = 1 - Math.exp(-delta * 3.5);
    this.scrollProgress += (this.targetScroll - this.scrollProgress) * scrollDamp;
    this.mouse.lerp(this.targetMouse, 0.04);

    // Camera
    this.updateCameraFromScroll(this.scrollProgress);

    // Atmosphere interpolation
    const atm = lerpAtm(this.scrollProgress);

    // Fog
    this.fog.color.copy(atm.fog);
    this.fog.density = atm.fogDensity;
    this.renderer.setClearColor(atm.fog, 1);

    // Ambient light
    this.ambientLight.color.copy(atm.ambient);

    // Beacon light — position ahead of camera on path
    const beaconT = Math.min(this.scrollProgress + 0.04, 1);
    const beaconPos = this.camPath.getPoint(beaconT);
    // Add slow gentle side-drift for the "light wandering through valley" feel
    beaconPos.x += Math.sin(elapsed * 0.18) * 1.8 + this.mouse.x * 1.2;
    beaconPos.y += 2.5 + Math.cos(elapsed * 0.14) * 0.4;
    this.beaconLight.position.copy(beaconPos);
    this.beaconLight.color.copy(atm.beam);
    this.beaconLight.intensity = atm.beamI;

    // Stars
    this.starsMat.opacity = atm.stars;

    // Water
    (this.waterUniforms['uOpacity'] as THREE.IUniform).value = atm.water;
    (this.waterUniforms['uTime'] as THREE.IUniform).value = elapsed;

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
