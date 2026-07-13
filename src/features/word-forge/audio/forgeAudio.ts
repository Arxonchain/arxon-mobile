import type { ForgeSettings } from '../hooks/useForgeSettings';
import { FORGE_MUSIC_TRACKS, trackById } from '../data/audioTracks';

let ctx: AudioContext | null = null;
let audioEl: HTMLAudioElement | null = null;
let settings: ForgeSettings = {
  sfx: true, music: true, musicTrack: 'energy',
  sfxVolume: 0.85, musicVolume: 0.45, haptics: true,
};

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try { ctx = new AudioContext(); } catch { return null; }
  }
  return ctx;
}

async function resume(): Promise<AudioContext | null> {
  const c = getCtx();
  if (!c) return null;
  if (c.state === 'suspended') await c.resume();
  return c;
}

export function setForgeAudioSettings(s: ForgeSettings): void {
  const prevTrack = settings.musicTrack;
  settings = s;
  if (audioEl) audioEl.volume = s.musicVolume;
  if (!s.music) {
    stopMusic();
    return;
  }
  if (audioEl && prevTrack !== s.musicTrack) void startMusic();
}

function vol(base: number): number {
  return base * settings.sfxVolume;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.15,
  ramp?: { end: number; at: number },
): void {
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
  [523, 659, 784, 1047].forEach((f, i) => {
    window.setTimeout(() => tone(f, 0.18, 'triangle', 0.12), i * 70);
  });
}

export function playError(): void {
  tone(180, 0.15, 'sawtooth', 0.08, { end: 120, at: 0.1 });
}

export function playTick(): void { tone(440, 0.04, 'square', 0.05); }

export function playLevelWin(): void {
  if (!settings.sfx) return;
  [392, 494, 587, 784].forEach((f, i) => {
    window.setTimeout(() => tone(f, 0.22, 'triangle', 0.11), i * 90);
  });
}

export function playLevelFail(): void {
  tone(220, 0.25, 'sine', 0.1, { end: 160, at: 0.2 });
}

/** Cash-register style cha-ching when ARX-P credits */
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
  ding.frequency.exponentialRampToValueAtTime(1320, t + 0.06);
  dingGain.gain.setValueAtTime(vol(0.18), t);
  dingGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  ding.connect(dingGain);
  dingGain.connect(c.destination);
  ding.start(t);
  ding.stop(t + 0.16);

  const coin = c.createOscillator();
  const coinGain = c.createGain();
  coin.type = 'triangle';
  coin.frequency.setValueAtTime(2100, t + 0.05);
  coin.frequency.exponentialRampToValueAtTime(1600, t + 0.12);
  coinGain.gain.setValueAtTime(0, t);
  coinGain.gain.linearRampToValueAtTime(vol(0.12), t + 0.05);
  coinGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  coin.connect(coinGain);
  coinGain.connect(c.destination);
  coin.start(t + 0.05);
  coin.stop(t + 0.24);

  window.setTimeout(() => tone(660, 0.05, 'square', 0.06), 80);
}

export async function startMusic(): Promise<void> {
  if (!settings.music) return;
  stopMusic();
  const track = trackById(settings.musicTrack);
  audioEl = new Audio(track.src);
  audioEl.loop = true;
  audioEl.volume = settings.musicVolume;
  try {
    await audioEl.play();
  } catch { /* needs user gesture */ }
}

export function stopMusic(): void {
  if (audioEl) {
    audioEl.pause();
    audioEl.src = '';
    audioEl = null;
  }
}

export function unlockAudio(): void {
  void resume();
}

export { FORGE_MUSIC_TRACKS };
