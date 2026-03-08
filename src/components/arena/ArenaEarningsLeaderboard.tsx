import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Crown, TrendingUp, Users, Flame, Target, Zap, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { EarningsLeaderboardEntry } from '@/hooks/useArenaMarkets';

type LeaderboardTab = 'earnings' | 'winRate' | 'volume';

interface ArenaEarningsLeaderboardProps {
  leaderboard: EarningsLeaderboardEntry[];
  currentUserId?: string;
  loading?: boolean;
}

const ArenaEarningsLeaderboard = ({
  leaderboard,
  currentUserId,
  loading = false,
}: ArenaEarningsLeaderboardProps) => {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('earnings');

  const tabs = [
    { id: 'earnings' as const, label: 'Top Earners', icon: Trophy },
    { id: 'winRate' as const, label: 'Win Rate', icon: Target },
    { id: 'volume' as const, label: 'Volume', icon: TrendingUp },
  ];

  const getSortedLeaderboard = () => {
    const sorted = [...leaderboard];
    
    switch (activeTab) {
      case 'earnings':
        return sorted.sort((a, b) => (b.total_earned || 0) - (a.total_earned || 0));
      case 'winRate':
        return sorted.sort((a, b) => (b.win_rate || 0) - (a.win_rate || 0));
      case 'volume':
        return sorted.sort((a, b) => (b.total_staked || 0) - (a.total_staked || 0));
      default:
        return sorted;
    }
  };

  const sortedLeaderboard = getSortedLeaderboard();
  const userRank = sortedLeaderboard.findIndex(e => e.user_id === currentUserId) + 1;
  const userEntry = sortedLeaderboard.find(e => e.user_id === currentUserId);

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

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-amber-500/20 to-transparent border-amber-500/30';
      case 2:
        return 'bg-gradient-to-r from-gray-400/10 to-transparent border-gray-400/20';
      case 3:
        return 'bg-gradient-to-r from-amber-700/10 to-transparent border-amber-700/20';
      default:
        return 'bg-card/50 border-border/30';
    }
  };

  const getStatValue = (entry: EarningsLeaderboardEntry) => {
    switch (activeTab) {
      case 'earnings':
        return `+${(entry.total_earned || 0).toLocaleString()} ARX-P`;
      case 'winRate':
        return `${(entry.win_rate || 0).toFixed(0)}%`;
      case 'volume':
        return `${(entry.total_staked || 0).toLocaleString()} ARX-P`;
      default:
        return '';
    }
  };

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-3">
          <Trophy className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary">Arena Leaderboard</span>
        </div>
        <h2 className="text-xl font-black text-foreground">Top Predictors</h2>
        <p className="text-sm text-muted-foreground mt-1">
          See who's winning big in the Arena
        </p>
      </div>

      {/* Your Rank Card */}
      {userEntry && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-primary/10 border border-primary/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-lg font-black text-primary">#{userRank}</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your Rank</p>
                <p className="text-lg font-bold text-foreground">{userEntry.username || 'Anonymous'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Earned</p>
              <p className="text-lg font-bold text-primary">
                +{(userEntry.total_earned || 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{userEntry.total_battles || 0}</p>
              <p className="text-xs text-muted-foreground">Battles</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-green-500">{userEntry.total_wins || 0}</p>
              <p className="text-xs text-muted-foreground">Wins</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-500">{(userEntry.win_rate || 0).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Top 3 Podium */}
      {sortedLeaderboard.length >= 3 && (
        <div className="flex items-end justify-center gap-2 py-4">
          {/* 2nd Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center"
          >
            <Avatar className="w-12 h-12 border-2 border-gray-400">
              <AvatarImage src={sortedLeaderboard[1].avatar_url || undefined} />
              <AvatarFallback className="bg-gray-400/20 text-gray-400">
                {sortedLeaderboard[1].username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <p className="text-xs font-medium text-foreground mt-2 truncate max-w-[80px]">
              {sortedLeaderboard[1].username || 'Anonymous'}
            </p>
            <p className="text-xs text-muted-foreground">{getStatValue(sortedLeaderboard[1])}</p>
            <div className="w-16 h-16 bg-gray-400/20 rounded-t-lg mt-2 flex items-end justify-center pb-2">
              <Medal className="w-6 h-6 text-gray-400" />
            </div>
          </motion.div>

          {/* 1st Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center -mx-2"
          >
            <div className="relative">
              <Avatar className="w-16 h-16 border-2 border-amber-500">
                <AvatarImage src={sortedLeaderboard[0].avatar_url || undefined} />
                <AvatarFallback className="bg-amber-500/20 text-amber-500">
                  {sortedLeaderboard[0].username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 text-amber-500" />
            </div>
            <p className="text-sm font-bold text-foreground mt-2 truncate max-w-[100px]">
              {sortedLeaderboard[0].username || 'Anonymous'}
            </p>
            <p className="text-xs text-primary font-medium">{getStatValue(sortedLeaderboard[0])}</p>
            <div className="w-20 h-24 bg-amber-500/20 rounded-t-lg mt-2 flex items-end justify-center pb-2 border-t-2 border-amber-500">
              <Trophy className="w-8 h-8 text-amber-500" />
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
              <AvatarImage src={sortedLeaderboard[2].avatar_url || undefined} />
              <AvatarFallback className="bg-amber-700/20 text-amber-700">
                {sortedLeaderboard[2].username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <p className="text-xs font-medium text-foreground mt-2 truncate max-w-[80px]">
              {sortedLeaderboard[2].username || 'Anonymous'}
            </p>
            <p className="text-xs text-muted-foreground">{getStatValue(sortedLeaderboard[2])}</p>
            <div className="w-16 h-12 bg-amber-700/20 rounded-t-lg mt-2 flex items-end justify-center pb-2">
              <Medal className="w-5 h-5 text-amber-700" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Full Leaderboard List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-secondary/30 animate-pulse"
                />
              ))}
            </div>
          ) : sortedLeaderboard.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 text-center"
            >
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No leaderboard data yet</p>
            </motion.div>
          ) : (
            sortedLeaderboard.slice(3).map((entry, index) => {
              const rank = index + 4;
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
                      ? 'bg-primary/10 border-primary/30'
                      : getRankBg(rank)
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
                    <p className={`text-sm font-medium truncate ${isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                      {entry.username || 'Anonymous'}
                      {isCurrentUser && <span className="text-xs ml-1">(You)</span>}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{entry.total_wins || 0}W / {(entry.total_battles || 0) - (entry.total_wins || 0)}L</span>
                      <span>•</span>
                      <span className="text-green-500">{(entry.win_rate || 0).toFixed(0)}%</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-sm font-bold ${
                      activeTab === 'earnings' ? 'text-primary' : 
                      activeTab === 'winRate' ? 'text-green-500' : 'text-foreground'
                    }`}>
                      {getStatValue(entry)}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ArenaEarningsLeaderboard;
