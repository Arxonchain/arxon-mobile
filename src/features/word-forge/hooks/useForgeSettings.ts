export interface ForgeSettings {
  sfx: boolean;
  music: boolean;
}

const KEY = 'word-forge-settings';

const DEFAULT: ForgeSettings = { sfx: true, music: true };

export function loadForgeSettings(): ForgeSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<ForgeSettings>;
    return { sfx: parsed.sfx ?? true, music: parsed.music ?? true };
  } catch {
    return DEFAULT;
  }
}

export function saveForgeSettings(s: ForgeSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}
