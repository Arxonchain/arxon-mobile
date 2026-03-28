import { motion } from 'framer-motion';
import { usePoints } from '@/hooks/usePoints';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Crown, Medal, ChevronUp } from 'lucide-react';

const stagger = { hidden:{opacity:0}, show:{opacity:1,transition:{staggerChildren:0.05,delayChildren:0.1}} };
const fadeUp  = { hidden:{opacity:0,y:20}, show:{opacity:1,y:0,transition:{duration:0.45,ease:[0.25,0.46,0.45,0.94]}} };
const scaleIn = { hidden:{opacity:0,scale:0.92}, show:{opacity:1,scale:1,transition:{duration:0.45,ease:[0.25,0.46,0.45,0.94]}} };

interface Entry { user_id:string; username:string|null; total_points:number; }

const TIERS = [
  {col:'hsl(38 55% 52%)', bg:'hsl(38 55% 52% / 0.14)', bd:'hsl(38 55% 52% / 0.32)', glow:'hsl(38 55% 52% / 0.35)', label:'Gold'},
  {col:'hsl(215 18% 68%)',bg:'hsl(215 18% 68% / 0.12)',bd:'hsl(215 18% 68% / 0.26)',glow:'hsl(215 18% 68% / 0.22)',label:'Silver'},
  {col:'hsl(22 50% 48%)', bg:'hsl(22 50% 48% / 0.12)', bd:'hsl(22 50% 48% / 0.26)', glow:'hsl(22 50% 48% / 0.22)', label:'Bronze'},
];
const FILTERS = ['Global','Weekly','Friends'] as const;

