import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usePoints } from '@/hooks/usePoints';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Crown, Medal } from 'lucide-react';

interface LeaderEntry { id: string; username: string; total_points: number; avatar_url?: string; }

export default function MobileLeaderboard() {
  const navigate = useNavigate();
  const { points, rank } = usePoints();
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('profiles').select('id, username, total_points, avatar_url').order('total_points', { ascending: false }).limit(50)
      .then(({ data }) => { setLeaders(data || []); setLoading(false); });
  }, []);

  const rankColors = ['#FFB800', '#8892A4', '#CD7F32'];
  const rankIcons = [Crown, Medal, Trophy];

  return (
    <div style={{ minHeight: '100vh', background: '#080B14', fontFamily: "'Creato Display', sans-serif", paddingBottom: '90px' }}>
      <div style={{ padding: '52px 20px 20px' }}>
        <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Leaderboard</h1>
        <p style={{ color: '#4A5568', fontSize: '13px', margin: 0 }}>Top ARX-P miners globally</p>
      </div>

      {/* Your rank card */}
      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ borderRadius: '20px', padding: '18px 20px', background: 'linear-gradient(135deg, rgba(0,212,255,0.1), rgba(180,95,255,0.05))', border: '1px solid rgba(0,212,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Trophy size={20} color="#FFB800" />
            <div>
              <p style={{ color: '#4A5568', fontSize: '11px', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Rank</p>
              <p style={{ color: '#fff', fontSize: '22px', fontWeight: 900, margin: 0 }}>#{rank || '—'}</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: '#4A5568', fontSize: '11px', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Points</p>
            <p style={{ color: '#00D4FF', fontSize: '18px', fontWeight: 800, margin: 0 }}>{(points || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Top 3 podium */}
      {!loading && leaders.length >= 3 && (
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
            {[leaders[1], leaders[0], leaders[2]].map((entry, podiumIdx) => {
              const actualRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
              const heights = [80, 100, 70];
              const colors = ['#8892A4', '#FFB800', '#CD7F32'];
              return (
                <div key={entry.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${colors[podiumIdx]}33, ${colors[podiumIdx]}11)`, border: `2px solid ${colors[podiumIdx]}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: colors[podiumIdx], fontWeight: 900, fontSize: '16px' }}>{entry.username[0]?.toUpperCase()}</span>
                  </div>
                  <p style={{ color: '#fff', fontSize: '11px', fontWeight: 700, margin: 0, textAlign: 'center', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.username}</p>
                  <p style={{ color: colors[podiumIdx], fontSize: '11px', fontWeight: 600, margin: 0 }}>{(entry.total_points || 0).toLocaleString()}</p>
                  <div style={{ width: '100%', height: heights[podiumIdx], borderRadius: '12px 12px 0 0', background: `linear-gradient(to top, ${colors[podiumIdx]}22, ${colors[podiumIdx]}08)`, border: `1px solid ${colors[podiumIdx]}22`, borderBottom: 'none', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '8px' }}>
                    <span style={{ color: colors[podiumIdx], fontWeight: 900, fontSize: '18px' }}>#{actualRank}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full list */}
      <div style={{ padding: '0 20px' }}>
        <p style={{ color: '#4A5568', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>All Miners</p>
        {leaders.map((entry, idx) => (
          <motion.div key={entry.id}
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '14px', marginBottom: '6px', background: idx < 3 ? `rgba(${idx === 0 ? '255,184,0' : idx === 1 ? '136,146,164' : '205,127,50'},0.05)` : 'rgba(255,255,255,0.02)', border: `1px solid ${idx < 3 ? `rgba(${idx === 0 ? '255,184,0' : idx === 1 ? '136,146,164' : '205,127,50'},0.15)` : 'rgba(255,255,255,0.04)'}` }}>
            <span style={{ color: idx < 3 ? rankColors[idx] : '#2D3748', fontSize: '13px', fontWeight: 800, width: 24, textAlign: 'center' }}>#{idx + 1}</span>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#8892A4', fontWeight: 700, fontSize: '13px' }}>{entry.username[0]?.toUpperCase()}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: '#fff', fontSize: '14px', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.username}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: '#00D4FF', fontSize: '13px', fontWeight: 700 }}>{(entry.total_points || 0).toLocaleString()}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
