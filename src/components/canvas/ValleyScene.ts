import * as THREE from 'three';

// ─── Noise ───────────────────────────────────────────────────────────────────

function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function vnoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx*fx*(3-2*fx), uy = fy*fy*(3-2*fy);
  return hash2(ix,iy) + (hash2(ix+1,iy)-hash2(ix,iy))*ux
       + (hash2(ix,iy+1)-hash2(ix,iy))*uy
       + (hash2(ix+1,iy+1)-hash2(ix+1,iy)-hash2(ix,iy+1)+hash2(ix,iy))*ux*uy;
}
function fbm(x: number, y: number, oct = 6): number {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += a*vnoise(x*f, y*f); f *= 2.1; a *= 0.44; }
  return v;
}

// ─── Terrain shape ───────────────────────────────────────────────────────────
// Camera descends from Y=38 → Y=8. Valley clearly visible from above first.
// World Z: camera travels +95 (hero) → -110 (panorama). t = (95-z)/205

function terrainH(wx: number, wz: number): number {
  const t = Math.max(0, Math.min(1, (95 - wz) / 205));

  // Valley opens at panorama end
  const open   = Math.max(0, (t - 0.70) / 0.30);
  const vHalf  = 22 + open * 55; // half-width: 22 → 77

  // Multi-octave noise for rocky, detailed terrain
  const n1 = fbm(wx * 0.09,  wz * 0.045) * 2 - 1;  // large features  ±1
  const n2 = fbm(wx * 0.28,  wz * 0.18,  4) * 2 - 1; // medium cracks  ±1
  const n3 = fbm(wx * 0.70,  wz * 0.55,  3) * 2 - 1; // fine detail    ±1
  const combined = n1 * 1.0 + n2 * 0.35 + n3 * 0.12; // weighted

  // Smooth valley cross-section: floor at ~-8, walls rise to ~20+
  const normDist = Math.abs(wx) / vHalf;
  const valleyBase = Math.pow(normDist, 1.9) * 28 - 8;

  // Rocky irregularity — more on steep walls, less in open panorama
  const rocky = (5.5 + Math.max(0, normDist - 0.6) * 8) * (1 - open * 0.65);
  return valleyBase + combined * rocky;
}

// ─── Vertex coloring by slope + height ───────────────────────────────────────
// Called AFTER computeVertexNormals() so normals are available.

function terrainCol(wx: number, wz: number, wy: number, ny: number): [number, number, number] {
  const slope   = 1 - Math.abs(ny);         // 0=flat, 1=vertical cliff
  const noiseC  = fbm(wx*0.30+7.1, wz*0.22+3.3) - 0.5; // ±0.5 color jitter
  const strata  = Math.sin(wy * 1.5 + fbm(wx*0.12, wz*0.08)*3) * 0.5 + 0.5; // rock banding 0..1

  // --- Rock face (steep slopes) ---
  const rockDark  : [number,number,number] = [0.110+noiseC*0.06, 0.098+noiseC*0.05, 0.125+noiseC*0.07];
  const rockLight : [number,number,number] = [0.165+noiseC*0.06, 0.148+noiseC*0.05, 0.178+noiseC*0.07];
  const rockCol   : [number,number,number] = lerp3(rockDark, rockLight, strata * 0.7);

  // --- Vegetation (flat surfaces, low altitude) ---
  const mossDark : [number,number,number] = [0.055+noiseC*0.04, 0.105+noiseC*0.06, 0.022+noiseC*0.03];
  const mossLight: [number,number,number] = [0.080+noiseC*0.04, 0.155+noiseC*0.08, 0.035+noiseC*0.03];
  const vegCol   : [number,number,number] = lerp3(mossDark, mossLight, Math.max(0, 1-(wy+2)*0.15));

  // Blend rock vs vegetation by slope
  const slopeFactor = smoothstep(0.25, 0.65, slope);
  const base = lerp3(vegCol, rockCol, slopeFactor);

  // Very high peaks → lighter dry rock
  if (wy > 12) {
    const peakFactor = Math.min(1, (wy - 12) / 8);
    const peakCol: [number,number,number] = [0.20+noiseC*0.05, 0.185+noiseC*0.04, 0.215+noiseC*0.06];
    return lerp3(base, peakCol, peakFactor);
  }
  return base;
}

function lerp3(a: [number,number,number], b: [number,number,number], t: number): [number,number,number] {
  return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
}
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x-edge0)/(edge1-edge0)));
  return t*t*(3-2*t);
}

