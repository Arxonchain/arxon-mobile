import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ENVIRONMENT_TIERS } from './engine/environments';
import { loadDepthWatchAssets } from './engine/assetLoader';
import { generateLevel } from './engine/segmentGenerator';
import {
  activateCloak, initSnapshot, renderGame, updateGame, type GameSnapshot,
} from './engine/gameEngine';
import { LEVEL_TRANSITION_MS, EXPOSURE_MAX } from './engine/constants';
import { saveDepthWatchRun, unlockCharacter } from './data/supabaseScores';
import { DEPTH_WATCH_CHARACTERS } from './data/characters';
import Joystick from './ui/Joystick';
import CloakButton from './ui/CloakButton';
import ExposureMeter from './ui/ExposureMeter';

interface GameScreenProps {
  characterId: string;
  onExit: () => void;
}

type ScreenPhase = 'menu' | 'playing' | 'transition' | 'caught' | 'complete';

function formatTime(t: number): string {
  const m = Math.floor(t / 60).toString().padStart(2, '0');
  const s = Math.floor(t % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function GameScreen({ characterId, onExit }: GameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapRef = useRef<GameSnapshot | null>(null);
  const inputRef = useRef({ moveX: 0, moveY: 0 });
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const assetsRef = useRef<Awaited<ReturnType<typeof loadDepthWatchAssets>> | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const { user } = useAuth();

  const [screenPhase, setScreenPhase] = useState<ScreenPhase>('menu');
  const [hud, setHud] = useState({ level: 1, elapsed: 0, exposure: 0, cloakCd: 0, cloakActive: false });
  const [transitionText, setTransitionText] = useState('');
  const [caughtInfo, setCaughtInfo] = useState({ level: 1, time: 0 });

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maxW = Math.min(window.innerWidth, 480);
    const maxH = window.innerHeight;
    canvas.width = maxW;
    canvas.height = maxH;
    sizeRef.current = { w: maxW, h: maxH };
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    const bgs: Record<string, string> = {};
    for (const t of Object.values(ENVIRONMENT_TIERS)) bgs[t.id] = t.backgroundSrc;
    void loadDepthWatchAssets(bgs).then((a) => { assetsRef.current = a; });
    return () => window.removeEventListener('resize', resize);
  }, [resize]);

  const initLevel = useCallback((level: number, keepElapsed = false) => {
    const { w, h } = sizeRef.current;
    const layout = generateLevel(w, h, level);
    const snap = initSnapshot(level, layout, characterId, h);
    if (keepElapsed && snapRef.current) snap.elapsed = snapRef.current.elapsed;
    snapRef.current = snap;
    setHud((prev) => ({
      ...prev,
      level,
      exposure: 0,
      cloakCd: 0,
      cloakActive: false,
      elapsed: keepElapsed ? prev.elapsed : 0,
    }));
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

  const loop = useCallback((t: number) => {
    if (!lastRef.current) lastRef.current = t;
    const dt = Math.min(0.033, (t - lastRef.current) / 1000);
    lastRef.current = t;

    const snap = snapRef.current;
    const canvas = canvasRef.current;
    const assets = assetsRef.current;
    const ctx = canvas?.getContext('2d');

    if (snap && ctx && assets && canvas) {
      if (snap.phase === 'playing') {
        const result = updateGame(snap, inputRef.current, dt, canvas.width, canvas.height);
        setHud({
          level: snap.level,
          elapsed: snap.elapsed,
          exposure: snap.exposure,
          cloakCd: snap.cloak.cooldown,
          cloakActive: snap.cloak.active,
        });

        if (result.caught) {
          snap.phase = 'caught';
          setCaughtInfo({ level: snap.level, time: snap.elapsed });
          setScreenPhase('caught');
          void persistRun(snap.level, snap.elapsed);
        } else if (result.levelComplete) {
          snap.phase = 'transition';
          snap.transitionTimer = LEVEL_TRANSITION_MS / 1000;
          setTransitionText(`Sector ${snap.level} cleared — ${snap.layout.flavorText}`);
          setScreenPhase('transition');
        }
      } else if (snap.phase === 'transition') {
        snap.transitionTimer -= dt;
        if (snap.transitionTimer <= 0) {
          initLevel(snap.level + 1, true);
          setScreenPhase('playing');
        }
      }

      renderGame(ctx, snap, assets, canvas.width, canvas.height);
    }

    rafRef.current = requestAnimationFrame(loop);
  }, [initLevel, persistRun]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [loop]);

  const startRun = () => {
    lastRef.current = 0;
    initLevel(1, false);
    setScreenPhase('playing');
  };

  const retry = () => {
    lastRef.current = 0;
    initLevel(1, false);
    setScreenPhase('playing');
  };

  const playing = screenPhase === 'playing' || screenPhase === 'transition';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#06262E', overflow: 'hidden',
      fontFamily: "'Creato Display',system-ui,sans-serif", touchAction: 'none',
    }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }} />

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, padding: '14px 16px 10px',
        pointerEvents: 'none', zIndex: 10,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <button onClick={onExit} style={{ ...backBtn, pointerEvents: 'all' }}>
            <ArrowLeft size={18} color="hsl(215 35% 72%)" />
          </button>
          <div style={badge}>SECTOR {hud.level}</div>
          <div style={badge}>{formatTime(hud.elapsed)}</div>
        </div>
        {playing && <ExposureMeter exposure={hud.exposure} max={EXPOSURE_MAX} />}
      </div>

      {screenPhase === 'menu' && (
        <Overlay>
          <h1 style={title}>DEPTH WATCH</h1>
          <p style={sub}>Stay out of the light. Reach extraction.</p>
          <p style={{ ...sub, fontSize: 11, opacity: 0.7 }}>Compliance Units patrol every sector.</p>
          <ActionBtn onClick={startRun}>BEGIN RUN</ActionBtn>
        </Overlay>
      )}

      {screenPhase === 'caught' && (
        <Overlay>
          <h1 style={{ ...title, color: '#FF7B54' }}>EXPOSED</h1>
          <p style={sub}>Sector {caughtInfo.level} · {formatTime(caughtInfo.time)}</p>
          <p style={{ ...sub, fontSize: 11 }}>The Ledger logged your signal.</p>
          <ActionBtn onClick={retry}>TRY AGAIN</ActionBtn>
        </Overlay>
      )}

      {screenPhase === 'transition' && (
        <div style={{
          position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%,-50%)',
          textAlign: 'center', zIndex: 20, pointerEvents: 'none', padding: '0 24px', maxWidth: 320,
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#7FE7C4', lineHeight: 1.45 }}>{transitionText}</p>
        </div>
      )}

      {playing && (
        <>
          <Joystick
            disabled={screenPhase === 'transition'}
            onMove={(x, y) => { inputRef.current = { moveX: x, moveY: y }; }}
          />
          <CloakButton
            active={hud.cloakActive}
            cooldown={hud.cloakCd}
            disabled={screenPhase === 'transition'}
            onActivate={() => { if (snapRef.current) activateCloak(snapRef.current); }}
          />
        </>
      )}
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', zIndex: 20,
      background: 'rgba(6,38,46,0.72)', padding: 24,
    }}>
      {children}
    </div>
  );
}

function ActionBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      marginTop: 20, padding: '14px 32px', borderRadius: 30, border: 'none', cursor: 'pointer',
      background: '#FF7B54', color: '#06262E', fontSize: 15, fontWeight: 800,
      boxShadow: '0 4px 0 #c9563a, 0 6px 16px rgba(0,0,0,0.35)',
      fontFamily: "'Creato Display',system-ui,sans-serif",
    }}>
      {children}
    </button>
  );
}

const badge: CSSProperties = {
  fontSize: 13, fontWeight: 700, color: '#F4E4C1',
  background: 'rgba(6,38,46,0.55)', padding: '6px 12px', borderRadius: 20,
  border: '1px solid rgba(244,228,193,0.15)',
};

const backBtn: CSSProperties = {
  width: 36, height: 36, borderRadius: 12, border: '1px solid rgba(244,228,193,0.2)',
  background: 'rgba(6,38,46,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

const title: CSSProperties = {
  fontSize: 28, margin: '0 0 8px', color: '#7FE7C4', textShadow: '0 2px 12px rgba(0,0,0,0.5)', fontWeight: 800,
};

const sub: CSSProperties = {
  fontSize: 14, margin: 0, color: '#F4E4C1', opacity: 0.9, textAlign: 'center', lineHeight: 1.45,
};
