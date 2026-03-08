import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, Crown, Shield, Award, Star, TrendingUp, Flame, Skull } from 'lucide-react';
import type { ArenaBattle } from '@/hooks/useArena';

interface PrizePoolProps {
  battle: ArenaBattle | null;
}

const PrizePool = ({ battle }: PrizePoolProps) => {
  const poolStats = useMemo(() => {
    if (!battle) return null;

    const totalPool = battle.side_a_power + battle.side_b_power;
    const alphaPercentage = totalPool > 0 ? (battle.side_a_power / totalPool) * 100 : 50;
    const omegaPercentage = totalPool > 0 ? (battle.side_b_power / totalPool) * 100 : 50;

    // Calculate multipliers for each side
    const calcMultiplier = (myPool: number, theirPool: number) => {
      if (myPool <= 0) return 2;
      if (myPool >= theirPool) {
        const ratio = theirPool / myPool;
        return Math.min(2 + (ratio * 3), 5);
      }
      return 5;
    };

    const alphaMultiplier = calcMultiplier(battle.side_a_power, battle.side_b_power);
    const omegaMultiplier = calcMultiplier(battle.side_b_power, battle.side_a_power);

    return {
      totalPool,
      alphaPool: battle.side_a_power,
      omegaPool: battle.side_b_power,
      alphaPercentage,
      omegaPercentage,
      alphaMultiplier,
      omegaMultiplier,
      alphaIsUnderdog: battle.side_a_power < battle.side_b_power,
      omegaIsUnderdog: battle.side_b_power < battle.side_a_power,
    };
  }, [battle]);

  const rewards = [
    {
      icon: Zap,
      title: 'Instant Mining Boost',
      value: '+25%',
      description: 'All stakers get +25% mining boost immediately until battle ends',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: TrendingUp,
      title: 'Winner Multiplier',
      value: '2x-5x',
      description: 'Winners get 2x-5x their stake back (underdogs get higher multipliers)',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: Trophy,
      title: 'Loser Pool Split',
      value: '100%',
      description: 'Winners share the ENTIRE losing pool proportionally to their stake',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      icon: Skull,
      title: 'High Stakes',
      value: 'All or Nothing',
      description: 'Losers get NOTHING back. Full risk, full reward!',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      icon: Award,
      title: 'Winner Badge',
      value: 'Exclusive',
      description: 'Earn a unique badge and +25% boost for 7 more days',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="px-4 py-6 space-y-6">
      <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
        <Flame className="w-5 h-5 text-primary" />
        Prize Pool
      </h2>

      {/* Total Stakes Card */}
      {poolStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/30"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total At Stake</p>
                <p className="text-2xl font-black text-foreground">
                  {poolStats.totalPool.toLocaleString()} ARX-P
                </p>
              </div>
            </div>
          </div>

          {/* Alpha Side */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <span className="font-bold text-amber-500">TEAM ALPHA</span>
                  {poolStats.alphaIsUnderdog && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">UNDERDOG</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-amber-500">
                    {poolStats.alphaMultiplier.toFixed(1)}x
                  </span>
                  <span className="text-xs text-muted-foreground block">multiplier</span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{poolStats.alphaPool.toLocaleString()} ARX-P</span>
                <span className="font-bold text-amber-500">{poolStats.alphaPercentage.toFixed(1)}%</span>
              </div>
            </div>

            {/* Power Bar */}
            <div className="h-4 rounded-full bg-muted overflow-hidden">
              <div className="flex h-full">
                <motion.div
                  className="bg-gradient-to-r from-amber-600 to-amber-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${poolStats.alphaPercentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
                <motion.div
                  className="bg-gradient-to-r from-primary to-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${poolStats.omegaPercentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Omega Side */}
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="font-bold text-primary">TEAM OMEGA</span>
                  {poolStats.omegaIsUnderdog && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">UNDERDOG</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-primary">
                    {poolStats.omegaMultiplier.toFixed(1)}x
                  </span>
                  <span className="text-xs text-muted-foreground block">multiplier</span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{poolStats.omegaPool.toLocaleString()} ARX-P</span>
                <span className="font-bold text-primary">{poolStats.omegaPercentage.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* How It Works */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
          How Rewards Work
        </h3>
        
        {rewards.map((reward, index) => (
          <motion.div
            key={reward.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 border border-border/30"
          >
            <div className={`w-12 h-12 rounded-xl ${reward.bgColor} flex items-center justify-center flex-shrink-0`}>
              <reward.icon className={`w-6 h-6 ${reward.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-foreground">{reward.title}</h4>
              <p className="text-xs text-muted-foreground line-clamp-2">{reward.description}</p>
            </div>
            <div className={`font-black text-sm ${reward.color} flex-shrink-0`}>
              {reward.value}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Example Calculation */}
      <div className="p-4 rounded-xl bg-secondary/20 border border-border/30">
        <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          Example Win
        </h4>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• You stake <span className="text-foreground font-bold">1,000 ARX-P</span> on the underdog team</p>
          <p>• Underdog wins! You get <span className="text-green-500 font-bold">5x multiplier</span></p>
          <p>• Your return: <span className="text-green-500 font-bold">1,000 + 4,000 + share of losers = 8,000+ ARX-P!</span></p>
        </div>
      </div>
    </div>
  );
};

export default PrizePool;