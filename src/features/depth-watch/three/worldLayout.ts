import { segmentCount, agentCount as agentsForLevel, SEGMENT_LEN, ROAD_WIDTH } from './constants';

export type PropKind =
  | 'crate' | 'rock' | 'wall' | 'barrel' | 'car' | 'tree' | 'lamp' | 'fence'
  | 'hydrant' | 'trash' | 'dumpster' | 'bench';

export type DecoKind =
  | 'neon' | 'sign' | 'bus_stop' | 'pole' | 'billboard' | 'puddle'
  | 'alley_wall' | 'bridge_rail' | 'scaffold' | 'wire';

export type SegmentFeature = 'normal' | 'bridge' | 'alley' | 'plaza';

export interface WorldProp {
  id: string;
  kind: PropKind;
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  isCover: boolean;
}

export interface WorldDecoration {
  id: string;
  kind: DecoKind;
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
  label?: string;
}

export interface SegmentMeta {
  index: number;
  z: number;
  feature: SegmentFeature;
}

export interface WorldBuilding {
  id: string;
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: string;
  roofColor: string;
  windowColor: string;
  style: 'house' | 'block' | 'shop' | 'warehouse';
}

export interface WorldAgent {
  id: string;
  x: number;
  z: number;
  angle: number;
  sweep: number;
  state: 'patrol' | 'alert' | 'chase';
  alertTimer: number;
  speed: number;
}

export interface WorldLayout {
  level: number;
  tier: 'day' | 'dusk' | 'night';
  segments: number;
  length: number;
  buildings: WorldBuilding[];
  props: WorldProp[];
  decorations: WorldDecoration[];
  segmentMeta: SegmentMeta[];
  agents: WorldAgent[];
  portalZ: number;
  startZ: number;
  flavor: string;
}

const PALETTE = {
  day: { sky: '#87CEEB', fog: '#b8d4e8', road: '#3d4450', sidewalk: '#9ca3af', grass: '#4a7c59', curb: '#cbd5e1', water: '#3b82a0' },
  dusk: { sky: '#e8956d', fog: '#c97b5a', road: '#2d3436', sidewalk: '#636e72', grass: '#3d5c3a', curb: '#b2bec3', water: '#2c5282' },
  night: { sky: '#0f1419', fog: '#1a2332', road: '#1e2530', sidewalk: '#4a5568', grass: '#1a2e1a', curb: '#718096', water: '#1a365d' },
};

export function tierForLevel(level: number): WorldLayout['tier'] {
  if (level <= 3) return 'day';
  if (level <= 6) return 'dusk';
  return 'night';
}

export function paletteForTier(tier: WorldLayout['tier']) {
  return PALETTE[tier];
}

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const BUILDING_COLORS = ['#8b7355', '#6b5344', '#7c6b5a', '#5c4a3a', '#4a6741', '#556b8d', '#4a5568'];
const ROOF_COLORS = ['#8b4513', '#654321', '#4a3728', '#2d3748', '#1a202c'];
const NEON_COLORS = ['#ff006e', '#4FD8EB', '#ffd93d', '#7FE7C4', '#ff6b35', '#c77dff'];

function featureForSegment(s: number, total: number): SegmentFeature {
  if (s === total - 2) return 'plaza';
  if (s > 0 && s % 4 === 0) return 'bridge';
  if (s > 1 && s % 3 === 1) return 'alley';
  return 'normal';
}

