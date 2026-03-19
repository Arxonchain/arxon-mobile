import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { useReferrals } from '@/hooks/useReferrals';
import { useState } from 'react';
import { Copy, Check, Shield, Bell, BookOpen, Settings, LogOut, ChevronRight, Users, Wallet, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const CSS = `
@keyframes strokeDash{0%{stroke-dashoffset:600}100%{stroke-dashoffset:0}}
@keyframes strokeGlow{0%,100%{opacity:.4;stroke-width:1.5}50%{opacity:1;stroke-width:2.5}}
@keyframes shimmerswipe{0%{left:-120%}65%,100%{left:160%}}
@keyframes avatarGlow{0%,100%{box-shadow:0 0 24px rgba(139,174,214,.2)}50%{box-shadow:0 0 36px rgba(139,174,214,.4)}}
`;

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{width:46,height:27,borderRadius:14,background:on?'rgba(93,176,138,.35)':'rgba(139,174,214,.1)',border:`1px solid ${on?'rgba(93,176,138,.5)':'rgba(139,174,214,.15)'}`,position:'relative',cursor:'pointer',transition:'all .25s',flexShrink:0}}>
      <div style={{position:'absolute',top:3,left:on?22:3,width:19,height:19,borderRadius:'50%',background:on?'#5DB08A':'rgba(139,174,214,.4)',transition:'all .25s',boxShadow:on?'0 0 8px rgba(93,176,138,.5)':'none'}}/>
    </div>
  );
}

