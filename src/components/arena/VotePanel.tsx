import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Crown, Shield, Fingerprint, CheckCircle, Zap, TrendingUp, AlertTriangle, Sparkles, Target } from 'lucide-react';
import { toast } from 'sonner';
import type { ArenaBattle, ArenaVote } from '@/hooks/useArena';
import FingerprintScanner from './FingerprintScanner';

interface VotePanelProps {
  battle: ArenaBattle | null;
  userClub: 'alpha' | 'omega';
  userVote: ArenaVote | null;
  availablePoints: number;
  onVote: (amount: number) => Promise<boolean>;
  isVoting: boolean;
  storedFingerprintHash?: string | null;
  onReregisterFingerprint?: (newHash: string) => Promise<{ success: boolean; error?: string }>;
}

const VotePanel = ({ 
  battle, 
  userClub, 
  userVote, 
  availablePoints, 
  onVote, 
  isVoting,
  storedFingerprintHash,
  onReregisterFingerprint
}: VotePanelProps) => {
  const [stakeAmount, setStakeAmount] = useState(1000);
  const [showFingerprint, setShowFingerprint] = useState(false);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [isReregistering, setIsReregistering] = useState(false);

  const potentialReturns = useMemo(() => {
    if (!battle || stakeAmount < 1000) return null;

    const userSide = userClub === 'alpha' ? 'a' : 'b';
    const myPool = userSide === 'a' ? battle.side_a_power : battle.side_b_power;
    const theirPool = userSide === 'a' ? battle.side_b_power : battle.side_a_power;
    
    const newMyPool = myPool + stakeAmount;
    const totalStakes = newMyPool + theirPool;
    const prizePool = (battle as any).prize_pool || 0;

    const myShare = newMyPool > 0 ? stakeAmount / newMyPool : 0;
    const loserPoolShare = Math.floor(myShare * theirPool);
    const prizePoolShare = Math.floor(myShare * prizePool);

    // Raw net profit
    const rawNetProfit = loserPoolShare + prizePoolShare;

    // Cap displayed profit based on pool fill ratio to prevent showing
    // entire prize pool as personal win when pools are empty
    const poolFillRatio = totalStakes > 0 ? Math.min(totalStakes / Math.max(prizePool, 1), 1) : 0;
    const maxDisplayMultiplier = 2 + (poolFillRatio * 8);
    const netProfit = Math.min(rawNetProfit, Math.floor(stakeAmount * maxDisplayMultiplier));

    const totalWin = stakeAmount + netProfit;
    const totalLoss = stakeAmount;
    const isUnderdog = newMyPool < theirPool;
    const multiplier = stakeAmount > 0 ? Math.round((totalWin / stakeAmount) * 10) / 10 : 1;

    return {
      multiplier,
      totalWinnings: netProfit,
      returnPercentage: stakeAmount > 0 ? Math.round((netProfit / stakeAmount) * 100) : 0,
      totalLoss,
      isUnderdog,
      myPoolPercentage: totalStakes > 0 ? Math.round((newMyPool / totalStakes) * 100) : 50,
    };
  }, [battle, stakeAmount, userClub]);

  if (!battle) {
    return (
      <div className="px-4 py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium">No active battle to vote on</p>
      </div>
    );
  }

  const MAX_STAKE = 100000;
  const MIN_STAKE = 1000;
  const stakeTiers = [
    { label: '10%', value: Math.min(Math.max(Math.floor(availablePoints * 0.1), MIN_STAKE), MAX_STAKE) },
    { label: '25%', value: Math.min(Math.max(Math.floor(availablePoints * 0.25), MIN_STAKE), MAX_STAKE) },
    { label: '50%', value: Math.min(Math.max(Math.floor(availablePoints * 0.5), MIN_STAKE), MAX_STAKE) },
    { label: 'MAX', value: Math.min(Math.max(availablePoints, MIN_STAKE), MAX_STAKE) },
  ];

  const handleTierClick = (value: number) => {
    const clampedValue = Math.min(Math.max(value, MIN_STAKE), Math.min(availablePoints, MAX_STAKE));
    setStakeAmount(clampedValue);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setStakeAmount(value);
  };

  const handleConfirmVote = () => {
    if (stakeAmount >= MIN_STAKE && stakeAmount <= Math.min(availablePoints, MAX_STAKE)) {
      setPendingAmount(stakeAmount);
      setShowFingerprint(true);
    }
  };

  const handleFingerprintVerified = async (fingerprintHash?: string) => {
    const success = await onVote(pendingAmount);
    if (success) {
      setShowFingerprint(false);
      setStakeAmount(MIN_STAKE);
      setPendingAmount(0);
    }
  };

  // Fingerprint failures no longer happen - scanner always accepts
  const handleFingerprintFailed = () => {};

  // Re-registration flow (kept for edge cases but rarely needed now)
  const handleRequestReregister = () => {
    setIsReregistering(true);
    setShowFingerprint(false);
  };

  const handleReregisterComplete = async (newHash: string) => {
    if (!onReregisterFingerprint) return;
    
    const result = await onReregisterFingerprint(newHash);
    if (result.success) {
      setIsReregistering(false);
      toast.success('Fingerprint updated! You can now vote.');
    } else {
      setIsReregistering(false);
      toast.error(result.error || 'Failed to update fingerprint');
    }
  };

  // Already voted
  if (userVote) {
    return (
      <div className="px-4 py-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/30"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Vote Locked! 🔒</h3>
              <p className="text-green-500 font-bold text-xl">
                {userVote.power_spent.toLocaleString()} ARX-P
              </p>
            </div>
          </div>
          
          <div className={`flex items-center gap-3 p-3 rounded-xl ${
            userClub === 'alpha' ? 'bg-amber-500/10' : 'bg-primary/10'
          }`}>
            {userClub === 'alpha' ? (
              <Crown className="w-5 h-5 text-amber-500" />
            ) : (
              <Shield className="w-5 h-5 text-primary" />
            )}
            <span className={`font-bold ${
              userClub === 'alpha' ? 'text-amber-500' : 'text-primary'
            }`}>
              TEAM {userClub.toUpperCase()}
            </span>
          </div>
          
          <div className="mt-4 p-3 rounded-xl bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-bold">+25% Mining Boost Active!</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Re-registration flow
  if (isReregistering) {
    return (
      <div className="px-4 py-6">
        <div className="glass-card p-6 border border-border/50 rounded-2xl">
          <FingerprintScanner
            onVerified={handleReregisterComplete}
            isVerifying={false}
            title="Re-register Fingerprint"
            subtitle="This will update your fingerprint for this device"
          />
          <button
            type="button"
            onClick={() => setIsReregistering(false)}
            className="w-full mt-4 py-3 text-muted-foreground hover:text-foreground active:text-foreground transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Fingerprint verification screen
  if (showFingerprint) {
    return (
      <div className="px-4 py-6">
        <div className="glass-card p-6 border border-border/50 rounded-2xl">
          <FingerprintScanner
            onVerified={handleFingerprintVerified}
            isVerifying={isVoting}
            title="Verify Your Identity"
            subtitle={`Confirm your fingerprint to stake ${pendingAmount.toLocaleString()} ARX-P`}
          />
          <button
            type="button"
            onClick={() => setShowFingerprint(false)}
            className="w-full mt-4 py-3 text-muted-foreground hover:text-foreground active:text-foreground transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const canVote = stakeAmount >= MIN_STAKE && stakeAmount <= MAX_STAKE && availablePoints >= MIN_STAKE;

  // Vote form
  return (
    <div className="px-4 py-6 space-y-5">
      {/* Club Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-2xl ${
          userClub === 'alpha' 
            ? 'bg-gradient-to-br from-amber-500/15 to-orange-500/5 border border-amber-500/30' 
            : 'bg-gradient-to-br from-primary/15 to-accent/5 border border-primary/30'
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
          <div>
            <p className="text-sm text-muted-foreground">Staking for</p>
            <p className={`text-xl font-black ${
              userClub === 'alpha' ? 'text-amber-500' : 'text-primary'
            }`}>
              TEAM {userClub.toUpperCase()}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Instant Boost Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-3 rounded-xl bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20 border border-primary/30"
      >
        <div className="flex items-center gap-2 justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary">Instant +25% Mining Boost</span>
          <span className="text-xs text-muted-foreground">until battle ends</span>
        </div>
      </motion.div>

      {/* Available Points */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border/40">
        <span className="text-muted-foreground font-medium">Available Points</span>
        <span className="font-bold text-foreground text-lg">{availablePoints.toLocaleString()} ARX-P</span>
      </div>

      {/* Quick Stake Buttons - Fixed clickability */}
      <div className="grid grid-cols-4 gap-2">
        {stakeTiers.map((tier) => {
          const isSelected = stakeAmount === tier.value;
          const isDisabled = tier.value > availablePoints;
          
          return (
            <button
              key={tier.label}
              type="button"
              onClick={() => !isDisabled && handleTierClick(tier.value)}
              disabled={isDisabled}
              className={`
                py-3.5 rounded-xl font-bold text-sm transition-all duration-200
                select-none touch-manipulation
                ${isSelected
                  ? userClub === 'alpha'
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                    : 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                  : isDisabled
                    ? 'bg-secondary/30 text-muted-foreground/50 cursor-not-allowed'
                    : 'bg-secondary/60 text-foreground hover:bg-secondary active:bg-secondary active:scale-95'
                }
              `}
            >
              {tier.label}
            </button>
          );
        })}
      </div>

      {/* Slider - Enhanced styling */}
      <div className="space-y-3">
        <div className="relative">
          <input
            type="range"
            min={MIN_STAKE}
            max={Math.min(Math.max(availablePoints, MIN_STAKE), MAX_STAKE)}
            value={stakeAmount}
            onChange={handleSliderChange}
            className="w-full h-3 rounded-full appearance-none cursor-pointer touch-manipulation
              bg-gradient-to-r from-secondary via-secondary to-secondary
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-6
              [&::-webkit-slider-thumb]:h-6
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-primary
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:shadow-primary/30
              [&::-webkit-slider-thumb]:cursor-grab
              [&::-webkit-slider-thumb]:active:cursor-grabbing
              [&::-webkit-slider-thumb]:active:scale-110
              [&::-webkit-slider-thumb]:transition-transform
              [&::-moz-range-thumb]:w-6
              [&::-moz-range-thumb]:h-6
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-primary
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:shadow-lg
              [&::-moz-range-thumb]:cursor-grab
              [&::-moz-range-thumb]:active:cursor-grabbing
            "
          />
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">1K</span>
          <span className={`font-bold text-lg ${
            userClub === 'alpha' ? 'text-amber-500' : 'text-primary'
          }`}>
            {stakeAmount.toLocaleString()} ARX-P
          </span>
          <span className="text-muted-foreground">{availablePoints.toLocaleString()}</span>
        </div>
      </div>

      {/* Potential Returns Calculator */}
      {potentialReturns && stakeAmount >= MIN_STAKE && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3"
        >
          {/* Win Scenario */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/15 to-emerald-500/5 border border-green-500/30">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs font-bold text-green-500">IF YOU WIN</span>
            </div>
            <p className="text-2xl font-black text-green-500">
              +{potentialReturns.totalWinnings.toLocaleString()}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] text-muted-foreground">{potentialReturns.multiplier.toFixed(1)}x</span>
              {potentialReturns.isUnderdog && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">UNDERDOG</span>
              )}
            </div>
          </div>

          {/* Lose Scenario */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/15 to-rose-500/5 border border-red-500/30">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-xs font-bold text-red-500">IF YOU LOSE</span>
            </div>
            <p className="text-2xl font-black text-red-500">
              -{potentialReturns.totalLoss.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Full stake lost
            </p>
          </div>
        </motion.div>
      )}

      {/* Vote Button */}
      <button
        type="button"
        onClick={handleConfirmVote}
        disabled={!canVote}
        className={`
          w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
          flex items-center justify-center gap-3 touch-manipulation select-none
          ${!canVote
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : userClub === 'alpha'
              ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-500 hover:to-amber-400 active:scale-[0.98] shadow-lg shadow-amber-500/25'
              : 'bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 active:scale-[0.98] shadow-lg shadow-primary/25'
          }
        `}
      >
        <Fingerprint className="w-5 h-5" />
        {!canVote ? 'Min 1K / Max 100K ARX-P' : 'Verify & Stake'}
      </button>

      <p className="text-xs text-muted-foreground text-center px-4">
        ⚠️ Stakes are locked until battle ends. Winners take all!
      </p>
    </div>
  );
};

export default VotePanel;