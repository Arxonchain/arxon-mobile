import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Lightbulb, Pause, Shuffle } from 'lucide-react';
import {
  restoreMusic, setForgeAudioSettings, setMusicScope, startMusic, stopMusic, unlockAudio,
} from '../audio/forgeAudio';
import { FORGE_UI } from '../data/uiAssets';
import { DAILY_BONUS_PAYOUT, isDailyCompleted } from '../engine/dailyChallenge';
import { computeRoundStars } from '../engine/roundStars';
import { loadForgeSettings, saveForgeSettings } from '../hooks/useForgeSettings';
import { loadForgeProgress } from '../hooks/useForgeProgress';
import { useArenaLayout } from '../hooks/useArenaLayout';
import { PLAYER_MIN_WORD_LEN } from '../data/dictionary';
import { useWordForgeGame, type ForgeGameMode } from '../hooks/useWordForgeGame';
import { prefersReducedMotion } from '../design-system/forgeTheme';
import { CoinFlyLayer } from './CoinFlyLayer';
import { DailyMissionStrip } from './DailyMissionStrip';
import { ForgeArenaDock } from './ForgeArenaDock';
import { ForgeFaqModal } from './ForgeFaqModal';
import { ForgeSettingsPanel } from './ForgeSettingsPanel';
import { ConfirmDialog, PauseOverlay } from './ForgeOverlays';
import { GlossyIconButton, TimerRing, TreasureBackdrop } from './GlossyKit';
import { HintRefillModal } from './HintRefillModal';
import { LetterWheel } from './LetterWheel';
import { RoundEndModal } from './LevelCompleteModal';
import { TutorialOverlay } from './TutorialOverlay';
import { WordSlots } from './WordSlots';

interface WordForgeGameProps {
  preview?: boolean;
  mode?: ForgeGameMode;
}

