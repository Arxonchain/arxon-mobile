/**
 * Pause Dice + Word Forge (heavy edge/realtime load) while keeping mining/arena core.
 * OTA: set VITE_GAMES_MAINTENANCE=true in deploy to pause Dice + Word Forge.
 */
export const GAMES_MAINTENANCE_MODE =
  import.meta.env.VITE_GAMES_MAINTENANCE === 'true';

export const GAMES_MAINTENANCE_MESSAGE =
  'Dice Roll and Word Forge are briefly offline while we upgrade server capacity. Mining, Arena markets, wallet, and leaderboard stay available — games will return soon.';
