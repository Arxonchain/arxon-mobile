import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Crown, TrendingUp, Users, Flame, Target, Zap, Shield, Sword } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { EarningsLeaderboardEntry } from '@/hooks/useArenaMarkets';

interface ArenaTeamLeaderboardProps {
  leaderboard: EarningsLeaderboardEntry[];
  currentUserId?: string;
  loading?: boolean;
}

const ArenaTeamLeaderboard = ({
  leaderboard,
  currentUserId,
  loading = false,
}: ArenaTeamLeaderboardProps) => {
  const [activeTeam, setActiveTeam] = useState<'alpha' | 'omega'>('alpha');

  // Filter and sort by stakes + profit (higher stake + profit = higher rank)
  const getSortedTeam = (club: 'alpha' | 'omega') => {
    return leaderboard
      .filter(entry => entry.club === club)
      .sort((a, b) => {
        // Rank by: total_staked + net_profit
        const scoreA = (a.total_staked || 0) + (a.net_profit || 0);
        const scoreB = (b.total_staked || 0) + (b.net_profit || 0);
        return scoreB - scoreA;
      });
  };

  const alphaTeam = getSortedTeam('alpha');
  const omegaTeam = getSortedTeam('omega');

  // Team stats
  const alphaStats = {
    totalStaked: alphaTeam.reduce((sum, e) => sum + (e.total_staked || 0), 0),
    totalProfit: alphaTeam.reduce((sum, e) => sum + (e.net_profit || 0), 0),
    members: alphaTeam.length,
    totalWins: alphaTeam.reduce((sum, e) => sum + (e.total_wins || 0), 0),
    bestStreak: Math.max(...alphaTeam.map(e => e.best_win_streak || 0), 0),
  };

  const omegaStats = {
    totalStaked: omegaTeam.reduce((sum, e) => sum + (e.total_staked || 0), 0),
    totalProfit: omegaTeam.reduce((sum, e) => sum + (e.net_profit || 0), 0),
    members: omegaTeam.length,
    totalWins: omegaTeam.reduce((sum, e) => sum + (e.total_wins || 0), 0),
    bestStreak: Math.max(...omegaTeam.map(e => e.best_win_streak || 0), 0),
  };

  // Find current user's rank in their team
  const userEntry = leaderboard.find(e => e.user_id === currentUserId);
  const userTeam = userEntry?.club;
  const userRankInTeam = userTeam 
    ? getSortedTeam(userTeam as 'alpha' | 'omega').findIndex(e => e.user_id === currentUserId) + 1
    : 0;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-amber-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-700" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
    }
  };

  const getRankBg = (rank: number, isAlpha: boolean) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-amber-500/20 to-transparent border-amber-500/30';
      case 2:
        return 'bg-gradient-to-r from-gray-400/10 to-transparent border-gray-400/20';
      case 3:
        return 'bg-gradient-to-r from-amber-700/10 to-transparent border-amber-700/20';
      default:
        return `bg-card/50 border-border/30`;
    }
  };

  const getScore = (entry: EarningsLeaderboardEntry) => {
    return (entry.total_staked || 0) + (entry.net_profit || 0);
  };

  const getStreakBadge = (streak: number) => {
    if (streak >= 10) return { text: '🔥 10+', color: 'text-red-500 bg-red-500/20' };
    if (streak >= 5) return { text: '🔥 5+', color: 'text-orange-500 bg-orange-500/20' };
    if (streak >= 3) return { text: '🔥 3', color: 'text-amber-500 bg-amber-500/20' };
    return null;
  };

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-3">
          <Sword className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary">Team Leaderboards</span>
        </div>
        <h2 className="text-xl font-black text-foreground">Alpha vs Omega</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ranked by stakes + profit
        </p>
      </div>

      {/* Your Team Rank Card */}
      {userEntry && userTeam && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl border ${
            userTeam === 'alpha' 
              ? 'bg-cyan-500/10 border-cyan-500/30' 
              : 'bg-purple-500/10 border-purple-500/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                userTeam === 'alpha' ? 'bg-cyan-500/20' : 'bg-purple-500/20'
              }`}>
                {userTeam === 'alpha' ? (
                  <Shield className="w-5 h-5 text-cyan-500" />
                ) : (
                  <Sword className="w-5 h-5 text-purple-500" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Team Rank</p>
                <p className={`text-lg font-bold ${
                  userTeam === 'alpha' ? 'text-cyan-500' : 'text-purple-500'
                }`}>
                  Team {userTeam === 'alpha' ? 'Alpha' : 'Omega'} • #{userRankInTeam}
                </p>
              </div>
            </div>
            <div className="text-right">
              {(userEntry.current_win_streak || 0) >= 3 && (
                <span className={`text-xs px-2 py-1 rounded-full ${getStreakBadge(userEntry.current_win_streak || 0)?.color}`}>
                  {getStreakBadge(userEntry.current_win_streak || 0)?.text} Streak
                </span>
              )}
              <p className={`text-lg font-bold ${
                userTeam === 'alpha' ? 'text-cyan-500' : 'text-purple-500'
              }`}>
                {getScore(userEntry).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{(userEntry.total_staked || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Staked</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${(userEntry.net_profit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {(userEntry.net_profit || 0) >= 0 ? '+' : ''}{(userEntry.net_profit || 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Profit</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-500">{userEntry.total_wins || 0}</p>
              <p className="text-xs text-muted-foreground">Wins</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-orange-500">{userEntry.current_win_streak || 0}</p>
              <p className="text-xs text-muted-foreground">Streak</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Team Stats Comparison */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-cyan-500" />
            <span className="text-sm font-bold text-cyan-500">Team Alpha</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Members</span>
              <span className="font-medium text-foreground">{alphaStats.members}</span>
            </div>
            <div className="flex justify-between">
            <span className="text-muted-foreground">Total Staked</span>
            <span className="font-medium text-cyan-500">{Math.floor(alphaStats.totalStaked).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Wins</span>
              <span className="font-medium text-green-500">{alphaStats.totalWins}</span>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Sword className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-bold text-purple-500">Team Omega</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Members</span>
              <span className="font-medium text-foreground">{omegaStats.members}</span>
            </div>
            <div className="flex justify-between">
            <span className="text-muted-foreground">Total Staked</span>
            <span className="font-medium text-purple-500">{Math.floor(omegaStats.totalStaked).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Wins</span>
              <span className="font-medium text-green-500">{omegaStats.totalWins}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Team Selector Tabs */}
      <Tabs value={activeTeam} onValueChange={(v) => setActiveTeam(v as 'alpha' | 'omega')}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger 
            value="alpha" 
            className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white"
          >
            <Shield className="w-4 h-4 mr-2" />
            Alpha ({alphaTeam.length})
          </TabsTrigger>
          <TabsTrigger 
            value="omega"
            className="data-[state=active]:bg-purple-500 data-[state=active]:text-white"
          >
            <Sword className="w-4 h-4 mr-2" />
            Omega ({omegaTeam.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alpha" className="mt-4">
          <TeamList 
            team={alphaTeam} 
            isAlpha={true} 
            currentUserId={currentUserId}
            loading={loading}
            getRankIcon={getRankIcon}
            getRankBg={getRankBg}
            getScore={getScore}
          />
        </TabsContent>

        <TabsContent value="omega" className="mt-4">
          <TeamList 
            team={omegaTeam} 
            isAlpha={false} 
            currentUserId={currentUserId}
            loading={loading}
            getRankIcon={getRankIcon}
            getRankBg={getRankBg}
            getScore={getScore}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface TeamListProps {
  team: EarningsLeaderboardEntry[];
  isAlpha: boolean;
  currentUserId?: string;
  loading: boolean;
  getRankIcon: (rank: number) => React.ReactNode;
  getRankBg: (rank: number, isAlpha: boolean) => string;
  getScore: (entry: EarningsLeaderboardEntry) => number;
}

const TeamList = ({ team, isAlpha, currentUserId, loading, getRankIcon, getRankBg, getScore }: TeamListProps) => {
  const teamColor = isAlpha ? 'cyan' : 'purple';

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-secondary/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (team.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="py-12 text-center"
      >
        <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">
          No {isAlpha ? 'Alpha' : 'Omega'} team members yet
        </p>
      </motion.div>
    );
  }

  // Show top 3 podium if enough members
  const hasEnoughForPodium = team.length >= 3;

  return (
    <div className="space-y-4">
      {/* Top 3 Podium */}
      {hasEnoughForPodium && (
        <div className="flex items-end justify-center gap-2 py-4">
          {/* 2nd Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center"
          >
            <Avatar className="w-12 h-12 border-2 border-gray-400">
              <AvatarImage src={team[1].avatar_url || undefined} />
              <AvatarFallback className="bg-gray-400/20 text-gray-400">
                {team[1].username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <p className="text-xs font-medium text-foreground mt-2 truncate max-w-[70px]">
              {team[1].username || 'Anonymous'}
            </p>
            <p className={`text-xs font-bold text-${teamColor}-500`}>
              {getScore(team[1]).toLocaleString()}
            </p>
            <div className="w-14 h-14 bg-gray-400/20 rounded-t-lg mt-2 flex items-end justify-center pb-2">
              <span className="text-xl font-black text-gray-400">2</span>
            </div>
          </motion.div>

          {/* 1st Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center -mx-1"
          >
            <div className="relative">
              <Avatar className={`w-16 h-16 border-2 border-${teamColor}-500`}>
                <AvatarImage src={team[0].avatar_url || undefined} />
                <AvatarFallback className={`bg-${teamColor}-500/20 text-${teamColor}-500`}>
                  {team[0].username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <Crown className={`absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 text-amber-500`} />
            </div>
            <p className="text-sm font-bold text-foreground mt-2 truncate max-w-[90px]">
              {team[0].username || 'Anonymous'}
            </p>
            <p className={`text-sm font-bold ${isAlpha ? 'text-cyan-500' : 'text-purple-500'}`}>
              {getScore(team[0]).toLocaleString()}
            </p>
            <div className={`w-18 h-20 rounded-t-lg mt-2 flex items-end justify-center pb-2 border-t-2 ${
              isAlpha ? 'bg-cyan-500/20 border-cyan-500' : 'bg-purple-500/20 border-purple-500'
            }`}>
              <Trophy className={`w-8 h-8 ${isAlpha ? 'text-cyan-500' : 'text-purple-500'}`} />
            </div>
          </motion.div>

          {/* 3rd Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <Avatar className="w-12 h-12 border-2 border-amber-700">
              <AvatarImage src={team[2].avatar_url || undefined} />
              <AvatarFallback className="bg-amber-700/20 text-amber-700">
                {team[2].username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <p className="text-xs font-medium text-foreground mt-2 truncate max-w-[70px]">
              {team[2].username || 'Anonymous'}
            </p>
            <p className={`text-xs font-bold text-${teamColor}-500`}>
              {getScore(team[2]).toLocaleString()}
            </p>
            <div className="w-14 h-10 bg-amber-700/20 rounded-t-lg mt-2 flex items-end justify-center pb-2">
              <span className="text-lg font-black text-amber-700">3</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Rest of the list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {team.slice(hasEnoughForPodium ? 3 : 0).map((entry, index) => {
            const rank = hasEnoughForPodium ? index + 4 : index + 1;
            const isCurrentUser = entry.user_id === currentUserId;
            
            return (
              <motion.div
                key={entry.user_id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.03 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isCurrentUser
                    ? isAlpha 
                      ? 'bg-cyan-500/10 border-cyan-500/30'
                      : 'bg-purple-500/10 border-purple-500/30'
                    : getRankBg(rank, isAlpha)
                }`}
              >
                {getRankIcon(rank)}
                
                <Avatar className="w-10 h-10">
                  <AvatarImage src={entry.avatar_url || undefined} />
                  <AvatarFallback className="bg-secondary text-foreground">
                    {entry.username?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    isCurrentUser 
                      ? isAlpha ? 'text-cyan-500' : 'text-purple-500'
                      : 'text-foreground'
                  }`}>
                    {entry.username || 'Anonymous'}
                    {isCurrentUser && <span className="text-xs ml-1">(You)</span>}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{entry.total_wins || 0}W / {(entry.total_battles || 0) - (entry.total_wins || 0)}L</span>
                    <span>•</span>
                    <span className={(entry.net_profit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {(entry.net_profit || 0) >= 0 ? '+' : ''}{(entry.net_profit || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`text-sm font-bold ${isAlpha ? 'text-cyan-500' : 'text-purple-500'}`}>
                    {getScore(entry).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Score</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ArenaTeamLeaderboard;
