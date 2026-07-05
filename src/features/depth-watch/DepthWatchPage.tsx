import { useState, useEffect } from 'react';
import CharacterSelect from './CharacterSelect';
import GameScreen from './GameScreen';

export default function DepthWatchPage() {
  const [characterId, setCharacterId] = useState<string | null>(null);
  const { setHideNav } = useMobileNav();

  useEffect(() => {
    setHideNav(true);
    return () => setHideNav(false);
  }, [setHideNav]);

  if (characterId) {
    return (
      <GameScreen
        characterId={characterId}
        onExit={() => setCharacterId(null)}
      />
    );
  }

  return <CharacterSelect onSelect={setCharacterId} />;
}
