import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Swords, Pickaxe, Target, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { useMiningStatus } from '@/hooks/useMiningStatus';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { useRealtimePoints } from '@/hooks/useRealtimePoints';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getArenaPoolStats } from '@/lib/arenaPoolStats';
import { WORD_FORGE_ENABLED } from '@/lib/wordForgeFeature';
import { FORGE_UI } from '@/features/word-forge/data/uiAssets';
import MobileRewardAlerts from '@/components/mobile/MobileRewardAlerts';
import {
  V2Page, V2WelcomeHeader, V2BalanceHero, V2HeroCard, V2DiscoverCard,
  V2SectionHeader, V2ListRow, V2LiveBanner, fadeUp, stagger,
} from '@/features/arxon-v2/design/Kit';
import { v2 as tokens } from '@/features/arxon-v2/design/tokens';

function relTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function ArxonCoin({ active }: { active: boolean }) {
  return (
    <div style={{ position: 'relative', width: 88, height: 88, animation: active ? 'v2MiningCore 2s ease-in-out infinite' : 'v2FloatCoin 7s ease-in-out infinite' }}>
      <style>{`
        @keyframes v2MiningCore{0%,100%{transform:scale(1);filter:drop-shadow(0 0 10px hsl(215 55% 62%/0.5))}50%{transform:scale(1.06);filter:drop-shadow(0 0 20px hsl(215 55% 62%/0.9))}}
        @keyframes v2FloatCoin{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
      `}</style>
      <svg width="88" height="88" viewBox="0 0 96 96">
        <defs>
          <radialGradient id="v2dcg" cx="36%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#C8E0FF" /><stop offset="70%" stopColor="#3A6898" /><stop offset="100%" stopColor="#0E2244" />
          </radialGradient>
        </defs>
        <circle cx="48" cy="48" r="38" fill="url(#v2dcg)" />
        <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(139,174,214,0.4)" strokeWidth="3" />
      </svg>
      {active && <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: `1px solid ${tokens.accent.mining}80`, animation: 'v2Ripple 2s ease-out infinite' }} />}
      <style>{`@keyframes v2Ripple{0%{transform:scale(1);opacity:0.5}100%{transform:scale(1.35);opacity:0}}`}</style>
    </div>
  );
}

const CAROUSEL_SLIDES = [
  ...(WORD_FORGE_ENABLED ? [{
    id: 'word-forge',
    image: FORGE_UI.dashboardBanner,
    eyebrow: 'New Game Mode',
    title: 'Word Forge',
    subtitle: 'Spell. Stack. Survive. Earn ARX-P in the sci-fi word arena.',
    cta: 'Go to Game',
    path: '/games',
    accent: tokens.accent.gold,
    icon: <Sparkles size={11} />,
  }] : []),
  {
    id: 'arena', eyebrow: 'Live Now', title: 'Arena Battles',
    subtitle: 'Stake ARX-P on predictions. Win pools when your side takes the sector.',
    cta: 'Enter Arena', path: '/arena', accent: tokens.accent.arena,
    gradient: tokens.gradient.arena, icon: <Swords size={11} />,
  },
  {
    id: 'tasks', eyebrow: 'Daily Rewards', title: 'Complete Tasks',
    subtitle: 'Check in, post on X, and finish missions to boost your mining rate.',
    cta: 'View Tasks', path: '/tasks', accent: tokens.accent.mining,
    gradient: tokens.gradient.tasks, icon: <Target size={11} />,
  },
];

