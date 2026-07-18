import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import {
  playBonus, playClear, playCoinCredit, playError, playHint, playLevelFail, playLevelWin,
  playShuffle, playStreak, playSubmit, playTap, duckMusic, restoreMusic,
} from '../audio/forgeAudio';

import { preloadFullDictionary, PLAYER_MIN_WORD_LEN } from '../data/dictionary';
import { lookupDefinition } from '../data/wordDefinitions';
import {
  DAILY_BONUS_PAYOUT, dailySeed, generateDailyChallenge, isDailyCompleted,
} from '../engine/dailyChallenge';
import { dailyMissionBonusEligible, getDailyMission, type MissionSnapshot } from '../engine/dailyMission';
import { levelParams } from '../engine/difficultyCurve';
import { completionistBonus, payoutForWord } from '../engine/payoutCalculator';
import { generateLevel, type LevelGeneration, type LetterTile } from '../engine/poolGenerator';
import { assignSlots } from '../engine/slotAssignment';
import { validateWordLocal, reasonMessage } from '../engine/wordValidator';
import { validateAndCreditWord } from '../engine/wordValidatorServer';
import { mulberry32, shuffle as shuffleArr } from '../engine/seedHash';
import { loadForgeProgress, saveForgeProgress } from './useForgeProgress';
import { clampCampaignLevel, isSectorUnlocked } from '../engine/sectorProgress';
import { loadForgeSettings } from './useForgeSettings';
import { useForgeCloudSync } from './useForgeCloudSync';
import { useRoundTimer } from './useRoundTimer';
import { tileSkinForLevel } from '../data/uiAssets';

export interface FoundWord {
  word: string;
  payout: number;
  isBonus: boolean;
  pending?: boolean;
  rejected?: boolean;
}

export interface CoinFlyEvent {
  id: number;
  amount: number;
  fromX: number;
  fromY: number;
}

export interface HintReveal {
  word: string;
  revealedIndices: number[];
}

export type RoundPhase = 'playing' | 'paused' | 'ended';

export type ForgeGameMode = 'campaign' | 'daily';

interface UseWordForgeGameOptions {
  preview?: boolean;
  mode?: ForgeGameMode;
}

async function haptic(style: ImpactStyle): Promise<void> {
  if (!loadForgeSettings().haptics || !Capacitor.isNativePlatform()) return;
  try { await Haptics.impact({ style }); } catch { /* ignore */ }
}

