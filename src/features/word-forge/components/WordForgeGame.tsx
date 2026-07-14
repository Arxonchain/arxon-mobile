import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
  setForgeAudioSettings, startMusic, stopMusic, unlockAudio,
} from '../audio/forgeAudio';
import { ForgeSettingsPanel } from './ForgeSettingsPanel';
import { CoinFlyLayer } from './CoinFlyLayer';
import { ForgePlayfield } from './ForgePlayfield';
import { ConfirmDialog, PauseOverlay } from './ForgeOverlays';
import { ForgeTitle, TechButton, TechLabel, TechPanel } from './ForgeTitle';
import { LetterBoard, TimerRing } from './LetterBoard';
import { RoundEndModal } from './LevelCompleteModal';
import { TutorialOverlay } from './TutorialOverlay';
import { loadForgeSettings, saveForgeSettings } from '../hooks/useForgeSettings';
import { useWordForgeGame } from '../hooks/useWordForgeGame';
import { prefersReducedMotion } from '../design-system/forgeTheme';

interface WordForgeGameProps {
  preview?: boolean;
}

export function WordForgeGame({ preview = false }: WordForgeGameProps) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(loadForgeSettings);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [exitConfirm, setExitConfirm] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const game = useWordForgeGame({ preview });
  const { generation, phase } = game;
  const passed = game.validCount >= game.minWords;
  const urgent = game.timeLeft <= 10 && phase === 'playing';
  const progress = Math.min(1, game.validCount / game.minWords);
  const audioUnlockedRef = useRef(false);
  const reduced = prefersReducedMotion();

  const updateSettings = useCallback((s: typeof settings) => {
    setSettings(s);
    saveForgeSettings(s);
    setForgeAudioSettings(s);
  }, []);

  useEffect(() => {
    setForgeAudioSettings(settings);
    if (settings.music && phase === 'playing') void startMusic();
    else if (phase === 'ended') stopMusic();
    return () => stopMusic();
  }, [settings.music, settings.musicTrack, settings.musicVolume, phase]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handler = App.addListener('backButton', () => {
      if (phase === 'playing' || phase === 'paused') setExitConfirm(true);
      else navigate('/games');
    });
    return () => { void handler.then((h) => h.remove()); };
  }, [phase, navigate]);

  const onFirstInteract = useCallback(() => {
    if (audioUnlockedRef.current) return;
    audioUnlockedRef.current = true;
    unlockAudio();
    if (settings.music && phase === 'playing') void startMusic();
  }, [settings.music, phase]);

  const handleExit = useCallback(() => {
    stopMusic();
    navigate(preview ? '/word-forge-preview' : '/games');
  }, [navigate, preview]);

  const topPad = Capacitor.isNativePlatform()
    ? 'max(48px, env(safe-area-inset-top))'
    : '14px';

  const forgeField = (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, minHeight: 44,
        animation: !reduced && game.shakeWord ? 'wf-shake 0.35s ease' : undefined,
      }}>
        <div style={{
          flex: 1, display: 'flex', gap: 5, flexWrap: 'wrap', minHeight: 32, alignItems: 'center',
          padding: '4px 6px', borderRadius: 4,
          background: 'rgba(0,0,0,0.35)', border: '1px dashed rgba(79,216,235,0.2)',
        }}>
          {game.selection.length === 0 ? (
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.28)', fontWeight: 600, letterSpacing: '0.08em' }}>
              SWIPE LETTERS INTO FORGE
            </span>
          ) : (
            game.selection.map((idx, i) => (
              <span key={`${idx}-${i}`} style={{
                width: 32, height: 32, borderRadius: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(79,216,235,0.5)',
                background: 'linear-gradient(180deg, rgba(79,216,235,0.15), rgba(79,216,235,0.05))',
                fontSize: 16, fontWeight: 900, color: '#4FD8EB',
              }}>
                {game.tiles[idx]?.letter}
              </span>
            ))
          )}
        </div>
        {game.selection.length > 0 && (
          <TechButton variant="ghost" onClick={game.clearSelection}>CLR</TechButton>
        )}
        <TechButton
          onClick={game.submitWord}
          disabled={game.selection.length < game.minWordLen || phase !== 'playing'}
        >
          FORGE
        </TechButton>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'center' }}>
        <TechButton variant="ghost" onClick={game.undoLetter} disabled={game.selection.length === 0}>UNDO</TechButton>
        <TechButton variant="ghost" onClick={game.useHint} disabled={game.hintsLeft <= 0 || phase !== 'playing'}>
          HINT ({game.hintsLeft})
        </TechButton>
        <TechButton variant="ghost" onClick={game.shuffleTiles} disabled={game.shufflesLeft <= 0 || phase !== 'playing'}>
          MIX ({game.shufflesLeft})
        </TechButton>
      </div>
    </>
  );

  return (
    <div
      onPointerDown={onFirstInteract}
      style={{
        position: 'fixed', inset: 0, background: '#020508', color: '#e8fcff',
        overflow: 'hidden', touchAction: 'none',
        fontFamily: "'Creato Display', 'Rajdhani', system-ui, sans-serif",
      }}
    >
      {/* Urgent vignette */}
      {urgent && !reduced && (
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
          boxShadow: 'inset 0 0 80px rgba(255,107,74,0.25)',
          animation: 'wf-urgent-vignette 0.8s ease infinite',
        }} />
      )}

      <div style={{
        position: 'relative', zIndex: 2, height: '100%',
        display: 'flex', flexDirection: 'column',
        padding: `${topPad} 12px max(12px, env(safe-area-inset-bottom))`,
        maxWidth: 480, margin: '0 auto', overflow: 'hidden',
      }}>
        <header style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {!preview && (
                <button
                  type="button"
                  aria-label="Exit game"
                  onClick={() => setExitConfirm(true)}
                  style={{
                    marginBottom: 6, padding: '5px 10px', borderRadius: 4,
                    border: '1px solid rgba(79,216,235,0.22)',
                    background: 'rgba(0,0,0,0.55)', color: 'rgba(79,216,235,0.85)',
                    cursor: 'pointer', fontSize: 10, fontWeight: 800, letterSpacing: '0.12em',
                  }}
                >
                  ← EXIT
                </button>
              )}
              <ForgeTitle compact />
              <p style={{ margin: '4px 0 0', fontSize: 9, color: 'rgba(79,216,235,0.4)', letterSpacing: '0.1em' }}>
                {game.skin.label} · {generation.grid.label} · {preview ? 'SIM' : 'LIVE'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                aria-label="Pause game"
                onClick={game.togglePause}
                style={{
                  padding: '8px 10px', borderRadius: 4, marginTop: 2,
                  border: '1px solid rgba(79,216,235,0.22)', background: 'rgba(0,0,0,0.55)',
                  color: 'rgba(79,216,235,0.85)', cursor: 'pointer', fontSize: 10, fontWeight: 800,
                }}
              >
                ⏸
              </button>
              <ForgeSettingsPanel
                settings={settings}
                onChange={updateSettings}
                accent="#4FD8EB"
                onOpenChange={(open) => {
                  setSettingsOpen(open);
                  if (open && phase === 'playing') game.togglePause();
                  else if (!open && phase === 'paused' && !game.showTutorial) game.togglePause();
                }}
              />
            </div>
          </div>

          <TechPanel style={{
            marginTop: 10, padding: '10px 12px',
            display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 6, alignItems: 'end',
          }}>
            <div>
              <TechLabel>Sector</TechLabel>
              <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, marginTop: 2 }}>{game.level}</div>
              {game.streak >= 2 && (
                <div style={{
                  marginTop: 2, fontSize: 9, fontWeight: 800, color: '#ffd93d',
                  animation: game.streakPopup && !reduced ? 'wf-streak-pop 0.4s ease' : undefined,
                }}>
                  STREAK ×{game.streak}{game.streak >= 3 ? ` (${game.streak >= 5 ? '2×' : '1.5×'} ARX-P)` : ''}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <TimerRing timeLeft={game.timeLeft} total={generation.params.timerSeconds} urgent={urgent} />
              <div style={{
                fontSize: 17, fontWeight: 900, marginTop: -2,
                color: urgent ? '#ff6b4a' : '#4FD8EB',
                animation: urgent && !reduced ? 'wf-urgent 0.5s ease infinite' : undefined,
              }}>
                {game.timeLeft}s
              </div>
            </div>
            <div ref={game.balanceRef} style={{ textAlign: 'right' }}>
              <TechLabel>Balance</TechLabel>
              <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, marginTop: 2, color: '#ffd93d' }}>
                {game.displayBalance}
              </div>
              <div style={{ fontSize: 7, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.35)' }}>ARX-P</div>
            </div>
          </TechPanel>

          <div style={{ marginTop: 8 }}>
            <div style={{ height: 3, background: 'rgba(79,216,235,0.08)', overflow: 'hidden', borderRadius: 1 }}>
              <div style={{
                width: `${progress * 100}%`, height: '100%',
                background: progress >= 1 ? 'linear-gradient(90deg, #4FD8EB, #ffd93d)' : 'linear-gradient(90deg, rgba(79,216,235,0.35), #4FD8EB)',
                transition: 'width 0.35s ease',
              }} />
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginTop: 4,
              fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.38)',
            }}>
              <span>{generation.params.poolSize} LETTERS</span>
              <span style={{ color: progress >= 1 ? '#4FD8EB' : undefined }}>
                {game.validCount}/{game.minWords} TO CLEAR
              </span>
            </div>
          </div>
        </header>

        <div ref={game.boardRef} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <ForgePlayfield
            level={game.level}
            tiles={(
              <LetterBoard
                tiles={game.tiles}
                selection={game.selection}
                skin={game.skin}
                grid={generation.grid}
                hintReveal={game.hintReveal}
                celebrateWord={game.celebrateWord}
                shuffleAnim={game.shuffleAnim}
                onToggle={game.toggleTile}
                onAppend={game.appendTile}
              />
            )}
            forgeField={forgeField}
          />
        </div>

        {game.foundWords.length > 0 && (
          <div style={{ flexShrink: 0, marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 56, overflow: 'auto' }}>
            {game.foundWords.map((w) => (
              <span key={w.word} style={{
                padding: '3px 8px', borderRadius: 3, fontSize: 10, fontWeight: 800,
                border: `1px solid ${w.rejected ? '#ff6b4a' : w.isBonus ? '#ffd93d' : 'rgba(79,216,235,0.22)'}`,
                background: w.rejected ? 'rgba(255,80,60,0.12)' : 'rgba(0,0,0,0.5)',
                color: w.rejected ? '#ff9b8a' : w.isBonus ? '#ffd93d' : '#cbd5e1',
                textDecoration: w.rejected ? 'line-through' : undefined,
              }}>
                {w.isBonus ? '◆ ' : ''}{w.word} +{w.payout}
              </span>
            ))}
          </div>
        )}
      </div>

      {game.toast && (
        <div role="status" aria-live="polite" style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          zIndex: 40, padding: '10px 18px', borderRadius: 4,
          background: 'rgba(0,8,16,0.92)', border: '1px solid rgba(79,216,235,0.35)',
          fontSize: 12, fontWeight: 700,
        }}>
          {game.toast}
        </div>
      )}

      {game.bonusPopup && (
        <div role="status" style={{
          position: 'fixed', top: '22%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 40, padding: '14px 20px', borderRadius: 4, maxWidth: 320,
          background: 'rgba(0,8,16,0.94)', border: '1px solid #ffd93d',
          fontSize: 13, fontWeight: 700, color: '#ffd93d', textAlign: 'center',
        }}>
          {game.bonusPopup}
        </div>
      )}

      <TutorialOverlay
        open={game.showTutorial}
        step={tutorialStep}
        onNext={() => {
          if (tutorialStep >= 2) game.completeTutorial();
          else setTutorialStep((s) => s + 1);
        }}
        onSkip={game.completeTutorial}
      />

      <PauseOverlay
        open={phase === 'paused' && !game.showTutorial && !settingsOpen}
        onResume={game.togglePause}
        onExit={() => setExitConfirm(true)}
      />

      <ConfirmDialog
        open={exitConfirm}
        title="Leave Sector?"
        message="Your current run progress will be lost."
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={handleExit}
        onCancel={() => setExitConfirm(false)}
      />

      <RoundEndModal
        open={phase === 'ended'}
        passed={passed}
        level={game.level}
        wordsFormed={game.validCount}
        wordsRequired={game.minWords}
        balance={game.displayBalance}
        newBest={game.newBest}
        onContinue={game.advanceOrRetry}
      />

      <CoinFlyLayer events={game.coinFlies} targetRef={game.balanceRef} />

      <style>{`
        @keyframes wf-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
        @keyframes wf-urgent { 0%,100%{opacity:1} 50%{opacity:0.55} }
        @keyframes wf-urgent-vignette { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes wf-streak-pop { 0%{transform:scale(1)} 50%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes wf-tile-drop { from{opacity:0;transform:translateY(-12px) scale(0.9)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes wf-tile-flash { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.8)} }
        @keyframes wf-shuffle { 0%{transform:rotate(0deg)} 50%{transform:rotate(180deg) scale(0.8)} 100%{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
