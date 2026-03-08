import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Clock, Users, Trophy, TrendingUp, AlertTriangle, 
  Zap, Fingerprint, Share2, Gift, CheckCircle, Target, ChevronDown, Activity
} from 'lucide-react';
import { toast } from 'sonner';
import type { ArenaMarket, MarketVote } from '@/hooks/useArenaMarkets';
import FingerprintScanner from './FingerprintScanner';
import LivePoolTracker from './LivePoolTracker';
import LiveActivityFeed from './LiveActivityFeed';
import BattleVoteExplorer from './BattleVoteExplorer';
import { useAuth } from '@/contexts/AuthContext';

interface ArenaMarketDetailProps {
  market: ArenaMarket;
  userPosition?: MarketVote;
  availablePoints: number;
  onClose: () => void;
  onPlaceBet: (marketId: string, side: 'a' | 'b' | 'c', amount: number) => Promise<boolean>;
  calculateReturns: (market: ArenaMarket, side: 'a' | 'b' | 'c', amount: number) => any;
  isVoting: boolean;
  storedFingerprintHash?: string | null;
  onReregisterFingerprint?: (newHash: string) => Promise<{ success: boolean; error?: string }>;
}

type DetailTab = 'vote' | 'explorer' | 'pools' | 'activity';

const ArenaMarketDetail = ({
  market,
  userPosition,
  availablePoints,
  onClose,
  onPlaceBet,
  calculateReturns,
  isVoting,
  storedFingerprintHash,
  onReregisterFingerprint,
}: ArenaMarketDetailProps) => {
  const { user } = useAuth();
  const [selectedSide, setSelectedSide] = useState<'a' | 'b' | 'c' | null>(null);
  const [stakeAmount, setStakeAmount] = useState(1000);
  const [showFingerprint, setShowFingerprint] = useState(false);
  const [isReregistering, setIsReregistering] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>('pools');
  const [currentTime, setCurrentTime] = useState(new Date());

  const hasSideC = !!market.side_c_name;
  const totalPool = market.side_a_power + market.side_b_power + (market.side_c_power || 0);
  const sideAPercent = totalPool > 0 ? (market.side_a_power / totalPool) * 100 : hasSideC ? 33.33 : 50;
  const sideBPercent = totalPool > 0 ? (market.side_b_power / totalPool) * 100 : hasSideC ? 33.33 : 50;
  const sideCPercent = totalPool > 0 && hasSideC ? ((market.side_c_power || 0) / totalPool) * 100 : 33.33;

  // Recalculate status based on current time (updates every second)
  const isEnded = !!market.winner_side || new Date(market.ends_at) < currentTime;
  const isUpcoming = new Date(market.starts_at) > currentTime;
  const isLive = !isEnded && !isUpcoming;

  // Update current time every second to check for status transitions
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
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
  }, [market.ends_at, market.starts_at, isUpcoming]);

  const potentialReturns = useMemo(() => {
    if (!selectedSide || stakeAmount < 1000) return null;
    return calculateReturns(market, selectedSide, stakeAmount);
  }, [market, selectedSide, stakeAmount, calculateReturns]);

  const MIN_STAKE = 1000;
  const MAX_STAKE = 100000;
  const stakeTiers = [
    { label: '10%', value: Math.min(Math.max(Math.floor(availablePoints * 0.1), MIN_STAKE), MAX_STAKE) },
    { label: '25%', value: Math.min(Math.max(Math.floor(availablePoints * 0.25), MIN_STAKE), MAX_STAKE) },
    { label: '50%', value: Math.min(Math.max(Math.floor(availablePoints * 0.5), MIN_STAKE), MAX_STAKE) },
    { label: 'MAX', value: Math.min(Math.max(availablePoints, MIN_STAKE), MAX_STAKE) },
  ];

  const handleConfirmBet = () => {
    if (selectedSide && stakeAmount >= MIN_STAKE && stakeAmount <= MAX_STAKE) {
      setShowFingerprint(true);
    }
  };

  const handleFingerprintVerified = async () => {
    console.log('[ArenaMarketDetail] handleFingerprintVerified called', { selectedSide, stakeAmount, marketId: market.id });
    if (!selectedSide) {
      console.error('[ArenaMarketDetail] selectedSide is null - aborting vote');
      toast.error('Please select a side first');
      setShowFingerprint(false);
      return;
    }
    try {
      const success = await onPlaceBet(market.id, selectedSide, stakeAmount);
      console.log('[ArenaMarketDetail] onPlaceBet returned:', success);
      if (success) {
        setStakeAmount(0);
        setSelectedSide(null);
      }
    } catch (err) {
      console.error('[ArenaMarketDetail] Vote failed:', err);
      toast.error('Vote failed - please try again');
    } finally {
      setShowFingerprint(false);
    }
  };

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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        const sideName = selectedSide === 'a' ? market.side_a_name : selectedSide === 'c' ? market.side_c_name : market.side_b_name;
        await navigator.share({
          title: `Arxon Arena - ${market.title}`,
          text: `I'm predicting ${sideName}! Join me and stake your prediction!`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Compact */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-3 py-2.5 border-b border-border/50 bg-background/95 backdrop-blur-xl">
        <button 
          onClick={onClose}
          className="p-1.5 -ml-1 text-muted-foreground active:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <h1 className="font-bold text-sm text-foreground truncate max-w-[180px]">{market.title}</h1>
        
        <button 
          onClick={handleShare}
          className="p-1.5 -mr-1 text-muted-foreground active:text-foreground transition-colors"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </header>

      {/* Content - Compact spacing */}
      <div className="px-3 py-4 space-y-3">
        {/* Status & Timer - Single row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {isEnded ? (
              <span className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Resolved
              </span>
            ) : isUpcoming ? (
              <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                Starts {timeLeft}
              </span>
            ) : (
              <span className="text-[10px] px-2 py-1 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {timeLeft}
              </span>
            )}
          </div>
          {market.prize_pool > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/30">
              <Gift className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-bold text-amber-400">
                {market.prize_pool >= 1000 ? `${(market.prize_pool / 1000).toFixed(0)}K` : market.prize_pool} Pool
              </span>
            </div>
          )}
        </div>

        {/* Title & Description */}
        <div>
          <h2 className="text-lg font-black text-foreground leading-tight">{market.title}</h2>
          {market.description && (
            <p className="text-xs text-muted-foreground mt-1">{market.description}</p>
          )}
        </div>

        {/* Tab Pills - Compact */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          <button
            type="button"
            onClick={() => setActiveDetailTab('pools')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-all touch-manipulation ${
              activeDetailTab === 'pools'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/40 text-muted-foreground active:bg-secondary'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Pools
          </button>
          <button
            type="button"
            onClick={() => setActiveDetailTab('activity')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-all touch-manipulation ${
              activeDetailTab === 'activity'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/40 text-muted-foreground active:bg-secondary'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Live
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          </button>
          <button
            type="button"
            onClick={() => setActiveDetailTab('explorer')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-all touch-manipulation ${
              activeDetailTab === 'explorer'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/40 text-muted-foreground active:bg-secondary'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Votes
          </button>
          {isLive && !userPosition && (
            <button
              type="button"
              onClick={() => setActiveDetailTab('vote')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-all touch-manipulation ${
                activeDetailTab === 'vote'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/40 text-muted-foreground active:bg-secondary'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Vote
            </button>
          )}
        </div>

        {/* Pools Tab */}
        {activeDetailTab === 'pools' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <LivePoolTracker market={market} />
          </motion.div>
        )}

        {/* Live Activity Tab */}
        {activeDetailTab === 'activity' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <LivePoolTracker market={market} />
            <LiveActivityFeed
              battleId={market.id}
              sideAName={market.side_a_name}
              sideBName={market.side_b_name}
              sideAColor={market.side_a_color}
              sideBColor={market.side_b_color}
            />
          </motion.div>
        )}

        {/* Vote Explorer Tab */}
        {activeDetailTab === 'explorer' && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <BattleVoteExplorer market={market} currentUserId={user?.id} />
          </motion.div>
        )}

        {/* Upcoming Market - Voting Disabled Message */}
        {isUpcoming && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Voting Opens Soon</p>
                <p className="text-xs text-muted-foreground">
                  Voting will be available when this market goes live in <span className="font-bold text-blue-400">{timeLeft}</span>
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Already Voted Display */}
        {userPosition && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 rounded-xl bg-primary/10 border border-primary/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Your Position</p>
                <p className="text-base font-bold text-primary">
                  {userPosition.power_spent >= 1000 
                    ? `${(userPosition.power_spent / 1000).toFixed(1)}K` 
                    : userPosition.power_spent.toLocaleString()} ARX-P
                </p>
                <p className="text-[10px] text-muted-foreground">
                  on {userPosition.side === 'a' ? market.side_a_name : userPosition.side === 'c' ? market.side_c_name : market.side_b_name}
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/20">
                <Zap className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-bold text-primary">+25% Boost</span>
              </div>
            </div>
          </motion.div>
        )}

        {isEnded && market.winner_side && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30"
          >
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-[10px] text-muted-foreground">Winner</p>
                <p className="text-sm font-bold text-amber-500">
                  {market.winner_side === 'a' ? market.side_a_name : market.winner_side === 'c' ? market.side_c_name : market.side_b_name}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Side Selection - Vote Tab - Enhanced */}
        {activeDetailTab === 'vote' && isLive && !userPosition && (
          <>
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Select your prediction:</p>
              
              {/* Side A */}
              <button
                type="button"
                onClick={() => setSelectedSide('a')}
                className={`
                  w-full p-4 rounded-xl border-2 transition-all duration-200
                  touch-manipulation select-none active:scale-[0.98]
                  ${selectedSide === 'a' 
                    ? 'shadow-lg' 
                    : 'border-border/40 hover:border-border'
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
                      style={{ backgroundColor: `${market.side_a_color}20` }}
                    >
                      <TrendingUp className="w-5 h-5" style={{ color: market.side_a_color }} />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-base text-foreground block">{market.side_a_name}</span>
                      <span className="text-xs text-muted-foreground">{market.side_a_power.toLocaleString()} staked</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black" style={{ color: market.side_a_color }}>{sideAPercent.toFixed(0)}%</span>
                  </div>
                </div>
              </button>

              {/* Side C (Draw) - Only if exists */}
              {hasSideC && (
                <button
                  type="button"
                  onClick={() => setSelectedSide('c')}
                  className={`
                    w-full p-4 rounded-xl border-2 transition-all duration-200
                    touch-manipulation select-none active:scale-[0.98]
                    ${selectedSide === 'c' 
                      ? 'shadow-lg' 
                      : 'border-border/40 hover:border-border'
                    }
                  `}
                  style={{ 
                    borderColor: selectedSide === 'c' ? (market.side_c_color || '#888888') : undefined,
                    backgroundColor: selectedSide === 'c' ? `${market.side_c_color || '#888888'}15` : undefined,
                    boxShadow: selectedSide === 'c' ? `0 8px 24px ${market.side_c_color || '#888888'}30` : undefined
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${market.side_c_color || '#888888'}20` }}
                      >
                        <Target className="w-5 h-5" style={{ color: market.side_c_color || '#888888' }} />
                      </div>
                      <div className="text-left">
                        <span className="font-bold text-base text-foreground block">{market.side_c_name}</span>
                        <span className="text-xs text-muted-foreground">{(market.side_c_power || 0).toLocaleString()} staked</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black" style={{ color: market.side_c_color || '#888888' }}>{sideCPercent.toFixed(0)}%</span>
                    </div>
                  </div>
                </button>
              )}

              {/* Side B */}
              <button
                type="button"
                onClick={() => setSelectedSide('b')}
                className={`
                  w-full p-4 rounded-xl border-2 transition-all duration-200
                  touch-manipulation select-none active:scale-[0.98]
                  ${selectedSide === 'b' 
                    ? 'shadow-lg' 
                    : 'border-border/40 hover:border-border'
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
                      style={{ backgroundColor: `${market.side_b_color}20` }}
                    >
                      <TrendingUp className="w-5 h-5" style={{ color: market.side_b_color }} />
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-base text-foreground block">{market.side_b_name}</span>
                      <span className="text-xs text-muted-foreground">{market.side_b_power.toLocaleString()} staked</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black" style={{ color: market.side_b_color }}>{sideBPercent.toFixed(0)}%</span>
                  </div>
                </div>
              </button>
            </div>

            {/* Stake Amount - Enhanced */}
            {selectedSide && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-secondary/50 border border-border/40">
                  <span className="text-sm text-muted-foreground font-medium">Available</span>
                  <span className="text-base font-bold text-foreground">{availablePoints.toLocaleString()} ARX-P</span>
                </div>

                {/* Quick Stakes - Enhanced clickability */}
                <div className="grid grid-cols-4 gap-2">
                  {stakeTiers.map((tier) => {
                    const isSelected = stakeAmount === Math.min(Math.max(tier.value, MIN_STAKE), MAX_STAKE);
                    const isDisabled = tier.value > availablePoints;
                    
                    return (
                      <button
                        key={tier.label}
                        type="button"
                        onClick={() => !isDisabled && setStakeAmount(Math.min(Math.max(tier.value, MIN_STAKE), Math.min(availablePoints, MAX_STAKE)))}
                        disabled={isDisabled}
                        className={`
                          py-3 rounded-xl font-bold text-sm transition-all duration-200
                          touch-manipulation select-none
                          ${isSelected
                            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                            : isDisabled
                              ? 'bg-secondary/20 text-muted-foreground/50 cursor-not-allowed'
                              : 'bg-secondary/50 text-foreground hover:bg-secondary active:bg-secondary active:scale-95'
                          }
                        `}
                      >
                        {tier.label}
                      </button>
                    );
                  })}
                </div>

                {/* Slider - Enhanced styling */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min={MIN_STAKE}
                    max={Math.min(Math.max(availablePoints, MIN_STAKE), MAX_STAKE)}
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
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">1K</span>
                    <span className="font-bold text-lg text-primary">{stakeAmount.toLocaleString()} ARX-P</span>
                    <span className="text-xs text-muted-foreground">{availablePoints >= 1000 ? `${(availablePoints/1000).toFixed(0)}K` : availablePoints}</span>
                  </div>
                </div>

                {/* Potential Returns - Compact */}
                {potentialReturns && stakeAmount >= MIN_STAKE && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30">
                      <div className="flex items-center gap-1 mb-1">
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-[10px] font-bold text-green-500">WIN</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{potentialReturns.multiplier.toFixed(1)}x</span>
                      </div>
                      <p className="text-lg font-black text-green-500">
                        +{(() => { const np = potentialReturns.netProfit ?? (potentialReturns.totalWin - stakeAmount); return np >= 1000 ? `${(np/1000).toFixed(1)}K` : np; })()}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                      <div className="flex items-center gap-1 mb-1">
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                        <span className="text-[10px] font-bold text-red-500">LOSE</span>
                      </div>
                      <p className="text-lg font-black text-red-500">
                        -{potentialReturns.totalLoss >= 1000 ? `${(potentialReturns.totalLoss/1000).toFixed(1)}K` : potentialReturns.totalLoss}
                      </p>
                    </div>
                  </div>
                )}

                {/* Confirm Button - Enhanced */}
                <button
                  type="button"
                  onClick={handleConfirmBet}
                  disabled={stakeAmount < MIN_STAKE || availablePoints < MIN_STAKE}
                  className={`
                    w-full py-4 rounded-xl font-bold text-base transition-all duration-200
                    flex items-center justify-center gap-3 touch-manipulation select-none
                    ${stakeAmount < MIN_STAKE || availablePoints < MIN_STAKE
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-gradient-to-r from-primary to-accent text-white hover:opacity-90 active:scale-[0.98] shadow-lg shadow-primary/25'
                    }
                  `}
                >
                  <Fingerprint className="w-5 h-5" />
                  {stakeAmount < MIN_STAKE ? 'Min 1K / Max 100K ARX-P' : 'Verify & Vote'}
                </button>

                <p className="text-xs text-muted-foreground text-center">
                  ⚠️ Votes locked until market resolves
                </p>
              </motion.div>
            )}
          </>
        )}

        {/* Fingerprint Modal */}
        <AnimatePresence>
          {showFingerprint && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-sm glass-card p-6 border border-border/50"
              >
                <FingerprintScanner
                  onVerified={handleFingerprintVerified}
                  isVerifying={isVoting}
                  title="Confirm Your Vote"
                  subtitle={`Stake ${stakeAmount.toLocaleString()} ARX-P on ${selectedSide === 'a' ? market.side_a_name : selectedSide === 'c' ? market.side_c_name : market.side_b_name}`}
                />
                <button
                  onClick={() => setShowFingerprint(false)}
                  className="w-full mt-4 py-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Re-registration Modal */}
        <AnimatePresence>
          {isReregistering && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-sm glass-card p-6 border border-border/50"
              >
                <FingerprintScanner
                  onVerified={handleReregisterComplete}
                  isVerifying={false}
                  title="Re-register Fingerprint"
                  subtitle="This will update your fingerprint for this device"
                />
                <button
                  onClick={() => setIsReregistering(false)}
                  className="w-full mt-4 py-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ArenaMarketDetail;
