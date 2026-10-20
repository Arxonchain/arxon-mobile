import { createContext, useContext } from 'react';

const ONBOARDING_IDS = new Set([
  'splash',
  'gateway',
  'slide15',
  'slide16',
  'create',
  'backup',
  'backup-manual',
  'drive-connect',
  'drive-confirm',
  'drive-done',
  'caution1',
  'caution2',
  'caution3',
  'phrase-hidden',
  'phrase-shown',
  'phrase-confirm',
  'phrase-done',
  'import',
  'face',
  'ready-skip',
  'unlock',
  'unlock-wrong',
]);

/** Welcome, create/import, finish, and unlock — not the logged-in Home shell. */
export function isOnboardingScreen(id: string) {
  return ONBOARDING_IDS.has(id);
}

type ModeChrome = {
  showToggle: boolean;
  setShowToggle: (show: boolean) => void;
};

export const ModeChromeContext = createContext<ModeChrome>({
  showToggle: false,
  setShowToggle: () => {},
});

export function useModeChrome() {
  return useContext(ModeChromeContext);
}
