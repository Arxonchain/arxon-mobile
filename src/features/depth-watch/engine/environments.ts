import type { EnvironmentTier, EnvironmentTierId } from './types';

import tier1Bg from '@/assets/depth-watch/environments/tier1/tier1_bright_day_RAW.jpg';
import tier1bBg from '@/assets/depth-watch/environments/tier1b/tier1b_dusk_transition_RAW.png';
import tier2Bg from '@/assets/depth-watch/environments/tier2/tier2_dark_railyard_RAW.png';
import tier2bBg from '@/assets/depth-watch/environments/tier2b/tier2b_dark_station_RAW.jpg';
import { TIER_THRESHOLDS } from './constants';

export const ENVIRONMENT_TIERS: Record<EnvironmentTierId, EnvironmentTier> = {
  tier1: {
    id: 'tier1',
    label: 'Open Sector',
    ambientTint: 'rgba(255, 240, 210, 0.08)',
    particleKind: 'dust',
    visibilityModifier: 1,
    backgroundSrc: tier1Bg,
    levelRange: TIER_THRESHOLDS.tier1,
  },
  tier1b: {
    id: 'tier1b',
    label: 'Dusk Watch',
    ambientTint: 'rgba(255, 160, 90, 0.12)',
    particleKind: 'dust',
    visibilityModifier: 0.92,
    backgroundSrc: tier1bBg,
    levelRange: TIER_THRESHOLDS.tier1b,
  },
  tier2: {
    id: 'tier2',
    label: 'Rail Yard',
    ambientTint: 'rgba(255, 120, 40, 0.06)',
    particleKind: 'fog',
    visibilityModifier: 0.85,
    backgroundSrc: tier2Bg,
    levelRange: TIER_THRESHOLDS.tier2,
  },
  tier2b: {
    id: 'tier2b',
    label: 'Fog Station',
    ambientTint: 'rgba(80, 160, 180, 0.1)',
    particleKind: 'rain',
    visibilityModifier: 0.72,
    backgroundSrc: tier2bBg,
    levelRange: TIER_THRESHOLDS.tier2b,
  },
};

const FLAVOR: Record<EnvironmentTierId, string[]> = {
  tier1: ['Compliance Units sweep the bright blocks.', 'Stay out of the Ledger\'s sight lines.'],
  tier1b: ['Streetlamps flicker on. Watchers tighten their arcs.', 'The anchor tower sees everything at dusk.'],
  tier2: ['Sodium light only. Agents own the shadows.', 'Route around the security towers.'],
  tier2b: ['Fog eats distance. Timing beats speed.', 'The Ledger never sleeps in the station.'],
};

export function getTierForLevel(level: number): EnvironmentTierId {
  if (level <= TIER_THRESHOLDS.tier1[1]) return 'tier1';
  if (level <= TIER_THRESHOLDS.tier1b[1]) return 'tier1b';
  if (level <= TIER_THRESHOLDS.tier2[1]) return 'tier2';
  return 'tier2b';
}

export function getEnvironmentForLevel(level: number): EnvironmentTier {
  return ENVIRONMENT_TIERS[getTierForLevel(level)];
}

export function getLevelFlavor(level: number): string {
  const tier = getTierForLevel(level);
  const lines = FLAVOR[tier];
  return lines[(level - 1) % lines.length];
}
