import type { CharacterConfig } from './types';

import explorerSprite from '@/assets/depth-watch/characters/player_explorer.png';
import skaterSprite from '@/assets/depth-watch/characters/player_skater.png';
import scoutSprite from '@/assets/depth-watch/characters/player_scout.png';

/** Add a character: drop sprite + one entry here — no other code changes. */
export const DEPTH_WATCH_CHARACTERS: CharacterConfig[] = [
  {
    id: 'explorer',
    name: 'Explorer',
    tagline: 'Default operative — balanced movement.',
    spriteSrc: explorerSprite,
    unlock: { type: 'free' },
  },
  {
    id: 'scout',
    name: 'Scout',
    tagline: 'Street-smart runner. +5% move speed.',
    spriteSrc: scoutSprite,
    unlock: { type: 'level', level: 3 },
    speedMultiplier: 1.05,
  },
  {
    id: 'skater',
    name: 'Courier',
    tagline: 'Quick on her feet. −10% cloak cooldown.',
    spriteSrc: skaterSprite,
    unlock: { type: 'level', level: 5 },
    cloakCooldownMultiplier: 0.9,
  },
];

export function getCharacterById(id: string): CharacterConfig | undefined {
  return DEPTH_WATCH_CHARACTERS.find((c) => c.id === id);
}

export function unlockLabel(rule: CharacterConfig['unlock']): string {
  if (rule.type === 'free') return 'Unlocked';
  if (rule.type === 'level') return `Reach Sector ${rule.level}`;
  return rule.label;
}

export function isCharacterUnlocked(
  rule: CharacterConfig['unlock'],
  bestLevel: number,
  unlockedIds: Set<string>,
  characterId: string,
): boolean {
  if (unlockedIds.has(characterId)) return true;
  if (rule.type === 'free') return true;
  if (rule.type === 'level') return bestLevel >= rule.level;
  return false;
}
