import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useArena } from '@/hooks/useArena';
import { usePoints } from '@/hooks/usePoints';
import { useAdmin } from '@/hooks/useAdmin';
import { useArenaMembership } from '@/hooks/useArenaMembership';
import { useArenaMarkets } from '@/hooks/useArenaMarkets';
import { supabase } from '@/integrations/supabase/client';
import AnimatedBackground from '@/components/layout/AnimatedBackground';
import ArenaOnboarding from '@/components/arena/ArenaOnboarding';
import BattleHero from '@/components/arena/BattleHero';
import ArenaTournamentNav, { type ArenaTournamentTab } from '@/components/arena/ArenaTournamentNav';
import ArenaTournamentHeader from '@/components/arena/ArenaTournamentHeader';
import ArenaTournamentExplorer from '@/components/arena/ArenaTournamentExplorer';
import VotePanel from '@/components/arena/VotePanel';
import ArenaTeamLeaderboard from '@/components/arena/ArenaTeamLeaderboard';
import ArenaMyVotes from '@/components/arena/ArenaMyVotes';
import ArenaMarketDetail from '@/components/arena/ArenaMarketDetail';
import AuthDialog from '@/components/auth/AuthDialog';
import type { ArenaMarket } from '@/hooks/useArenaMarkets';

const Arena = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { points } = usePoints();
  const { membership, loading: membershipLoading, registering, registerMembership, reregisterFingerprint } = useArenaMembership();
  const {
    activeBattle,
    userVote,
    participants,
    userBadges,
    leaderboard,
    battleHistory,
    analytics,
    loading,
    voting,
    castVote,
    getTotalArenaBoost,
  } = useArena();

  const {
    liveMarkets,
    upcomingMarkets,
    endedMarkets,
    userPositions,
    earningsLeaderboard,
    loading: marketsLoading,
    voting: marketVoting,
    placeVote,
    calculatePotentialReturns,
    availablePoints,
  } = useArenaMarkets();

  const [showAuth, setShowAuth] = useState(false);
  const [activeTab, setActiveTab] = useState<ArenaTournamentTab>('challenges');
  const [selectedMarket, setSelectedMarket] = useState<ArenaMarket | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  // Calculate team stats
  // Primary source: leaderboard view (counts real users)
  const alphaStakedFromLeaderboard = earningsLeaderboard
    .filter((e) => e.club === 'alpha')
    .reduce((sum, e) => sum + Number(e.total_staked || 0), 0);
  const omegaStakedFromLeaderboard = earningsLeaderboard
    .filter((e) => e.club === 'omega')
    .reduce((sum, e) => sum + Number(e.total_staked || 0), 0);

  // Fallback source: market pools (works even if leaderboard views are empty/missing in a fresh production DB)
  const marketsForStats = [...liveMarkets, ...endedMarkets];
  const alphaStakedFromPools = marketsForStats.reduce((sum, m) => sum + Number((m as any).side_a_power || 0), 0);
  const omegaStakedFromPools = marketsForStats.reduce((sum, m) => sum + Number((m as any).side_b_power || 0), 0);

  const teamStats = {
    alphaStaked: alphaStakedFromLeaderboard || alphaStakedFromPools,
    omegaStaked: omegaStakedFromLeaderboard || omegaStakedFromPools,
    alphaMembers: earningsLeaderboard.filter((e) => e.club === 'alpha').length,
    omegaMembers: earningsLeaderboard.filter((e) => e.club === 'omega').length,
  };

  // Trigger AI prediction fetch for live markets periodically
  useEffect(() => {
    if (liveMarkets.length === 0) return;
    
    const fetchAIPredictions = async () => {
      try {
        await supabase.functions.invoke('arena-ai-prediction', {
          body: {}
        });
      } catch (error) {
        console.error('Failed to fetch AI predictions:', error);
      }
    };

    // Fetch predictions on mount and every 5 minutes
    fetchAIPredictions();
    const interval = setInterval(fetchAIPredictions, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [liveMarkets.length]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden px-4">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }} />
        </div>
        
        <div className="relative z-10 text-center p-8 rounded-2xl bg-card/50 backdrop-blur-xl border border-primary/30 max-w-md">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h1 className="text-2xl font-black text-foreground mb-2">Prediction Arena</h1>
          <p className="text-muted-foreground mb-6">Stake • Predict • Win big rewards</p>
          <button 
            onClick={() => setShowAuth(true)} 
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors"
          >
            Sign In to Enter
          </button>
        </div>
        <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
      </div>
    );
  }

  if (membershipLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }} />
        </div>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
          <Trophy className="w-12 h-12 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (!membership) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }} />
        </div>
        <ArenaOnboarding onComplete={registerMembership} isLoading={registering} />
      </div>
    );
  }

  // Market detail view
  if (selectedMarket) {
    return (
      <ArenaMarketDetail
        market={selectedMarket}
        userPosition={userPositions.get(selectedMarket.id)}
        availablePoints={availablePoints}
        onClose={() => setSelectedMarket(null)}
        onPlaceBet={placeVote}
        calculateReturns={calculatePotentialReturns}
        isVoting={marketVoting}
        storedFingerprintHash={membership.fingerprint_hash}
        onReregisterFingerprint={reregisterFingerprint}
      />
    );
  }

  const handleVote = async (amount: number): Promise<boolean> => {
    if (!activeBattle) return false;
    const side = membership.club === 'alpha' ? 'a' : 'b';
    return await castVote(activeBattle.id, side, amount);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 60%)' }}
          animate={{ opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
      </div>

      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-4 py-3 border-b border-primary/20 bg-background/90 backdrop-blur-xl">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-black text-foreground">ARENA</h1>
        <button onClick={handleRefresh} disabled={isRefreshing} className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Tournament Header - Team VS */}
      {activeTab === 'challenges' && (
        <ArenaTournamentHeader
          alphaStaked={teamStats.alphaStaked}
          omegaStaked={teamStats.omegaStaked}
          alphaMembers={teamStats.alphaMembers}
          omegaMembers={teamStats.omegaMembers}
        />
      )}

      <main ref={contentRef} className="flex-1 overflow-y-auto relative z-10">
        {activeTab === 'challenges' && (
          <ArenaTournamentExplorer
            liveMarkets={liveMarkets}
            upcomingMarkets={upcomingMarkets}
            endedMarkets={endedMarkets}
            userPositions={userPositions}
            onSelectMarket={setSelectedMarket}
            loading={marketsLoading}
            teamStats={teamStats}
          />
        )}

        {activeTab === 'leaderboard' && (
          <ArenaTeamLeaderboard
            leaderboard={earningsLeaderboard}
            currentUserId={user?.id}
            loading={marketsLoading}
          />
        )}

        {activeTab === 'my-stakes' && (
          <ArenaMyVotes
            liveMarkets={liveMarkets}
            endedMarkets={endedMarkets}
            userPositions={userPositions}
            onSelectMarket={setSelectedMarket}
            availablePoints={availablePoints}
          />
        )}

        {activeTab === 'battle' && (
          <>
            <BattleHero
              battle={activeBattle}
              userClub={membership.club}
              hasVoted={!!userVote}
              onEnterBattle={() => {}}
              isRegistered={true}
            />
            <VotePanel
              battle={activeBattle}
              userClub={membership.club}
              userVote={userVote}
              availablePoints={points?.total_points || 0}
              onVote={handleVote}
              isVoting={voting}
              storedFingerprintHash={membership.fingerprint_hash}
              onReregisterFingerprint={reregisterFingerprint}
            />
          </>
        )}

        {(loading || marketsLoading) && activeTab === 'battle' && (
          <div className="flex items-center justify-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
              <Trophy className="w-8 h-8 text-primary" />
            </motion.div>
          </div>
        )}
      </main>

      <div className="relative z-20">
        <ArenaTournamentNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
};

export default Arena;
