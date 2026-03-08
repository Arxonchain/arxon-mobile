import { motion } from 'framer-motion';
import { Trophy, Flame, Target, TrendingUp } from 'lucide-react';
import type { ArenaMarket } from '@/hooks/useArenaMarkets';

interface BattlePoolDisplayProps {
  market: ArenaMarket;
}

const BattlePoolDisplay = ({ market }: BattlePoolDisplayProps) => {
  const totalStaked = market.side_a_power + market.side_b_power;
  const sideAPercent = totalStaked > 0 ? (market.side_a_power / totalStaked) * 100 : 50;
  const sideBPercent = totalStaked > 0 ? (market.side_b_power / totalStaked) * 100 : 50;

  // Calculate multipliers based on pool imbalance
  const calculateMultiplier = (myPool: number, theirPool: number) => {
    if (myPool >= theirPool) {
      const ratio = theirPool / (myPool || 1);
      return Math.min(2 + (ratio * 3), 5);
    }
    return 5;
  };

  const sideAMultiplier = calculateMultiplier(market.side_a_power, market.side_b_power);
  const sideBMultiplier = calculateMultiplier(market.side_b_power, market.side_a_power);

  return (
    <div className="space-y-3">
      {/* Dual Pool Cards - Compact */}
      <div className="grid grid-cols-2 gap-2">
        {/* Fixed Prize Pool */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/30"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400 uppercase">Prize Pool</span>
          </div>
          <p className="text-lg font-black text-amber-400">
            {market.prize_pool >= 1000000 
              ? `${(market.prize_pool / 1000000).toFixed(1)}M` 
              : market.prize_pool >= 1000
                ? `${(market.prize_pool / 1000).toFixed(0)}K`
                : market.prize_pool.toLocaleString()
            }
          </p>
          <p className="text-[10px] text-muted-foreground">ARX-P</p>
        </motion.div>

        {/* Staking Pool */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/30"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase">Staked</span>
          </div>
          <p className="text-lg font-black text-primary">
            {totalStaked >= 1000000 
              ? `${(totalStaked / 1000000).toFixed(1)}M` 
              : totalStaked >= 1000
                ? `${(totalStaked / 1000).toFixed(0)}K`
                : totalStaked.toLocaleString()
            }
          </p>
          <p className="text-[10px] text-muted-foreground">{market.total_participants || 0} voters</p>
        </motion.div>
      </div>

      {/* Team Distribution - Compact */}
      <div className="p-3 rounded-xl bg-secondary/20 border border-border/30">
        <div className="flex items-center justify-between mb-2">
          <div className="text-center">
            <span className="text-xs font-bold" style={{ color: market.side_a_color }}>
              {market.side_a_name}
            </span>
            <p className="text-sm font-black text-foreground">{sideAPercent.toFixed(0)}%</p>
            <span className="text-[10px] text-muted-foreground">{sideAMultiplier.toFixed(1)}x</span>
          </div>
          
          <Flame className="w-4 h-4 text-orange-500" />
          
          <div className="text-center">
            <span className="text-xs font-bold" style={{ color: market.side_b_color }}>
              {market.side_b_name}
            </span>
            <p className="text-sm font-black text-foreground">{sideBPercent.toFixed(0)}%</p>
            <span className="text-[10px] text-muted-foreground">{sideBMultiplier.toFixed(1)}x</span>
          </div>
        </div>

        {/* Power Bar */}
        <div className="h-2 rounded-full overflow-hidden bg-muted flex">
          <motion.div
            className="h-full"
            style={{ backgroundColor: market.side_a_color }}
            animate={{ width: `${sideAPercent}%` }}
          />
          <motion.div
            className="h-full"
            style={{ backgroundColor: market.side_b_color }}
            animate={{ width: `${sideBPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default BattlePoolDisplay;
