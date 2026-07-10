import wallStraight from '@/assets/depth-watch/environment/scifi/WallAstra_Straight.glb?url';
import wallWindow from '@/assets/depth-watch/environment/scifi/WallAstra_Straight_Window.glb?url';
import wallFlat from '@/assets/depth-watch/environment/scifi/WallAstra_Straight_Flat.glb?url';
import platformMetal from '@/assets/depth-watch/environment/scifi/Platform_Metal.glb?url';
import platform3Plates from '@/assets/depth-watch/environment/scifi/Platform_3Plates.glb?url';
import platformDark from '@/assets/depth-watch/environment/scifi/Platform_DarkPlates.glb?url';
import doorMetal from '@/assets/depth-watch/environment/scifi/Door_Metal.glb?url';
import crate3 from '@/assets/depth-watch/environment/scifi/Prop_Crate3.glb?url';
import crate4 from '@/assets/depth-watch/environment/scifi/Prop_Crate4.glb?url';
import barrel from '@/assets/depth-watch/environment/scifi/Prop_Barrel_Large.glb?url';
import lightFloor from '@/assets/depth-watch/environment/scifi/Prop_Light_Floor.glb?url';
import ventSmall from '@/assets/depth-watch/environment/scifi/Prop_Vent_Small.glb?url';

export type SciFiAssetId =
  | 'WallAstra_Straight'
  | 'WallAstra_Straight_Window'
  | 'WallAstra_Straight_Flat'
  | 'Platform_Metal'
  | 'Platform_3Plates'
  | 'Platform_DarkPlates'
  | 'Door_Metal'
  | 'Prop_Crate3'
  | 'Prop_Crate4'
  | 'Prop_Barrel_Large'
  | 'Prop_Light_Floor'
  | 'Prop_Vent_Small';

/** Native kit dimensions (metres) from pack manifest — used for tiling. */
export const SCIFI_NATIVE: Record<SciFiAssetId, { width: number; height: number; depth: number }> = {
  WallAstra_Straight: { width: 1.21, height: 3.03, depth: 4 },
  WallAstra_Straight_Window: { width: 0.5, height: 3, depth: 4 },
  WallAstra_Straight_Flat: { width: 0.1, height: 3, depth: 4 },
  Platform_Metal: { width: 4, height: 0.25, depth: 4 },
  Platform_3Plates: { width: 4, height: 0.25, depth: 4 },
  Platform_DarkPlates: { width: 4, height: 0.25, depth: 4 },
  Door_Metal: { width: 2.11, height: 4.05, depth: 0.1 },
  Prop_Crate3: { width: 1, height: 1, depth: 1 },
  Prop_Crate4: { width: 1.12, height: 1.12, depth: 1.12 },
  Prop_Barrel_Large: { width: 0.51, height: 1.1, depth: 0.53 },
  Prop_Light_Floor: { width: 1.33, height: 0.21, depth: 0.52 },
  Prop_Vent_Small: { width: 2, height: 0.2, depth: 1.24 },
};

export const SCIFI_URLS: Record<SciFiAssetId, string> = {
  WallAstra_Straight: wallStraight,
  WallAstra_Straight_Window: wallWindow,
  WallAstra_Straight_Flat: wallFlat,
  Platform_Metal: platformMetal,
  Platform_3Plates: platform3Plates,
  Platform_DarkPlates: platformDark,
  Door_Metal: doorMetal,
  Prop_Crate3: crate3,
  Prop_Crate4: crate4,
  Prop_Barrel_Large: barrel,
  Prop_Light_Floor: lightFloor,
  Prop_Vent_Small: ventSmall,
};

export const SCIFI_ASSET_IDS = Object.keys(SCIFI_URLS) as SciFiAssetId[];
