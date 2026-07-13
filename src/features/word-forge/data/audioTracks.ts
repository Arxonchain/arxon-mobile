import trackEnergy from '@/assets/word-forge/audio/track-energy.mp3';
import trackDrift from '@/assets/word-forge/audio/track-drift.mp3';
import trackPlaytime from '@/assets/word-forge/audio/track-playtime.mp3';
import type { MusicTrackId } from '../hooks/useForgeSettings';

export interface ForgeMusicTrack {
  id: MusicTrackId;
  label: string;
  subtitle: string;
  src: string;
}

export const FORGE_MUSIC_TRACKS: ForgeMusicTrack[] = [
  { id: 'energy', label: 'Energy Pulse', subtitle: 'Sport beat', src: trackEnergy },
  { id: 'drift', label: 'Drift Circuit', subtitle: 'Synth drive', src: trackDrift },
  { id: 'playtime', label: 'Play Time', subtitle: 'Upbeat fun', src: trackPlaytime },
];

export function trackById(id: MusicTrackId): ForgeMusicTrack {
  return FORGE_MUSIC_TRACKS.find((t) => t.id === id) ?? FORGE_MUSIC_TRACKS[0];
}
