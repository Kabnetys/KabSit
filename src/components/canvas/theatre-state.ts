/**
 * État Theatre.js généré depuis les chapitres scroll.
 * Sequence length = 10s → scroll 0→1 map sur position 0→10.
 * Chaque chapitre = keyframe bezier sur toutes les propriétés.
 */

const SEQ = 10; // durée de la séquence

interface ChapterData {
  p:     number;
  r:     number;
  theta: number;
  camY:  number;
  fogD:  number;
  beaI:  number;
  moonI: number;
  stars: number;
}

const CHAPTERS: ChapterData[] = [
  { p: 0.00, r: 140, theta: 0.00, camY: 90, fogD: 0.0004, beaI:  6, moonI: 2.5, stars: 0.0 },
  { p: 0.17, r: 130, theta: 0.25, camY: 75, fogD: 0.0008, beaI: 14, moonI: 2.2, stars: 0.2 },
  { p: 0.35, r: 118, theta: 0.55, camY: 62, fogD: 0.0014, beaI: 22, moonI: 1.9, stars: 0.4 },
  { p: 0.52, r: 105, theta: 0.80, camY: 50, fogD: 0.0022, beaI: 32, moonI: 1.6, stars: 0.6 },
  { p: 0.68, r:  92, theta: 1.10, camY: 40, fogD: 0.0016, beaI: 26, moonI: 2.0, stars: 0.8 },
  { p: 0.84, r:  80, theta: 1.35, camY: 33, fogD: 0.0010, beaI: 18, moonI: 2.4, stars: 0.9 },
  { p: 1.00, r:  72, theta: 1.60, camY: 28, fogD: 0.0007, beaI: 12, moonI: 2.8, stars: 1.0 },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

function makeTrack(prop: keyof ChapterData, trackId: string): AnyRecord {
  return {
    [trackId]: {
      type:        'BasicKeyframedTrack',
      __debugName: prop,
      keyframes:   CHAPTERS.map((ch, i) => ({
        id:             `${trackId}_${i}`,
        position:       ch.p * SEQ,
        connectedRight: i < CHAPTERS.length - 1,
        handles:        [0.5, 1, 0.5, 0] as [number, number, number, number],
        type:           'bezier',
        value:          ch[prop],
      })),
    },
  };
}

function buildObjectTracks(
  props: (keyof ChapterData)[],
  prefix: string,
): { trackData: AnyRecord; trackIdByPropPath: Record<string, string> } {
  const trackData: AnyRecord            = {};
  const trackIdByPropPath: Record<string, string> = {};

  for (const prop of props) {
    const id = `${prefix}_${prop}`;
    Object.assign(trackData, makeTrack(prop, id));
    trackIdByPropPath[prop] = id;
  }

  return { trackData, trackIdByPropPath };
}

const cameraTrack = buildObjectTracks(['r', 'theta', 'camY'], 'cam');
const atmoTrack   = buildObjectTracks(['fogD', 'beaI', 'moonI', 'stars'], 'atm');

export const theatreState = {
  sheetsById: {
    KabNetys: {
      staticOverrides: { byObject: {} },
      sequence: {
        subUnitsPerUnit: 30,
        length:          SEQ,
        type:            'PositionalSequence',
        tracksByObject: {
          Camera:     cameraTrack,
          Atmosphere: atmoTrack,
        },
      },
    },
  },
};
