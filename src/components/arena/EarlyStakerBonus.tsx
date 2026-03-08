import { motion } from 'framer-motion';
import { Clock, TrendingUp, Zap, Gift } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface EarlyStakerBonusProps {
  startsAt: string;
  endsAt: string;
  compact?: boolean;
}

const EarlyStakerBonus = ({ startsAt, endsAt, compact = false }: EarlyStakerBonusProps) => {
  const now = new Date();
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  
  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const timeProgress = Math.min(Math.max(elapsed / totalDuration, 0), 1);
  
  // Early stake multiplier: 1.5x at start, decreasing to 1.0x at end
  const currentMultiplier = 1.5 - (0.5 * timeProgress);
  const bonusPercentage = (currentMultiplier - 1) * 100;
  
  const getMultiplierColor = () => {
    if (bonusPercentage >= 40) return 'text-green-400 bg-green-500/20 border-green-500/30';
    if (bonusPercentage >= 25) return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
    if (bonusPercentage >= 10) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
  };

  const getTimePhase = () => {
    if (timeProgress <= 0.2) return { label: 'Early Bird', color: 'text-green-400' };
    if (timeProgress <= 0.5) return { label: 'Active Phase', color: 'text-yellow-400' };
    if (timeProgress <= 0.8) return { label: 'Late Entry', color: 'text-orange-400' };
    return { label: 'Final Hours', color: 'text-red-400' };
  };

  const phase = getTimePhase();

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${getMultiplierColor()} border cursor-help`}
            animate={{ scale: bonusPercentage >= 30 ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 1.5, repeat: bonusPercentage >= 30 ? Infinity : 0 }}
          >
            <Clock className="w-3 h-3" />
            <span className="text-[10px] font-bold">+{bonusPercentage.toFixed(0)}%</span>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-400" />
              <span className="font-bold">Early Staker Bonus</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Stake early for up to 50% bonus! Current: <span className="font-bold text-foreground">+{bonusPercentage.toFixed(0)}%</span>
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span>Progress</span>
                <span className={phase.color}>{phase.label}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                  style={{ width: `${timeProgress * 100}%` }}
                />
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <motion.div
      className="p-3 rounded-xl bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <motion.div
            className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </motion.div>
          <span className="text-xs font-bold text-foreground">Early Staker Bonus</span>
        </div>
        <motion.div
          className={`px-2.5 py-1 rounded-full ${getMultiplierColor()} border`}
          animate={{ scale: bonusPercentage >= 30 ? [1, 1.05, 1] : 1 }}
          transition={{ duration: 1.5, repeat: bonusPercentage >= 30 ? Infinity : 0 }}
        >
          <span className="text-sm font-bold">+{bonusPercentage.toFixed(0)}%</span>
        </motion.div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5 mb-3">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Event Progress</span>
          <span className={phase.color}>{phase.label}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
            initial={{ width: 0 }}
            animate={{ width: `${timeProgress * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Bonus tiers */}
      <div className="grid grid-cols-4 gap-1 text-center">
        <div className={`p-1.5 rounded ${timeProgress <= 0.2 ? 'bg-green-500/20 border border-green-500/30' : 'bg-muted/30'}`}>
          <span className={`text-[10px] font-bold ${timeProgress <= 0.2 ? 'text-green-400' : 'text-muted-foreground'}`}>+50%</span>
          <p className="text-[8px] text-muted-foreground">0-20%</p>
        </div>
        <div className={`p-1.5 rounded ${timeProgress > 0.2 && timeProgress <= 0.5 ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-muted/30'}`}>
          <span className={`text-[10px] font-bold ${timeProgress > 0.2 && timeProgress <= 0.5 ? 'text-yellow-400' : 'text-muted-foreground'}`}>+35%</span>
          <p className="text-[8px] text-muted-foreground">20-50%</p>
        </div>
        <div className={`p-1.5 rounded ${timeProgress > 0.5 && timeProgress <= 0.8 ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-muted/30'}`}>
          <span className={`text-[10px] font-bold ${timeProgress > 0.5 && timeProgress <= 0.8 ? 'text-orange-400' : 'text-muted-foreground'}`}>+15%</span>
          <p className="text-[8px] text-muted-foreground">50-80%</p>
        </div>
        <div className={`p-1.5 rounded ${timeProgress > 0.8 ? 'bg-red-500/20 border border-red-500/30' : 'bg-muted/30'}`}>
          <span className={`text-[10px] font-bold ${timeProgress > 0.8 ? 'text-red-400' : 'text-muted-foreground'}`}>+5%</span>
          <p className="text-[8px] text-muted-foreground">80%+</p>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        <Zap className="w-3 h-3 inline text-amber-400" /> Early stakers earn higher multipliers on winnings!
      </p>
    </motion.div>
  );
};

export default EarlyStakerBonus;