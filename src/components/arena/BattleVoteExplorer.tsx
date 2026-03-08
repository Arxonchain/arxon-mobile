import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Zap, Eye, EyeOff, Trophy, Clock, TrendingUp, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import type { ArenaMarket } from '@/hooks/useArenaMarkets';
import { formatDistanceToNow } from 'date-fns';

interface VoteEntry {
  id: string;
  side: 'a' | 'b' | 'c';
  power_spent: number;
  created_at: string;
  user_id: string;
  username?: string;
  avatar_url?: string;
}

interface BattleVoteExplorerProps {
  market: ArenaMarket;
  currentUserId?: string;
}

const BattleVoteExplorer = ({ market, currentUserId }: BattleVoteExplorerProps) => {
  const { isAdmin } = useAdmin();
  const [votes, setVotes] = useState<VoteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'a' | 'b' | 'c'>('all');

  useEffect(() => {
    const fetchVotes = async () => {
      setLoading(true);
      try {
        // Use the RPC function that returns votes with profile info (type assertion for self-hosted)
        const { data, error } = await supabase
          .rpc('get_arena_participation' as any, { p_battle_id: market.id });

        if (error) throw error;

        const mapped = (data || []).map((v: any) => ({
          id: v.user_id + v.created_at,
          side: v.side as 'a' | 'b' | 'c',
          power_spent: v.power_spent,
          created_at: v.created_at,
          user_id: v.user_id,
          username: v.username,
          avatar_url: v.avatar_url,
        }));

        // Sort by power spent descending
        mapped.sort((a: VoteEntry, b: VoteEntry) => b.power_spent - a.power_spent);
        setVotes(mapped);
      } catch (error) {
        console.error('Error fetching votes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVotes();

    // Real-time subscription for new votes
    const channel = supabase
      .channel(`battle-votes-${market.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'arena_votes',
          filter: `battle_id=eq.${market.id}`,
        },
        () => {
          fetchVotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [market.id]);

  const filteredVotes = votes.filter(v => {
    if (activeTab === 'all') return true;
    return v.side === activeTab;
  });

  const sideAVotes = votes.filter(v => v.side === 'a');
  const sideBVotes = votes.filter(v => v.side === 'b');
  const sideCVotes = votes.filter(v => v.side === 'c');
  const sideATotalStaked = sideAVotes.reduce((sum, v) => sum + v.power_spent, 0);
  const sideBTotalStaked = sideBVotes.reduce((sum, v) => sum + v.power_spent, 0);
  const sideCTotalStaked = sideCVotes.reduce((sum, v) => sum + v.power_spent, 0);
  
  const hasSideC = !!market.side_c_name;

  const tabs: { id: 'all' | 'a' | 'b' | 'c'; label: string; count: number; color: string | undefined }[] = [
    { id: 'all', label: 'All Votes', count: votes.length, color: undefined },
    { id: 'a', label: market.side_a_name, count: sideAVotes.length, color: market.side_a_color },
    ...(hasSideC ? [{ id: 'c' as const, label: market.side_c_name!, count: sideCVotes.length, color: market.side_c_color || '#FFD700' }] : []),
    { id: 'b', label: market.side_b_name, count: sideBVotes.length, color: market.side_b_color },
  ];

  const getTeamLabel = (side: 'a' | 'b' | 'c') => {
    if (side === 'a') return market.side_a_name;
    if (side === 'c') return market.side_c_name || 'Draw';
    return market.side_b_name;
  };

  const getTeamColor = (side: 'a' | 'b' | 'c') => {
    if (side === 'a') return market.side_a_color;
    if (side === 'c') return market.side_c_color || '#FFD700';
    return market.side_b_color;
  };

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className={`grid gap-2 ${hasSideC ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <div 
          className="p-3 rounded-xl border-2"
          style={{ 
            borderColor: `${market.side_a_color}40`,
            backgroundColor: `${market.side_a_color}10`
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: market.side_a_color }}
            />
            <span className="text-xs font-medium text-muted-foreground truncate">{market.side_a_name}</span>
          </div>
          <div className="text-lg font-bold text-foreground">{sideAVotes.length}</div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {sideATotalStaked.toLocaleString()}
          </div>
        </div>
        
        {hasSideC && (
          <div 
            className="p-3 rounded-xl border-2"
            style={{ 
              borderColor: `${market.side_c_color || '#FFD700'}40`,
              backgroundColor: `${market.side_c_color || '#FFD700'}10`
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: market.side_c_color || '#FFD700' }}
              />
              <span className="text-xs font-medium text-muted-foreground truncate">{market.side_c_name}</span>
            </div>
            <div className="text-lg font-bold text-foreground">{sideCVotes.length}</div>
            <div className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {sideCTotalStaked.toLocaleString()}
            </div>
          </div>
        )}
        
        <div 
          className="p-3 rounded-xl border-2"
          style={{ 
            borderColor: `${market.side_b_color}40`,
            backgroundColor: `${market.side_b_color}10`
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: market.side_b_color }}
            />
            <span className="text-xs font-medium text-muted-foreground truncate">{market.side_b_name}</span>
          </div>
          <div className="text-lg font-bold text-foreground">{sideBVotes.length}</div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {sideBTotalStaked.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Tab Selection */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all touch-manipulation ${
              activeTab === tab.id
                ? 'text-primary-foreground'
                : 'bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
            style={activeTab === tab.id ? { 
              backgroundColor: tab.color || 'hsl(var(--primary))' 
            } : undefined}
          >
            {tab.id === 'all' ? <Users className="w-4 h-4" /> : (
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tab.color }}
              />
            )}
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id
                ? 'bg-primary-foreground/20'
                : 'bg-muted'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Privacy Notice */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/30 border border-border/30">
        <EyeOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-xs text-muted-foreground">
          Voter identities are hidden. Only team and stake amounts are visible.
        </span>
      </div>

      {/* Votes List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-14 rounded-xl bg-secondary/30 animate-pulse"
                />
              ))}
            </div>
          ) : filteredVotes.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground text-sm">No votes yet</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Be the first to stake your prediction!</p>
            </div>
          ) : (
            filteredVotes.map((vote, index) => {
              const isCurrentUser = vote.user_id === currentUserId;
              const teamLabel = getTeamLabel(vote.side);
              const teamColor = getTeamColor(vote.side);

              return (
                <motion.div
                  key={vote.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.02 }}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isCurrentUser
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-secondary/30 border-border/30'
                  }`}
                >
                  {/* Rank Badge */}
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    {index < 3 ? (
                      <Trophy className={`w-3.5 h-3.5 ${
                        index === 0 ? 'text-yellow-400' : 
                        index === 1 ? 'text-gray-400' : 
                        'text-amber-600'
                      }`} />
                    ) : (
                      <span className="text-[10px] font-bold text-muted-foreground">#{index + 1}</span>
                    )}
                  </div>

                  {/* Team Badge */}
                  <div 
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    style={{ 
                      backgroundColor: `${teamColor}20`,
                      color: teamColor 
                    }}
                  >
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: teamColor }}
                    />
                    {teamLabel}
                  </div>

                  {/* User Identity - Hidden or Self */}
                  <div className="flex-1 min-w-0">
                    {isCurrentUser ? (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-primary text-sm">You</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                          Your Vote
                        </span>
                      </div>
                    ) : isAdmin ? (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground text-sm truncate">
                          {vote.username || 'Anonymous'}
                        </span>
                        <Eye className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <EyeOff className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">Voter #{index + 1}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDistanceToNow(new Date(vote.created_at), { addSuffix: true })}
                    </div>
                  </div>

                  {/* Stake Amount */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/50 flex-shrink-0">
                    <Zap className="w-3.5 h-3.5 text-primary" />
                    <span className="font-bold text-sm text-foreground">
                      {vote.power_spent >= 1000 
                        ? `${(vote.power_spent / 1000).toFixed(1)}K` 
                        : vote.power_spent.toLocaleString()}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Summary Footer */}
      {votes.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/20 border border-border/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Participation</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-foreground">{votes.length} voters</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs font-bold text-primary">
              {(sideATotalStaked + sideBTotalStaked + sideCTotalStaked).toLocaleString()} ARX-P
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BattleVoteExplorer;