export function generateWorld(level: number): WorldLayout {
  const segments = segmentCount(level);
  const tier = tierForLevel(level);
  const length = segments * SEGMENT_LEN;
  const buildings: WorldBuilding[] = [];
  const props: WorldProp[] = [];
  const decorations: WorldDecoration[] = [];
  const segmentMeta: SegmentMeta[] = [];
  const agents: WorldAgent[] = [];

  for (let s = 0; s < segments; s++) {
    const zBase = -s * SEGMENT_LEN;
    const zCenter = zBase - SEGMENT_LEN / 2;
    const feature = featureForSegment(s, segments);
    segmentMeta.push({ index: s, z: zCenter, feature });

    if (feature === 'bridge') {
      decorations.push({
        id: `water-${s}`,
        kind: 'puddle',
        x: 0,
        z: zCenter,
        w: ROAD_WIDTH + 20,
        h: 0.1,
        d: SEGMENT_LEN + 4,
        color: PALETTE[tier].water,
      });
      for (const side of [-1, 1] as const) {
        decorations.push({
          id: `bridge-rail-${s}-${side}`,
          kind: 'bridge_rail',
          x: side * (ROAD_WIDTH / 2 + 0.3),
          z: zCenter,
          w: 0.15,
          h: 1.1,
          d: SEGMENT_LEN,
          color: '#94a3b8',
        });
      }
    }

    if (feature === 'alley') {
      for (const side of [-1, 1] as const) {
        decorations.push({
          id: `alley-${s}-${side}`,
          kind: 'alley_wall',
          x: side * 4.8,
          z: zCenter,
          w: 0.35,
          h: rand(3.5, 5.5),
          d: SEGMENT_LEN * 0.92,
          color: tier === 'night' ? '#1a1a2e' : '#57534e',
        });
        props.push({
          id: `alley-lamp-${s}-${side}`,
          kind: 'lamp',
          x: side * 3.8,
          z: zBase - rand(4, SEGMENT_LEN - 4),
          w: 0.3,
          h: rand(3.8, 5),
          d: 0.3,
          isCover: false,
        });
      }
      decorations.push({
        id: `alley-neon-${s}`,
        kind: 'neon',
        x: pick([-1, 1]) * 4.5,
        z: zBase - rand(6, 14),
        w: 2.2,
        h: 0.6,
        d: 0.1,
        color: pick(NEON_COLORS),
        label: pick(['OPEN', 'EXIT', '24H', 'DANGER']),
      });
    }

    if (feature === 'plaza') {
      for (let px = -1; px <= 1; px++) {
        decorations.push({
          id: `plaza-puddle-${s}-${px}`,
          kind: 'puddle',
          x: px * 2.5,
          z: zCenter + rand(-3, 3),
          w: rand(1.2, 2),
          h: 0.05,
          d: rand(1.2, 2),
          color: PALETTE[tier].water,
        });
      }
    }

    for (const side of [-1, 1] as const) {
      const count = feature === 'alley' ? 1 : 2 + (s % 3);
      for (let i = 0; i < count; i++) {
        const style = pick(['house', 'block', 'shop', 'warehouse'] as const);
        const w = style === 'block' || style === 'warehouse' ? rand(3.8, 6) : rand(2.8, 4.5);
        const h = style === 'block' ? rand(10, 18) : style === 'warehouse' ? rand(5, 9) : rand(3.5, 7.5);
        const d = rand(3.5, 7.5);
        const x = side * rand(6, 10.5);
        const z = zBase - rand(1, SEGMENT_LEN - 1);
        buildings.push({
          id: `b-${s}-${side}-${i}`,
          x, z, w, h, d,
          color: tier === 'night' ? '#1e2936' : pick(BUILDING_COLORS),
          roofColor: pick(ROOF_COLORS),
          windowColor: tier === 'night' ? '#fbbf24' : '#fef9c3',
          style,
        });

        if (style === 'shop' || (tier !== 'day' && Math.random() < 0.45)) {
          decorations.push({
            id: `neon-${s}-${side}-${i}`,
            kind: 'neon',
            x: x - side * (w / 2 + 0.15),
            z: z + d / 2,
            w: rand(1.4, 2.6),
            h: rand(0.4, 0.8),
            d: 0.08,
            color: pick(NEON_COLORS),
            label: pick(['BAR', 'HOTEL', 'GLOW', 'ARCADE', 'PIZZA', 'CLUB']),
          });
        }
      }

      props.push({
        id: `fence-${s}-${side}`,
        kind: 'fence',
        x: side * (5.4 + rand(0, 0.4)),
        z: zCenter,
        w: 0.15,
        h: 1.1,
        d: SEGMENT_LEN * 0.88,
        isCover: false,
      });

      if (Math.random() < 0.55) {
        props.push({
          id: `parked-${s}-${side}`,
          kind: 'car',
          x: side * rand(5.6, 6.8),
          z: zBase - rand(2, SEGMENT_LEN - 2),
          w: 1.6,
          h: 1.2,
          d: 2.2,
          isCover: false,
        });
      }
    }

    for (let li = 0; li < (feature === 'alley' ? 1 : 2); li++) {
      const lx = li === 0 ? -4.1 : 4.1;
      props.push({
        id: `lamp-${s}-${li}`,
        kind: 'lamp',
        x: lx,
        z: zCenter + rand(-4, 4),
        w: 0.3,
        h: rand(4, 5.5),
        d: 0.3,
        isCover: false,
      });
    }

    decorations.push({
      id: `pole-${s}`,
      kind: 'pole',
      x: pick([-1, 1]) * rand(5.5, 7),
      z: zBase - rand(3, SEGMENT_LEN - 3),
      w: 0.12,
      h: rand(5, 7),
      d: 0.12,
      color: '#374151',
    });

    if (s % 2 === 0) {
      decorations.push({
        id: `billboard-${s}`,
        kind: 'billboard',
        x: pick([-1, 1]) * rand(7.5, 9.5),
        z: zCenter,
        w: rand(2.5, 4),
        h: rand(2, 3.5),
        d: 0.2,
        color: pick(['#ff6b35', '#4FD8EB', '#ffd93d', '#c77dff']),
        label: pick(['RUN', 'STEALTH', 'ARXON', 'WATCH']),
      });
    }

    if (s % 3 === 1) {
      decorations.push({
        id: `bus-${s}`,
        kind: 'bus_stop',
        x: pick([-1, 1]) * 4.5,
        z: zBase - rand(5, 12),
        w: 1.8,
        h: 2.8,
        d: 0.8,
        color: '#64748b',
      });
    }

    const coverCount = 2 + Math.floor(level / 2) + (feature === 'plaza' ? 1 : 0);
    const coverKinds: PropKind[] = ['crate', 'rock', 'wall', 'barrel', 'car', 'dumpster'];
    for (let p = 0; p < coverCount; p++) {
      const kind = pick(coverKinds);
      const lane = pick([-2.4, 0, 2.4]);
      const x = lane + rand(-0.35, 0.35);
      const z = zBase - rand(4, SEGMENT_LEN - 3);
      const scale = kind === 'rock' ? rand(0.75, 1.25) : rand(0.9, 1.4);
      props.push({
        id: `p-${s}-${p}`,
        kind,
        x, z,
        w: scale * (kind === 'wall' ? 2.8 : kind === 'car' ? 1.8 : kind === 'dumpster' ? 1.6 : 1.2),
        h: scale * (kind === 'wall' ? 2 : kind === 'rock' ? 1.1 : kind === 'car' ? 1.4 : kind === 'dumpster' ? 1.5 : 1.3),
        d: scale * (kind === 'wall' ? 0.55 : kind === 'car' ? 2.5 : kind === 'dumpster' ? 1.4 : 1.2),
        isCover: true,
      });
    }

    const sidewalkProps: PropKind[] = ['hydrant', 'trash', 'bench', 'tree'];
    for (let sp = 0; sp < 3; sp++) {
      const kind = pick(sidewalkProps);
      const side = pick([-1, 1]);
      props.push({
        id: `sw-${s}-${sp}`,
        kind,
        x: side * rand(5.8, 7.5),
        z: zBase - rand(2, SEGMENT_LEN - 2),
        w: kind === 'bench' ? 1.4 : 0.5,
        h: kind === 'tree' ? rand(2.5, 4) : kind === 'bench' ? 0.9 : kind === 'hydrant' ? 0.9 : 1,
        d: kind === 'bench' ? 0.5 : 0.5,
        isCover: kind === 'trash' || kind === 'dumpster',
      });
    }

    if (Math.random() < 0.35) {
      decorations.push({
        id: `scaffold-${s}`,
        kind: 'scaffold',
        x: pick([-1, 1]) * rand(6.5, 8.5),
        z: zBase - rand(4, 10),
        w: rand(2, 3.5),
        h: rand(4, 7),
        d: rand(1.5, 2.5),
        color: '#78716c',
      });
    }

    if (tier !== 'day' && Math.random() < 0.4) {
      decorations.push({
        id: `puddle-${s}`,
        kind: 'puddle',
        x: rand(-2, 2),
        z: zBase - rand(6, SEGMENT_LEN - 5),
        w: rand(0.8, 2.2),
        h: 0.04,
        d: rand(0.8, 2.2),
        color: PALETTE[tier].water,
      });
    }
  }

  for (let a = 0; a < agentsForLevel(level); a++) {
    agents.push({
      id: `a-${a}`,
      x: [-2.4, 0, 2.4][a % 3],
      z: -rand(12, length - 12),
      angle: -Math.PI / 2,
      sweep: rand(0.35, 0.75) * (Math.random() < 0.5 ? 1 : -1),
      state: 'patrol',
      alertTimer: 0,
      speed: 2.5 + level * 0.35,
    });
  }

  return {
    level,
    tier,
    segments,
    length,
    buildings,
    props,
    decorations,
    segmentMeta,
    agents,
    portalZ: -(length - 8),
    startZ: -2,
    flavor: tier === 'day'
      ? 'Dense street sector — dodge the spotlight.'
      : tier === 'dusk'
        ? 'Rain-slick alleys — lamps are hunting.'
        : 'Neon night yard — stay in the dark.',
  };
}
