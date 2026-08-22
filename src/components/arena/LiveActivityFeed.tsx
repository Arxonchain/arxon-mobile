import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Activity, Bell, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  side: 'a' | 'b';
  power_spent: number;
  created_at: string;
  sideAName: string;
  sideBName: string;
  sideAColor: string;
  sideBColor: string;
}

interface LiveActivityFeedProps {
  battleId: string;
  sideAName: string;
  sideBName: string;
  sideAColor: string;
  sideBColor: string;
  maxItems?: number;
}

const LiveActivityFeed = ({
  battleId,
  sideAName,
  sideBName,
  sideAColor,
  sideBColor,
  maxItems = 5,
}: LiveActivityFeedProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [newActivity, setNewActivity] = useState<ActivityItem | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch initial recent votes
    const fetchRecentVotes = async () => {
      const { data, error } = await supabase.rpc('get_recent_battle_votes', {
        p_battle_id: battleId,
        p_limit: maxItems,
      });

      if (!error && data) {
        const mapped = data.map((v) => ({
          id: v.id,
          side: v.side as 'a' | 'b',
          power_spent: Number(v.power_spent),
          created_at: v.created_at,
          sideAName,
          sideBName,
          sideAColor,
          sideBColor,
        }));
        setActivities(mapped);
      }
    };

    fetchRecentVotes();

    // Battle power updates fire on every vote; refetch bounded activity via RPC.
    const channel = supabase
      .channel(`live-activity-${battleId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'arena_battles',
          filter: `id=eq.${battleId}`,
        },
        async () => {
          const { data } = await supabase.rpc('get_recent_battle_votes', {
            p_battle_id: battleId,
            p_limit: maxItems,
          });

          if (!data?.length) return;

          const latest = data[0];
          const activity: ActivityItem = {
            id: latest.id,
            side: latest.side as 'a' | 'b',
            power_spent: Number(latest.power_spent),
            created_at: latest.created_at,
            sideAName,
            sideBName,
            sideAColor,
            sideBColor,
          };

          setNewActivity(activity);
          setTimeout(() => setNewActivity(null), 3000);

          setActivities(
            data.slice(0, maxItems).map((v) => ({
              id: v.id,
              side: v.side as 'a' | 'b',
              power_spent: Number(v.power_spent),
              created_at: v.created_at,
              sideAName,
              sideBName,
              sideAColor,
              sideBColor,
            }))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [battleId, sideAName, sideBName, sideAColor, sideBColor, maxItems]);

  const formatAmount = (amount: number) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toLocaleString();
  };

  const getTeamInfo = (side: 'a' | 'b') => ({
    name: side === 'a' ? sideAName : sideBName,
    color: side === 'a' ? sideAColor : sideBColor,
  });

  return (
    <div className="space-y-3">
      {/* New Activity Toast */}
      <AnimatePresence>
        {newActivity && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl bg-background/95 backdrop-blur-xl border-2 shadow-2xl"
            style={{ borderColor: getTeamInfo(newActivity.side).color }}
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center animate-pulse"
                style={{ backgroundColor: `${getTeamInfo(newActivity.side).color}20` }}
              >
                <Zap className="w-4 h-4" style={{ color: getTeamInfo(newActivity.side).color }} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  New Vote!
                </p>
                <p className="text-xs text-muted-foreground">
                  Someone staked{' '}
                  <span className="font-bold text-primary">{formatAmount(newActivity.power_spent)} ARX-P</span>
                  {' '}on{' '}
                  <span style={{ color: getTeamInfo(newActivity.side).color }} className="font-bold">
                    {getTeamInfo(newActivity.side).name}
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity Feed Card */}
      <div className="p-3 rounded-xl bg-secondary/20 border border-border/30">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-xs font-bold text-foreground">Live Activity</span>
          <div className="ml-auto flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-muted-foreground">Live</span>
          </div>
        </div>

        <div ref={feedRef} className="space-y-2 max-h-[180px] overflow-y-auto scrollbar-hide">
          <AnimatePresence mode="popLayout">
            {activities.length === 0 ? (
              <div className="text-center py-4">
                <Bell className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">Waiting for votes...</p>
              </div>
            ) : (
              activities.map((activity, index) => {
                const team = getTeamInfo(activity.side);
                return (
                  <motion.div
                    key={activity.id}
                    layout
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex items-center gap-2 p-2 rounded-lg bg-background/30"
                  >
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: team.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">
                        Someone staked{' '}
                        <span className="font-bold text-primary">{formatAmount(activity.power_spent)}</span>
                        {' '}on{' '}
                        <span style={{ color: team.color }} className="font-medium">{team.name}</span>
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: false })}
                    </span>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default LiveActivityFeed;
