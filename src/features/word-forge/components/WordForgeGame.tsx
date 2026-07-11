import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import {
  setForgeAudioSettings, startMusic, stopMusic, unlockAudio,
} from '../audio/forgeAudio';
import { AudioSettings } from './AudioSettings';
import { BoardArena } from './BoardArena';
import { CoinFlyLayer, ThemeParticles, TimerRing } from './CoinFlyLayer';
import { LetterBoard } from './LetterBoard';
import { loadForgeSettings, saveForgeSettings } from '../hooks/useForgeSettings';
import { useWordForgeGame } from '../hooks/useWordForgeGame';

interface WordForgeGameProps {
  /** Browser preview — no back button, shows mock label */
  preview?: boolean;
}

export function WordForgeGame({ preview = false }: WordForgeGameProps) {
  const navigate = useNavigate();
  const game = useWordForgeGame();
  const { generation, phase } = game;
  const theme = generation.theme;
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

  const isNative = Capacitor.isNativePlatform();
  const topPad = isNative ? 48 : 14;

  return (
    <div
      onPointerDown={onFirstInteract}
      style={{
        position: 'fixed',
        inset: 0,
        background: theme.bg,
        backgroundImage: theme.bgGradient,
        fontFamily: theme.fontFamily,
        color: '#fff',
        overflow: 'hidden',
        touchAction: 'manipulation',
      }}
    >
      <ThemeParticles theme={theme} />

      <div style={{
        position: 'relative', zIndex: 2, height: '100%',
        display: 'flex', flexDirection: 'column',
        padding: `${topPad}px 16px 20px`,
        maxWidth: 480,
        margin: '0 auto',
      }}>
        <header>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              {!preview && (
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(0,0,0,0.35)', color: '#fff',
                    cursor: 'pointer', fontSize: 18,
                  }}
                >
                  ←
                </button>
              )}
              <div>
                <p style={{
                  margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: 2,
                  color: theme.accent, textTransform: 'uppercase',
                }}>
                  Word Forge {preview ? '· Preview' : '· Beta'}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                  {preview ? 'Mock ARX-P' : 'Earn 10 ARX-P per word'}
                </p>
              </div>
            </div>
            <AudioSettings settings={settings} onChange={updateSettings} accent={theme.accent} />
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'end',
            marginTop: 12, gap: 8,
          }}>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>LEVEL</div>
              <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, color: '#fff' }}>{game.level}</div>
              {game.streak >= 2 && (
                <div style={{
                  marginTop: 4, fontSize: 10, fontWeight: 800, color: '#ffd93d',
                  animation: 'wf-streak-pop 0.3s ease',
                }}>
                  🔥 {game.streak} streak
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center' }}>
              <TimerRing
                timeLeft={game.timeLeft}
                total={generation.params.timerSeconds}
                accent={theme.accent}
                urgent={urgent}
              />
              <div style={{
                fontSize: 22, fontWeight: 900, marginTop: -2,
                color: urgent ? '#ff6b4a' : theme.accent,
                animation: urgent ? 'wf-urgent 0.5s ease infinite' : undefined,
              }}>
                {game.timeLeft}s
              </div>
            </div>

            <div ref={game.balanceRef} style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>BALANCE</div>
              <div style={{
                fontSize: 32, fontWeight: 900, lineHeight: 1, color: '#ffd93d',
                textShadow: '0 0 20px rgba(255,217,61,0.35)',
              }}>
                {game.balance}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>ARX-P</div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{
              height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{
                width: `${progress * 100}%`, height: '100%',
                background: progress >= 1
                  ? `linear-gradient(90deg, ${theme.accent}, #ffd93d)`
                  : `linear-gradient(90deg, ${theme.accentMuted}, ${theme.accent})`,
                transition: 'width 0.35s cubic-bezier(0.34,1.2,0.64,1)',
                boxShadow: progress >= 1 ? '0 0 12px rgba(127,231,196,0.5)' : undefined,
              }} />
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginTop: 6,
              fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)',
            }}>
              <span>{generation.arena.label} · {generation.shape.label}</span>
              <span style={{ color: progress >= 1 ? theme.accent : undefined }}>
                {game.validCount}/{generation.params.minWordsRequired} to advance
              </span>
            </div>
          </div>

          {generation.hintBonus && phase === 'playing' && (
            <div style={{
              marginTop: 8, padding: '8px 12px', borderRadius: 10,
              background: 'rgba(255,217,61,0.12)', border: '1px solid rgba(255,217,61,0.35)',
              fontSize: 11, fontWeight: 700, color: '#ffd93d',
              animation: 'wf-bonus-hint 2s ease infinite',
            }}>
              ✦ Bonus word nearby: {generation.hintBonus[0]}{'_'.repeat(generation.hintBonus.length - 1)} → 40 ARX-P
            </div>
          )}
        </header>

        <div
          ref={game.boardRef}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', minHeight: 280,
          }}
        >
          <BoardArena arena={generation.arena} shapeLabel={generation.shape.label} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <LetterBoard
              tiles={generation.tiles}
              selection={game.selection}
              theme={theme}
              onToggle={game.toggleTile}
            />
          </div>
        </div>

        <footer>
          <div style={{
            minHeight: 56, padding: '10px 14px', borderRadius: 16,
            background: 'rgba(0,0,0,0.45)',
            border: `1.5px solid ${game.shakeWord ? '#ff6b4a' : theme.tileBorder}`,
            display: 'flex', alignItems: 'center', gap: 8,
            animation: game.shakeWord ? 'wf-shake 0.35s ease' : undefined,
            boxShadow: game.currentWord ? `0 0 20px ${theme.accent}33` : undefined,
          }}>
            <div style={{ flex: 1, display: 'flex', gap: 4, flexWrap: 'wrap', minHeight: 32, alignItems: 'center' }}>
              {game.selection.length === 0 ? (
                <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                  Tap letters to spell…
                </span>
              ) : (
                game.selection.map((idx, i) => (
                  <span
                    key={`${idx}-${i}`}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(255,255,255,0.1)',
                      border: `1px solid ${theme.accent}`,
                      fontSize: 16, fontWeight: 900, color: theme.accent,
                      animation: `wf-letter-in 0.2s ease ${i * 0.04}s both`,
                    }}
                  >
                    {generation.tiles[idx]?.letter}
                  </span>
                ))
              )}
            </div>
            {game.selection.length > 0 && (
              <button type="button" onClick={game.clearSelection} style={btnGhost(theme)}>
                ✕
              </button>
            )}
            <button
              type="button"
              disabled={game.selection.length < 3 || phase !== 'playing'}
              onClick={game.submitWord}
              style={{
                ...btnPrimary(theme),
                opacity: game.selection.length < 3 || phase !== 'playing' ? 0.4 : 1,
                transform: game.selection.length >= 3 ? 'scale(1)' : 'scale(0.95)',
              }}
            >
              Forge
            </button>
          </div>

          {game.foundWords.length > 0 && (
            <div style={{
              marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6,
              maxHeight: 80, overflowY: 'auto',
            }}>
              {game.foundWords.map((w) => (
                <span
                  key={w.word}
                  style={{
                    padding: '5px 11px', borderRadius: 10, fontSize: 12, fontWeight: 800,
                    background: w.rejected ? 'rgba(255,80,60,0.2)'
                      : w.isBonus ? 'linear-gradient(135deg,rgba(255,180,60,0.25),rgba(255,100,40,0.15))'
                        : 'rgba(255,255,255,0.07)',
                    border: `1px solid ${w.rejected ? '#ff6b4a' : w.isBonus ? '#ffd93d' : theme.tileBorder}`,
                    color: w.rejected ? '#ff9b8a' : w.isBonus ? '#ffd93d' : '#e2e8f0',
                    textDecoration: w.rejected ? 'line-through' : undefined,
                  }}
                >
                  {w.isBonus ? '✦ ' : ''}{w.word} +{w.payout}
                </span>
              ))}
            </div>
          )}
        </footer>
      </div>

      {game.toast && (
        <div style={{
          position: 'fixed', bottom: 110, left: '50%', transform: 'translateX(-50%)',
          zIndex: 40, padding: '10px 20px', borderRadius: 14,
          background: 'rgba(0,0,0,0.88)', border: '1px solid rgba(255,255,255,0.15)',
          fontSize: 13, fontWeight: 700, animation: 'wf-toast-in 0.2s ease',
        }}>
          {game.toast}
        </div>
      )}

      {game.bonusPopup && (
        <div style={{
          position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 40, padding: '16px 22px', borderRadius: 16, maxWidth: 320,
          background: 'rgba(20,10,0,0.94)', border: '2px solid #ffd93d',
          fontSize: 14, fontWeight: 700, color: '#ffd93d', textAlign: 'center',
          boxShadow: '0 0 32px rgba(255,217,61,0.45)',
          animation: 'wf-bonus-pop 0.35s cubic-bezier(0.34,1.4,0.64,1)',
        }}>
          {game.bonusPopup}
        </div>
      )}

      {phase === 'ended' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 45,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            textAlign: 'center', padding: '32px 28px', borderRadius: 22,
            background: 'rgba(10,16,24,0.97)',
            border: `2px solid ${passed ? theme.accent : '#ff6b4a'}`,
            maxWidth: 340, width: '100%',
            boxShadow: `0 0 40px ${passed ? theme.accent : '#ff6b4a'}33`,
            animation: 'wf-modal-in 0.35s cubic-bezier(0.34,1.2,0.64,1)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{passed ? '🏆' : '⏳'}</div>
            <h2 style={{
              margin: '0 0 8px', fontSize: 26, fontWeight: 900,
              color: passed ? theme.accent : '#ff6b4a',
            }}>
              {passed ? 'Level Cleared!' : "Time's Up"}
            </h2>
            <p style={{ margin: '0 0 6px', fontSize: 14, color: '#cbd5e1', lineHeight: 1.5 }}>
              <strong>{game.validCount}</strong> words formed
              {!passed && ` · needed ${generation.params.minWordsRequired}`}
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 800, color: '#ffd93d' }}>
              +{game.balance} ARX-P this session
            </p>
            <button type="button" onClick={game.advanceOrRetry} style={btnPrimary(theme)}>
              {passed ? `Level ${game.level + 1} →` : 'Try Again'}
            </button>
          </div>
        </div>
      )}

      <CoinFlyLayer events={game.coinFlies} targetRef={game.balanceRef} />

      <style>{`
        @keyframes wf-shake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        @keyframes wf-urgent {
          0%,100% { opacity: 1; }
          50% { opacity: 0.65; }
        }
        @keyframes wf-streak-pop {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes wf-letter-in {
          from { transform: translateY(8px) scale(0.8); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes wf-bonus-hint {
          0%,100% { box-shadow: 0 0 0 rgba(255,217,61,0); }
          50% { box-shadow: 0 0 16px rgba(255,217,61,0.25); }
        }
        @keyframes wf-bonus-pop {
          from { transform: translateX(-50%) scale(0.85); opacity: 0; }
          to { transform: translateX(-50%) scale(1); opacity: 1; }
        }
        @keyframes wf-modal-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes wf-toast-in {
          from { transform: translateX(-50%) translateY(8px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function btnPrimary(theme: { accent: string; accentMuted: string }) {
  return {
    padding: '12px 22px',
    borderRadius: 14,
    border: 'none',
    cursor: 'pointer',
    background: `linear-gradient(180deg, ${theme.accent}, ${theme.accentMuted})`,
    color: '#0a1018',
    fontWeight: 900,
    fontSize: 14,
    boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
  } as const;
}

function btnGhost(theme: { tileBorder: string }) {
  return {
    padding: '8px 12px',
    borderRadius: 10,
    border: `1px solid ${theme.tileBorder}`,
    background: 'rgba(0,0,0,0.3)',
    color: '#cbd5e1',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
  } as const;
}
