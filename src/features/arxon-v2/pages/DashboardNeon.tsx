/**
 * Full neon dashboard — creamy mesh aesthetic with glass balance + staggered explore flow.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Target, Users, Send, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { useMining } from '@/hooks/useMining';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { useRealtimePoints } from '@/hooks/useRealtimePoints';
import { supabase } from '@/integrations/supabase/client';
import { getArenaPoolStats } from '@/lib/arenaPoolStats';
import { WORD_FORGE_ENABLED } from '@/lib/wordForgeFeature';
import { DashboardActivityCarousel } from '@/components/mobile/DashboardActivityCarousel';
import { FORGE_UI } from '@/features/word-forge/data/uiAssets';
import MobileRewardAlerts from '@/components/mobile/MobileRewardAlerts';
import { GlossyIconButton } from '@/features/word-forge/components/GlossyKit';
import {
  NeonPage, NeonPanel, NeonSectionTitle, NeonActivityRow, NeonEyebrow,
} from '@/features/arxon-v2/design/NeonKit';
import {
  BalanceGlassCard, ExploreStaggerFlow, MiningPillWidget,
  buildWeekDaysFromAmounts, mockPreviewWeekDays, type DayEarning,
} from '@/features/arxon-v2/components/DashboardWidgets';
import { neon } from '@/features/arxon-v2/design/neonTokens';

function relTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function localDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

export interface DashboardNeonProps {
  preview?: boolean;
}

export default function DashboardNeon({ preview = false }: DashboardNeonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { points, rank } = usePoints();
  const { profile } = useProfile();
  const mining = useMining({ tickMs: 1000 });
  const { unread: notifUnread } = useInAppNotifications();
  useRealtimePoints();

  const [previewMining, setPreviewMining] = useState(false);
  const [previewEarn, setPreviewEarn] = useState(0);
  const [previewRemain, setPreviewRemain] = useState(8 * 3600);

  const isMiningLive = preview ? previewMining : mining.isMining;
  const miningEarn = preview ? previewEarn : mining.earnedPoints;
  const miningRemain = preview ? previewRemain : mining.remainingTime;

  const [todayPts, setTodayPts] = useState(preview ? 420 : 0);
  const [weekPts, setWeekPts] = useState(preview ? 2840 : 0);
  const [prevWeekPts, setPrevWeekPts] = useState(preview ? 2240 : 0);
  const [liveEarn, setLiveEarn] = useState(preview ? 127.5 : 0);
  const [liveTodayBoost, setLiveTodayBoost] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>(preview ? [
    { label: 'Mining session', sub: '2h ago', val: '+127', accent: neon.teal },
    { label: 'Task completed', sub: '5h ago', val: '+5000', accent: neon.gold },
    { label: 'Arena win', sub: '1d ago', val: '+2400', accent: neon.purple },
  ] : []);
  const [pendingTasks, setPendingTasks] = useState(preview ? 3 : 0);
  const [dashBattles, setDashBattles] = useState<any[]>([]);
  const [weekDays, setWeekDays] = useState<DayEarning[]>(preview ? mockPreviewWeekDays() : buildWeekDaysFromAmounts([0, 0, 0, 0, 0, 0, 0]));

  const totalPts = preview ? 34766 : Math.round(points?.total_points ?? 0);
  const username = preview ? 'Arxon Miner' : (profile?.username || user?.email?.split('@')[0] || 'Miner');
  const streak = preview ? 12 : (points?.daily_streak ?? 0);
  const userRank = preview ? 42 : rank;

  const weekDelta = weekPts - prevWeekPts;
  const weekDeltaPct = prevWeekPts > 0 ? (weekDelta / prevWeekPts) * 100 : weekPts > 0 ? 100 : 0;

  const go = (path: string) => { if (!preview) navigate(path); };

  const fetchActivityData = useCallback(async () => {
    if (preview || !user) return;
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);
    const prevWeekEnd = new Date(weekStart);

    const weekDayKeys = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return localDateKey(d);
    });

    const [{ data: ledgerWeek }, { data: ledgerPrev }] = await Promise.all([
      supabase.from('points_ledger' as any)
        .select('amount, created_at')
        .eq('user_id', user.id)
        .gte('created_at', weekStart.toISOString())
        .gt('amount', 0),
      supabase.from('points_ledger' as any)
        .select('amount, created_at')
        .eq('user_id', user.id)
        .gte('created_at', prevWeekStart.toISOString())
        .lt('created_at', prevWeekEnd.toISOString())
        .gt('amount', 0),
    ]);

    const sumByDay = (rows: any[] | null, keys: string[]) => {
      const map = Object.fromEntries(keys.map((k) => [k, 0]));
      (rows || []).forEach((row) => {
        const key = localDateKey(new Date(row.created_at));
        if (key in map) map[key] += Number(row.amount || 0);
      });
      return keys.map((k) => map[k]);
    };

    const dayAmounts = sumByDay(ledgerWeek, weekDayKeys);
    setWeekDays(buildWeekDaysFromAmounts(dayAmounts, now));
    setTodayPts(dayAmounts[6] ?? 0);
    setWeekPts(dayAmounts.reduce((s, v) => s + v, 0));
    setPrevWeekPts((ledgerPrev || []).reduce((s, r) => s + Number(r.amount || 0), 0));

    const { data: ledgerRows } = await supabase.from('points_ledger' as any)
      .select('amount,description,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(4);
    setRecentActivity((ledgerRows || []).map((row: any) => ({
      label: row.description,
      sub: relTime(row.created_at),
      val: `${Number(row.amount) > 0 ? '+' : ''}${Math.round(Number(row.amount)).toLocaleString()}`,
      accent: Number(row.amount) > 0 ? neon.teal : '#ff6b4a',
    })));
  }, [user, preview]);

  const fetchDashBattles = useCallback(async () => {
    if (preview) return;
    const now = Date.now();
    const { data } = await supabase.from('arena_battles')
      .select('id, title, banner_image, side_a_name, side_b_name, side_a_power, side_b_power, starts_at, ends_at, is_active, winner_side')
      .order('created_at', { ascending: false })
      .limit(10);
    const rows = data || [];
    const live = rows.filter((b) => new Date(b.starts_at).getTime() <= now && new Date(b.ends_at).getTime() > now && !b.winner_side);
    setDashBattles(live.slice(0, 4));
  }, [preview]);

  useEffect(() => { fetchActivityData(); fetchDashBattles(); }, [fetchActivityData, fetchDashBattles]);

  useEffect(() => {
    if (preview || !user) return;
    const channel = supabase
      .channel(`dash-ledger-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'points_ledger', filter: `user_id=eq.${user.id}` }, () => {
        void fetchActivityData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, preview, fetchActivityData]);

  useEffect(() => {
    if (preview || !user) return;
    (async () => {
      const [{ data: activeTasks }, { data: completed }] = await Promise.all([
        supabase.from('tasks').select('id').eq('is_active', true),
        supabase.from('user_tasks').select('task_id').eq('user_id', user.id).eq('status', 'completed'),
      ]);
      const done = new Set((completed || []).map((t: any) => t.task_id));
      setPendingTasks((activeTasks || []).filter((t: any) => !done.has(t.id)).length);
    })();
  }, [user, preview]);

  useEffect(() => {
    if (preview || !user || !mining.isMining) {
      if (!preview) { setLiveEarn(0); setLiveTodayBoost(0); }
      return;
    }
    setLiveEarn(mining.earnedPoints);
    setLiveTodayBoost(Math.max(0, mining.earnedPoints - Math.floor(mining.earnedPoints)));
    const t = setInterval(() => {
      setLiveEarn(mining.earnedPoints);
    }, 4000);
    return () => clearInterval(t);
  }, [user, mining.isMining, mining.earnedPoints, preview]);

  useEffect(() => {
    if (!preview || !previewMining) return;
    const t = setInterval(() => {
      setPreviewEarn((e) => e + 0.08);
      setPreviewRemain((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [preview, previewMining]);

  const handleMiningToggle = useCallback(async () => {
    if (preview) {
      setPreviewMining((m) => {
        if (m) {
          setPreviewEarn(0);
          setPreviewRemain(8 * 3600);
        }
        return !m;
      });
      return;
    }
    if (!user) return;
    if (mining.sessionMaxed) await mining.claimPoints();
    else if (mining.isMining) await mining.stopMining();
    else await mining.startMining();
  }, [preview, previewMining, user, mining]);

  const exploreItems = useMemo(() => [
    {
      eyebrow: 'Missions', title: 'Daily Tasks', cta: 'View Tasks', accent: neon.gold, path: '/tasks', align: 'left' as const,
      badge: pendingTasks > 0 ? `${pendingTasks} new` : undefined,
      icon3d: (
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'linear-gradient(145deg, rgba(255,201,60,0.28), rgba(255,201,60,0.06))',
          border: '1px solid rgba(255,201,60,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(255,201,60,0.2), inset 0 1px 0 rgba(255,255,255,0.12)',
        }}>
          <Target size={22} color={neon.gold} strokeWidth={1.8} />
        </div>
      ),
    },
    {
      eyebrow: 'Rankings', title: 'Leaderboard', cta: 'View Ranks', accent: neon.gold, path: '/leaderboard', align: 'right' as const,
      badge: userRank ? `#${userRank}` : undefined,
      icon3d: (
        <div style={{
          width: 56, height: 56, borderRadius: 14, overflow: 'hidden',
          background: 'linear-gradient(145deg, rgba(255,201,60,0.28), rgba(255,201,60,0.06))',
          border: '1px solid rgba(255,201,60,0.4)',
          boxShadow: '0 0 20px rgba(255,201,60,0.2), inset 0 1px 0 rgba(255,255,255,0.12)',
        }}>
          <img
            src={FORGE_UI.leaderboardKing}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 42%',
              display: 'block',
            }}
          />
        </div>
      ),
    },
    {
      eyebrow: 'Web3', title: 'Wallet', cta: 'Open Wallet', accent: neon.cyan, path: '/wallet', align: 'left' as const,
      badge: 'SOON',
      icon3d: (
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'linear-gradient(145deg, rgba(79,216,235,0.25), rgba(79,216,235,0.05))',
          border: '1px solid rgba(79,216,235,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(79,216,235,0.2), inset 0 1px 0 rgba(255,255,255,0.12)',
        }}>
          <Wallet size={22} color={neon.cyan} strokeWidth={1.8} />
        </div>
      ),
    },
    {
      eyebrow: 'Community', title: 'Referrals', cta: 'Invite Friends', accent: neon.teal, path: '/referrals', align: 'right' as const,
      icon3d: (
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'linear-gradient(145deg, rgba(127,231,196,0.3), rgba(127,231,196,0.06))',
          border: '1px solid rgba(127,231,196,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 18px rgba(127,231,196,0.18)',
        }}>
          <Users size={22} color={neon.teal} strokeWidth={1.8} />
        </div>
      ),
    },
    {
      eyebrow: 'Transfer', title: 'Nexus', cta: 'Send ARX-P', accent: neon.purple, path: '/nexus', align: 'left' as const,
      icon3d: (
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'linear-gradient(145deg, rgba(168,85,247,0.28), rgba(168,85,247,0.06))',
          border: '1px solid rgba(168,85,247,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 18px rgba(168,85,247,0.18)',
          transform: 'rotate(-6deg)',
        }}>
          <Send size={20} color={neon.purple} strokeWidth={1.8} />
        </div>
      ),
    },
  ], [pendingTasks, userRank]);

  return (
    <NeonPage>
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp} style={{ padding: '52px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <NeonEyebrow>Arxon Protocol</NeonEyebrow>
            <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 900, color: neon.text, letterSpacing: '-0.4px', textShadow: `0 0 30px ${neon.cyanGlow}` }}>{username}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <GlossyIconButton label="Notifications" color="slate" size={44} badge={notifUnread || undefined} onClick={() => go('/notifications')}>
              <Bell size={18} />
            </GlossyIconButton>
            <GlossyIconButton label="Profile" color="cyan" size={44} onClick={() => go('/profile')}>
              <span style={{ fontSize: 16, fontWeight: 900 }}>{username[0]?.toUpperCase()}</span>
            </GlossyIconButton>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} style={{ padding: '16px 20px 0' }}>
          <DashboardActivityCarousel forceShowWordForge={preview || WORD_FORGE_ENABLED} />
        </motion.div>

        {!preview && <MobileRewardAlerts />}

        <motion.div variants={fadeUp} style={{ padding: '20px 20px 0' }}>
          <BalanceGlassCard
            balance={totalPts}
            weekDelta={weekDelta}
            weekDeltaPct={weekDeltaPct}
            rank={userRank}
            weekDays={weekDays}
            todayPts={todayPts}
            weekPts={weekPts}
            streak={streak}
            liveTodayBoost={preview ? (previewMining ? previewEarn % 1 : 0) : liveTodayBoost}
            isMiningLive={isMiningLive}
          />
        </motion.div>

        <motion.div variants={fadeUp} style={{ padding: '10px 20px 0' }}>
          <MiningPillWidget
            isMining={isMiningLive}
            earnedPoints={miningEarn}
            remainingSeconds={miningRemain}
            pointsPerHour={preview ? 11.5 : mining.pointsPerHour}
            boostPercentage={preview ? 15 : mining.totalBoostPercentage}
            onToggle={handleMiningToggle}
            loading={preview ? false : mining.loading}
            sessionMaxed={preview ? false : mining.sessionMaxed}
          />
        </motion.div>

        {/* Explore — compact zigzag path like reference */}
        <motion.div variants={fadeUp} style={{ padding: '20px 16px 0' }}>
          <NeonSectionTitle title="Explore" />
          <ExploreStaggerFlow
            items={exploreItems.map((item) => ({
              ...item,
              onClick: () => go(item.path),
            }))}
          />
        </motion.div>

        {(dashBattles.length > 0 || preview) && (
          <motion.div variants={fadeUp} style={{ padding: '22px 20px 0' }}>
            <NeonSectionTitle title="Live Battles" action="All" onAction={() => go('/arena')} />
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto' }} className="scrollbar-none">
              {(preview ? [{ id: '1', title: 'Sector Alpha vs Beta', side_a_name: 'Alpha', side_b_name: 'Beta', side_a_power: 50000, side_b_power: 32000, banner_image: null }] : dashBattles).map((b: any) => {
                const { pctA, pctB } = getArenaPoolStats(b);
                return (
                  <NeonPanel key={b.id} glow={neon.purple} onClick={() => go('/arena')} style={{ minWidth: 200, flexShrink: 0 }}>
                    <NeonEyebrow color={neon.purple}>Live</NeonEyebrow>
                    <p style={{ margin: '8px 0', fontSize: 13, fontWeight: 800, color: neon.text }}>{b.title}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: neon.cyan, fontWeight: 800 }}>{pctA}%</span>
                      <span style={{ fontSize: 9, color: neon.textMuted }}>VS</span>
                      <span style={{ fontSize: 11, color: neon.cyan, fontWeight: 800 }}>{pctB}%</span>
                    </div>
                  </NeonPanel>
                );
              })}
            </div>
          </motion.div>
        )}

        <motion.div variants={fadeUp} style={{ padding: '22px 20px 0' }}>
          <NeonSectionTitle title="Recent Activity" action="History" onAction={() => go('/points-history')} />
          {recentActivity.map((it, i) => (
            <NeonActivityRow key={i} title={it.label} sub={it.sub} value={it.val} accent={it.accent} />
          ))}
        </motion.div>

        {preview && (
          <p style={{ textAlign: 'center', padding: '24px 20px', fontSize: 10, color: neon.textMuted, letterSpacing: '0.1em' }}>
            UI PREVIEW · NEON DASHBOARD v5
          </p>
        )}
      </motion.div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </NeonPage>
  );
}
