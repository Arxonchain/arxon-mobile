import { useLiveFrame } from './liveFrame';

/** Hide Figma 9:41 / status / home-indicator on the real APP path. */
export function useAppHidesFigmaChrome() {
  return !!useLiveFrame()?.app;
}
