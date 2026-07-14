import { useCallback, useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { playTick } from '../audio/forgeAudio';

interface UseRoundTimerOptions {
  totalSeconds: number;
  active: boolean;
  paused: boolean;
  onExpire: () => void;
}

/** Deadline-based timer — survives backgrounding and pauses correctly */
export function useRoundTimer({ totalSeconds, active, paused, onExpire }: UseRoundTimerOptions) {
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const deadlineRef = useRef<number | null>(null);
  const pausedRemainingRef = useRef(totalSeconds);
  const lastTickRef = useRef(-1);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const reset = useCallback((seconds: number) => {
    setTimeLeft(seconds);
    pausedRemainingRef.current = seconds;
    lastTickRef.current = -1;
    deadlineRef.current = active && !paused ? Date.now() + seconds * 1000 : null;
  }, [active, paused]);

  useEffect(() => {
    reset(totalSeconds);
  }, [totalSeconds, reset]);

  useEffect(() => {
    if (!active) {
      deadlineRef.current = null;
      return;
    }

    if (paused) {
      if (deadlineRef.current != null) {
        pausedRemainingRef.current = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
        deadlineRef.current = null;
        setTimeLeft(pausedRemainingRef.current);
      }
      return;
    }

    deadlineRef.current = Date.now() + pausedRemainingRef.current * 1000;

    const tick = () => {
      if (deadlineRef.current == null) return;
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 10 && remaining > 0 && remaining !== lastTickRef.current) {
        lastTickRef.current = remaining;
        playTick();
      }

      if (remaining <= 0) {
        deadlineRef.current = null;
        onExpireRef.current();
      }
    };

    tick();
    const id = window.setInterval(tick, 250);

    const onVisibility = () => {
      if (document.hidden) return;
      tick();
    };
    document.addEventListener('visibilitychange', onVisibility);

    let removeAppListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      void App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) tick();
      }).then((h) => { removeAppListener = () => h.remove(); });
    }

    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
      removeAppListener?.();
    };
  }, [active, paused]);

  return { timeLeft, reset };
}
