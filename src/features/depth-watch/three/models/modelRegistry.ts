import { useGLTF } from '@react-three/drei';

import adventurerGlb from '@/assets/depth-watch/models/adventurer.glb?url';
import agentPirateGlb from '@/assets/depth-watch/models/agent-pirate.glb?url';
import agentMinifigGlb from '@/assets/depth-watch/models/agent-minifig.glb?url';

export const MODEL_URLS = {
  adventurer: adventurerGlb,
  agentPirate: agentPirateGlb,
  agentMinifig: agentMinifigGlb,
} as const;

export type ModelKey = keyof typeof MODEL_URLS;

export function playerModelKey(characterId: string): ModelKey {
  return 'adventurer';
}

export function agentModelKey(index: number): ModelKey {
  return index % 2 === 0 ? 'agentPirate' : 'agentMinifig';
}

export function preloadDepthWatchModels(): void {
  useGLTF.preload(MODEL_URLS.adventurer);
  useGLTF.preload(MODEL_URLS.agentPirate);
  useGLTF.preload(MODEL_URLS.agentMinifig);
}