// ─── Atmospheres ─────────────────────────────────────────────────────────────

interface Atm { p:number; sky:THREE.Color; fd:number; moonC:THREE.Color; moonI:number; ambC:THREE.Color; ambI:number; beaC:THREE.Color; beaI:number; stars:number; water:number; }
const C = (h:number) => new THREE.Color(h);

const ATMS: Atm[] = [
  { p:0.00, sky:C(0x07061e), fd:0.0060, moonC:C(0x5544aa), moonI:0.70, ambC:C(0x1a1040), ambI:0.90, beaC:C(0x8866dd), beaI:22, stars:0.0, water:0.0 },
  { p:0.18, sky:C(0x08060f), fd:0.0100, moonC:C(0x221133), moonI:0.32, ambC:C(0x100820), ambI:0.65, beaC:C(0x3a1866), beaI:14, stars:0.0, water:0.0 },
  { p:0.36, sky:C(0x011422), fd:0.0050, moonC:C(0x224466), moonI:0.80, ambC:C(0x0a2030), ambI:1.00, beaC:C(0x00aacc), beaI:26, stars:0.0, water:0.0 },
  { p:0.55, sky:C(0x000208), fd:0.0035, moonC:C(0x112244), moonI:0.50, ambC:C(0x040a1a), ambI:0.80, beaC:C(0x0044ff), beaI:32, stars:0.90, water:0.0 },
  { p:0.72, sky:C(0x0c0a10), fd:0.0070, moonC:C(0x332244), moonI:0.58, ambC:C(0x1a1422), ambI:0.85, beaC:C(0xd0c4e8), beaI:20, stars:0.30, water:0.0 },
  { p:0.86, sky:C(0x010209), fd:0.0030, moonC:C(0x223355), moonI:0.70, ambC:C(0x0a0c18), ambI:0.90, beaC:C(0xb8c0e0), beaI:24, stars:1.00, water:0.45 },
  { p:1.00, sky:C(0x000005), fd:0.0020, moonC:C(0x334466), moonI:0.80, ambC:C(0x0c0e1a), ambI:0.95, beaC:C(0xffffff), beaI:28, stars:1.00, water:0.82 },
];

function lerpAtm(p: number): Atm {
  p = Math.max(0, Math.min(1, p));
  for (let i = 0; i < ATMS.length-1; i++) {
    const a = ATMS[i]!, b = ATMS[i+1]!;
    if (p >= a.p && p <= b.p) {
      const t = (p-a.p)/(b.p-a.p);
      return { p, sky:a.sky.clone().lerp(b.sky,t), fd:a.fd+(b.fd-a.fd)*t,
        moonC:a.moonC.clone().lerp(b.moonC,t), moonI:a.moonI+(b.moonI-a.moonI)*t,
        ambC:a.ambC.clone().lerp(b.ambC,t),   ambI:a.ambI+(b.ambI-a.ambI)*t,
        beaC:a.beaC.clone().lerp(b.beaC,t),   beaI:a.beaI+(b.beaI-a.beaI)*t,
        stars:a.stars+(b.stars-a.stars)*t, water:a.water+(b.water-a.water)*t };
    }
  }
  return { ...ATMS[ATMS.length-1]! };
}

// ─── Water shaders ───────────────────────────────────────────────────────────

