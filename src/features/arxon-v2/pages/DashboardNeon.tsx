/**
 * Full neon dashboard — Word Forge banner aesthetic app-wide.
 * Uses the original DashboardActivityCarousel + GlossyKit + space backdrop.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Pickaxe, Swords, Target, Users, Send, Wallet, Trophy, Zap } from 'lucide-react';
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
import { DashboardActivityCarousel } from '@/components/mobile/DashboardActivityCarousel';
import MobileRewardAlerts from '@/components/mobile/MobileRewardAlerts';
import {
  GlossyButton, GlossyIconButton, GamePanel, RibbonBanner,
} from '@/features/word-forge/components/GlossyKit';
import {
  NeonPage, NeonPanel, NeonChip, NeonActionTile, NeonSectionTitle, NeonActivityRow, NeonEyebrow,
} from '@/features/arxon-v2/design/NeonKit';
import { neon } from '@/features/arxon-v2/design/neonTokens';

function relTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

export interface DashboardNeonProps {
  /** Browser preview — mock data, always show Word Forge carousel slide */
  preview?: boolean;
}

export default function DashboardNeon({ preview = false }: DashboardNeonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { points, rank } = usePoints();
  const { profile } = useProfile();
  const { isMining } = useMiningStatus();
  const { unread: notifUnread } = useInAppNotifications();
  useRealtimePoints();

  const [todayPts, setTodayPts] = useState(preview ? 420 : 0);
  const [weekPts, setWeekPts] = useState(preview ? 2840 : 0);
  const [liveEarn, setLiveEarn] = useState(preview ? 127.5 : 0);
  const [recentActivity, setRecentActivity] = useState<any[]>(preview ? [
    { label: 'Mining session', sub: '2h ago', val: '+127', accent: neon.teal },
    { label: 'Task completed', sub: '5h ago', val: '+5000', accent: neon.gold },
    { label: 'Arena win', sub: '1d ago', val: '+2400', accent: neon.purple },
  ] : []);
  const [pendingTasks, setPendingTasks] = useState(preview ? 3 : 0);
  const [liveArenaCount, setLiveArenaCount] = useState(preview ? 2 : 0);
  const [dashBattles, setDashBattles] = useState<any[]>([]);
  const [weekChart, setWeekChart] = useState<number[]>(preview ? [0.2, 0.35, 0.5, 0.4, 0.65, 0.8, 1] : [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1]);

  const totalPts = preview ? 34766 : Math.round(points?.total_points ?? 0);
  const username = preview ? 'Arxon Miner' : (profile?.username || user?.email?.split('@')[0] || 'Miner');
  const streak = preview ? 12 : (points?.daily_streak ?? 0);
  const userRank = preview ? 42 : rank;

  const go = (path: string) => { if (!preview) navigate(path); };

  const fetchActivityData = useCallback(async () => {
    if (preview || !user) return;
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
      const d = new Date(now); d.setDate(d.getDate() - (6 - i)); return d.toISOString().split('T')[0];
    });
    const dayTotals = weekDays.map((day) => (wk || []).filter((s) => String(s.started_at).startsWith(day)).reduce((sum, r) => sum + Number(r.arx_mined || 0), 0));
    const maxDay = Math.max(...dayTotals, 1);
    setWeekChart(dayTotals.map((v) => Math.max(0.08, v / maxDay)));
    const { data: ledgerRows } = await supabase.from('points_ledger' as any).select('amount,description,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(4);
    setRecentActivity((ledgerRows || []).map((row: any) => ({
      label: row.description, sub: relTime(row.created_at),
      val: `${Number(row.amount) > 0 ? '+' : ''}${Math.round(Number(row.amount)).toLocaleString()}`,
      accent: Number(row.amount) > 0 ? neon.teal : '#ff6b4a',
    })));
  }, [user, preview]);

  const fetchDashBattles = useCallback(async () => {
    if (preview) return;
    const now = Date.now();
    const { data } = await supabase.from('arena_battles').select('id, title, banner_image, side_a_name, side_b_name, side_a_power, side_b_power, starts_at, ends_at, is_active, winner_side').order('created_at', { ascending: false }).limit(10);
    const rows = data || [];
    const live = rows.filter((b) => new Date(b.starts_at).getTime() <= now && new Date(b.ends_at).getTime() > now && !b.winner_side);
    setLiveArenaCount(live.length);
    setDashBattles(live.slice(0, 4));
  }, [preview]);

  useEffect(() => { fetchActivityData(); fetchDashBattles(); }, [fetchActivityData, fetchDashBattles]);
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
    if (preview || !user || !isMining) { if (!preview) setLiveEarn(0); return; }
    const sync = async () => {
      const { data } = await supabase.from('mining_sessions').select('started_at, arx_mined').eq('user_id', user.id).eq('is_active', true).order('started_at', { ascending: false }).limit(1).maybeSingle();
      if (!data) return;
      const elapsed = Math.min(Math.floor((Date.now() - new Date(data.started_at).getTime()) / 1000), 8 * 3600);
      setLiveEarn(Math.max(Number(data.arx_mined || 0), Math.min(480, (elapsed / 3600) * 10)));
    };
    sync();
    const t = setInterval(sync, 5000);
    return () => clearInterval(t);
  }, [user, isMining, preview]);

  const quickActions = [
    { label: 'Mine', icon: <Pickaxe size={22} strokeWidth={2.2} />, color: 'cyan' as const, path: '/mining', badge: isMining || preview ? 'LIVE' : null },
    { label: 'Arena', icon: <Swords size={22} strokeWidth={2.2} />, color: 'gold' as const, path: '/arena', badge: liveArenaCount > 0 ? String(liveArenaCount) : null },
    ...(WORD_FORGE_ENABLED || preview ? [{ label: 'Play', icon: <Zap size={22} strokeWidth={2.2} />, color: 'green' as const, path: '/games', badge: 'NEW' as string | null }] : []),
    { label: 'Tasks', icon: <Target size={22} strokeWidth={2.2} />, color: 'cyan' as const, path: '/tasks', badge: pendingTasks > 0 ? String(pendingTasks) : null },
    { label: 'Refer', icon: <Users size={22} strokeWidth={2.2} />, color: 'gold' as const, path: '/referrals', badge: null },
    { label: 'Nexus', icon: <Send size={22} strokeWidth={2.2} />, color: 'green' as const, path: '/nexus', badge: null },
  ];

  return (
    <NeonPage>
      <motion.div variants={stagger} initial="hidden" animate="show">
        {/* Header */}
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

        {/* Carousel — exact component you liked */}
        <motion.div variants={fadeUp} style={{ padding: '16px 20px 0' }}>
          <DashboardActivityCarousel forceShowWordForge={preview || WORD_FORGE_ENABLED} />
        </motion.div>

        {!preview && <MobileRewardAlerts />}

        {/* Balance panel */}
        <motion.div variants={fadeUp} style={{ padding: '20px 20px 0' }}>
          <GamePanel style={{ paddingTop: 36 }}>
            <RibbonBanner color="cyan">Your Balance</RibbonBanner>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 38, fontWeight: 900, color: neon.text, letterSpacing: '-2px', textShadow: `0 0 24px ${neon.cyanGlow}` }}>
                    {totalPts.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: neon.cyan }}>ARX-P</span>
                </div>
                {userRank && (
                  <p style={{ margin: '6px 0 0', fontSize: 10, fontWeight: 700, color: neon.textMuted }}>
                    Global rank <span style={{ color: neon.gold }}>#{userRank}</span>
                  </p>
                )}
              </div>
              <img src={FORGE_UI.arxCoin} alt="" style={{ width: 72, height: 72, filter: 'drop-shadow(0 0 16px rgba(79,216,235,0.5))' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <NeonChip label="Today" value={`+${Math.round(todayPts).toLocaleString()}`} accent={neon.cyan} />
              <NeonChip label="Week" value={`+${Math.round(weekPts).toLocaleString()}`} accent={neon.teal} />
              <NeonChip label="Streak" value={`${streak}d`} accent={neon.gold} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 32, marginTop: 14 }}>
              {weekChart.map((h, i) => (
                <div key={i} style={{
                  flex: 1, borderRadius: '4px 4px 0 0', height: `${h * 100}%`,
                  background: i === 6 ? `linear-gradient(to top, ${neon.cyan}, ${neon.teal})` : `${neon.cyan}22`,
                  boxShadow: i === 6 ? `0 0 12px ${neon.cyanGlow}` : undefined,
                }} />
              ))}
            </div>
          </GamePanel>
        </motion.div>

        {(isMining || preview) && (
          <motion.div variants={fadeUp} style={{ padding: '14px 20px 0' }}>
            <NeonPanel glow={neon.teal} onClick={() => go('/mining')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: neon.teal, boxShadow: `0 0 12px ${neon.teal}`, animation: 'pulse 1.2s infinite' }} />
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: neon.teal }}>Mining Live</p>
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: neon.textMuted }}>{liveEarn.toFixed(2)} ARX-P earned · tap to manage</p>
                </div>
              </div>
            </NeonPanel>
          </motion.div>
        )}

        {/* Glossy quick actions — new interaction model */}
        <motion.div variants={fadeUp} style={{ padding: '22px 20px 0' }}>
          <NeonSectionTitle title="Command Center" />
          <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6 }} className="scrollbar-none">
            {quickActions.map((a) => (
              <GlossyIconButton key={a.label} label={a.label} caption={a.label} color={a.color} size={64} badge={a.badge} onClick={() => go(a.path)}>
                {a.icon}
              </GlossyIconButton>
            ))}
          </div>
        </motion.div>

        {/* Explore tiles — carousel texture */}
        <motion.div variants={fadeUp} style={{ padding: '8px 0 0' }}>
          <div style={{ padding: '0 20px' }}><NeonSectionTitle title="Explore" /></div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 20px' }} className="scrollbar-none">
            <NeonActionTile title="Word Forge" subtitle="Spell. Stack. Survive." accent={neon.gold} image={FORGE_UI.dashboardBanner} badge="GAME" onClick={() => go('/games')} />
            <NeonActionTile title="Arena Battles" subtitle="Stake & win pools" accent={neon.purple} onClick={() => go('/arena')} badge={liveArenaCount > 0 ? `${liveArenaCount} LIVE` : undefined} />
            <NeonActionTile title="Leaderboard" subtitle="Climb the ranks" accent={neon.gold} onClick={() => go('/leaderboard')} />
            <NeonActionTile title="Wallet" subtitle="Web3 coming soon" accent={neon.cyan} onClick={() => go('/wallet')} badge="SOON" />
          </div>
        </motion.div>

        {/* Live battles */}
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

        {/* Activity */}
        <motion.div variants={fadeUp} style={{ padding: '22px 20px 0' }}>
          <NeonSectionTitle title="Recent Activity" action="History" onAction={() => go('/points-history')} />
          {recentActivity.map((it, i) => (
            <NeonActivityRow key={i} title={it.label} sub={it.sub} value={it.val} accent={it.accent} />
          ))}
        </motion.div>

        {/* Primary CTA */}
        <motion.div variants={fadeUp} style={{ padding: '20px 20px 0' }}>
          <GlossyButton color="gold" size="lg" onClick={() => go('/mining')}>Start Mining Session</GlossyButton>
        </motion.div>

        {preview && (
          <p style={{ textAlign: 'center', padding: '24px 20px', fontSize: 10, color: neon.textMuted, letterSpacing: '0.1em' }}>
            UI PREVIEW · NEON DASHBOARD v3
          </p>
        )}
      </motion.div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </NeonPage>
  );
}
