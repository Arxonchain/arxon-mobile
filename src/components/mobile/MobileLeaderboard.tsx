import { motion } from 'framer-motion';
import { usePoints } from '@/hooks/usePoints';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Crown, Medal, Award, Trophy } from 'lucide-react';

const PERIWINKLE = '#9EB3E0';
const NAVY = '#1E3A5F';

interface LeaderEntry { id: string; username: string; total_points: number; }

export default function MobileLeaderboard() {
  const { points, rank } = usePoints();
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('profiles').select('id, username, total_points')
      .order('total_points', { ascending: false }).limit(50)
      .then(({ data }) => { setLeaders(data || []); setLoading(false); });
  }, []);

  const rankColors = ['#C8963C', '#8892A4', '#A06040'];
  const RankIcons = [Crown, Medal, Award];

  return (
    <div style={{ minHeight: '100vh', background: '#000', fontFamily: "'Creato Display', system-ui, sans-serif", paddingBottom: 90 }}>

      <div style={{ padding: '52px 20px 12px' }}>
        <div style={{ fontSize: 21, fontWeight: 900, color: '#fff', letterSpacing: '-0.4px', marginBottom: 2 }}>Leaderboard</div>
        <div style={{ fontSize: 11, color: 'rgba(238,242,247,0.3)' }}>Top ARX-P miners globally</div>
      </div>

      {/* Your rank — immersive */}
      <div style={{ margin: '0 16px 14px', position: 'relative', borderRadius: 22, overflow: 'hidden', padding: '15px 18px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#0a1e36 0%,#061220 60%,#030c18 100%)' }} />
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 311 72">
          {[[280,12],[30,55],[200,18]].map(([cx,cy],i) => (
            <circle key={i} cx={cx} cy={cy} r={0.8} fill={i===1?'#8BAED6':'white'} opacity={0.5}>
              <animate attributeName="opacity" values="0.5;1;0.5" dur={`${2+i*0.4}s`} repeatCount="indefinite"/>
            </circle>
          ))}
        </svg>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 22, border: '1px solid rgba(139,174,214,0.16)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 13, background: 'rgba(200,150,60,0.1)', border: '1px solid rgba(200,150,60,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={20} color="#C8963C" />
            </div>
            <div>
              <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(168,196,232,0.4)', fontWeight: 600, marginBottom: 2 }}>Your Rank</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>#{rank || '—'}</div>
            </div>
          </div>
          <div style={{ width: 1, height: 36, background: 'rgba(139,174,214,0.1)' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(168,196,232,0.4)', fontWeight: 600, marginBottom: 2 }}>Points</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#8BAED6' }}>{(points || 0).toLocaleString()}</div>
          </div>
          <div style={{ width: 1, height: 36, background: 'rgba(139,174,214,0.1)' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(168,196,232,0.4)', fontWeight: 600, marginBottom: 2 }}>Top</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#5DB08A' }}>Top%</div>
          </div>
        </div>
      </div>

      {/* Podium */}
      {!loading && leaders.length >= 3 && (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, padding: '8px 16px 18px' }}>
          {[leaders[1], leaders[0], leaders[2]].map((entry, podiumIdx) => {
            const actualRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
            const heights = [76, 96, 60];
            const col = rankColors[actualRank - 1];
            const Icon = RankIcons[actualRank - 1];
            return (
              <div key={entry.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: `${col}22`, border: `2px solid ${col}77`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, color: col }}>
                  {entry.username?.[0]?.toUpperCase()}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(238,242,247,0.6)', textAlign: 'center', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.username}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: col }}>{(entry.total_points||0).toLocaleString()}</div>
                <div style={{ width: '100%', height: heights[podiumIdx], borderRadius: '10px 10px 0 0', background: `${col}0d`, border: `1px solid ${col}22`, borderBottom: 'none', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 8 }}>
                  <span style={{ fontSize: 17, fontWeight: 900, color: `${col}99` }}>#{actualRank}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(238,242,247,0.25)', marginBottom: 8, paddingLeft: 4 }}>All Miners</div>
        {leaders.map((entry, idx) => (
          <motion.div key={entry.id}
            initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 14, marginBottom: 6, background: PERIWINKLE, border: '1px solid rgba(255,255,255,0.22)' }}>
            <span style={{ fontSize: 12, fontWeight: 800, width: 22, textAlign: 'center', color: idx < 3 ? rankColors[idx] : 'rgba(30,58,95,0.5)' }}>#{idx + 1}</span>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(30,58,95,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: NAVY, flexShrink: 0 }}>
              {entry.username?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.username}</div>
            <span style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{(entry.total_points||0).toLocaleString()}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
