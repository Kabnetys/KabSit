import * as THREE from 'three';

// ─── CPU noise (terrain geometry) ────────────────────────────────────────────

function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function vnoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx*fx*(3-2*fx), uy = fy*fy*(3-2*fy);
  const v00 = hash2(ix,iy), v10 = hash2(ix+1,iy);
  const v01 = hash2(ix,iy+1), v11 = hash2(ix+1,iy+1);
  return v00+(v10-v00)*ux+(v01-v00)*uy+(v11-v10-v01+v00)*ux*uy;
}
function fbm(x: number, y: number, oct = 6): number {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += a*vnoise(x*f, y*f); f *= 2.1; a *= 0.44; }
  return v;
}

// ─── Terrain shape ───────────────────────────────────────────────────────────
// Camera: Z from +140 (aerial start) → -106 (panorama). t = (140-z)/246

function terrainH(wx: number, wz: number): number {
  const t    = Math.max(0, Math.min(1, (140 - wz) / 246));
  const open = Math.max(0, (t - 0.68) / 0.32);

  const vHalf = 24 + open * 58; // valley half-width: 24→82

  // 3-octave noise: large shapes + medium cracks + fine grain
  const n1 = (fbm(wx*0.07, wz*0.035) * 2 - 1);
  const n2 = (fbm(wx*0.22, wz*0.14,  4) * 2 - 1) * 0.30;
  const n3 = (fbm(wx*0.60, wz*0.45,  3) * 2 - 1) * 0.10;
  const n  = n1 + n2 + n3; // -1.4..+1.4

  // Valley cross-section: floor at ~-10, walls to ~22
  const nd   = Math.abs(wx) / vHalf;
  const base = Math.pow(nd, 1.85) * 32 - 10;

  const rocky = (6.5 + Math.max(0, nd - 0.5) * 9) * (1 - open * 0.70);
  const dip   = open > 0.12 ? -(open - 0.12) * 8.0 : 0;

  return base + n * rocky + dip;
}

// ─── GLSL granite shader injection ───────────────────────────────────────────
// Injected into MeshStandardMaterial via onBeforeCompile so PBR lighting is kept.

const GRANITE_GLSL = /* glsl */`
  // ── Noise utilities ──────────────────────────────────────────────────────
  float gHash(float n) { return fract(sin(n) * 43758.5453); }
  float gHash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float gNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    float a = gHash2(i),          b = gHash2(i+vec2(1,0));
    float c = gHash2(i+vec2(0,1)),d = gHash2(i+vec2(1,1));
    return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
  }
  float gFbm(vec2 p) {
    float v=0.0, a=0.5;
    for(int i=0;i<5;i++){v+=a*gNoise(p);p*=2.1;a*=0.45;}
    return v;
  }

  // ── Voronoi — gives granite crystalline grain ─────────────────────────────
  vec2 voronoiHash(vec2 p) {
    p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
    return fract(sin(p)*43758.5453);
  }
  // Returns (minDist, secondMinDist) for crack-like edges
  vec2 voronoi(vec2 p) {
    vec2 ip = floor(p), fp = fract(p);
    float md1 = 8.0, md2 = 8.0;
    for(int x=-2;x<=2;x++) for(int y=-2;y<=2;y++) {
      vec2 g   = vec2(float(x),float(y));
      vec2 rnd = voronoiHash(ip+g);
      float d  = length(g + rnd - fp);
      if(d<md1){md2=md1;md1=d;} else if(d<md2){md2=d;}
    }
    return vec2(md1, md2);
  }

  // ── Granite color — pure stone, no vegetation ─────────────────────────────
  // Palette: strictly neutral grey (feldspar / quartz / biotite).
  // Atmospheric color comes from fog only, not from the mesh texture.
  vec3 graniteColor(vec3 wp, float slope, float height) {
    vec2 uv  = wp.xz * 0.28;
    vec2 uv2 = wp.xz * 0.80;
    vec2 uv3 = wp.xz * 2.50;

    vec2 v1 = voronoi(uv  * 3.5);  // large feldspar crystals
    vec2 v2 = voronoi(uv2 * 5.0);  // medium quartz grains
    vec2 v3 = voronoi(uv3 * 8.0);  // fine biotite speckles

    float crack1 = smoothstep(0.04, 0.18, v1.y - v1.x);
    float crack2 = smoothstep(0.02, 0.12, v2.y - v2.x);

    // Neutral stone palette — cool grey only, no hue shift
    vec3 feldspar = vec3(0.42, 0.41, 0.43); // light grey
    vec3 quartz   = vec3(0.27, 0.26, 0.29); // medium grey
    vec3 biotite  = vec3(0.08, 0.07, 0.09); // near-black
    vec3 crackCol = vec3(0.03, 0.03, 0.04); // joint / crack fill

    float fGrain = smoothstep(0.30, 0.62, v1.x);
    float mGrain = smoothstep(0.20, 0.52, v2.x);
    float speck  = step(0.20, v3.x);

    vec3 col = mix(quartz, feldspar, fGrain * 0.85);
    col = mix(biotite, col, mGrain * 0.65 + 0.35);
    col *= (0.78 + speck * 0.30);

    // Crack darkening at crystal boundaries
    col = mix(crackCol, col, crack1 * crack2);

    // Large-scale brightness variation (surface exposure / shadow pockets)
    float macro = gFbm(uv * 0.38);
    col *= (0.76 + macro * 0.42);

    // Strata banding: horizontal rock layers (no color — only brightness)
    float strata = sin(height * 1.8 + gFbm(uv * 0.6) * 3.0) * 0.5 + 0.5;
    col *= (0.88 + strata * 0.18);

    return col;
  }
`;