const WATER_VERT = /* glsl */`
  uniform float uTime;
  varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float w = sin(pos.x*0.14+uTime*0.32)*0.060
            + cos(pos.z*0.11+uTime*0.25)*0.048
            + sin((pos.x+pos.z)*0.08+uTime*0.18)*0.035
            + cos((pos.x-pos.z)*0.06+uTime*0.22)*0.028;
    pos.y += w;
    float eps = 0.8;
    float w2 = sin((pos.x+eps)*0.14+uTime*0.32)*0.060+cos(pos.z*0.11+uTime*0.25)*0.048;
    float w3 = sin(pos.x*0.14+uTime*0.32)*0.060+cos((pos.z+eps)*0.11+uTime*0.25)*0.048;
    vNormal = normalize(vec3(-(w2-w)/eps, 1.0, -(w3-w)/eps));
    vec4 wp = modelMatrix * vec4(pos, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const WATER_FRAG = /* glsl */`
  uniform vec3 uDeep,uShallow,uSpec; uniform float uOpacity;
  uniform vec3 uCamPos,uBeaPos; uniform float uTime;
  varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorldPos;
  void main() {
    float d = clamp(dot(vNormal,vec3(0,1,0)),0.0,1.0);
    vec3 col = mix(uDeep, uShallow, d*0.65);
    vec3 vd = normalize(uCamPos-vWorldPos);
    vec3 ld = normalize(uBeaPos-vWorldPos);
    float spec = pow(max(dot(vNormal,normalize(vd+ld)),0.0),90.0);
    col += uSpec*spec*0.60;
    float caus = sin(vUv.x*38.0+uTime*0.9)*sin(vUv.y*30.0+uTime*0.7);
    col += uShallow*max(0.0,caus)*0.055;
    float ex = smoothstep(0.0,0.09,vUv.x)*smoothstep(1.0,0.91,vUv.x);
    float ey = smoothstep(0.0,0.07,vUv.y)*smoothstep(1.0,0.93,vUv.y);
    gl_FragColor = vec4(col, uOpacity*ex*ey);
  }
