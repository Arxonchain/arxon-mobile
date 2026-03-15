import { motion } from 'framer-motion';
import { usePoints } from '@/hooks/usePoints';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Trophy } from 'lucide-react';

const BRAND  = '#0c1e38';
const BRAND3 = '#061220';
const STEEL  = '#8BAED6';
const STEEL2 = '#A8C4E8';
const TEXT   = '#EEF2F7';

const anim = `
@keyframes strokeDash{0%{stroke-dashoffset:600}100%{stroke-dashoffset:0}}
@keyframes strokeGlow{0%,100%{opacity:.45;stroke-width:1.5}50%{opacity:1;stroke-width:2.5}}
@keyframes shimmerswipe{0%{left:-120%}65%,100%{left:160%}}
`;

interface LeaderEntry { id: string; username: string; total_points: number; }

function StrokeCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position:'relative', borderRadius:26, overflow:'hidden', background:`linear-gradient(145deg,${BRAND} 0%,#0a1828 50%,${BRAND3} 100%)` }}>
      <style>{anim}</style>
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }} viewBox="0 0 311 80" preserveAspectRatio="none">
        <path d="M 16 2 Q 155 -6 295 2" fill="none" stroke="rgba(139,174,214,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600"
          style={{ animation:'strokeDash 3s ease-in-out infinite alternate, strokeGlow 2.5s ease-in-out infinite' }}/>
        <path d="M 16 78 Q 155 86 295 78" fill="none" stroke="rgba(168,196,232,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600"
          style={{ animation:'strokeDash 3s ease-in-out infinite alternate, strokeGlow 2.5s ease-in-out infinite', animationDelay:'0.5s' }}/>
        <path d="M 2 16 Q -4 40 2 64" fill="none" stroke="rgba(200,228,255,0.2)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="200"
          style={{ animation:'strokeDash 3s ease-in-out infinite alternate, strokeGlow 2.5s ease-in-out infinite', animationDelay:'0.3s' }}/>
        <path d="M 309 16 Q 315 40 309 64" fill="none" stroke="rgba(139,174,214,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="200"
          style={{ animation:'strokeDash 3s ease-in-out infinite alternate, strokeGlow 2.5s ease-in-out infinite', animationDelay:'0.8s' }}/>
      </svg>
      {/* Stars */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }} viewBox="0 0 311 80">
        {[[280,12],[30,55],[200,18]].map(([cx,cy],i)=>(
          <circle key={i} cx={cx} cy={cy} r={0.8} fill={i===1?STEEL:'white'} opacity={0.5}>
            <animate attributeName="opacity" values="0.5;1;0.5" dur={`${2+i*0.4}s`} repeatCount="indefinite"/>
          </circle>
        ))}
      </svg>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(200,228,255,.2),transparent)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', top:0, left:'-120%', width:'50%', height:'100%', background:'linear-gradient(90deg,transparent,rgba(168,196,232,.05),transparent)', animation:'shimmerswipe 5s ease-in-out infinite', pointerEvents:'none' }}/>
      <div style={{ position:'relative', zIndex:5 }}>{children}</div>
    </div>
  );
}

