/** Depth Watch is gated until tested locally — set VITE_DEPTH_WATCH_ENABLED=true to unlock. */
export const DEPTH_WATCH_ENABLED =
  import.meta.env.VITE_DEPTH_WATCH_ENABLED === 'true';
