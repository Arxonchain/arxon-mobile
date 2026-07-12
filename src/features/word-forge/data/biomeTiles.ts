import type { ThemeSkin } from './themes';

import tileRock from '@/assets/word-forge/tiles/tile-rock.png';
import tileWood from '@/assets/word-forge/tiles/tile-wood.png';
import tileAncient from '@/assets/word-forge/tiles/tile-ancient.png';
import tileCity from '@/assets/word-forge/tiles/tile-city.png';

export const BIOME_TILE_IMAGES: Record<ThemeSkin['biome'], string> = {
  rock: tileRock,
  wood: tileWood,
  ancient: tileAncient,
  city: tileCity,
};

export function tileImageForBiome(biome: ThemeSkin['biome']): string {
  return BIOME_TILE_IMAGES[biome];
}
