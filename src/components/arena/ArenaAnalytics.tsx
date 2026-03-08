import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, Zap, Trophy, Target, Activity, Flame } from 'lucide-react';

interface ArenaAnalyticsProps {
  totalBattles: number;
  totalPowerStaked: number;
  totalParticipants: number;
  averageStakePerVoter: number;
  largestSingleStake: number;
  mostActiveVoter: {
    username: string;
    votes: number;
  } | null;
  userStats?: {
    totalBattlesParticipated: number;
    totalWins: number;
    totalPowerStaked: number;
    winRate: number;
  };
}

const ArenaAnalytics = ({
  totalBattles,
  totalPowerStaked,
  totalParticipants,
  averageStakePerVoter,
  largestSingleStake,
  mostActiveVoter,
  userStats,
}: ArenaAnalyticsProps) => {
  const stats = [
    {
      icon: <Activity className="w-5 h-5" />,
      label: 'Total Battles',
      value: totalBattles,
      color: '#00D4FF',
    },
    {
      icon: <Zap className="w-5 h-5" />,
      label: 'Total Staked',
      value: totalPowerStaked.toLocaleString(),
      suffix: 'ARX-P',
      color: '#FFD700',
    },
    {
      icon: <Users className="w-5 h-5" />,
      label: 'Unique Voters',
      value: totalParticipants,
      color: '#FF00FF',
    },
    {
      icon: <Target className="w-5 h-5" />,
      label: 'Avg Stake',
      value: averageStakePerVoter.toLocaleString(),
      suffix: 'ARX-P',
      color: '#00FF88',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="glass-card p-6 border border-primary/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Arena Analytics</h3>
            <p className="text-sm text-muted-foreground">Overall statistics</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-lg bg-background/30 border border-border/30 text-center"
            >
              <div 
                className="w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}20` }}
              >
                <div style={{ color: stat.color }}>{stat.icon}</div>
              </div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              {stat.suffix && <div className="text-xs text-muted-foreground">{stat.suffix}</div>}
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Largest Stake */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-6 border border-accent/30"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Largest Single Stake</div>
              <div className="text-2xl font-bold text-accent">{largestSingleStake.toLocaleString()} ARX-P</div>
            </div>
          </div>
        </motion.div>

        {/* Most Active */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card p-6 border border-primary/30"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Most Active Voter</div>
              <div className="text-xl font-bold text-foreground">
                {mostActiveVoter?.username || 'No one yet'}
              </div>
              {mostActiveVoter && (
                <div className="text-sm text-primary">{mostActiveVoter.votes} votes cast</div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* User Stats */}
      {userStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 border border-green-500/30"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Your Performance</h3>
              <p className="text-sm text-muted-foreground">Personal arena stats</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{userStats.totalBattlesParticipated}</div>
              <div className="text-xs text-muted-foreground">Battles Joined</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{userStats.totalWins}</div>
              <div className="text-xs text-muted-foreground">Victories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{userStats.totalPowerStaked.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Staked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">{userStats.winRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">Win Rate</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ArenaAnalytics;
