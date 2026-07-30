import { useEffect } from 'react';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { WordForgeGame } from '../components/WordForgeGame';

export default function WordForgePreviewPage() {
  const { setHideNav } = useMobileNav();

  useEffect(() => {
    setHideNav(true);
    return () => setHideNav(false);
  }, [setHideNav]);

  return <WordForgeGame preview />;
}
