export interface ShapeTemplate {
  id: string;
  tier: 1 | 2 | 3;
  label: string;
  positions: { x: number; y: number }[];
}

function ring(n: number, radius = 1): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  for (let i = 0; i < n - 1; i++) {
    const a = (i / (n - 1)) * Math.PI * 2 - Math.PI / 2;
    pts.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius });
  }
  return pts;
}

function cluster(): { x: number; y: number }[] {
  return [
    { x: 0, y: 0 },
    { x: -0.55, y: -0.35 },
    { x: 0.55, y: -0.35 },
    { x: -0.55, y: 0.35 },
    { x: 0.55, y: 0.35 },
    { x: 0, y: -0.75 },
    { x: 0, y: 0.75 },
  ];
}

function honeycomb(): { x: number; y: number }[] {
  const hex: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  const r = 0.55;
  for (let ringIdx = 1; ringIdx <= 2; ringIdx++) {
    for (let i = 0; i < 6 * ringIdx; i++) {
      const a = (i / (6 * ringIdx)) * Math.PI * 2;
      hex.push({ x: Math.cos(a) * r * ringIdx, y: Math.sin(a) * r * ringIdx });
    }
  }
  return hex.slice(0, 14);
}

function star(): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 1 : 0.45;
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return pts;
}

function spiral(): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const a = i * 0.85;
    const r = 0.2 + i * 0.07;
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return pts;
}

function chain(): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    pts.push({
      x: -1 + t * 2,
      y: Math.sin(t * Math.PI * 1.5) * 0.55,
    });
  }
  return pts;
}

function lattice(): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const cols = 4;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < cols; col++) {
      if (pts.length >= 12) break;
      pts.push({
        x: (col - 1.5) * 0.55,
        y: (row - 1) * 0.55,
      });
    }
  }
  return pts;
}

function diamond(): { x: number; y: number }[] {
  return [
    { x: 0, y: 0 },
    { x: 0, y: -0.8 },
    { x: 0.65, y: -0.4 },
    { x: -0.65, y: -0.4 },
    { x: 0.8, y: 0 },
    { x: -0.8, y: 0 },
    { x: 0.65, y: 0.4 },
    { x: -0.65, y: 0.4 },
    { x: 0, y: 0.8 },
    { x: 0, y: -1.15 },
    { x: 0, y: 1.15 },
  ];
}

export const SHAPES: ShapeTemplate[] = [
  { id: 'ring', tier: 1, label: 'Ring', positions: ring(8) },
  { id: 'cluster', tier: 1, label: 'Cluster', positions: cluster() },
  { id: 'honeycomb', tier: 2, label: 'Honeycomb', positions: honeycomb() },
  { id: 'star', tier: 2, label: 'Star', positions: star() },
  { id: 'spiral', tier: 3, label: 'Spiral', positions: spiral() },
  { id: 'chain', tier: 3, label: 'Chain', positions: chain() },
  { id: 'lattice', tier: 3, label: 'Lattice', positions: lattice() },
  { id: 'diamond', tier: 3, label: 'Diamond', positions: diamond() },
];

export function shapesForTier(tier: 1 | 2 | 3): ShapeTemplate[] {
  return SHAPES.filter((s) => s.tier <= tier);
}
