import type { SciFiAssetId } from '../three/environment/scifiAssets';

export const FLOOR_Y = 0.28;

export interface PiecePlacement {
  key: string;
  asset: SciFiAssetId;
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number, number];
}

export interface StreetZone {
  key: string;
  position: [number, number, number];
  size: [number, number];
  color: string;
}

/** Connected compound routes — plaza, corners, alleys, spurs (not endless). */
export const STREET_ZONES: StreetZone[] = [
  { key: 'plaza', position: [0, 0], size: [20, 20], color: '#5a6570' },
  { key: 'ave-ns', position: [0, 0], size: [9, 54], color: '#4a5568' },
  { key: 'ave-ew', position: [0, 0], size: [54, 9], color: '#4a5568' },
  { key: 'corner-sw', position: [-6, -6], size: [8, 8], color: '#4d5864' },
  { key: 'corner-se', position: [6, -6], size: [8, 8], color: '#4d5864' },
  { key: 'alley-west', position: [-12, -10], size: [14, 7], color: '#44515f' },
  { key: 'alley-east', position: [12, -10], size: [14, 7], color: '#44515f' },
  { key: 'spur-nw', position: [-14, 8], size: [7, 22], color: '#3d4a56' },
  { key: 'spur-ne', position: [14, 8], size: [7, 18], color: '#3d4a56' },
  { key: 'vault-road', position: [16, -18], size: [12, 10], color: '#44515f' },
  { key: 'market-pad', position: [-18, -14], size: [12, 11], color: '#4a5568' },
  { key: 'command-pad', position: [18, -14], size: [12, 11], color: '#4a5568' },
  { key: 'hab-pad', position: [-18, 14], size: [12, 11], color: '#4a5568' },
  { key: 'social-pad', position: [18, 16], size: [12, 11], color: '#4a5568' },
];

function blockBuildings(): PiecePlacement[] {
  const lots: { key: string; cx: number; cz: number; w: number; d: number; h: number; windows: boolean }[] = [
    { key: 'market', cx: -18, cz: -14, w: 10, d: 9, h: 3.8, windows: false },
    { key: 'command', cx: 18, cz: -14, w: 9, d: 9, h: 4.2, windows: true },
    { key: 'hab', cx: -18, cz: 14, w: 9, d: 9, h: 3.5, windows: false },
    { key: 'social', cx: 18, cz: 16, w: 10, d: 9, h: 3.8, windows: true },
    { key: 'shop', cx: -18, cz: 0, w: 8, d: 7, h: 3.2, windows: false },
    { key: 'clinic', cx: 18, cz: 0, w: 8, d: 7, h: 3.4, windows: true },
  ];

  const pieces: PiecePlacement[] = [];
  for (const lot of lots) {
    const { cx, cz, w, d, h, windows, key } = lot;
    const hw = w / 2;
    const hd = d / 2;
    const wall: SciFiAssetId = windows ? 'WallAstra_Straight_Window' : 'WallAstra_Straight_Flat';

    pieces.push(
      { key: `${key}-n`, asset: wall, position: [cx, 0, cz + hd], rotation: [0, Math.PI / 2, 0], size: [1.2, h, w] },
      { key: `${key}-s`, asset: wall, position: [cx, 0, cz - hd], rotation: [0, -Math.PI / 2, 0], size: [1.2, h, w] },
      { key: `${key}-w`, asset: wall, position: [cx - hw, 0, cz], size: [1.2, h, d] },
      { key: `${key}-e`, asset: wall, position: [cx + hw, 0, cz], rotation: [0, Math.PI, 0], size: [1.2, h, d] },
      { key: `${key}-roof`, asset: 'Platform_DarkPlates', position: [cx, h, cz], size: [w + 0.3, 0.22, d + 0.3] },
    );
    if (windows) {
      pieces.push({
        key: `${key}-door`,
        asset: 'Door_Metal',
        position: [cx, 0, cz + hd + 0.05],
        rotation: [0, Math.PI / 2, 0],
        size: [2, h, 0.12],
      });
    }
  }
  return pieces;
}

export const CITY_PIECES: PiecePlacement[] = [
  { key: 'plaza-floor', asset: 'Platform_Metal', position: [0, 0, 0], size: [20, 0.28, 20] },
  { key: 'market-pad', asset: 'Platform_3Plates', position: [-18, 0, -14], size: [12, 0.22, 11] },
  { key: 'command-pad', asset: 'Platform_DarkPlates', position: [18, 0, -14], size: [12, 0.22, 11] },
  ...blockBuildings(),
  { key: 'mk-crate-1', asset: 'Prop_Crate3', position: [-12, 0, -8], size: [1, 1, 1] },
  { key: 'mk-crate-2', asset: 'Prop_Crate4', position: [-10, 0, -11], size: [1.05, 1.05, 1.05] },
  { key: 'mk-barrel-1', asset: 'Prop_Barrel_Large', position: [-14, 0, -6], size: [0.55, 1.1, 0.55] },
  { key: 'cmd-crate-1', asset: 'Prop_Crate4', position: [14, 0, -10], size: [1.05, 1.05, 1.05] },
  { key: 'cmd-barrel-1', asset: 'Prop_Barrel_Large', position: [12, 0, -16], size: [0.55, 1.1, 0.55] },
  { key: 'crate-a', asset: 'Prop_Crate3', position: [-4, 0, 4], size: [1, 1, 1] },
  { key: 'crate-b', asset: 'Prop_Crate4', position: [5, 0, 2], size: [1.05, 1.05, 1.05] },
  { key: 'light-1', asset: 'Prop_Light_Floor', position: [-3, 0, 3], size: [0.8, 0.18, 0.8] },
  { key: 'light-2', asset: 'Prop_Light_Floor', position: [3, 0, -3], size: [0.8, 0.18, 0.8] },
  { key: 'light-3', asset: 'Prop_Light_Floor', position: [0, 0, -6], size: [0.8, 0.18, 0.8] },
  { key: 'light-vault', asset: 'Prop_Light_Floor', position: [16, 0, -18], size: [0.8, 0.18, 0.8] },
  { key: 'vent-cmd', asset: 'Prop_Vent_Small', position: [18, 4.3, -14], size: [1.8, 0.2, 1.2] },
];
