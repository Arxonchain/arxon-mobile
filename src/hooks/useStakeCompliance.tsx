import { useCallback, useRef, useState } from 'react';
import AgeGateDialog from '@/components/legal/AgeGateDialog';
import { confirmStakeCompliance, hasConfirmedStakeCompliance } from '@/lib/legal/stakeCompliance';

/**
 * Gate stake/wager actions behind the one-time age + disclaimer dialog.
 * Returns `gateStakeAction(fn)` — runs fn immediately if already confirmed, else shows dialog.
 */
export function useStakeCompliance() {
  const [open, setOpen] = useState(false);
  const pendingRef = useRef<(() => void) | null>(null);

  const gateStakeAction = useCallback((action: () => void) => {
    if (hasConfirmedStakeCompliance()) {
      action();
      return;
    }
    pendingRef.current = action;
    setOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    confirmStakeCompliance();
    setOpen(false);
    const next = pendingRef.current;
    pendingRef.current = null;
    next?.();
  }, []);

  const handleDecline = useCallback(() => {
    setOpen(false);
    pendingRef.current = null;
  }, []);

  const complianceDialog = (
    <AgeGateDialog open={open} onConfirm={handleConfirm} onDecline={handleDecline} />
  );

  return { gateStakeAction, complianceDialog };
}
