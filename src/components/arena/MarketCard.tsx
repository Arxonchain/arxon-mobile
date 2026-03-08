import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, TrendingUp, Trophy, Flame, ChevronRight, Zap, Gift, Activity, Sparkles, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { ArenaMarket, MarketVote } from '@/hooks/useArenaMarkets';
import AIPredictionBadge from './AIPredictionBadge';
import EarlyStakerBonus from './EarlyStakerBonus';

interface MarketCardProps {
  market: ArenaMarket;
  userPosition?: MarketVote;
  onClick: () => void;
  variant?: 'default' | 'compact' | 'featured';
}

const categoryConfig: Record<string, {
  gradient: string;
  glow: string;
  icon: string;
  accentFrom: string;
  accentTo: string;
}> = {
  sports: {
    gradient: 'from-emerald-500/20 via-green-500/10 to-teal-500/5',
    glow: 'shadow-emerald-500/20',
    icon: '⚽',
    accentFrom: '#10b981',
    accentTo: '#14b8a6',
  },
  politics: {
    gradient: 'from-blue-500/20 via-indigo-500/10 to-violet-500/5',
    glow: 'shadow-blue-500/20',
    icon: '🏛️',
    accentFrom: '#3b82f6',
    accentTo: '#8b5cf6',
  },
  crypto: {
    gradient: 'from-amber-500/20 via-orange-500/10 to-yellow-500/5',
    glow: 'shadow-amber-500/20',
    icon: '₿',
    accentFrom: '#f59e0b',
    accentTo: '#eab308',
  },
  entertainment: {
    gradient: 'from-pink-500/20 via-purple-500/10 to-fuchsia-500/5',
    glow: 'shadow-pink-500/20',
    icon: '🎬',
    accentFrom: '#ec4899',
    accentTo: '#d946ef',
  },
  other: {
    gradient: 'from-slate-500/20 via-gray-500/10 to-zinc-500/5',
    glow: 'shadow-slate-500/20',
    icon: '📊',
    accentFrom: '#64748b',
    accentTo: '#71717a',
  },
};

