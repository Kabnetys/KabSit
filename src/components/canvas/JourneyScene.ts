import * as THREE from 'three';

const ANCHOR_COUNT = 6;
const ANCHOR_SPACING = 7;
const STAR_COUNT = 260;
const TUBE_RADIUS_SPREAD = 3.2;

function createGlowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(160,190,255,0.6)');
    gradient.addColorStop(1, 'rgba(61,124,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export class JourneyScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private world: THREE.Group;
  private traveler: THREE.Sprite;
  private travelerLight: THREE.PointLight;
  private clock: THREE.Clock;
  private mouse = new THREE.Vector2();
  private targetMouse = new THREE.Vector2();
  private currentY = 0;
  private targetY = 0;
  private animationId = 0;
  private reducedMotion: boolean;
  private totalDepth = ANCHOR_SPACING * (ANCHOR_COUNT - 1);

  constructor(private canvas: HTMLCanvasElement, options: { reducedMotion: boolean; lightweight: boolean }) {
    this.reducedMotion = options.reducedMotion;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x04081c, 0.05);
    this.camera = new THREE.PerspectiveCamera(55, canvas.width / canvas.height, 0.1, 100);
    this.camera.position.set(0, 0, 6);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !options.lightweight, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, options.lightweight ? 1.5 : 2));
    this.renderer.setClearColor(0x04081c, 1);
    this.clock = new THREE.Clock();
    this.world = new THREE.Group();
    this.scene.add(this.world);

    this.buildStars(options.lightweight ? Math.round(STAR_COUNT * 0.5) : STAR_COUNT);
    this.buildPath();

    const glowTexture = createGlowTexture();
    const spriteMat = new THREE.SpriteMaterial({ map: glowTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.traveler = new THREE.Sprite(spriteMat);
    this.traveler.scale.set(0.8, 0.8, 1);
    this.traveler.position.set(2.6, -1.9, -5);
    this.camera.add(this.traveler);

    this.travelerLight = new THREE.PointLight(0x3d7cff, 1.1, 9);
    this.travelerLight.position.set(2.6, -1.9, -5);
    this.camera.add(this.travelerLight);

    this.scene.add(this.camera);
    this.scene.add(new THREE.AmbientLight(0x1a2550, 0.7));
  }

  private buildStars(count: number): void {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * TUBE_RADIUS_SPREAD * 4;
      positions[i * 3 + 1] = -Math.random() * (this.totalDepth + ANCHOR_SPACING * 2) + ANCHOR_SPACING;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 4;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x9fb4ff,
      size: 0.045,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
    });
    this.world.add(new THREE.Points(geometry, material));
  }

  private buildPath(): void {
    const anchors: THREE.Vector3[] = [];
    for (let i = 0; i < ANCHOR_COUNT; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      anchors.push(
        new THREE.Vector3(
          side * (TUBE_RADIUS_SPREAD * 1.3 + Math.sin(i * 0.9) * 0.6),
          -i * ANCHOR_SPACING,
          Math.cos(i * 0.7) * 2 - 7
        )
      );
    }
    const curve = new THREE.CatmullRomCurve3(anchors);
    const points = curve.getPoints(160);
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x3d7cff, transparent: true, opacity: 0.4 });
    this.world.add(new THREE.Line(lineGeometry, lineMaterial));

    const ringGeometry = new THREE.TorusGeometry(0.5, 0.015, 8, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x3d7cff, transparent: true, opacity: 0.5 });
    for (const anchor of anchors) {
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.copy(anchor);
      this.world.add(ring);
    }
  }

  setSize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  onMouseMove(x: number, y: number): void {
    this.targetMouse.set((x / window.innerWidth) * 2 - 1, -((y / window.innerHeight) * 2 - 1));
  }

  setProgress(progress: number): void {
    this.targetY = progress * this.totalDepth;
    if (this.reducedMotion) {
      this.currentY = this.targetY;
      this.world.position.y = this.currentY;
      this.renderer.render(this.scene, this.camera);
    }
  }

  private render(): void {
    const elapsed = this.clock.getElapsedTime();

    this.mouse.lerp(this.targetMouse, 0.04);
    this.camera.rotation.y = this.mouse.x * 0.03;
    this.camera.rotation.x = this.mouse.y * 0.02;

    this.currentY += (this.targetY - this.currentY) * 0.06;
    this.world.position.y = this.currentY;

    const pulse = 1 + Math.sin(elapsed * 1.4) * 0.08;
    this.traveler.scale.set(1.4 * pulse, 1.4 * pulse, 1);

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
