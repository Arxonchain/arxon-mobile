import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { useState } from 'react';
import { Copy, Check, Shield, Bell, BookOpen, Settings, LogOut, ChevronRight, Users, Wallet, Zap, Award, Fingerprint, Moon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const stagger = { hidden:{opacity:0}, show:{opacity:1,transition:{staggerChildren:0.055,delayChildren:0.1}} };
const fadeUp  = { hidden:{opacity:0,y:20}, show:{opacity:1,y:0,transition:{duration:0.45,ease:[0.25,0.46,0.45,0.94]}} };
const scaleIn = { hidden:{opacity:0,scale:0.93}, show:{opacity:1,scale:1,transition:{duration:0.48,ease:[0.25,0.46,0.45,0.94]}} };

function Toggle({ on, onToggle }: { on:boolean; onToggle:()=>void }) {
  return (
    <div onClick={onToggle} style={{
      width:50,height:28,borderRadius:14,cursor:'pointer',position:'relative',flexShrink:0,transition:'all 0.25s',
      background:on?'hsl(155 45% 43% / 0.25)':'hsl(215 22% 12%)',
      border:`1px solid ${on?'hsl(155 45% 43% / 0.45)':'hsl(215 22% 18%)'}`,
    }}>
      <div style={{
        position:'absolute',top:3,left:on?25:3,width:20,height:20,borderRadius:'50%',
        background:on?'hsl(155 45% 48%)':'hsl(215 18% 35%)',
        transition:'all 0.25s',
        boxShadow:on?'0 0 12px hsl(155 45% 43% / 0.55)':'none',
      }}/>
    </div>
  );
}

const MENU = [
  {Icon:Users,     label:'Referrals',   sub:'Earn 100 ARX-P per friend', path:'/referrals', col:'hsl(155 45% 43%)', bg:'hsl(155 45% 43% / 0.1)'},
  {Icon:Wallet,    label:'Wallet',      sub:'Connect your Web3 wallet',  path:'/wallet',    col:'hsl(215 35% 62%)', bg:'hsl(215 35% 62% / 0.1)'},
  {Icon:Shield,    label:'Security',    sub:'Password & 2FA settings',   path:'/settings',  col:'hsl(215 32% 72%)', bg:'hsl(215 32% 72% / 0.1)'},
  {Icon:BookOpen,  label:'Litepaper',   sub:'Guides & documentation',    path:'/litepaper', col:'hsl(215 18% 52%)', bg:'hsl(215 18% 52% / 0.08)'},
  {Icon:Settings,  label:'App Settings',sub:'Preferences & display',    path:'/settings',  col:'hsl(215 18% 45%)', bg:'hsl(215 18% 45% / 0.08)'},
];

export default function MobileProfile() {
  const navigate          = useNavigate();
  const { user, signOut } = useAuth();
  const { points, rank }  = usePoints();
  const { profile }       = useProfile();
  const [copied,  setCopied]  = useState(false);
  const [notif,   setNotif]   = useState(true);
  const [mineN,   setMineN]   = useState(true);

  const username = profile?.username || user?.email?.split('@')[0] || 'Miner';
  const totalPts = Math.round(points?.total_points ?? 0);
  const streak   = points?.daily_streak ?? 0;

  const copyRef = async () => {
    if (!profile?.referral_code) return;
    await navigator.clipboard.writeText(profile.referral_code);
    setCopied(true);
    toast({ title:'Copied!', description:'Referral code copied' });
    setTimeout(()=>setCopied(false),2000);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      style={{fontFamily:"'Space Grotesk','Inter',system-ui,sans-serif",paddingBottom:100,minHeight:'100vh',background:'hsl(225 30% 3%)'}}>

      {/* Header */}
      <motion.div variants={fadeUp} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'52px 20px 0'}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:700,color:'hsl(215 20% 93%)',letterSpacing:'-0.5px'}}>Profile</h1>
          <p style={{fontSize:12,color:'hsl(215 14% 38%)',marginTop:3}}>Account settings</p>
        </div>
        <button onClick={()=>navigate('/notifications')}
          className="glass-card press"
          style={{width:40,height:40,borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',cursor:'pointer'}}>
          <Bell size={17} color="hsl(215 25% 52%)"/>
          <span style={{position:'absolute',top:8,right:9,width:7,height:7,borderRadius:'50%',background:'hsl(0 60% 56%)',border:'2px solid hsl(225 30% 3%)',boxShadow:'0 0 8px hsl(0 60% 56% / 0.6)'}}/>
        </button>
      </motion.div>

      {/* Profile Hero Card */}
      <motion.div variants={scaleIn} style={{margin:'18px 20px 0'}} className="shine">
        <div className="glass-hero" style={{borderRadius:26,overflow:'hidden',position:'relative'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:100,
            background:'linear-gradient(to bottom,hsl(215 35% 62% / 0.06),transparent)',pointerEvents:'none'}}/>
          <div style={{position:'absolute',top:8,right:8,width:120,height:120,borderRadius:'50%',
            background:'radial-gradient(circle,hsl(215 55% 62% / 0.06) 0%,transparent 70%)',pointerEvents:'none'}}/>
          <div style={{position:'relative',zIndex:2,padding:'28px 22px 0'}}>
            {/* Avatar row */}
            <div style={{display:'flex',alignItems:'center',gap:18,marginBottom:24}}>
              <div style={{position:'relative',flexShrink:0}}>
                <motion.div whileHover={{scale:1.04}} whileTap={{scale:0.96}}
                  className="pulse-glow"
                  style={{width:82,height:82,borderRadius:24,
                    background:'linear-gradient(135deg,hsl(215 30% 18%),hsl(215 40% 28%),hsl(215 35% 22%))',
                    border:'2px solid hsl(215 35% 62% / 0.22)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontWeight:700,fontSize:30,color:'hsl(215 20% 93%)',
                    boxShadow:'0 8px 28px hsl(215 55% 62% / 0.15)'}}>
                  {username[0]?.toUpperCase()}
                </motion.div>
                <div style={{position:'absolute',bottom:4,right:4,width:18,height:18,borderRadius:'50%',
                  background:'hsl(155 45% 43%)',border:'2.5px solid hsl(225 30% 3%)',
                  boxShadow:'0 0 10px hsl(155 45% 43% / 0.6)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <div style={{width:6,height:6,borderRadius:'50%',background:'white'}}/>
                </div>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <h2 style={{fontSize:22,fontWeight:700,color:'hsl(215 20% 93%)',letterSpacing:'-0.3px'}}>{username}</h2>
                <p style={{fontSize:11,color:'hsl(215 14% 40%)',marginTop:4}}>{user?.email}</p>
                <div style={{display:'flex',gap:7,marginTop:10,flexWrap:'wrap'}}>
                  {rank && (
                    <div style={{background:'hsl(38 55% 52% / 0.1)',border:'1px solid hsl(38 55% 52% / 0.25)',borderRadius:20,padding:'4px 10px'}}>
                      <span style={{fontSize:10,fontWeight:700,color:'hsl(38 55% 58%)'}}>Rank #{rank}</span>
                    </div>
                  )}
                  <div style={{background:'hsl(155 45% 43% / 0.1)',border:'1px solid hsl(155 45% 43% / 0.22)',borderRadius:20,padding:'4px 10px'}}>
                    <span style={{fontSize:10,fontWeight:700,color:'hsl(155 45% 55%)'}}>🔥 {streak}d Streak</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Stats bar */}
            <div style={{borderTop:'1px solid hsl(215 25% 18%)',display:'grid',gridTemplateColumns:'1fr 1px 1fr 1px 1fr'}}>
              {[
                {label:'ARX-P',  val:totalPts.toLocaleString(), col:'hsl(215 20% 93%)'},
                null,
                {label:'Streak', val:`${streak}d`,              col:'hsl(38 55% 52%)'},
                null,
                {label:'Rank',   val:rank?`#${rank}`:'—',       col:'hsl(38 55% 52%)'},
              ].map((s,i)=>s===null?(
                <div key={i} style={{background:'hsl(215 25% 18%)'}}/>
              ):(
                <div key={i} style={{padding:'16px 0',textAlign:'center'}}>
                  <p style={{fontSize:16,fontWeight:700,color:s.col,letterSpacing:'-0.3px'}}>{s.val}</p>
                  <p style={{fontSize:8,color:'hsl(215 14% 32%)',marginTop:4,textTransform:'uppercase',letterSpacing:'0.12em',fontWeight:600}}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Referral Code */}
      {profile?.referral_code && (
        <motion.div variants={fadeUp} style={{margin:'14px 20px 0'}}>
          <div style={{
            background:'linear-gradient(135deg,hsl(38 55% 52% / 0.1),hsl(38 55% 52% / 0.04))',
            border:'1px solid hsl(38 55% 52% / 0.22)',borderRadius:20,padding:'18px 20px',
          }}>
            <p style={{fontSize:9,textTransform:'uppercase',letterSpacing:'0.16em',color:'hsl(38 55% 52% / 0.6)',fontWeight:700,marginBottom:9}}>Your Referral Code</p>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
              <div>
                <p style={{fontSize:22,fontWeight:700,color:'hsl(38 55% 58%)',letterSpacing:'0.06em',fontFamily:'monospace'}}>{profile.referral_code}</p>
                <p style={{fontSize:11,color:'hsl(38 55% 52% / 0.5)',marginTop:5}}>Share & earn 100 ARX-P per friend</p>
              </div>
              <motion.button whileTap={{scale:0.9}} onClick={copyRef}
                style={{display:'flex',alignItems:'center',gap:6,padding:'10px 18px',borderRadius:14,flexShrink:0,
                  background:'hsl(38 55% 52% / 0.15)',border:'1px solid hsl(38 55% 52% / 0.3)',
                  color:'hsl(38 55% 58%)',fontSize:12,fontWeight:700,cursor:'pointer',outline:'none'}}>
                {copied?<><Check size={14}/>Copied!</>:<><Copy size={14}/>Copy</>}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      <div style={{padding:'20px 20px 0'}}>
        {/* Notifications */}
        <p style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.15em',color:'hsl(215 14% 30%)',fontWeight:700,marginBottom:12}}>Notifications</p>
        {[
          {label:'All Notifications', sub:'Push alerts',     on:notif,  toggle:()=>setNotif(n=>!n)},
          {label:'Mining Alerts',     sub:'Session updates', on:mineN,  toggle:()=>setMineN(n=>!n)},
        ].map((item,i)=>(
          <div key={i} className="glass-card press"
            style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderRadius:18,marginBottom:8}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:38,height:38,borderRadius:13,background:'hsl(215 25% 12%)',border:'1px solid hsl(215 22% 18%)',
                display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Bell size={16} color="hsl(215 25% 48%)"/>
              </div>
              <div>
                <p style={{fontSize:13,fontWeight:600,color:'hsl(215 18% 88%)'}}>{item.label}</p>
                <p style={{fontSize:10,color:'hsl(215 14% 38%)',marginTop:2}}>{item.sub}</p>
              </div>
            </div>
            <Toggle on={item.on} onToggle={item.toggle}/>
          </div>
        ))}

        {/* Account */}
        <p style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.15em',color:'hsl(215 14% 30%)',fontWeight:700,marginBottom:12,marginTop:20}}>Account</p>
        {MENU.map((item,i)=>(
          <motion.div key={i} whileTap={{scale:0.98,x:2}} onClick={()=>navigate(item.path)}
            className="glass-card press card-lift"
            style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderRadius:18,marginBottom:8,cursor:'pointer'}}>
            <div style={{width:40,height:40,borderRadius:13,background:item.bg,flexShrink:0,
              display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${item.col}/0.15`,
              transition:'transform 0.2s'}}>
              <item.Icon size={18} color={item.col}/>
            </div>
            <div style={{flex:1}}>
              <p style={{fontSize:13,fontWeight:600,color:'hsl(215 18% 88%)'}}>{item.label}</p>
              <p style={{fontSize:10,color:'hsl(215 14% 38%)',marginTop:2}}>{item.sub}</p>
            </div>
            <ChevronRight size={15} color="hsl(215 14% 30%)"/>
          </motion.div>
        ))}

        {/* Sign Out */}
        <motion.button whileTap={{scale:0.97}} onClick={()=>signOut?.()}
          className="press"
          style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderRadius:18,marginTop:12,
            background:'hsl(0 60% 56% / 0.05)',border:'1px solid hsl(0 60% 56% / 0.14)',cursor:'pointer',outline:'none'}}>
          <div style={{width:40,height:40,borderRadius:13,background:'hsl(0 60% 56% / 0.08)',
            border:'1px solid hsl(0 60% 56% / 0.16)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <LogOut size={17} color="hsl(0 60% 60%)"/>
          </div>
          <span style={{fontSize:13,fontWeight:600,color:'hsl(0 60% 62%)'}}>Sign Out</span>
        </motion.button>
        <div style={{height:24}}/>
      </div>
    </motion.div>
  );
}
