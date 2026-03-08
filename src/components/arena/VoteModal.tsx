import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Lock, AlertTriangle, TrendingUp, Shield, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArenaBattle } from '@/hooks/useArena';

interface VoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  battle: ArenaBattle;
  selectedSide: 'a' | 'b';
  availablePoints: number;
  onConfirmVote: (amount: number) => Promise<boolean>;
  isVoting: boolean;
}

const VoteModal = ({
  isOpen,
  onClose,
  battle,
  selectedSide,
  availablePoints,
  onConfirmVote,
  isVoting,
}: VoteModalProps) => {
  const [voteAmount, setVoteAmount] = useState(1000);
  const [showSuccess, setShowSuccess] = useState(false);
  const minVote = 1000;
  const maxVote = Math.min(Math.floor(availablePoints), 100000);

  const sideName = selectedSide === 'a' ? battle.side_a_name : battle.side_b_name;
  const sideColor = selectedSide === 'a' ? battle.side_a_color : battle.side_b_color;
  const sidePower = selectedSide === 'a' ? battle.side_a_power : battle.side_b_power;
  const oppositePower = selectedSide === 'a' ? battle.side_b_power : battle.side_a_power;
  
  // Calculate potential return multiplier based on current odds
  const totalPower = battle.side_a_power + battle.side_b_power + voteAmount;
  const newSidePower = sidePower + voteAmount;
  const winChance = totalPower > 0 ? (newSidePower / totalPower) * 100 : 50;
  
  // Staking tiers for quick selection
  const stakingTiers = [
    { label: '10%', value: Math.floor(availablePoints * 0.1) },
    { label: '25%', value: Math.floor(availablePoints * 0.25) },
    { label: '50%', value: Math.floor(availablePoints * 0.5) },
    { label: 'MAX', value: maxVote },
  ].filter(tier => tier.value >= minVote);

  useEffect(() => {
    if (isOpen) {
      setVoteAmount(Math.min(minVote, maxVote));
      setShowSuccess(false);
    }
  }, [isOpen, maxVote]);

  const handleConfirm = async () => {
    const success = await onConfirmVote(voteAmount);
    if (success) {
      setShowSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-md glass-card p-6 border border-primary/30"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {showSuccess ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-center py-8"
            >
              {/* Success Animation */}
              <motion.div
                className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${sideColor}20` }}
                animate={{
                  boxShadow: [
                    `0 0 0 0 ${sideColor}40`,
                    `0 0 0 30px ${sideColor}00`,
                  ],
                }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Zap className="w-12 h-12" style={{ color: sideColor }} />
              </motion.div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Points Staked!</h3>
              <p className="text-muted-foreground">
                {voteAmount.toLocaleString()} ARX-P staked for {sideName}
              </p>
              <p className="text-sm text-accent mt-2">
                Win to get {battle.winner_boost_percentage}% mining boost for 7 days!
              </p>
            </motion.div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center text-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${sideColor}20, ${sideColor}40)`,
                    boxShadow: `0 0 30px ${sideColor}40`,
                  }}
                >
                  {selectedSide === 'a' ? '⚡' : '🔥'}
                </div>
                <h3 className="text-xl font-bold text-foreground">Stake for {sideName}</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Choose how many ARX-P to stake
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-background/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                    <Zap className="w-3 h-3" />
                    <span>Available</span>
                  </div>
                  <span className="text-foreground font-bold">
                    {availablePoints.toLocaleString()} ARX-P
                  </span>
                </div>
                <div className="bg-background/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs mb-1">
                    <Target className="w-3 h-3" />
                    <span>Win Chance</span>
                  </div>
                  <span className="text-foreground font-bold" style={{ color: sideColor }}>
                    {winChance.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Quick Stake Tiers */}
              {stakingTiers.length > 0 && (
                <div className="mb-4">
                  <p className="text-muted-foreground text-xs mb-2">Quick stake:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {stakingTiers.map((tier) => (
                      <button
                        key={tier.label}
                        onClick={() => setVoteAmount(tier.value)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          voteAmount === tier.value
                            ? 'text-black'
                            : 'bg-background/50 text-muted-foreground hover:bg-background/70'
                        }`}
                        style={voteAmount === tier.value ? { backgroundColor: sideColor } : {}}
                      >
                        {tier.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Vote Amount Slider */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-muted-foreground">Stake Amount</span>
                  <div className="flex items-center gap-1" style={{ color: sideColor }}>
                    <Zap className="w-4 h-4" />
                    <span className="font-bold text-lg">{voteAmount.toLocaleString()}</span>
                  </div>
                </div>

                {maxVote >= minVote ? (
                  <Slider
                    value={[voteAmount]}
                    onValueChange={(value) => setVoteAmount(value[0])}
                    min={minVote}
                    max={maxVote}
                    step={10}
                    className="w-full"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Min 1,000 / Max 100,000 ARX-P required to stake</span>
                  </div>
                )}

                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Min: {minVote}</span>
                  <span>Max: {maxVote.toLocaleString()}</span>
                </div>
              </div>

              {/* Reward Info */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30 mb-4">
                <TrendingUp className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-foreground font-medium">Win Reward</p>
                  <p className="text-muted-foreground">
                    +{battle.winner_boost_percentage}% mining rate boost for 7 days
                  </p>
                </div>
              </div>

              {/* Lock Warning */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/10 border border-accent/30 mb-6">
                <Shield className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-foreground font-medium">Staking Rules</p>
                  <p className="text-muted-foreground">
                    Points are locked until battle ends. Staked points are non-refundable.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={isVoting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isVoting || maxVote < minVote}
                  className="flex-1 text-white"
                  style={{
                    background: `linear-gradient(135deg, ${sideColor}, ${sideColor}CC)`,
                  }}
                >
                  {isVoting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Zap className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Stake {voteAmount.toLocaleString()} ARX-P
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default VoteModal;
