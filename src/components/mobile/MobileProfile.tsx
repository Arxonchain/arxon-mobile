import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { useState } from 'react';
import { Copy, Check, Shield, Bell, BookOpen, Settings, LogOut, ChevronRight, Users, Wallet } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const CSS = `
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
@keyframes shimmer{0%{left:-100%}100%{left:200%}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes avatarGlow{0%,100%{box-shadow:0 0 20px rgba(139,174,214,.15)}50%{box-shadow:0 0 36px rgba(139,174,214,.35)}}
`;

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{ width:48, height:28, borderRadius:14,
      background: on ? 'rgba(93,176,138,.25)' : 'rgba(139,174,214,.08)',
      border:`1px solid ${on?'rgba(93,176,138,.4)':'rgba(139,174,214,.12)'}`,
      position:'relative', cursor:'pointer', transition:'all .25s', flexShrink:0 }}>
      <div style={{ position:'absolute', top:3, left: on ? 23 : 3, width:20, height:20,
        borderRadius:'50%', background: on ? '#5DB08A' : 'rgba(139,174,214,.3)',
        transition:'all .25s', boxShadow: on ? '0 0 10px rgba(93,176,138,.45)' : 'none' }}/>
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ position:'relative', borderRadius:22, overflow:'hidden',
      background:'linear-gradient(145deg,#0c1e38,#091525,#050e1a)', ...style }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
        background:'linear-gradient(90deg,transparent,rgba(200,228,255,.12),transparent)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', top:0, left:'-100%', width:'60%', height:'100%',
        background:'linear-gradient(90deg,transparent,rgba(168,196,232,.04),transparent)',
        animation:'shimmer 6s ease-in-out infinite', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', inset:0, borderRadius:22, border:'1px solid rgba(139,174,214,.12)', pointerEvents:'none' }}/>
      <div style={{ position:'relative', zIndex:2 }}>{children}</div>
    </div>
  );
}

