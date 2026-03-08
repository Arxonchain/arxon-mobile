import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Zap, Target, TrendingUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LeaderboardEntry {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  total_power_staked: number;
  total_wins: number;
  total_battles: number;
  biggest_stake: number;
}

interface ArenaLeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId?: string;
}

const ArenaLeaderboard = ({ entries, currentUserId }: ArenaLeaderboardProps) => {
  const [activeTab, setActiveTab] = useState('power');

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-muted-foreground font-mono">#{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-transparent border-gray-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-600/20 to-transparent border-amber-600/30';
      default:
        return 'bg-background/30 border-border/30';
    }
  };

  const sortedByPower = [...entries].sort((a, b) => b.total_power_staked - a.total_power_staked);
  const sortedByWins = [...entries].sort((a, b) => b.total_wins - a.total_wins);
  const sortedByStake = [...entries].sort((a, b) => b.biggest_stake - a.biggest_stake);

  const renderList = (data: LeaderboardEntry[], valueKey: keyof LeaderboardEntry, icon: React.ReactNode, label: string) => (
    <div className="space-y-3">
      {data.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No participants yet
        </div>
      ) : (
        data.slice(0, 10).map((entry, index) => (
          <motion.div
            key={entry.user_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center justify-between p-3 rounded-lg border ${getRankBg(index + 1)} ${
              entry.user_id === currentUserId ? 'ring-2 ring-primary' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 flex justify-center">
                {getRankIcon(index + 1)}
              </div>
              <Avatar className="w-10 h-10 border-2 border-border">
                <AvatarImage src={entry.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {entry.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium text-foreground flex items-center gap-2">
                  {entry.username || 'Anonymous'}
                  {entry.user_id === currentUserId && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">You</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {entry.total_battles} battles • {entry.total_wins} wins
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1 font-bold text-primary">
                {icon}
                <span>{typeof entry[valueKey] === 'number' ? entry[valueKey].toLocaleString() : entry[valueKey]}</span>
              </div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );

  return (
    <div className="glass-card p-6 border border-primary/20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-yellow-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Arena Leaderboard</h3>
          <p className="text-sm text-muted-foreground">Top performers</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3 mb-4">
          <TabsTrigger value="power" className="text-xs">
            <Zap className="w-3 h-3 mr-1" />
            Power
          </TabsTrigger>
          <TabsTrigger value="wins" className="text-xs">
            <Trophy className="w-3 h-3 mr-1" />
            Wins
          </TabsTrigger>
          <TabsTrigger value="stake" className="text-xs">
            <Target className="w-3 h-3 mr-1" />
            Biggest
          </TabsTrigger>
        </TabsList>

        <TabsContent value="power" className="mt-0">
          {renderList(sortedByPower, 'total_power_staked', <Zap className="w-4 h-4" />, 'Total Staked')}
        </TabsContent>

        <TabsContent value="wins" className="mt-0">
          {renderList(sortedByWins, 'total_wins', <Trophy className="w-4 h-4" />, 'Victories')}
        </TabsContent>

        <TabsContent value="stake" className="mt-0">
          {renderList(sortedByStake, 'biggest_stake', <Target className="w-4 h-4" />, 'Net Profit')}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ArenaLeaderboard;
