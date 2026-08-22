import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface LegalLinksProps {
  className?: string;
  linkClassName?: string;
  separator?: string;
}

/** Inline Terms + Privacy links for footers and auth copy */
export default function LegalLinks({
  className,
  linkClassName = 'text-primary hover:underline',
  separator = ' and ',
}: LegalLinksProps) {
  return (
    <span className={cn(className)}>
      <Link to="/terms" className={linkClassName}>
        Terms of Service
      </Link>
      {separator}
      <Link to="/privacy" className={linkClassName}>
        Privacy Policy
      </Link>
    </span>
  );
}