`;

// ─── Main class ──────────────────────────────────────────────────────────────

export class ValleyScene {
  private scene:    THREE.Scene;
  private camera:   THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock:    THREE.Clock;
  private fog:      THREE.FogExp2;

  private terrain!:  THREE.Mesh;
  private water!:    THREE.Mesh;
  private wUni:      Record<string,THREE.IUniform> = {};
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
    // 72° FOV — comfortable wide view for landscape
    this.camera   = new THREE.PerspectiveCamera(72, canvas.width/canvas.height, 0.5, 800);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const a0 = ATMS[0]!;
    this.fog = new THREE.FogExp2(a0.sky.getHex(), a0.fd);
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
  // Starts HIGH (Y=38) looking DOWN at the valley landscape.
  // Descends progressively into the valley as you scroll.

  private buildPath(): void {
    this.camPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(  0, 38,  95),  // Hero: bird's eye, sees full valley
      new THREE.Vector3( -3, 24,  62),  // Pain: descending, valley walls appear
      new THREE.Vector3(  2, 14,  28),  // Services: entering valley airspace
      new THREE.Vector3(  0,  9,  -8),  // AI: inside the valley
      new THREE.Vector3(  2,  8, -50),  // Team: traveling through
      new THREE.Vector3(0.5, 9.5,-88),  // Method: approaching panorama
      new THREE.Vector3(  0, 13,-110),  // Contact: elevated, looking at lake
    ], false, 'catmullrom', 0.5);
  }

  private positionCamera(t: number): void {
    const pos = this.camPath.getPoint(t);
    this.camera.position.copy(pos);

    // Tangent-based forward look
    const tang = this.camPath.getTangent(Math.min(t, 0.998));
    let target  = pos.clone().addScaledVector(tang, 12);

    // At panorama end: blend gaze down toward the lake
    const pano = Math.max(0, (t - 0.84) / 0.16);
    if (pano > 0) {
      const lakeLook = new THREE.Vector3(
        pos.x + this.mouse.x * 3, -0.5, -125
      );
      target = target.clone().lerp(lakeLook, pano);
    }

    target.x += this.mouse.x * 5.0 * (1 - pano * 0.8);
    target.y += this.mouse.y * 3.0 * (1 - pano * 0.6);
    this.camera.lookAt(target);
  }

  // ── Terrain ────────────────────────────────────────────────────────────────

  private buildTerrain(): void {
    const geo = new THREE.PlaneGeometry(240, 370, 140, 210);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes['position'] as THREE.BufferAttribute;

    // Pass 1: height displacement
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, terrainH(pos.getX(i), pos.getZ(i)));
    }

    // Pass 2: compute normals (needed for slope-based coloring)
    geo.computeVertexNormals();

    // Pass 3: vertex colors from slope + height
    const nrm = geo.attributes['normal'] as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const [r,g,b] = terrainCol(pos.getX(i), pos.getZ(i), pos.getY(i), nrm.getY(i));
      col[i*3]=r; col[i*3+1]=g; col[i*3+2]=b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness:0.88, metalness:0.06, fog:true,
    });
    this.terrain = new THREE.Mesh(geo, mat);
    this.scene.add(this.terrain);
  }

  // ── Water ──────────────────────────────────────────────────────────────────

  private buildWater(): void {
    const geo = new THREE.PlaneGeometry(170, 95, 55, 35);
    geo.rotateX(-Math.PI / 2);
    this.wUni = {
      uTime:{value:0}, uDeep:{value:new THREE.Color(0x000c1e)},
      uShallow:{value:new THREE.Color(0x001e38)}, uSpec:{value:new THREE.Color(0x5588bb)},
      uOpacity:{value:0}, uCamPos:{value:new THREE.Vector3()},
      uBeaPos:{value:new THREE.Vector3()},
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader:WATER_VERT, fragmentShader:WATER_FRAG,
      uniforms:this.wUni, transparent:true, depthWrite:false, side:THREE.DoubleSide,
    });
    this.water = new THREE.Mesh(geo, mat);
    this.water.position.set(0, -0.5, -125);
    this.scene.add(this.water);
  }

  // ── Stars ──────────────────────────────────────────────────────────────────

  private buildStars(): void {
    const N = 1200, arr = new Float32Array(N*3);
    for (let i=0;i<N;i++) {
      arr[i*3]=(Math.random()-.5)*260; arr[i*3+1]=24+Math.random()*38; arr[i*3+2]=-280+Math.random()*400;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.starsMat = new THREE.PointsMaterial({ color:0xeeeeff, size:0.18, sizeAttenuation:true, transparent:true, opacity:0 });
    this.stars = new THREE.Points(geo, this.starsMat);
    this.scene.add(this.stars);
  }

  // ── Lights ────────────────────────────────────────────────────────────────

  private buildLights(): void {
    const a0 = ATMS[0]!;
    this.ambient = new THREE.AmbientLight(a0.ambC, a0.ambI);
    this.scene.add(this.ambient);

    // Moon: from high above + side — gives cliff faces clear highlight/shadow
    this.moon = new THREE.DirectionalLight(a0.moonC, a0.moonI);
    this.moon.position.set(15, 50, 40);
    this.scene.add(this.moon);

    // Beacon: the traveling light — no inverse-square decay
    this.beacon = new THREE.PointLight(a0.beaC, a0.beaI, 90, 0);
    this.scene.add(this.beacon);
  }

  // ── API ───────────────────────────────────────────────────────────────────

  setSize(w:number, h:number): void {
    this.camera.aspect = w/h; this.camera.updateProjectionMatrix();
    this.renderer.setSize(w,h,false);
  }
  setScroll(p:number): void { this.tScroll = Math.max(0,Math.min(1,p)); }
  onMouseMove(x:number, y:number): void {
    this.tMouse.set((x/window.innerWidth)*2-1, -((y/window.innerHeight)*2-1));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  private render(): void {
    const delta = this.clock.getDelta(), elapsed = this.clock.getElapsedTime();
    this.scroll += (this.tScroll - this.scroll) * (1 - Math.exp(-delta*3.5));
    this.mouse.lerp(this.tMouse, 0.04);

    this.positionCamera(this.scroll);
    const atm = lerpAtm(this.scroll);

    this.fog.color.copy(atm.sky); this.fog.density = atm.fd;
    this.renderer.setClearColor(atm.sky, 1);
    this.ambient.color.copy(atm.ambC); this.ambient.intensity = atm.ambI;
    this.moon.color.copy(atm.moonC);   this.moon.intensity    = atm.moonI;

    // Beacon — drifts gently ahead
    const bT = Math.min(this.scroll + 0.04, 0.998);
    const bp = this.camPath.getPoint(bT);
    bp.x += Math.sin(elapsed*0.16)*2.5 + this.mouse.x*1.8;
    bp.y += 2.0 + Math.sin(elapsed*0.11)*0.7;
    this.beacon.position.copy(bp);
    this.beacon.color.copy(atm.beaC); this.beacon.intensity = atm.beaI;

    this.starsMat.opacity = atm.stars;

    (this.wUni['uOpacity'] as THREE.IUniform).value = atm.water;
    (this.wUni['uTime']    as THREE.IUniform).value = elapsed;
    (this.wUni['uCamPos']  as THREE.IUniform).value.copy(this.camera.position);
    (this.wUni['uBeaPos']  as THREE.IUniform).value.copy(bp);

    this.renderer.render(this.scene, this.camera);
  }

  start(): void { const l=():void=>{this.animId=requestAnimationFrame(l);this.render();};l(); }
  dispose(): void { cancelAnimationFrame(this.animId); this.renderer.dispose(); this.scene.clear(); }
}
