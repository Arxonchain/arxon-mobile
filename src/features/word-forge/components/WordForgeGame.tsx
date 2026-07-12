import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import {
  setForgeAudioSettings, startMusic, stopMusic, unlockAudio,
} from '../audio/forgeAudio';
import { tileSkinForLevel } from '../data/uiAssets';
import { AudioSettings } from './AudioSettings';
import { CoinFlyLayer } from './CoinFlyLayer';
import { ForgePlayfield } from './ForgePlayfield';
import { ForgeTitle, TechButton, TechLabel, TechPanel } from './ForgeTitle';
import { LetterBoard, TimerRing } from './LetterBoard';
import { RoundEndModal } from './LevelCompleteModal';
import { loadForgeSettings, saveForgeSettings } from '../hooks/useForgeSettings';
import { useWordForgeGame } from '../hooks/useWordForgeGame';

interface WordForgeGameProps {
  preview?: boolean;
}

export function WordForgeGame({ preview = false }: WordForgeGameProps) {
  const navigate = useNavigate();
  const game = useWordForgeGame({ preview });
  const { generation, phase } = game;
  const skin = tileSkinForLevel(game.level);
  const passed = game.validCount >= generation.params.minWordsRequired;
  const urgent = game.timeLeft <= 10 && phase === 'playing';
  const progress = Math.min(1, game.validCount / generation.params.minWordsRequired);

  const [settings, setSettings] = useState(loadForgeSettings);

  const updateSettings = useCallback((s: typeof settings) => {
    setSettings(s);
    saveForgeSettings(s);
    setForgeAudioSettings(s);
    if (s.music && phase === 'playing') void startMusic();
    else stopMusic();
  }, [phase]);

  useEffect(() => {
    setForgeAudioSettings(settings);
    if (settings.music && phase === 'playing') void startMusic();
    else stopMusic();
    return () => stopMusic();
  }, [settings.music, phase, settings]);

  const onFirstInteract = useCallback(() => {
    unlockAudio();
    if (settings.music && phase === 'playing') void startMusic();
  }, [settings.music, phase]);

  const topPad = Capacitor.isNativePlatform()
    ? 'max(48px, env(safe-area-inset-top))'
    : '14px';

  return (
    <div
      onPointerDown={onFirstInteract}
      style={{
        position: 'fixed', inset: 0,
        background: '#030508',
        color: '#e8fcff',
        overflow: 'hidden',
        touchAction: 'manipulation',
        fontFamily: "'Creato Display', system-ui, sans-serif",
      }}
    >
      <div style={{
        position: 'relative', zIndex: 2, height: '100%',
        display: 'flex', flexDirection: 'column',
        padding: `${topPad} 14px max(16px, env(safe-area-inset-bottom))`,
        maxWidth: 480, margin: '0 auto',
        overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      }}>
        <header>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1 }}>
              {!preview && (
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  style={{
                    marginBottom: 8, padding: '6px 10px', borderRadius: 2,
                    border: '1px solid rgba(79,216,235,0.25)',
                    background: 'rgba(0,0,0,0.5)', color: 'rgba(79,216,235,0.85)',
                    cursor: 'pointer', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
                  }}
                >
                  ← EXIT
                </button>
              )}
              <ForgeTitle compact />
              <p style={{ margin: '6px 0 0', fontSize: 10, color: 'rgba(79,216,235,0.45)', letterSpacing: '0.08em' }}>
                {skin.label} · {preview ? 'SIM MODE' : 'LIVE ARX-P'}
              </p>
            </div>
            <AudioSettings settings={settings} onChange={updateSettings} accent="#4FD8EB" />
          </div>

          <TechPanel style={{ marginTop: 14, padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'end' }}>
            <div>
              <TechLabel>Sector</TechLabel>
              <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, marginTop: 4 }}>{game.level}</div>
              {game.streak >= 2 && (
                <div style={{ marginTop: 4, fontSize: 10, fontWeight: 800, color: '#ffd93d' }}>
                  STREAK ×{game.streak}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <TimerRing timeLeft={game.timeLeft} total={generation.params.timerSeconds} urgent={urgent} />
              <div style={{
                fontSize: 18, fontWeight: 900, marginTop: -2,
                color: urgent ? '#ff6b4a' : '#4FD8EB',
                animation: urgent ? 'wf-urgent 0.5s ease infinite' : undefined,
              }}>
                {game.timeLeft}s
              </div>
            </div>
            <div ref={game.balanceRef} style={{ textAlign: 'right' }}>
              <TechLabel>Balance</TechLabel>
              <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1, marginTop: 4, color: '#ffd93d' }}>
                {game.balance}
              </div>
              <div style={{ fontSize: 8, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>ARX-P</div>
            </div>
          </TechPanel>

          <div style={{ marginTop: 10 }}>
            <div style={{ height: 3, background: 'rgba(79,216,235,0.1)', overflow: 'hidden' }}>
              <div style={{
                width: `${progress * 100}%`, height: '100%',
                background: progress >= 1
                  ? 'linear-gradient(90deg, #4FD8EB, #ffd93d)'
                  : 'linear-gradient(90deg, rgba(79,216,235,0.4), #4FD8EB)',
                transition: 'width 0.35s ease',
                boxShadow: progress >= 1 ? '0 0 12px rgba(79,216,235,0.5)' : undefined,
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)' }}>
              <span>{generation.shape.label}</span>
              <span style={{ color: progress >= 1 ? '#4FD8EB' : undefined }}>
                {game.validCount}/{generation.params.minWordsRequired} TO CLEAR
              </span>
            </div>
          </div>
        </header>

        <div ref={game.boardRef}>
          <ForgePlayfield level={game.level}>
            <LetterBoard
              tiles={game.tiles}
              selection={game.selection}
              level={game.level}
              onToggle={game.toggleTile}
              onAppend={game.appendTile}
            />
          </ForgePlayfield>
        </div>

        <footer>
          <TechPanel style={{
            minHeight: 52, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
            animation: game.shakeWord ? 'wf-shake 0.35s ease' : undefined,
          }}>
            <div style={{ flex: 1, display: 'flex', gap: 4, flexWrap: 'wrap', minHeight: 28, alignItems: 'center' }}>
              {game.selection.length === 0 ? (
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', fontWeight: 600, letterSpacing: '0.06em' }}>
                  DRAG OR TAP LETTERS
                </span>
              ) : (
                game.selection.map((idx, i) => (
                  <span key={`${idx}-${i}`} style={{
                    width: 30, height: 30, borderRadius: 2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid rgba(79,216,235,0.45)',
                    background: 'rgba(79,216,235,0.08)',
                    fontSize: 15, fontWeight: 900, color: '#4FD8EB',
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
              disabled={game.selection.length < 3 || phase !== 'playing'}
            >
              FORGE
            </TechButton>
          </TechPanel>

          <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center' }}>
            <TechButton variant="ghost" onClick={game.undoLetter} disabled={game.selection.length === 0}>UNDO</TechButton>
            <TechButton variant="ghost" onClick={game.useHint} disabled={game.hintsLeft <= 0 || phase !== 'playing'}>
              HINT ({game.hintsLeft})
            </TechButton>
            <TechButton variant="ghost" onClick={game.shuffleTiles} disabled={game.shufflesLeft <= 0 || phase !== 'playing'}>
              MIX ({game.shufflesLeft})
            </TechButton>
          </div>

          {game.foundWords.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 72, overflowY: 'auto' }}>
              {game.foundWords.map((w) => (
                <span key={w.word} style={{
                  padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 800,
                  border: `1px solid ${w.rejected ? '#ff6b4a' : w.isBonus ? '#ffd93d' : 'rgba(79,216,235,0.25)'}`,
                  background: w.rejected ? 'rgba(255,80,60,0.15)' : 'rgba(0,0,0,0.45)',
                  color: w.rejected ? '#ff9b8a' : w.isBonus ? '#ffd93d' : '#cbd5e1',
                  textDecoration: w.rejected ? 'line-through' : undefined,
                  letterSpacing: '0.06em',
                }}>
                  {w.isBonus ? '◆ ' : ''}{w.word} +{w.payout}
                </span>
              ))}
            </div>
          )}
        </footer>
      </div>

      {game.toast && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          zIndex: 40, padding: '10px 18px', borderRadius: 2,
          background: 'rgba(0,8,16,0.92)', border: '1px solid rgba(79,216,235,0.35)',
          fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
          animation: 'wf-toast-in 0.2s ease',
        }}>
          {game.toast}
        </div>
      )}

      {game.bonusPopup && (
        <div style={{
          position: 'fixed', top: '18%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 40, padding: '14px 20px', borderRadius: 4, maxWidth: 320,
          background: 'rgba(0,8,16,0.94)', border: '1px solid #ffd93d',
          fontSize: 13, fontWeight: 700, color: '#ffd93d', textAlign: 'center',
          boxShadow: '0 0 32px rgba(255,217,61,0.35)',
          animation: 'wf-bonus-pop 0.35s cubic-bezier(0.34,1.4,0.64,1)',
        }}>
          {game.bonusPopup}
        </div>
      )}

      <RoundEndModal
        open={phase === 'ended'}
        passed={passed}
        level={game.level}
        wordsFormed={game.validCount}
        wordsRequired={generation.params.minWordsRequired}
        balance={game.balance}
        onContinue={game.advanceOrRetry}
      />

      <CoinFlyLayer events={game.coinFlies} targetRef={game.balanceRef} />

      <style>{`
        @keyframes wf-shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        @keyframes wf-urgent {
          0%,100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        @keyframes wf-bonus-pop {
          from { transform: translateX(-50%) scale(0.88); opacity: 0; }
          to { transform: translateX(-50%) scale(1); opacity: 1; }
        }
        @keyframes wf-toast-in {
          from { transform: translateX(-50%) translateY(8px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
