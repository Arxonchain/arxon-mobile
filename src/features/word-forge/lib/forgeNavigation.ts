import { hasActiveForgeSession } from '@/features/word-forge/hooks/useForgeActiveSession';

/** Where sub-pages should return when an in-progress round exists */
export function forgeBackPath(): string {
  return hasActiveForgeSession() ? '/word-forge?resume=1' : '/games';
}
