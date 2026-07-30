import { BarChart3, Gift, Map, Settings, Sparkles, Trophy } from 'lucide-react';
import { GlossyIconButton } from './GlossyKit';

interface ForgeArenaDockProps {
  dailyDone: boolean;
  onStats: () => void;
  onSettings: () => void;
  onLeaderboard: () => void;
  onMap: () => void;
  onDaily: () => void;
  onRewards: () => void;
}

/** Compact utility row — sits centered below the letter wheel. */
export function ForgeArenaDock({
  dailyDone, onStats, onSettings, onLeaderboard, onMap, onDaily, onRewards,
}: ForgeArenaDockProps) {
  const iconSize = 38;

  return (
    <div
      aria-label="Game shortcuts"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
        marginTop: 10,
        padding: '0 4px',
      }}
    >
      <GlossyIconButton label="Stats" color="slate" size={iconSize} onClick={onStats}>
        <BarChart3 size={17} strokeWidth={2.6} />
      </GlossyIconButton>
      <GlossyIconButton label="Leaderboard" color="slate" size={iconSize} onClick={onLeaderboard}>
        <Trophy size={17} strokeWidth={2.6} />
      </GlossyIconButton>
      <GlossyIconButton label="Sector map" color="slate" size={iconSize} onClick={onMap}>
        <Map size={17} strokeWidth={2.6} />
      </GlossyIconButton>
      <GlossyIconButton
        label="Daily milestone"
        color={dailyDone ? 'slate' : 'gold'}
        size={iconSize}
        badge={dailyDone ? null : '+50'}
        onClick={onDaily}
      >
        <Gift size={17} strokeWidth={2.6} />
      </GlossyIconButton>
      <GlossyIconButton label="Rewards" color="slate" size={iconSize} onClick={onRewards}>
        <Sparkles size={17} strokeWidth={2.6} />
      </GlossyIconButton>
      <GlossyIconButton label="Settings" color="slate" size={iconSize} onClick={onSettings}>
        <Settings size={17} strokeWidth={2.6} />
      </GlossyIconButton>
    </div>
  );
}
