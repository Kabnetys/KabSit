import * as THREE from 'three';
import { createTerrain, type TerrainHandle } from './terrain';
import { sampleChapters } from './chapters';
import { createGlowTexture } from './glow';

const PATH_LENGTH = 260;
const LIGHT_AHEAD = 18;
const MOUSE_MAX_ANGLE = (4 * Math.PI) / 180;

function buildPathCurve(): THREE.CatmullRomCurve3 {
  const points: THREE.Vector3[] = [];
  const segments = 8;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push(
      new THREE.Vector3(Math.sin(t * Math.PI * 1.3) * 6, 3 + Math.sin(t * Math.PI * 2) * 0.6, -t * PATH_LENGTH)
    );
  }
  return new THREE.CatmullRomCurve3(points);
}

function buildStarfield(pathLength: number): THREE.Points {
  const count = 220;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 160;
    positions[i * 3 + 1] = 14 + Math.random() * 10;
    positions[i * 3 + 2] = -Math.random() * (pathLength + 40);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xdfe8ff,
    size: 0.5,
    transparent: true,
    opacity: 0.8,
    fog: true,
  });
  return new THREE.Points(geometry, material);
}

export class ValleyScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private ground: TerrainHandle;
  private ceiling: TerrainHandle;
  private light: THREE.PointLight;
  private lightSprite: THREE.Sprite;
  private curve: THREE.CatmullRomCurve3;
  private clock: THREE.Clock;
  private mouse = new THREE.Vector2();
  private targetMouse = new THREE.Vector2();
  private lookTarget = new THREE.Vector3();
  private currentProgress = 0;
  private targetProgress = 0;
  private animationId = 0;
  private reducedMotion: boolean;

  constructor(private canvas: HTMLCanvasElement, options: { reducedMotion: boolean; lightweight: boolean }) {
    this.reducedMotion = options.reducedMotion;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x2a1f4d, 0.045);

    this.camera = new THREE.PerspectiveCamera(58, canvas.width / canvas.height, 0.1, 220);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !options.lightweight, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, options.lightweight ? 1.5 : 2));
    this.clock = new THREE.Clock();

    this.curve = buildPathCurve();

    this.ground = createTerrain(options.lightweight, false);
    this.scene.add(this.ground.mesh);

    this.ceiling = createTerrain(options.lightweight, true);
    this.scene.add(this.ceiling.mesh);

    this.scene.add(buildStarfield(PATH_LENGTH));

    this.light = new THREE.PointLight(0x6a5cff, 2.2, 60, 1.5);
    this.scene.add(this.light);

    const spriteMaterial = new THREE.SpriteMaterial({
      map: createGlowTexture(),
      color: 0x6a5cff,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: true,
    });
    this.lightSprite = new THREE.Sprite(spriteMaterial);
    this.lightSprite.scale.set(9, 9, 1);
    this.scene.add(this.lightSprite);

    this.scene.add(new THREE.AmbientLight(0x1a2550, 0.35));

    this.applyChapter(0);
  }

  private applyChapter(progress: number): void {
    const sample = sampleChapters(progress);
    const fogColor = sample.color('fogColor');
    const groundLow = sample.color('groundLow');
    const groundHigh = sample.color('groundHigh');
    const lightColor = sample.color('lightColor');

    (this.scene.fog as THREE.FogExp2).color.setHex(fogColor);
    (this.scene.fog as THREE.FogExp2).density = sample.fogDensity;
    this.renderer.setClearColor(fogColor, 1);

    this.ground.setColors(groundLow, groundHigh);
    this.ceiling.setColors(groundLow, groundHigh);
    this.light.color.setHex(lightColor);
    this.light.intensity = sample.lightIntensity;
    (this.lightSprite.material as THREE.SpriteMaterial).color.setHex(lightColor);
    const scale = 7 + sample.lightIntensity * 1.2;
    this.lightSprite.scale.set(scale, scale, 1);
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
    this.targetProgress = progress;
    if (this.reducedMotion) {
      this.currentProgress = progress;
      this.updateCameraAndLight(0);
      this.applyChapter(progress);
      this.renderer.render(this.scene, this.camera);
    }
  }

  private updateCameraAndLight(time: number, lookFactor = 1): void {
    const camPoint = this.curve.getPointAt(this.currentProgress);
    const tangent = this.curve.getTangentAt(this.currentProgress).normalize();
    this.camera.position.copy(camPoint);

    const right = new THREE.Vector3().crossVectors(tangent, this.camera.up).normalize();
    const forwardTarget = camPoint.clone().add(tangent.clone().multiplyScalar(10));
    forwardTarget.y -= 4.2;
    forwardTarget.add(right.clone().multiplyScalar(this.mouse.x * Math.tan(MOUSE_MAX_ANGLE) * 10));
    forwardTarget.y += this.mouse.y * Math.tan(MOUSE_MAX_ANGLE) * 10;
    this.lookTarget.lerp(forwardTarget, this.reducedMotion ? 1 : lookFactor);
    this.camera.lookAt(this.lookTarget);

    const lightProgress = Math.min(this.currentProgress + LIGHT_AHEAD / PATH_LENGTH, 1);
    const lightPoint = this.curve.getPointAt(lightProgress).clone();
    lightPoint.add(right.clone().multiplyScalar(this.mouse.x * 1.5));
    this.light.position.copy(lightPoint);
    this.lightSprite.position.copy(lightPoint);

    this.ground.setTime(time);
    this.ground.setMouse(this.mouse.x, this.mouse.y);
    this.ground.setLight(this.light.position, this.light.color.getHex(), this.light.intensity);
    this.ceiling.setTime(time);
    this.ceiling.setMouse(this.mouse.x, this.mouse.y);
    this.ceiling.setLight(this.light.position, this.light.color.getHex(), this.light.intensity);
  }

  private render(): void {
    const delta = this.clock.getDelta();
    const time = this.clock.elapsedTime;
    const mouseFactor = 1 - Math.exp(-delta * 8);
    const progressFactor = 1 - Math.exp(-delta * 12);
    this.mouse.lerp(this.targetMouse, mouseFactor);
    this.currentProgress += (this.targetProgress - this.currentProgress) * progressFactor;

    this.updateCameraAndLight(time, progressFactor);
    this.applyChapter(this.currentProgress);
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
