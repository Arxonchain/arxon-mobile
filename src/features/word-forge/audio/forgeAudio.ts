import type { ForgeSettings } from '../hooks/useForgeSettings';

let ctx: AudioContext | null = null;
let musicNodes: { oscs: OscillatorNode[]; gains: GainNode[]; lfo: OscillatorNode } | null = null;
let settings: ForgeSettings = { sfx: true, music: true };

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
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
  settings = s;
  if (!s.music) stopMusic();
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
  gain.gain.setValueAtTime(volume, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration + 0.02);
}

export function playTap(): void {
  tone(520, 0.05, 'sine', 0.08);
}

export function playClear(): void {
  tone(320, 0.06, 'triangle', 0.06);
}

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

export function playTick(): void {
  tone(440, 0.04, 'square', 0.05);
}

export function playLevelWin(): void {
  if (!settings.sfx) return;
  [392, 494, 587, 784].forEach((f, i) => {
    window.setTimeout(() => tone(f, 0.22, 'triangle', 0.11), i * 90);
  });
}

export function playLevelFail(): void {
  tone(220, 0.25, 'sine', 0.1, { end: 160, at: 0.2 });
}

export async function startMusic(): Promise<void> {
  if (!settings.music || musicNodes) return;
  const c = await resume();
  if (!c) return;

  const master = c.createGain();
  master.gain.value = 0.04;
  master.connect(c.destination);

  const freqs = [110, 164.81, 220, 277.18];
  const oscs: OscillatorNode[] = [];
  const gains: GainNode[] = [];

  freqs.forEach((f, i) => {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = i % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.value = f;
    g.gain.value = 0.15 / freqs.length;
    osc.connect(g);
    g.connect(master);
    osc.start();
    oscs.push(osc);
    gains.push(g);
  });

  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 0.08;
  lfoGain.gain.value = 0.015;
  lfo.connect(lfoGain);
  lfoGain.connect(master.gain);
  lfo.start();

  musicNodes = { oscs, gains, lfo };
}

export function stopMusic(): void {
  if (!musicNodes) return;
  const c = getCtx();
  musicNodes.oscs.forEach((o) => {
    try { o.stop(); } catch { /* already stopped */ }
  });
  try { musicNodes.lfo.stop(); } catch { /* */ }
  musicNodes = null;
  if (c) void c.suspend();
}

export function unlockAudio(): void {
  void resume();
}