export default function MobileLeaderboard() {
  const { user }         = useAuth();
  const { points, rank } = usePoints();
  const [leaders,  setLeaders]  = useState<Entry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<typeof FILTERS[number]>('Global');

  useEffect(() => {
    setLoading(true);
    supabase.from('user_points').select('user_id,total_points').order('total_points',{ascending:false}).limit(100)
      .then(async ({data:pts})=>{
        if (!pts?.length){ setLoading(false); return; }
        const {data:profiles} = await supabase.from('profiles').select('user_id,username').in('user_id',pts.map(p=>p.user_id));
        const nameMap = new Map((profiles||[]).map(p=>[p.user_id,p.username]));
        setLeaders(pts.map(p=>({user_id:p.user_id,username:nameMap.get(p.user_id)||null,total_points:Math.round(Number(p.total_points)||0)})));
        setLoading(false);
      });
  },[filter]);

  const totalPts = Math.round(points?.total_points??0);
  const userRank = rank??null;
  const topPct   = leaders.length>0&&userRank ? ((userRank/leaders.length)*100).toFixed(1) : null;
  const top3     = leaders.slice(0,3);
  const rest     = leaders.slice(3);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      style={{fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",paddingBottom:100,minHeight:'100vh',background:'hsl(225 30% 3%)'}}>

      {/* Header */}
      <motion.div variants={fadeUp} style={{padding:'52px 20px 0'}}>
        <h1 style={{fontSize:26,fontWeight:700,color:'hsl(215 20% 93%)',letterSpacing:'-0.5px'}}>Leaderboard</h1>
        <p style={{fontSize:12,color:'hsl(215 14% 38%)',marginTop:4,fontWeight:400}}>Top ARX-P miners globally</p>
      </motion.div>

      {/* Filter pills */}
      <motion.div variants={fadeUp} style={{display:'flex',gap:8,padding:'18px 20px 0'}}>
        {FILTERS.map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{
            padding:'7px 20px',borderRadius:24,fontSize:12,fontWeight:700,border:'none',cursor:'pointer',
            transition:'all 0.22s',
            background:filter===f?'hsl(215 35% 62% / 0.18)':'hsl(215 14% 10%)',
            color:filter===f?'hsl(215 35% 62%)':'hsl(215 14% 38%)',
            boxShadow:filter===f?'inset 0 1px 0 hsl(215 35% 62% / 0.12), 0 0 12px hsl(215 55% 62% / 0.08)':'none',
            borderWidth:1,borderStyle:'solid',
            borderColor:filter===f?'hsl(215 35% 62% / 0.28)':'hsl(215 20% 14%)',
          }}>
            {f}
          </button>
        ))}
      </motion.div>

      {/* Your rank card */}
      <motion.div variants={scaleIn} style={{margin:'18px 20px 0'}} className="shine">
        <div className="glass-hero" style={{borderRadius:22,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,right:0,width:180,height:180,pointerEvents:'none',
            background:'radial-gradient(circle,hsl(215 55% 62% / 0.06) 0%,transparent 70%)'}}/>
          <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,hsl(215 40% 82% / 0.12),transparent)',pointerEvents:'none'}}/>
          <div style={{padding:'20px',display:'grid',gridTemplateColumns:'1fr 1px 1fr 1px 1fr',alignItems:'center'}}>
            {/* Rank */}
            <div style={{textAlign:'center'}}>
              <div style={{width:42,height:42,borderRadius:14,background:'hsl(38 55% 52% / 0.1)',
                border:'1px solid hsl(38 55% 52% / 0.22)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="hsl(38 55% 52%)" strokeWidth="1.8">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                </svg>
              </div>
              <p style={{fontSize:8,textTransform:'uppercase',letterSpacing:'0.14em',color:'hsl(215 14% 35%)',fontWeight:600,marginBottom:4}}>Your Rank</p>
              <p style={{fontSize:28,fontWeight:700,color:'hsl(215 20% 93%)',lineHeight:1}}>#{userRank||'—'}</p>
            </div>
            <div style={{background:'hsl(215 25% 18%)',height:40}}/>
            <div style={{textAlign:'center'}}>
              <p style={{fontSize:8,textTransform:'uppercase',letterSpacing:'0.14em',color:'hsl(215 14% 35%)',fontWeight:600,marginBottom:8}}>Points</p>
              <p style={{fontSize:19,fontWeight:700,color:'hsl(215 35% 62%)'}}>{totalPts.toLocaleString()}</p>
            </div>
            <div style={{background:'hsl(215 25% 18%)',height:40}}/>
            <div style={{textAlign:'center'}}>
              <p style={{fontSize:8,textTransform:'uppercase',letterSpacing:'0.14em',color:'hsl(215 14% 35%)',fontWeight:600,marginBottom:8}}>Top</p>
              <p style={{fontSize:19,fontWeight:700,color:'hsl(155 45% 43%)'}}>{topPct?`${topPct}%`:'—'}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Podium */}
      {!loading && top3.length >= 3 && (
        <motion.div variants={scaleIn} style={{padding:'26px 20px 0'}}>
          <p style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.15em',color:'hsl(215 14% 30%)',fontWeight:700,marginBottom:18}}>Top 3</p>
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'center',gap:10}}>
            {[top3[1], top3[0], top3[2]].map((entry, idx) => {
              const actualRank = idx===0?2:idx===1?1:3;
              const heights    = [88,110,68];
              const t          = TIERS[actualRank-1];
              const isFirst    = actualRank===1;
              return (
                <motion.div key={entry.user_id}
                  initial={{y:44,opacity:0}} animate={{y:0,opacity:1}}
                  transition={{delay:0.3+idx*0.1,type:'spring',stiffness:180,damping:20}}
                  style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                  {/* Avatar */}
                  <div className={isFirst?'float':''} style={{
                    width:isFirst?58:46,height:isFirst?58:46,borderRadius:'50%',
                    background:t.bg,border:`2px solid ${t.bd}`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:isFirst?22:16,fontWeight:700,color:t.col,
                    boxShadow:isFirst?`0 0 28px ${t.glow}`:'none',
                    position:'relative',
                  }}>
                    {isFirst && (
                      <motion.div animate={{rotate:[0,5,-5,0]}} transition={{duration:4,repeat:Infinity}}
                        style={{position:'absolute',top:-20,left:'50%',transform:'translateX(-50%)'}}>
                        <Crown size={16} color="hsl(38 55% 52%)" style={{filter:'drop-shadow(0 0 8px hsl(38 55% 52% / 0.6))'}}/>
                      </motion.div>
                    )}
                    {!isFirst && <div style={{position:'absolute',top:-18,left:'50%',transform:'translateX(-50%)'}}><Medal size={13} color="hsl(215 14% 38%)"/></div>}
                    {entry.username?.[0]?.toUpperCase()||'?'}
                  </div>
                  <p style={{fontSize:11,fontWeight:700,color:'hsl(215 18% 72%)',textAlign:'center',maxWidth:72,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {entry.username||'Miner'}
                  </p>
                  <p style={{fontSize:10,fontWeight:700,color:t.col}}>{entry.total_points.toLocaleString()}</p>
                  {/* Platform */}
                  <div style={{width:'100%',height:heights[idx],borderRadius:'14px 14px 0 0',
                    background:t.bg,border:`1px solid ${t.bd}`,borderBottom:'none',
                    display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:12,
                    position:'relative',overflow:'hidden'}}>
                    {isFirst && <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,transparent,hsl(38 55% 52% / 0.04))'}}/>}
                    <span style={{fontSize:isFirst?26:20,fontWeight:700,color:`${t.col}`,opacity:0.22,position:'relative',zIndex:1}}>#{actualRank}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Full list */}
      <div style={{padding:'24px 20px 0'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <p style={{fontSize:11,textTransform:'uppercase',letterSpacing:'0.14em',color:'hsl(215 14% 30%)',fontWeight:700}}>All Miners</p>
          <p style={{fontSize:11,color:'hsl(215 14% 30%)',fontWeight:500}}>
            {loading?'Loading…':`Top ${leaders.length}`}
          </p>
        </div>

        {loading ? (
          Array.from({length:8}).map((_,i)=>(
            <div key={i} style={{height:58,borderRadius:16,marginBottom:8,
              background:'hsl(225 24% 8%)',border:'1px solid hsl(215 20% 12%)',opacity:0.5+i*0.05}}/>
          ))
        ) : leaders.length===0 ? (
          <div style={{textAlign:'center',padding:'48px 0'}}>
            <p style={{fontSize:38,marginBottom:12}}>🏆</p>
            <p style={{fontSize:15,fontWeight:700,color:'hsl(215 14% 38%)'}}>No miners yet</p>
          </div>
        ) : leaders.map((entry,idx)=>{
          const isTop3 = idx<3;
          const isMe   = entry.user_id===user?.id;
          const t      = isTop3 ? TIERS[idx] : null;
          return (
            <motion.div key={entry.user_id}
              initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}}
              transition={{delay:Math.min(idx*0.013,0.7)}}
              whileTap={{scale:0.98}}
              className="press"
              style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:16,marginBottom:8,
                background:isMe?'hsl(215 30% 12%)':isTop3?t!.bg:'hsl(225 22% 7%)',
                border:`1px solid ${isMe?'hsl(215 35% 62% / 0.28)':isTop3?t!.bd:'hsl(215 20% 12%)'}`,
                boxShadow:isMe?'0 0 0 1px hsl(215 35% 62% / 0.1), 0 4px 16px hsl(215 55% 62% / 0.07)':'none',
              }}>
              {/* Rank badge */}
              <div style={{width:30,height:30,borderRadius:10,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                background:isTop3?t!.bg:'hsl(215 20% 11%)',border:`1px solid ${isTop3?t!.bd:'hsl(215 20% 16%)'}`,}}>
                <span style={{fontSize:11,fontWeight:800,color:isTop3?t!.col:'hsl(215 14% 38%)'}}>
                  {isTop3?['🥇','🥈','🥉'][idx]:idx+1}
                </span>
              </div>
              {/* Avatar */}
              <div style={{width:36,height:36,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:13,fontWeight:700,
                background:isTop3?t!.bg:'hsl(215 25% 12%)',
                border:`1px solid ${isTop3?t!.bd:'hsl(215 20% 18%)'}`,
                color:isTop3?t!.col:isMe?'hsl(215 35% 62%)':'hsl(215 18% 52%)'}}>
                {entry.username?.[0]?.toUpperCase()||'?'}
              </div>
              {/* Name */}
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:13,fontWeight:600,color:'hsl(215 18% 88%)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {entry.username||'Miner'}
                </p>
                {isMe && (
                  <span style={{fontSize:9,background:'hsl(215 35% 62% / 0.12)',border:'1px solid hsl(215 35% 62% / 0.22)',
                    borderRadius:8,padding:'1px 6px',color:'hsl(215 35% 62%)',fontWeight:700,marginTop:2,display:'inline-block'}}>YOU</span>
                )}
              </div>
              {/* Points */}
              <div style={{textAlign:'right',flexShrink:0}}>
                <p style={{fontSize:13,fontWeight:700,color:isTop3?t!.col:isMe?'hsl(215 35% 62%)':'hsl(215 18% 72%)'}}>
                  {entry.total_points.toLocaleString()}
                </p>
                <p style={{fontSize:9,color:'hsl(215 14% 30%)',marginTop:1}}>ARX-P</p>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div style={{height:20}}/>
    </motion.div>
  );
}
