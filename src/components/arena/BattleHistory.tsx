import { motion } from 'framer-motion';
import { History, Trophy, Zap, CheckCircle, XCircle, Clock } from 'lucide-react';
import { ArenaBattle } from '@/hooks/useArena';

interface BattleHistoryEntry extends ArenaBattle {
  user_participated?: boolean;
  user_voted_side?: 'a' | 'b' | null;
  user_won?: boolean;
  user_stake?: number;
}

interface BattleHistoryProps {
  battles: BattleHistoryEntry[];
  currentUserId?: string;
}

const BattleHistory = ({ battles, currentUserId }: BattleHistoryProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getWinnerName = (battle: BattleHistoryEntry) => {
    if (!battle.winner_side) return 'No winner';
    return battle.winner_side === 'a' ? battle.side_a_name : battle.side_b_name;
  };

  const getWinnerColor = (battle: BattleHistoryEntry) => {
    if (!battle.winner_side) return '#888';
    return battle.winner_side === 'a' ? battle.side_a_color : battle.side_b_color;
  };

  return (
    <div className="glass-card p-6 border border-primary/20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
          <History className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Battle History</h3>
          <p className="text-sm text-muted-foreground">Past battles and results</p>
        </div>
      </div>

      {/* Battle List */}
      <div className="space-y-4">
        {battles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No past battles yet</p>
          </div>
        ) : (
          battles.map((battle, index) => (
            <motion.div
              key={battle.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 rounded-lg bg-background/30 border border-border/30"
            >
              {/* Battle Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-foreground">{battle.title}</h4>
                  <p className="text-xs text-muted-foreground">{formatDate(battle.ends_at)}</p>
                </div>
                {battle.user_participated && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                    battle.user_won 
                      ? 'bg-green-500/20 text-green-500' 
                      : 'bg-red-500/20 text-red-500'
                  }`}>
                    {battle.user_won ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        <span>Won</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" />
                        <span>Lost</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Battle Sides */}
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className={`flex-1 p-2 rounded-lg text-center ${
                    battle.winner_side === 'a' ? 'ring-2 ring-[var(--ring-color)]' : ''
                  }`}
                  style={{ 
                    backgroundColor: `${battle.side_a_color}15`,
                    '--ring-color': battle.side_a_color
                  } as React.CSSProperties}
                >
                  <div className="font-medium text-foreground text-sm">{battle.side_a_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {battle.side_a_power.toLocaleString()} ARX-P
                  </div>
                </div>
                
                <span className="text-muted-foreground text-xs">VS</span>
                
                <div 
                  className={`flex-1 p-2 rounded-lg text-center ${
                    battle.winner_side === 'b' ? 'ring-2 ring-[var(--ring-color)]' : ''
                  }`}
                  style={{ 
                    backgroundColor: `${battle.side_b_color}15`,
                    '--ring-color': battle.side_b_color
                  } as React.CSSProperties}
                >
                  <div className="font-medium text-foreground text-sm">{battle.side_b_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {battle.side_b_power.toLocaleString()} ARX-P
                  </div>
                </div>
              </div>

              {/* Winner */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" style={{ color: getWinnerColor(battle) }} />
                  <span className="text-sm font-medium" style={{ color: getWinnerColor(battle) }}>
                    {getWinnerName(battle)} won
                  </span>
                </div>
                
                {battle.user_stake && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Zap className="w-3 h-3 text-primary" />
                    <span>You staked {battle.user_stake.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default BattleHistory;
