import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMining } from '@/hooks/useMining';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { ChevronLeft, Copy, Zap, Clock, TrendingUp, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import AuthDialog from '@/components/auth/AuthDialog';
import arxonLogo from '@/assets/arxon-logo.jpg';

const CSS = `
@keyframes miningCore{0%,100%{transform:scale(1);filter:drop-shadow(0 0 16px hsl(215 55% 62%/0.6))}50%{transform:scale(1.06);filter:drop-shadow(0 0 32px hsl(215 55% 62%/1))}}
@keyframes idleFloat{0%,100%{transform:translateY(0) rotateY(0deg)}50%{transform:translateY(-8px) rotateY(8deg)}}
@keyframes orbitRing{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes orbitRingRev{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
@keyframes rippleRing{0%{transform:scale(1);opacity:0.3}100%{transform:scale(2.4);opacity:0}}
@keyframes progressPulse{0%,100%{opacity:0.8}50%{opacity:1}}
@keyframes particleUp{0%{transform:translateY(0);opacity:0}15%{opacity:0.7}85%{opacity:0.3}100%{transform:translateY(-70px);opacity:0}}
@keyframes spinSlow{to{transform:rotate(360deg)}}
`;

function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="glass-elevated shine" style={{borderRadius:24,position:'relative',overflow:'hidden',...style}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:1,
        background:'linear-gradient(90deg,transparent,hsl(215 40% 82%/0.15),transparent)',pointerEvents:'none'}}/>
      <div style={{position:'relative',zIndex:2}}>{children}</div>
    </div>
  );
}

