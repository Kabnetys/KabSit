import * as THREE from 'three';

interface Node {
  position: THREE.Vector3;
  connections: number[];
}

interface PulseTarget {
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  speed: number;
}

// Section color stops keyed by scroll progress [0..1]
const BG_COLORS: Array<{ p: number; color: THREE.Color }> = [
  { p: 0.00, color: new THREE.Color(0x020918) }, // Hero — deep navy
  { p: 0.20, color: new THREE.Color(0x0d0005) }, // Pain — near black w/ red tint
  { p: 0.40, color: new THREE.Color(0x000d1a) }, // Services — dark blue
  { p: 0.60, color: new THREE.Color(0x000510) }, // AI — very deep blue
  { p: 0.80, color: new THREE.Color(0x050218) }, // Team — dark indigo
  { p: 1.00, color: new THREE.Color(0x000000) }, // Contact — black
];

const LINE_COLORS: Array<{ p: number; color: THREE.Color }> = [
  { p: 0.00, color: new THREE.Color(0x0044cc) },
  { p: 0.20, color: new THREE.Color(0xcc1111) },
  { p: 0.50, color: new THREE.Color(0x0066ff) },
  { p: 0.80, color: new THREE.Color(0x00cfff) },
  { p: 1.00, color: new THREE.Color(0x002244) },
];

function lerpColor(stops: Array<{ p: number; color: THREE.Color }>, progress: number): THREE.Color {
  const clamped = Math.max(0, Math.min(1, progress));
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i]!;
    const b = stops[i + 1]!;
    if (clamped >= a.p && clamped <= b.p) {
      const t = (clamped - a.p) / (b.p - a.p);
      return a.color.clone().lerp(b.color, t);
    }
  }
  return stops[stops.length - 1]!.color.clone();
}

