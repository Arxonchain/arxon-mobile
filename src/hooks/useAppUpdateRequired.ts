import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { isUpdateRequired, type AppVersionRequirement } from '@/lib/appUpdate';

export function useAppUpdateRequired() {
  const [required, setRequired] = useState(false);
  const [checking, setChecking] = useState(true);
  const [currentBuild, setCurrentBuild] = useState<number | null>(null);
  const [requirement, setRequirement] = useState<AppVersionRequirement | null>(null);

  const check = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      setRequired(false);
      setChecking(false);
      return;
    }
    setChecking(true);
    try {
      const result = await isUpdateRequired();
      setRequired(result.required);
      setCurrentBuild(result.currentBuild);
      setRequirement(result.requirement);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('App')) return;

    let handle: { remove: () => void } | undefined;
    void (async () => {
      try {
        const { App } = await import('@capacitor/app');
        handle = await App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) void check();
        });
      } catch { /* ignore */ }
    })();

    return () => handle?.remove();
  }, [check]);

  useEffect(() => {
    if (!required) return;
    const t = setInterval(() => void check(), 60_000);
    return () => clearInterval(t);
  }, [required, check]);

  return { required, checking, currentBuild, requirement, recheck: check };
}
