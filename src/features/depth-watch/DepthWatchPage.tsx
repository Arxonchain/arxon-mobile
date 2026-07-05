import { useState, useEffect } from 'react';
import { useMobileNav } from '@/contexts/MobileNavContext';
import CharacterSelect from './CharacterSelect';
import GameScreen3D from './GameScreen3D';

export default function DepthWatchPage() {
  const [characterId, setCharacterId] = useState<string | null>(null);
  const { setHideNav } = useMobileNav();

  useEffect(() => {
    setHideNav(true);
    return () => setHideNav(false);
  }, [setHideNav]);

  if (characterId) {
    return (
      <GameScreen3D
        characterId={characterId}
        onExit={() => setCharacterId(null)}
      />
    );
  }

  return <CharacterSelect onSelect={setCharacterId} />;
}
