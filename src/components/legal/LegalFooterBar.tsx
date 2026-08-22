import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LegalFooterBarProps {
  className?: string;
  linkClassName?: string;
}

/** Compact Terms · Privacy footer for sidebars and layouts */
export default function LegalFooterBar({
  className,
  linkClassName = 'text-muted-foreground hover:text-foreground hover:underline',
}: LegalFooterBarProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2 text-xs text-muted-foreground', className)}>
      <Link to="/terms" className={linkClassName}>
        Terms
      </Link>
      <span aria-hidden className="opacity-50">
        ·
      </span>
      <Link to="/privacy" className={linkClassName}>
        Privacy
      </Link>
    </div>
  );
}
