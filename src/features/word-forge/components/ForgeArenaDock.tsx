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

/** Compact left-side utility rail — stays out of the playfield. */
export function ForgeArenaDock({
  dailyDone, onStats, onSettings, onLeaderboard, onMap, onDaily, onRewards,
}: ForgeArenaDockProps) {
  const iconSize = 36;
  const dockBtn = (size: number) => size;

  return (
    <div
      aria-label="Game shortcuts"
      style={{
        position: 'fixed',
        left: 'max(8px, env(safe-area-inset-left))',
        top: '50%',
        transform: 'translateY(-42%)',
        zIndex: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'auto',
      }}
    >
      <GlossyIconButton label="Stats" color="slate" size={dockBtn(iconSize)} onClick={onStats}>
        <BarChart3 size={17} strokeWidth={2.6} />
      </GlossyIconButton>
      <GlossyIconButton label="Leaderboard" color="slate" size={dockBtn(iconSize)} onClick={onLeaderboard}>
        <Trophy size={17} strokeWidth={2.6} />
      </GlossyIconButton>
      <GlossyIconButton label="Sector map" color="slate" size={dockBtn(iconSize)} onClick={onMap}>
        <Map size={17} strokeWidth={2.6} />
      </GlossyIconButton>
      <GlossyIconButton
        label="Daily milestone"
        color={dailyDone ? 'slate' : 'gold'}
        size={dockBtn(iconSize)}
        badge={dailyDone ? null : '+50'}
        onClick={onDaily}
      >
        <Gift size={17} strokeWidth={2.6} />
      </GlossyIconButton>
      <GlossyIconButton label="Rewards" color="slate" size={dockBtn(iconSize)} onClick={onRewards}>
        <Sparkles size={17} strokeWidth={2.6} />
      </GlossyIconButton>
      <GlossyIconButton label="Settings" color="slate" size={dockBtn(iconSize)} onClick={onSettings}>
        <Settings size={17} strokeWidth={2.6} />
      </GlossyIconButton>
    </div>
  );
}
