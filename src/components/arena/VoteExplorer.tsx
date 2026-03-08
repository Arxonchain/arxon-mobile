import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Zap, Clock, Search, EyeOff, TrendingUp } from 'lucide-react';
import { ArenaParticipant } from '@/hooks/useArena';
import { Input } from '@/components/ui/input';

interface VoteExplorerProps {
  participants: ArenaParticipant[];
  totalVoters: number;
  totalPowerStaked: number;
  currentUserId?: string;
  sideAName?: string;
  sideBName?: string;
  sideAColor?: string;
  sideBColor?: string;
}

const VoteExplorer = ({ 
  participants, 
  totalVoters, 
  totalPowerStaked, 
  currentUserId,
  sideAName = 'Team Alpha',
  sideBName = 'Team Omega',
  sideAColor = '#4ade80',
  sideBColor = '#f87171',
}: VoteExplorerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Only show participants to current user or admin
  const filteredParticipants = participants.filter(p => 
    p.user_id === currentUserId || // Always show own vote
    !searchQuery // Show all if no search
  );

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="glass-card p-4 border border-primary/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Vote Explorer</h3>
            <p className="text-xs text-muted-foreground">Track all participants</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs bg-secondary/30 px-2 py-1 rounded-full">
          <EyeOff className="w-3 h-3" />
          <span>Private</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-background/50 rounded-xl p-3 text-center border border-border/30">
          <div className="text-xl font-bold text-primary">{totalVoters}</div>
          <div className="text-[10px] text-muted-foreground">Total Voters</div>
        </div>
        <div className="bg-background/50 rounded-xl p-3 text-center border border-border/30">
          <div className="text-xl font-bold text-accent">
            {totalPowerStaked >= 1000 
              ? `${(totalPowerStaked / 1000).toFixed(1)}K` 
              : totalPowerStaked.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground">Total Staked</div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border/30 mb-4">
        <EyeOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-xs text-muted-foreground">
          Voter identities are hidden. Only your own vote is visible.
        </span>
      </div>

      {/* Participants List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {participants.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No votes yet</p>
          </div>
        ) : (
          participants.map((participant, index) => {
            const isCurrentUser = participant.user_id === currentUserId;
            
            return (
              <motion.div
                key={participant.user_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  isCurrentUser 
                    ? 'bg-primary/10 border-primary/30' 
                    : 'bg-background/30 border-border/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-[10px] font-bold text-muted-foreground">#{index + 1}</span>
                  </div>
                  
                  <div>
                    {isCurrentUser ? (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-primary text-sm">You</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
                          Your Vote
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <EyeOff className="w-3 h-3 text-muted-foreground/50" />
                        <span className="text-xs text-muted-foreground">Voter #{index + 1}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{formatTimeAgo(participant.created_at)}</span>
                    </div>
                  </div>
                </div>

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
          })
        )}
      </div>

      {/* Activity Feed Preview */}
      {participants.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/30">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="font-medium">Recent Activity</span>
          </div>
          <div className="space-y-1.5">
            {participants.slice(0, 3).map((p, i) => {
              const isCurrentUser = p.user_id === currentUserId;
              return (
                <div key={`activity-${i}`} className="text-xs text-muted-foreground">
                  <span className="text-foreground">{isCurrentUser ? 'You' : 'Someone'}</span> staked{' '}
                  <span className="text-primary font-medium">
                    {p.power_spent >= 1000 
                      ? `${(p.power_spent / 1000).toFixed(1)}K` 
                      : p.power_spent.toLocaleString()} ARX-P
                  </span>{' '}
                  {formatTimeAgo(p.created_at)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoteExplorer;
