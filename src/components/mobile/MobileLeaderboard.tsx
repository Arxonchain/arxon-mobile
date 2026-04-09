import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usePoints } from '@/hooks/usePoints';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, Crown } from 'lucide-react';

interface Entry { user_id:string; username:string|null; total_points:number; avatar_url:string|null; }

const TIERS = [
  {col:'hsl(38 55% 52%)',bg:'hsl(38 55% 52%/0.14)',bd:'hsl(38 55% 52%/0.32)',glow:'hsl(38 55% 52%/0.35)'},
  {col:'hsl(215 18% 68%)',bg:'hsl(215 18% 68%/0.12)',bd:'hsl(215 18% 68%/0.26)',glow:'hsl(215 18% 68%/0.22)'},
  {col:'hsl(22 50% 48%)',bg:'hsl(22 50% 48%/0.12)',bd:'hsl(22 50% 48%/0.26)',glow:'hsl(22 50% 48%/0.22)'},
];

function Avatar({ url, name, size=36, col='hsl(215 35% 62%)' }: { url:string|null; name:string|null; size?:number; col?:string }) {
  const [err, setErr] = useState(false);
  const init = (name||'?')[0].toUpperCase();
  if (url && !err) return (
    <div style={{width:size,height:size,borderRadius:'50%',overflow:'hidden',flexShrink:0,border:`1px solid ${col}33`}}>
      <img src={url} alt="" onError={()=>setErr(true)} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
    </div>
  );
  return (
    <div style={{width:size,height:size,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',
      justifyContent:'center',fontSize:size*0.38,fontWeight:700,color:col,
      background:`${col}18`,border:`1px solid ${col}33`}}>
      {init}
    </div>
  );
}