export class CircuitScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private traceMeshes: THREE.Line[] = [];
  private traceMat: THREE.LineBasicMaterial;
  private nodeMesh: THREE.Points | null = null;
  private pulsePoints: THREE.Points | null = null;
  private pulsePositions: Float32Array = new Float32Array(0);
  private pulseTargets: PulseTarget[] = [];
  private mouse = new THREE.Vector2(0, 0);
  private targetMouse = new THREE.Vector2(0, 0);
  private animationId = 0;
  private nodes: Node[] = [];
  private scrollProgress = 0;
  private targetScrollProgress = 0;

  // Camera path: fly from z=10 at scroll=0 to z=-55 at scroll=1
  private readonly CAM_Z_START = 10;
  private readonly CAM_Z_END = -55;

  constructor(private canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, canvas.width / canvas.height, 0.1, 200);
    this.camera.position.set(0, 0, this.CAM_Z_START);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(BG_COLORS[0]!.color, 1);
    this.clock = new THREE.Clock();
    this.traceMat = new THREE.LineBasicMaterial({
      color: LINE_COLORS[0]!.color,
      transparent: true,
      opacity: 0.22,
    });
    this.buildScene();
  }

  private buildScene(): void {
    const NODE_COUNT = 140;
    const SPREAD_X = 10;
    const SPREAD_Y = 6;
    const TUNNEL_LENGTH = 70; // z from +10 to -60

    for (let i = 0; i < NODE_COUNT; i++) {
      // Distribute nodes along the tunnel with slight radial clustering
      const zPos = (i / NODE_COUNT) * TUNNEL_LENGTH - 5; // -5 to +65, but we flip
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.5 + Math.random() * SPREAD_X * 0.5;
      this.nodes.push({
        position: new THREE.Vector3(
          Math.cos(angle) * radius * (0.5 + Math.random() * 0.5),
          Math.sin(angle) * radius * 0.6 * (0.5 + Math.random() * 0.5),
          this.CAM_Z_START - 2 - zPos // ahead of camera at z_start, going deep
        ),
        connections: [],
      });
    }

    // Connect nearby nodes along the tunnel
    for (let i = 0; i < NODE_COUNT; i++) {
      const ni = this.nodes[i];
      if (!ni) continue;
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const nj = this.nodes[j];
        if (!nj) continue;
        const dist = ni.position.distanceTo(nj.position);
        // Connect if close enough, but also allow longer z-connections (wires along tunnel)
        const zDiff = Math.abs(ni.position.z - nj.position.z);
        if ((dist < 4.5 && ni.connections.length < 4) || (zDiff < 2.5 && dist < 7 && ni.connections.length < 3)) {
          ni.connections.push(j);
          nj.connections.push(i);
        }
      }
    }

    for (const node of this.nodes) {
      for (const connIdx of node.connections) {
        const target = this.nodes[connIdx];
        if (!target) continue;
        const geom = new THREE.BufferGeometry().setFromPoints([node.position, target.position]);
        const line = new THREE.Line(geom, this.traceMat);
        this.traceMeshes.push(line);
        this.scene.add(line);
      }
    }

    const positions = new Float32Array(NODE_COUNT * 3);
    for (let i = 0; i < NODE_COUNT; i++) {
      const n = this.nodes[i];
      if (!n) continue;
      positions[i * 3] = n.position.x;
      positions[i * 3 + 1] = n.position.y;
      positions[i * 3 + 2] = n.position.z;
    }
    const pointsGeom = new THREE.BufferGeometry();
    pointsGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pointsMat = new THREE.PointsMaterial({
      color: new THREE.Color(0x00cfff),
      size: 0.07,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });
    this.nodeMesh = new THREE.Points(pointsGeom, pointsMat);
    this.scene.add(this.nodeMesh);

    this.buildPulses();
  }

  private buildPulses(): void {
    const PULSE_COUNT = 50;
    this.pulsePositions = new Float32Array(PULSE_COUNT * 3);
    this.pulseTargets = [];

    for (let i = 0; i < PULSE_COUNT; i++) {
      const fromIdx = Math.floor(Math.random() * this.nodes.length);
      const fromNode = this.nodes[fromIdx];
      if (!fromNode || fromNode.connections.length === 0) {
        this.pulseTargets.push({
          from: new THREE.Vector3(),
          to: new THREE.Vector3(),
          t: Math.random(),
          speed: 0.4 + Math.random() * 0.6,
        });
        continue;
      }
      const toIdx = fromNode.connections[Math.floor(Math.random() * fromNode.connections.length)]!;
      const toNode = this.nodes[toIdx] ?? fromNode;
      this.pulseTargets.push({
        from: fromNode.position.clone(),
        to: toNode.position.clone(),
        t: Math.random(),
        speed: 0.3 + Math.random() * 0.7,
      });
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.pulsePositions, 3));
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(0x00eeff),
      size: 0.06,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: true,
    });
    this.pulsePoints = new THREE.Points(geom, mat);
    this.scene.add(this.pulsePoints);
  }

  setSize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  setScroll(progress: number): void {
    this.targetScrollProgress = Math.max(0, Math.min(1, progress));
  }

  onMouseMove(x: number, y: number): void {
    this.targetMouse.set(
      (x / window.innerWidth) * 2 - 1,
      -((y / window.innerHeight) * 2 - 1)
    );
  }

  private render(): void {
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Smooth scroll interpolation
    this.scrollProgress += (this.targetScrollProgress - this.scrollProgress) * Math.min(1, delta * 4);

    // Smooth mouse
    this.mouse.lerp(this.targetMouse, 0.05);

    // Camera flies through tunnel based on scroll
    const targetZ = this.CAM_Z_START + this.scrollProgress * (this.CAM_Z_END - this.CAM_Z_START);
    // Gentle drift perpendicular to forward axis
    const driftX = Math.sin(elapsed * 0.15) * 0.4 + this.mouse.x * 0.6;
    const driftY = Math.cos(elapsed * 0.12) * 0.25 + this.mouse.y * 0.4;
    this.camera.position.set(driftX, driftY, targetZ);
    this.camera.lookAt(driftX * 0.3, driftY * 0.3, targetZ - 8);

    // Interpolate background and line colors per section
    const bgColor = lerpColor(BG_COLORS, this.scrollProgress);
    this.renderer.setClearColor(bgColor, 1);

    const lineColor = lerpColor(LINE_COLORS, this.scrollProgress);
    (this.traceMat.color as THREE.Color).copy(lineColor);

    // Update pulses
    for (let i = 0; i < this.pulseTargets.length; i++) {
      const p = this.pulseTargets[i];
      if (!p) continue;
      p.t += delta * p.speed;
      if (p.t > 1) {
        p.t = 0;
        const fromIdx = Math.floor(Math.random() * this.nodes.length);
        const fromNode = this.nodes[fromIdx];
        if (fromNode && fromNode.connections.length > 0) {
          const toIdx = fromNode.connections[Math.floor(Math.random() * fromNode.connections.length)]!;
          const toNode = this.nodes[toIdx] ?? fromNode;
          p.from = fromNode.position.clone();
          p.to = toNode.position.clone();
        }
      }
      const pos = p.from.clone().lerp(p.to, p.t);
      this.pulsePositions[i * 3] = pos.x;
      this.pulsePositions[i * 3 + 1] = pos.y;
      this.pulsePositions[i * 3 + 2] = pos.z;
    }
    if (this.pulsePoints) {
      (this.pulsePoints.geometry.attributes['position'] as THREE.BufferAttribute).needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  }

  start(): void {
    const loop = (): void => {
      this.animationId = requestAnimationFrame(loop);
      this.render();
    };
    loop();
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
    this.scene.clear();
  }
}
