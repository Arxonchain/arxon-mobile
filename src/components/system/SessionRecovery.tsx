import { useSessionRecovery } from '@/hooks/useSessionRecovery';

/**
 * Component that recovers expired mining sessions on app load.
 * Ensures users who had active sessions get their points credited.
 */
const SessionRecovery = () => {
  useSessionRecovery();
  return null;
};

export default SessionRecovery;
