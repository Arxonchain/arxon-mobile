import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { useMiningStatus } from '@/hooks/useMiningStatus';
import { Zap, TrendingUp, Trophy, Send, Swords, Pickaxe, Sparkles, Bell, ChevronRight, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export default function MobileDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { points, rank } = usePoints();
  const { profile } = useProfile();
  const { isMining } = useMiningStatus();
  const [activityData, setActivityData] = useState<{day: string; points: number}[]>([]);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [weeklyEarnings, setWeeklyEarnings] = useState({ current: 0, previous: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const [todaySess, weeklySess, dailyData] = await Promise.all([
        supabase.from('mining_sessions').select('arx_mined').eq('user_id', user.id).gte('started_at', today),
        supabase.from('mining_sessions').select('arx_mined').eq('user_id', user.id).gte('started_at', weekAgo),
        supabase.from('mining_sessions').select('arx_mined, started_at').eq('user_id', user.id).gte('started_at', weekAgo).order('started_at', { ascending: true })
      ]);
      setTodayEarnings(todaySess.data?.reduce((s, r) => s + Number(r.arx_mined || 0), 0) || 0);
      setWeeklyEarnings({ current: weeklySess.data?.reduce((s, r) => s + Number(r.arx_mined || 0), 0) || 0, previous: 0 });
      
      const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const dailyTotals: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        dailyTotals[d.toISOString().split('T')[0]] = 0;
      }
      dailyData.data?.forEach(s => {
        const key = s.started_at.split('T')[0];
        if (dailyTotals[key] !== undefined) dailyTotals[key] += Number(s.arx_mined || 0);
      });
      setActivityData(Object.entries(dailyTotals).map(([date, pts]) => ({
        day: dayNames[new Date(date).getDay()], points: pts
      })));
    };
    fetchData();
  }, [user]);

  const username = profile?.username || user?.email?.split('@')[0] || 'Miner';
  const weeklyChange = weeklyEarnings.previous > 0 
    ? ((weeklyEarnings.current - weeklyEarnings.previous) / weeklyEarnings.previous * 100).toFixed(1)
    : '+0.0';

  const quickActions = [
    { icon: Pickaxe, label: 'Mine', path: '/mining', color: '#00D4FF', bg: 'rgba(0,212,255,0.1)' },
    { icon: Swords, label: 'Arena', path: '/arena', color: '#B45FFF', bg: 'rgba(180,95,255,0.1)' },
    { icon: Trophy, label: 'Ranks', path: '/leaderboard', color: '#FFB800', bg: 'rgba(255,184,0,0.1)' },
    { icon: Send, label: 'Nexus', path: '/nexus', color: '#00E5A0', bg: 'rgba(0,229,160,0.1)' },
  ];

  return (
    <div style={{ 
      minHeight: '100vh', background: '#080B14', 
      fontFamily: "'Creato Display', sans-serif",
      paddingBottom: '90px', overflowX: 'hidden'
    }}>
      {/* Top Header */}
      <div style={{ 
        padding: '52px 20px 16px', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          <p style={{ color: '#4A5568', fontSize: '12px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Welcome back</p>
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: 800, margin: '2px 0 0', letterSpacing: '-0.02em' }}>{username}</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => navigate('/notifications')}
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Bell size={18} color="#8892A4" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => navigate('/profile')}
            style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #00D4FF, #B45FFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '15px' }}>{username[0]?.toUpperCase()}</span>
          </motion.button>
        </div>
      </div>

      {/* Balance Hero Card */}
      <div style={{ padding: '0 20px 20px' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ 
            borderRadius: '24px', padding: '24px',
            background: 'linear-gradient(135deg, rgba(0,212,255,0.12) 0%, rgba(180,95,255,0.08) 50%, rgba(8,11,20,0) 100%)',
            border: '1px solid rgba(0,212,255,0.15)',
            position: 'relative', overflow: 'hidden'
          }}>
          {/* Glow */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
            <p style={{ color: '#4A5568', fontSize: '12px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Total Balance</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: '20px', padding: '3px 10px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E5A0' }} />
              <span style={{ color: '#00E5A0', fontSize: '11px', fontWeight: 600 }}>Rank #{rank || '—'}</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '8px 0 4px' }}>
            <span style={{ color: '#fff', fontSize: '36px', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {(points || 0).toLocaleString()}
            </span>
            <span style={{ color: '#00D4FF', fontSize: '16px', fontWeight: 700 }}>ARX-P</span>
          </div>

          <div style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
            <div>
              <p style={{ color: '#4A5568', fontSize: '11px', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Today</p>
              <p style={{ color: '#fff', fontSize: '14px', fontWeight: 700, margin: 0 }}>+{todayEarnings.toLocaleString()}</p>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
            <div>
              <p style={{ color: '#4A5568', fontSize: '11px', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>This Week</p>
              <p style={{ color: '#00E5A0', fontSize: '14px', fontWeight: 700, margin: 0 }}>+{weeklyEarnings.current.toLocaleString()}</p>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.06)' }} />
            <div>
              <p style={{ color: '#4A5568', fontSize: '11px', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Streak</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Flame size={12} color="#FF6B35" />
                <p style={{ color: '#FF6B35', fontSize: '14px', fontWeight: 700, margin: 0 }}>{profile?.streak_days || 0}d</p>
              </div>
            </div>
          </div>

          {/* Mini chart */}
          {activityData.length > 0 && (
            <div style={{ marginTop: '16px', height: 48 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient id="mobileGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00D4FF" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#00D4FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="points" stroke="#00D4FF" strokeWidth={2} fill="url(#mobileGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      </div>

      {/* Mining Status Banner */}
      {isMining && (
        <div style={{ padding: '0 20px 16px' }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => navigate('/mining')}
            style={{ 
              borderRadius: '16px', padding: '14px 18px',
              background: 'linear-gradient(90deg, rgba(0,229,160,0.12), rgba(0,229,160,0.05))',
              border: '1px solid rgba(0,229,160,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00E5A0', boxShadow: '0 0 8px #00E5A0' }} />
              <span style={{ color: '#00E5A0', fontSize: '14px', fontWeight: 700 }}>Mining Active</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#4A5568', fontSize: '13px' }}>View session</span>
              <ChevronRight size={14} color="#4A5568" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ padding: '0 20px 24px' }}>
        <p style={{ color: '#4A5568', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>Quick Access</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
          {quickActions.map((action, i) => (
            <motion.button key={action.label}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              whileTap={{ scale: 0.88 }} onClick={() => navigate(action.path)}
              style={{ 
                borderRadius: '18px', padding: '16px 8px',
                background: action.bg, border: `1px solid ${action.color}22`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                cursor: 'pointer'
              }}>
              <action.icon size={22} color={action.color} />
              <span style={{ color: '#8892A4', fontSize: '11px', fontWeight: 600 }}>{action.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ padding: '0 20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { label: 'Tasks', value: 'Complete', sub: 'Earn ARX-P', path: '/tasks', color: '#FFB800', icon: Sparkles },
            { label: 'Referrals', value: 'Invite', sub: '100 ARX-P each', path: '/referrals', color: '#00D4FF', icon: TrendingUp },
          ].map((item) => (
            <motion.div key={item.label} whileTap={{ scale: 0.96 }} onClick={() => navigate(item.path)}
              style={{ 
                borderRadius: '20px', padding: '18px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                cursor: 'pointer'
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <item.icon size={18} color={item.color} />
                <ChevronRight size={14} color="#2D3748" />
              </div>
              <p style={{ color: '#fff', fontSize: '16px', fontWeight: 800, margin: '0 0 2px' }}>{item.value}</p>
              <p style={{ color: '#4A5568', fontSize: '12px', margin: 0 }}>{item.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
