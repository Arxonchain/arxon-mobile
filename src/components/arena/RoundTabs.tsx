import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import type { BattleHistoryEntry } from '@/hooks/useArena';

interface RoundTabsProps {
  battles: BattleHistoryEntry[];
  activeBattleId: string | null;
  onSelectBattle: (battleId: string) => void;
}

const RoundTabs = ({ battles, activeBattleId, onSelectBattle }: RoundTabsProps) => {
  // Create round tabs from battles (max 5 visible)
  const rounds = battles.slice(0, 5).map((battle, index) => ({
    id: battle.id,
    label: `Round ${battles.length - index}`,
    isActive: battle.is_active,
    isLocked: new Date(battle.starts_at) > new Date(),
    isCurrent: battle.id === activeBattleId,
  }));

  if (rounds.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-3">
      <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {rounds.map((round) => (
          <button
            key={round.id}
            onClick={() => !round.isLocked && onSelectBattle(round.id)}
            disabled={round.isLocked}
            className={`
              relative px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
              ${round.isCurrent
                ? 'bg-primary text-primary-foreground'
                : round.isLocked
                  ? 'bg-secondary/50 text-muted-foreground cursor-not-allowed'
                  : 'bg-secondary text-foreground hover:bg-secondary/80'
              }
            `}
          >
            <span className="flex items-center gap-1">
              {round.label}
              {round.isLocked && <Lock className="w-3 h-3" />}
            </span>
            
            {round.isCurrent && (
              <motion.div
                layoutId="activeRound"
                className="absolute inset-0 rounded-full border-2 border-primary"
                initial={false}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      <button className="p-2 text-muted-foreground hover:text-foreground transition-colors">
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default RoundTabs;