export default function MobileProfile() {
  const navigate              = useNavigate();
  const { user, signOut }     = useAuth();
  const { points, rank }      = usePoints();
  const { profile }           = useProfile();
  const [copied,  setCopied]  = useState(false);
  const [notifOn, setNotifOn] = useState(true);
  const [mineOn,  setMineOn]  = useState(true);

  const username    = profile?.username || user?.email?.split('@')[0] || 'Miner';
  const totalPoints = Math.round(points?.total_points ?? 0);
  const streakDays  = points?.daily_streak ?? 0;

  const copyReferral = async () => {
    if (!profile?.referral_code) return;
    await navigator.clipboard.writeText(profile.referral_code);
    setCopied(true);
    toast({ title:'Copied!', description:'Referral code copied' });
    setTimeout(() => setCopied(false), 2000);
  };

  const menuItems = [
    { icon: Shield,    label:'Security',       sub:'Password & 2FA',             action:() => navigate('/settings') },
    { icon: Users,     label:'Referrals',      sub:`Earn 100 ARX-P per friend`,  action:() => navigate('/referrals') },
    { icon: Wallet,    label:'Wallet',         sub:'Connect your wallet',        action:() => navigate('/wallet') },
    { icon: BookOpen,  label:'Litepaper',      sub:'Arxon guides & docs',        action:() => navigate('/litepaper') },
    { icon: Settings,  label:'App Settings',   sub:'Preferences & display',      action:() => navigate('/settings') },
  ];

  return (
    <div style={{minHeight:'100vh',background:'#000',fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif",paddingBottom:100}}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{padding:'52px 20px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontSize:21,fontWeight:900,color:'#EEF2F7'}}>Profile</div>
        <button onClick={() => navigate('/notifications')} style={{width:36,height:36,borderRadius:'50%',background:'rgba(139,174,214,.07)',border:'1px solid rgba(139,174,214,.13)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',position:'relative'}}>
          <Bell size={16} color="rgba(139,174,214,.6)"/>
          <div style={{position:'absolute',top:6,right:7,width:7,height:7,borderRadius:'50%',background:'#E06060',border:'1.5px solid #000'}}/>
        </button>
      </div>

      {/* Profile Hero Card */}
      <div style={{margin:'0 16px 14px',position:'relative',borderRadius:24,overflow:'hidden',background:'linear-gradient(145deg,#0c2340 0%,#0a1828 50%,#061220 100%)'}}>
        <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}} viewBox="0 0 311 170" preserveAspectRatio="none">
          <path d="M 16 2 Q 155 -6 295 2" fill="none" stroke="rgba(139,174,214,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600" style={{animation:'strokeDash 3s ease-in-out infinite alternate,strokeGlow 2.5s ease-in-out infinite'}}/>
          <path d="M 16 168 Q 155 176 295 168" fill="none" stroke="rgba(168,196,232,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600" style={{animation:'strokeDash 3s ease-in-out infinite alternate,strokeGlow 2.5s ease-in-out infinite',animationDelay:'.5s'}}/>
        </svg>
        <div style={{position:'absolute',top:0,left:'-120%',width:'50%',height:'100%',background:'linear-gradient(90deg,transparent,rgba(168,196,232,.05),transparent)',animation:'shimmerswipe 5s ease-in-out infinite',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(200,228,255,.2),transparent)',pointerEvents:'none'}}/>
        <div style={{position:'relative',zIndex:5,padding:'24px 20px 0'}}>
          <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
            <div style={{position:'relative',flexShrink:0}}>
              <div style={{width:76,height:76,borderRadius:'50%',background:'linear-gradient(135deg,#1E3A5F,#8BAED6)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:28,color:'#fff',border:'3px solid rgba(139,174,214,.3)',animation:'avatarGlow 3s ease-in-out infinite'}}>
                {username[0]?.toUpperCase()}
              </div>
              <div style={{position:'absolute',bottom:2,right:2,width:18,height:18,borderRadius:'50%',background:'#5DB08A',border:'2px solid #000',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:'white'}}/>
              </div>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:22,fontWeight:900,color:'#fff',letterSpacing:'-.3px'}}>{username}</div>
              <div style={{fontSize:12,color:'rgba(168,196,232,.55)',marginTop:3}}>{user?.email}</div>
              <div style={{display:'flex',gap:6,marginTop:10,flexWrap:'wrap'}}>
                {rank && (
                  <div style={{background:'rgba(200,150,60,.12)',border:'1px solid rgba(200,150,60,.28)',borderRadius:20,padding:'4px 10px'}}>
                    <span style={{fontSize:10,fontWeight:700,color:'#C8963C'}}>Rank #{rank}</span>
                  </div>
                )}
                <div style={{background:'rgba(93,176,138,.1)',border:'1px solid rgba(93,176,138,.22)',borderRadius:20,padding:'4px 10px'}}>
                  <span style={{fontSize:10,fontWeight:700,color:'#5DB08A'}}>🔥 {streakDays}d Streak</span>
                </div>
              </div>
            </div>
          </div>
          {/* Stats row */}
          <div style={{borderTop:'1px solid rgba(139,174,214,.08)',display:'grid',gridTemplateColumns:'1fr 1px 1fr 1px 1fr'}}>
            {[
              {label:'Total ARX-P', val:totalPoints.toLocaleString(), col:'#EEF2F7'},
              null,
              {label:'Daily Streak', val:`${streakDays}d`, col:'#d4884a'},
              null,
              {label:'Rank', val:rank?`#${rank}`:'—', col:'#C8963C'},
            ].map((s,i) => s === null ? (
              <div key={i} style={{background:'rgba(139,174,214,.08)'}}/>
            ) : (
              <div key={i} style={{padding:'14px 0',textAlign:'center'}}>
                <div style={{fontSize:15,fontWeight:900,color:s.col}}>{s.val}</div>
                <div style={{fontSize:9,color:'rgba(139,174,214,.4)',marginTop:3,textTransform:'uppercase',letterSpacing:'.8px',fontWeight:600}}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Referral code card */}
      {profile?.referral_code && (
        <div style={{margin:'0 16px 14px',background:'linear-gradient(135deg,rgba(200,150,60,.08),rgba(200,150,60,.04))',border:'1px solid rgba(200,150,60,.2)',borderRadius:18,padding:'16px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'1px',color:'rgba(200,150,60,.6)',fontWeight:600,marginBottom:6}}>Your Referral Code</div>
              <div style={{fontSize:18,fontWeight:800,color:'#C8963C',letterSpacing:'.08em',fontFamily:'monospace'}}>{profile.referral_code}</div>
              <div style={{fontSize:10,color:'rgba(200,150,60,.5)',marginTop:4}}>Share & earn 100 ARX-P per friend</div>
            </div>
            <motion.button whileTap={{scale:.9}} onClick={copyReferral}
              style={{display:'flex',alignItems:'center',gap:6,padding:'10px 16px',borderRadius:14,background:'rgba(200,150,60,.15)',border:'1px solid rgba(200,150,60,.3)',color:'#C8963C',fontSize:12,fontWeight:700,cursor:'pointer',outline:'none',flexShrink:0}}>
              {copied ? <><Check size={14}/>Copied!</> : <><Copy size={14}/>Copy</>}
            </motion.button>
          </div>
        </div>
      )}

      {/* Notification toggles */}
      <div style={{padding:'0 16px'}}>
        <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'1px',color:'rgba(139,174,214,.3)',fontWeight:600,marginBottom:10}}>Notifications</div>
        {[
          {label:'All Notifications', sub:'Push alerts', on:notifOn, toggle:()=>setNotifOn(n=>!n)},
          {label:'Mining Alerts',     sub:'Session updates', on:mineOn, toggle:()=>setMineOn(n=>!n)},
        ].map((item,i) => (
          <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderRadius:16,marginBottom:6,background:'#0d1117',border:'1px solid rgba(139,174,214,.07)',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{width:36,height:36,borderRadius:12,background:'rgba(139,174,214,.07)',border:'1px solid rgba(139,174,214,.12)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Bell size={16} color="#8BAED6"/>
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'#EEF2F7'}}>{item.label}</div>
                <div style={{fontSize:10,color:'rgba(139,174,214,.4)',marginTop:1}}>{item.sub}</div>
              </div>
            </div>
            <Toggle on={item.on} onToggle={item.toggle}/>
          </div>
        ))}

        {/* Menu items */}
        <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'1px',color:'rgba(139,174,214,.3)',fontWeight:600,marginBottom:10,marginTop:16}}>Account</div>
        {menuItems.map((item, i) => (
          <motion.div key={i} whileTap={{scale:.98}} onClick={item.action}
            style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderRadius:16,marginBottom:6,background:'#0d1117',border:'1px solid rgba(139,174,214,.07)',cursor:'pointer',transition:'border-color .15s'}}>
            <div style={{width:36,height:36,borderRadius:12,background:'rgba(139,174,214,.07)',border:'1px solid rgba(139,174,214,.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <item.icon size={16} color="#8BAED6"/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:'#EEF2F7'}}>{item.label}</div>
              <div style={{fontSize:10,color:'rgba(139,174,214,.4)',marginTop:1}}>{item.sub}</div>
            </div>
            <ChevronRight size={14} color="rgba(139,174,214,.25)"/>
          </motion.div>
        ))}

        {/* Sign out */}
        <motion.button whileTap={{scale:.97}} onClick={() => signOut?.()}
          style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderRadius:16,marginTop:12,background:'rgba(224,96,96,.05)',border:'1px solid rgba(224,96,96,.15)',cursor:'pointer',outline:'none'}}>
          <div style={{width:36,height:36,borderRadius:12,background:'rgba(224,96,96,.08)',border:'1px solid rgba(224,96,96,.18)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <LogOut size={16} color="#E06060"/>
          </div>
          <div style={{fontSize:13,fontWeight:700,color:'#E06060'}}>Sign Out</div>
        </motion.button>
        <div style={{height:10}}/>
      </div>
    </div>
  );
}
