import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, Clock, Trophy, Target, Zap, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import type { ArenaMarket, MarketVote } from '@/hooks/useArenaMarkets';

interface ArenaMyVotesProps {
  liveMarkets: ArenaMarket[];
  endedMarkets: ArenaMarket[];
  userPositions: Map<string, MarketVote>;
  onSelectMarket: (market: ArenaMarket) => void;
  availablePoints: number;
}

const ArenaMyVotes = ({
  liveMarkets,
  endedMarkets,
  userPositions,
  onSelectMarket,
  availablePoints,
}: ArenaMyVotesProps) => {
  const { activeVotes, settledVotes, stats } = useMemo(() => {
    const active: { market: ArenaMarket; vote: MarketVote }[] = [];
    const settled: { market: ArenaMarket; vote: MarketVote; won: boolean; payout: number }[] = [];
    
    let totalStaked = 0;
    let totalWon = 0;
    let totalLost = 0;
    let wins = 0;
    let losses = 0;

    // Process active votes (live markets)
    liveMarkets.forEach(market => {
      const vote = userPositions.get(market.id);
      if (vote) {
        active.push({ market, vote });
        totalStaked += vote.power_spent;
      }
    });

    // Process settled votes (ended markets with winner)
    endedMarkets.forEach(market => {
      const vote = userPositions.get(market.id);
      if (vote && market.winner_side) {
        const won = vote.side === market.winner_side;
        
        // Calculate approximate payout (simplified)
        const myPool = vote.side === 'a' ? market.side_a_power : market.side_b_power;
        const theirPool = vote.side === 'a' ? market.side_b_power : market.side_a_power;
        const multiplier = Math.min(2 + (theirPool / myPool) * 3, 5);
        
        const payout = won 
          ? vote.power_spent + (vote.power_spent * (multiplier - 1)) + ((vote.power_spent / myPool) * theirPool)
          : 0;

        settled.push({ market, vote, won, payout: Math.round(payout) });

        if (won) {
          wins++;
          totalWon += payout - vote.power_spent;
        } else {
          losses++;
          totalLost += vote.power_spent;
        }
      }
    });

    return {
      activeVotes: active,
      settledVotes: settled,
      stats: {
        totalStaked,
        totalWon,
        totalLost,
        netProfit: totalWon - totalLost,
        wins,
        losses,
        winRate: wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0,
      },
    };
  }, [liveMarkets, endedMarkets, userPositions]);

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Portfolio Overview */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Your Portfolio</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
            <p className="text-2xl font-black text-foreground">
              {availablePoints.toLocaleString()}
              <span className="text-sm font-medium text-muted-foreground ml-1">ARX-P</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Active Stakes</p>
            <p className="text-2xl font-black text-primary">
              {stats.totalStaked.toLocaleString()}
              <span className="text-sm font-medium text-muted-foreground ml-1">ARX-P</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-2 rounded-xl bg-background/50">
            <p className="text-lg font-bold text-green-500">
              +{stats.totalWon.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Won</p>
          </div>
          <div className="p-2 rounded-xl bg-background/50">
            <p className="text-lg font-bold text-red-500">
              -{stats.totalLost.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Lost</p>
          </div>
          <div className="p-2 rounded-xl bg-background/50">
            <p className={`text-lg font-bold ${stats.netProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {stats.netProfit >= 0 ? '+' : ''}{stats.netProfit.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Net P/L</p>
          </div>
        </div>
      </div>

      {/* Win/Loss Stats */}
      <div className="flex gap-3">
        <div className="flex-1 p-3 rounded-xl bg-secondary/30 border border-border/30 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Target className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Win Rate</span>
          </div>
          <p className="text-xl font-black text-amber-500">{stats.winRate.toFixed(0)}%</p>
        </div>
        <div className="flex-1 p-3 rounded-xl bg-secondary/30 border border-border/30 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Trophy className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Wins</span>
          </div>
          <p className="text-xl font-black text-green-500">{stats.wins}</p>
        </div>
        <div className="flex-1 p-3 rounded-xl bg-secondary/30 border border-border/30 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-muted-foreground">Losses</span>
          </div>
          <p className="text-xl font-black text-red-500">{stats.losses}</p>
        </div>
      </div>

      {/* Active Votes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Active Votes
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
              {activeVotes.length}
            </span>
          </h3>
        </div>

        <AnimatePresence mode="popLayout">
          {activeVotes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 rounded-xl bg-secondary/20 border border-dashed border-border/50 text-center"
            >
              <Zap className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No active votes</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Cast your first prediction vote on a live market!
              </p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {activeVotes.map(({ market, vote }, index) => (
                <motion.div
                  key={market.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSelectMarket(market)}
                  className="p-4 rounded-xl bg-card/50 border border-primary/20 cursor-pointer hover:border-primary/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{market.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span 
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ 
                            backgroundColor: `${vote.side === 'a' ? market.side_a_color : market.side_b_color}20`,
                            color: vote.side === 'a' ? market.side_a_color : market.side_b_color
                          }}
                        >
                          {vote.side === 'a' ? market.side_a_name : market.side_b_name}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Zap className="w-3 h-3 text-primary" />
                          +25% Boost
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-primary">
                        {vote.power_spent.toLocaleString()} ARX-P
                      </p>
                      <p className="text-xs text-muted-foreground">Staked</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Settled Votes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
            Settled Votes
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {settledVotes.length}
            </span>
          </h3>
        </div>

        <AnimatePresence mode="popLayout">
          {settledVotes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 rounded-xl bg-secondary/20 border border-dashed border-border/50 text-center"
            >
              <Trophy className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No settled votes yet</p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {settledVotes.slice(0, 10).map(({ market, vote, won, payout }, index) => (
                <motion.div
                  key={market.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onSelectMarket(market)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    won
                      ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40'
                      : 'bg-red-500/5 border-red-500/20 hover:border-red-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {won ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span className={`text-xs font-bold ${won ? 'text-green-500' : 'text-red-500'}`}>
                          {won ? 'WON' : 'LOST'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{market.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Voted: {vote.side === 'a' ? market.side_a_name : market.side_b_name}
                        {' • '}
                        Winner: {market.winner_side === 'a' ? market.side_a_name : market.side_b_name}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold ${won ? 'text-green-500' : 'text-red-500'}`}>
                        {won ? '+' : '-'}{(won ? payout - vote.power_spent : vote.power_spent).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Staked: {vote.power_spent.toLocaleString()}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ArenaMyVotes;
