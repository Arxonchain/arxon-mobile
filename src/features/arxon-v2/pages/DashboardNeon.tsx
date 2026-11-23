/**
 * Full neon dashboard — creamy mesh aesthetic with glass balance + staggered explore flow.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { useMining } from '@/hooks/useMining';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { supabase } from '@/integrations/supabase/client';
import { mobileTopPadding } from '@/lib/mobileLayout';
import { formatPointsDisplay } from '@/lib/formatPoints';
import { DashboardActivityCarousel } from '@/components/mobile/DashboardActivityCarousel';
import MobileRewardAlerts from '@/components/mobile/MobileRewardAlerts';
import {
  NeonPage,
} from '@/features/arxon-v2/design/NeonKit';
import {
  NeonHeaderIconButton,
  NeonHeaderAvatar,
  NeonHeaderActions,
} from '@/features/arxon-v2/design/NeonSecondaryUI';
import {
  LiveBattleStrip,
  RecentActivityFeed,
  buildWeekDaysFromAmounts, mockPreviewWeekDays, inferActivityKind, activityAccent,
  MIN_CLAIM_ARX,
  type DayEarning, type DashBattle, type ActivityFeedItem,
} from '@/features/arxon-v2/components/DashboardWidgets';
import { HomeHeroBalance, HomeRoundActions, MiningHistoryCard } from '@/features/arxon-v2/components/HomeHeroLayout';
import { MineLoad } from '@/features/arxon-v2/components/MineLoad';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import { toPreviewPath } from '@/features/arxon-v2/preview/AppPreviewContext';
import { toast } from '@/hooks/use-toast';
import { usePullRefresh } from '@/walletFigma/flow/pullRefresh';

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
  const { points, rank, refreshPoints } = usePoints();
  const { profile, refetchProfile } = useProfile();
  const mining = useMining({ tickMs: 1000 });
  const { unread: notifUnread } = useInAppNotifications();

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
  const [homeReady, setHomeReady] = useState(preview);

  const totalPts = preview ? 34766 : Math.round(points?.total_points ?? 0);
  const username = preview ? 'Arxon Miner' : (profile?.username || user?.email?.split('@')[0] || 'Miner');
  const streak = preview ? 12 : (points?.daily_streak ?? 0);
  void streak;
  void rank;

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
        val: `${isCredit ? '+' : ''}${formatPointsDisplay(Math.round(amount))}`,
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

  const refreshHome = useCallback(async () => {
    if (preview) return;
    await Promise.all([
      refreshPoints(),
      refetchProfile(),
      fetchActivityData(),
      fetchDashBattles(),
    ]);
  }, [preview, refreshPoints, refetchProfile, fetchActivityData, fetchDashBattles]);

  const pull = usePullRefresh(refreshHome, { threshold: 28 });

  useEffect(() => {
    let alive = true;
    void Promise.all([fetchActivityData(), fetchDashBattles()]).then(() => {
      if (alive) setHomeReady(true);
    });
    return () => {
      alive = false;
    };
  }, [fetchActivityData, fetchDashBattles]);

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchDashBattles();
    }, 60_000);
    return () => clearInterval(interval);
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
      if (previewMining) {
        setPreviewMining(false);
        return;
      }
      setPreviewMining(true);
      setPreviewEarn(0);
      setPreviewRemain(8 * 3600);
      return;
    }
    if (!user) return;
    if (mining.isMining) await mining.stopMining();
    else await mining.startMining();
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
      setPreviewMining(false);
      setPreviewEarn(0);
      setPreviewRemain(8 * 3600);
      toast({ title: 'Points Claimed! 🎉', description: `+${MIN_CLAIM_ARX}+ ARX-P added (preview)` });
      return;
    }
    if (!user) return;
    await mining.claimPoints();
    void fetchActivityData();
  }, [preview, previewEarn, user, mining, fetchActivityData]);

  return (
    <NeonPage pull={preview ? undefined : pull}>
      <motion.div variants={stagger} initial="hidden" animate="show">
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 6,
            background: neon.deep,
          }}
        >
        <motion.div variants={fadeUp} style={{
          padding: `${mobileTopPadding()} 16px 0`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <NeonHeaderAvatar
              label="Profile"
              username={username}
              avatarUrl={profile?.avatar_url}
              accent={neon.cyan}
              size={40}
              onClick={() => go('/profile')}
            />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.55)', fontFamily: neon.font }}>
                Hello,
              </p>
              <p style={{
                margin: '1px 0 0', fontSize: 18, fontWeight: 650, color: neon.text,
                letterSpacing: '-0.3px', fontFamily: neon.font,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {username}
              </p>
            </div>
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
          </NeonHeaderActions>
        </motion.div>

        {!preview && <MobileRewardAlerts />}

        <motion.div variants={fadeUp}>
          <MineLoad waiting={!homeReady} extra={pull.busy} kind="copy">
            <HomeHeroBalance balance={totalPts} />
          </MineLoad>
        </motion.div>

        <motion.div variants={fadeUp}>
          <HomeRoundActions onOpen={go} taskBadge={pendingTasks} />
        </motion.div>
        </div>

        <motion.div variants={fadeUp} style={{ margin: '0 16px' }}>
          <MineLoad waiting={!homeReady} extra={pull.busy} frost kind="card" radius={32}>
            <MiningHistoryCard
              isMining={isMiningLive}
              earnedPoints={miningEarn}
              remainingSeconds={miningRemain}
              pointsPerHour={preview ? 11.5 : mining.pointsPerHour}
              boostPercentage={preview ? 15 : mining.totalBoostPercentage}
              onMine={handleMiningToggle}
              onClaim={handleClaim}
              loading={preview ? false : mining.loading || mining.isClaiming}
              claiming={preview ? false : mining.isClaiming}
              sessionMaxed={preview ? false : mining.sessionMaxed}
              preview={preview}
            />
          </MineLoad>
        </motion.div>

        <motion.div variants={fadeUp} style={{ padding: '14px 20px 0' }}>
          <MineLoad waiting={!homeReady} extra={pull.busy} kind="card" radius={20}>
            <DashboardActivityCarousel />
          </MineLoad>
        </motion.div>

        <motion.div variants={fadeUp} style={{ padding: '18px 20px 0' }}>
          <MineLoad waiting={!homeReady} extra={pull.busy} kind="rows" rowCount={5} radius={22}>
            <RecentActivityFeed
              items={recentActivity}
              isMiningLive={isMiningLive}
              liveEarn={isMiningLive ? miningEarn : undefined}
              onItemClick={() => go('/points-history')}
              onEmptyAction={handleMiningToggle}
            />
          </MineLoad>
        </motion.div>

        <motion.div variants={fadeUp} style={{ padding: '12px 20px 0' }}>
          <MineLoad waiting={!homeReady} extra={pull.busy} kind="rows" rowCount={3} radius={22}>
            <LiveBattleStrip
              battles={dashBattles}
              onViewAll={() => go('/arena/prediction-market')}
              onBattleClick={() => go('/arena/prediction-market')}
            />
          </MineLoad>
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
