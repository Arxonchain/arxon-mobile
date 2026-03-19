import { motion } from 'framer-motion';
import { usePoints } from '@/hooks/usePoints';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderEntry { id: string; username: string; total_points: number; }

const CSS = `
@keyframes strokeDash{0%{stroke-dashoffset:600}100%{stroke-dashoffset:0}}
@keyframes strokeGlow{0%,100%{opacity:.4;stroke-width:1.5}50%{opacity:1;stroke-width:2.5}}
@keyframes shimmerswipe{0%{left:-120%}65%,100%{left:160%}}
@keyframes slideIn{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:translateX(0)}}
`;

const MEDAL_COLORS = ['#FFD700','#C0C0C0','#CD7F32'];
const MEDAL_BG     = ['rgba(255,215,0,.12)','rgba(192,192,192,.1)','rgba(205,127,50,.1)'];
const MEDAL_BORDER = ['rgba(255,215,0,.3)','rgba(192,192,192,.25)','rgba(205,127,50,.25)'];

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) return (
    <div style={{width:28,height:28,borderRadius:'50%',background:MEDAL_BG[rank-1],border:`1.5px solid ${MEDAL_BORDER[rank-1]}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
      <span style={{fontSize:12,fontWeight:900,color:MEDAL_COLORS[rank-1]}}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
      </span>
    </div>
  );
  return (
    <div style={{width:28,height:28,borderRadius:'50%',background:'rgba(139,174,214,.06)',border:'1px solid rgba(139,174,214,.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
      <span style={{fontSize:10,fontWeight:700,color:'rgba(139,174,214,.5)'}}>{rank}</span>
    </div>
  );
}

export default function MobileLeaderboard() {
  const { points, rank } = usePoints();
  const [leaders,  setLeaders]  = useState<LeaderEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<'global'|'weekly'|'friends'>('global');

  useEffect(() => {
    supabase.from('profiles')
      .select('id, username, total_points')
      .order('total_points', { ascending: false })
      .limit(100)
      .then(({ data }) => { setLeaders(data || []); setLoading(false); });
  }, []);

  const totalPoints = Math.round(points?.total_points ?? 0);
  const userRank    = rank ?? null;
  const topPct      = leaders.length > 0 && userRank ? ((userRank / leaders.length) * 100).toFixed(1) : null;

  const top3 = leaders.slice(0, 3);

  return (
    <div style={{minHeight:'100vh',background:'#000',fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif",paddingBottom:90}}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{padding:'52px 20px 16px'}}>
        <div style={{fontSize:26,fontWeight:900,color:'#EEF2F7',letterSpacing:'-.5px'}}>Leaderboard</div>
        <div style={{fontSize:12,color:'rgba(139,174,214,.45)',marginTop:4}}>Top ARX-P miners globally</div>
      </div>

      {/* Filter tabs */}
      <div style={{display:'flex',gap:8,padding:'0 16px 16px'}}>
        {(['global','weekly','friends'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{padding:'7px 18px',borderRadius:22,fontSize:12,fontWeight:700,border:'none',cursor:'pointer',
              textTransform:'capitalize',outline:'none',transition:'all .2s',
              background:filter===f?'rgba(139,174,214,.18)':'rgba(139,174,214,.06)',
              color:filter===f?'#8BAED6':'rgba(139,174,214,.4)',
              boxShadow:filter===f?'inset 0 1px 0 rgba(139,174,214,.15)':'none',
              borderWidth:1,borderStyle:'solid',
              borderColor:filter===f?'rgba(139,174,214,.3)':'rgba(139,174,214,.08)'}}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      {/* Your rank card */}
      <div style={{margin:'0 16px 16px',position:'relative',borderRadius:22,overflow:'hidden',
        background:'linear-gradient(135deg,#0c2340 0%,#0a1828 50%,#061220 100%)'}}>
        <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}} viewBox="0 0 311 80" preserveAspectRatio="none">
          <path d="M 16 2 Q 155 -6 295 2" fill="none" stroke="rgba(139,174,214,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600" style={{animation:'strokeDash 3s ease-in-out infinite alternate,strokeGlow 2.5s ease-in-out infinite'}}/>
          <path d="M 16 78 Q 155 86 295 78" fill="none" stroke="rgba(168,196,232,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600" style={{animation:'strokeDash 3s ease-in-out infinite alternate,strokeGlow 2.5s ease-in-out infinite',animationDelay:'.5s'}}/>
        </svg>
        <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}} viewBox="0 0 311 80">
          <circle cx="280" cy="12" r=".8" fill="white" opacity=".5"><animate attributeName="opacity" values=".5;1;.5" dur="2.1s" repeatCount="indefinite"/></circle>
          <circle cx="30" cy="55" r=".7" fill="#8BAED6" opacity=".4"><animate attributeName="opacity" values=".4;.9;.4" dur="1.8s" repeatCount="indefinite"/></circle>
        </svg>
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(200,228,255,.2),transparent)',pointerEvents:'none'}}/>
        <div style={{position:'relative',zIndex:5,padding:'16px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:44,height:44,borderRadius:14,background:'rgba(200,150,60,.1)',border:'1px solid rgba(200,150,60,.25)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C8963C" strokeWidth="1.8"><path d="M12 2l2.5 7h7l-5.5 4 2 7L12 16l-6 4 2-7L2 9h7z"/></svg>
            </div>
            <div>
              <div style={{fontSize:8,textTransform:'uppercase',letterSpacing:'1px',color:'rgba(168,196,232,.4)',fontWeight:600,marginBottom:3}}>Your Rank</div>
              <div style={{fontSize:28,fontWeight:900,color:'#fff',letterSpacing:'-.5px',lineHeight:1}}>#{userRank||'—'}</div>
            </div>
          </div>
          <div style={{width:1,height:36,background:'rgba(139,174,214,.1)'}}/>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:8,textTransform:'uppercase',letterSpacing:'1px',color:'rgba(168,196,232,.4)',fontWeight:600,marginBottom:3}}>Points</div>
            <div style={{fontSize:18,fontWeight:800,color:'#8BAED6'}}>{totalPoints.toLocaleString()}</div>
          </div>
          <div style={{width:1,height:36,background:'rgba(139,174,214,.1)'}}/>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:8,textTransform:'uppercase',letterSpacing:'1px',color:'rgba(168,196,232,.4)',fontWeight:600,marginBottom:3}}>Top</div>
            <div style={{fontSize:18,fontWeight:800,color:'#5DB08A'}}>{topPct ? `${topPct}%` : '—'}</div>
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      {!loading && top3.length >= 3 && (
        <div style={{padding:'0 16px 20px'}}>
          <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'1px',color:'rgba(139,174,214,.3)',fontWeight:600,marginBottom:12}}>Top 3</div>
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'center',gap:8}}>
            {[top3[1], top3[0], top3[2]].map((entry, idx) => {
              const actualRank = idx===0?2:idx===1?1:3;
              const heights = [80,100,64];
              const col = MEDAL_COLORS[actualRank-1];
              const bg  = MEDAL_BG[actualRank-1];
              const bdr = MEDAL_BORDER[actualRank-1];
              return (
                <div key={entry.id} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
                  <div style={{width:actualRank===1?52:44,height:actualRank===1?52:44,borderRadius:'50%',background:bg,border:`2px solid ${bdr}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:actualRank===1?20:16,fontWeight:900,color:col,boxShadow:actualRank===1?`0 0 24px ${col}44`:'none'}}>
                    {entry.username?.[0]?.toUpperCase()||'?'}
                  </div>
                  <div style={{fontSize:11,fontWeight:700,color:'rgba(238,242,247,.7)',textAlign:'center',maxWidth:70,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{entry.username||'Miner'}</div>
                  <div style={{fontSize:10,fontWeight:700,color:col}}>{(entry.total_points||0).toLocaleString()}</div>
                  <div style={{width:'100%',height:heights[idx],borderRadius:'12px 12px 0 0',background:bg,border:`1px solid ${bdr}`,borderBottom:'none',display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:10}}>
                    <span style={{fontSize:actualRank===1?22:18,fontWeight:900,color:`${col}cc`}}>#{actualRank}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full list */}
      <div style={{padding:'0 16px 4px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'1px',color:'rgba(139,174,214,.3)',fontWeight:600}}>All Miners</div>
        <div style={{fontSize:10,color:'rgba(139,174,214,.3)'}}>Top {leaders.length}</div>
      </div>
      <div style={{padding:'8px 16px 20px'}}>
        {loading ? (
          Array.from({length:8}).map((_,i)=>(
            <div key={i} style={{height:52,borderRadius:14,marginBottom:6,background:'rgba(139,174,214,.04)',border:'1px solid rgba(139,174,214,.06)',animation:'pulse 1.5s ease-in-out infinite'}}/>
          ))
        ) : leaders.map((entry, idx) => {
          const isTop3 = idx < 3;
          return (
            <motion.div key={entry.id}
              initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }} transition={{ delay: Math.min(idx*0.015, 0.5) }}
              style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:14,marginBottom:6,
                background: isTop3 ? `linear-gradient(135deg,${MEDAL_BG[idx]},rgba(13,17,23,1))` : '#0d1117',
                border:`1px solid ${isTop3 ? MEDAL_BORDER[idx] : 'rgba(139,174,214,.07)'}`,
              }}>
              <RankBadge rank={idx+1}/>
              <div style={{width:34,height:34,borderRadius:'50%',
                background:isTop3?MEDAL_BG[idx]:'rgba(139,174,214,.08)',
                border:`1px solid ${isTop3?MEDAL_BORDER[idx]:'rgba(139,174,214,.15)'}`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:13,fontWeight:700,color:isTop3?MEDAL_COLORS[idx]:'#8BAED6',flexShrink:0}}>
                {entry.username?.[0]?.toUpperCase()||'?'}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:'#EEF2F7',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{entry.username||'Miner'}</div>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <div style={{fontSize:13,fontWeight:700,color:isTop3?MEDAL_COLORS[idx]:'#8BAED6'}}>{(entry.total_points||0).toLocaleString()}</div>
                <div style={{fontSize:9,color:'rgba(139,174,214,.35)',marginTop:1}}>ARX-P</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
