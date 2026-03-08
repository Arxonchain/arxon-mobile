import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, X, Zap, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BattleBannerMarket {
  id: string;
  title: string;
  side_a_name: string;
  side_a_color: string;
  side_b_name: string;
  side_b_color: string;
  prize_pool: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  winner_side: string | null;
}

const ArenaBattleBanner = () => {
  const navigate = useNavigate();
  const [battles, setBattles] = useState<BattleBannerMarket[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchActiveBattles = async () => {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('arena_battles')
        .select('id, title, side_a_name, side_a_color, side_b_name, side_b_color, prize_pool, starts_at, ends_at, is_active, winner_side')
        .eq('is_active', true)
        .is('winner_side', null)
        .order('starts_at', { ascending: true })
        .limit(10);

      if (!error && data) {
        setBattles(data as BattleBannerMarket[]);
      }
    };

    fetchActiveBattles();

    // Refresh every 60 seconds
    const interval = setInterval(fetchActiveBattles, 60000);

    // Listen for new battles in real-time
    const channel = supabase
      .channel('battle-banner')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arena_battles' }, () => {
        fetchActiveBattles();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  // Check sessionStorage for dismissed state
  useEffect(() => {
    const dismissedUntil = sessionStorage.getItem('banner_dismissed_until');
    if (dismissedUntil && new Date(dismissedUntil) > new Date()) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    // Dismiss for 30 minutes
    const until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    sessionStorage.setItem('banner_dismissed_until', until);
  };

  if (dismissed || battles.length === 0) return null;

  const now = new Date();
  const liveBattles = battles.filter(b => new Date(b.starts_at) <= now && new Date(b.ends_at) > now);
  const upcomingBattles = battles.filter(b => new Date(b.starts_at) > now);
  const displayBattles = [...liveBattles, ...upcomingBattles];

  if (displayBattles.length === 0) return null;

  // Double the array for seamless loop
  const scrollItems = [...displayBattles, ...displayBattles];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-primary/20"
      >
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3 h-3" />
        </button>

        {/* Scrolling container */}
        <div
          className="flex cursor-pointer"
          onClick={() => navigate('/arena')}
        >
          <motion.div
            className="flex shrink-0"
            animate={{ x: [0, -(displayBattles.length * 320)] }}
            transition={{
              x: {
                duration: displayBattles.length * 8,
                repeat: Infinity,
                ease: 'linear',
              },
            }}
          >
            {scrollItems.map((battle, index) => {
              const isLive = new Date(battle.starts_at) <= now && new Date(battle.ends_at) > now;

              return (
                <div
                  key={`${battle.id}-${index}`}
                  className="flex items-center gap-2 px-4 py-2 shrink-0"
                  style={{ width: 320 }}
                >
                  <Swords className="w-3.5 h-3.5 text-primary shrink-0" />

                  {isLive ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      LIVE
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 shrink-0">
                      <Clock className="w-3 h-3" />
                      SOON
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 text-xs font-medium text-foreground truncate">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{ backgroundColor: `${battle.side_a_color}30`, color: battle.side_a_color }}
                    >
                      {battle.side_a_name}
                    </span>
                    <span className="text-muted-foreground text-[10px]">vs</span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{ backgroundColor: `${battle.side_b_color}30`, color: battle.side_b_color }}
                    >
                      {battle.side_b_name}
                    </span>
                  </div>

                  {battle.prize_pool > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold shrink-0">
                      <Zap className="w-3 h-3" />
                      {battle.prize_pool >= 1000
                        ? `${(battle.prize_pool / 1000).toFixed(0)}K`
                        : battle.prize_pool}
                    </span>
                  )}
                </div>
              );
            })}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ArenaBattleBanner;
