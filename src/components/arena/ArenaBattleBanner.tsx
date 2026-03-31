import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BattleBannerMarket {
  id: string;
  title: string;
  side_a_name: string;
  side_a_color: string;
  side_a_image: string | null;
  side_b_name: string;
  side_b_color: string;
  side_b_image: string | null;
  banner_image: string | null;
  prize_pool: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  winner_side: string | null;
  category: string | null;
}

// Smart side image — shows real image or coloured initials fallback
function TeamBadge({ imageUrl, name, color, size = 28 }: {
  imageUrl: string | null; name: string; color: string; size?: number;
}) {
  const [err, setErr] = useState(false);
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (imageUrl && !err) {
    return (
      <div style={{ width: size, height: size, borderRadius: size / 4, overflow: 'hidden',
        flexShrink: 0, border: `1px solid ${color}44` }}>
        <img src={imageUrl} alt={name} onError={() => setErr(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }

  // Coloured initials fallback
  return (
    <div style={{ width: size, height: size, borderRadius: size / 4, flexShrink: 0,
      background: `${color}22`, border: `1px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.32, fontWeight: 700, color }}>
      {initials}
    </div>
  );
}

const ArenaBattleBanner = () => {
  const navigate = useNavigate();
  const [battles, setBattles] = useState<BattleBannerMarket[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchActiveBattles = async () => {
      const { data, error } = await supabase
        .from('arena_battles')
        .select('id,title,side_a_name,side_a_color,side_a_image,side_b_name,side_b_color,side_b_image,banner_image,prize_pool,starts_at,ends_at,is_active,winner_side,category')
        .eq('is_active', true)
        .is('winner_side', null)
        .order('starts_at', { ascending: true })
        .limit(10);
      if (!error && data) setBattles(data as BattleBannerMarket[]);
    };

    fetchActiveBattles();
    const interval = setInterval(fetchActiveBattles, 60000);

    const channel = supabase
      .channel('battle-banner')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arena_battles' }, fetchActiveBattles)
      .subscribe();

    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const until = sessionStorage.getItem('banner_dismissed_until');
    if (until && new Date(until) > new Date()) setDismissed(true);
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    sessionStorage.setItem('banner_dismissed_until', new Date(Date.now() + 30 * 60 * 1000).toISOString());
  };

  if (dismissed || battles.length === 0) return null;

  const now = new Date();
  const live     = battles.filter(b => new Date(b.starts_at) <= now && new Date(b.ends_at) > now);
  const upcoming = battles.filter(b => new Date(b.starts_at) > now);
  const display  = [...live, ...upcoming];
  if (display.length === 0) return null;

  const scrollItems = [...display, ...display];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-primary/20"
      >
        {/* Dismiss */}
        <button onClick={handleDismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-background/80 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-3 h-3" />
        </button>

        {/* Scrolling strip */}
        <div className="flex cursor-pointer" onClick={() => navigate('/arena')}>
          <motion.div
            className="flex shrink-0"
            animate={{ x: [0, -(display.length * 340)] }}
            transition={{ x: { duration: display.length * 9, repeat: Infinity, ease: 'linear' } }}
          >
            {scrollItems.map((battle, index) => {
              const isLive = new Date(battle.starts_at) <= now && new Date(battle.ends_at) > now;
              const aColor = battle.side_a_color || '#4ade80';
              const bColor = battle.side_b_color || '#f87171';

              return (
                <div key={`${battle.id}-${index}`}
                  className="flex items-center gap-2 px-3 py-2 shrink-0"
                  style={{ width: 340 }}>

                  {/* Live / Soon badge */}
                  {isLive ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />LIVE
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 shrink-0">
                      <Clock className="w-3 h-3" />SOON
                    </span>
                  )}

                  {/* Side A badge */}
                  <div className="flex items-center gap-1.5 shrink-0"
                    style={{ background: `${aColor}18`, border: `1px solid ${aColor}33`,
                      borderRadius: 8, padding: '3px 7px 3px 4px' }}>
                    <TeamBadge imageUrl={battle.side_a_image} name={battle.side_a_name} color={aColor} size={20}/>
                    <span style={{ fontSize: 10, fontWeight: 700, color: aColor, maxWidth: 70,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {battle.side_a_name}
                    </span>
                  </div>

                  <span className="text-muted-foreground text-[10px] font-bold shrink-0">vs</span>

                  {/* Side B badge */}
                  <div className="flex items-center gap-1.5 shrink-0"
                    style={{ background: `${bColor}18`, border: `1px solid ${bColor}33`,
                      borderRadius: 8, padding: '3px 7px 3px 4px' }}>
                    <TeamBadge imageUrl={battle.side_b_image} name={battle.side_b_name} color={bColor} size={20}/>
                    <span style={{ fontSize: 10, fontWeight: 700, color: bColor, maxWidth: 70,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {battle.side_b_name}
                    </span>
                  </div>

                  {/* Prize */}
                  {battle.prize_pool > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold shrink-0 ml-auto">
                      <Zap className="w-3 h-3" />
                      {battle.prize_pool >= 1000 ? `${(battle.prize_pool / 1000).toFixed(0)}K` : battle.prize_pool}
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
