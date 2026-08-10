/**
 * Full neon dashboard — creamy mesh aesthetic with glass balance + staggered explore flow.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { useMining } from '@/hooks/useMining';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { useRealtimePoints } from '@/hooks/useRealtimePoints';
import { supabase } from '@/integrations/supabase/client';
import { WORD_FORGE_ENABLED } from '@/lib/wordForgeFeature';
import { mobileTopPadding } from '@/lib/mobileLayout';
import { DashboardActivityCarousel } from '@/components/mobile/DashboardActivityCarousel';
import MobileRewardAlerts from '@/components/mobile/MobileRewardAlerts';
import {
  NeonPage, NeonSectionTitle, NeonEyebrow,
} from '@/features/arxon-v2/design/NeonKit';
import {
  NeonHeaderIconButton,
  NeonHeaderAvatar,
  NeonHeaderActions,
} from '@/features/arxon-v2/design/NeonSecondaryUI';
import {
  BalanceGlassCard, ExploreQuadGrid, MiningPillWidget, MiningLiveSessionCard,
  LiveBattleStrip, RecentActivityFeed,
  buildWeekDaysFromAmounts, mockPreviewWeekDays, inferActivityKind, activityAccent,
  MIN_CLAIM_ARX,
  type DayEarning, type ExploreBoxItem, type DashBattle, type ActivityFeedItem,
} from '@/features/arxon-v2/components/DashboardWidgets';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import { toPreviewPath } from '@/features/arxon-v2/preview/AppPreviewContext';
import { toast } from '@/hooks/use-toast';

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

const ACTIVITY_FALLBACK_LABEL: Record<string, string> = {
  mining: 'Mining reward',
  task: 'Task reward',
  arena: 'Arena activity',
  nexus: 'Nexus transfer',
  referral: 'Referral bonus',
  other: 'Activity',
};

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
  const [recentActivity, setRecentActivity] = useState<ActivityFeedItem[]>(preview ? [
    { id: 'p1', kind: 'mining', label: 'Mining session', sub: '2h ago', val: '+127', accent: neon.teal, time: new Date(Date.now() - 7200000).toISOString(), isCredit: true },
    { id: 'p2', kind: 'task', label: 'Daily task completed', sub: '5h ago', val: '+5,000', accent: neon.gold, time: new Date(Date.now() - 18000000).toISOString(), isCredit: true },
    { id: 'p3', kind: 'arena', label: 'Arena win — Side A', sub: '1d ago', val: '+2,400', accent: neon.purple, time: new Date(Date.now() - 86400000).toISOString(), isCredit: true },
    { id: 'p4', kind: 'nexus', label: 'Nexus transfer received', sub: '2d ago', val: '+800', accent: neon.cyan, time: new Date(Date.now() - 172800000).toISOString(), isCredit: true },
  ] : []);
  const [pendingTasks, setPendingTasks] = useState(preview ? 3 : 0);
  const [dashBattles, setDashBattles] = useState<DashBattle[]>([]);
  const [weekDays, setWeekDays] = useState<DayEarning[]>(preview ? mockPreviewWeekDays() : buildWeekDaysFromAmounts([0, 0, 0, 0, 0, 0, 0]));

  const totalPts = preview ? 34766 : Math.round(points?.total_points ?? 0);
  const username = preview ? 'Arxon Miner' : (profile?.username || user?.email?.split('@')[0] || 'Miner');
  const streak = preview ? 12 : (points?.daily_streak ?? 0);
  const userRank = preview ? 42 : rank;

  const weekDelta = weekPts - prevWeekPts;
  const weekDeltaPct = prevWeekPts > 0 ? (weekDelta / prevWeekPts) * 100 : weekPts > 0 ? 100 : 0;

  const go = (path: string) => {
    if (preview) navigate(toPreviewPath(path));
    else navigate(path);
  };

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

    const [{ data: ledgerRows }, { data: sessions }] = await Promise.all([
      supabase.from('points_ledger' as any)
        .select('id, amount, description, category, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6),
      supabase.from('mining_sessions')
        .select('id, arx_mined, started_at, ended_at, is_active')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(3),
    ]);

    const activities: ActivityFeedItem[] = [];
    (ledgerRows || []).forEach((row: any) => {
      const amount = Number(row.amount || 0);
      const isCredit = amount > 0;
      const kind = inferActivityKind(row.category, row.description);
      activities.push({
        id: row.id,
        kind,
        label: row.description || ACTIVITY_FALLBACK_LABEL[kind],
        sub: relTime(row.created_at),
        val: `${isCredit ? '+' : ''}${Math.round(amount).toLocaleString()}`,
        accent: activityAccent(kind, isCredit),
        time: row.created_at,
        isCredit,
      });
    });

    if (activities.length === 0) {
      (sessions || []).forEach((s: any) => {
        const kind = s.is_active ? 'mining_active' as const : 'mining' as const;
        activities.push({
          id: s.id,
          kind,
          label: s.is_active ? 'Mining Session' : 'Session Completed',
          sub: relTime(s.started_at),
          val: s.is_active ? null : `+${Number(s.arx_mined || 0).toFixed(2)}`,
          accent: neon.teal,
          time: s.started_at,
          isCredit: true,
        });
      });
    }

    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setRecentActivity(activities.slice(0, 5));
  }, [user, preview]);

  const fetchDashBattles = useCallback(async () => {
    const now = Date.now();
    const { data } = await supabase.from('arena_battles')
      .select('id, title, banner_image, side_a_name, side_b_name, side_c_name, side_a_power, side_b_power, side_c_power, starts_at, ends_at, is_active, winner_side')
      .order('created_at', { ascending: false })
      .limit(12);
    const rows = (data || []) as DashBattle[];
    const live = rows.filter((b) => {
      const started = new Date(b.starts_at).getTime() <= now;
      const notEnded = new Date(b.ends_at).getTime() > now;
      return started && notEnded && !b.winner_side;
    });
    setDashBattles(live.slice(0, 6));
  }, []);

  useEffect(() => { fetchActivityData(); fetchDashBattles(); }, [fetchActivityData, fetchDashBattles]);

  useEffect(() => {
    const channel = supabase
      .channel('dash-arena-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'arena_battles' }, () => {
        void fetchDashBattles();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchDashBattles]);

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
      if (previewMining) return;
      setPreviewMining(true);
      setPreviewEarn(0);
      setPreviewRemain(8 * 3600);
      return;
    }
    if (!user) return;
    if (mining.isMining) return;
    await mining.startMining();
  }, [preview, previewMining, user, mining]);

  const handleClaim = useCallback(async () => {
    if (preview) {
      if (Math.floor(previewEarn) < MIN_CLAIM_ARX) {
        toast({
          title: 'Keep mining',
          description: `Need at least ${MIN_CLAIM_ARX} ARX-P to claim.`,
          variant: 'destructive',
        });
        return;
      }
      setPreviewEarn(0);
      setPreviewRemain(8 * 3600);
      toast({ title: 'Points Claimed! 🎉', description: `+${MIN_CLAIM_ARX}+ ARX-P added (preview)` });
      return;
    }
    if (!user) return;
    await mining.claimPoints();
    void fetchActivityData();
  }, [preview, previewEarn, user, mining, fetchActivityData]);

  const exploreItems = useMemo<ExploreBoxItem[]>(() => [
    {
      id: 'tasks',
      eyebrow: 'Missions',
      title: 'Daily Tasks',
      cta: 'View Tasks',
      badge: pendingTasks > 0 ? `${pendingTasks} new` : undefined,
      variant: 'tasks',
      onClick: () => go('/tasks'),
    },
    {
      id: 'leaderboard',
      eyebrow: 'Rankings',
      title: 'Leaderboard',
      cta: 'View Ranks',
      badge: userRank ? `#${userRank}` : undefined,
      variant: 'leaderboard',
      onClick: () => go('/leaderboard'),
    },
    {
      id: 'referrals',
      eyebrow: 'Community',
      title: 'Referrals',
      cta: 'Invite',
      variant: 'referrals',
      onClick: () => go('/referrals'),
    },
    {
      id: 'nexus',
      eyebrow: 'Transfer',
      title: 'Nexus',
      cta: 'Send ARX-P',
      variant: 'nexus',
      onClick: () => go('/nexus'),
    },
  ], [pendingTasks, userRank, go]);

  return (
    <NeonPage>
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp} style={{
          padding: `${mobileTopPadding()} 16px 0`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <NeonEyebrow>Arxon Mining App</NeonEyebrow>
            <p style={{
              margin: '4px 0 0', fontSize: 22, fontWeight: 900, color: neon.text,
              letterSpacing: '-0.4px', textShadow: `0 0 30px ${neon.cyanGlow}`,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {username}
            </p>
          </div>
          <NeonHeaderActions>
            <NeonHeaderIconButton
              label="Notifications"
              accent={neon.cyan}
              badge={notifUnread || null}
              onClick={() => go('/notifications')}
            >
              <Bell size={17} strokeWidth={2.2} />
            </NeonHeaderIconButton>
            <NeonHeaderAvatar
              label="Profile"
              username={username}
              avatarUrl={profile?.avatar_url}
              accent={neon.teal}
              onClick={() => go('/profile')}
            />
          </NeonHeaderActions>
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
            loading={preview ? false : mining.loading || mining.isClaiming}
            sessionMaxed={preview ? false : mining.sessionMaxed}
          />
          <AnimatePresence>
            {isMiningLive && (
              <MiningLiveSessionCard
                earnedPoints={miningEarn}
                remainingSeconds={miningRemain}
                pointsPerHour={preview ? 11.5 : mining.pointsPerHour}
                boostPercentage={preview ? 15 : mining.totalBoostPercentage}
                onClaim={handleClaim}
                claiming={preview ? false : mining.isClaiming}
                sessionMaxed={preview ? false : mining.sessionMaxed}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Explore — 2×2 quad grid */}
        <motion.div variants={fadeUp} style={{ padding: '20px 16px 0' }}>
          <NeonSectionTitle title="Explore" />
          <ExploreQuadGrid items={exploreItems} />
        </motion.div>

        <motion.div variants={fadeUp} style={{ padding: '22px 20px 0' }}>
          <NeonSectionTitle
            title="Live Battles"
            action="All"
            onAction={() => go('/arena/prediction-market')}
            badge={dashBattles.length > 0 ? `${dashBattles.length} live` : undefined}
          />
          <LiveBattleStrip
            battles={dashBattles}
            onViewAll={() => go('/arena/prediction-market')}
            onBattleClick={() => go('/arena/prediction-market')}
          />
        </motion.div>

        <motion.div variants={fadeUp} style={{ padding: '22px 20px 0' }}>
          <NeonSectionTitle title="Recent Activity" action="History" onAction={() => go('/points-history')} />
          <RecentActivityFeed
            items={recentActivity}
            isMiningLive={isMiningLive}
            liveEarn={isMiningLive ? miningEarn : undefined}
            onItemClick={() => go('/points-history')}
            onEmptyAction={handleMiningToggle}
          />
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
