import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ArrowLeft } from 'lucide-react';
import { DepthWatchScene, type HudSnapshot } from './three/DepthWatchScene';
import { activateCloak3D, createGameState, type GameState3D, type Input3D } from './three/gameState';
import SubwayHUD from './ui/SubwayHUD';
import Joystick from './ui/Joystick';
import CloakButton from './ui/CloakButton';
import { saveDepthWatchRun, unlockCharacter } from './data/supabaseScores';
import { DEPTH_WATCH_CHARACTERS } from './data/characters';
import { useAuth } from '@/contexts/AuthContext';

interface GameScreen3DProps {
  characterId: string;
  onExit: () => void;
}

type Phase = 'menu' | 'playing' | 'caught' | 'won';

export default function GameScreen3D({ characterId, onExit }: GameScreen3DProps) {
  const { user } = useAuth();
  const gameRef = useRef<GameState3D>(createGameState(1, characterId));
  const inputRef = useRef<Input3D>({ x: 0, y: 0 });
  const [phase, setPhase] = useState<Phase>('menu');
  const [hud, setHud] = useState<HudSnapshot>({
    level: 1, elapsed: 0, exposure: 0, cloakActive: false, cloakCooldown: 0, hiding: false, running: false,
  });

  const startRun = useCallback(() => {
    gameRef.current = createGameState(1, characterId);
    inputRef.current = { x: 0, y: 0 };
    setPhase('playing');
  }, [characterId]);

  const persistRun = useCallback(async (level: number, seconds: number) => {
    if (!user) return;
    await saveDepthWatchRun(user.id, level, seconds, characterId);
    for (const c of DEPTH_WATCH_CHARACTERS) {
      if (c.unlock.type === 'level' && level >= c.unlock.level) {
        await unlockCharacter(user.id, c.id);
      }
    }
  }, [user, characterId]);

  const handleEnd = useCallback((result: 'caught' | 'won') => {
    const s = gameRef.current;
    if (result === 'caught') {
      setPhase('caught');
      void persistRun(s.level, s.elapsed);
    } else {
      const next = s.level + 1;
      if (next > 3) {
        setPhase('won');
        void persistRun(s.level, s.elapsed);
      } else {
        gameRef.current = createGameState(next, characterId);
        gameRef.current.elapsed = s.elapsed;
        setPhase('playing');
      }
    }
  }, [characterId, persistRun]);

  useEffect(() => {
    gameRef.current.characterId = characterId;
  }, [characterId]);

  const playing = phase === 'playing';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0a1018',
      fontFamily: "'Creato Display',system-ui,sans-serif", touchAction: 'none',
    }}>
      {playing && (
        <Canvas shadows camera={{ position: [0, 8, 12], fov: 52, near: 0.1, far: 150 }} style={{ touchAction: 'none' }}>
          <Suspense fallback={null}>
            <DepthWatchScene
              gameRef={gameRef}
              inputRef={inputRef}
              onHud={setHud}
              onEnd={handleEnd}
            />
          </Suspense>
        </Canvas>
      )}

      {playing && (
        <>
          <SubwayHUD
            level={hud.level}
            elapsed={hud.elapsed}
            exposure={hud.exposure}
            hiding={hud.hiding}
            running={hud.running}
            onBack={onExit}
          />
          <Joystick
            disabled={false}
            onMove={(x, y) => { inputRef.current = { x, y }; }}
          />
          <CloakButton
            active={hud.cloakActive}
            cooldown={hud.cloakCooldown}
            onActivate={() => activateCloak3D(gameRef.current)}
          />
        </>
      )}

      {phase === 'menu' && (
        <Overlay title="DEPTH WATCH" subtitle="Auto-run stealth — swipe lanes, duck behind cover, reach the portal." action="START RUN" onAction={startRun} onBack={onExit} />
      )}
      {phase === 'caught' && (
        <Overlay title="EXPOSED!" subtitle={`Sector ${hud.level} — the Ledger got you.`} action="TRY AGAIN" onAction={startRun} onBack={onExit} danger />
      )}
      {phase === 'won' && (
        <Overlay title="EXTRACTED!" subtitle="Clean run. More sectors coming soon." action="PLAY AGAIN" onAction={startRun} onBack={onExit} />
      )}
    </div>
  );
}

function Overlay({ title, subtitle, action, onAction, onBack, danger }: {
  title: string; subtitle: string; action: string; onAction: () => void; onBack: () => void; danger?: boolean;
}) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 30,
      background: 'linear-gradient(180deg,rgba(10,16,24,0.92),rgba(0,0,0,0.88))',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28,
    }}>
      <button type="button" onClick={onBack} style={{
        position: 'absolute', top: 16, left: 16, background: 'none', border: 'none', cursor: 'pointer',
      }}>
        <ArrowLeft size={24} color="#fff" />
      </button>
      <h1 style={{
        fontSize: 32, fontWeight: 900, margin: '0 0 10px',
        color: danger ? '#ff6b4a' : '#7FE7C4',
        textShadow: '0 3px 0 rgba(0,0,0,0.4)',
      }}>{title}</h1>
      <p style={{ color: '#e2e8f0', textAlign: 'center', lineHeight: 1.5, marginBottom: 28 }}>{subtitle}</p>
      <button type="button" onClick={onAction} style={{
        padding: '16px 40px', borderRadius: 28, border: '3px solid #fff',
        background: 'linear-gradient(180deg,#ff6b35,#e8542a)', boxShadow: '0 6px 0 #b8381a',
        color: '#fff', fontSize: 16, fontWeight: 900, cursor: 'pointer',
      }}>{action}</button>
    </div>
  );
}