const MarketCard = ({ market, userPosition, onClick, variant = 'default' }: MarketCardProps) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [recentActivity, setRecentActivity] = useState(false);
  const [liveStake, setLiveStake] = useState<{ side: 'a' | 'b'; amount: number } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const hasSideC = !!market.side_c_name;
  const totalPool = market.side_a_power + market.side_b_power + (market.side_c_power || 0);
  const sideAPercent = totalPool > 0 ? (market.side_a_power / totalPool) * 100 : hasSideC ? 33.33 : 50;
  const sideBPercent = totalPool > 0 ? (market.side_b_power / totalPool) * 100 : hasSideC ? 33.33 : 50;
  const sideCPercent = totalPool > 0 && hasSideC ? ((market.side_c_power || 0) / totalPool) * 100 : 33.33;
  
  const config = categoryConfig[market.category] || categoryConfig.other;
  
  // Recalculate status based on current time
  const isEnded = !!market.winner_side || new Date(market.ends_at) < currentTime;
  const isUpcoming = new Date(market.starts_at) > currentTime;
  const isLive = !isEnded && !isUpcoming;

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const target = isUpcoming 
        ? new Date(market.starts_at).getTime()
        : new Date(market.ends_at).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(isUpcoming ? 'Starting...' : 'Ended');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [market.ends_at, market.starts_at, isUpcoming]);

  // Real-time activity subscription
  useEffect(() => {
    if (!isLive) return;

    const channel = supabase
      .channel(`card-activity-${market.id}`)
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
          setRecentActivity(true);
          setLiveStake({ side: newVote.side, amount: newVote.power_spent });
          setTimeout(() => {
            setRecentActivity(false);
            setLiveStake(null);
          }, 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [market.id, isLive]);

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full p-3 rounded-xl bg-card/50 border border-border/40 text-left touch-manipulation select-none transition-all duration-200 hover:bg-secondary/30 active:bg-secondary/50 active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{market.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">{config.icon} {market.category}</span>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground">{market.total_participants || 0} voters</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-bold text-primary">{totalPool >= 1000 ? `${(totalPool/1000).toFixed(0)}K` : totalPool}</p>
            <p className="text-[10px] text-muted-foreground">{timeLeft}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </div>
      </button>
    );
  }

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl md:rounded-2xl w-full text-left
        touch-manipulation select-none transition-all duration-300
        bg-gradient-to-br ${config.gradient}
        border ${userPosition ? 'border-primary/50' : recentActivity ? 'border-accent/50' : 'border-border/30'}
        hover:border-primary/40 hover:shadow-xl ${config.glow}
        backdrop-blur-sm
        ${variant === 'featured' ? 'p-3 md:p-5' : 'p-3 md:p-4'}
      `}
    >
      {/* Animated background shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer pointer-events-none" />
      
      {/* Corner accent */}
      <div 
        className="absolute top-0 right-0 w-24 h-24 opacity-30 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, ${config.accentFrom}40, transparent 70%)`,
        }}
      />

      {/* Live stake animation overlay */}
      <AnimatePresence>
        {liveStake && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-0 left-0 right-0 px-3 py-1.5 flex items-center justify-center gap-1.5 z-10 backdrop-blur-sm"
            style={{ 
              background: `linear-gradient(90deg, ${liveStake.side === 'a' ? market.side_a_color : market.side_b_color}30, transparent)`,
              borderBottom: `2px solid ${liveStake.side === 'a' ? market.side_a_color : market.side_b_color}60`
            }}
          >
            <Activity className="w-3.5 h-3.5 text-foreground animate-pulse" />
            <span className="text-xs font-bold text-foreground">
              +{liveStake.amount >= 1000 ? `${(liveStake.amount / 1000).toFixed(1)}K` : liveStake.amount} on {liveStake.side === 'a' ? market.side_a_name : market.side_b_name}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category & Status Header */}
      <div className="flex items-center justify-between mb-2 md:mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm md:text-lg">{config.icon}</span>
          <span className="text-[9px] md:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {market.category}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {isEnded ? (
            <span className="px-1.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground text-[9px] font-bold">
              Ended
            </span>
          ) : isUpcoming ? (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[9px] font-bold flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              Soon
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[9px] font-bold flex items-center gap-0.5">
              <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          )}
          
          {market.prize_pool > 0 && (
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/30 to-yellow-500/20 border border-amber-500/40">
              <Gift className="w-2.5 h-2.5 text-amber-400" />
              <span className="text-[9px] font-black text-amber-400">
                {market.prize_pool >= 1000000 
                  ? `${(market.prize_pool / 1000000).toFixed(1)}M` 
                  : market.prize_pool >= 1000 
                    ? `${(market.prize_pool / 1000).toFixed(0)}K` 
                    : market.prize_pool}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className={`font-black text-foreground leading-tight mb-2 md:mb-4 ${variant === 'featured' ? 'text-sm md:text-lg' : 'text-xs md:text-base'}`}>
        {market.title}
      </h3>

      {/* VS Section - Compact Mobile Design */}
      <div className="relative flex items-stretch gap-1.5 md:gap-2 mb-2 md:mb-4">
        {/* Side A */}
        <div 
          className="flex-1 p-2 md:p-3 rounded-lg md:rounded-xl text-center transition-all duration-300"
          style={{ 
            background: `linear-gradient(135deg, ${market.side_a_color}25, ${market.side_a_color}10)`,
            border: `1px solid ${market.side_a_color}40`,
          }}
        >
          <div 
            className="w-7 h-7 md:w-10 md:h-10 mx-auto rounded-md md:rounded-lg flex items-center justify-center text-xs md:text-lg font-black mb-1 md:mb-2 shadow-lg"
            style={{ 
              background: `linear-gradient(135deg, ${market.side_a_color}, ${market.side_a_color}cc)`,
              color: '#fff',
            }}
          >
            {market.side_a_name.charAt(0)}
          </div>
          <p className="text-[10px] md:text-xs font-bold truncate mb-0.5" style={{ color: market.side_a_color }}>
            {market.side_a_name}
          </p>
          <p className="text-base md:text-xl font-black" style={{ color: market.side_a_color }}>
            {sideAPercent.toFixed(0)}%
          </p>
        </div>

        {/* VS Divider */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-background/80 border border-border/50 flex items-center justify-center">
            <span className="text-[8px] md:text-[10px] font-black text-muted-foreground">VS</span>
          </div>
        </div>

        {/* Side B */}
        <div 
          className="flex-1 p-2 md:p-3 rounded-lg md:rounded-xl text-center transition-all duration-300"
          style={{ 
            background: `linear-gradient(135deg, ${market.side_b_color}25, ${market.side_b_color}10)`,
            border: `1px solid ${market.side_b_color}40`,
          }}
        >
          <div 
            className="w-7 h-7 md:w-10 md:h-10 mx-auto rounded-md md:rounded-lg flex items-center justify-center text-xs md:text-lg font-black mb-1 md:mb-2 shadow-lg"
            style={{ 
              background: `linear-gradient(135deg, ${market.side_b_color}, ${market.side_b_color}cc)`,
              color: '#fff',
            }}
          >
            {market.side_b_name.charAt(0)}
          </div>
          <p className="text-[10px] md:text-xs font-bold truncate mb-0.5" style={{ color: market.side_b_color }}>
            {market.side_b_name}
          </p>
          <p className="text-base md:text-xl font-black" style={{ color: market.side_b_color }}>
            {sideBPercent.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Side C (Draw) if exists */}
      {hasSideC && (
        <div 
          className="mb-2 md:mb-4 p-1.5 md:p-2 rounded-md md:rounded-lg text-center"
          style={{ 
            background: `linear-gradient(90deg, ${market.side_c_color || '#888'}20, transparent, ${market.side_c_color || '#888'}20)`,
            border: `1px solid ${market.side_c_color || '#888'}30`,
          }}
        >
          <span className="text-[10px] md:text-xs font-bold" style={{ color: market.side_c_color || '#888' }}>
            {market.side_c_name}: {sideCPercent.toFixed(0)}%
          </span>
        </div>
      )}

      {/* Pool Progress Bar */}
      <div className="mb-2 md:mb-3">
        <div className="h-1.5 md:h-2 rounded-full bg-muted/30 overflow-hidden flex">
          <motion.div
            className="h-full"
            style={{ backgroundColor: market.side_a_color }}
            initial={{ width: hasSideC ? '33%' : '50%' }}
            animate={{ width: `${sideAPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          {hasSideC && (
            <motion.div
              className="h-full"
              style={{ backgroundColor: market.side_c_color || '#888' }}
              initial={{ width: '33%' }}
              animate={{ width: `${sideCPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          )}
          <motion.div
            className="h-full"
            style={{ backgroundColor: market.side_b_color }}
            initial={{ width: hasSideC ? '33%' : '50%' }}
            animate={{ width: `${sideBPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* AI & Early Staker Badges - Hidden on mobile for space */}
      {isLive && (
        <div className="hidden md:flex items-center gap-2 mb-3 flex-wrap">
          {market.ai_side_a_probability !== undefined && market.ai_side_a_probability !== null && (
            <AIPredictionBadge
              sideAProbability={Number(market.ai_side_a_probability) || 50}
              sideBProbability={Number(market.ai_side_b_probability) || 50}
              confidence={market.ai_confidence || 'moderate'}
              sideAName={market.side_a_name}
              sideBName={market.side_b_name}
              sideAColor={market.side_a_color}
              sideBColor={market.side_b_color}
              compact
            />
          )}
          {!userPosition && (
            <EarlyStakerBonus startsAt={market.starts_at} endsAt={market.ends_at} compact />
          )}
        </div>
      )}

      {/* Footer Stats */}
      <div className="flex items-center justify-between pt-2 md:pt-3 border-t border-border/30">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-0.5 text-[10px] md:text-xs">
            <BarChart3 className="w-3 h-3 md:w-3.5 md:h-3.5 text-primary" />
            <span className="font-bold text-foreground">
              {totalPool >= 1000 ? `${(totalPool/1000).toFixed(0)}K` : totalPool}
            </span>
          </div>
          <div className="flex items-center gap-0.5 text-[10px] md:text-xs text-muted-foreground">
            <Users className="w-3 h-3 md:w-3.5 md:h-3.5" />
            <span>{market.total_participants || 0}</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 text-[10px] md:text-xs">
          <Clock className="w-3 h-3 md:w-3.5 md:h-3.5 text-muted-foreground" />
          <span className="font-medium text-muted-foreground">{timeLeft}</span>
        </div>
      </div>

      {/* Winner Badge */}
      {isEnded && market.winner_side && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-3 pt-3 border-t border-amber-500/30 flex items-center justify-center gap-2"
        >
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-black text-amber-500">
            {market.winner_side === 'a' ? market.side_a_name : market.winner_side === 'c' ? market.side_c_name : market.side_b_name} Won!
          </span>
        </motion.div>
      )}

      {/* User Position */}
      {userPosition && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 pt-3 border-t border-primary/30 flex items-center justify-between"
        >
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Zap className="w-3 h-3 text-primary" />
            Your stake
          </span>
          <span className="text-sm font-black text-primary">
            {userPosition.power_spent >= 1000 ? `${(userPosition.power_spent/1000).toFixed(1)}K` : userPosition.power_spent} on {userPosition.side === 'a' ? market.side_a_name : userPosition.side === 'c' ? market.side_c_name : market.side_b_name}
          </span>
        </motion.div>
      )}
      
      {/* Tap to view indicator */}
      <div className="absolute bottom-3 right-3 opacity-50">
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
    </motion.button>
  );
};

export default MarketCard;
