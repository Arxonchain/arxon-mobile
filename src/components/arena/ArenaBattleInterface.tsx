import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Shield, Swords, Timer, Users, Zap, Target, Flame } from 'lucide-react';
import type { ArenaBattle, ArenaVote, ArenaParticipant, UserBadge } from '@/hooks/useArena';

interface ArenaBattleInterfaceProps {
  battle: ArenaBattle;
  userClub: 'alpha' | 'omega';
  userVote: ArenaVote | null;
  participants: ArenaParticipant[];
  userBadges: UserBadge[];
  availablePoints: number;
  onVote: (amount: number) => Promise<boolean>;
  isVoting: boolean;
}

const ArenaBattleInterface = ({
  battle,
  userClub,
  userVote,
  participants,
  userBadges,
  availablePoints,
  onVote,
  isVoting,
}: ArenaBattleInterfaceProps) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [stakeAmount, setStakeAmount] = useState(0);
  const [showVotePanel, setShowVotePanel] = useState(false);

  // Countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(battle.ends_at).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Battle Ended');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [battle.ends_at]);

  const totalPower = battle.side_a_power + battle.side_b_power;
  const alphaPower = battle.side_a_power;
  const omegaPower = battle.side_b_power;
  const alphaPercent = totalPower > 0 ? (alphaPower / totalPower) * 100 : 50;
  const omegaPercent = totalPower > 0 ? (omegaPower / totalPower) * 100 : 50;

  // Participants don't expose their side (private voting), so we show total
  const totalParticipantCount = participants.length;

  const handleVote = async () => {
    if (stakeAmount > 0) {
      const success = await onVote(stakeAmount);
      if (success) {
        setShowVotePanel(false);
        setStakeAmount(0);
      }
    }
  };

  const stakeTiers = [
    { label: '10%', value: Math.floor(availablePoints * 0.1) },
    { label: '25%', value: Math.floor(availablePoints * 0.25) },
    { label: '50%', value: Math.floor(availablePoints * 0.5) },
    { label: 'MAX', value: availablePoints },
  ];

  return (
    <div className="space-y-6">
      {/* Battle Header with Trophy */}
      <motion.div 
        className="relative glass-card p-6 border border-primary/30 overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Background Trophy Glow */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <Trophy className="w-48 h-48 text-primary" />
        </div>

        <div className="relative z-10">
          {/* Timer */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <Timer className="w-5 h-5 text-primary" />
            <span className="text-xl font-bold text-primary">{timeLeft}</span>
          </div>

          {/* Battle Title */}
          <h1 className="text-2xl md:text-3xl font-black text-center text-foreground mb-2">
            {battle.title}
          </h1>
          <p className="text-muted-foreground text-center mb-6">{battle.description}</p>

          {/* VS Banner */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex-1 text-right">
              <div className="flex items-center justify-end gap-2">
                <Crown className="w-8 h-8 text-amber-500" />
                <span className="text-2xl font-black text-amber-500">ALPHA</span>
              </div>
            </div>
            
            <motion.div
              className="relative"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/30 to-primary/30 flex items-center justify-center border-2 border-foreground/20">
                <span className="text-lg font-black text-foreground">VS</span>
              </div>
            </motion.div>

            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-primary">OMEGA</span>
                <Shield className="w-8 h-8 text-primary" />
              </div>
            </div>
          </div>

          {/* Power Bar */}
          <div className="relative h-8 rounded-full overflow-hidden bg-muted">
            <motion.div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-600 to-amber-500"
              initial={{ width: 0 }}
              animate={{ width: `${alphaPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            <motion.div
              className="absolute right-0 top-0 h-full bg-gradient-to-l from-primary to-accent"
              initial={{ width: 0 }}
              animate={{ width: `${omegaPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            
            {/* Center divider */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-foreground/50 transform -translate-x-1/2 z-10" />
            
            {/* Percentage labels */}
            <div className="absolute inset-0 flex items-center justify-between px-4">
              <span className="text-sm font-bold text-white drop-shadow-lg">
                {alphaPercent.toFixed(1)}%
              </span>
              <span className="text-sm font-bold text-white drop-shadow-lg">
                {omegaPercent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border/30">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-bold text-foreground">{totalParticipantCount}</span>
              <span className="text-sm text-muted-foreground">Total Warriors</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/50 border border-border/30">
              <Zap className="w-5 h-5 text-primary" />
              <span className="font-bold text-foreground">{totalPower.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">Total Power</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Your Club Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`glass-card p-4 border ${
          userClub === 'alpha' 
            ? 'border-amber-500/30 bg-amber-500/5' 
            : 'border-primary/30 bg-primary/5'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            userClub === 'alpha' ? 'bg-amber-500/20' : 'bg-primary/20'
          }`}>
            {userClub === 'alpha' ? (
              <Crown className="w-6 h-6 text-amber-500" />
            ) : (
              <Shield className="w-6 h-6 text-primary" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Your Club</p>
            <p className={`text-xl font-black ${
              userClub === 'alpha' ? 'text-amber-500' : 'text-primary'
            }`}>
              {userClub.toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Fighting for</p>
            <p className="font-bold text-foreground">
              {userClub === 'alpha' ? battle.side_a_name : battle.side_b_name}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Vote Panel */}
      {!userVote ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 border border-border/50"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Stake Your Power</h3>
              <p className="text-sm text-muted-foreground">
                Your vote goes to {userClub.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Available Points */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 mb-6">
            <span className="text-muted-foreground">Available</span>
            <span className="font-bold text-foreground">
              {availablePoints.toLocaleString()} ARX-P
            </span>
          </div>

          {/* Stake Tiers */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {stakeTiers.map((tier) => (
              <button
                key={tier.label}
                onClick={() => setStakeAmount(tier.value)}
                className={`py-3 rounded-lg font-bold transition-all ${
                  stakeAmount === tier.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/50 text-foreground hover:bg-secondary'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="mb-6">
            <input
              type="range"
              min={0}
              max={availablePoints}
              value={stakeAmount}
              onChange={(e) => setStakeAmount(Number(e.target.value))}
              className="w-full h-2 rounded-full bg-secondary appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>0</span>
              <span className="font-bold text-foreground">
                {stakeAmount.toLocaleString()} ARX-P
              </span>
              <span>{availablePoints.toLocaleString()}</span>
            </div>
          </div>

          {/* Vote Button */}
          <button
            onClick={handleVote}
            disabled={stakeAmount === 0 || isVoting}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
              stakeAmount === 0
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : userClub === 'alpha'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-500 hover:to-amber-400'
                  : 'bg-gradient-to-r from-primary to-accent text-white hover:opacity-90'
            }`}
          >
            {isVoting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
                Voting...
              </>
            ) : (
              <>
                <Flame className="w-5 h-5" />
                Vote for {userClub.toUpperCase()}
              </>
            )}
          </button>

          <p className="text-xs text-muted-foreground text-center mt-4">
            🔒 Your stake is locked until the battle ends
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 border border-green-500/30 bg-green-500/5"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <Swords className="w-6 h-6 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground">Vote Locked</h3>
              <p className="text-sm text-muted-foreground">
                Your stake is secured for {userClub.toUpperCase()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-green-500">
                {userVote.power_spent.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">ARX-P Staked</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Reward Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-4 border border-border/30"
      >
        <div className="flex items-center gap-3">
          <Zap className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm text-foreground">
              Winners receive a <span className="font-bold text-primary">{battle.winner_boost_percentage}% mining boost</span> for 7 days!
            </p>
          </div>
        </div>
      </motion.div>

      {/* User Badges */}
      {userBadges.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-4 border border-border/30"
        >
          <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Your Badges
          </h4>
          <div className="flex flex-wrap gap-2">
            {userBadges.slice(0, 5).map((badge) => (
              <div
                key={badge.id}
                className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs font-medium text-primary"
              >
                {badge.badge_name}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ArenaBattleInterface;
