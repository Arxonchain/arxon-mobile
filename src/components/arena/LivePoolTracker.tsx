import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target, Flame, TrendingUp, Zap, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ArenaMarket } from '@/hooks/useArenaMarkets';

interface LivePoolTrackerProps {
  market: ArenaMarket;
  onPoolUpdate?: (sideAPower: number, sideBPower: number) => void;
}

const LivePoolTracker = ({ market, onPoolUpdate }: LivePoolTrackerProps) => {
  const [sideAPower, setSideAPower] = useState(market.side_a_power);
  const [sideBPower, setSideBPower] = useState(market.side_b_power);
  const [sideCPower, setSideCPower] = useState(market.side_c_power || 0);
  const [totalParticipants, setTotalParticipants] = useState(market.total_participants || 0);
  const [recentChange, setRecentChange] = useState<{ side: 'a' | 'b' | 'c'; amount: number } | null>(null);

  const hasSideC = !!market.side_c_name;
  const totalStaked = sideAPower + sideBPower + sideCPower;
  const sideAPercent = totalStaked > 0 ? (sideAPower / totalStaked) * 100 : hasSideC ? 33.33 : 50;
  const sideBPercent = totalStaked > 0 ? (sideBPower / totalStaked) * 100 : hasSideC ? 33.33 : 50;
  const sideCPercent = totalStaked > 0 && hasSideC ? (sideCPower / totalStaked) * 100 : 33.33;

  // Calculate multipliers based on pool imbalance
  const calculateMultiplier = (myPool: number, otherPools: number) => {
    if (myPool >= otherPools) {
      const ratio = otherPools / (myPool || 1);
      return Math.min(2 + (ratio * 3), 5);
    }
    return 5;
  };

  const sideAMultiplier = calculateMultiplier(sideAPower, sideBPower + sideCPower);
  const sideBMultiplier = calculateMultiplier(sideBPower, sideAPower + sideCPower);
  const sideCMultiplier = calculateMultiplier(sideCPower, sideAPower + sideBPower);

  useEffect(() => {
    // Subscribe to real-time updates on arena_battles
    const battleChannel = supabase
      .channel(`live-pool-${market.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'arena_battles',
          filter: `id=eq.${market.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          setSideAPower(updated.side_a_power);
          setSideBPower(updated.side_b_power);
          setSideCPower(updated.side_c_power || 0);
          setTotalParticipants(updated.total_participants || 0);
          onPoolUpdate?.(updated.side_a_power, updated.side_b_power);
        }
      )
      .subscribe();

    // Subscribe to vote inserts to show animations
    const voteChannel = supabase
      .channel(`vote-animation-${market.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'arena_votes',
          filter: `battle_id=eq.${market.id}`,
        },
        (payload) => {
          const newVote = payload.new as any;
          setRecentChange({ side: newVote.side, amount: newVote.power_spent });
          setTimeout(() => setRecentChange(null), 2000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(battleChannel);
      supabase.removeChannel(voteChannel);
    };
  }, [market.id, onPoolUpdate]);

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return amount.toLocaleString();
  };

  return (
    <div className="space-y-3">
      {/* Live Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground">Live Pool Tracker</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          <span>{totalParticipants} voters</span>
        </div>
      </div>

      {/* Dual Pool Cards */}
      <div className="grid grid-cols-2 gap-2">
        {/* Prize Pool */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/30"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400 uppercase">Prize Pool</span>
          </div>
          <p className="text-lg font-black text-amber-400">{formatAmount(market.prize_pool)}</p>
          <p className="text-[10px] text-muted-foreground">ARX-P</p>
        </motion.div>

        {/* Staking Pool with Live Updates */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/30 relative overflow-hidden"
        >
          <AnimatePresence>
            {recentChange && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 flex items-center justify-center bg-primary/20 backdrop-blur-sm"
              >
                <div className="flex items-center gap-1 text-primary font-bold">
                  <TrendingUp className="w-4 h-4" />
                  <span>+{formatAmount(recentChange.amount)}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase">Total Staked</span>
          </div>
          <motion.p
            key={totalStaked}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-lg font-black text-primary"
          >
            {formatAmount(totalStaked)}
          </motion.p>
          <p className="text-[10px] text-muted-foreground">ARX-P</p>
        </motion.div>
      </div>

      {/* Team Distribution */}
      <div className="p-3 rounded-xl bg-secondary/20 border border-border/30">
        <div className={`grid ${hasSideC ? 'grid-cols-3' : 'grid-cols-3'} gap-2 mb-3`}>
          {/* Side A */}
          <div className="text-center">
            <span className="text-xs font-bold truncate block" style={{ color: market.side_a_color }}>
              {market.side_a_name}
            </span>
            <motion.p
              key={sideAPercent}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              className="text-base font-black text-foreground"
            >
              {sideAPercent.toFixed(0)}%
            </motion.p>
            <div className="flex items-center justify-center gap-1">
              <Zap className="w-3 h-3" style={{ color: market.side_a_color }} />
              <span className="text-[10px] text-muted-foreground">{sideAMultiplier.toFixed(1)}x</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{formatAmount(sideAPower)}</p>
          </div>

          {/* Side C (Draw) or VS Icon */}
          {hasSideC ? (
            <div className="text-center">
              <span className="text-xs font-bold truncate block" style={{ color: market.side_c_color || '#888888' }}>
                {market.side_c_name}
              </span>
              <motion.p
                key={sideCPercent}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                className="text-base font-black text-foreground"
              >
                {sideCPercent.toFixed(0)}%
              </motion.p>
              <div className="flex items-center justify-center gap-1">
                <Zap className="w-3 h-3" style={{ color: market.side_c_color || '#888888' }} />
                <span className="text-[10px] text-muted-foreground">{sideCMultiplier.toFixed(1)}x</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{formatAmount(sideCPower)}</p>
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <div className="relative">
                <Flame className="w-5 h-5 text-orange-500" />
                <AnimatePresence>
                  {recentChange && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1.5 }}
                      exit={{ scale: 0 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="w-8 h-8 rounded-full bg-orange-500/30 animate-ping" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Side B */}
          <div className="text-center">
            <span className="text-xs font-bold truncate block" style={{ color: market.side_b_color }}>
              {market.side_b_name}
            </span>
            <motion.p
              key={sideBPercent}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              className="text-base font-black text-foreground"
            >
              {sideBPercent.toFixed(0)}%
            </motion.p>
            <div className="flex items-center justify-center gap-1">
              <Zap className="w-3 h-3" style={{ color: market.side_b_color }} />
              <span className="text-[10px] text-muted-foreground">{sideBMultiplier.toFixed(1)}x</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{formatAmount(sideBPower)}</p>
          </div>
        </div>

        {/* Animated Power Bar */}
        <div className="h-3 rounded-full overflow-hidden bg-muted flex relative">
          <motion.div
            className="h-full relative"
            style={{ backgroundColor: market.side_a_color }}
            animate={{ width: `${sideAPercent}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <AnimatePresence>
              {recentChange?.side === 'a' && (
                <motion.div
                  initial={{ right: 0, opacity: 1 }}
                  animate={{ right: -20, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-0 bottom-0 w-4 bg-white/50"
                />
              )}
            </AnimatePresence>
          </motion.div>
          {hasSideC && (
            <motion.div
              className="h-full relative"
              style={{ backgroundColor: market.side_c_color || '#888888' }}
              animate={{ width: `${sideCPercent}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <AnimatePresence>
                {recentChange?.side === 'c' && (
                  <motion.div
                    initial={{ left: 0, opacity: 1 }}
                    animate={{ left: -20, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-0 bottom-0 w-4 bg-white/50"
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )}
          <motion.div
            className="h-full relative"
            style={{ backgroundColor: market.side_b_color }}
            animate={{ width: `${sideBPercent}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <AnimatePresence>
              {recentChange?.side === 'b' && (
                <motion.div
                  initial={{ left: 0, opacity: 1 }}
                  animate={{ left: -20, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-0 bottom-0 w-4 bg-white/50"
                />
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LivePoolTracker;