// Patch injection points into Three.js MeshStandardMaterial shader
function applyGraniteShader(mat: THREE.MeshStandardMaterial): void {
  mat.onBeforeCompile = (shader) => {
    // Vertex: export world position
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      '#include <common>\nvarying vec3 vWorldPos;\nvarying vec3 vWorldNormal;',
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\nvWorldPos = (modelMatrix * vec4(position,1.0)).xyz;\nvWorldNormal = normalize(mat3(modelMatrix) * normal);',
    );
    // Fragment: add functions + override diffuse color
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>\nvarying vec3 vWorldPos;\nvarying vec3 vWorldNormal;\n${GRANITE_GLSL}`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `float gSlope = 1.0 - abs(vWorldNormal.y);
       diffuseColor.rgb = graniteColor(vWorldPos, gSlope, vWorldPos.y);`,
    );
  };
  // Ensure Three.js recompiles when needed
  mat.customProgramCacheKey = () => 'granite-v1';
}

// ─── Atmospheres ─────────────────────────────────────────────────────────────

interface Atm { p:number; sky:THREE.Color; fd:number; moonC:THREE.Color; moonI:number; ambC:THREE.Color; ambI:number; beaC:THREE.Color; beaI:number; stars:number; water:number; }
const C = (h:number) => new THREE.Color(h);

const ATMS: Atm[] = [
  { p:0.00, sky:C(0x08071f), fd:0.0045, moonC:C(0x5544aa), moonI:0.75, ambC:C(0x1a1040), ambI:0.95, beaC:C(0x8866dd), beaI:24, stars:0.0, water:0.0 },
  { p:0.18, sky:C(0x090710), fd:0.0090, moonC:C(0x221133), moonI:0.35, ambC:C(0x100820), ambI:0.70, beaC:C(0x3a1866), beaI:16, stars:0.0, water:0.0 },
  { p:0.36, sky:C(0x011422), fd:0.0040, moonC:C(0x224466), moonI:0.85, ambC:C(0x0a2030), ambI:1.00, beaC:C(0x00aacc), beaI:28, stars:0.0, water:0.0 },
  { p:0.55, sky:C(0x000208), fd:0.0025, moonC:C(0x112244), moonI:0.55, ambC:C(0x040a1a), ambI:0.85, beaC:C(0x0044ff), beaI:34, stars:0.90, water:0.0 },
  { p:0.72, sky:C(0x0c0a10), fd:0.0060, moonC:C(0x332244), moonI:0.60, ambC:C(0x1a1422), ambI:0.88, beaC:C(0xd0c4e8), beaI:22, stars:0.30, water:0.0 },
  { p:0.86, sky:C(0x010209), fd:0.0022, moonC:C(0x223355), moonI:0.72, ambC:C(0x0a0c18), ambI:0.92, beaC:C(0xb8c0e0), beaI:26, stars:1.00, water:0.45 },
  { p:1.00, sky:C(0x000005), fd:0.0015, moonC:C(0x334466), moonI:0.82, ambC:C(0x0c0e1a), ambI:0.96, beaC:C(0xffffff), beaI:30, stars:1.00, water:0.83 },
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
        stars:a.stars+(b.stars-a.stars)*t,     water:a.water+(b.water-a.water)*t };
    }
  }
  return { ...ATMS[ATMS.length-1]! };
}

// ─── Water shaders ───────────────────────────────────────────────────────────

const WATER_VERT = /* glsl */`
  uniform float uTime;
  varying vec2 vUv; varying vec3 vNorm; varying vec3 vWP;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float w = sin(pos.x*0.14+uTime*0.32)*0.06+cos(pos.z*0.11+uTime*0.25)*0.048
            + sin((pos.x+pos.z)*0.08+uTime*0.18)*0.035+cos((pos.x-pos.z)*0.06+uTime*0.22)*0.028;
    pos.y += w;
    float e=0.8;
    float w2=sin((pos.x+e)*0.14+uTime*0.32)*0.06+cos(pos.z*0.11+uTime*0.25)*0.048;
    float w3=sin(pos.x*0.14+uTime*0.32)*0.06+cos((pos.z+e)*0.11+uTime*0.25)*0.048;
    vNorm = normalize(vec3(-(w2-w)/e,1.0,-(w3-w)/e));
    vec4 wp4 = modelMatrix*vec4(pos,1.0); vWP=wp4.xyz;
    gl_Position = projectionMatrix*viewMatrix*wp4;
  }
