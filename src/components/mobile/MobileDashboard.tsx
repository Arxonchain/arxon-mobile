import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { useMiningStatus } from '@/hooks/useMiningStatus';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import arxonLogo from '@/assets/arxon-logo.jpg';

const stagger = { hidden:{opacity:0}, show:{opacity:1,transition:{staggerChildren:0.06,delayChildren:0.1}} };
const fadeUp  = { hidden:{opacity:0,y:22}, show:{opacity:1,y:0,transition:{duration:0.48,ease:[0.25,0.46,0.45,0.94]}} };
const scaleIn = { hidden:{opacity:0,scale:0.93}, show:{opacity:1,scale:1,transition:{duration:0.48,ease:[0.25,0.46,0.45,0.94]}} };

// ── Arxon 3D Coin ──────────────────────────────────────────────────────────
function ArxonCoin({ isMining }: { isMining: boolean }) {
  return (
    <div style={{animation:isMining?'miningCore 2s ease-in-out infinite':'floatY 7s ease-in-out infinite',
      position:'relative',width:96,height:96}}>
      <style>{`
        @keyframes miningCore{0%,100%{transform:scale(1) rotateY(0deg);filter:drop-shadow(0 0 10px hsl(215 55% 62%/0.5))}50%{transform:scale(1.06) rotateY(15deg);filter:drop-shadow(0 0 20px hsl(215 55% 62%/0.9))}}
        @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes orbitA{0%{transform:rotate(0deg) translateX(52px) rotate(0deg)}100%{transform:rotate(360deg) translateX(52px) rotate(-360deg)}}
        @keyframes orbitB{0%{transform:rotate(0deg) translateX(70px) rotate(0deg)}100%{transform:rotate(-360deg) translateX(70px) rotate(360deg)}}
        @keyframes rippleRing{0%{transform:scale(1);opacity:0.18}100%{transform:scale(2.6);opacity:0}}
        @keyframes pulseGlow{0%,100%{box-shadow:0 0 12px hsl(215 55% 62%/0.12)}50%{box-shadow:0 0 28px hsl(215 55% 62%/0.28)}}
      `}</style>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <defs>
          <radialGradient id="cf" cx="36%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#C8E0FF"/><stop offset="30%" stopColor="#8BAED6"/>
            <stop offset="65%" stopColor="#3A6898"/><stop offset="100%" stopColor="#0E2244"/>
          </radialGradient>
          <radialGradient id="ch" cx="35%" cy="25%" r="55%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.28)"/><stop offset="100%" stopColor="rgba(255,255,255,0)"/>
          </radialGradient>
          <linearGradient id="cr" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(139,174,214,0.55)"/><stop offset="100%" stopColor="rgba(30,74,128,0.25)"/>
          </linearGradient>
          <filter id="cs"><feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="rgba(0,0,0,0.55)"/></filter>
        </defs>
        <circle cx="48" cy="48" r="38" fill="url(#cf)" filter="url(#cs)"/>
        <circle cx="48" cy="48" r="36" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
        <circle cx="48" cy="48" r="40" fill="none" stroke="url(#cr)" strokeWidth="3"/>
        <ellipse cx="40" cy="32" rx="22" ry="11" fill="url(#ch)" style={{transform:'rotate(-22deg)',transformOrigin:'40px 32px'}}/>
        {/* Logo inset */}
        <image href={arxonLogo} x="22" y="22" width="52" height="52" clipPath="url(#coinClip)" style={{objectFit:'cover'}}/>
        <defs><clipPath id="coinClip"><circle cx="48" cy="48" r="26"/></clipPath></defs>
        <circle cx="48" cy="48" r="26" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
      </svg>
      {/* Orbit A */}
      <div style={{animation:'orbitA 5s linear infinite',position:'absolute',inset:-12,pointerEvents:'none'}}>
        <div style={{width:8,height:8,borderRadius:'50%',background:'hsl(215 35% 62%)',
          boxShadow:'0 0 12px hsl(215 55% 62%)',position:'absolute',top:-4,left:'50%',transform:'translateX(-50%)'}}/>
      </div>
      {/* Orbit B */}
      <div style={{animation:'orbitB 10s linear infinite',position:'absolute',inset:-24,pointerEvents:'none'}}>
        <div style={{width:5,height:5,borderRadius:'50%',background:'hsl(215 32% 72%/0.7)',
          position:'absolute',top:-2.5,left:'50%',transform:'translateX(-50%)'}}/>
      </div>
      {/* Ripple when mining */}
      {isMining && (
        <div style={{position:'absolute',inset:-8,borderRadius:'50%',border:'1px solid hsl(155 45% 43%/0.5)',
          animation:'rippleRing 2s ease-out infinite',pointerEvents:'none'}}/>
      )}
    </div>
  );
}

