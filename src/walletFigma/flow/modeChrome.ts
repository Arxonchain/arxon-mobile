import { createContext, useContext } from 'react';

const WELCOME_IDS = new Set(['splash', 'gateway', 'slide15', 'slide16']);
const HOME_IDS = new Set(['home', 'home-funded', 'home-hidden', 'home-vaulted', 'home-unvaulted', 'testnet', 'more']);

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

export function isWelcomeScreen(id: string) {
  return WELCOME_IDS.has(id);
}

export function isHomeRoot(id: string) {
  return HOME_IDS.has(id);
}

export function isSetupScreen(id: string) {
  return isOnboardingScreen(id) || isWelcomeScreen(id);
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
