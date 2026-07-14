/** Word Forge enabled on native iOS/Android by default; override via VITE_WORD_FORGE_ENABLED */
import { Capacitor } from '@capacitor/core';

const envFlag = import.meta.env.VITE_WORD_FORGE_ENABLED;
export const WORD_FORGE_ENABLED =
  envFlag === 'true' || (envFlag !== 'false' && Capacitor.isNativePlatform());
