import { useNavigate } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import AppFailureScreen from '@/components/system/AppFailureScreen';
import { GAMES_MAINTENANCE_MESSAGE } from '@/lib/gamesMaintenance';

/** Full-screen maintenance gate for Dice + Word Forge routes. */
export default function GamesMaintenanceScreen() {
  const navigate = useNavigate();

  return (
    <AppFailureScreen
      icon={Wrench}
      title="Games on maintenance"
      message={GAMES_MAINTENANCE_MESSAGE}
      primaryLabel="Back to Home"
      onPrimary={() => navigate('/')}
      secondaryLabel="Open Arena"
      onSecondary={() => navigate('/arena')}
      showLogo
    />
  );
}
