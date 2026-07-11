import { useCallback, useRef, useState } from 'react';
import { PreviewPlayScene, type PreviewHudState } from './PreviewPlayScene';
import { PreviewHUD } from './PreviewHUD';
import { createPreviewGameState } from './previewGame';
import { usePreviewInput } from './usePreviewInput';
import type { GameState3D } from '../three/gameState';
import Joystick from '../ui/Joystick';

const defaultHud = (): PreviewHudState => ({
  coins: 0,
  coinsRequired: 4,
  exposure: 0,
  elapsed: 0,
  sectorLeft: 120,
  running: false,
  hiding: false,
  phase: 'playing',
});

export default function DepthWatchPreviewPage() {
  const gameRef = useRef<GameState3D>(createPreviewGameState());
  const { inputRef, handleJoystick, resetInput } = usePreviewInput();
  const [hud, setHud] = useState<PreviewHudState>(defaultHud);

  const handleRestart = useCallback(() => {
    gameRef.current = createPreviewGameState();
    resetInput();
    setHud(defaultHud());
  }, [resetInput]);

  const handleEnd = useCallback((result: 'caught' | 'won') => {
    setHud((h) => ({ ...h, phase: result }));
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0a1018',
      fontFamily: "'Creato Display', system-ui, sans-serif",
      touchAction: 'none',
    }}>
      <PreviewPlayScene
        gameRef={gameRef}
        inputRef={inputRef}
        onHud={setHud}
        onEnd={handleEnd}
      />

      <PreviewHUD hud={hud} onRestart={handleRestart} />

      {hud.phase === 'playing' && (
        <Joystick disabled={false} onMove={handleJoystick} />
      )}
    </div>
  );
}
