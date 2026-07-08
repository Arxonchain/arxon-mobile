import { useGLTF } from '@react-three/drei';

import playerWalkGlb from '@/assets/depth-watch/models/player-walk.glb?url';
import playerRunGlb from '@/assets/depth-watch/models/player-run.glb?url';
import agentIdleGlb from '@/assets/depth-watch/models/agent-idle.glb?url';
import agentTorchWalkGlb from '@/assets/depth-watch/models/agent-torch-walk.glb?url';
import agentTorchRunGlb from '@/assets/depth-watch/models/agent-torch-run.glb?url';

export interface CharacterClipSet {
  idle: string;
  walk: string;
  run: string;
}

export const PLAYER_CLIPS: CharacterClipSet = {
  idle: playerWalkGlb,
  walk: playerWalkGlb,
  run: playerRunGlb,
};

export const AGENT_CLIPS: CharacterClipSet = {
  idle: agentIdleGlb,
  walk: agentTorchWalkGlb,
  run: agentTorchRunGlb,
};

export function preloadDepthWatchModels(): void {
  useGLTF.preload(PLAYER_CLIPS.walk);
  useGLTF.preload(PLAYER_CLIPS.run);
  useGLTF.preload(AGENT_CLIPS.idle);
  useGLTF.preload(AGENT_CLIPS.walk);
  useGLTF.preload(AGENT_CLIPS.run);
}
