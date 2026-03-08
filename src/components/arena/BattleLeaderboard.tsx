import { motion } from 'framer-motion';
import { Trophy, Medal, Award, Zap, TrendingUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { EarningsLeaderboardEntry } from '@/hooks/useArenaMarkets';

interface BattleLeaderboardProps {
  leaderboard: EarningsLeaderboardEntry[];
  currentUserId?: string;
  loading?: boolean;
}

const getBadgeIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-5 h-5 text-yellow-400" />;
    case 2:
      return <Medal className="w-5 h-5 text-gray-400" />;
    case 3:
      return <Award className="w-5 h-5 text-amber-600" />;
    default:
      return null;
  }
};

const BattleLeaderboard = ({ leaderboard, currentUserId, loading }: BattleLeaderboardProps) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-20 rounded-xl bg-secondary/30 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="py-12 text-center">
        <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <p className="text-muted-foreground">No battle history yet</p>
        <p className="text-xs text-muted-foreground mt-1">Vote on predictions to climb the leaderboard!</p>
      </div>
    );
  }

  // Find current user's rank
  const currentUserIndex = leaderboard.findIndex(e => e.user_id === currentUserId);
  const currentUserEntry = currentUserIndex >= 0 ? leaderboard[currentUserIndex] : null;

  return (
    <div className="space-y-4">
      {/* Top 3 Podium */}
      {leaderboard.length >= 3 && (
        <div className="flex items-end justify-center gap-2 py-4">
          {/* 2nd Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center"
          >
            <Avatar className="w-14 h-14 border-2 border-gray-400 mb-2">
              <AvatarImage src={leaderboard[1].avatar_url || undefined} />
              <AvatarFallback className="bg-gray-500/20 text-gray-400">
                {leaderboard[1].username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="w-16 h-16 bg-gradient-to-t from-gray-500/30 to-gray-500/10 rounded-t-lg flex items-center justify-center">
              <span className="text-2xl font-black text-gray-400">2</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate max-w-[80px]">
              {leaderboard[1].username || 'Anonymous'}
            </p>
            <p className="text-xs font-bold text-primary">
              {leaderboard[1].total_earned?.toLocaleString() || 0}
            </p>
          </motion.div>

          {/* 1st Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              <Avatar className="w-18 h-18 border-2 border-yellow-400 mb-2">
                <AvatarImage src={leaderboard[0].avatar_url || undefined} />
                <AvatarFallback className="bg-yellow-500/20 text-yellow-400">
                  {leaderboard[0].username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-2 -right-1">
                <Trophy className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <div className="w-20 h-24 bg-gradient-to-t from-yellow-500/30 to-yellow-500/10 rounded-t-lg flex items-center justify-center">
              <span className="text-3xl font-black text-yellow-400">1</span>
            </div>
            <p className="text-sm font-bold text-foreground mt-1 truncate max-w-[100px]">
              {leaderboard[0].username || 'Anonymous'}
            </p>
            <p className="text-sm font-bold text-primary">
              {leaderboard[0].total_earned?.toLocaleString() || 0}
            </p>
          </motion.div>

          {/* 3rd Place */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <Avatar className="w-14 h-14 border-2 border-amber-600 mb-2">
              <AvatarImage src={leaderboard[2].avatar_url || undefined} />
              <AvatarFallback className="bg-amber-500/20 text-amber-600">
                {leaderboard[2].username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="w-16 h-12 bg-gradient-to-t from-amber-600/30 to-amber-600/10 rounded-t-lg flex items-center justify-center">
              <span className="text-2xl font-black text-amber-600">3</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate max-w-[80px]">
              {leaderboard[2].username || 'Anonymous'}
            </p>
            <p className="text-xs font-bold text-primary">
              {leaderboard[2].total_earned?.toLocaleString() || 0}
            </p>
          </motion.div>
        </div>
      )}

      {/* Current User Banner (if not in top 10) */}
      {currentUserEntry && currentUserIndex >= 10 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-primary/10 border border-primary/30 mb-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="font-bold text-primary">#{currentUserIndex + 1}</span>
            </div>
            <Avatar className="w-10 h-10 border-2 border-primary">
              <AvatarImage src={currentUserEntry.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {currentUserEntry.username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-bold text-foreground">{currentUserEntry.username || 'You'}</p>
              <p className="text-xs text-muted-foreground">
                {currentUserEntry.total_wins}/{currentUserEntry.total_battles} wins
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-primary">{currentUserEntry.total_earned?.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">ARX-P earned</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Rest of Leaderboard */}
      <div className="space-y-2">
        {leaderboard.slice(3, 20).map((entry, index) => {
          const rank = index + 4;
          const isCurrentUser = entry.user_id === currentUserId;

          return (
            <motion.div
              key={entry.user_id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                isCurrentUser
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-secondary/30 border-border/30'
              }`}
            >
              {/* Rank */}
              <div className="w-8 text-center flex-shrink-0">
                <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
              </div>

              {/* Avatar */}
              <Avatar className="w-10 h-10 border border-border">
                <AvatarImage src={entry.avatar_url || undefined} />
                <AvatarFallback className="bg-secondary text-muted-foreground">
                  {entry.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">
                    {entry.username || 'Anonymous'}
                  </span>
                  {isCurrentUser && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                      You
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{entry.total_wins}/{entry.total_battles} wins</span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {entry.win_rate?.toFixed(0) || 0}%
                  </span>
                </div>
              </div>

              {/* Earnings */}
              <div className="flex items-center gap-1 text-right">
                <Zap className="w-4 h-4 text-primary" />
                <span className="font-bold text-foreground">
                  {entry.total_earned?.toLocaleString() || 0}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default BattleLeaderboard;
