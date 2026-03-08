import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Clock, Users, Trophy, TrendingUp, TrendingDown, 
  Gift, Zap, AlertTriangle, CheckCircle, Fingerprint,
  ChevronDown, ChevronUp, Info
} from 'lucide-react';
import type { ArenaMarket, MarketVote } from '@/hooks/useArenaMarkets';
import FingerprintScanner from './FingerprintScanner';
import { toast } from 'sonner';

interface MarketBettingModalProps {
  market: ArenaMarket;
  userPosition?: MarketVote;
  isOpen: boolean;
  onClose: () => void;
  onPlaceBet: (marketId: string, side: 'a' | 'b', amount: number) => Promise<boolean>;
  calculateReturns: (market: ArenaMarket, side: 'a' | 'b', amount: number) => {
    multiplier: number;
    bonusPercentage: number;
    stakeReturn: number;
    bonusFromPrizePool: number;
    loserPoolShare: number;
    multiplierBonus: number;
    totalWin: number;
    netProfit: number;
    totalLoss: number;
    isUnderdog: boolean;
    winChance: number;
  };
  availablePoints: number;
  isVoting: boolean;
  storedFingerprintHash?: string | null;
}

const MarketBettingModal = ({
  market,
  userPosition,
  isOpen,
  onClose,
  onPlaceBet,
  calculateReturns,
  availablePoints,
  isVoting,
  storedFingerprintHash,
}: MarketBettingModalProps) => {
  const [selectedSide, setSelectedSide] = useState<'a' | 'b' | null>(null);
  const [stakeAmount, setStakeAmount] = useState(1000);
  const [showFingerprint, setShowFingerprint] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  const totalPool = market.side_a_power + market.side_b_power;
  const sideAPercent = totalPool > 0 ? (market.side_a_power / totalPool) * 100 : 50;
  const sideBPercent = totalPool > 0 ? (market.side_b_power / totalPool) * 100 : 50;

  const returns = useMemo(() => {
    if (!selectedSide || stakeAmount < 100) return null;
    return calculateReturns(market, selectedSide, stakeAmount);
  }, [selectedSide, stakeAmount, market, calculateReturns]);

  useEffect(() => {
    if (isOpen) {
      setSelectedSide(null);
      setStakeAmount(0);
      setShowFingerprint(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(market.ends_at).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft('Ended');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [market.ends_at]);

  const stakeTiers = [
    { label: '100', value: 100 },
    { label: '500', value: 500 },
    { label: '1K', value: 1000 },
    { label: '5K', value: 5000 },
    { label: 'MAX', value: availablePoints },
  ];

  const handlePlaceBet = () => {
    if (stakeAmount >= 100 && selectedSide) {
      setShowFingerprint(true);
    }
  };

  const handleFingerprintVerified = async () => {
    if (!selectedSide) return;
    try {
      const success = await onPlaceBet(market.id, selectedSide, stakeAmount);
      if (success) {
        onClose();
      } else {
        setShowFingerprint(false);
      }
    } catch (err) {
      console.error('Vote failed:', err);
      setShowFingerprint(false);
    }
  };

  // Fingerprint failures no longer happen - scanner always accepts
  const handleFingerprintFailed = () => {
    // No-op: kept for backwards compatibility but never called
  };

  if (!isOpen) return null;

  // Already has position
  if (userPosition) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-2xl overflow-hidden"
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Position Active!</h3>
              <p className="text-muted-foreground mb-4">
                You've staked <span className="font-bold text-primary">{userPosition.power_spent.toLocaleString()} ARX-P</span> on{' '}
                <span className="font-bold" style={{ color: userPosition.side === 'a' ? market.side_a_color : market.side_b_color }}>
                  {userPosition.side === 'a' ? market.side_a_name : market.side_b_name}
                </span>
              </p>
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 mb-4">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-medium">+25% Mining Boost Active!</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 bg-secondary text-foreground rounded-xl font-medium"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Fingerprint verification
  if (showFingerprint) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-2xl overflow-hidden"
          >
            <div className="p-6">
              <FingerprintScanner
                onVerified={handleFingerprintVerified}
                isVerifying={isVoting}
                title="Confirm Your Bet"
                subtitle={`Verify to stake ${stakeAmount.toLocaleString()} ARX-P on ${selectedSide === 'a' ? market.side_a_name : market.side_b_name}`}
              />
              <button
                onClick={() => setShowFingerprint(false)}
                className="w-full mt-4 py-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-card/95 backdrop-blur-xl border-b border-border/50 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{timeLeft}</span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Market Title */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">{market.title}</h2>
              {market.description && (
                <p className="text-sm text-muted-foreground">{market.description}</p>
              )}
            </div>

            {/* Prize Pool Banner */}
            {market.prize_pool > 0 && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                <div className="flex items-center gap-3">
                  <Gift className="w-6 h-6 text-amber-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Prize Pool</p>
                    <p className="text-xl font-black text-amber-500">
                      {market.prize_pool.toLocaleString()} ARX-P
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-sm text-muted-foreground">Bonus</p>
                    <p className="text-lg font-bold text-green-500">+{market.bonus_percentage}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* Pool Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-secondary/30 text-center">
                <Trophy className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{totalPool.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Pool</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/30 text-center">
                <Users className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">{market.total_participants || 0}</p>
                <p className="text-xs text-muted-foreground">Participants</p>
              </div>
              <div className="p-3 rounded-xl bg-secondary/30 text-center">
                <Zap className="w-4 h-4 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold text-foreground">+25%</p>
                <p className="text-xs text-muted-foreground">Mining Boost</p>
              </div>
            </div>

            {/* Side Selection - Enhanced */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Choose your prediction:</p>
              
              <button
                type="button"
                onClick={() => setSelectedSide('a')}
                className={`
                  w-full p-4 rounded-xl border-2 transition-all duration-200
                  touch-manipulation select-none active:scale-[0.98]
                  ${selectedSide === 'a'
                    ? 'shadow-lg'
                    : 'border-border hover:border-border/80'
                  }
                `}
                style={{ 
                  borderColor: selectedSide === 'a' ? market.side_a_color : undefined, 
                  backgroundColor: selectedSide === 'a' ? `${market.side_a_color}15` : undefined,
                  boxShadow: selectedSide === 'a' ? `0 8px 24px ${market.side_a_color}30` : undefined
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: selectedSide === 'a' ? `${market.side_a_color}25` : undefined }}
                    >
                      <TrendingUp className="w-5 h-5" style={{ color: market.side_a_color }} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-foreground">{market.side_a_name}</p>
                      <p className="text-xs text-muted-foreground">{market.side_a_power.toLocaleString()} ARX-P</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black" style={{ color: market.side_a_color }}>{sideAPercent.toFixed(0)}%</p>
                    {sideAPercent < sideBPercent && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">Underdog</span>
                    )}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedSide('b')}
                className={`
                  w-full p-4 rounded-xl border-2 transition-all duration-200
                  touch-manipulation select-none active:scale-[0.98]
                  ${selectedSide === 'b'
                    ? 'shadow-lg'
                    : 'border-border hover:border-border/80'
                  }
                `}
                style={{ 
                  borderColor: selectedSide === 'b' ? market.side_b_color : undefined, 
                  backgroundColor: selectedSide === 'b' ? `${market.side_b_color}15` : undefined,
                  boxShadow: selectedSide === 'b' ? `0 8px 24px ${market.side_b_color}30` : undefined
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: selectedSide === 'b' ? `${market.side_b_color}25` : undefined }}
                    >
                      <TrendingDown className="w-5 h-5" style={{ color: market.side_b_color }} />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-foreground">{market.side_b_name}</p>
                      <p className="text-xs text-muted-foreground">{market.side_b_power.toLocaleString()} ARX-P</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black" style={{ color: market.side_b_color }}>{sideBPercent.toFixed(0)}%</p>
                    {sideBPercent < sideAPercent && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">Underdog</span>
                    )}
                  </div>
                </div>
              </button>
            </div>

            {/* Stake Amount */}
            {selectedSide && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted-foreground">Stake amount:</p>
                  <p className="text-sm text-muted-foreground">
                    Available: <span className="font-bold text-foreground">{availablePoints.toLocaleString()}</span> ARX-P
                  </p>
                </div>

                {/* Quick amounts - Enhanced */}
                <div className="grid grid-cols-5 gap-2">
                  {stakeTiers.map((tier) => {
                    const isSelected = stakeAmount === tier.value;
                    const isDisabled = tier.value > availablePoints && tier.label !== 'MAX';
                    
                    return (
                      <button
                        key={tier.label}
                        type="button"
                        onClick={() => setStakeAmount(Math.min(tier.value, availablePoints))}
                        disabled={isDisabled}
                        className={`
                          py-3 rounded-xl text-sm font-bold transition-all duration-200
                          touch-manipulation select-none
                          ${isSelected
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                            : isDisabled
                              ? 'bg-muted text-muted-foreground/50 cursor-not-allowed'
                              : 'bg-secondary hover:bg-secondary/80 active:scale-95 text-foreground'
                          }
                        `}
                      >
                        {tier.label}
                      </button>
                    );
                  })}
                </div>

                {/* Slider - Enhanced */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min={1000}
                    max={Math.min(Math.max(availablePoints, 1000), 100000)}
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(Number(e.target.value))}
                    className="w-full h-3 rounded-full appearance-none cursor-pointer touch-manipulation
                      bg-secondary
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
                    "
                  />
                  <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                    <span>1K</span>
                    <span className="font-bold text-foreground text-lg">{stakeAmount.toLocaleString()} ARX-P</span>
                    <span>{availablePoints.toLocaleString()}</span>
                  </div>
                </div>

                {/* Returns Preview */}
                {returns && stakeAmount >= 1000 && (
                  <div className="space-y-3">
                    {/* Win scenario */}
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-bold text-green-500">IF YOU WIN</span>
                          {returns.isUnderdog && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">UNDERDOG 5x</span>
                          )}
                        </div>
                        <button
                          onClick={() => setShowBreakdown(!showBreakdown)}
                          className="text-xs text-muted-foreground flex items-center gap-1"
                        >
                          {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          Details
                        </button>
                      </div>
                      <p className="text-2xl font-black text-green-500">
                        +{returns.netProfit.toLocaleString()} ARX-P
                      </p>
                      
                      {showBreakdown && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-3 pt-3 border-t border-green-500/20 space-y-1 text-xs"
                        >
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Stake return:</span>
                            <span className="text-foreground">+{returns.stakeReturn.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Multiplier bonus ({returns.multiplier.toFixed(1)}x):</span>
                            <span className="text-foreground">+{returns.multiplierBonus.toLocaleString()}</span>
                          </div>
                          {returns.bonusFromPrizePool > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Prize pool share ({returns.bonusPercentage}%):</span>
                              <span className="text-amber-500">+{returns.bonusFromPrizePool.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Loser pool share:</span>
                            <span className="text-foreground">+{returns.loserPoolShare.toLocaleString()}</span>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Lose scenario */}
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-bold text-red-500">IF YOU LOSE</span>
                      </div>
                      <p className="text-2xl font-black text-red-500">
                        -{returns.totalLoss.toLocaleString()} ARX-P
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        You lose your entire stake. High risk, high reward!
                      </p>
                    </div>
                  </div>
                )}

                {/* Place Bet Button - Enhanced */}
                <button
                  type="button"
                  onClick={handlePlaceBet}
                  disabled={stakeAmount < 1000 || availablePoints < 1000}
                  className={`
                    w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
                    flex items-center justify-center gap-3 touch-manipulation select-none
                    ${stakeAmount < 1000 || availablePoints < 1000
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 active:scale-[0.98] shadow-lg shadow-primary/25'
                    }
                  `}
                >
                  <Fingerprint className="w-5 h-5" />
                  {stakeAmount < 1000 ? 'Min 1K / Max 100K ARX-P' : `Place Bet • ${stakeAmount.toLocaleString()} ARX-P`}
                </button>

                <p className="text-xs text-muted-foreground text-center">
                  ⚠️ Bets are locked until market resolves. Winners take all!
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MarketBettingModal;