export default function MobileProfile() {
  const navigate            = useNavigate();
  const { user, signOut }   = useAuth();
  const { points, rank }    = usePoints();
  const { profile }         = useProfile();
  const [copied, setCopied] = useState(false);
  const [notif,  setNotif]  = useState(true);
  const [mine,   setMine]   = useState(true);

  const username    = profile?.username || user?.email?.split('@')[0] || 'Miner';
  const totalPoints = Math.round(points?.total_points ?? 0);
  const streakDays  = points?.daily_streak ?? 0;

  const copyRef = async () => {
    if (!profile?.referral_code) return;
    await navigator.clipboard.writeText(profile.referral_code);
    setCopied(true);
    toast({ title:'Copied!', description:'Referral code copied' });
    setTimeout(()=>setCopied(false),2000);
  };

  const menu = [
    { icon:Users,   label:'Referrals',    sub:'Earn 100 ARX-P per friend',   path:'/referrals' },
    { icon:Wallet,  label:'Wallet',       sub:'Connect your wallet',          path:'/wallet' },
    { icon:Shield,  label:'Security',     sub:'Password & 2FA settings',      path:'/settings' },
    { icon:BookOpen,label:'Litepaper',    sub:'Guides & documentation',       path:'/litepaper' },
    { icon:Settings,label:'App Settings', sub:'Preferences & display',        path:'/settings' },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'#000', fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif", paddingBottom:100 }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ padding:'52px 24px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:28, fontWeight:900, color:'#EEF2F7', letterSpacing:'-.5px' }}>Profile</div>
        <button onClick={()=>navigate('/notifications')}
          style={{ width:40, height:40, borderRadius:'50%', background:'rgba(139,174,214,.07)', border:'1px solid rgba(139,174,214,.12)',
            display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}>
          <Bell size={16} color="rgba(139,174,214,.6)"/>
          <div style={{ position:'absolute', top:7, right:8, width:8, height:8, borderRadius:'50%', background:'#E06060', border:'2px solid #000' }}/>
        </button>
      </div>

      {/* Profile Hero */}
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:.05 }}
        style={{ margin:'20px 24px 0' }}>
        <Card>
          <div style={{ padding:'24px 20px 0' }}>
            {/* Avatar row */}
            <div style={{ display:'flex', alignItems:'center', gap:18, marginBottom:22 }}>
              <div style={{ position:'relative', flexShrink:0 }}>
                <div style={{ width:80, height:80, borderRadius:'50%',
                  background:'linear-gradient(135deg,#1E3A5F,#2a4a7c,#8BAED6)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:900, fontSize:30, color:'#fff',
                  border:'2px solid rgba(139,174,214,.25)', animation:'avatarGlow 4s ease-in-out infinite' }}>
                  {username[0]?.toUpperCase()}
                </div>
                <div style={{ position:'absolute', bottom:3, right:3, width:18, height:18, borderRadius:'50%',
                  background:'#5DB08A', border:'2.5px solid #050e1a',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'white' }}/>
                </div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:24, fontWeight:900, color:'#fff', letterSpacing:'-.3px' }}>{username}</div>
                <div style={{ fontSize:11, color:'rgba(168,196,232,.5)', marginTop:4 }}>{user?.email}</div>
                <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
                  {rank && (
                    <div style={{ background:'rgba(200,150,60,.1)', border:'1px solid rgba(200,150,60,.25)', borderRadius:20, padding:'4px 10px' }}>
                      <span style={{ fontSize:10, fontWeight:700, color:'#C8963C' }}>Rank #{rank}</span>
                    </div>
                  )}
                  <div style={{ background:'rgba(93,176,138,.08)', border:'1px solid rgba(93,176,138,.2)', borderRadius:20, padding:'4px 10px' }}>
                    <span style={{ fontSize:10, fontWeight:700, color:'#5DB08A' }}>🔥 {streakDays}d Streak</span>
                  </div>
                </div>
              </div>
            </div>
            {/* Stats */}
            <div style={{ borderTop:'1px solid rgba(139,174,214,.08)', display:'grid', gridTemplateColumns:'1fr 1px 1fr 1px 1fr' }}>
              {[
                { label:'Total ARX-P', val:totalPoints.toLocaleString(), col:'#EEF2F7' },
                null,
                { label:'Streak',      val:`${streakDays}d`,             col:'#d4884a' },
                null,
                { label:'Rank',        val:rank?`#${rank}`:'—',          col:'#C8963C' },
              ].map((s,i) => s===null ? (
                <div key={i} style={{ background:'rgba(139,174,214,.08)' }}/>
              ) : (
                <div key={i} style={{ padding:'16px 0', textAlign:'center' }}>
                  <div style={{ fontSize:16, fontWeight:900, color:s.col }}>{s.val}</div>
                  <div style={{ fontSize:8, color:'rgba(139,174,214,.35)', marginTop:4, textTransform:'uppercase', letterSpacing:'.8px', fontWeight:600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Referral Code */}
      {profile?.referral_code && (
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:.1 }}
          style={{ margin:'14px 24px 0', background:'linear-gradient(135deg,rgba(200,150,60,.08),rgba(200,150,60,.04))',
            border:'1px solid rgba(200,150,60,.2)', borderRadius:20, padding:'18px 20px' }}>
          <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'1.2px', color:'rgba(200,150,60,.55)', fontWeight:700, marginBottom:8 }}>Your Referral Code</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
            <div>
              <div style={{ fontSize:22, fontWeight:900, color:'#C8963C', letterSpacing:'.08em', fontFamily:'monospace' }}>{profile.referral_code}</div>
              <div style={{ fontSize:11, color:'rgba(200,150,60,.45)', marginTop:5 }}>Share & earn 100 ARX-P per friend</div>
            </div>
            <motion.button whileTap={{ scale:.9 }} onClick={copyRef}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'11px 18px', borderRadius:14,
                background:'rgba(200,150,60,.15)', border:'1px solid rgba(200,150,60,.3)',
                color:'#C8963C', fontSize:12, fontWeight:700, cursor:'pointer', outline:'none', flexShrink:0 }}>
              {copied ? <><Check size={14}/>Copied!</> : <><Copy size={14}/>Copy</>}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Notifications */}
      <div style={{ padding:'24px 24px 0' }}>
        <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'1.2px', color:'rgba(139,174,214,.3)', fontWeight:700, marginBottom:12 }}>Notifications</div>
        {[
          { label:'All Notifications', sub:'Push alerts',      on:notif, toggle:()=>setNotif(n=>!n) },
          { label:'Mining Alerts',     sub:'Session updates',  on:mine,  toggle:()=>setMine(n=>!n)  },
        ].map((item,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px',
            borderRadius:18, marginBottom:8, background:'rgba(13,17,23,.9)', border:'1px solid rgba(139,174,214,.07)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:38, height:38, borderRadius:13, background:'rgba(139,174,214,.07)',
                border:'1px solid rgba(139,174,214,.11)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Bell size={16} color="rgba(139,174,214,.55)"/>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:'#EEF2F7' }}>{item.label}</div>
                <div style={{ fontSize:10, color:'rgba(139,174,214,.35)', marginTop:2 }}>{item.sub}</div>
              </div>
            </div>
            <Toggle on={item.on} onToggle={item.toggle}/>
          </div>
        ))}

        {/* Account menu */}
        <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'1.2px', color:'rgba(139,174,214,.3)', fontWeight:700, marginBottom:12, marginTop:20 }}>Account</div>
        {menu.map((item,i) => (
          <motion.div key={i} whileTap={{ scale:.98 }} onClick={()=>navigate(item.path)}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:18, marginBottom:8,
              background:'rgba(13,17,23,.9)', border:'1px solid rgba(139,174,214,.07)', cursor:'pointer' }}>
            <div style={{ width:38, height:38, borderRadius:13, background:'rgba(139,174,214,.07)',
              border:'1px solid rgba(139,174,214,.11)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <item.icon size={16} color="rgba(139,174,214,.55)"/>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#EEF2F7' }}>{item.label}</div>
              <div style={{ fontSize:10, color:'rgba(139,174,214,.35)', marginTop:2 }}>{item.sub}</div>
            </div>
            <ChevronRight size={14} color="rgba(139,174,214,.2)"/>
          </motion.div>
        ))}

        {/* Sign Out */}
        <motion.button whileTap={{ scale:.97 }} onClick={()=>signOut?.()}
          style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:18, marginTop:10,
            background:'rgba(224,96,96,.04)', border:'1px solid rgba(224,96,96,.12)', cursor:'pointer', outline:'none' }}>
          <div style={{ width:38, height:38, borderRadius:13, background:'rgba(224,96,96,.07)',
            border:'1px solid rgba(224,96,96,.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <LogOut size={16} color="rgba(224,96,96,.7)"/>
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:'rgba(224,96,96,.8)' }}>Sign Out</div>
        </motion.button>
        <div style={{ height:20 }}/>
      </div>
    </div>
  );
}