`;
const WATER_FRAG = /* glsl */`
  uniform vec3 uDeep,uShallow,uSpec; uniform float uOpacity;
  uniform vec3 uCamPos,uBeaPos; uniform float uTime;
  varying vec2 vUv; varying vec3 vNorm; varying vec3 vWP;
  void main() {
    float d = clamp(dot(vNorm,vec3(0,1,0)),0.0,1.0);
    vec3 col = mix(uDeep,uShallow,d*0.65);
    vec3 vd=normalize(uCamPos-vWP), ld=normalize(uBeaPos-vWP);
    float spec=pow(max(dot(vNorm,normalize(vd+ld)),0.0),90.0);
    col += uSpec*spec*0.65;
    float caus=sin(vUv.x*38.0+uTime*0.9)*sin(vUv.y*30.0+uTime*0.7);
    col += uShallow*max(0.0,caus)*0.055;
    float ex=smoothstep(0.0,0.09,vUv.x)*smoothstep(1.0,0.91,vUv.x);
    float ey=smoothstep(0.0,0.07,vUv.y)*smoothstep(1.0,0.93,vUv.y);
    gl_FragColor = vec4(col, uOpacity*ex*ey);
  }
`;

// ─── ValleyScene ─────────────────────────────────────────────────────────────

export class ValleyScene {
  private scene:    THREE.Scene;
  private camera:   THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock:    THREE.Clock;
  private fog:      THREE.FogExp2;

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
    this.camera   = new THREE.PerspectiveCamera(58, canvas.width/canvas.height, 0.5, 900);
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
  // Starts at Y=55 (aerial landscape view) and descends into the valley.

  private buildPath(): void {
    this.camPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(  0, 88, 140),  // Hero: high aerial — full valley from above
      new THREE.Vector3( -3, 58,  96),  // Pain: descending, horizon still visible
      new THREE.Vector3(  2, 28,  52),  // Services: entering valley walls
      new THREE.Vector3(  0, 12,  10),  // AI: inside valley floor
      new THREE.Vector3(  2, 10, -44),  // Team
      new THREE.Vector3(0.5, 11, -82),  // Method — valley opening ahead
      new THREE.Vector3(  0, 18,-106),  // Contact — elevated lookout over lake
    ], false, 'catmullrom', 0.5);
  }

  private positionCamera(t: number): void {
    const pos  = this.camPath.getPoint(t);
    this.camera.position.copy(pos);

    const tang   = this.camPath.getTangent(Math.min(t, 0.998));
    let target   = pos.clone().addScaledVector(tang, 14);

    // At panorama end: look across the lake, slightly downward
    const pano = Math.max(0, (t - 0.82) / 0.18);
    if (pano > 0) {
      // Look toward far end of lake, slightly below horizon
      const lakeTarget = new THREE.Vector3(pos.x + this.mouse.x*4, 1.5, -145);
      target = target.clone().lerp(lakeTarget, pano);
    }

    target.x += this.mouse.x * 5.0 * (1 - pano * 0.7);
    target.y += this.mouse.y * 3.0 * (1 - pano * 0.5);
    this.camera.lookAt(target);
  }

  // ── Terrain ────────────────────────────────────────────────────────────────

  private buildTerrain(): void {
    const geo = new THREE.PlaneGeometry(300, 460, 160, 260);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, terrainH(pos.getX(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.88,
      metalness: 0.04,
      fog: true,
    });
    applyGraniteShader(mat);

    const mesh = new THREE.Mesh(geo, mat);
    this.scene.add(mesh);
  }

  // ── Water ──────────────────────────────────────────────────────────────────

  private buildWater(): void {
    const geo = new THREE.PlaneGeometry(180, 100, 58, 36);
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
    const N = 1300, arr = new Float32Array(N*3);
    for (let i=0;i<N;i++){
      arr[i*3]=(Math.random()-.5)*280; arr[i*3+1]=28+Math.random()*42; arr[i*3+2]=-300+Math.random()*440;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    this.starsMat = new THREE.PointsMaterial({ color:0xeeeeff, size:0.20, sizeAttenuation:true, transparent:true, opacity:0 });
    this.stars = new THREE.Points(geo, this.starsMat);
    this.scene.add(this.stars);
  }

  // ── Lights ────────────────────────────────────────────────────────────────

  private buildLights(): void {
    const a0 = ATMS[0]!;
    this.ambient = new THREE.AmbientLight(a0.ambC, a0.ambI);
    this.scene.add(this.ambient);

    // Moon from high side — highlights rock faces, casts strong shadows
    this.moon = new THREE.DirectionalLight(a0.moonC, a0.moonI);
    this.moon.position.set(20, 60, 50);
    this.scene.add(this.moon);

    this.beacon = new THREE.PointLight(a0.beaC, a0.beaI, 95, 0);
    this.scene.add(this.beacon);
  }

  // ── API ───────────────────────────────────────────────────────────────────

  setSize(w:number, h:number): void {
    this.camera.aspect=w/h; this.camera.updateProjectionMatrix();
    this.renderer.setSize(w,h,false);
  }
  setScroll(p:number): void { this.tScroll=Math.max(0,Math.min(1,p)); }
  onMouseMove(x:number, y:number): void {
    this.tMouse.set((x/window.innerWidth)*2-1,-((y/window.innerHeight)*2-1));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  private render(): void {
    const delta=this.clock.getDelta(), elapsed=this.clock.getElapsedTime();
    this.scroll+=(this.tScroll-this.scroll)*(1-Math.exp(-delta*3.5));
    this.mouse.lerp(this.tMouse, 0.04);

    this.positionCamera(this.scroll);
    const atm = lerpAtm(this.scroll);

    this.fog.color.copy(atm.sky); this.fog.density=atm.fd;
    this.renderer.setClearColor(atm.sky,1);
    this.ambient.color.copy(atm.ambC); this.ambient.intensity=atm.ambI;
    this.moon.color.copy(atm.moonC);   this.moon.intensity=atm.moonI;

    const bT=Math.min(this.scroll+0.04,0.998);
    const bp=this.camPath.getPoint(bT);
    bp.x+=Math.sin(elapsed*0.16)*2.5+this.mouse.x*1.8;
    bp.y+=2.0+Math.sin(elapsed*0.11)*0.7;
    this.beacon.position.copy(bp);
    this.beacon.color.copy(atm.beaC); this.beacon.intensity=atm.beaI;

    this.starsMat.opacity=atm.stars;
    (this.wUni['uOpacity'] as THREE.IUniform).value=atm.water;
    (this.wUni['uTime']    as THREE.IUniform).value=elapsed;
    (this.wUni['uCamPos']  as THREE.IUniform).value.copy(this.camera.position);
    (this.wUni['uBeaPos']  as THREE.IUniform).value.copy(bp);

    this.renderer.render(this.scene,this.camera);
  }

  start(): void { const l=():void=>{this.animId=requestAnimationFrame(l);this.render();};l(); }
  dispose(): void { cancelAnimationFrame(this.animId); this.renderer.dispose(); this.scene.clear(); }
}
