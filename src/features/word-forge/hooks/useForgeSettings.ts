export type MusicTrackId = 'energy' | 'drift' | 'playtime';

export interface ForgeSettings {
  sfx: boolean;
  music: boolean;
  musicTrack: MusicTrackId;
  sfxVolume: number;
  musicVolume: number;
  haptics: boolean;
}

const KEY = 'word-forge-settings';

const DEFAULT: ForgeSettings = {
  sfx: true,
  music: true,
  musicTrack: 'energy',
  sfxVolume: 0.85,
  musicVolume: 0.45,
  haptics: true,
};

export function loadForgeSettings(): ForgeSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<ForgeSettings>;
    return {
      sfx: parsed.sfx ?? DEFAULT.sfx,
      music: parsed.music ?? DEFAULT.music,
      musicTrack: parsed.musicTrack ?? DEFAULT.musicTrack,
      sfxVolume: parsed.sfxVolume ?? DEFAULT.sfxVolume,
      musicVolume: parsed.musicVolume ?? DEFAULT.musicVolume,
      haptics: parsed.haptics ?? DEFAULT.haptics,
    };
  } catch {
    return DEFAULT;
  }
}

export function saveForgeSettings(s: ForgeSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}
