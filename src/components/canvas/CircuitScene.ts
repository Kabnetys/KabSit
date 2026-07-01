import * as THREE from 'three';

interface Node {
  position: THREE.Vector3;
  connections: number[];
}

export class CircuitScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private traceMeshes: THREE.Line[] = [];
  private nodeMesh: THREE.Points | null = null;
  private pulsePoints: THREE.Points | null = null;
  private pulsePositions: Float32Array = new Float32Array(0);
  private pulseTargets: Array<{ from: THREE.Vector3; to: THREE.Vector3; t: number; speed: number }> = [];
  private mouse = new THREE.Vector2(0, 0);
  private targetMouse = new THREE.Vector2(0, 0);
  private animationId = 0;
  private nodes: Node[] = [];

  constructor(private canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, canvas.width / canvas.height, 0.1, 100);
    this.camera.position.set(0, 0, 5);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x050b2e, 1);
    this.clock = new THREE.Clock();
    this.buildScene();
  }

  private buildScene(): void {
    const NODE_COUNT = 60;
    const SPREAD = 8;

    for (let i = 0; i < NODE_COUNT; i++) {
      this.nodes.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * SPREAD,
          (Math.random() - 0.5) * SPREAD * 0.6,
          (Math.random() - 0.5) * 2
        ),
        connections: [],
      });
    }

    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i + 1; j < NODE_COUNT; j++) {
        const ni = this.nodes[i];
        const nj = this.nodes[j];
        if (!ni || !nj) continue;
        const dist = ni.position.distanceTo(nj.position);
        if (dist < 1.8 && ni.connections.length < 3) {
          ni.connections.push(j);
          nj.connections.push(i);
        }
      }
    }

    const traceMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(0x0066ff),
      transparent: true,
      opacity: 0.2,
    });

    for (const node of this.nodes) {
      for (const connIdx of node.connections) {
        const target = this.nodes[connIdx];
        if (!target) continue;
        const geom = new THREE.BufferGeometry().setFromPoints([node.position, target.position]);
        const line = new THREE.Line(geom, traceMat);
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
      color: new THREE.Color(0x00ccff),
      size: 0.06,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });
    this.nodeMesh = new THREE.Points(pointsGeom, pointsMat);
    this.scene.add(this.nodeMesh);

    this.buildPulses();
    this.scene.add(new THREE.AmbientLight(0x334488, 0.5));
  }

  private buildPulses(): void {
    const PULSE_COUNT = 30;
    this.pulsePositions = new Float32Array(PULSE_COUNT * 3);
    this.pulseTargets = [];

    for (let i = 0; i < PULSE_COUNT; i++) {
      const fromIdx = Math.floor(Math.random() * this.nodes.length);
      const fromNode = this.nodes[fromIdx];
      if (!fromNode || fromNode.connections.length === 0) {
        this.pulseTargets.push({ from: new THREE.Vector3(), to: new THREE.Vector3(), t: 0, speed: 0.3 });
        continue;
      }
      const toIdx = fromNode.connections[Math.floor(Math.random() * fromNode.connections.length)];
      const toNode = this.nodes[toIdx ?? 0];
      if (!toNode) {
        this.pulseTargets.push({ from: fromNode.position.clone(), to: fromNode.position.clone(), t: Math.random(), speed: 0.3 + Math.random() * 0.4 });
        continue;
      }
      this.pulseTargets.push({
        from: fromNode.position.clone(),
        to: toNode.position.clone(),
        t: Math.random(),
        speed: 0.3 + Math.random() * 0.4,
      });
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.pulsePositions, 3));
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(0x00eeff),
      size: 0.05,
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

  onMouseMove(x: number, y: number): void {
    this.targetMouse.set((x / window.innerWidth) * 2 - 1, -((y / window.innerHeight) * 2 - 1));
  }

  private render(): void {
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.mouse.lerp(this.targetMouse, 0.05);

    if (this.nodeMesh) {
      this.nodeMesh.rotation.y = this.mouse.x * 0.08;
      this.nodeMesh.rotation.x = this.mouse.y * 0.05;
    }
    for (const line of this.traceMeshes) {
      line.rotation.y = this.mouse.x * 0.06;
      line.rotation.x = this.mouse.y * 0.04;
    }
    if (this.pulsePoints) {
      this.pulsePoints.rotation.y = this.mouse.x * 0.06;
      this.pulsePoints.rotation.x = this.mouse.y * 0.04;
    }

    for (let i = 0; i < this.pulseTargets.length; i++) {
      const p = this.pulseTargets[i];
      if (!p) continue;
      p.t += delta * p.speed;
      if (p.t > 1) {
        p.t = 0;
        const fromIdx = Math.floor(Math.random() * this.nodes.length);
        const fromNode = this.nodes[fromIdx];
        if (fromNode && fromNode.connections.length > 0) {
          const toIdx = fromNode.connections[Math.floor(Math.random() * fromNode.connections.length)];
          const toNode = this.nodes[toIdx ?? 0];
          if (toNode) {
            p.from = fromNode.position.clone();
            p.to = toNode.position.clone();
          }
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

    this.camera.position.y = Math.sin(elapsed * 0.1) * 0.1;
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