export function useWordForgeGame(options: UseWordForgeGameOptions = {}) {
  const { preview = false, mode = 'campaign' } = options;
  const isDaily = mode === 'daily';
  const { user } = useAuth();
  const { addPoints, triggerConfetti, refreshPoints } = usePoints();
  const { push: pushCloud } = useForgeCloudSync(preview);

  const saved = useMemo(() => loadForgeProgress(preview), [preview]);
  const campaignStart = isDaily ? saved.currentLevel : clampCampaignLevel(saved.currentLevel, saved.bestLevel);
  const [level, setLevel] = useState(campaignStart);
  const [attemptId, setAttemptId] = useState(() => String(Date.now()));
  const [phase, setPhase] = useState<RoundPhase>(
    saved.tutorialCompleted || isDaily ? 'playing' : 'paused',
  );
  const [balance, setBalance] = useState(0);
  const [displayBalance, setDisplayBalance] = useState(0);
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [selection, setSelection] = useState<number[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [bonusPopup, setBonusPopup] = useState<string | null>(null);
  const [coinFlies, setCoinFlies] = useState<CoinFlyEvent[]>([]);
  const [shakeWord, setShakeWord] = useState<string | null>(null);
  const [celebrateWord, setCelebrateWord] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [streakPopup, setStreakPopup] = useState<number | null>(null);
  const [hintsLeft, setHintsLeft] = useState(saved.hintsLeft);
  const [shufflesLeft, setShufflesLeft] = useState(saved.shufflesLeft);
  const [hintReveal, setHintReveal] = useState<HintReveal | null>(null);
  const [liveTiles, setLiveTiles] = useState<LetterTile[] | null>(null);
  const [shuffleAnim, setShuffleAnim] = useState(false);
  const [showTutorial, setShowTutorial] = useState(!saved.tutorialCompleted && !isDaily);
  const [roundEnded, setRoundEnded] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const [completionistPayout, setCompletionistPayout] = useState(0);
  const [dailyBonusAwarded, setDailyBonusAwarded] = useState(false);

  const claimedRef = useRef(new Set<string>());
  const hintsAtStartRef = useRef(hintsLeft);
  const maxStreakRef = useRef(0);
  const longestWordRef = useRef(0);
  const flyId = useRef(0);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const balanceRef = useRef<HTMLDivElement | null>(null);
  const toastTimer = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);
  const submittingRef = useRef(false);

  const uid = user?.id ?? 'preview-user';

  const generation: LevelGeneration = useMemo(
    () => (isDaily ? generateDailyChallenge(uid) : generateLevel(levelParams(level), uid, attemptId)),
    [isDaily, level, uid, attemptId],
  );

  const tiles = liveTiles ?? generation.tiles;
  const minWords = generation.effectiveMinWords;
  const submitMinLen = PLAYER_MIN_WORD_LEN;
  const minWordLen = generation.params.minWordLen;

  const validWords = useMemo(
    () => foundWords.filter((w) => !w.rejected).map((w) => w.word),
    [foundWords],
  );
  const slots = useMemo(
    () => assignSlots(generation.slotWords, validWords),
    [generation.slotWords, validWords],
  );

  const currentWord = useMemo(
    () => selection.map((i) => tiles[i]?.letter ?? '').join(''),
    [selection, tiles],
  );

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  }, []);

  useEffect(() => () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  // Warm up the full 192k-word validation dictionary (separate lazy chunk)
  useEffect(() => { void preloadFullDictionary(); }, []);

  // Clamp tampered progress on campaign mount
  useEffect(() => {
    if (preview || isDaily) return;
    const prog = loadForgeProgress(preview);
    const allowed = clampCampaignLevel(prog.currentLevel, prog.bestLevel);
    if (allowed !== prog.currentLevel) persistMeta({ currentLevel: allowed });
    if (allowed !== level) setLevel(allowed);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const showToast = useCallback((msg: string, ms = 1400) => {
    setToast(msg);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  }, []);

  const persistMeta = useCallback((patch: Parameters<typeof saveForgeProgress>[0]) => {
    saveForgeProgress(patch, preview);
    if (!preview) void pushCloud(patch);
  }, [preview, pushCloud]);

  const onTimerExpire = useCallback(() => {
    if (roundEnded) return;
    setRoundEnded(true);
    setPhase('ended');
    playLevelFail();
    duckMusic();
    persistMeta({ sessionHigh: Math.max(loadForgeProgress(preview).sessionHigh, balance) });
  }, [roundEnded, balance, persistMeta, preview]);

  const { timeLeft, reset: resetTimer } = useRoundTimer({
    totalSeconds: generation.params.timerSeconds,
    active: phase === 'playing',
    paused: phase === 'paused' || showTutorial,
    onExpire: onTimerExpire,
  });

  const resetRound = useCallback((nextLevel: number, newAttempt: boolean) => {
    const prog = loadForgeProgress(preview);
    const playLevel = isDaily ? nextLevel : clampCampaignLevel(nextLevel, prog.bestLevel);
    if (!isDaily && !isSectorUnlocked(playLevel, prog.bestLevel)) return;

    const params = isDaily ? { timerSeconds: 120 } : levelParams(playLevel);
    if (!isDaily) {
      setLevel(playLevel);
      persistMeta({ currentLevel: playLevel });
    }
    if (newAttempt) setAttemptId(String(Date.now()));
    setPhase(showTutorial ? 'paused' : 'playing');
    resetTimer(params.timerSeconds);
    setBalance(0);
    setDisplayBalance(0);
    setFoundWords([]);
    setSelection([]);
    setToast(null);
    setBonusPopup(null);
    setShakeWord(null);
    setCelebrateWord(null);
    setStreak(0);
    setStreakPopup(null);
    setHintReveal(null);
    setLiveTiles(null);
    setRoundEnded(false);
    setNewBest(false);
    setCompletionistPayout(0);
    setDailyBonusAwarded(false);
    claimedRef.current = new Set();
    hintsAtStartRef.current = hintsLeft;
    maxStreakRef.current = 0;
    longestWordRef.current = 0;
  }, [persistMeta, resetTimer, showTutorial, isDaily, preview, hintsLeft]);

  const spawnCoinFly = useCallback((amount: number) => {
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;
    const id = ++flyId.current;
    setCoinFlies((prev) => [...prev, { id, amount, fromX: board.left + board.width / 2, fromY: board.top + board.height * 0.35 }]);
    schedule(() => setCoinFlies((prev) => prev.filter((c) => c.id !== id)), 1800);
  }, [schedule]);

  /** In-round ARX-P counter — always updates, independent of profile sync */
  const addToSessionBalance = useCallback((delta: number) => {
    if (delta === 0) return;
    setBalance((prev) => Math.max(0, prev + delta));
    setDisplayBalance((prev) => Math.max(0, prev + delta));
  }, []);

  const creditProfilePoints = useCallback(async (amount: number) => {
    if (preview || amount <= 0) return true;
    const result = await addPoints(amount, 'game');
    return result.success;
  }, [addPoints, preview]);

  const submitWord = useCallback(async (pathOverride?: number[]) => {
    const path = pathOverride ?? selection;
    if (phase !== 'playing' || path.length < submitMinLen || submittingRef.current) return;
    submittingRef.current = true;
    await preloadFullDictionary();
    if (pathOverride) setSelection(pathOverride);
    const pathLetters = path.map((i) => tiles[i]?.letter ?? '');
    const word = pathLetters.join('').toUpperCase();
    const poolLetters = tiles.map((t) => t.letter);
    const local = validateWordLocal(
      word, poolLetters, claimedRef.current, submitMinLen, pathLetters,
    );
    if (!local.ok) {
      setShakeWord(word);
      setStreak(0);
      playError();
      void haptic(ImpactStyle.Medium);
      schedule(() => setShakeWord(null), 400);
      showToast(reasonMessage(local.reason, submitMinLen));
      setSelection([]);
      submittingRef.current = false;
      return;
    }

    const nextStreak = streak + 1;
    maxStreakRef.current = Math.max(maxStreakRef.current, nextStreak);
    longestWordRef.current = Math.max(longestWordRef.current, word.length);
    const payout = payoutForWord(word, nextStreak);
    claimedRef.current.add(word);

    setFoundWords((prev) => [...prev, { word, payout, isBonus: !!local.isBonus, pending: true }]);
    setCelebrateWord(word);
    schedule(() => setCelebrateWord(null), 600);
    setStreak(nextStreak);
    if (nextStreak === 3 || nextStreak === 5) {
      setStreakPopup(nextStreak);
      playStreak();
      schedule(() => setStreakPopup(null), 1200);
    }
    spawnCoinFly(payout);
    playCoinCredit();
    addToSessionBalance(payout);
    setSelection([]);

    if (local.isBonus) {
      playBonus();
      void haptic(ImpactStyle.Heavy);
      if (local.definition) {
        setBonusPopup(`${word} — ${local.definition}`);
        schedule(() => setBonusPopup(null), 3200);
      }
    } else {
      playSubmit();
      void haptic(ImpactStyle.Light);
      const def = lookupDefinition(word);
      if (def) showToast(`${word}: ${def}`, 2400);
    }

    const server = await validateAndCreditWord(
      word, poolLetters, [...claimedRef.current].filter((w) => w !== word),
      isDaily ? 0 : level, attemptId, streak, submitMinLen, pathLetters,
    );

    if (!server.ok) {
      claimedRef.current.delete(word);
      setStreak(0);
      addToSessionBalance(-payout);
      setFoundWords((prev) => prev.map((w) => (w.word === word ? { ...w, pending: false, rejected: true } : w)));
      setShakeWord(word);
      playError();
      schedule(() => setShakeWord(null), 400);
      showToast(reasonMessage(server.reason, submitMinLen));
      submittingRef.current = false;
      return;
    }

    const credited = typeof server.payout === 'number' && server.payout > 0
      ? server.payout
      : payout;
    if (credited !== payout) {
      addToSessionBalance(credited - payout);
    }

    if (!preview) {
      if (server.credited === true) {
        void refreshPoints();
      } else {
        const synced = await creditProfilePoints(credited);
        if (!synced) {
          showToast('Word saved — profile points syncing shortly');
        }
      }
    }

    const prog = loadForgeProgress(preview);
    persistMeta({
      totalWords: prog.totalWords + 1,
      bestStreak: Math.max(prog.bestStreak, nextStreak),
      longestWord: word.length > prog.longestWord.length ? word : prog.longestWord,
    });
    setFoundWords((prev) => prev.map((w) => (w.word === word ? { ...w, pending: false, payout: credited } : w)));

    const nextValidWords = [...foundWords.filter((w) => !w.rejected).map((w) => w.word), word];
    const validCount = nextValidWords.length;
    const slotsFilledNext = assignSlots(generation.slotWords, nextValidWords).filledCount;
    if (slotsFilledNext >= generation.slotWords.length && !roundEnded) {
      setRoundEnded(true);
      setPhase('ended');
      playLevelWin();
      triggerConfetti();
      duckMusic();
      const prog2 = loadForgeProgress(preview);
      const isBest = !isDaily && level + 1 > prog2.bestLevel;
      setNewBest(isBest);

      if (validCount >= generation.formableCount) {
        const bonus = completionistBonus(generation.formableCount);
        setCompletionistPayout(bonus);
        if (bonus > 0) {
          addToSessionBalance(bonus);
          void creditProfilePoints(bonus);
        }
      }

      if (isDaily && !isDailyCompleted(prog2.dailyCompletedDate)) {
        const missionSnap: MissionSnapshot = {
          puzzleCleared: true,
          longestWord: longestWordRef.current,
          timeLeft,
          wordsFound: validCount,
          hintsUsed: Math.max(0, hintsAtStartRef.current - hintsLeft),
          bestStreak: maxStreakRef.current,
          minWords: generation.slotWords.length,
        };
        const missionMet = dailyMissionBonusEligible(getDailyMission(), missionSnap);
        if (missionMet) {
          setDailyBonusAwarded(true);
          void creditProfilePoints(DAILY_BONUS_PAYOUT);
        }
        const yesterday = dailySeed(new Date(Date.now() - 86_400_000));
        const nextDailyStreak = prog2.dailyCompletedDate === yesterday ? prog2.dailyStreak + 1 : 1;
        persistMeta({ dailyCompletedDate: dailySeed(), dailyStreak: nextDailyStreak });
      }
    }
    submittingRef.current = false;
  }, [phase, selection, submitMinLen, tiles, streak, spawnCoinFly, isDaily, level, attemptId, addToSessionBalance, creditProfilePoints, refreshPoints, persistMeta, preview, foundWords, roundEnded, generation.formableCount, generation.slotWords, schedule, showToast, triggerConfetti, hintsLeft, timeLeft]);

  const appendTile = useCallback((index: number) => {
    if (phase !== 'playing') return;
    setSelection((prev) => {
      if (prev.includes(index)) return prev;
      playTap();
      void haptic(ImpactStyle.Light);
      return [...prev, index];
    });
  }, [phase]);

  const beginSelection = useCallback((index: number) => {
    if (phase !== 'playing') return;
    playTap();
    void haptic(ImpactStyle.Light);
    setSelection([index]);
  }, [phase]);

  const toggleTile = useCallback((index: number) => {
    if (phase !== 'playing') return;
    playTap();
    void haptic(ImpactStyle.Light);
    setSelection((prev) => {
      const pos = prev.indexOf(index);
      if (pos >= 0) return prev.filter((_, i) => i !== pos);
      return [...prev, index];
    });
  }, [phase]);

  const undoLetter = useCallback(() => {
    if (selection.length === 0) return;
    playClear();
    setSelection((prev) => prev.slice(0, -1));
  }, [selection.length]);

  const clearSelection = useCallback(() => {
    playClear();
    setSelection([]);
  }, []);

  const shuffleTiles = useCallback(() => {
    if (phase !== 'playing' || shufflesLeft <= 0) return;
    setShuffleAnim(true);
    schedule(() => setShuffleAnim(false), 500);
    const rng = mulberry32(generation.seed + Date.now());
    const base = [...tiles];
    const letters = shuffleArr(rng, base.map((t) => t.letter));
    setLiveTiles(base.map((t, i) => ({ ...t, letter: letters[i] })));
    setSelection([]);
    const left = shufflesLeft - 1;
    setShufflesLeft(left);
    persistMeta({ shufflesLeft: left });
    playShuffle();
    showToast('Letters shuffled', 1200);
  }, [phase, shufflesLeft, tiles, generation.seed, persistMeta, schedule, showToast]);

  const useHint = useCallback(() => {
    if (phase !== 'playing' || hintsLeft <= 0) return;
    const unfilled = slots.rows.filter((r) => !r.filledBy).map((r) => r.target);
    const target = unfilled.find((w) => !claimedRef.current.has(w))
      ?? generation.hintBonus
      ?? generation.slotWords[0];
    if (!target) return;
    const left = hintsLeft - 1;
    setHintsLeft(left);
    persistMeta({ hintsLeft: left });
    playHint();
    setHintReveal({ word: target, revealedIndices: [0, target.length - 1] });
    showToast(`Hint: ${target[0]}${'·'.repeat(Math.max(0, target.length - 2))}${target[target.length - 1]}`, 2500);
  }, [phase, hintsLeft, generation, slots.rows, persistMeta, showToast]);

  const completeTutorial = useCallback(() => {
    setShowTutorial(false);
    setPhase('playing');
    persistMeta({ tutorialCompleted: true });
    resetTimer(generation.params.timerSeconds);
  }, [persistMeta, resetTimer, generation.params.timerSeconds]);

  const togglePause = useCallback(() => {
    setPhase((p) => (p === 'playing' ? 'paused' : p === 'paused' ? 'playing' : p));
  }, []);

  const advanceOrRetry = useCallback(() => {
    restoreMusic();
    if (isDaily) return;

    const passed = slots.filledCount >= generation.slotWords.length;
    const prog = loadForgeProgress(preview);

    if (passed) {
      const next = level + 1;
      const unlockedSkins = Math.min(5, Math.floor(next / 5) + 1);
      persistMeta({
        bestLevel: Math.max(prog.bestLevel, next),
        sessionHigh: Math.max(prog.sessionHigh, balance),
        currentLevel: next,
        hintsLeft: 3,
        shufflesLeft: 2,
        unlockedSkins,
      });
      setHintsLeft(3);
      setShufflesLeft(2);
      resetRound(next, true);
    } else {
      persistMeta({
        sessionHigh: Math.max(prog.sessionHigh, balance),
        hintsLeft: Math.min(3, hintsLeft + 1),
      });
      setHintsLeft((h) => Math.min(3, h + 1));
      resetRound(level, true);
    }
  }, [slots.filledCount, generation.slotWords, level, balance, resetRound, persistMeta, preview, hintsLeft, isDaily]);

  const unlockedSkinCount = loadForgeProgress(preview).unlockedSkins;
  const displayLevel = isDaily ? 'DAILY' : level;

  const missionSnapshot: MissionSnapshot = {
    puzzleCleared: slots.filledCount >= generation.slotWords.length,
    longestWord: longestWordRef.current,
    timeLeft,
    wordsFound: foundWords.filter((w) => !w.rejected).length,
    hintsUsed: Math.max(0, hintsAtStartRef.current - hintsLeft),
    bestStreak: maxStreakRef.current,
    minWords: generation.slotWords.length,
  };

  return {
    mode,
    isDaily,
    level,
    displayLevel,
    generation,
    tiles,
    phase,
    timeLeft,
    balance,
    displayBalance,
    foundWords,
    selection,
    currentWord,
    toast,
    bonusPopup,
    coinFlies,
    shakeWord,
    celebrateWord,
    streak,
    streakPopup,
    hintsLeft,
    shufflesLeft,
    hintReveal,
    shuffleAnim,
    showTutorial,
    newBest,
    completionistPayout,
    dailyBonusAwarded,
    minWords,
    minWordLen,
    submitMinLen,
    slotRows: slots.rows,
    slotsFilled: slots.filledCount,
    extraWords: slots.extraWords,
    boardRef,
    balanceRef,
    unlockedSkinCount,
    skin: tileSkinForLevel(level, unlockedSkinCount),
    toggleTile,
    appendTile,
    beginSelection,
    undoLetter,
    clearSelection,
    submitWord,
    shuffleTiles,
    useHint,
    advanceOrRetry,
    completeTutorial,
    togglePause,
    resetRound,
    validCount: foundWords.filter((w) => !w.rejected).length,
    missionSnapshot,
    dailyMission: isDaily ? getDailyMission() : null,
  };
}