// ── Quick action card ──────────────────────────────────────────────────────
function QuickBtn({ label, path, color, bg, bd, children }: {
  label:string; path:string; color:string; bg:string; bd:string; children:React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <motion.button whileTap={{scale:0.91}} onClick={() => navigate(path)}
      className="press glass-elevated card-lift"
      style={{borderRadius:22,padding:'18px 10px 14px',display:'flex',flexDirection:'column',
        alignItems:'center',gap:10,cursor:'pointer',width:'100%',
        background:`linear-gradient(145deg,${bg},hsl(225 30% 3% / 0.5))`,
        border:`1.5px solid ${bd}`,boxShadow:`0 4px 20px ${color}18`}}>
      <div style={{width:50,height:50,borderRadius:16,background:`${color}18`,
        border:`1px solid ${color}30`,display:'flex',alignItems:'center',justifyContent:'center',color}}>
        {children}
      </div>
      <span style={{fontSize:12,fontWeight:700,color,letterSpacing:'0.02em',
        fontFamily:"'Creato Display',-apple-system,sans-serif"}}>
        {label}
      </span>
    </motion.button>
  );
}

export default function MobileDashboard() {
  const { user }         = useAuth();
  const navigate         = useNavigate();
  const { points, rank } = usePoints();
  const { profile }      = useProfile();
  const { isMining }     = useMiningStatus();
  const [todayPts,  setTodayPts]  = useState(0);
  const [weekPts,   setWeekPts]   = useState(0);
  const [liveEarn,  setLiveEarn]  = useState(0);

  const totalPts = Math.round(points?.total_points ?? 0);
  const userRank = rank ?? null;
  const streak   = points?.daily_streak ?? 0;
  const username = profile?.username || user?.email?.split('@')[0] || 'Miner';

  useEffect(() => {
    if (!user) return;
    (async () => {
      const now   = new Date();
      const today = now.toISOString().split('T')[0];
      const week  = new Date(now.getTime()-7*86400000).toISOString().split('T')[0];
      const [{ data:td }, { data:wk }] = await Promise.all([
        supabase.from('mining_sessions').select('arx_mined').eq('user_id',user.id).gte('started_at',today),
        supabase.from('mining_sessions').select('arx_mined').eq('user_id',user.id).gte('started_at',week),
      ]);
      const t = td?.reduce((s,r)=>s+Number(r.arx_mined||0),0)??0;
      const w = wk?.reduce((s,r)=>s+Number(r.arx_mined||0),0)??0;
      setTodayPts(t); setWeekPts(w); setLiveEarn(t);
    })();
  },[user]);

  useEffect(()=>{
    if (!isMining) return;
    const t = setInterval(()=>setLiveEarn(p=>p+148.2/3600),1000);
    return ()=>clearInterval(t);
  },[isMining]);

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      style={{minHeight:'100vh',background:'hsl(225 30% 3%)',paddingBottom:100,
        fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif"}}>

      {/* ── Header ── */}
      <motion.div variants={fadeUp} style={{display:'flex',alignItems:'center',
        justifyContent:'space-between',padding:'52px 20px 0'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:44,height:44,borderRadius:14,overflow:'hidden',
            border:'1px solid hsl(215 35% 62%/0.2)',boxShadow:'0 0 16px hsl(215 55% 62%/0.15)'}}>
            <img src={arxonLogo} alt="Arxon" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          </div>
          <div>
            <p style={{fontSize:10,color:'hsl(215 14% 38%)',textTransform:'uppercase',letterSpacing:'0.16em',fontWeight:500,marginBottom:3}}>Welcome back</p>
            <h1 style={{fontSize:20,fontWeight:700,color:'hsl(215 20% 93%)',letterSpacing:'-0.3px'}}>{username}</h1>
          </div>
        </div>
        <motion.button whileTap={{scale:0.88}} onClick={()=>navigate('/notifications')}
          className="glass-card press"
          style={{width:40,height:40,borderRadius:14,display:'flex',alignItems:'center',
            justifyContent:'center',position:'relative',cursor:'pointer'}}>
          <Bell size={17} color="hsl(215 25% 52%)"/>
          <span style={{position:'absolute',top:8,right:9,width:7,height:7,borderRadius:'50%',
            background:'hsl(0 60% 56%)',border:'2px solid hsl(225 30% 3%)',
            boxShadow:'0 0 8px hsl(0 60% 56%/0.6)'}}/>
        </motion.button>
      </motion.div>

      {/* ── Hero Balance Card ── */}
      <motion.div variants={scaleIn} style={{margin:'18px 20px 0'}} className="shine">
        <div className="glass-hero" style={{borderRadius:28,overflow:'hidden',position:'relative',
          background:'linear-gradient(150deg,hsl(225 30% 13%),hsl(215 35% 18%),hsl(225 32% 10%))',
          border:'1px solid hsl(215 38% 28%/0.3)',
          boxShadow:'0 20px 60px -20px hsl(215 55% 62%/0.12)'}}>
          <div style={{position:'absolute',top:-50,right:-40,width:220,height:220,borderRadius:'50%',
            background:'radial-gradient(circle,hsl(215 55% 62%/0.1) 0%,transparent 70%)',pointerEvents:'none'}}/>
          <div style={{position:'absolute',bottom:-40,left:-30,width:160,height:160,borderRadius:'50%',
            background:'radial-gradient(circle,hsl(155 45% 43%/0.06) 0%,transparent 70%)',pointerEvents:'none'}}/>
          <div style={{position:'absolute',top:0,left:0,right:0,height:1,
            background:'linear-gradient(90deg,transparent,hsl(215 40% 82%/0.18),transparent)',pointerEvents:'none'}}/>

          <div style={{display:'flex',alignItems:'stretch',padding:'22px 20px 20px',position:'relative',zIndex:2}}>
            {/* Left */}
            <div style={{flex:1,paddingRight:10}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <p style={{fontSize:9,textTransform:'uppercase',letterSpacing:'0.18em',color:'hsl(215 25% 50%)',fontWeight:600}}>ARX-P Balance</p>
                {userRank && (
                  <div style={{display:'flex',alignItems:'center',gap:4,background:'hsl(215 35% 62%/0.1)',
                    border:'1px solid hsl(215 35% 62%/0.2)',borderRadius:20,padding:'3px 10px'}}>
                    <div style={{width:5,height:5,borderRadius:'50%',background:'hsl(215 35% 62%)',
                      boxShadow:'0 0 8px hsl(215 55% 62%)'}}/>
                    <span style={{color:'hsl(215 32% 72%)',fontSize:10,fontWeight:700}}>Rank #{userRank}</span>
                  </div>
                )}
              </div>
              {/* Balance number — real data */}
              <div style={{display:'flex',alignItems:'baseline',gap:7,marginBottom:3}}>
                <span style={{fontSize:40,fontWeight:700,letterSpacing:'-2px',color:'hsl(215 20% 95%)',lineHeight:1}}>
                  {totalPts.toLocaleString()}
                </span>
                <span style={{fontSize:14,fontWeight:600,color:'hsl(215 35% 62%)'}}>ARX-P</span>
              </div>
              <p style={{fontSize:9,color:'hsl(215 14% 32%)',marginBottom:18}}>Your total mining rewards</p>

              {/* Stats */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',marginBottom:16}}>
                {[
                  {l:'Today',    v:`+${Math.round(todayPts).toLocaleString()}`, c:'hsl(215 20% 90%)'},
                  {l:'This Week',v:`+${Math.round(weekPts).toLocaleString()}`,  c:'hsl(215 32% 72%)'},
                  {l:'Streak',   v:`🔥 ${streak}d`,                             c:'hsl(38 55% 52%)'},
                ].map((s,i)=>(
                  <div key={i} style={{paddingLeft:i>0?12:0,borderLeft:i>0?'1px solid hsl(215 25% 18%)':'none'}}>
                    <p style={{fontSize:7,textTransform:'uppercase',letterSpacing:'0.1em',color:'hsl(215 14% 32%)',fontWeight:600,marginBottom:4}}>{s.l}</p>
                    <p style={{fontSize:13,fontWeight:700,color:s.c}}>{s.v}</p>
                  </div>
                ))}
              </div>
              {/* Mini bar chart */}
              <div style={{display:'flex',alignItems:'flex-end',gap:3,height:28}}>
                {[0.38,0.50,0.28,0.65,0.42,0.58,0.88].map((h,i)=>(
                  <div key={i} style={{flex:1,borderRadius:'3px 3px 0 0',
                    height:`${h*100}%`,
                    background:i===6
                      ?'linear-gradient(to top,hsl(215 35% 62%/0.5),hsl(215 38% 75%/0.7))'
                      :`hsl(215 25% 55%/${0.07+i*0.015})`}}/>
                ))}
              </div>
            </div>
            {/* Right — coin */}
            <div style={{width:110,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <ArxonCoin isMining={isMining}/>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Mining Active Banner ── */}
      <AnimatePresence>
        {isMining && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            style={{margin:'12px 20px 0',overflow:'hidden'}}>
            <div className="press" onClick={()=>navigate('/mining')}
              style={{borderRadius:16,padding:'13px 18px',cursor:'pointer',
                background:'linear-gradient(135deg,hsl(155 45% 43%/0.1),hsl(155 45% 43%/0.05))',
                border:'1px solid hsl(155 45% 43%/0.28)',
                display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{position:'relative',flexShrink:0}}>
                  <div style={{width:9,height:9,borderRadius:'50%',background:'hsl(155 45% 43%)',
                    boxShadow:'0 0 10px hsl(155 45% 43%)'}} className="mining-pulse"/>
                  <div style={{position:'absolute',inset:-3,borderRadius:'50%',
                    border:'1px solid hsl(155 45% 43%/0.5)'}} className="ripple-ring"/>
                </div>
                <div>
                  <p style={{fontSize:13,fontWeight:700,color:'hsl(155 45% 55%)'}}>Mining Active</p>
                  <p style={{fontSize:10,color:'hsl(155 45% 43%/0.6)',marginTop:1}}>{liveEarn.toFixed(2)} ARX-P earned</p>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'hsl(155 45% 43%/0.55)',fontWeight:600}}>
                View <ChevronRight size={13}/>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Quick Access — mining features only ── */}
      <motion.div variants={fadeUp} style={{padding:'22px 20px 0'}}>
        <p style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.15em',color:'hsl(215 14% 30%)',fontWeight:700,marginBottom:14}}>Quick Access</p>
        {/* Row 1: Mine (big center) + Arena + Nexus */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 90px 1fr',gap:12,alignItems:'end',marginBottom:12}}>
          {/* Arena */}
          <QuickBtn label="Arena" path="/arena" color="hsl(255 50% 65%)" bg="hsl(255 30% 8%)" bd="hsl(255 50% 60%/0.22)">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><circle cx="19" cy="19" r="2"/><circle cx="5" cy="5" r="2"/></svg>
          </QuickBtn>
          {/* Mine — elevated */}
          <motion.button whileTap={{scale:0.9}} onClick={()=>navigate('/mining')}
            className="press glow-steel"
            style={{borderRadius:26,padding:'24px 0 16px',display:'flex',flexDirection:'column',
              alignItems:'center',gap:8,cursor:'pointer',marginBottom:10,position:'relative',overflow:'hidden',
              background:'linear-gradient(160deg,hsl(215 35% 18%),hsl(225 32% 10%),hsl(225 35% 6%))',
              border:'2px solid hsl(215 35% 62%/0.38)'}}>
            <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 50% 0%,hsl(215 55% 62%/0.1) 0%,transparent 60%)',pointerEvents:'none'}}/>
            <div style={{position:'absolute',top:0,left:0,right:0,height:1,
              background:'linear-gradient(90deg,transparent,hsl(215 40% 82%/0.2),transparent)',pointerEvents:'none'}}/>
            <div className="float" style={{width:54,height:54,borderRadius:18,
              background:'linear-gradient(135deg,hsl(215 35% 62%/0.22),hsl(215 35% 62%/0.08))',
              border:'1.5px solid hsl(215 35% 62%/0.35)',
              display:'flex',alignItems:'center',justifyContent:'center',
              position:'relative',zIndex:1,boxShadow:'0 4px 16px hsl(215 55% 62%/0.2)'}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="hsl(215 38% 82%)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M15 5l4 4-8 8-5 1 1-5 8-8z"/><path d="M12 8l4 4"/>
              </svg>
            </div>
            <span style={{fontSize:11,fontWeight:800,color:'hsl(215 38% 85%)',letterSpacing:'0.08em',
              textTransform:'uppercase',position:'relative',zIndex:1,
              fontFamily:"'Creato Display',-apple-system,sans-serif"}}>Mine</span>
            {isMining && <div style={{position:'absolute',bottom:8,width:7,height:7,borderRadius:'50%',
              background:'hsl(155 45% 43%)',boxShadow:'0 0 8px hsl(155 45% 43%)'}} className="mining-pulse"/>}
          </motion.button>
          {/* Nexus */}
          <QuickBtn label="Nexus" path="/nexus" color="hsl(155 45% 50%)" bg="hsl(155 30% 5%)" bd="hsl(155 45% 43%/0.22)">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </QuickBtn>
        </div>
        {/* Row 2: Tasks + Referrals */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <QuickBtn label="Tasks" path="/tasks" color="hsl(38 55% 52%)" bg="hsl(38 30% 5%)" bd="hsl(38 55% 52%/0.22)">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          </QuickBtn>
          <QuickBtn label="Referrals" path="/referrals" color="hsl(215 32% 72%)" bg="hsl(215 30% 6%)" bd="hsl(215 35% 62%/0.22)">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
          </QuickBtn>
        </div>
      </motion.div>

      {/* ── Live Battles ── */}
      <motion.div variants={fadeUp} style={{padding:'24px 20px 0'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <p style={{fontSize:15,fontWeight:700,color:'hsl(215 20% 93%)'}}>Live Battles</p>
          <button onClick={()=>navigate('/arena')}
            style={{display:'flex',alignItems:'center',gap:3,fontSize:11,color:'hsl(215 35% 62%)',fontWeight:600,background:'none',border:'none',cursor:'pointer'}}>
            View all <ChevronRight size={13}/>
          </button>
        </div>
        <div className="scrollbar-none" style={{display:'flex',gap:12,overflowX:'auto',paddingBottom:4}}>
          {/* Battle preview */}
          <motion.div whileTap={{scale:0.97}} onClick={()=>navigate('/arena')} className="press"
            style={{minWidth:210,borderRadius:20,overflow:'hidden',height:128,flexShrink:0,cursor:'pointer',
              position:'relative',background:'linear-gradient(135deg,hsl(225 28% 10%),hsl(215 30% 14%),hsl(225 26% 8%))',
              border:'1px solid hsl(215 30% 22%/0.3)'}}>
            <div style={{position:'absolute',top:0,bottom:0,left:'50%',width:1,
              background:'linear-gradient(to bottom,transparent,hsl(215 35% 62%/0.3),transparent)'}}/>
            <div style={{position:'absolute',left:0,top:0,bottom:0,width:'50%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5}}>
              <div style={{width:38,height:38,borderRadius:'50%',background:'linear-gradient(135deg,#F7931A,#E8820A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,color:'white',boxShadow:'0 0 16px rgba(247,147,26,0.4)'}}>₿</div>
              <span style={{fontSize:10,fontWeight:700,color:'hsl(215 20% 90%)'}}>ALPHA</span>
              <span style={{fontSize:9,color:'hsl(215 18% 45%)'}}>62%</span>
            </div>
            <div style={{position:'absolute',right:0,top:0,bottom:0,width:'50%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5}}>
              <div style={{width:38,height:38,borderRadius:'50%',background:'linear-gradient(135deg,#627EEA,#4060C8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900,color:'white',boxShadow:'0 0 16px rgba(98,126,234,0.4)'}}>Ξ</div>
              <span style={{fontSize:10,fontWeight:700,color:'hsl(215 20% 90%)'}}>OMEGA</span>
              <span style={{fontSize:9,color:'hsl(215 18% 45%)'}}>38%</span>
            </div>
            <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
              background:'hsl(215 30% 15%)',border:'1px solid hsl(215 35% 28%)',borderRadius:8,padding:'3px 8px'}}>
              <span style={{fontSize:9,fontWeight:900,color:'hsl(215 32% 72%)'}}>VS</span>
            </div>
            <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'7px 10px',
              background:'linear-gradient(to top,hsl(225 35% 3%/0.8),transparent)',
              display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:9,fontWeight:600,color:'hsl(215 18% 50%)'}}>Boost Battle</span>
              <div style={{display:'flex',alignItems:'center',gap:3,background:'hsl(155 45% 43%/0.14)',
                border:'1px solid hsl(155 45% 43%/0.28)',borderRadius:8,padding:'2px 7px'}}>
                <div className="mining-pulse" style={{width:5,height:5,borderRadius:'50%',background:'hsl(155 45% 43%)'}}/>
                <span style={{fontSize:8,fontWeight:700,color:'hsl(155 45% 55%)'}}>LIVE</span>
              </div>
            </div>
          </motion.div>
          {/* Coming soon */}
          <div style={{minWidth:155,borderRadius:20,height:128,flexShrink:0,opacity:0.65,
            border:'1px dashed hsl(215 25% 20%)',display:'flex',flexDirection:'column',
            alignItems:'center',justifyContent:'center',gap:8,background:'hsl(225 28% 6%)'}}>
            <div style={{width:42,height:42,borderRadius:'50%',background:'hsl(215 25% 10%)',
              border:'1px solid hsl(215 25% 18%)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="hsl(215 25% 42%)" strokeWidth="1.7"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <p style={{fontSize:11,fontWeight:600,color:'hsl(215 18% 40%)'}}>Coming Soon</p>
            <p style={{fontSize:9,color:'hsl(215 14% 28%)'}}>Next battle in 4h</p>
          </div>
        </div>
      </motion.div>

      {/* ── Recent Activity ── */}
      <motion.div variants={fadeUp} style={{padding:'24px 20px 0'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
          <p style={{fontSize:15,fontWeight:700,color:'hsl(215 20% 93%)'}}>Recent Activity</p>
          <button onClick={()=>navigate('/nexus')}
            style={{display:'flex',alignItems:'center',gap:3,fontSize:11,color:'hsl(215 35% 62%)',fontWeight:600,background:'none',border:'none',cursor:'pointer'}}>
            See all <ChevronRight size={13}/>
          </button>
        </div>
        {[
          {col:'hsl(155 45% 43%)',bg:'hsl(155 45% 43%/0.1)',bd:'hsl(155 45% 43%/0.2)',vc:'hsl(155 45% 55%)',
           label:'Mining Session',sub:'Today · ongoing',val:`+${liveEarn.toFixed(2)}`,
           d:<path d="M15 5l4 4-8 8-5 1 1-5 8-8z"/>},
          {col:'hsl(215 35% 62%)',bg:'hsl(215 35% 62%/0.08)',bd:'hsl(215 35% 62%/0.16)',vc:'hsl(215 35% 62%)',
           label:'Session Complete',sub:'Yesterday · 8hr',val:'+1,186',
           d:<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>},
          {col:'hsl(38 55% 52%)',bg:'hsl(38 55% 52%/0.08)',bd:'hsl(38 55% 52%/0.18)',vc:'hsl(38 55% 62%)',
           label:'Streak Bonus',sub:`${streak}-day streak`,val:'+50',
           d:<path d="M12 2l2.5 7h7l-5.5 4 2 7L12 16l-6 4 2-7L2 9h7z"/>},
        ].map((it,i)=>(
          <motion.div key={i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
            transition={{delay:0.6+i*0.07}} whileTap={{scale:0.98}}
            className="glass-card press card-lift"
            style={{display:'flex',alignItems:'center',gap:13,padding:'14px 16px',borderRadius:18,marginBottom:9,cursor:'pointer'}}>
            <div style={{width:42,height:42,borderRadius:14,background:it.bg,border:`1px solid ${it.bd}`,
              display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:it.col}}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{it.d}</svg>
            </div>
            <div style={{flex:1}}>
              <p style={{fontSize:13,fontWeight:600,color:'hsl(215 20% 90%)'}}>{it.label}</p>
              <p style={{fontSize:10,color:'hsl(215 14% 38%)',marginTop:2}}>{it.sub}</p>
            </div>
            <div style={{textAlign:'right'}}>
              <p style={{fontSize:14,fontWeight:700,color:it.vc}}>{it.val}</p>
              <p style={{fontSize:9,color:'hsl(215 14% 30%)',marginTop:1}}>ARX-P</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
