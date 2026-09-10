import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Zap, Eye, EyeOff, Trophy, Clock, TrendingUp, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import type { ArenaMarket } from '@/hooks/useArenaMarkets';
import { getBattleOptions, getOptionColor, getOptionName, type ArenaSideId } from '@/lib/arenaOptions';
import { formatDistanceToNow } from 'date-fns';

interface VoteEntry {
  id: string;
  side: ArenaSideId;
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
  const [activeTab, setActiveTab] = useState<'all' | ArenaSideId>('all');

  const battleOptions = useMemo(() => getBattleOptions(market), [market]);

  useEffect(() => {
    const fetchVotes = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_arena_participation', {
          p_battle_id: market.id,
          p_limit: 100,
        });

        if (error) throw error;

        const mapped = (data || []).map((v: any) => ({
          id: v.user_id + v.created_at,
          side: v.side as ArenaSideId,
          power_spent: v.power_spent,
          created_at: v.created_at,
          user_id: v.user_id,
          username: v.username,
          avatar_url: v.avatar_url,
        }));

        mapped.sort((a: VoteEntry, b: VoteEntry) => b.power_spent - a.power_spent);
        setVotes(mapped);
      } catch (error) {
        console.error('Error fetching votes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVotes();

    const channel = supabase
      .channel(`battle-votes-${market.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'arena_battles',
          filter: `id=eq.${market.id}`,
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

  const filteredVotes = votes.filter((v) => {
    if (activeTab === 'all') return true;
    return v.side === activeTab;
  });

  const tabs: { id: 'all' | ArenaSideId; label: string; count: number; color: string | undefined }[] = [
    { id: 'all', label: 'All Votes', count: votes.length, color: undefined },
    ...battleOptions.map((opt) => ({
      id: opt.id as ArenaSideId,
      label: opt.name,
      count: votes.filter((v) => v.side === opt.id).length,
      color: opt.color,
    })),
  ];

  const getTeamLabel = (side: ArenaSideId) => getOptionName(market, side);
  const getTeamColor = (side: ArenaSideId) => getOptionColor(market, side);

  const gridCols =
    battleOptions.length <= 2 ? 'grid-cols-2' :
    battleOptions.length === 3 ? 'grid-cols-3' :
    'grid-cols-2 sm:grid-cols-3';

  return (
    <div className="space-y-4">
      <div className={`grid gap-2 ${gridCols}`}>
        {battleOptions.map((opt) => {
          const sideVotes = votes.filter((v) => v.side === opt.id);
          const sideTotal = sideVotes.reduce((sum, v) => sum + v.power_spent, 0);
          return (
            <div
              key={opt.id}
              className="p-3 rounded-xl border-2"
              style={{
                borderColor: `${opt.color}40`,
                backgroundColor: `${opt.color}10`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: opt.color }} />
                <span className="text-xs font-medium text-muted-foreground truncate">{opt.name}</span>
              </div>
              <div className="text-lg font-bold text-foreground">{sideVotes.length}</div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {sideTotal.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
            }`}
            style={activeTab === tab.id && tab.color ? { backgroundColor: tab.color, color: '#fff' } : undefined}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredVotes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No votes yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          <AnimatePresence>
            {filteredVotes.map((vote, index) => (
              <motion.div
                key={vote.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  vote.user_id === currentUserId ? 'border-primary/50 bg-primary/5' : 'border-border/40 bg-card/50'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: `${getTeamColor(vote.side)}20`, color: getTeamColor(vote.side) }}
                >
                  {vote.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {isAdmin ? (vote.username || vote.user_id.slice(0, 8)) : (vote.user_id === currentUserId ? 'You' : 'Anonymous')}
                    </span>
                    {vote.user_id === currentUserId && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">You</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span style={{ color: getTeamColor(vote.side) }}>{getTeamLabel(vote.side)}</span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(vote.created_at), { addSuffix: true })}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm font-bold text-foreground">
                    <Zap className="w-3 h-3 text-amber-500" />
                    {vote.power_spent.toLocaleString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default BattleVoteExplorer;
