import { motion } from 'framer-motion';
import { Zap, TrendingUp, Shield, Timer } from 'lucide-react';
import { ArenaBoost } from '@/hooks/useArena';

interface ArenaStatsProps {
  totalPoints: number;
  miningRate: number;
  arenaBoosts: ArenaBoost[];
  xBoost: number;
}

const ArenaStats = ({ totalPoints, miningRate, arenaBoosts, xBoost }: ArenaStatsProps) => {
  const totalArenaBoost = arenaBoosts.reduce((sum, b) => sum + b.boost_percentage, 0);
  const totalBoost = totalArenaBoost + xBoost;
  const boostedRate = miningRate * (1 + totalBoost / 100);

  // Find nearest expiring boost
  const nearestExpiry = arenaBoosts.length > 0
    ? arenaBoosts.reduce((nearest, boost) => {
        const expiry = new Date(boost.expires_at).getTime();
        return expiry < nearest ? expiry : nearest;
      }, Infinity)
    : null;

  const getTimeUntilExpiry = () => {
    if (!nearestExpiry) return null;
    const diff = nearestExpiry - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h`;
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Points */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 border border-primary/20"
      >
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground">Total ARX-P</span>
        </div>
        <p className="text-2xl font-bold text-foreground">{totalPoints.toLocaleString()}</p>
      </motion.div>

      {/* Current Mining Rate */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4 border border-accent/20"
      >
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-accent" />
          <span className="text-sm text-muted-foreground">Mining Rate</span>
        </div>
        <p className="text-2xl font-bold text-accent">{boostedRate.toFixed(1)}/hr</p>
        {totalBoost > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            +{totalBoost}% boost active
          </p>
        )}
      </motion.div>

      {/* Arena Boost */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-4 border border-[#FF00FF]/20"
      >
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-[#FF00FF]" />
          <span className="text-sm text-muted-foreground">Arena Boost</span>
        </div>
        <p className="text-2xl font-bold" style={{ color: '#FF00FF' }}>
          +{totalArenaBoost}%
        </p>
        {arenaBoosts.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {arenaBoosts.length} active boost{arenaBoosts.length > 1 ? 's' : ''}
          </p>
        )}
      </motion.div>

      {/* Boost Timer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-4 border border-[#00D4FF]/20"
      >
        <div className="flex items-center gap-2 mb-2">
          <Timer className="w-4 h-4 text-[#00D4FF]" />
          <span className="text-sm text-muted-foreground">Boost Expires</span>
        </div>
        <p className="text-2xl font-bold text-[#00D4FF]">
          {getTimeUntilExpiry() || '—'}
        </p>
        {xBoost > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            +{xBoost}% from X activity
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default ArenaStats;
