import type { ForgeSettings } from '../hooks/useForgeSettings';
import type { MusicTrackId } from '../hooks/useForgeSettings';

let ctx: AudioContext | null = null;
let audioEl: HTMLAudioElement | null = null;
let currentTrackId: string | null = null;
let ducking = false;
let settings: ForgeSettings = {
  sfx: true, music: true, musicTrack: 'energy',
  sfxVolume: 0.85, musicVolume: 0.45, haptics: true,
};

const TRACK_URLS: Record<MusicTrackId, () => Promise<{ default: string }>> = {
  energy: () => import('@/assets/word-forge/audio/track-energy.mp3'),
  drift: () => import('@/assets/word-forge/audio/track-drift.mp3'),
  playtime: () => import('@/assets/word-forge/audio/track-playtime.mp3'),
};

export const FORGE_MUSIC_TRACKS = [
  { id: 'energy' as const, label: 'Energy Pulse', subtitle: 'Sport beat' },
  { id: 'drift' as const, label: 'Drift Circuit', subtitle: 'Synth drive' },
  { id: 'playtime' as const, label: 'Play Time', subtitle: 'Upbeat fun' },
];

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) { try { ctx = new AudioContext(); } catch { return null; } }
  return ctx;
}

async function resume(): Promise<AudioContext | null> {
  const c = getCtx();
  if (!c) return null;
  if (c.state === 'suspended') await c.resume();
  return c;
}

export function setForgeAudioSettings(s: ForgeSettings): void {
  const prevMusic = settings.music;
  const prevTrack = settings.musicTrack;
  settings = s;
  if (!s.music) { stopMusic(); return; }
  if (audioEl) audioEl.volume = ducking ? s.musicVolume * 0.4 : s.musicVolume;
  if (!prevMusic || prevTrack !== s.musicTrack) void startMusic();
}

function vol(base: number): number { return base * settings.sfxVolume; }

function tone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15, ramp?: { end: number; at: number }): void {
  if (!settings.sfx) return;
  const c = getCtx();
  if (!c) return;
  void resume();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (ramp) osc.frequency.exponentialRampToValueAtTime(ramp.end, c.currentTime + ramp.at);
  gain.gain.setValueAtTime(vol(volume), c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration + 0.02);
}

export function playTap(): void { tone(520, 0.05, 'sine', 0.08); }
export function playClear(): void { tone(320, 0.06, 'triangle', 0.06); }
export function playSubmit(): void {
  if (!settings.sfx) return;
  tone(660, 0.08, 'sine', 0.14, { end: 990, at: 0.06 });
  window.setTimeout(() => tone(880, 0.1, 'sine', 0.1), 60);
}
export function playBonus(): void {
  if (!settings.sfx) return;
  [523, 659, 784, 1047].forEach((f, i) => window.setTimeout(() => tone(f, 0.18, 'triangle', 0.12), i * 70));
}
export function playError(): void { tone(180, 0.15, 'sawtooth', 0.08, { end: 120, at: 0.1 }); }
export function playTick(): void { tone(440, 0.04, 'square', 0.05); }
export function playHint(): void { tone(740, 0.12, 'sine', 0.1, { end: 980, at: 0.08 }); }
export function playShuffle(): void { tone(280, 0.08, 'triangle', 0.08); window.setTimeout(() => tone(420, 0.08, 'triangle', 0.07), 80); }
export function playStreak(): void {
  if (!settings.sfx) return;
  [660, 880, 1100].forEach((f, i) => window.setTimeout(() => tone(f, 0.1, 'sine', 0.1), i * 60));
}
export function playLevelWin(): void {
  if (!settings.sfx) return;
  [392, 494, 587, 784].forEach((f, i) => window.setTimeout(() => tone(f, 0.22, 'triangle', 0.11), i * 90));
}
export function playLevelFail(): void { tone(220, 0.25, 'sine', 0.1, { end: 160, at: 0.2 }); }

export function playCoinCredit(): void {
  if (!settings.sfx) return;
  const c = getCtx();
  if (!c) return;
  void resume();
  const t = c.currentTime;
  const ding = c.createOscillator();
  const dingGain = c.createGain();
  ding.type = 'sine';
  ding.frequency.setValueAtTime(880, t);
  dingGain.gain.setValueAtTime(vol(0.18), t);
  dingGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  ding.connect(dingGain);
  dingGain.connect(c.destination);
  ding.start(t);
  ding.stop(t + 0.16);
  window.setTimeout(() => tone(660, 0.05, 'square', 0.06), 80);
}

export function duckMusic(): void {
  ducking = true;
  if (audioEl) audioEl.volume = settings.musicVolume * 0.35;
}

export function restoreMusic(): void {
  ducking = false;
  if (audioEl) audioEl.volume = settings.musicVolume;
}

export async function startMusic(): Promise<void> {
  if (!settings.music) return;
  const trackId = settings.musicTrack;
  if (audioEl && currentTrackId === trackId) {
    audioEl.volume = ducking ? settings.musicVolume * 0.35 : settings.musicVolume;
    if (audioEl.paused) { try { await audioEl.play(); } catch { /* gesture */ } }
    return;
  }
  stopMusic();
  const mod = await TRACK_URLS[trackId]();
  audioEl = new Audio(mod.default);
  currentTrackId = trackId;
  audioEl.loop = true;
  audioEl.volume = settings.musicVolume;
  try { await audioEl.play(); } catch { /* gesture */ }
}

export function stopMusic(): void {
  if (audioEl) {
    audioEl.pause();
    audioEl.src = '';
    audioEl = null;
    currentTrackId = null;
  }
}

export function unlockAudio(): void { void resume(); }
