import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { useAdmin } from '@/hooks/useAdmin';
import { useState, useRef, useEffect } from 'react';
import {
  Copy, Check, Shield, Bell, BookOpen, Settings, LogOut,
  ChevronRight, ChevronLeft, Users, Wallet, Camera,
  LayoutDashboard, Trophy, History, Scale, User2,
  CalendarDays, FileDown, Globe, Zap, Fingerprint,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import InAppNotificationBell from '@/components/mobile/InAppNotificationBell';
import { useBiometric } from '@/hooks/useBiometric';

const stagger = { hidden:{opacity:0}, show:{opacity:1,transition:{staggerChildren:0.05,delayChildren:0.08}} };
const fadeUp  = { hidden:{opacity:0,y:20}, show:{opacity:1,y:0,transition:{duration:0.42,ease:[0.25,0.46,0.45,0.94]}} };
const scaleIn = { hidden:{opacity:0,scale:0.93}, show:{opacity:1,scale:1,transition:{duration:0.45,ease:[0.25,0.46,0.45,0.94]}} };

function Toggle({ on, onToggle }: { on:boolean; onToggle:()=>void }) {
  return (
    <div onClick={onToggle} style={{width:50,height:28,borderRadius:14,cursor:'pointer',
      position:'relative',flexShrink:0,transition:'all 0.25s',
      background:on?'hsl(155 45% 43%/0.25)':'hsl(215 22% 12%)',
      border:`1px solid ${on?'hsl(155 45% 43%/0.45)':'hsl(215 22% 18%)'}`}}>
      <div style={{position:'absolute',top:3,left:on?25:3,width:20,height:20,borderRadius:'50%',
        background:on?'hsl(155 45% 48%)':'hsl(215 18% 35%)',transition:'all 0.25s',
        boxShadow:on?'0 0 12px hsl(155 45% 43%/0.55)':'none'}}/>
    </div>
  );
}

const MENU = [
  {Icon:Users,   label:'Referrals',    sub:'Earn 100 ARX-P per friend', path:'/referrals', col:'hsl(155 45% 43%)', bg:'hsl(155 45% 43%/0.1)'},
  {Icon:Wallet,  label:'Wallet',       sub:'Connect your Web3 wallet',  path:'/wallet',    col:'hsl(215 35% 62%)', bg:'hsl(215 35% 62%/0.1)'},
  {Icon:Shield,  label:'Security',     sub:'Password & 2FA settings',   path:'/settings',  col:'hsl(215 32% 72%)', bg:'hsl(215 32% 72%/0.1)'},
  {Icon:BookOpen,label:'Litepaper',    sub:'Guides & documentation',    path:'/litepaper', col:'hsl(215 18% 52%)', bg:'hsl(215 18% 52%/0.08)'},
  {Icon:Settings,label:'App Settings', sub:'Preferences & display',     path:'/settings',  col:'hsl(215 18% 45%)', bg:'hsl(215 18% 45%/0.08)'},
];

const ADMIN_MENU = [
  { Icon:LayoutDashboard, label:'Dashboard',       sub:'Platform overview & stats',   path:'/admin',                col:'hsl(215 35% 62%)', bg:'hsl(215 35% 62%/0.12)' },
  { Icon:User2,           label:'Users & Miners',  sub:'Manage all users',            path:'/admin/users',          col:'hsl(155 45% 50%)', bg:'hsl(155 45% 50%/0.1)'  },
  { Icon:Trophy,          label:'Arena Markets',   sub:'Create & manage battles',     path:'/admin/arena',          col:'hsl(255 50% 65%)', bg:'hsl(255 50% 65%/0.1)'  },
  { Icon:History,         label:'Battle History',  sub:'Resolved arena battles',      path:'/admin/battle-history', col:'hsl(38 55% 52%)',  bg:'hsl(38 55% 52%/0.1)'   },
  { Icon:CalendarDays,    label:'Daily Signups',   sub:'Signup analytics',            path:'/admin/signups',        col:'hsl(215 35% 62%)', bg:'hsl(215 35% 62%/0.1)'  },
  { Icon:Zap,             label:'Mining Controls', sub:'Block reward & claiming',     path:'/admin/controls',       col:'hsl(38 55% 52%)',  bg:'hsl(38 55% 52%/0.1)'   },
  { Icon:Scale,           label:'Reconciliation',  sub:'Points reconciliation',       path:'/admin/reconciliation', col:'hsl(155 45% 50%)', bg:'hsl(155 45% 50%/0.1)'  },
  { Icon:FileDown,        label:'Export Filter',   sub:'Export user data',            path:'/admin/export-filter',  col:'hsl(215 18% 52%)', bg:'hsl(215 18% 52%/0.08)' },
  { Icon:Globe,           label:'Global Map',      sub:'Worldwide miner activity',    path:'/admin/global-map',     col:'hsl(155 45% 43%)', bg:'hsl(155 45% 43%/0.1)'  },
];

// Admin email — only this account sees the admin panel
const ADMIN_EMAIL = 'gabemetax@gmail.com';

export default function MobileProfile() {
  const navigate                    = useNavigate();
  const { user, signOut }           = useAuth();
  const { points, rank }            = usePoints();
  const { profile, refetchProfile } = useProfile();
  const { isAdmin }                 = useAdmin();
  const { supported: bioSupported, enabled: bioEnabled,
          enableBiometric, disableBiometric } = useBiometric();

  const [copied,      setCopied]      = useState(false);
  const [notif,       setNotif]       = useState(true);
  const [mineN,       setMineN]       = useState(true);
  const [uploading,   setUploading]   = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [xHandle,     setXHandle]     = useState('');
  const [editingX,    setEditingX]    = useState(false);
  const [savingX,     setSavingX]     = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const username  = profile?.username || user?.email?.split('@')[0] || 'Miner';
  const totalPts  = Math.round(points?.total_points ?? 0);
  const streak    = points?.daily_streak ?? 0;
  const avatarUrl = profile?.avatar_url;

  // Check admin by email match OR by role in DB
  useEffect(() => {
    const emailMatch = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    setIsAdminUser(emailMatch || isAdmin);
  }, [user, isAdmin]);

  // Load x_handle from profile
  useEffect(() => {
    if ((profile as any)?.x_handle) setXHandle((profile as any).x_handle);
  }, [profile]);

  const saveXHandle = async () => {
    if (!user) return;
    setSavingX(true);
    try {
      const handle = xHandle.replace('@','').trim();
      const { error } = await supabase.from('profiles')
        .update({ x_handle: handle || null } as any)
        .eq('user_id', user.id);
      if (error) throw error;
      await refetchProfile();
      setEditingX(false);
      toast({ title: 'Saved!', description: handle ? `@${handle} linked` : 'X handle removed' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSavingX(false); }
  };

  const copyRef = async () => {
    if (!profile?.referral_code) return;
    await navigator.clipboard.writeText(profile.referral_code);
    setCopied(true);
    toast({ title:'Copied!', description:'Referral code copied' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) {
      toast({ title:'Invalid file', description:'Please select an image', variant:'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title:'Too large', description:'Max 2MB', variant:'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext      = file.name.split('.').pop();
      const filePath = `${user.id}/${user.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(filePath, file, { upsert:true, contentType:file.type });
      if (upErr) throw upErr;
      const { data:{ publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const { error: dbErr } = await supabase.from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      if (dbErr) throw dbErr;
      await refetchProfile();
      toast({ title:'Profile updated!', description:'Avatar saved successfully' });
    } catch (err: any) {
      toast({ title:'Upload failed', description:err.message, variant:'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show"
      style={{minHeight:'100vh', background:'hsl(225 30% 3%)', paddingBottom:100,
        fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif"}}>

      {/* Header */}
      <motion.div variants={fadeUp}
        style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'52px 20px 0'}}>
        <button onClick={() => navigate(-1)} className="press"
          style={{width:40, height:40, borderRadius:14, background:'hsl(215 25% 11%)',
            border:'1px solid hsl(215 22% 18%)', display:'flex', alignItems:'center',
            justifyContent:'center', cursor:'pointer'}}>
          <ChevronLeft size={20} color="hsl(215 25% 55%)"/>
        </button>
        <div style={{textAlign:'center'}}>
          <h1 style={{fontSize:19, fontWeight:700, color:'hsl(215 20% 93%)'}}>Profile</h1>
          <p style={{fontSize:10, color:'hsl(215 14% 38%)', marginTop:2}}>Account settings</p>
        </div>
        <InAppNotificationBell />
      </motion.div>

      {/* Profile Hero Card */}
      <motion.div variants={scaleIn} style={{margin:'18px 20px 0'}} className="shine">
        <div className="glass-hero" style={{borderRadius:26, overflow:'hidden', position:'relative'}}>
          <div style={{position:'absolute', top:0, left:0, right:0, height:100,
            background:'linear-gradient(to bottom,hsl(215 35% 62%/0.06),transparent)', pointerEvents:'none'}}/>
          <div style={{position:'relative', zIndex:2, padding:'28px 22px 0'}}>
            <div style={{display:'flex', alignItems:'center', gap:18, marginBottom:24}}>
              {/* Avatar */}
              <div style={{position:'relative', flexShrink:0}}>
                <div className="pulse-glow"
                  style={{width:82, height:82, borderRadius:24, overflow:'hidden',
                    border:'2px solid hsl(215 35% 62%/0.22)',
                    boxShadow:'0 8px 28px hsl(215 55% 62%/0.15)', cursor:'pointer'}}
                  onClick={() => fileRef.current?.click()}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}}/>
                    : <div style={{width:'100%', height:'100%',
                        background:'linear-gradient(135deg,hsl(215 30% 18%),hsl(215 40% 28%),hsl(215 35% 22%))',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontWeight:700, fontSize:30, color:'hsl(215 20% 93%)'}}>
                        {username[0]?.toUpperCase()}
                      </div>
                  }
                  <div style={{position:'absolute', inset:0, background:'hsl(225 30% 3%/0.5)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    opacity:uploading?1:0, transition:'opacity 0.2s'}}>
                    {uploading
                      ? <div style={{width:20, height:20, borderRadius:'50%',
                          border:'2px solid hsl(215 35% 62%/0.3)',
                          borderTopColor:'hsl(215 35% 62%)', animation:'spin 1s linear infinite'}}/>
                      : <Camera size={18} color="white"/>}
                  </div>
                </div>
                <div onClick={() => fileRef.current?.click()}
                  style={{position:'absolute', bottom:-2, right:-2, width:24, height:24, borderRadius:8,
                    background:'hsl(215 35% 55%)', border:'2px solid hsl(225 30% 3%)',
                    display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer'}}>
                  <Camera size={11} color="white"/>
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{display:'none'}}/>
              </div>

              <div style={{flex:1, minWidth:0}}>
                <h2 style={{fontSize:22, fontWeight:700, color:'hsl(215 20% 93%)', letterSpacing:'-0.3px'}}>{username}</h2>
                <p style={{fontSize:11, color:'hsl(215 14% 40%)', marginTop:4}}>{user?.email}</p>
                <div style={{display:'flex', gap:7, marginTop:10, flexWrap:'wrap'}}>
                  {rank && (
                    <div style={{background:'hsl(38 55% 52%/0.1)', border:'1px solid hsl(38 55% 52%/0.25)', borderRadius:20, padding:'4px 10px'}}>
                      <span style={{fontSize:10, fontWeight:700, color:'hsl(38 55% 58%)'}}>Rank #{rank}</span>
                    </div>
                  )}
                  <div style={{background:'hsl(155 45% 43%/0.1)', border:'1px solid hsl(155 45% 43%/0.22)', borderRadius:20, padding:'4px 10px'}}>
                    <span style={{fontSize:10, fontWeight:700, color:'hsl(155 45% 55%)'}}>🔥 {streak}d Streak</span>
                  </div>
                  {/* Admin badge */}
                  {isAdminUser && (
                    <div style={{background:'hsl(255 50% 60%/0.12)', border:'1px solid hsl(255 50% 60%/0.3)', borderRadius:20, padding:'4px 10px'}}>
                      <span style={{fontSize:10, fontWeight:700, color:'hsl(255 50% 72%)'}}>⚡ Admin</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats bar */}
            <div style={{borderTop:'1px solid hsl(215 25% 18%)', display:'grid', gridTemplateColumns:'1fr 1px 1fr 1px 1fr'}}>
              {[
                {label:'ARX-P',  val:totalPts.toLocaleString(), col:'hsl(215 20% 93%)'},
                null,
                {label:'Streak', val:`${streak}d`,              col:'hsl(38 55% 52%)'},
                null,
                {label:'Rank',   val:rank?`#${rank}`:'—',       col:'hsl(38 55% 52%)'},
              ].map((s,i) => s === null ? (
                <div key={i} style={{background:'hsl(215 25% 18%)'}}/>
              ) : (
                <div key={i} style={{padding:'16px 0', textAlign:'center'}}>
                  <p style={{fontSize:16, fontWeight:700, color:s.col, letterSpacing:'-0.3px'}}>{s.val}</p>
                  <p style={{fontSize:8, color:'hsl(215 14% 32%)', marginTop:4,
                    textTransform:'uppercase', letterSpacing:'0.12em', fontWeight:600}}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Referral Code */}
      {profile?.referral_code && (
        <motion.div variants={fadeUp} style={{margin:'14px 20px 0'}}>
          <div style={{background:'linear-gradient(135deg,hsl(38 55% 52%/0.1),hsl(38 55% 52%/0.04))',
            border:'1px solid hsl(38 55% 52%/0.22)', borderRadius:20, padding:'18px 20px'}}>
            <p style={{fontSize:9, textTransform:'uppercase', letterSpacing:'0.16em',
              color:'hsl(38 55% 52%/0.6)', fontWeight:700, marginBottom:9}}>Your Referral Code</p>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
              <div>
                <p style={{fontSize:22, fontWeight:700, color:'hsl(38 55% 58%)', letterSpacing:'0.06em', fontFamily:'monospace'}}>
                  {profile.referral_code}
                </p>
                <p style={{fontSize:11, color:'hsl(38 55% 52%/0.5)', marginTop:5}}>Share & earn 100 ARX-P per friend</p>
              </div>
              <motion.button whileTap={{scale:0.9}} onClick={copyRef}
                style={{display:'flex', alignItems:'center', gap:6, padding:'10px 18px', borderRadius:14, flexShrink:0,
                  background:'hsl(38 55% 52%/0.15)', border:'1px solid hsl(38 55% 52%/0.3)',
                  color:'hsl(38 55% 58%)', fontSize:12, fontWeight:700, cursor:'pointer', outline:'none'}}>
                {copied ? <><Check size={14}/>Copied!</> : <><Copy size={14}/>Copy</>}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      <div style={{padding:'20px 20px 0'}}>

        {/* ── X Handle Section ── */}
        <motion.div variants={fadeUp} style={{marginBottom:20}}>
          <div style={{background:'hsl(215 25% 9%)', border:'1px solid hsl(215 22% 16%)',
            borderRadius:20, padding:'16px 18px'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: editingX ? 12 : 0}}>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                {/* X logo */}
                <div style={{width:36, height:36, borderRadius:11, background:'hsl(215 25% 12%)',
                  border:'1px solid hsl(215 22% 18%)', display:'flex', alignItems:'center',
                  justifyContent:'center', flexShrink:0}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.733-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <div>
                  <p style={{fontSize:13, fontWeight:600, color:'hsl(215 18% 88%)'}}>X (Twitter)</p>
                  <p style={{fontSize:10, color:'hsl(215 14% 38%)', marginTop:1}}>
                    {(profile as any)?.x_handle ? `@${(profile as any).x_handle}` : 'Not linked'}
                  </p>
                </div>
              </div>
              <button onClick={() => setEditingX(e => !e)}
                style={{padding:'6px 14px', borderRadius:12, fontSize:11, fontWeight:700,
                  background: editingX ? 'hsl(215 25% 14%)' : 'hsl(215 35% 62%/0.12)',
                  border:`1px solid ${editingX ? 'hsl(215 22% 20%)' : 'hsl(215 35% 62%/0.25)'}`,
                  color: editingX ? 'hsl(215 18% 45%)' : 'hsl(215 35% 62%)',
                  cursor:'pointer', outline:'none'}}>
                {editingX ? 'Cancel' : (profile as any)?.x_handle ? 'Edit' : 'Link'}
              </button>
            </div>
            {editingX && (
              <div style={{display:'flex', gap:8}}>
                <div style={{flex:1, display:'flex', alignItems:'center', gap:8,
                  background:'hsl(215 25% 12%)', border:'1px solid hsl(215 22% 18%)',
                  borderRadius:12, padding:'10px 14px'}}>
                  <span style={{fontSize:14, fontWeight:700, color:'hsl(215 35% 55%)'}}>@</span>
                  <input value={xHandle} onChange={e => setXHandle(e.target.value)}
                    placeholder="yourhandle"
                    style={{flex:1, background:'none', border:'none', outline:'none',
                      fontSize:14, color:'hsl(215 18% 88%)',
                      fontFamily:"'Creato Display',-apple-system,sans-serif"}}/>
                </div>
                <button onClick={saveXHandle} disabled={savingX}
                  style={{padding:'10px 16px', borderRadius:12, fontSize:12, fontWeight:700,
                    background:'hsl(215 35% 55%)', border:'none',
                    color:'white', cursor:'pointer', outline:'none', flexShrink:0}}>
                  {savingX ? '...' : 'Save'}
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── ADMIN CONTROL PANEL (only for gabemetax@gmail.com) ── */}
        {isAdminUser && (
          <motion.div variants={fadeUp}>
            {/* Admin header */}
            <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:14}}>
              <div style={{flex:1, height:1, background:'hsl(255 50% 60%/0.2)'}}/>
              <div style={{display:'flex', alignItems:'center', gap:6,
                background:'hsl(255 50% 60%/0.08)', border:'1px solid hsl(255 50% 60%/0.25)',
                borderRadius:20, padding:'5px 14px'}}>
                <span style={{fontSize:14}}>⚡</span>
                <span style={{fontSize:10, fontWeight:700, color:'hsl(255 50% 72%)',
                  textTransform:'uppercase', letterSpacing:'0.14em'}}>Admin Control Panel</span>
              </div>
              <div style={{flex:1, height:1, background:'hsl(255 50% 60%/0.2)'}}/>
            </div>

            {/* Admin menu items */}
            <div style={{background:'hsl(255 50% 60%/0.04)', border:'1px solid hsl(255 50% 60%/0.12)',
              borderRadius:22, padding:'4px 0', marginBottom:24}}>
              {ADMIN_MENU.map((item, i) => (
                <motion.div key={i} whileTap={{scale:0.98, x:2}}
                  onClick={() => navigate(item.path)}
                  style={{display:'flex', alignItems:'center', gap:12, padding:'13px 16px',
                    cursor:'pointer', borderBottom: i < ADMIN_MENU.length - 1 ? '1px solid hsl(255 50% 60%/0.06)' : 'none'}}>
                  <div style={{width:38, height:38, borderRadius:13, background:item.bg,
                    border:`1px solid ${item.col}22`, flexShrink:0,
                    display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <item.Icon size={17} color={item.col}/>
                  </div>
                  <div style={{flex:1, minWidth:0}}>
                    <p style={{fontSize:13, fontWeight:600, color:'hsl(215 18% 88%)'}}>{item.label}</p>
                    <p style={{fontSize:10, color:'hsl(215 14% 38%)', marginTop:1}}>{item.sub}</p>
                  </div>
                  <ChevronRight size={14} color="hsl(255 50% 55%)"/>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Notifications */}
        <p style={{fontSize:10, textTransform:'uppercase', letterSpacing:'0.15em',
          color:'hsl(215 14% 30%)', fontWeight:700, marginBottom:12}}>Notifications</p>
        {[
          {label:'All Notifications', sub:'Push alerts',     on:notif, toggle:() => setNotif(n => !n)},
          {label:'Mining Alerts',     sub:'Session updates', on:mineN, toggle:() => setMineN(n => !n)},
        ].map((item, i) => (
          <div key={i} className="glass-card press"
            style={{display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'14px 16px', borderRadius:18, marginBottom:8}}>
            <div style={{display:'flex', alignItems:'center', gap:12}}>
              <div style={{width:38, height:38, borderRadius:13, background:'hsl(215 25% 12%)',
                border:'1px solid hsl(215 22% 18%)', display:'flex', alignItems:'center',
                justifyContent:'center', flexShrink:0}}>
                <Bell size={16} color="hsl(215 25% 48%)"/>
              </div>
              <div>
                <p style={{fontSize:13, fontWeight:600, color:'hsl(215 18% 88%)'}}>{item.label}</p>
                <p style={{fontSize:10, color:'hsl(215 14% 38%)', marginTop:2}}>{item.sub}</p>
              </div>
            </div>
            <Toggle on={item.on} onToggle={item.toggle}/>
          </div>
        ))}

        {/* Biometric Security */}
        {bioSupported && (
          <>
            <p style={{fontSize:10, textTransform:'uppercase', letterSpacing:'0.15em',
              color:'hsl(215 14% 30%)', fontWeight:700, marginBottom:12, marginTop:20}}>Security</p>
            <div className="glass-card press"
              style={{display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'14px 16px', borderRadius:18, marginBottom:8}}>
              <div style={{display:'flex', alignItems:'center', gap:12}}>
                <div style={{width:38, height:38, borderRadius:13,
                  background: bioEnabled ? 'hsl(155 45% 43%/0.12)' : 'hsl(215 25% 12%)',
                  border:`1px solid ${bioEnabled ? 'hsl(155 45% 43%/0.3)' : 'hsl(215 22% 18%)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                  <Fingerprint size={18} color={bioEnabled ? 'hsl(155 45% 50%)' : 'hsl(215 25% 48%)'}/>
                </div>
                <div>
                  <p style={{fontSize:13, fontWeight:600, color:'hsl(215 18% 88%)'}}>
                    Biometric Lock
                  </p>
                  <p style={{fontSize:10, color:'hsl(215 14% 38%)', marginTop:2}}>
                    {bioEnabled ? 'App locked with fingerprint/face' : 'Lock app with fingerprint or face ID'}
                  </p>
                </div>
              </div>
              <Toggle on={bioEnabled} onToggle={async () => {
                if (bioEnabled) {
                  disableBiometric();
                  toast({ title:'Biometric disabled', description:'App lock removed' });
                } else {
                  const ok = await enableBiometric();
                  if (ok) toast({ title:'Biometric enabled! 🔐', description:'App will lock when you leave' });
                  else    toast({ title:'Setup failed', description:'Biometric not available on this device', variant:'destructive' });
                }
              }}/>
            </div>
          </>
        )}

        {/* Account */}
        <p style={{fontSize:10, textTransform:'uppercase', letterSpacing:'0.15em',
          color:'hsl(215 14% 30%)', fontWeight:700, marginBottom:12, marginTop:20}}>Account</p>
        {MENU.map((item, i) => (
          <motion.div key={i} whileTap={{scale:0.98, x:2}} onClick={() => navigate(item.path)}
            className="glass-card press card-lift"
            style={{display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
              borderRadius:18, marginBottom:8, cursor:'pointer'}}>
            <div style={{width:40, height:40, borderRadius:13, background:item.bg,
              flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center'}}>
              <item.Icon size={18} color={item.col}/>
            </div>
            <div style={{flex:1}}>
              <p style={{fontSize:13, fontWeight:600, color:'hsl(215 18% 88%)'}}>{item.label}</p>
              <p style={{fontSize:10, color:'hsl(215 14% 38%)', marginTop:2}}>{item.sub}</p>
            </div>
            <ChevronRight size={15} color="hsl(215 14% 30%)"/>
          </motion.div>
        ))}

        {/* Sign Out */}
        <motion.button whileTap={{scale:0.97}} onClick={() => signOut?.()}
          className="press"
          style={{width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
            borderRadius:18, marginTop:12, background:'hsl(0 60% 56%/0.05)',
            border:'1px solid hsl(0 60% 56%/0.14)', cursor:'pointer', outline:'none'}}>
          <div style={{width:40, height:40, borderRadius:13, background:'hsl(0 60% 56%/0.08)',
            border:'1px solid hsl(0 60% 56%/0.16)', display:'flex', alignItems:'center',
            justifyContent:'center', flexShrink:0}}>
            <LogOut size={17} color="hsl(0 60% 60%)"/>
          </div>
          <span style={{fontSize:13, fontWeight:600, color:'hsl(0 60% 62%)'}}>Sign Out</span>
        </motion.button>
        <div style={{height:24}}/>
      </div>

      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </motion.div>
  );
}
