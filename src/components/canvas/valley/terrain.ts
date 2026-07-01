import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

const HEIGHT_RANGE = 6;

const vertexShader = `
  attribute float aBaseHeight;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uRippleScale;
  varying float vHeight;
  varying vec3 vWorldPosition;

  #include <fog_pars_vertex>

  void main() {
    vec3 pos = position;
    float ripple = (
      sin(pos.x * 0.15 + uTime * 0.4 + uMouse.x * 3.0) * 0.15 +
      cos(pos.z * 0.12 + uTime * 0.3 + uMouse.y * 3.0) * 0.15
    ) * uRippleScale;
    pos.y = aBaseHeight + ripple;
    vHeight = pos.y;
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = `
  uniform vec3 uGroundLow;
  uniform vec3 uGroundHigh;
  uniform vec3 uLightPos;
  uniform vec3 uLightColor;
  uniform float uLightIntensity;
  uniform float uHeightRange;
  varying float vHeight;
  varying vec3 vWorldPosition;

  #include <fog_pars_fragment>

  void main() {
    float t = clamp((vHeight + uHeightRange) / (2.0 * uHeightRange), 0.0, 1.0);
    vec3 color = mix(uGroundLow, uGroundHigh, t);

    float dist = distance(vWorldPosition, uLightPos);
    float glow = pow(max(0.0, 1.0 - dist / 26.0), 2.0);
    color += uLightColor * glow * uLightIntensity * 0.12;

    gl_FragColor = vec4(color, 1.0);
    #include <fog_fragment>
  }
`;

export interface TerrainHandle {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  setTime(time: number): void;
  setMouse(x: number, y: number): void;
  setColors(groundLow: number, groundHigh: number): void;
  setLight(position: THREE.Vector3, color: number, intensity: number): void;
}

function buildHeightAttribute(
  geometry: THREE.PlaneGeometry,
  noise: (x: number, y: number) => number,
  invert: boolean
): void {
  const position = geometry.getAttribute('position') as THREE.BufferAttribute;
  const heights = new Float32Array(position.count);
  const valleyWidth = 30;
  const valleyDepth = invert ? -2.5 : 7;
  const noiseScale = invert ? 1.2 : 1.8;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getY(i);
    const ridge = noise(x * 0.02, z * 0.02) * noiseScale;
    const valley = -valleyDepth * Math.exp(-(x * x) / (valleyWidth * valleyWidth));
    heights[i] = ridge + valley + (invert ? 15 : 0);
  }

  geometry.setAttribute('aBaseHeight', new THREE.BufferAttribute(heights, 1));
}

export function createTerrain(lightweight: boolean, invert: boolean): TerrainHandle {
  const segments = lightweight ? 90 : 170;
  const geometry = new THREE.PlaneGeometry(400, 400, segments, segments);
  const noise2D = createNoise2D();
  buildHeightAttribute(geometry, noise2D, invert);
  geometry.rotateX(-Math.PI / 2);

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib['fog'],
      {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uRippleScale: { value: invert ? 0.4 : 1 },
        uGroundLow: { value: new THREE.Color(0x140f24) },
        uGroundHigh: { value: new THREE.Color(0x3a2f5c) },
        uLightPos: { value: new THREE.Vector3(0, 0, 0) },
        uLightColor: { value: new THREE.Color(0x6a5cff) },
        uLightIntensity: { value: 2 },
        uHeightRange: { value: HEIGHT_RANGE },
      },
    ]),
  });

  const mesh = new THREE.Mesh(geometry, material);

  return {
    mesh,
    material,
    setTime: (time) => {
      material.uniforms['uTime']!.value = time;
    },
    setMouse: (x, y) => {
      (material.uniforms['uMouse']!.value as THREE.Vector2).set(x, y);
    },
    setColors: (groundLow, groundHigh) => {
      (material.uniforms['uGroundLow']!.value as THREE.Color).setHex(groundLow);
      (material.uniforms['uGroundHigh']!.value as THREE.Color).setHex(groundHigh);
    },
    setLight: (position, color, intensity) => {
      (material.uniforms['uLightPos']!.value as THREE.Vector3).copy(position);
      (material.uniforms['uLightColor']!.value as THREE.Color).setHex(color);
      material.uniforms['uLightIntensity']!.value = intensity;
    },
  };
}
