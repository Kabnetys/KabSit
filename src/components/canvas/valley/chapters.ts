export interface Chapter {
  id: string;
  start: number;
  end: number;
  fogColor: number;
  fogDensity: number;
  lightColor: number;
  lightIntensity: number;
  groundLow: number;
  groundHigh: number;
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'aube',
    start: 0,
    end: 0.15,
    fogColor: 0x2a1f4d,
    fogDensity: 0.02,
    lightColor: 0x6a5cff,
    lightIntensity: 2.2,
    groundLow: 0x140f24,
    groundHigh: 0x3a2f5c,
  },
  {
    id: 'friction',
    start: 0.15,
    end: 0.35,
    fogColor: 0x4a1620,
    fogDensity: 0.028,
    lightColor: 0xff5533,
    lightIntensity: 2.6,
    groundLow: 0x1a0d10,
    groundHigh: 0x4a1f22,
  },
  {
    id: 'percee',
    start: 0.35,
    end: 0.55,
    fogColor: 0x0d2b33,
    fogDensity: 0.01,
    lightColor: 0x00e5ff,
    lightIntensity: 2.8,
    groundLow: 0x0a1a22,
    groundHigh: 0x1f4550,
  },
  {
    id: 'intelligence',
    start: 0.55,
    end: 0.7,
    fogColor: 0x04081c,
    fogDensity: 0.004,
    lightColor: 0x2f6bff,
    lightIntensity: 3.2,
    groundLow: 0x000000,
    groundHigh: 0x101830,
  },
  {
    id: 'equipe',
    start: 0.7,
    end: 0.85,
    fogColor: 0x4a3018,
    fogDensity: 0.018,
    lightColor: 0xffb347,
    lightIntensity: 2.4,
    groundLow: 0x1a1208,
    groundHigh: 0x4a3018,
  },
  {
    id: 'horizon',
    start: 0.85,
    end: 1,
    fogColor: 0x04081c,
    fogDensity: 0.006,
    lightColor: 0xffffff,
    lightIntensity: 2,
    groundLow: 0x05050a,
    groundHigh: 0x14141c,
  },
];

export function sampleChapters(progress: number): { color: (key: 'fogColor' | 'lightColor' | 'groundLow' | 'groundHigh') => number; fogDensity: number; lightIntensity: number } {
  const p = Math.min(Math.max(progress, 0), 1);
  let index = CHAPTERS.findIndex((c) => p >= c.start && p <= c.end);
  if (index === -1) index = p < 0.5 ? 0 : CHAPTERS.length - 1;

  const current = CHAPTERS[index] as Chapter;
  const next = CHAPTERS[Math.min(index + 1, CHAPTERS.length - 1)] as Chapter;
  const span = current.end - current.start || 1;
  const t = Math.min(Math.max((p - current.start) / span, 0), 1);

  return {
    color: (key) => lerpHex(current[key], next[key], t),
    fogDensity: lerp(current.fogDensity, next.fogDensity, t),
    lightIntensity: lerp(current.lightIntensity, next.lightIntensity, t),
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpHex(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  return (r << 16) | (g << 8) | bl;
}
