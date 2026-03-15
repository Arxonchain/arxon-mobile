// v2.0 - Mobile UI Redesign: periwinkle nav, immersive space cards, crystal gem
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { useMiningStatus } from '@/hooks/useMiningStatus';
import { Bell, Pickaxe, Swords, Trophy, Send, Target, Users, ChevronRight, Flame, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const PERIWINKLE = '#9EB3E0';
const NAVY = '#1E3A5F';
const NAVY_MID = '#2A4A6C';

export default function MobileDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { points, rank } = usePoints();
  const { profile } = useProfile();
  const { isMining } = useMiningStatus();
  const [activityData, setActivityData] = useState<{ day: string; points: number }[]>([]);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const [todaySess, weeklySess, dailyData] = await Promise.all([
        supabase.from('mining_sessions').select('arx_mined').eq('user_id', user.id).gte('started_at', today),
        supabase.from('mining_sessions').select('arx_mined').eq('user_id', user.id).gte('started_at', weekAgo),
        supabase.from('mining_sessions').select('arx_mined, started_at').eq('user_id', user.id).gte('started_at', weekAgo).order('started_at', { ascending: true }),
      ]);
      setTodayEarnings(todaySess.data?.reduce((s, r) => s + Number(r.arx_mined || 0), 0) || 0);
      setWeeklyEarnings(weeklySess.data?.reduce((s, r) => s + Number(r.arx_mined || 0), 0) || 0);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const totals: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        totals[d.toISOString().split('T')[0]] = 0;
      }
      dailyData.data?.forEach(s => {
        const k = s.started_at.split('T')[0];
        if (totals[k] !== undefined) totals[k] += Number(s.arx_mined || 0);
      });
      setActivityData(Object.entries(totals).map(([date, pts]) => ({ day: dayNames[new Date(date).getDay()], points: pts })));
    };
    fetch();
  }, [user]);

  const username = profile?.username || user?.email?.split('@')[0] || 'Miner';

  const quickActions = [
    { icon: Pickaxe, label: 'Mine', path: '/mining' },
    { icon: Swords, label: 'Arena', path: '/arena' },
    { icon: Trophy, label: 'Ranks', path: '/leaderboard' },
    { icon: Send, label: 'Nexus', path: '/nexus' },
  ];

  const bottomCards = [
    { icon: Target, label: 'Tasks', sub: '5/5 done · 260 ARX-P', path: '/tasks' },
    { icon: Users, label: 'Referrals', sub: '+100 ARX-P each', path: '/referrals' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: "'Creato Display', system-ui, sans-serif", paddingBottom: 90 }}>

      {/* Header */}
      <div style={{ padding: '52px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(238,242,247,0.4)', fontWeight: 500, letterSpacing: '0.06em', marginBottom: 2 }}>Welcome back</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.4px' }}>{username}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate('/notifications')}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(158,179,224,0.08)', border: '1px solid rgba(158,179,224,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Bell size={16} color="rgba(158,179,224,0.7)" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate('/profile')}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#2a3a5c,#8BAED6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 14 }}>{username[0]?.toUpperCase()}</span>
          </motion.button>
        </div>
      </div>

      {/* Hero balance card — immersive space */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ margin: '0 16px 14px', position: 'relative', borderRadius: 28, overflow: 'hidden', minHeight: 210 }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg,#0c2340 0%,#0a1c33 38%,#061428 65%,#040e1e 100%)' }} />
        {/* Twinkling stars */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 343 210">
          {[[28,18],[95,30],[175,14],[258,24],[316,38],[44,52],[140,46],[300,12]].map(([cx,cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={0.7+i*0.06} fill={i%3===0?'#A8C4E8':'white'} opacity={0.5}>
              <animate attributeName="opacity" values={`${0.3+i*0.05};1;${0.3+i*0.05}`} dur={`${1.5+i*0.3}s`} repeatCount="indefinite"/>
            </circle>
          ))}
        </svg>
        {/* Atmosphere orbs */}
        <div style={{ position: 'absolute', top: -40, right: -20, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(100,160,230,0.13) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -10, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle,rgba(80,130,200,0.09) 0%,transparent 70%)', pointerEvents: 'none' }} />
        {/* Border */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 28, border: '1px solid rgba(139,174,214,0.18)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(200,228,255,0.25),transparent)', pointerEvents: 'none' }} />

        {/* Two-column content */}
        <div style={{ position: 'relative', zIndex: 5, padding: '18px 16px 16px', display: 'flex', gap: 0, alignItems: 'stretch' }}>
          {/* Left: text */}
          <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '1.4px', color: 'rgba(168,196,232,0.45)', fontWeight: 600 }}>Total Balance</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(139,174,214,0.1)', border: '1px solid rgba(139,174,214,0.22)', borderRadius: 20, padding: '3px 9px' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#8BAED6' }} />
                <span style={{ color: '#A8C4E8', fontSize: 10, fontWeight: 700 }}>Rank #{rank || '—'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 2 }}>
              <span style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-1.8px', color: '#fff', lineHeight: 1 }}>{(points || 0).toLocaleString()}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#8BAED6', marginLeft: 6 }}>ARX-P</span>
            </div>
            <div style={{ fontSize: 9, color: 'rgba(139,174,214,0.35)', marginBottom: 14 }}>Your total mining rewards</div>
            <div style={{ display: 'flex', gap: 0, marginBottom: 12 }}>
              {[
                { label: 'Today', value: `+${todayEarnings.toLocaleString()}`, color: '#EEF2F7' },
                { label: 'This Week', value: `+${weeklyEarnings.toLocaleString()}`, color: '#8BAED6' },
                { label: 'Streak', value: `🔥 ${profile?.streak_days || 0}d`, color: '#d4884a' },
              ].map((stat, i) => (
                <div key={i} style={{ flex: 1, paddingLeft: i > 0 ? 10 : 0, borderLeft: i > 0 ? '1px solid rgba(139,174,214,0.08)' : 'none' }}>
                  <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.9px', color: 'rgba(168,196,232,0.38)', fontWeight: 600, marginBottom: 2 }}>{stat.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>
            {/* Mini chart */}
            {activityData.length > 0 && (
              <div style={{ height: 34 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData}>
                    <defs>
                      <linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8BAED6" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#8BAED6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="points" stroke="#8BAED6" strokeWidth={2} fill="url(#mg)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          {/* Right: floating crystal */}
          <div style={{ width: 100, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ animation: 'gemfloat 4s ease-in-out infinite' }}>
              <svg width="68" height="74" viewBox="0 0 72 80" fill="none">
                <defs>
                  <linearGradient id="cg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#C8E4FF"/><stop offset="100%" stopColor="#5A9ED6"/></linearGradient>
                  <linearGradient id="cg2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#4A8BC4"/><stop offset="100%" stopColor="#2A5A8C"/></linearGradient>
                  <linearGradient id="cg3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8BBDE8"/><stop offset="100%" stopColor="#1A3A6C"/></linearGradient>
                </defs>
                <polygon points="36,4 58,24 36,32" fill="url(#cg1)" opacity={0.95}/>
                <polygon points="36,4 14,24 36,32" fill="url(#cg2)" opacity={0.85}/>
                <polygon points="58,24 36,32 58,52" fill="url(#cg3)" opacity={0.8}/>
                <polygon points="14,24 36,32 14,52" fill="#1A4A7C" opacity={0.88}/>
                <polygon points="36,32 58,52 36,74" fill="url(#cg2)" opacity={0.7}/>
                <polygon points="36,32 14,52 36,74" fill="#0D2A4A" opacity={0.9}/>
                <ellipse cx="30" cy="18" rx="5" ry="3" fill="white" opacity={0.3} transform="rotate(-15 30 18)"/>
                <text x="36" y="48" textAnchor="middle" fontSize="13" fontWeight="900" fill="rgba(255,255,255,0.88)" fontFamily="system-ui">A</text>
              </svg>
            </div>
            <style>{`@keyframes gemfloat{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-8px) rotate(3deg)}}`}</style>
          </div>
        </div>
      </motion.div>

      {/* Mining active banner */}
      {isMining && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          onClick={() => navigate('/mining')}
          style={{ margin: '0 16px 12px', background: 'rgba(158,179,224,0.08)', border: '1px solid rgba(158,179,224,0.2)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#8BAED6' }} />
            <span style={{ color: '#8BAED6', fontSize: 13, fontWeight: 700 }}>Mining Active</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(238,242,247,0.3)', fontSize: 12 }}>
            View session <ChevronRight size={14} />
          </div>
        </motion.div>
      )}

      {/* Quick Actions — periwinkle cards */}
      <div style={{ padding: '8px 20px 6px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'rgba(238,242,247,0.25)', fontWeight: 600 }}>Quick Access</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, padding: '0 16px 16px' }}>
        {quickActions.map((action, i) => (
          <motion.button key={action.label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            whileTap={{ scale: 0.88 }} onClick={() => navigate(action.path)}
            style={{ background: PERIWINKLE, border: '1px solid rgba(255,255,255,0.25)', borderRadius: 18, padding: '14px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
            <action.icon size={21} color={NAVY} strokeWidth={2} />
            <span style={{ fontSize: 10, fontWeight: 700, color: NAVY_MID }}>{action.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Bottom cards — periwinkle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px 16px' }}>
        {bottomCards.map((card) => (
          <motion.div key={card.label} whileTap={{ scale: 0.96 }} onClick={() => navigate(card.path)}
            style={{ background: PERIWINKLE, border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, padding: 16, cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <card.icon size={18} color={NAVY} />
              <ChevronRight size={14} color={NAVY_MID} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: NAVY, marginBottom: 2 }}>{card.label}</div>
            <div style={{ fontSize: 10, color: NAVY_MID }}>{card.sub}</div>
          </motion.div>
        ))}
      </div>

    </div>
  );
}