export default function DashboardV2() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { points, rank, refreshPoints } = usePoints();
  const { profile, refetchProfile } = useProfile();
  const { isMining, refetch: refetchMining } = useMiningStatus();
  const { unread: notifUnread } = useInAppNotifications();
  useRealtimePoints();

  const [carouselIdx, setCarouselIdx] = useState(0);
  const [todayPts, setTodayPts] = useState(0);
  const [weekPts, setWeekPts] = useState(0);
  const [liveEarn, setLiveEarn] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [pendingTasks, setPendingTasks] = useState(0);
  const [liveArenaCount, setLiveArenaCount] = useState(0);
  const [dashBattles, setDashBattles] = useState<any[]>([]);
  const [weekChart, setWeekChart] = useState<number[]>([0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]);

  const totalPts = Math.round(points?.total_points ?? 0);
  const username = profile?.username || user?.email?.split('@')[0] || 'Miner';
  const streak = points?.daily_streak ?? 0;
  const slides = CAROUSEL_SLIDES;
  const slide = slides[carouselIdx] ?? slides[0];

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(() => setCarouselIdx((i) => (i + 1) % slides.length), 5500);
    return () => window.clearInterval(id);
  }, [slides.length]);

  const shareReferral = useCallback(async () => {
    const code = profile?.referral_code;
    const link = code ? `https://arxonchain.xyz/?ref=${code}` : 'https://arxonchain.xyz';
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join ARXON', text: `Join me on ARXON! Code: ${code}`, url: link });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(link);
          toast({ title: 'Link copied' });
        }
      }
    } else {
      navigator.clipboard.writeText(link);
      toast({ title: 'Link copied' });
    }
  }, [profile?.referral_code]);

  const fetchActivityData = useCallback(async () => {
    if (!user) return;
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const week = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
    const [{ data: td }, { data: wk }] = await Promise.all([
      supabase.from('mining_sessions').select('arx_mined, started_at').eq('user_id', user.id).gte('started_at', today),
      supabase.from('mining_sessions').select('arx_mined, started_at').eq('user_id', user.id).gte('started_at', week),
    ]);
    setTodayPts(td?.reduce((s, r) => s + Number(r.arx_mined || 0), 0) ?? 0);
    setWeekPts(wk?.reduce((s, r) => s + Number(r.arx_mined || 0), 0) ?? 0);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    const dayTotals = weekDays.map((day) =>
      (wk || []).filter((s) => String(s.started_at).startsWith(day)).reduce((sum, r) => sum + Number(r.arx_mined || 0), 0),
    );
    const maxDay = Math.max(...dayTotals, 1);
    setWeekChart(dayTotals.map((v) => Math.max(0.08, v / maxDay)));

    const { data: ledgerRows } = await supabase
      .from('points_ledger' as any)
      .select('id,amount,description,category,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(6);

    const activities: any[] = (ledgerRows || []).map((row: any) => {
      const amount = Number(row.amount || 0);
      const isCredit = amount > 0;
      return {
        label: row.description,
        sub: relTime(row.created_at),
        val: `${isCredit ? '+' : ''}${Math.round(amount).toLocaleString()}`,
        accent: isCredit ? tokens.accent.mining : tokens.accent.danger,
        icon: <Pickaxe size={17} />,
      };
    });
    setRecentActivity(activities.slice(0, 4));
  }, [user]);

  const fetchDashBattles = useCallback(async () => {
    const now = Date.now();
    const { data } = await supabase
      .from('arena_battles')
      .select('id, title, banner_image, side_a_name, side_b_name, side_c_name, side_a_power, side_b_power, side_c_power, starts_at, ends_at, is_active, winner_side')
      .order('created_at', { ascending: false })
      .limit(20);
    const rows = data || [];
    const live = rows.filter((b) => {
      const s = new Date(b.starts_at).getTime();
      const e = new Date(b.ends_at).getTime();
      return s <= now && e > now && (b.is_active ?? true) && !b.winner_side;
    }).map((b) => ({ ...b, _live: true }));
    setLiveArenaCount(live.length);
    setDashBattles([...live, ...rows.filter((b) => b.winner_side || new Date(b.ends_at).getTime() <= now).slice(0, 3)].slice(0, 5));
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: activeTasks }, { data: completed }] = await Promise.all([
        supabase.from('tasks').select('id').eq('is_active', true),
        supabase.from('user_tasks').select('task_id').eq('user_id', user.id).eq('status', 'completed'),
      ]);
      const done = new Set((completed || []).map((t: any) => t.task_id));
      setPendingTasks((activeTasks || []).filter((t: any) => !done.has(t.id)).length);
    })();
  }, [user]);

  useEffect(() => { fetchActivityData(); fetchDashBattles(); }, [fetchActivityData, fetchDashBattles]);

  useEffect(() => {
    if (!user || !isMining) { setLiveEarn(0); return; }
    const sync = async () => {
      const { data } = await supabase.from('mining_sessions').select('started_at, arx_mined').eq('user_id', user.id).eq('is_active', true).order('started_at', { ascending: false }).limit(1).maybeSingle();
      if (!data) return;
      const elapsed = Math.min(Math.floor((Date.now() - new Date(data.started_at).getTime()) / 1000), 8 * 3600);
      setLiveEarn(Math.max(Number(data.arx_mined || 0), Math.min(480, (elapsed / 3600) * 10)));
    };
    sync();
    const t = setInterval(sync, 5000);
    return () => clearInterval(t);
  }, [user, isMining]);

  const discover = [
    { eyebrow: 'Core', title: 'Start Mining', subtitle: isMining ? `${liveEarn.toFixed(2)} ARX-P earned this session` : 'Tap to begin an 8-hour mining session', accent: tokens.brand.steel, gradient: tokens.gradient.steel, path: '/mining', badge: isMining ? 'LIVE' : undefined },
    { eyebrow: 'Predict', title: 'Arena', subtitle: 'Stake on live battles and win pooled rewards', accent: tokens.accent.arena, gradient: tokens.gradient.arena, path: '/arena', badge: liveArenaCount > 0 ? `${liveArenaCount} LIVE` : undefined },
    { eyebrow: 'Earn', title: 'Tasks & Check-in', subtitle: 'Complete missions for bonus ARX-P', accent: tokens.accent.mining, gradient: tokens.gradient.tasks, path: '/tasks', badge: pendingTasks > 0 ? `${pendingTasks} new` : undefined },
    { eyebrow: 'Social', title: 'Referrals', subtitle: 'Invite friends and earn bonus points', accent: tokens.accent.gold, gradient: 'linear-gradient(135deg, hsl(38 45% 18%), hsl(225 35% 10%))', path: '/referrals' },
    { eyebrow: 'Transfer', title: 'Nexus', subtitle: 'Send ARX-P to other miners instantly', accent: tokens.accent.cyan, gradient: 'linear-gradient(135deg, hsl(190 40% 16%), hsl(225 35% 10%))', path: '/nexus' },
    { eyebrow: 'Soon', title: 'Wallet', subtitle: 'Connect Web3 wallet for future claims', accent: tokens.brand.mutedSoft, gradient: tokens.gradient.steel, path: '/wallet', badge: 'SOON' },
  ];

  return (
    <V2Page>
      <motion.div variants={stagger} initial="hidden" animate="show">
        <V2WelcomeHeader
          username={username}
          avatarUrl={profile?.avatar_url}
          onNotif={() => navigate('/notifications')}
          onProfile={() => navigate('/profile')}
          onShare={shareReferral}
          notifCount={notifUnread}
        />

        {/* Featured carousel */}
        {slide && (
          <motion.div variants={fadeUp} style={{ padding: '14px 20px 0' }}>
            <AnimatePresence mode="wait">
              <motion.div key={slide.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35 }}>
                <V2HeroCard
                  eyebrow={slide.eyebrow}
                  title={slide.title}
                  subtitle={slide.subtitle}
                  cta={slide.cta}
                  onCta={() => navigate(slide.path)}
                  accent={slide.accent}
                  gradient={'gradient' in slide ? slide.gradient : undefined}
                  image={'image' in slide ? slide.image : undefined}
                  icon={slide.icon}
                />
              </motion.div>
            </AnimatePresence>
            {slides.length > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                {slides.map((s, i) => (
                  <button key={s.id} type="button" aria-label={s.title} onClick={() => setCarouselIdx(i)}
                    style={{ width: i === carouselIdx ? 18 : 7, height: 7, borderRadius: 99, border: 'none', padding: 0, background: i === carouselIdx ? slide.accent : 'hsl(215 25% 28%)', transition: 'all 0.25s', cursor: 'pointer' }} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        <MobileRewardAlerts />

        {/* Balance hero */}
        <motion.div variants={fadeUp} style={{ margin: '18px 20px 0' }}>
          <V2BalanceHero
            balance={totalPts}
            rank={rank}
            stats={[
              { label: 'Today', value: `+${Math.round(todayPts).toLocaleString()}`, accent: tokens.brand.steelBright },
              { label: 'This Week', value: `+${Math.round(weekPts).toLocaleString()}`, accent: tokens.brand.steelLight },
              { label: 'Streak', value: `${streak}d`, accent: tokens.accent.gold },
            ]}
          >
            <ArxonCoin active={isMining} />
          </V2BalanceHero>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 26, marginTop: 12, padding: '0 4px' }}>
            {weekChart.map((h, i) => (
              <div key={i} style={{ flex: 1, borderRadius: '3px 3px 0 0', height: `${h * 100}%`, background: i === 6 ? `linear-gradient(to top, ${tokens.brand.steel}80, ${tokens.brand.steelLight}b3)` : `hsl(215 25% 55% / ${0.07 + i * 0.015})` }} />
            ))}
          </div>
        </motion.div>

        <AnimatePresence>
          {isMining && (
            <motion.div variants={fadeUp} style={{ margin: '12px 20px 0' }}>
              <V2LiveBanner title="Mining Active" subtitle={`${liveEarn.toFixed(2)} ARX-P earned · tap to view`} onClick={() => navigate('/mining')} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Discover — replaces quick icon grid */}
        <motion.div variants={fadeUp} style={{ padding: '24px 0 0' }}>
          <div style={{ padding: '0 20px' }}>
            <V2SectionHeader title="Discover" />
          </div>
          <div className="scrollbar-none" style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 20px 4px', WebkitOverflowScrolling: 'touch' }}>
            {discover.map((d) => (
              <V2DiscoverCard key={d.path} {...d} onClick={() => navigate(d.path)} />
            ))}
          </div>
        </motion.div>

        {/* Live battles */}
        <motion.div variants={fadeUp} style={{ padding: '24px 20px 0' }}>
          <V2SectionHeader title="Live Battles" badge={liveArenaCount > 0 ? `${liveArenaCount} live` : undefined} action="View all" onAction={() => navigate('/arena')} />
          <div className="scrollbar-none" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {dashBattles.length === 0 ? (
              <V2HeroCard compact eyebrow="Arena" title="No battles yet" subtitle="Check back soon for live predictions" accent={tokens.accent.arena} gradient={tokens.gradient.arena} onCta={() => navigate('/arena')} cta="Explore Arena" />
            ) : dashBattles.map((battle: any) => {
              const { pctA, pctB, hasSideC, pctC } = getArenaPoolStats(battle);
              return (
                <motion.div key={battle.id} whileTap={{ scale: 0.97 }} onClick={() => navigate('/arena')}
                  style={{ minWidth: 220, flexShrink: 0, borderRadius: tokens.radius.lg, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${tokens.accent.arena}33`, background: tokens.gradient.arena, boxShadow: tokens.shadow(tokens.accent.arena, 0.12) }}>
                  {battle.banner_image && <div style={{ height: 72, overflow: 'hidden' }}><img src={battle.banner_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
                  <div style={{ padding: '12px 14px' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: tokens.brand.steelBright, marginBottom: 8, lineHeight: 1.3 }}>{battle.title || 'Arena Battle'}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: hasSideC ? '1fr 1fr 1fr' : '1fr 20px 1fr', gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: tokens.brand.steelLight }}>{pctA}%</span>
                      {!hasSideC && <span style={{ fontSize: 8, textAlign: 'center', color: tokens.brand.muted }}>VS</span>}
                      {hasSideC && <span style={{ fontSize: 10, fontWeight: 800, color: tokens.brand.steelLight }}>{pctC}%</span>}
                      <span style={{ fontSize: 10, fontWeight: 800, color: tokens.brand.steelLight }}>{pctB}%</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Recent activity */}
        <motion.div variants={fadeUp} style={{ padding: '24px 20px 0' }}>
          <V2SectionHeader title="Recent Activity" action="See all" onAction={() => navigate('/points-history')} />
          {recentActivity.length === 0 ? (
            <V2ListRow icon={<Zap size={17} />} title="No activity yet" subtitle="Start mining to see your earnings" value="+0" valueLabel="ARX-P" onClick={() => navigate('/mining')} />
          ) : recentActivity.map((it, i) => (
            <V2ListRow key={i} icon={it.icon} iconAccent={it.accent} title={it.label} subtitle={it.sub} value={it.val} valueLabel="ARX-P" />
          ))}
        </motion.div>

        {/* Leaderboard shortcut */}
        <motion.div variants={fadeUp} style={{ padding: '16px 20px 0' }}>
          <V2HeroCard compact eyebrow="Rankings" title="Global Leaderboard" subtitle="See where you stand among all miners" cta="View Ranks" accent={tokens.accent.gold} gradient="linear-gradient(135deg, hsl(38 45% 18%), hsl(225 35% 10%))" onCta={() => navigate('/leaderboard')} />
        </motion.div>
      </motion.div>
    </V2Page>
  );
}