export default function MobileLeaderboard() {
  const { points, rank } = usePoints();
  const [leaders, setLeaders]   = useState<LeaderEntry[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<'global'|'weekly'|'friends'>('global');

  useEffect(() => {
    supabase.from('profiles').select('id, username, total_points')
      .order('total_points', { ascending:false }).limit(50)
      .then(({ data }) => { setLeaders(data||[]); setLoading(false); });
  }, []);

  const rankColors = ['#C8963C','#8892A4','#A06040'];

  return (
    <div style={{ minHeight:'100vh', background:'#000', fontFamily:"'Creato Display', -apple-system, system-ui, sans-serif", paddingBottom:90 }}>

      {/* Header */}
      <div style={{ padding:'52px 20px 12px' }}>
        <div style={{ fontSize:21, fontWeight:900, color:TEXT, letterSpacing:'-.4px', marginBottom:2 }}>Leaderboard</div>
        <div style={{ fontSize:11, color:'rgba(238,242,247,.3)' }}>Top ARX-P miners globally</div>
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex', gap:8, padding:'0 16px 14px' }}>
        {(['global','weekly','friends'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding:'6px 16px', borderRadius:20, fontSize:11, fontWeight:700, border:'none', cursor:'pointer', textTransform:'capitalize', outline:'none',
              background:filter===f?'rgba(139,174,214,.14)':'rgba(139,174,214,.05)',
              color:filter===f?STEEL:'rgba(238,242,247,.35)',
              borderWidth:1, borderStyle:'solid', borderColor:filter===f?'rgba(139,174,214,.3)':'rgba(139,174,214,.1)' }}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      {/* Your rank card — stroke animated */}
      <div style={{ margin:'0 16px 14px' }}>
        <StrokeCard>
          <div style={{ padding:'16px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:40, height:40, borderRadius:13, background:'rgba(200,150,60,.1)', border:'1px solid rgba(200,150,60,.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Trophy size={20} color="#C8963C"/>
              </div>
              <div>
                <div style={{ fontSize:8, textTransform:'uppercase', letterSpacing:'1px', color:'rgba(168,196,232,.4)', fontWeight:600, marginBottom:2 }}>Your Rank</div>
                <div style={{ fontSize:26, fontWeight:900, color:'#fff', letterSpacing:'-.5px', lineHeight:1 }}>#{rank||'—'}</div>
              </div>
            </div>
            <div style={{ width:1, height:36, background:'rgba(139,174,214,.1)' }}/>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:8, textTransform:'uppercase', letterSpacing:'1px', color:'rgba(168,196,232,.4)', fontWeight:600, marginBottom:2 }}>Points</div>
              <div style={{ fontSize:18, fontWeight:800, color:STEEL }}>{(points||0).toLocaleString()}</div>
            </div>
            <div style={{ width:1, height:36, background:'rgba(139,174,214,.1)' }}/>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:8, textTransform:'uppercase', letterSpacing:'1px', color:'rgba(168,196,232,.4)', fontWeight:600, marginBottom:2 }}>Top</div>
              <div style={{ fontSize:18, fontWeight:800, color:'#5DB08A' }}>
                {leaders.length > 0 && rank ? `${((rank/leaders.length)*100).toFixed(1)}%` : '—'}
              </div>
            </div>
          </div>
        </StrokeCard>
      </div>

      {/* Podium */}
      {!loading && leaders.length >= 3 && (
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:8, padding:'8px 16px 18px' }}>
          {[leaders[1], leaders[0], leaders[2]].map((entry, podiumIdx) => {
            const actualRank = podiumIdx===0?2:podiumIdx===1?1:3;
            const heights = [76,96,60];
            const col = rankColors[actualRank-1];
            return (
              <div key={entry.id} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
                <div style={{ width: actualRank===1?48:42, height:actualRank===1?48:42, borderRadius:'50%', background:`${col}22`, border:`2px solid ${col}${actualRank===1?'99':'66'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:actualRank===1?18:16, fontWeight:900, color:col, boxShadow:actualRank===1?`0 0 20px ${col}33`:'none' }}>
                  {entry.username?.[0]?.toUpperCase()}
                </div>
                <div style={{ fontSize:10, fontWeight:600, color:'rgba(238,242,247,.6)', textAlign:'center', maxWidth:72, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{entry.username}</div>
                <div style={{ fontSize:10, fontWeight:700, color:col }}>{(entry.total_points||0).toLocaleString()}</div>
                <div style={{ width:'100%', height:heights[podiumIdx], borderRadius:'10px 10px 0 0', background:`${col}10`, border:`1px solid ${col}25`, borderBottom:'none', display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:8 }}>
                  <span style={{ fontSize:17, fontWeight:900, color:`${col}aa` }}>#{actualRank}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List */}
      <div style={{ padding:'0 0 4px' }}>
        <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'1px', color:'rgba(238,242,247,.25)', marginBottom:8, paddingLeft:20, fontWeight:600 }}>All Miners</div>
      </div>
      <div style={{ padding:'0 16px 20px' }}>
        {leaders.map((entry, idx) => (
          <motion.div key={entry.id}
            initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} transition={{ delay:idx*0.02 }}
            style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:14, marginBottom:6, background:`linear-gradient(145deg,${BRAND},${BRAND3})`, border:`1px solid rgba(139,174,214,${idx<3?'.22':'.1'})` }}>
            <span style={{ fontSize:12, fontWeight:800, width:22, textAlign:'center', color:idx<3?rankColors[idx]:'rgba(139,174,214,.35)', flexShrink:0 }}>#{idx+1}</span>
            <div style={{ width:32, height:32, borderRadius:'50%', background:idx<3?`${rankColors[idx]}22`:'rgba(139,174,214,.08)', border:`1px solid ${idx<3?rankColors[idx]+'55':'rgba(139,174,214,.18)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:idx<3?rankColors[idx]:STEEL, flexShrink:0 }}>
              {entry.username?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex:1, fontSize:13, fontWeight:700, color:STEEL2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{entry.username}</div>
            <span style={{ fontSize:12, fontWeight:700, color:STEEL }}>{(entry.total_points||0).toLocaleString()}</span>
          </motion.div>
        ))}
        {loading && Array.from({length:5}).map((_,i) => (
          <div key={i} style={{ height:54, borderRadius:14, marginBottom:6, background:'rgba(139,174,214,.04)', border:'1px solid rgba(139,174,214,.06)', animation:'pulse 1.5s ease-in-out infinite' }}/>
        ))}
      </div>
    </div>
  );
}
