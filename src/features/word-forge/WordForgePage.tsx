import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { WordForgeGame } from './components/WordForgeGame';
import type { ForgeGameMode } from './hooks/useWordForgeGame';

export default function WordForgePage() {
  const { setHideNav } = useMobileNav();
  const [searchParams] = useSearchParams();
  const mode: ForgeGameMode = searchParams.get('mode') === 'daily' ? 'daily' : 'campaign';
  const resume = searchParams.get('resume') === '1';

  useEffect(() => {
    setHideNav(true);
    return () => setHideNav(false);
  }, [setHideNav]);

  return <WordForgeGame preview={false} mode={mode} resume={resume} />;
}
