import { motion } from 'framer-motion';
import { Trophy, Zap, Medal, Award, EyeOff, TrendingUp, Users } from 'lucide-react';
import { ArenaParticipant } from '@/hooks/useArena';

interface ParticipantLeaderboardProps {
  participants: ArenaParticipant[];
  currentUserId?: string;
  sideAName?: string;
  sideBName?: string;
  sideAColor?: string;
  sideBColor?: string;
}

const getBadgeIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-4 h-4 text-yellow-400" />;
    case 2:
      return <Medal className="w-4 h-4 text-gray-400" />;
    case 3:
      return <Award className="w-4 h-4 text-amber-600" />;
    default:
      return null;
  }
};

const ParticipantLeaderboard = ({ 
  participants, 
  currentUserId,
  sideAName = 'Team Alpha',
  sideBName = 'Team Omega',
  sideAColor = '#4ade80',
  sideBColor = '#f87171',
}: ParticipantLeaderboardProps) => {
  if (participants.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-muted-foreground text-sm">No votes cast yet</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Be the first to enter the Arena!</p>
      </div>
    );
  }

  const totalStaked = participants.reduce((sum, p) => sum + p.power_spent, 0);

  return (
    <div className="glass-card p-4 border border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Arena Leaderboard</h3>
            <p className="text-xs text-muted-foreground">Top voters this battle</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs bg-secondary/30 px-2 py-1 rounded-full">
          <EyeOff className="w-3 h-3" />
          <span>Private</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/20 border border-border/20 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">Total</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-foreground">{participants.length} voters</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs font-bold text-primary">
            {totalStaked >= 1000 
              ? `${(totalStaked / 1000).toFixed(1)}K` 
              : totalStaked.toLocaleString()} ARX-P
          </span>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border/30 mb-4">
        <EyeOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-xs text-muted-foreground">
          Voter identities are hidden. Only stake amounts are visible.
        </span>
      </div>

      <div className="space-y-2">
        {participants.slice(0, 10).map((participant, index) => {
          const rank = index + 1;
          const isCurrentUser = participant.user_id === currentUserId;

          return (
            <motion.div
              key={participant.user_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                isCurrentUser
                  ? 'bg-primary/10 border border-primary/30'
                  : 'bg-background/30 border border-border/30 hover:bg-background/50'
              }`}
            >
              {/* Rank */}
              <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
                {rank <= 3 ? (
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                    {getBadgeIcon(rank)}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground font-mono">#{rank}</span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                {isCurrentUser ? (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-primary text-sm">You</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                      Your Vote
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <EyeOff className="w-3 h-3 text-muted-foreground/50" />
                    <span className="text-xs text-muted-foreground">Voter #{rank}</span>
                  </div>
                )}
              </div>

              {/* Power */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/50">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span className="font-bold text-sm text-foreground">
                  {participant.power_spent >= 1000 
                    ? `${(participant.power_spent / 1000).toFixed(1)}K` 
                    : participant.power_spent.toLocaleString()}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {participants.length > 10 && (
        <p className="text-center text-xs text-muted-foreground mt-4 py-2 bg-secondary/20 rounded-lg">
          +{participants.length - 10} more participants
        </p>
      )}
    </div>
  );
};

export default ParticipantLeaderboard;
