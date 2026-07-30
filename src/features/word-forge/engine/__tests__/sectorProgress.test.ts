import { describe, it, expect } from 'vitest';
import {
  canSelectSector,
  clampCampaignLevel,
  frontierLevel,
  isSectorUnlocked,
  maxUnlockedLevel,
  sectorMapState,
} from '../sectorProgress';

describe('sectorProgress', () => {
  it('treats bestLevel as highest unlocked sector', () => {
    expect(maxUnlockedLevel(4)).toBe(4);
    expect(isSectorUnlocked(4, 4)).toBe(true);
    expect(isSectorUnlocked(5, 4)).toBe(false);
  });

  it('maps sector nodes with linear lock rule', () => {
    expect(sectorMapState(5, 4)).toBe('locked');
    expect(sectorMapState(4, 4)).toBe('frontier');
    expect(sectorMapState(3, 4)).toBe('cleared');
    expect(sectorMapState(1, 4)).toBe('cleared');
  });

  it('blocks selecting sectors beyond earned progress', () => {
    expect(canSelectSector(5, 4)).toBe(false);
    expect(canSelectSector(4, 4)).toBe(true);
    expect(canSelectSector(2, 4)).toBe(true);
  });

  it('clamps tampered campaign levels to unlocked range', () => {
    expect(clampCampaignLevel(99, 4)).toBe(4);
    expect(clampCampaignLevel(0, 4)).toBe(1);
    expect(clampCampaignLevel(3, 4)).toBe(3);
  });

  it('frontier is the next sector to clear', () => {
    expect(frontierLevel({ bestLevel: 4 })).toBe(4);
    expect(frontierLevel({ bestLevel: 1 })).toBe(1);
  });
});
