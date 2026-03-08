import { motion } from 'framer-motion';
import { Trophy, Medal, Target, Flame, TrendingUp, Award } from 'lucide-react';
import type { LeaderboardEntry, UserBadge, ArenaAnalyticsData } from '@/hooks/useArena';

interface MyRankingsProps {
  leaderboard: LeaderboardEntry[];
  userBadges: UserBadge[];
  currentUserId: string | undefined;
  analytics: ArenaAnalyticsData | null;
}

const MyRankings = ({ leaderboard, userBadges, currentUserId, analytics }: MyRankingsProps) => {
  // Find user's position in leaderboard
  const userRank = leaderboard.findIndex(entry => entry.user_id === currentUserId) + 1;
  const userEntry = leaderboard.find(entry => entry.user_id === currentUserId);

  const stats = [
    {
      icon: Target,
      label: 'Battles Joined',
      value: analytics?.userStats?.totalBattlesParticipated || 0,
    },
    {
      icon: Trophy,
      label: 'Victories',
      value: analytics?.userStats?.totalWins || 0,
    },
    {
      icon: Flame,
      label: 'Total Staked',
      value: `${(analytics?.userStats?.totalPowerStaked || 0).toLocaleString()}`,
    },
    {
      icon: TrendingUp,
      label: 'Win Rate',
      value: `${Math.round(analytics?.userStats?.winRate || 0)}%`,
    },
  ];

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Rank Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/30 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
          <Medal className="w-10 h-10 text-primary" />
        </div>
        <p className="text-muted-foreground text-sm mb-1">Your Rank</p>
        <p className="text-4xl font-black text-foreground mb-2">
          #{userRank || '-'}
        </p>
        <p className="text-sm text-muted-foreground">
          {userEntry 
            ? `${userEntry.total_power_staked.toLocaleString()} ARX-P total staked`
            : 'Join a battle to get ranked!'
          }
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 rounded-xl bg-secondary/30 border border-border/30"
          >
            <stat.icon className="w-5 h-5 text-primary mb-2" />
            <p className="text-2xl font-black text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Badges */}
      <div>
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Award className="w-4 h-4" />
          Your Badges ({userBadges.length})
        </h3>
        
        {userBadges.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {userBadges.map((badge, index) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 rounded-xl border ${
                  badge.badge_type === 'legend' 
                    ? 'bg-purple-500/10 border-purple-500/30'
                    : badge.badge_type === 'winner'
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-primary/10 border-primary/30'
                }`}
              >
                <p className={`font-bold text-sm ${
                  badge.badge_type === 'legend' 
                    ? 'text-purple-500'
                    : badge.badge_type === 'winner'
                      ? 'text-amber-500'
                      : 'text-primary'
                }`}>
                  {badge.badge_name}
                </p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {badge.description}
                </p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-secondary/20 border border-border/30 text-center">
            <Award className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">
              Win battles to earn badges!
            </p>
          </div>
        )}
      </div>

      {/* Top 5 Leaderboard Preview */}
      <div>
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3">
          Top Voters
        </h3>
        <div className="space-y-2">
          {leaderboard.slice(0, 5).map((entry, index) => (
            <motion.div
              key={entry.user_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                entry.user_id === currentUserId
                  ? 'bg-primary/10 border border-primary/30'
                  : 'bg-secondary/30 border border-border/30'
              }`}
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                index === 0 ? 'bg-amber-500 text-black' :
                index === 1 ? 'bg-gray-400 text-black' :
                index === 2 ? 'bg-amber-700 text-white' :
                'bg-secondary text-foreground'
              }`}>
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {entry.username || 'Anonymous'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.total_wins} wins
                </p>
              </div>
              <span className="text-sm font-bold text-primary">
                {entry.total_power_staked.toLocaleString()}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyRankings;