export function WordForgeGame({ preview = false, mode = 'campaign' }: WordForgeGameProps) {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(loadForgeSettings);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [exitConfirm, setExitConfirm] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [rewardsToast, setRewardsToast] = useState(false);
  const [hintRefillOpen, setHintRefillOpen] = useState(false);
  const game = useWordForgeGame({ preview, mode });
  const { generation, phase } = game;
  const passed = game.slotsFilled >= game.minWords;
  const urgent = game.timeLeft <= 10 && phase === 'playing';
  const progress = Math.min(1, game.slotsFilled / Math.max(1, game.minWords));
  const audioUnlockedRef = useRef(false);
  const reduced = prefersReducedMotion();
  const dailyDone = isDailyCompleted(loadForgeProgress(preview).dailyCompletedDate);
  const maxWordLen = Math.max(3, ...game.slotRows.map((r) => r.target.length));
  const layout = useArenaLayout({
    slotCount: game.slotRows.length,
    hasDailyStrip: game.isDaily,
    maxWordLen,
  });

  const updateSettings = useCallback((s: typeof settings) => {
    setSettings(s);
    saveForgeSettings(s);
    setForgeAudioSettings(s);
  }, []);

  // Music is scoped to game pages only — entering enables it, leaving kills it
  useEffect(() => {
    setMusicScope(true);
    return () => setMusicScope(false);
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
    game.endSession();
    stopMusic();
    navigate(preview ? '/word-forge-preview' : '/games');
  }, [navigate, preview, game]);

  const handleReplay = useCallback(() => {
    restoreMusic();
    game.resetRound(game.level, true);
  }, [game]);

  const handleRoundContinue = useCallback(() => {
    if (game.isDaily) {
      if (passed) {
        navigate('/games');
        return;
      }
      restoreMusic();
      game.resetRound(game.level, true);
      return;
    }
    game.advanceOrRetry();
  }, [game, passed, navigate]);

  const handleEndGame = useCallback(() => {
    game.endSession();
    stopMusic();
    navigate('/games');
  }, [game, navigate]);

  const handleHintPress = useCallback(() => {
    if (game.hintsLeft <= 0) {
      setHintRefillOpen(true);
      return;
    }
    game.useHint();
  }, [game]);

  const handleWheelRelease = useCallback((path: number[]) => {
    if (path.length >= PLAYER_MIN_WORD_LEN) {
      void game.submitWord(path);
    } else if (path.length > 0) {
      game.clearSelection();
    }
  }, [game]);

  const timeRatio = generation.params.timerSeconds > 0 ? game.timeLeft / generation.params.timerSeconds : 0;
  const stars = computeRoundStars(passed, game.slotsFilled, game.minWords, timeRatio);

  const topPad = Capacitor.isNativePlatform()
    ? 'max(48px, env(safe-area-inset-top))'
    : '14px';

  return (
    <div
      onPointerDown={onFirstInteract}
      style={{
        position: 'fixed', inset: 0, background: '#04070f', color: '#e8fcff',
        overflow: 'hidden',
        fontFamily: "'Creato Display', 'Rajdhani', system-ui, sans-serif",
      }}
    >
      {/* Arena background — own treasure art, heavily blurred for focus */}
      <TreasureBackdrop blur={11} brightness={0.5} />

      {/* Urgent vignette */}
      {urgent && !reduced && (
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1,
          boxShadow: 'inset 0 0 90px rgba(255,107,74,0.3)',
          animation: 'wf-urgent-vignette 0.8s ease infinite',
        }} />
      )}

      <div style={{
        position: 'relative', zIndex: 2, height: '100%',
        display: 'flex', flexDirection: 'column',
        padding: `${topPad} max(14px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left))`,
        maxWidth: 440, margin: '0 auto', overflow: 'hidden',
      }}>
        {/* ── Top bar: pause · sector · timer · level balance ───────── */}
        <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: layout.compact ? 8 : 10 }}>
          <GlossyIconButton label="Pause game" color="slate" size={46} onClick={game.togglePause}>
            <Pause size={19} strokeWidth={3} />
          </GlossyIconButton>

          <div style={{
            flex: 1, padding: '7px 12px', borderRadius: 14, textAlign: 'center',
            background: 'rgba(5,14,28,0.8)', border: '1px solid rgba(79,216,235,0.25)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
          }}>
            <div style={{ fontSize: 7.5, fontWeight: 900, letterSpacing: '0.22em', color: 'rgba(79,216,235,0.6)' }}>
              {game.isDaily ? 'MILESTONE' : 'SECTOR'}
            </div>
            <div style={{ fontSize: 19, fontWeight: 900, lineHeight: 1.1, color: '#fff' }}>
              {game.isDaily ? (game.dailyMission?.shortLabel ?? 'Daily') : game.level}
            </div>
          </div>

          <div style={{
            animation: urgent && !reduced ? 'wf-urgent 0.5s ease infinite' : undefined,
            flexShrink: 0,
          }}>
            <TimerRing timeLeft={game.timeLeft} total={generation.params.timerSeconds} urgent={urgent} size={52} />
          </div>

          <div ref={game.balanceRef} style={{
            flex: 1, padding: '6px 10px 7px', borderRadius: 14,
            background: 'rgba(5,14,28,0.8)', border: '1px solid rgba(255,217,61,0.3)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            <img src={FORGE_UI.arxCoin} alt="ARX-P" style={{
              width: 24, height: 24, objectFit: 'contain',
              filter: 'drop-shadow(0 0 6px rgba(140,180,255,0.55))',
            }} />
            <div style={{ textAlign: 'left' }}>
              <div key={game.balance} style={{
                fontSize: 17, fontWeight: 900, lineHeight: 1, color: '#ffd93d',
                animation: !reduced && game.balance > 0 ? 'wf-balance-pop 0.3s ease' : undefined,
              }}>
                {game.displayBalance}
              </div>
              <div style={{ fontSize: 6.5, fontWeight: 800, letterSpacing: '0.2em', color: 'rgba(255,232,154,0.55)' }}>
                THIS LEVEL
              </div>
            </div>
          </div>
        </header>

        {/* ── Run total — cumulative ARX-P across all levels ─────────── */}
        <div style={{
          flexShrink: 0,
          marginTop: layout.compact ? 6 : 8,
          padding: layout.compact ? '5px 12px 6px' : '6px 14px 7px',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          background: 'linear-gradient(90deg, rgba(255,217,61,0.12), rgba(79,216,235,0.08))',
          border: '1px solid rgba(255,217,61,0.35)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <img src={FORGE_UI.arxCoin} alt="" style={{
              width: layout.compact ? 20 : 22, height: layout.compact ? 20 : 22, objectFit: 'contain',
              filter: 'drop-shadow(0 0 6px rgba(140,180,255,0.55))',
            }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 7, fontWeight: 900, letterSpacing: '0.2em', color: 'rgba(255,232,154,0.6)' }}>
                RUN TOTAL
              </div>
              <div style={{ fontSize: layout.compact ? 15 : 17, fontWeight: 900, lineHeight: 1.05, color: '#ffd93d' }}>
                {game.displaySessionTotal} <span style={{ fontSize: 9, opacity: 0.7 }}>ARX-P</span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 7, fontWeight: 900, letterSpacing: '0.16em', color: 'rgba(79,216,235,0.55)' }}>
              LEVEL EARNED
            </div>
            <div style={{ fontSize: layout.compact ? 12 : 13, fontWeight: 800, color: 'rgba(220,240,255,0.75)' }}>
              +{game.displayBalance}
            </div>
          </div>
        </div>

        {/* ── Progress + streak ─────────────────────────────────────── */}
        <div style={{ flexShrink: 0, marginTop: layout.compact ? 6 : 9 }}>
          <div style={{
            height: 8, borderRadius: 4, overflow: 'hidden',
            background: 'rgba(4,12,26,0.85)', border: '1px solid rgba(79,216,235,0.2)',
          }}>
            <div style={{
              width: `${progress * 100}%`, height: '100%', borderRadius: 4,
              background: progress >= 1
                ? 'linear-gradient(90deg, #84d92f, #ffd93d)'
                : 'linear-gradient(90deg, #1592b4, #4FD8EB)',
              boxShadow: '0 0 10px rgba(79,216,235,0.5), inset 0 1px 0 rgba(255,255,255,0.4)',
              transition: 'width 0.35s ease',
            }} />
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4,
            fontSize: 9, fontWeight: 800, letterSpacing: '0.1em',
          }}>
            <span style={{ color: 'rgba(220,240,255,0.55)' }}>
              {game.slotsFilled}/{game.minWords} WORDS
            </span>
            {game.streak >= 2 && (
              <span style={{
                color: '#ffd93d', textShadow: '0 0 10px rgba(255,217,61,0.6)',
                animation: game.streakPopup && !reduced ? 'wf-streak-pop 0.4s ease' : undefined,
              }}>
                STREAK ×{game.streak}{game.streak >= 3 ? ` · ${game.streak >= 5 ? '2×' : '1.5×'} PAY` : ''}
              </span>
            )}
          </div>
        </div>

        {game.isDaily && <DailyMissionStrip snapshot={game.missionSnapshot} />}

        {/* ── Word slots (scrollable when crowded) ─────────────────── */}
        <div style={{
          flex: 1,
          minHeight: 0,
          maxHeight: layout.slotsMaxH,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: layout.compact ? 4 : 6,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          animation: !reduced && game.shakeWord ? 'wf-shake 0.35s ease' : undefined,
        }}>
          <WordSlots
            rows={game.slotRows}
            extraCount={game.extraWords.length}
            skin={game.skin}
            hintWord={game.hintReveal?.word ?? null}
            celebrateWord={game.celebrateWord}
            boxSize={layout.boxSize}
            rowGap={layout.slotGap}
          />
        </div>

        {/* ── Current word trace ────────────────────────────────────── */}
        <div style={{
          flexShrink: 0,
          height: layout.compact ? 36 : 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        }}>
          {game.selection.length === 0 ? (
            <span style={{
              fontSize: 10, fontWeight: 800, letterSpacing: '0.22em',
              color: 'rgba(220,240,255,0.35)', textTransform: 'uppercase',
            }}>
              Swipe the wheel to spell
            </span>
          ) : (
            game.currentWord.split('').map((ch, i) => (
              <span key={i} style={{
                width: 34, height: 34, borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, fontWeight: 900, color: '#fff',
                background: `linear-gradient(180deg, ${game.skin.accent}, ${game.skin.accent}88)`,
                border: '1.5px solid rgba(255,255,255,0.4)',
                boxShadow: `0 3px 0 rgba(0,0,0,0.4), 0 0 12px ${game.skin.glow}`,
                textShadow: '0 2px 3px rgba(0,0,0,0.5)',
                animation: !reduced ? 'wf-letter-pop 0.16s ease both' : undefined,
              }}>
                {ch}
              </span>
            ))
          )}
        </div>

        {/* ── Letter wheel + boosters + utility dock (centered stack) ─ */}
        <div ref={game.boardRef} style={{
          flexShrink: 0, width: '100%', paddingBottom: 4,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <LetterWheel
            tiles={game.tiles}
            selection={game.selection}
            skin={game.skin}
            size={layout.wheelSize}
            hintReveal={game.hintReveal}
            shuffleAnim={game.shuffleAnim}
            onStart={game.beginSelection}
            onAppend={game.appendTile}
            onRelease={handleWheelRelease}
          />
          <div style={{
            display: 'flex', justifyContent: 'center', gap: layout.compact ? 10 : 14,
            marginTop: layout.compact ? 6 : 10,
          }}>
            <GlossyIconButton
              label="Use hint" caption="Hint" color="gold" size={46}
              badge={game.hintsLeft}
              disabled={phase !== 'playing'}
              onClick={handleHintPress}
            >
              <Lightbulb size={20} strokeWidth={2.8} />
            </GlossyIconButton>
            <GlossyIconButton
              label="Shuffle letters" caption="Mix" color="cyan" size={46}
              badge={game.shufflesLeft}
              disabled={game.shufflesLeft <= 0 || phase !== 'playing'}
              onClick={game.shuffleTiles}
            >
              <Shuffle size={20} strokeWidth={2.8} />
            </GlossyIconButton>
          </div>
          <ForgeArenaDock
            dailyDone={dailyDone}
            onStats={() => navigate('/word-forge/stats')}
            onSettings={() => setSettingsOpen(true)}
            onLeaderboard={() => navigate('/word-forge/leaderboard')}
            onMap={() => navigate('/word-forge/map')}
            onDaily={() => {
              if (!game.isDaily) navigate('/word-forge?mode=daily');
            }}
            onRewards={() => {
              setRewardsToast(true);
              window.setTimeout(() => setRewardsToast(false), 2400);
            }}
          />
        </div>
      </div>

      {/* ── Feedback layers ─────────────────────────────────────────── */}
      {game.toast && (
        <div role="status" aria-live="polite" style={{
          position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
          zIndex: 40, padding: '10px 18px', borderRadius: 12, maxWidth: '86vw',
          background: 'rgba(3,10,22,0.94)', border: '1px solid rgba(79,216,235,0.4)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          fontSize: 12, fontWeight: 700, textAlign: 'center',
        }}>
          {game.toast}
        </div>
      )}

      {game.bonusPopup && (
        <div role="status" style={{
          position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
          zIndex: 40, padding: '14px 20px', borderRadius: 14, maxWidth: 320,
          background: 'rgba(3,10,22,0.96)', border: '1.5px solid #ffd93d',
          boxShadow: '0 0 30px rgba(255,217,61,0.35), 0 10px 30px rgba(0,0,0,0.5)',
          fontSize: 13, fontWeight: 700, color: '#ffd93d', textAlign: 'center',
        }}>
          ◆ {game.bonusPopup}
        </div>
      )}

      {rewardsToast && (
        <div role="status" style={{
          position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
          zIndex: 40, padding: '10px 18px', borderRadius: 12, maxWidth: '86vw',
          background: 'rgba(3,10,22,0.94)', border: '1px solid rgba(255,217,61,0.4)',
          fontSize: 12, fontWeight: 700, textAlign: 'center', color: '#ffd93d',
        }}>
          Forge rewards shop — coming soon
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
        open={phase === 'paused' && !game.showTutorial && !settingsOpen && !faqOpen}
        onResume={game.togglePause}
        onReplay={handleReplay}
        onExit={() => setExitConfirm(true)}
        onFaq={() => setFaqOpen(true)}
        onSettings={() => setSettingsOpen(true)}
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
        wordsFormed={game.slotsFilled}
        wordsRequired={game.minWords}
        balance={game.displayBalance}
        sessionTotal={game.displaySessionTotal}
        stars={stars}
        newBest={game.newBest}
        isDaily={game.isDaily}
        completionistBonus={game.completionistPayout}
        dailyBonus={game.dailyBonusAwarded ? DAILY_BONUS_PAYOUT : 0}
        onReplay={handleReplay}
        onContinue={handleRoundContinue}
        onEndGame={!passed ? handleEndGame : undefined}
      />

      <HintRefillModal
        open={hintRefillOpen}
        preview={preview}
        onClose={() => setHintRefillOpen(false)}
        onClaim={(reward, claimKey) => {
          game.claimHintTask(reward, claimKey);
          setHintRefillOpen(false);
        }}
      />

      <ForgeFaqModal open={faqOpen} onClose={() => setFaqOpen(false)} />
      <ForgeSettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={updateSettings}
        accent="#4FD8EB"
      />

      <CoinFlyLayer events={game.coinFlies} targetRef={game.balanceRef} />

      <style>{`
        @keyframes wf-shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-6px)} 75%{transform:translateX(6px)} }
        @keyframes wf-urgent { 0%,100%{opacity:1} 50%{opacity:0.55} }
        @keyframes wf-urgent-vignette { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes wf-streak-pop { 0%{transform:scale(1)} 50%{transform:scale(1.15)} 100%{transform:scale(1)} }
        @keyframes wf-shuffle { 0%{transform:rotate(0deg) scale(1)} 50%{transform:rotate(180deg) scale(0.85)} 100%{transform:rotate(360deg) scale(1)} }
        @keyframes wf-letter-pop { 0%{transform:scale(0);opacity:0} 100%{transform:scale(1);opacity:1} }
        @keyframes wf-balance-pop { 0%{transform:scale(1)} 45%{transform:scale(1.22)} 100%{transform:scale(1)} }
      `}</style>
    </div>
  );
}
