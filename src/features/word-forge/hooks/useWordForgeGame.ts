import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import {
  playBonus, playClear, playCoinCredit, playError, playHint, playLevelFail, playLevelWin,
  playShuffle, playStreak, playSubmit, playTap, duckMusic, restoreMusic,
} from '../audio/forgeAudio';
import { bonusDefinition } from '../data/bonusWords';
import { levelParams } from '../engine/difficultyCurve';
import { payoutForWord } from '../engine/payoutCalculator';
import { generateLevel, type LevelGeneration, type LetterTile } from '../engine/poolGenerator';
import { validateWordLocal, reasonMessage } from '../engine/wordValidator';
import { validateAndCreditWord } from '../engine/wordValidatorServer';
import { mulberry32, shuffle as shuffleArr } from '../engine/seedHash';
import { loadForgeProgress, saveForgeProgress } from './useForgeProgress';
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

interface UseWordForgeGameOptions {
  preview?: boolean;
}

async function haptic(style: ImpactStyle): Promise<void> {
  if (!loadForgeSettings().haptics || !Capacitor.isNativePlatform()) return;
  try { await Haptics.impact({ style }); } catch { /* ignore */ }
}

export function useWordForgeGame(options: UseWordForgeGameOptions = {}) {
  const { preview = false } = options;
  const { user } = useAuth();
  const { addPoints, triggerConfetti } = usePoints();
  const { push: pushCloud } = useForgeCloudSync(preview);

  const saved = useMemo(() => loadForgeProgress(preview), [preview]);
  const [level, setLevel] = useState(saved.currentLevel);
  const [attemptId, setAttemptId] = useState(() => String(Date.now()));
  const [phase, setPhase] = useState<RoundPhase>(
    saved.tutorialCompleted ? 'playing' : 'paused',
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
  const [showTutorial, setShowTutorial] = useState(!saved.tutorialCompleted);
  const [roundEnded, setRoundEnded] = useState(false);
  const [newBest, setNewBest] = useState(false);

  const claimedRef = useRef(new Set<string>());
  const flyId = useRef(0);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const balanceRef = useRef<HTMLDivElement | null>(null);
  const toastTimer = useRef<number | null>(null);
  const timersRef = useRef<number[]>([]);

  const uid = user?.id ?? 'preview-user';

  const generation: LevelGeneration = useMemo(
    () => generateLevel(levelParams(level), uid, attemptId),
    [level, uid, attemptId],
  );

  const tiles = liveTiles ?? generation.tiles;
  const minWords = generation.effectiveMinWords;
  const minWordLen = generation.params.minWordLen;

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
    const params = levelParams(nextLevel);
    setLevel(nextLevel);
    persistMeta({ currentLevel: nextLevel });
    if (newAttempt) setAttemptId(String(Date.now()));
    setPhase(showTutorial ? 'paused' : 'playing');
    resetTimer(params.timerSeconds);
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
    claimedRef.current = new Set();
  }, [persistMeta, resetTimer, showTutorial]);

  const spawnCoinFly = useCallback((amount: number) => {
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;
    const id = ++flyId.current;
    setCoinFlies((prev) => [...prev, { id, amount, fromX: board.left + board.width / 2, fromY: board.top + board.height * 0.35 }]);
    schedule(() => setCoinFlies((prev) => prev.filter((c) => c.id !== id)), 700);
  }, [schedule]);

  const animateBalance = useCallback((target: number) => {
    setBalance(target);
    const start = displayBalance;
    const diff = target - start;
    if (diff <= 0) { setDisplayBalance(target); return; }
    const steps = 12;
    let step = 0;
    const id = window.setInterval(() => {
      step++;
      setDisplayBalance(Math.round(start + (diff * step) / steps));
      if (step >= steps) window.clearInterval(id);
    }, 40);
  }, [displayBalance]);

  const creditPoints = useCallback(async (amount: number) => {
    if (preview || amount <= 0) return true;
    const result = await addPoints(amount, 'game');
    return result.success;
  }, [addPoints, preview]);

  const submitWord = useCallback(async () => {
    if (phase !== 'playing' || selection.length < minWordLen) return;
    const word = currentWord.toUpperCase();
    const poolLetters = tiles.map((t) => t.letter);
    const local = validateWordLocal(word, poolLetters, claimedRef.current, minWordLen);
    if (!local.ok) {
      setShakeWord(word);
      setStreak(0);
      playError();
      void haptic(ImpactStyle.Medium);
      schedule(() => setShakeWord(null), 400);
      showToast(reasonMessage(local.reason, minWordLen));
      setSelection([]);
      return;
    }

    const nextStreak = streak + 1;
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
    }

    const server = await validateAndCreditWord(
      word, poolLetters, [...claimedRef.current].filter((w) => w !== word),
      level, attemptId, streak, minWordLen,
    );

    if (!server.ok) {
      claimedRef.current.delete(word);
      setStreak(0);
      setFoundWords((prev) => prev.map((w) => (w.word === word ? { ...w, pending: false, rejected: true } : w)));
      setShakeWord(word);
      playError();
      schedule(() => setShakeWord(null), 400);
      showToast(reasonMessage(server.reason, minWordLen));
      return;
    }

    const credited = server.payout ?? payout;
    if (server.credited === false && !preview) {
      const ok = await creditPoints(credited);
      if (!ok) {
        claimedRef.current.delete(word);
        setFoundWords((prev) => prev.map((w) => (w.word === word ? { ...w, pending: false, rejected: true } : w)));
        showToast('Credit failed — try again');
        return;
      }
    }

    animateBalance(balance + credited);
    const prog = loadForgeProgress(preview);
    persistMeta({
      totalWords: prog.totalWords + 1,
      bestStreak: Math.max(prog.bestStreak, nextStreak),
      longestWord: word.length > prog.longestWord.length ? word : prog.longestWord,
    });
    setFoundWords((prev) => prev.map((w) => (w.word === word ? { ...w, pending: false, payout: credited } : w)));

    const validCount = foundWords.filter((w) => !w.rejected).length + 1;
    if (validCount >= minWords && !roundEnded) {
      setRoundEnded(true);
      setPhase('ended');
      playLevelWin();
      triggerConfetti();
      duckMusic();
      const prog2 = loadForgeProgress(preview);
      const isBest = level + 1 > prog2.bestLevel;
      setNewBest(isBest);
    }
  }, [phase, selection.length, minWordLen, currentWord, tiles, streak, spawnCoinFly, level, attemptId, balance, animateBalance, creditPoints, persistMeta, preview, foundWords, minWords, roundEnded, schedule, showToast, triggerConfetti]);

  const appendTile = useCallback((index: number) => {
    if (phase !== 'playing') return;
    setSelection((prev) => {
      if (prev.includes(index)) return prev;
      playTap();
      void haptic(ImpactStyle.Light);
      return [...prev, index];
    });
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
    const target = generation.hintBonus ?? generation.targetWords.find((w) => !claimedRef.current.has(w)) ?? generation.targetWords[0];
    if (!target) return;
    const left = hintsLeft - 1;
    setHintsLeft(left);
    persistMeta({ hintsLeft: left });
    playHint();
    setHintReveal({ word: target, revealedIndices: [0, target.length - 1] });
    showToast(`Hint: ${target[0]}${'·'.repeat(Math.max(0, target.length - 2))}${target[target.length - 1]}`, 2500);
  }, [phase, hintsLeft, generation, persistMeta, showToast]);

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
    const validCount = foundWords.filter((w) => !w.rejected).length;
    const passed = validCount >= minWords;
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
  }, [foundWords, minWords, level, balance, resetRound, persistMeta, preview, hintsLeft]);

  const unlockedSkinCount = loadForgeProgress(preview).unlockedSkins;

  return {
    level,
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
    minWords,
    minWordLen,
    boardRef,
    balanceRef,
    unlockedSkinCount,
    skin: tileSkinForLevel(level, unlockedSkinCount),
    toggleTile,
    appendTile,
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
  };
}