export default function MobileMining() {
  const { user }      = useAuth();
  const navigate      = useNavigate();
  const { points }    = usePoints();
  const { profile }   = useProfile();
  const [showAuth, setShowAuth] = useState(false);

  const {
    isMining, earnedPoints, elapsedSeconds, pointsPerHour,
    boostPercentage, sessionId,
    startMining, stopMining, claimPoints,
    isStarting, isStopping, isClaiming,
  } = useMining({ tickMs: 1000 });

  const totalPoints  = Math.round(points?.total_points ?? 0);
  const username     = profile?.username || user?.email?.split('@')[0] || 'Miner';
  const referralCode = profile?.referral_code;

  const fmtTime = (s: number) => {
    const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); const ss = s%60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  };

  const MAX_HOURS = 8;
  const progress = Math.min((elapsedSeconds / (MAX_HOURS * 3600)) * 100, 100);

  const handleMineToggle = async () => {
    if (!user) { setShowAuth(true); return; }
    if (isMining) await stopMining();
    else await startMining();
  };

  const handleClaim = async () => {
    if (!user) { setShowAuth(true); return; }
    if (earnedPoints > 0) await claimPoints();
  };

  const copyRef = async () => {
    if (!referralCode) return;
    await navigator.clipboard.writeText(referralCode);
    toast({ title:'Copied!', description:'Referral code copied to clipboard' });
  };

  return (
    <div style={{minHeight:'100vh',background:'hsl(225 30% 3%)',paddingBottom:100,
      fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif"}}>
      <style>{CSS}</style>

      {/* ── Header ── */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'52px 20px 0'}}>
        <button onClick={()=>navigate(-1)} className="press"
          style={{width:40,height:40,borderRadius:14,background:'hsl(215 25% 11%)',
            border:'1px solid hsl(215 22% 18%)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          <ChevronLeft size={20} color="hsl(215 25% 55%)"/>
        </button>
        <div style={{textAlign:'center'}}>
          <h1 style={{fontSize:19,fontWeight:700,color:'hsl(215 20% 93%)'}}>Mining</h1>
          <p style={{fontSize:10,color:'hsl(215 14% 38%)',marginTop:2}}>Live session dashboard</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5,
          background:isMining?'hsl(155 45% 43%/0.12)':'hsl(215 25% 11%)',
          border:`1px solid ${isMining?'hsl(155 45% 43%/0.3)':'hsl(215 22% 18%)'}`,
          borderRadius:20,padding:'6px 12px'}}>
          {isMining && <div className="mining-pulse" style={{width:6,height:6,borderRadius:'50%',background:'hsl(155 45% 43%)',boxShadow:'0 0 8px hsl(155 45% 43%)'}}/>}
          <span style={{fontSize:11,fontWeight:700,color:isMining?'hsl(155 45% 55%)':'hsl(215 18% 45%)'}}>
            {isMining?`${pointsPerHour.toFixed(1)}/hr`:'Idle'}
          </span>
        </div>
      </div>

      {/* ── Mining Orb Card ── */}
      <div style={{margin:'18px 20px 0'}}>
        <GlassCard style={{background:'linear-gradient(150deg,hsl(225 30% 12%),hsl(215 32% 16%),hsl(225 32% 9%))',border:'1px solid hsl(215 35% 28%/0.3)'}}>
          <div style={{padding:'28px 20px 24px',display:'flex',flexDirection:'column',alignItems:'center'}}>
            {/* Orb */}
            <div style={{position:'relative',marginBottom:24}}>
              {/* Ambient glow */}
              <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
                width:200,height:200,borderRadius:'50%',pointerEvents:'none',
                background:`radial-gradient(circle,hsl(215 55% 62%/${isMining?'0.15':'0.06'}) 0%,transparent 70%)`,
                transition:'background 0.5s'}}/>
              {/* Outer ring */}
              <svg style={{position:'absolute',inset:-16,animation:'spinSlow 12s linear infinite'}} width="152" height="152" viewBox="0 0 152 152">
                <circle cx="76" cy="76" r="70" fill="none" stroke="hsl(215 35% 62%/0.08)" strokeWidth="1"/>
                <circle cx="76" cy="76" r="70" fill="none" stroke="hsl(215 35% 62%/0.22)" strokeWidth="1.2"
                  strokeDasharray="32 408" strokeLinecap="round"/>
              </svg>
              {/* Ripples when mining */}
              {isMining && [0,1].map(i=>(
                <div key={i} style={{position:'absolute',inset:-8,borderRadius:'50%',
                  border:'1px solid hsl(155 45% 43%/0.4)',
                  animation:`rippleRing 2.4s ease-out ${i*1.2}s infinite`,pointerEvents:'none'}}/>
              ))}
              {/* Mining particles */}
              {isMining && [0,1,2,3,4].map(i=>(
                <div key={i} style={{position:'absolute',bottom:'100%',left:`${30+i*10}%`,
                  width:3,height:3,borderRadius:'50%',background:'hsl(215 35% 72%)',
                  animation:`particleUp 2.5s ease-out ${i*0.5}s infinite`,pointerEvents:'none'}}/>
              ))}
              {/* Orbit rings */}
              <div style={{animation:'orbitRing 5s linear infinite',position:'absolute',inset:-10,pointerEvents:'none'}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:'hsl(215 35% 62%)',
                  boxShadow:'0 0 12px hsl(215 55% 62%)',position:'absolute',top:-4,left:'50%',transform:'translateX(-50%)'}}/>
              </div>
              <div style={{animation:'orbitRingRev 9s linear infinite',position:'absolute',inset:-22,pointerEvents:'none'}}>
                <div style={{width:5,height:5,borderRadius:'50%',background:'hsl(215 32% 72%/0.7)',
                  position:'absolute',top:-2.5,left:'50%',transform:'translateX(-50%)'}}/>
              </div>
              {/* Main orb — Arxon logo */}
              <div style={{width:120,height:120,borderRadius:'50%',overflow:'hidden',
                border:'2.5px solid hsl(215 35% 62%/0.35)',
                boxShadow:`0 0 ${isMining?'40px':'20px'} hsl(215 55% 62%/${isMining?'0.35':'0.15'}), inset 0 0 20px hsl(215 35% 62%/0.1)`,
                animation:isMining?'miningCore 2s ease-in-out infinite':'idleFloat 5s ease-in-out infinite',
                transition:'box-shadow 0.5s'}}>
                <img src={arxonLogo} alt="ARX" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              </div>
            </div>

            {/* Earnings */}
            <p style={{fontSize:9,textTransform:'uppercase',letterSpacing:'0.16em',color:'hsl(215 14% 38%)',fontWeight:600,marginBottom:6}}>Session Earnings</p>
            <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:4}}>
              <span style={{fontSize:48,fontWeight:700,color:'hsl(215 20% 95%)',letterSpacing:'-2px',lineHeight:1}}>
                {Math.floor(earnedPoints)}
              </span>
              <span style={{fontSize:18,fontWeight:600,color:'hsl(215 35% 62%)'}}>
                .{String(Math.floor((earnedPoints % 1) * 100)).padStart(2,'0')}
              </span>
            </div>
            <p style={{fontSize:11,color:'hsl(215 14% 38%)',marginBottom:16}}>ARX-P this session</p>

            {/* Rate + boost badges */}
            <div style={{display:'flex',gap:8,marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',gap:5,
                background:'hsl(155 45% 43%/0.1)',border:'1px solid hsl(155 45% 43%/0.25)',
                borderRadius:20,padding:'5px 12px'}}>
                <TrendingUp size={12} color="hsl(155 45% 50%)"/>
                <span style={{fontSize:11,fontWeight:700,color:'hsl(155 45% 55%)'}}>
                  {pointsPerHour.toFixed(1)} ARX-P/hr
                </span>
              </div>
              {boostPercentage > 0 && (
                <div style={{display:'flex',alignItems:'center',gap:5,
                  background:'hsl(38 55% 52%/0.1)',border:'1px solid hsl(38 55% 52%/0.25)',
                  borderRadius:20,padding:'5px 12px'}}>
                  <Zap size={12} color="hsl(38 55% 58%)"/>
                  <span style={{fontSize:11,fontWeight:700,color:'hsl(38 55% 62%)'}}> +{boostPercentage}%</span>
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div style={{width:'100%',marginBottom:8}}>
              <div style={{height:6,borderRadius:3,background:'hsl(215 25% 14%)',overflow:'hidden'}}>
                <motion.div initial={{width:0}} animate={{width:`${progress}%`}} transition={{duration:1,ease:'easeOut'}}
                  style={{height:'100%',borderRadius:3,
                    background:'linear-gradient(90deg,hsl(215 35% 55%),hsl(215 45% 70%))',
                    animation:'progressPulse 2s ease-in-out infinite'}}/>
              </div>
            </div>
            <p style={{fontSize:9,color:'hsl(215 14% 32%)',marginBottom:0}}>
              {fmtTime(elapsedSeconds)} elapsed · Max 8hr session
            </p>
          </div>
        </GlassCard>
      </div>

      {/* ── Stats Grid ── */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,padding:'12px 20px 0'}}>
        {[
          {icon:<Clock size={18}/>, label:'Elapsed',   val:fmtTime(elapsedSeconds), col:'hsl(215 35% 62%)'},
          {icon:<TrendingUp size={18}/>, label:'Per Hour',  val:`${pointsPerHour.toFixed(1)}`,  col:'hsl(155 45% 50%)'},
          {icon:<Zap size={18}/>,  label:'Boost',     val:boostPercentage>0?`+${boostPercentage}%`:'—', col:'hsl(38 55% 52%)'},
        ].map((s,i)=>(
          <GlassCard key={i} style={{padding:'14px 10px'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
              <div style={{color:'hsl(215 25% 50%)'}}>{s.icon}</div>
              <p style={{fontSize:9,textTransform:'uppercase',letterSpacing:'0.1em',color:'hsl(215 14% 35%)',fontWeight:600}}>{s.label}</p>
              <p style={{fontSize:14,fontWeight:700,color:s.col}}>{s.val}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* ── Action Buttons ── */}
      <div style={{padding:'14px 20px 0'}}>
        <motion.button whileTap={{scale:0.97}} onClick={handleMineToggle}
          disabled={isStarting||isStopping}
          style={{width:'100%',padding:'17px',borderRadius:20,marginBottom:10,cursor:'pointer',fontWeight:700,
            fontSize:15,border:'none',outline:'none',transition:'all 0.25s',
            fontFamily:"'Creato Display',-apple-system,sans-serif",
            background:isMining?'hsl(0 60% 56%/0.12)':'linear-gradient(135deg,hsl(215 35% 55%),hsl(215 40% 45%))',
            color:isMining?'hsl(0 60% 65%)':'white',
            boxShadow:isMining?'none':'0 4px 20px hsl(215 55% 62%/0.25)',
            border:isMining?'1.5px solid hsl(0 60% 56%/0.3)':'1.5px solid hsl(215 35% 62%/0.4)'}}>
          {isStarting?'Starting...' : isStopping?'Stopping...' : isMining?'■  Stop & Collect' : '▶  Start Mining'}
        </motion.button>

        {earnedPoints > 0 && (
          <motion.button whileTap={{scale:0.97}} onClick={handleClaim}
            disabled={isClaiming}
            style={{width:'100%',padding:'17px',borderRadius:20,cursor:'pointer',fontWeight:700,
              fontSize:15,border:'1.5px solid hsl(155 45% 43%/0.35)',outline:'none',
              background:'linear-gradient(135deg,hsl(155 45% 43%/0.12),hsl(155 45% 43%/0.06))',
              color:'hsl(155 45% 58%)',fontFamily:"'Creato Display',-apple-system,sans-serif"}}>
            <Zap size={16} style={{display:'inline',marginRight:8,verticalAlign:'middle'}}/>
            {isClaiming?'Claiming...':`Claim ${Math.floor(earnedPoints)} ARX-P now`}
          </motion.button>
        )}
      </div>

      {/* ── Total Balance ── */}
      <div style={{padding:'14px 20px 0'}}>
        <GlassCard style={{padding:'16px 20px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <p style={{fontSize:9,textTransform:'uppercase',letterSpacing:'0.14em',color:'hsl(215 14% 35%)',fontWeight:600,marginBottom:5}}>Total Balance</p>
              <div style={{display:'flex',alignItems:'baseline',gap:6}}>
                <span style={{fontSize:26,fontWeight:700,color:'hsl(215 20% 93%)',letterSpacing:'-0.8px'}}>{totalPoints.toLocaleString()}</span>
                <span style={{fontSize:13,fontWeight:600,color:'hsl(215 35% 62%)'}}>ARX-P</span>
              </div>
            </div>
            <div style={{width:50,height:50,borderRadius:16,overflow:'hidden',
              border:'1px solid hsl(215 35% 62%/0.2)',boxShadow:'0 0 16px hsl(215 55% 62%/0.12)'}}>
              <img src={arxonLogo} alt="ARX" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ── Referral Code ── */}
      {referralCode && (
        <div style={{padding:'12px 20px 0'}}>
          <GlassCard style={{padding:'14px 18px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <p style={{fontSize:9,textTransform:'uppercase',letterSpacing:'0.12em',color:'hsl(215 14% 35%)',fontWeight:600,marginBottom:5}}>Your Referral Code</p>
                <p style={{fontSize:16,fontWeight:700,color:'hsl(215 35% 72%)',fontFamily:'monospace',letterSpacing:'0.06em'}}>{referralCode}</p>
              </div>
              <button onClick={copyRef} className="press"
                style={{display:'flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:12,
                  background:'hsl(215 35% 62%/0.1)',border:'1px solid hsl(215 35% 62%/0.2)',
                  color:'hsl(215 35% 62%)',fontSize:12,fontWeight:700,cursor:'pointer',outline:'none'}}>
                <Copy size={13}/>Copy
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      <AuthDialog open={showAuth} onOpenChange={setShowAuth}/>
    </div>
  );
}