export default function MobileLeaderboard() {
  const navigate         = useNavigate();
  const { user }         = useAuth();
  const { points, rank } = usePoints();
  const [leaders,  setLeaders]  = useState<Entry[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase.from('user_points').select('user_id,total_points')
      .order('total_points',{ascending:false}).limit(100)
      .then(async ({data:pts})=>{
        if (!pts?.length){ setLoading(false); return; }
        const {data:profiles} = await supabase.from('profiles')
          .select('user_id,username,avatar_url')
          .in('user_id',pts.map(p=>p.user_id));
        const profMap = new Map((profiles||[]).map(p=>[p.user_id,p]));
        setLeaders(pts.map(p=>({
          user_id:p.user_id,
          username:(profMap.get(p.user_id) as any)?.username||null,
          avatar_url:(profMap.get(p.user_id) as any)?.avatar_url||null,
          total_points:Math.round(Number(p.total_points)||0)
        })));
        setLoading(false);
      });
  },[]);

  const totalPts = Math.round(points?.total_points??0);
  const userRank = rank??null;
  const topPct   = leaders.length>0&&userRank ? ((userRank/leaders.length)*100).toFixed(1) : null;
  const top3     = leaders.slice(0,3);

  return (
    <div style={{minHeight:'100vh',background:'hsl(225 30% 3%)',paddingBottom:100,
      fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif"}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'52px 20px 0'}}>
        <button onClick={()=>navigate(-1)} className="press"
          style={{width:40,height:40,borderRadius:14,background:'hsl(215 25% 11%)',
            border:'1px solid hsl(215 22% 18%)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          <ChevronLeft size={20} color="hsl(215 25% 55%)"/>
        </button>
        <div style={{textAlign:'center'}}>
          <h1 style={{fontSize:19,fontWeight:700,color:'hsl(215 20% 93%)'}}>Leaderboard</h1>
          <p style={{fontSize:10,color:'hsl(215 14% 38%)',marginTop:2}}>Top ARX-P miners globally</p>
        </div>
        <div style={{width:40}}/>
      </div>

      {/* Your rank card */}
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.1}}
        style={{margin:'18px 20px 0'}} className="shine">
        <div className="glass-hero" style={{borderRadius:22,position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,right:0,width:180,height:180,pointerEvents:'none',
            background:'radial-gradient(circle,hsl(215 55% 62%/0.06) 0%,transparent 70%)'}}/>
          <div style={{position:'absolute',top:0,left:0,right:0,height:1,pointerEvents:'none',
            background:'linear-gradient(90deg,transparent,hsl(215 40% 82%/0.12),transparent)'}}/>
          <div style={{padding:'20px',display:'grid',gridTemplateColumns:'1fr 1px 1fr 1px 1fr',alignItems:'center'}}>
            <div style={{textAlign:'center'}}>
              <div style={{width:40,height:40,borderRadius:13,background:'hsl(38 55% 52%/0.1)',
                border:'1px solid hsl(38 55% 52%/0.22)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px'}}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="hsl(38 55% 52%)" strokeWidth="1.8">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                </svg>
              </div>
              <p style={{fontSize:8,textTransform:'uppercase',letterSpacing:'0.14em',color:'hsl(215 14% 35%)',fontWeight:600,marginBottom:4}}>Your Rank</p>
              <p style={{fontSize:26,fontWeight:700,color:'hsl(215 20% 93%)',lineHeight:1}}>#{userRank||'—'}</p>
            </div>
            <div style={{background:'hsl(215 25% 18%)',height:40}}/>
            <div style={{textAlign:'center'}}>
              <p style={{fontSize:8,textTransform:'uppercase',letterSpacing:'0.14em',color:'hsl(215 14% 35%)',fontWeight:600,marginBottom:8}}>ARX-P</p>
              <p style={{fontSize:18,fontWeight:700,color:'hsl(215 35% 62%)'}}>{totalPts.toLocaleString()}</p>
            </div>
            <div style={{background:'hsl(215 25% 18%)',height:40}}/>
            <div style={{textAlign:'center'}}>
              <p style={{fontSize:8,textTransform:'uppercase',letterSpacing:'0.14em',color:'hsl(215 14% 35%)',fontWeight:600,marginBottom:8}}>Top</p>
              <p style={{fontSize:18,fontWeight:700,color:'hsl(155 45% 43%)'}}>{topPct?`${topPct}%`:'—'}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Podium */}
      {!loading && top3.length >= 3 && (
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.15}}
          style={{padding:'24px 20px 0'}}>
          <p style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.14em',color:'hsl(215 14% 30%)',fontWeight:700,marginBottom:16}}>Top 3</p>
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'center',gap:10}}>
            {[top3[1], top3[0], top3[2]].map((entry, idx) => {
              const actualRank = idx===0?2:idx===1?1:3;
              const heights = [86,110,66];
              const t = TIERS[actualRank-1];
              const isFirst = actualRank===1;
              return (
                <motion.div key={entry.user_id}
                  initial={{y:44,opacity:0}} animate={{y:0,opacity:1}}
                  transition={{delay:0.2+idx*0.08,type:'spring',stiffness:180,damping:20}}
                  style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                  <div className={isFirst?'float':''}
                    style={{width:isFirst?56:44,height:isFirst?56:44,borderRadius:'50%',
                      background:t.bg,border:`2px solid ${t.bd}`,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:isFirst?22:16,fontWeight:700,color:t.col,
                      boxShadow:isFirst?`0 0 28px ${t.glow}`:'none',position:'relative'}}>
                    {isFirst && <div style={{position:'absolute',top:-20,left:'50%',transform:'translateX(-50%)'}}>
                      <Crown size={14} color="hsl(38 55% 52%)" style={{filter:'drop-shadow(0 0 8px hsl(38 55% 52%/0.6))'}}/>
                    </div>}
                    {entry.username?.[0]?.toUpperCase()||'?'}
                  </div>
                  <p style={{fontSize:11,fontWeight:700,color:'hsl(215 18% 72%)',textAlign:'center',
                    maxWidth:72,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {entry.username||'Miner'}
                  </p>
                  <p style={{fontSize:10,fontWeight:700,color:t.col}}>{entry.total_points.toLocaleString()}</p>
                  <div style={{width:'100%',height:heights[idx],borderRadius:'14px 14px 0 0',
                    background:t.bg,border:`1px solid ${t.bd}`,borderBottom:'none',
                    display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:10}}>
                    <span style={{fontSize:isFirst?24:18,fontWeight:700,color:t.col,opacity:0.22}}>#{actualRank}</span>
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
              background:'hsl(225 24% 8%)',border:'1px solid hsl(215 20% 12%)'}}/>
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
              transition={{delay:Math.min(idx*0.012,0.6)}}
              style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:16,marginBottom:8,
                background:isMe?'hsl(215 30% 12%)':isTop3?t!.bg:'hsl(225 22% 7%)',
                border:`1px solid ${isMe?'hsl(215 35% 62%/0.28)':isTop3?t!.bd:'hsl(215 20% 12%)'}`,
                boxShadow:isMe?'0 0 0 1px hsl(215 35% 62%/0.1)':'none',cursor:'pointer'}}
              onClick={() => !isMe && navigate(`/profile/${entry.user_id}`)}>
              <div style={{width:30,height:30,borderRadius:10,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                background:isTop3?t!.bg:'hsl(215 20% 11%)',border:`1px solid ${isTop3?t!.bd:'hsl(215 20% 16%)'}`,}}>
                <span style={{fontSize:11,fontWeight:800,color:isTop3?t!.col:'hsl(215 14% 38%)'}}>
                  {isTop3?['🥇','🥈','🥉'][idx]:idx+1}
                </span>
              </div>
              <Avatar url={entry.avatar_url} name={entry.username}
                col={isTop3?t!.col:isMe?'hsl(215 35% 62%)':'hsl(215 18% 52%)'} size={36}/>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:13,fontWeight:600,color:'hsl(215 18% 88%)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {entry.username||'Miner'}
                  {isMe && <span style={{marginLeft:6,fontSize:9,background:'hsl(215 35% 62%/0.12)',border:'1px solid hsl(215 35% 62%/0.22)',borderRadius:8,padding:'1px 6px',color:'hsl(215 35% 62%)',fontWeight:700}}>YOU</span>}
                </p>
              </div>
              <div style={{textAlign:'right',flexShrink:0}}>
                <p style={{fontSize:13,fontWeight:700,color:isTop3?t!.col:isMe?'hsl(215 35% 62%)':'hsl(215 18% 62%)'}}>
                  {entry.total_points.toLocaleString()}
                </p>
                <p style={{fontSize:9,color:'hsl(215 14% 30%)',marginTop:1}}>ARX-P</p>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div style={{height:20}}/>
    </div>
  );
}
