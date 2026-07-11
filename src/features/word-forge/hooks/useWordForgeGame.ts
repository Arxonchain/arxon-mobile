import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  playBonus, playClear, playError, playLevelFail, playLevelWin,
  playSubmit, playTap, playTick,
} from '../audio/forgeAudio';
import { bonusDefinition } from '../data/bonusWords';
import { levelParams } from '../engine/difficultyCurve';
import { payoutForWord } from '../engine/payoutCalculator';
import { generateLevel, type LevelGeneration } from '../engine/poolGenerator';
import { validateWordLocal, validateWordServer } from '../engine/wordValidator';

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

export function useWordForgeGame() {
  const [level, setLevel] = useState(1);
  const [attemptId, setAttemptId] = useState(() => String(Date.now()));
  const [phase, setPhase] = useState<RoundPhase>('playing');
  const [timeLeft, setTimeLeft] = useState(() => levelParams(1).timerSeconds);
  const [balance, setBalance] = useState(0);
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [selection, setSelection] = useState<number[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [bonusPopup, setBonusPopup] = useState<string | null>(null);
  const [coinFlies, setCoinFlies] = useState<CoinFlyEvent[]>([]);
  const [shakeWord, setShakeWord] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  const claimedRef = useRef(new Set<string>());
  const pendingRef = useRef(new Map<string, number>());
  const flyId = useRef(0);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const balanceRef = useRef<HTMLDivElement | null>(null);
  const lastTickRef = useRef(-1);

  const uid = useMemo(() => userId(), []);

  const generation: LevelGeneration = useMemo(
    () => generateLevel(levelParams(level), uid, attemptId),
    [level, uid, attemptId],
  );

  const currentWord = useMemo(
    () => selection.map((i) => generation.tiles[i]?.letter ?? '').join(''),
    [selection, generation.tiles],
  );

  const resetRound = useCallback((nextLevel: number, newAttempt: boolean) => {
    const params = levelParams(nextLevel);
    setLevel(nextLevel);
    if (newAttempt) setAttemptId(String(Date.now()));
    setPhase('playing');
    setTimeLeft(params.timerSeconds);
    setFoundWords([]);
    setSelection([]);
    setToast(null);
    setBonusPopup(null);
    setShakeWord(null);
    setStreak(0);
    claimedRef.current = new Set();
    pendingRef.current = new Map();
    lastTickRef.current = -1;
  }, []);

  const spawnCoinFly = useCallback((amount: number) => {
    const board = boardRef.current?.getBoundingClientRect();
    const bal = balanceRef.current?.getBoundingClientRect();
    if (!board || !bal) return;
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

  const submitWord = useCallback(async () => {
    if (phase !== 'playing' || selection.length < 3) return;
    const word = currentWord.toUpperCase();
    const local = validateWordLocal(word, generation.poolLetters, claimedRef.current);
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

    const server = await validateWordServer(word, generation.poolLetters, claimedRef.current);
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
  }, [phase, selection.length, currentWord, generation.poolLetters, spawnCoinFly]);

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

  const clearSelection = useCallback(() => {
    playClear();
    setSelection([]);
  }, []);

  const advanceOrRetry = useCallback(() => {
    const passed = foundWords.filter((w) => !w.rejected).length >= generation.params.minWordsRequired;
    if (passed) {
      playLevelWin();
      resetRound(level + 1, true);
    } else {
      playLevelFail();
      resetRound(level, true);
    }
  }, [foundWords, generation.params.minWordsRequired, level, resetRound]);

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
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [phase, attemptId, level]);

  return {
    level,
    generation,
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
    boardRef,
    balanceRef,
    toggleTile,
    clearSelection,
    submitWord,
    advanceOrRetry,
    resetRound,
    validCount: foundWords.filter((w) => !w.rejected).length,
  };
}
