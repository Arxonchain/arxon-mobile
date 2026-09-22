import type { ReactNode } from 'react';
import { GAMES_MAINTENANCE_MODE } from '@/lib/gamesMaintenance';
import GamesMaintenanceScreen from '@/components/system/GamesMaintenanceScreen';

/** Wrap game route elements — shows maintenance overlay when flag is on. */
export function gamesRouteContent(children: ReactNode): ReactNode {
  if (GAMES_MAINTENANCE_MODE) return <GamesMaintenanceScreen />;
  return children;
}
