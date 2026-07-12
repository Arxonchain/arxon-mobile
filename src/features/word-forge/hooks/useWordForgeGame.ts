import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { usePoints } from '@/hooks/usePoints';
import {
  playBonus, playClear, playError, playLevelFail, playLevelWin,
  playSubmit, playTap, playTick,
} from '../audio/forgeAudio';
import { bonusDefinition } from '../data/bonusWords';
import { levelParams } from '../engine/difficultyCurve';
import { payoutForWord } from '../engine/payoutCalculator';
import { generateLevel, type LevelGeneration, type LetterTile } from '../engine/poolGenerator';
import { validateWordLocal, validateWordServer } from '../engine/wordValidator';
import { saveForgeProgress, loadForgeProgress } from './useForgeProgress';
import { shuffle as shuffleArr } from '../engine/seedHash';

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

export type RoundPhase = 'playing' | 'ended';

const USER_KEY = 'word-forge-user-id';

function userId(): string {
  let id = localStorage.getItem(USER_KEY);
  if (!id) {
    id = `wf-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(USER_KEY, id);
  }
  return id;
}

async function haptic(style: ImpactStyle): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style });
  } catch { /* ignore */ }
}

interface UseWordForgeGameOptions {
  preview?: boolean;
}

export function useWordForgeGame(options: UseWordForgeGameOptions = {}) {
  const { preview = false } = options;
  const { addPoints, triggerConfetti } = usePoints();

  const saved = useMemo(() => loadForgeProgress(), []);
  const [level, setLevel] = useState(saved.currentLevel);
  const [attemptId, setAttemptId] = useState(() => String(Date.now()));
  const [phase, setPhase] = useState<RoundPhase>('playing');
  const [timeLeft, setTimeLeft] = useState(() => levelParams(saved.currentLevel).timerSeconds);
  const [balance, setBalance] = useState(0);
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [selection, setSelection] = useState<number[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [bonusPopup, setBonusPopup] = useState<string | null>(null);
  const [coinFlies, setCoinFlies] = useState<CoinFlyEvent[]>([]);
  const [shakeWord, setShakeWord] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [hintsLeft, setHintsLeft] = useState(saved.hintsLeft);
  const [shufflesLeft, setShufflesLeft] = useState(saved.shufflesLeft);
  const [hintReveal, setHintReveal] = useState<string | null>(null);
  const [liveTiles, setLiveTiles] = useState<LetterTile[] | null>(null);

  const claimedRef = useRef(new Set<string>());
  const pendingRef = useRef(new Map<string, number>());
  const flyId = useRef(0);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const balanceRef = useRef<HTMLDivElement | null>(null);
  const lastTickRef = useRef(-1);
  const creditedRef = useRef(0);

  const uid = useMemo(() => userId(), []);

  const generation: LevelGeneration = useMemo(
    () => generateLevel(levelParams(level), uid, attemptId),
    [level, uid, attemptId],
  );

  const tiles = liveTiles ?? generation.tiles;

  const currentWord = useMemo(
    () => selection.map((i) => tiles[i]?.letter ?? '').join(''),
    [selection, tiles],
  );

  const persistMeta = useCallback((patch: Parameters<typeof saveForgeProgress>[0]) => {
    saveForgeProgress(patch);
  }, []);

  const resetRound = useCallback((nextLevel: number, newAttempt: boolean) => {
    const params = levelParams(nextLevel);
    setLevel(nextLevel);
    persistMeta({ currentLevel: nextLevel });
    if (newAttempt) setAttemptId(String(Date.now()));
    setPhase('playing');
    setTimeLeft(params.timerSeconds);
    setFoundWords([]);
    setSelection([]);
    setToast(null);
    setBonusPopup(null);
    setShakeWord(null);
    setStreak(0);
    setHintReveal(null);
    setLiveTiles(null);
    creditedRef.current = 0;
    claimedRef.current = new Set();
    pendingRef.current = new Map();
    lastTickRef.current = -1;
  }, [persistMeta]);

  const spawnCoinFly = useCallback((amount: number) => {
    const board = boardRef.current?.getBoundingClientRect();
    if (!board) return;
    const id = ++flyId.current;
    setCoinFlies((prev) => [
      ...prev,
      {
        id,
        amount,
        fromX: board.left + board.width / 2,
        fromY: board.top + board.height * 0.35,
      },
    ]);
    window.setTimeout(() => {
      setCoinFlies((prev) => prev.filter((c) => c.id !== id));
    }, 700);
  }, []);

  const creditPoints = useCallback(async (amount: number) => {
    if (preview || amount <= 0) return;
    const result = await addPoints(amount, 'task');
    if (result.success) {
      creditedRef.current += amount;
    }
  }, [addPoints, preview]);

  const submitWord = useCallback(async () => {
    if (phase !== 'playing' || selection.length < 3) return;
    const word = currentWord.toUpperCase();
    const poolLetters = tiles.map((t) => t.letter);
    const local = validateWordLocal(word, poolLetters, claimedRef.current);
    if (!local.ok) {
      setShakeWord(word);
      setStreak(0);
      playError();
      void haptic(ImpactStyle.Medium);
      window.setTimeout(() => setShakeWord(null), 400);
      const msg = local.reason === 'unknown' ? 'Not in dictionary'
        : local.reason === 'duplicate' ? 'Already found'
          : local.reason === 'pool' ? 'Letters not in pool'
            : 'Too short';
      setToast(msg);
      window.setTimeout(() => setToast(null), 1400);
      setSelection([]);
      return;
    }

    const payout = payoutForWord(word);
    claimedRef.current.add(word);
    pendingRef.current.set(word, payout);

    setFoundWords((prev) => [...prev, { word, payout, isBonus: !!local.isBonus, pending: true }]);
    setBalance((b) => b + payout);
    setStreak((s) => s + 1);
    persistMeta({ totalWords: loadForgeProgress().totalWords + 1 });
    spawnCoinFly(payout);
    setSelection([]);

    if (local.isBonus) {
      playBonus();
      void haptic(ImpactStyle.Heavy);
      if (local.definition) {
        setBonusPopup(`${word} — ${local.definition}`);
        window.setTimeout(() => setBonusPopup(null), 3200);
      }
    } else {
      playSubmit();
      void haptic(ImpactStyle.Light);
    }

    const server = await validateWordServer(word, poolLetters, claimedRef.current);
    if (!server.ok) {
      const rev = pendingRef.current.get(word) ?? payout;
      pendingRef.current.delete(word);
      claimedRef.current.delete(word);
      setBalance((b) => Math.max(0, b - rev));
      setStreak(0);
      setFoundWords((prev) => prev.map((w) => (
        w.word === word ? { ...w, pending: false, rejected: true } : w
      )));
      setShakeWord(word);
      playError();
      window.setTimeout(() => setShakeWord(null), 400);
      setToast('Word reversed — try again');
      window.setTimeout(() => setToast(null), 1400);
      return;
    }

    setFoundWords((prev) => prev.map((w) => (
      w.word === word ? { ...w, pending: false } : w
    )));
    void creditPoints(payout);
  }, [phase, selection.length, currentWord, tiles, spawnCoinFly, creditPoints, persistMeta]);

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
    const base = [...tiles];
    const letters = base.map((t) => t.letter);
    const rng = () => Math.random();
    const shuffled = shuffleArr(rng, letters);
    const next = base.map((t, i) => ({ ...t, letter: shuffled[i] }));
    setLiveTiles(next);
    setSelection([]);
    const left = shufflesLeft - 1;
    setShufflesLeft(left);
    persistMeta({ shufflesLeft: left });
    setToast('Letters shuffled');
    window.setTimeout(() => setToast(null), 1200);
  }, [phase, shufflesLeft, tiles, persistMeta]);

  const useHint = useCallback(() => {
    if (phase !== 'playing' || hintsLeft <= 0) return;
    const target = generation.hintBonus ?? generation.targetWords[0];
    if (!target) return;
    const left = hintsLeft - 1;
    setHintsLeft(left);
    persistMeta({ hintsLeft: left });
    setHintReveal(`${target[0]}${'_'.repeat(target.length - 1)} (${target.length} letters)`);
    setToast(`Hint: ${target[0]}…`);
    window.setTimeout(() => setToast(null), 2000);
  }, [phase, hintsLeft, generation, persistMeta]);

  const advanceOrRetry = useCallback(() => {
    const passed = foundWords.filter((w) => !w.rejected).length >= generation.params.minWordsRequired;
    const prog = loadForgeProgress();
    if (passed) {
      playLevelWin();
      triggerConfetti();
      const next = level + 1;
      persistMeta({
        bestLevel: Math.max(prog.bestLevel, next),
        sessionHigh: Math.max(prog.sessionHigh, balance),
        currentLevel: next,
        hintsLeft: 3,
        shufflesLeft: 2,
      });
      setHintsLeft(3);
      setShufflesLeft(2);
      resetRound(next, true);
    } else {
      playLevelFail();
      persistMeta({ sessionHigh: Math.max(prog.sessionHigh, balance) });
      resetRound(level, true);
    }
  }, [foundWords, generation.params.minWordsRequired, level, balance, resetRound, persistMeta, triggerConfetti]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const t = window.setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 10 && s !== lastTickRef.current) {
          lastTickRef.current = s - 1;
          if (s <= 10) playTick();
        }
        if (s <= 1) {
          window.clearInterval(t);
          setPhase('ended');
          persistMeta({ sessionHigh: Math.max(loadForgeProgress().sessionHigh, balance) });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [phase, attemptId, level, balance, persistMeta]);

  return {
    level,
    generation,
    tiles,
    phase,
    timeLeft,
    balance,
    foundWords,
    selection,
    currentWord,
    toast,
    bonusPopup,
    coinFlies,
    shakeWord,
    streak,
    hintsLeft,
    shufflesLeft,
    hintReveal,
    boardRef,
    balanceRef,
    toggleTile,
    appendTile,
    undoLetter,
    clearSelection,
    submitWord,
    shuffleTiles,
    useHint,
    advanceOrRetry,
    resetRound,
    validCount: foundWords.filter((w) => !w.rejected).length,
  };
}
