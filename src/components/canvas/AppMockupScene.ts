import * as THREE from 'three';

export class AppMockupScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private group: THREE.Group;
  private clock: THREE.Clock;
  private mouse = new THREE.Vector2();
  private animationId = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    this.camera.position.set(0, 0, 5);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.clock = new THREE.Clock();
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.buildMockup();
  }

  private buildMockup(): void {
    const frameMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x0a1245),
      emissive: new THREE.Color(0x0066ff),
      emissiveIntensity: 0.08,
      roughness: 0.2,
      metalness: 0.8,
    });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(4, 2.8, 0.05), frameMat);
    this.group.add(frame);

    const screenMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0x050b2e), roughness: 0.9 });
    const screen = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.5, 0.02), screenMat);
    screen.position.set(0, -0.05, 0.04);
    this.group.add(screen);

    const barMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0x0a1a5e) });
    const bar = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.2, 0.02), barMat);
    bar.position.set(0, 1.15, 0.05);
    this.group.add(bar);

    const dotColors = [0xff5f57, 0xffbd2e, 0x28c941] as const;
    dotColors.forEach((color, i) => {
      const dot = new THREE.Mesh(
        new THREE.CircleGeometry(0.04, 16),
        new THREE.MeshStandardMaterial({ color: new THREE.Color(color), emissive: new THREE.Color(color), emissiveIntensity: 0.5 })
      );
      dot.position.set(-1.7 + i * 0.14, 1.15, 0.07);
      this.group.add(dot);
    });

    for (let r = 0; r < 6; r++) {
      const w = 2.2 + Math.random() * 0.8;
      const lineMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0x0066ff), opacity: 0.12 + Math.random() * 0.1, transparent: true });
      const line = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.01), lineMat);
      line.position.set(-0.1 - (3 - w) / 2, 0.85 - r * 0.32, 0.07);
      this.group.add(line);
      if (r < 3) {
        const badge = new THREE.Mesh(
          new THREE.BoxGeometry(0.35, 0.14, 0.01),
          new THREE.MeshStandardMaterial({ color: new THREE.Color(r === 0 ? 0x00cc55 : r === 1 ? 0xffaa00 : 0x0066ff), transparent: true, opacity: 0.7 })
        );
        badge.position.set(1.6, 0.85 - r * 0.32, 0.07);
        this.group.add(badge);
      }
    }

    const wireframeMat = new THREE.LineBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.35 });
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(4.05, 2.85, 0.08));
    this.group.add(new THREE.LineSegments(edges, wireframeMat));

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const pointLight = new THREE.PointLight(0x00ccff, 2, 12);
    pointLight.position.set(3, 3, 3);
    this.scene.add(pointLight);
  }

  onMouseMove(x: number, y: number, rect: DOMRect): void {
    this.mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((y - rect.top) / rect.height) * 2 + 1;
  }

  setSize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  start(): void {
    const loop = (): void => {
      this.animationId = requestAnimationFrame(loop);
      const elapsed = this.clock.getElapsedTime();
      this.group.rotation.y += (this.mouse.x * 0.3 - this.group.rotation.y) * 0.05;
      this.group.rotation.x += (-this.mouse.y * 0.2 - this.group.rotation.x) * 0.05;
      this.group.position.y = Math.sin(elapsed * 0.6) * 0.07;
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
    this.scene.clear();
  }
}
