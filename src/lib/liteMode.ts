/**
 * Lite Mode Configuration
 * 
 * When enabled, this disables heavy features to reduce database load.
 * Features are progressively enabled as capacity increases.
 */

export const LITE_MODE = {
  // Features that are ENABLED (core functionality)
  MINING_ENABLED: true,
  CLAIM_ENABLED: true,
  REFERRALS_ENABLED: true,
  TASKS_ENABLED: true, // Keep tasks available
  
  // Features that are DISABLED (heavy load)
  NEXUS_ENABLED: false,
  X_FEATURES_ENABLED: false,
  ARENA_ENABLED: true, // Arena stays on per user request
  PUBLIC_LEADERBOARD_ENABLED: true, // Keep public leaderboard
};

export function isFeatureEnabled(feature: keyof typeof LITE_MODE): boolean {
  return LITE_MODE[feature];
}
