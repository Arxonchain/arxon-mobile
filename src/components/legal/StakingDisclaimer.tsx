import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StakingDisclaimerProps {
  className?: string;
  variant?: 'classic' | 'compact';
}

const DISCLAIMER_TEXT =
  'ARX-P points have no cash value. Staking and prediction features are for entertainment only — not financial advice. You must be 18+. Laws vary by jurisdiction; you are responsible for compliance.';

/** Shown before confirming a stake (P0 #12) */
export default function StakingDisclaimer({ className, variant = 'classic' }: StakingDisclaimerProps) {
  if (variant === 'compact') {
    return (
      <p className={cn('text-[10px] leading-relaxed text-muted-foreground/80', className)}>
        {DISCLAIMER_TEXT}
      </p>
    );
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25',
        className,
      )}
    >
      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <p className="text-xs leading-relaxed text-muted-foreground">{DISCLAIMER_TEXT}</p>
    </div>
  );
}

export { DISCLAIMER_TEXT as STAKING_DISCLAIMER_TEXT };
