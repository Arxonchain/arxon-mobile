import { motion } from 'framer-motion';
import { usePoints } from '@/hooks/usePoints';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LeaderEntry { user_id: string; username: string | null; total_points: number; }

const CSS = `
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes shimmer{0%{left:-100%}100%{left:200%}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes spin{to{transform:rotate(360deg)}}
`;

const TIER = [
  { col:'#FFD700', bg:'rgba(255,215,0,.12)', bd:'rgba(255,215,0,.28)', glow:'rgba(255,215,0,.3)', label:'Gold' },
  { col:'#C0C0C0', bg:'rgba(192,192,192,.1)',  bd:'rgba(192,192,192,.22)', glow:'rgba(192,192,192,.2)', label:'Silver' },
  { col:'#CD7F32', bg:'rgba(205,127,50,.1)',   bd:'rgba(205,127,50,.22)', glow:'rgba(205,127,50,.2)', label:'Bronze' },
];

export default function MobileLeaderboard() {
  const { user }         = useAuth();
  const { points, rank } = usePoints();
  const [leaders,  setLeaders]  = useState<LeaderEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<'global'|'weekly'|'friends'>('global');

  useEffect(() => {
    // Query user_points joined with profiles — this is the correct table for points data
    supabase
      .from('user_points')
      .select('user_id, total_points')
      .order('total_points', { ascending: false })
      .limit(100)
      .then(async ({ data: pts, error }) => {
        if (error) { console.error('leaderboard error:', error); setLoading(false); return; }
        if (!pts?.length) { setLoading(false); return; }

        // Fetch usernames for all user_ids
        const ids = pts.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', ids);

        const nameMap = new Map((profiles || []).map(p => [p.user_id, p.username]));
        const merged: LeaderEntry[] = pts.map(p => ({
          user_id: p.user_id,
          username: nameMap.get(p.user_id) || null,
          total_points: Math.round(Number(p.total_points) || 0),
        }));
        setLeaders(merged);
        setLoading(false);
      });
  }, [filter]);

  const totalPoints = Math.round(points?.total_points ?? 0);
  const userRank    = rank ?? null;
  const topPct      = leaders.length > 0 && userRank
    ? ((userRank / leaders.length) * 100).toFixed(1) : null;
  const top3 = leaders.slice(0, 3);

  return (
    <div style={{ minHeight:'100vh', background:'#000', fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif", paddingBottom:100 }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ padding:'52px 24px 0' }}>
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}>
          <div style={{ fontSize:28, fontWeight:900, color:'#EEF2F7', letterSpacing:'-.6px' }}>Leaderboard</div>
          <div style={{ fontSize:13, color:'rgba(139,174,214,.4)', marginTop:4, fontWeight:500 }}>Top ARX-P miners globally</div>
        </motion.div>
      </div>

      {/* Filter pills */}
      <div style={{ display:'flex', gap:8, padding:'20px 24px 0' }}>
        {(['global','weekly','friends'] as const).map((f,i) => (
          <motion.button key={f} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.05 }}
            onClick={() => setFilter(f)}
            style={{ padding:'8px 20px', borderRadius:24, fontSize:12, fontWeight:700, border:'none', cursor:'pointer',
              textTransform:'capitalize', outline:'none', transition:'all .2s',
              background: filter===f ? 'rgba(139,174,214,.18)' : 'rgba(139,174,214,.06)',
              color: filter===f ? '#8BAED6' : 'rgba(139,174,214,.4)',
              boxShadow: filter===f ? 'inset 0 1px 0 rgba(139,174,214,.15), 0 0 12px rgba(139,174,214,.1)' : 'none',
              borderWidth:1, borderStyle:'solid',
              borderColor: filter===f ? 'rgba(139,174,214,.3)' : 'rgba(139,174,214,.08)' }}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </motion.button>
        ))}
      </div>

      {/* Your rank card */}
      <div style={{ margin:'20px 24px 0', position:'relative', borderRadius:20, overflow:'hidden',
        background:'linear-gradient(135deg,#0c2340,#0a1828,#061220)' }}>
        {/* Shimmer */}
        <div style={{ position:'absolute', top:0, left:'-100%', width:'60%', height:'100%',
          background:'linear-gradient(90deg,transparent,rgba(139,174,214,.06),transparent)',
          animation:'shimmer 4s ease-in-out infinite', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
          background:'linear-gradient(90deg,transparent,rgba(200,228,255,.15),transparent)', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', inset:0, borderRadius:20, border:'1px solid rgba(139,174,214,.15)', pointerEvents:'none' }}/>
        <div style={{ position:'relative', zIndex:2, padding:'20px', display:'grid', gridTemplateColumns:'1fr 1px 1fr 1px 1fr', alignItems:'center' }}>
          {/* Rank */}
          <div style={{ textAlign:'center' }}>
            <div style={{ width:44, height:44, borderRadius:14, background:'rgba(200,150,60,.1)', border:'1px solid rgba(200,150,60,.25)',
              display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8963C" strokeWidth="1.8">
                <path d="M12 2l2.5 7h7l-5.5 4 2 7L12 16l-6 4 2-7L2 9h7z"/>
              </svg>
            </div>
            <div style={{ fontSize:8, textTransform:'uppercase', letterSpacing:'1px', color:'rgba(168,196,232,.4)', fontWeight:600, marginBottom:3 }}>Your Rank</div>
            <div style={{ fontSize:26, fontWeight:900, color:'#fff', lineHeight:1 }}>#{userRank||'—'}</div>
          </div>
          {/* Divider */}
          <div style={{ background:'rgba(139,174,214,.1)', height:40 }}/>
          {/* Points */}
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:8, textTransform:'uppercase', letterSpacing:'1px', color:'rgba(168,196,232,.4)', fontWeight:600, marginBottom:6 }}>Points</div>
            <div style={{ fontSize:20, fontWeight:800, color:'#8BAED6' }}>{totalPoints.toLocaleString()}</div>
          </div>
          {/* Divider */}
          <div style={{ background:'rgba(139,174,214,.1)', height:40 }}/>
          {/* Top % */}
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:8, textTransform:'uppercase', letterSpacing:'1px', color:'rgba(168,196,232,.4)', fontWeight:600, marginBottom:6 }}>Top</div>
            <div style={{ fontSize:20, fontWeight:800, color:'#5DB08A' }}>{topPct ? `${topPct}%` : '—'}</div>
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      {!loading && top3.length >= 3 && (
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
          style={{ padding:'28px 24px 0' }}>
          <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'1.2px', color:'rgba(139,174,214,.3)', fontWeight:700, marginBottom:16 }}>Top 3</div>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:10 }}>
            {[top3[1], top3[0], top3[2]].map((entry, idx) => {
              const actualRank = idx===0?2:idx===1?1:3;
              const heights = [82,106,66];
              const t = TIER[actualRank-1];
              return (
                <div key={entry.user_id} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                  {/* Avatar */}
                  <div style={{ width:actualRank===1?54:46, height:actualRank===1?54:46, borderRadius:'50%',
                    background:t.bg, border:`2px solid ${t.bd}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:actualRank===1?22:17, fontWeight:900, color:t.col,
                    boxShadow:actualRank===1?`0 0 24px ${t.glow}`:'none',
                    animation:actualRank===1?'float 3s ease-in-out infinite':'none' }}>
                    {entry.username?.[0]?.toUpperCase()||'?'}
                  </div>
                  <div style={{ fontSize:11, fontWeight:700, color:'rgba(238,242,247,.7)', textAlign:'center',
                    maxWidth:72, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {entry.username||'Miner'}
                  </div>
                  <div style={{ fontSize:10, fontWeight:700, color:t.col }}>
                    {entry.total_points.toLocaleString()}
                  </div>
                  {/* Platform */}
                  <div style={{ width:'100%', height:heights[idx], borderRadius:'14px 14px 0 0',
                    background:t.bg, border:`1px solid ${t.bd}`, borderBottom:'none',
                    display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:12 }}>
                    <span style={{ fontSize:actualRank===1?24:18, fontWeight:900, color:`${t.col}cc` }}>#{actualRank}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* List */}
      <div style={{ padding:'28px 24px 0' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'1.2px', color:'rgba(139,174,214,.3)', fontWeight:700 }}>All Miners</div>
          <div style={{ fontSize:11, color:'rgba(139,174,214,.3)', fontWeight:600 }}>
            {loading ? 'Loading...' : `Top ${leaders.length}`}
          </div>
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {Array.from({length:8}).map((_,i) => (
              <div key={i} style={{ height:60, borderRadius:16, background:'rgba(139,174,214,.04)',
                border:'1px solid rgba(139,174,214,.06)', animation:'pulse 1.5s ease-in-out infinite',
                animationDelay:`${i*0.1}s` }}/>
            ))}
          </div>
        ) : leaders.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🏆</div>
            <div style={{ fontSize:15, fontWeight:700, color:'rgba(139,174,214,.5)' }}>No miners yet</div>
            <div style={{ fontSize:12, color:'rgba(139,174,214,.3)', marginTop:6 }}>Be the first to mine!</div>
          </div>
        ) : leaders.map((entry, idx) => {
          const isTop3 = idx < 3;
          const t = isTop3 ? TIER[idx] : null;
          const isMe = entry.user_id === user?.id;
          return (
            <motion.div key={entry.user_id}
              initial={{ opacity:0, x:-10 }}
              animate={{ opacity:1, x:0 }}
              transition={{ delay: Math.min(idx * 0.012, 0.6) }}
              style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:16, marginBottom:8,
                background: isMe ? 'linear-gradient(135deg,rgba(139,174,214,.12),rgba(139,174,214,.06))' : isTop3 ? t!.bg : '#0d1117',
                border: `1px solid ${isMe ? 'rgba(139,174,214,.3)' : isTop3 ? t!.bd : 'rgba(139,174,214,.07)'}`,
                boxShadow: isMe ? '0 0 0 1px rgba(139,174,214,.1)' : 'none',
              }}>
              {/* Rank */}
              <div style={{ width:30, height:30, borderRadius:10,
                background: isTop3 ? t!.bg : 'rgba(139,174,214,.06)',
                border:`1px solid ${isTop3 ? t!.bd : 'rgba(139,174,214,.1)'}`,
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <span style={{ fontSize:11, fontWeight:800, color: isTop3 ? t!.col : 'rgba(139,174,214,.5)' }}>
                  {isTop3 ? ['🥇','🥈','🥉'][idx] : idx+1}
                </span>
              </div>
              {/* Avatar */}
              <div style={{ width:36, height:36, borderRadius:12,
                background: isTop3 ? t!.bg : 'rgba(139,174,214,.08)',
                border:`1px solid ${isTop3 ? t!.bd : 'rgba(139,174,214,.15)'}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:14, fontWeight:700,
                color: isTop3 ? t!.col : isMe ? '#8BAED6' : 'rgba(139,174,214,.6)',
                flexShrink:0 }}>
                {entry.username?.[0]?.toUpperCase()||'?'}
              </div>
              {/* Name */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700,
                  color: isMe ? '#EEF2F7' : 'rgba(238,242,247,.85)',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {entry.username||'Miner'}
                  {isMe && <span style={{ marginLeft:6, fontSize:9, background:'rgba(139,174,214,.15)', border:'1px solid rgba(139,174,214,.25)', borderRadius:8, padding:'1px 6px', color:'#8BAED6', fontWeight:700 }}>YOU</span>}
                </div>
              </div>
              {/* Points */}
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:13, fontWeight:800, color: isTop3 ? t!.col : isMe ? '#8BAED6' : 'rgba(238,242,247,.7)' }}>
                  {entry.total_points.toLocaleString()}
                </div>
                <div style={{ fontSize:9, color:'rgba(139,174,214,.3)', marginTop:1 }}>ARX-P</div>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div style={{ height:20 }}/>
    </div>
  );
}
