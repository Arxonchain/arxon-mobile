import { motion, AnimatePresence } from 'framer-motion';
import CampaignBanner from '@/components/CampaignBanner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { useMining } from '@/hooks/useMining';
import { useMiningStatus } from '@/hooks/useMiningStatus';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, ChevronRight, Zap, Share2 } from 'lucide-react';
import { useInAppNotifications } from '@/hooks/useInAppNotifications';
import { useRealtimePoints } from '@/hooks/useRealtimePoints';
import { useArena } from '@/hooks/useArena';
import { toast } from '@/hooks/use-toast';
import arxonLogo from '@/assets/arxon-icon.svg';
import arxonLogoDark from '@/assets/arxon-icon-dark.svg';

function relTime(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return new Date(iso).toLocaleDateString([], { month:'short', day:'numeric' });
}

const fadeUp  = { hidden:{opacity:0,y:22}, show:{opacity:1,y:0,transition:{duration:0.45,ease:[0.25,0.46,0.45,0.94]}} };
const stagger = { hidden:{opacity:0}, show:{opacity:1,transition:{staggerChildren:0.06,delayChildren:0.1}} };
const scaleIn = { hidden:{opacity:0,scale:0.93}, show:{opacity:1,scale:1,transition:{duration:0.45,ease:[0.25,0.46,0.45,0.94]}} };

function ArxonCoin({ active }: { active: boolean }) {
  return (
    <div style={{position:'relative',width:96,height:96,
      animation:active?'miningCore 2s ease-in-out infinite':'floatCoin 7s ease-in-out infinite'}}>
      <style>{`
        @keyframes miningCore{0%,100%{transform:scale(1);filter:drop-shadow(0 0 10px hsl(215 55% 62%/0.5))}50%{transform:scale(1.06);filter:drop-shadow(0 0 20px hsl(215 55% 62%/0.9))}}
        @keyframes floatCoin{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes orbitRing{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes orbitRingRev{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
        @keyframes spinRefresh{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
      <svg width="96" height="96" viewBox="0 0 96 96">
        <defs>
          <radialGradient id="dcg" cx="36%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#C8E0FF"/><stop offset="35%" stopColor="#8BAED6"/>
            <stop offset="70%" stopColor="#3A6898"/><stop offset="100%" stopColor="#0E2244"/>
          </radialGradient>
          <linearGradient id="dcr2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(139,174,214,0.6)"/><stop offset="100%" stopColor="rgba(30,74,128,0.25)"/>
          </linearGradient>
          <radialGradient id="dch2" cx="35%" cy="25%" r="55%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.28)"/><stop offset="100%" stopColor="rgba(255,255,255,0)"/>
          </radialGradient>
          <filter id="dcsf"><feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="rgba(0,0,0,0.5)"/></filter>
          <clipPath id="coinClip2"><circle cx="48" cy="48" r="28"/></clipPath>
        </defs>
        <circle cx="48" cy="48" r="38" fill="url(#dcg)" filter="url(#dcsf)"/>
        <circle cx="48" cy="48" r="40" fill="none" stroke="url(#dcr2)" strokeWidth="3"/>
        <ellipse cx="40" cy="32" rx="22" ry="11" fill="url(#dch2)" style={{transform:'rotate(-22deg)',transformOrigin:'40px 32px'}}/>
        <image href={arxonLogoDark} x="29" y="29" width="38" height="38" clipPath="url(#coinClip2)"/>
        <circle cx="48" cy="48" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      </svg>
      <div style={{animation:'orbitRing 5s linear infinite',position:'absolute',inset:-12,pointerEvents:'none'}}>
        <div style={{width:8,height:8,borderRadius:'50%',background:'hsl(215 35% 62%)',
          boxShadow:'0 0 12px hsl(215 55% 62%)',position:'absolute',top:-4,left:'50%',transform:'translateX(-50%)'}}/>
      </div>
      <div style={{animation:'orbitRingRev 10s linear infinite',position:'absolute',inset:-24,pointerEvents:'none'}}>
        <div style={{width:5,height:5,borderRadius:'50%',background:'hsl(215 32% 72%/0.7)',
          position:'absolute',top:-2.5,left:'50%',transform:'translateX(-50%)'}}/>
      </div>
      {active && <div style={{position:'absolute',inset:-8,borderRadius:'50%',
        border:'1px solid hsl(155 45% 43%/0.5)',animation:'rippleRing 2s ease-out infinite',pointerEvents:'none'}}/>}
    </div>
  );
}

// ── Pull-to-Refresh Indicator ──────────────────────────────────────────────
function RefreshIndicator({ pullDistance, isRefreshing }: { pullDistance: number; isRefreshing: boolean }) {
  const threshold = 70;
  const progress = Math.min(pullDistance / threshold, 1);
  const ready = pullDistance >= threshold;

  return (
    <div style={{
      position:'absolute', top:0, left:0, right:0, zIndex:50,
      display:'flex', alignItems:'center', justifyContent:'center',
      height: isRefreshing ? 60 : Math.max(0, pullDistance * 0.7),
      overflow:'hidden', transition: isRefreshing ? 'height 0.2s ease' : 'none',
      pointerEvents:'none',
    }}>
      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center', gap:6,
        opacity: isRefreshing ? 1 : progress,
        transform: `scale(${0.6 + progress * 0.4})`,
        transition:'opacity 0.1s, transform 0.1s',
      }}>
        <div style={{
          width:32, height:32, borderRadius:'50%',
          background:'hsl(215 35% 62%/0.12)',
          border:`2px solid ${ready || isRefreshing ? 'hsl(215 55% 62%)' : 'hsl(215 35% 42%)'}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          animation: isRefreshing ? 'spinRefresh 0.8s linear infinite' : 'none',
          transition:'border-color 0.2s',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={ready || isRefreshing ? 'hsl(215 55% 72%)' : 'hsl(215 35% 52%)'}
            strokeWidth="2.5" strokeLinecap="round"
            style={{
              transform: isRefreshing ? 'none' : `rotate(${progress * 360}deg)`,
              transition: isRefreshing ? 'none' : 'transform 0.05s',
            }}>
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </div>
        <p style={{
          fontSize:10, fontWeight:600,
          color: ready || isRefreshing ? 'hsl(215 55% 72%)' : 'hsl(215 25% 45%)',
          transition:'color 0.2s',
        }}>
          {isRefreshing ? 'Refreshing...' : ready ? 'Release to refresh' : 'Pull to refresh'}
        </p>
      </div>
    </div>
  );
}

export default function MobileDashboard() {
  const { user }         = useAuth();
  const navigate         = useNavigate();
  const { points, rank, refreshPoints } = usePoints();
  const { profile, refetchProfile }     = useProfile();
  const { isMining, refetch: refetchMining }     = useMiningStatus();
  const { earnedPoints, pointsPerHour }          = useMining();
  const { unread: notifUnread }                  = useInAppNotifications();
  // ENH-16: Realtime points subscription
  useRealtimePoints();
  const [todayPts,  setTodayPts]  = useState(0);
  const [weekPts,   setWeekPts]   = useState(0);
  const [liveEarn,  setLiveEarn]  = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  // ENH-02: Pending tasks badge on the Tasks quick-access button
  const [pendingTasksCount, setPendingTasksCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [{ data: activeTasks }, { data: completed }] = await Promise.all([
          supabase.from('tasks').select('id').eq('is_active', true),
          supabase.from('user_tasks').select('task_id').eq('user_id', user.id).eq('status', 'completed'),
        ]);
        if (cancelled) return;
        const completedIds = new Set((completed || []).map((t: any) => t.task_id));
        const pending = (activeTasks || []).filter((t: any) => !completedIds.has(t.id)).length;
        setPendingTasksCount(pending);
      } catch (err) {
        console.error('Error fetching pending tasks count:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Pull-to-refresh state
  const [pullDistance, setPullDistance]   = useState(0);
  const [isRefreshing, setIsRefreshing]   = useState(false);
  const touchStartY = useRef<number>(0);
  const isPulling   = useRef(false);
  const scrollRef   = useRef<HTMLDivElement>(null);
  const THRESHOLD   = 70;

  const { activeBattle, battleHistory, loading: arenaLoading, refreshBattle: refetchArena } = useArena();
  const dashBattles = (() => {
    try {
      const live = activeBattle ? [{ ...activeBattle, _live: true }] : [];
      const ended = (battleHistory || []).slice(0, 4).map((b: any) => ({ ...b, _live: false }));
      return [...live, ...ended].slice(0, 5);
    } catch { return []; }
  })();

  const totalPts = Math.round(points?.total_points ?? 0);
  const userRank = rank ?? null;
  const streak   = points?.daily_streak ?? 0;
  const username = profile?.username || user?.email?.split('@')[0] || 'Miner';
  const avatarUrl = profile?.avatar_url;

  // ENH-05: Quick share button — let users invite friends directly from the
  // dashboard without first navigating into the Referrals page.
  const shareReferral = useCallback(async () => {
    const code = profile?.referral_code;
    const link = code ? `https://arxonchain.xyz/?ref=${code}` : 'https://arxonchain.xyz';
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join ARXON',
          text: code
            ? `Join me on ARXON and start mining ARX-P! Use my referral code: ${code}`
            : 'Join me on ARXON and start mining ARX-P!',
          url: link,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(link);
          toast({ title: '✓ Link Copied!', description: 'Referral link copied to clipboard' });
        }
      }
    } else {
      navigator.clipboard.writeText(link);
      toast({ title: '✓ Link Copied!', description: 'Referral link copied to clipboard' });
    }
  }, [profile?.referral_code]);

  const fetchActivityData = useCallback(async () => {
    if (!user) return;
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

    const [{ data: sessions }, { data: nexusTx }] = await Promise.all([
      supabase.from('mining_sessions').select('id,arx_mined,started_at,ended_at,is_active')
        .eq('user_id', user.id).order('started_at', { ascending: false }).limit(3),
      supabase.from('nexus_transactions').select('id,amount,created_at,sender_id,receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false }).limit(3),
    ]);

    const activities: any[] = [];
    (sessions || []).forEach(s => {
      activities.push({
        type: s.is_active ? 'mining_active' : 'mining_done',
        label: s.is_active ? 'Mining Session' : 'Session Completed',
        sub: relTime(s.started_at),
        val: s.is_active ? `+${(earnedPoints || liveEarn).toFixed(2)}` : `+${Number(s.arx_mined||0).toFixed(2)}`,
        time: s.started_at,
        col: 'hsl(155 45% 43%)', bg: 'hsl(155 45% 43%/0.1)',
        bd: 'hsl(155 45% 43%/0.2)', vc: 'hsl(155 45% 55%)',
      });
    });
    (nexusTx || []).forEach(tx => {
      const isSend = tx.sender_id === user.id;
      activities.push({
        type: isSend ? 'nexus_send' : 'nexus_recv',
        label: isSend ? 'Sent ARX-P' : 'Received ARX-P',
        sub: relTime(tx.created_at),
        val: `${isSend ? '-' : '+'}${tx.amount}`,
        time: tx.created_at,
        col: isSend ? 'hsl(0 60% 56%)' : 'hsl(155 45% 43%)',
        bg: isSend ? 'hsl(0 60% 56%/0.08)' : 'hsl(155 45% 43%/0.08)',
        bd: isSend ? 'hsl(0 60% 56%/0.18)' : 'hsl(155 45% 43%/0.18)',
        vc: isSend ? 'hsl(0 60% 62%)' : 'hsl(155 45% 55%)',
      });
    });
    activities.sort((a,b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setRecentActivity(activities.slice(0, 4));
  }, [user]);

  // Full refresh — refetches everything
  const doRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Short delay so the user sees the spinner, then force a full reload
    // This pulls the latest JS bundle from Cloudflare AND refreshes all data
    setTimeout(() => {
      window.location.reload();
    }, 700);
  }, []);

  // Touch handlers for pull-to-refresh
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
    isPulling.current = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || isRefreshing) return;
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) { isPulling.current = false; setPullDistance(0); return; }
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta <= 0) { setPullDistance(0); return; }
    // Rubber band resistance
    setPullDistance(Math.min(delta * 0.5, 110));
  }, [isRefreshing]);

  const onTouchEnd = useCallback(() => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullDistance >= THRESHOLD) {
      doRefresh();
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, doRefresh]);

  useEffect(() => { fetchActivityData(); }, [fetchActivityData]);

  useEffect(()=>{
    if (!isMining) return;
    // Use real mining rate from useMining hook (not hardcoded 148.2)
    const ratePerSecond = (pointsPerHour || 0) / 3600;
    const t = setInterval(()=>setLiveEarn(p => p + ratePerSecond), 1000);
    return ()=>clearInterval(t);
  },[isMining, pointsPerHour]);

  const quickItems = [
    { id:'arena',    label:'Arena',     path:'/arena',    icon:<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/>, icon2:<><circle cx="19" cy="19" r="2"/><circle cx="5" cy="5" r="2"/></> },
    { id:'nexus',    label:'Nexus',     path:'/nexus',    icon:<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></> },
    { id:'tasks',    label:'Tasks',     path:'/tasks',    icon:<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></> },
    { id:'referrals',label:'Referrals', path:'/referrals',icon:<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></> },
    { id:'wallet',   label:'Wallet',    path:'/wallet',   icon:<><rect x="2" y="6" width="20" height="14" rx="3"/><path d="M2 11h20"/><circle cx="17" cy="15.5" r="1.5" fill="currentColor"/></> },
  ];

  // ENH-18: Pause mining animations when app is in background to save battery
  const [isVisible, setIsVisible] = useState(true);
  useEffect(() => {
    const onVis = () => setIsVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);


  return (
    <div
      ref={scrollRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{minHeight:'100vh', overflowY:'auto', position:'relative',
        fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif"}}
    >
      {/* Pull-to-refresh indicator */}
      <RefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

      <motion.div variants={stagger} initial="hidden" animate="show"
        style={{
          minHeight:'100vh', background:'hsl(225 30% 3%)', paddingBottom:100,
          transform: `translateY(${isRefreshing ? 60 : pullDistance * 0.7}px)`,
          transition: isPulling.current ? 'none' : 'transform 0.3s ease',
        }}>

        {/* ── Header ── */}
        <motion.div variants={fadeUp}
          style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'52px 20px 0'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:44,height:44,borderRadius:14,overflow:'hidden',
              border:'1px solid hsl(215 35% 62%/0.2)',boxShadow:'0 0 16px hsl(215 55% 62%/0.12)',
              display:'flex',alignItems:'center',justifyContent:'center',
              background:'hsl(215 28% 8%)'}}>
              <img src={arxonLogo} alt="Arxon" style={{width:'70%',height:'70%',objectFit:'contain'}}/>
            </div>
            <div>
              <p style={{fontSize:10,color:'hsl(215 14% 38%)',textTransform:'uppercase',letterSpacing:'0.16em',fontWeight:500,marginBottom:3}}>Welcome back</p>
              <h1 style={{fontSize:20,fontWeight:700,color:'hsl(215 20% 93%)',letterSpacing:'-0.3px'}}>{username}</h1>
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <motion.button whileTap={{scale:0.88}} onClick={shareReferral}
              className="glass-card press"
              style={{width:40,height:40,borderRadius:14,display:'flex',alignItems:'center',
                justifyContent:'center',cursor:'pointer'}}>
              <Share2 size={16} color="hsl(215 25% 52%)"/>
            </motion.button>
            <motion.button whileTap={{scale:0.88}} onClick={()=>navigate('/notifications')}
              className="glass-card press"
              style={{width:40,height:40,borderRadius:14,display:'flex',alignItems:'center',
                justifyContent:'center',position:'relative',cursor:'pointer'}}>
              <Bell size={17} color="hsl(215 25% 52%)"/>
              {notifUnread > 0 && (
                <span style={{position:'absolute',top:8,right:9,width:7,height:7,borderRadius:'50%',
                  background:'hsl(0 60% 56%)',border:'2px solid hsl(225 30% 3%)',
                  boxShadow:'0 0 8px hsl(0 60% 56%/0.6)'}}/>
              )}
            </motion.button>
            <motion.button whileTap={{scale:0.88}} onClick={()=>navigate('/profile')}
              style={{width:40,height:40,borderRadius:14,overflow:'hidden',cursor:'pointer',
                border:'1.5px solid hsl(215 35% 62%/0.25)',
                boxShadow:'0 0 12px hsl(215 55% 62%/0.12)'}}>
              {avatarUrl
                ? <img src={avatarUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                : <div style={{width:'100%',height:'100%',background:'linear-gradient(135deg,hsl(215 30% 18%),hsl(215 40% 28%))',
                    display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:15,color:'hsl(215 20% 93%)'}}>
                    {username[0]?.toUpperCase()}
                  </div>
              }
            </motion.button>
          </div>
        </motion.div>

        {/* ── Campaign Banner ── */}
        <div style={{padding:'14px 20px 0'}}>
          <CampaignBanner />
        </div>

        {/* ── Hero Balance Card ── */}
        <motion.div variants={scaleIn} style={{margin:'18px 20px 0'}} className="shine">
          <div className="glass-hero" style={{borderRadius:28,overflow:'hidden',position:'relative',
            background:'linear-gradient(150deg,hsl(225 30% 13%),hsl(215 35% 18%),hsl(225 32% 10%))',
            border:'1px solid hsl(215 38% 28%/0.3)',
            boxShadow:'0 20px 60px -20px hsl(215 55% 62%/0.12)'}}>
            <div style={{position:'absolute',top:-50,right:-40,width:220,height:220,borderRadius:'50%',
              background:'radial-gradient(circle,hsl(215 55% 62%/0.1) 0%,transparent 70%)',pointerEvents:'none'}}/>
            <div style={{position:'absolute',top:0,left:0,right:0,height:1,
              background:'linear-gradient(90deg,transparent,hsl(215 40% 82%/0.18),transparent)',pointerEvents:'none'}}/>

            <div style={{display:'flex',alignItems:'stretch',padding:'22px 20px 20px',position:'relative',zIndex:2}}>
              <div style={{flex:1,paddingRight:10}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                  <p style={{fontSize:9,textTransform:'uppercase',letterSpacing:'0.18em',color:'hsl(215 25% 50%)',fontWeight:600}}>ARX-P Balance</p>
                  {userRank && (
                    <div style={{display:'flex',alignItems:'center',gap:4,background:'hsl(215 35% 62%/0.1)',
                      border:'1px solid hsl(215 35% 62%/0.2)',borderRadius:20,padding:'3px 10px'}}>
                      <div style={{width:5,height:5,borderRadius:'50%',background:'hsl(215 35% 62%)',
                        boxShadow:'0 0 8px hsl(215 55% 62%)'}}/>
                      <span style={{color:'hsl(215 32% 72%)',fontSize:10,fontWeight:700}}>#{userRank}</span>
                    </div>
                  )}
                </div>
                <div style={{display:'flex',alignItems:'baseline',gap:7,marginBottom:3}}>
                  <span style={{fontSize:40,fontWeight:700,letterSpacing:'-2px',color:'hsl(215 20% 95%)',lineHeight:1,
                    opacity: totalPts === 0 ? 0.4 : 1, transition: 'opacity 0.4s'}}>
                    {totalPts === 0 ? '···' : totalPts.toLocaleString()}
                  </span>
                  <span style={{fontSize:14,fontWeight:600,color:'hsl(215 35% 62%)'}}>ARX-P</span>
                </div>
                <p style={{fontSize:9,color:'hsl(215 14% 32%)',marginBottom:18}}>Your total mining rewards</p>
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
                <div style={{display:'flex',alignItems:'flex-end',gap:3,height:26}}>
                  {[0.38,0.50,0.28,0.65,0.42,0.58,0.88].map((h,i)=>(
                    <div key={i} style={{flex:1,borderRadius:'3px 3px 0 0',height:`${h*100}%`,
                      background:i===6
                        ?'linear-gradient(to top,hsl(215 35% 62%/0.5),hsl(215 38% 75%/0.7))'
                        :`hsl(215 25% 55%/${0.07+i*0.015})`}}/>
                  ))}
                </div>
              </div>
              <div style={{width:110,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <ArxonCoin active={isMining}/>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Mining Active Banner ── */}
        <AnimatePresence>
          {isMining && (
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
              style={{margin:'10px 20px 0',overflow:'hidden'}}>
              <div className="press" onClick={()=>navigate('/mining')}
                style={{borderRadius:16,padding:'13px 18px',cursor:'pointer',
                  background:'linear-gradient(135deg,hsl(155 45% 43%/0.1),hsl(155 45% 43%/0.05))',
                  border:'1px solid hsl(155 45% 43%/0.28)',
                  display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div style={{position:'relative',flexShrink:0}}>
                    <div className="mining-pulse" style={{width:9,height:9,borderRadius:'50%',
                      background:'hsl(155 45% 43%)',boxShadow:'0 0 10px hsl(155 45% 43%)'}}/>
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

        {/* ── Quick Access ── */}
        <motion.div variants={fadeUp} style={{padding:'22px 20px 0'}}>
          <p style={{fontSize:10,textTransform:'uppercase',letterSpacing:'0.15em',color:'hsl(215 14% 30%)',fontWeight:700,marginBottom:16}}>Quick Access</p>

          <motion.button whileTap={{scale:0.97}} onClick={()=>navigate('/mining')}
            className="press glow-steel"
            style={{width:'100%',borderRadius:22,padding:'20px 24px',
              display:'flex',alignItems:'center',gap:20,cursor:'pointer',marginBottom:12,
              background:'linear-gradient(135deg,hsl(215 35% 16%),hsl(225 32% 10%),hsl(225 35% 6%))',
              border:'1.5px solid hsl(215 35% 62%/0.35)',position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 20% 50%,hsl(215 55% 62%/0.08) 0%,transparent 60%)',pointerEvents:'none'}}/>
            <div style={{position:'absolute',top:0,left:0,right:0,height:1,
              background:'linear-gradient(90deg,transparent,hsl(215 40% 82%/0.2),hsl(215 40% 82%/0.2),transparent)',pointerEvents:'none'}}/>
            <div style={{width:56,height:56,borderRadius:18,flexShrink:0,
              background:'linear-gradient(135deg,hsl(215 35% 62%/0.22),hsl(215 35% 62%/0.08))',
              border:'1.5px solid hsl(215 35% 62%/0.35)',
              display:'flex',alignItems:'center',justifyContent:'center',
              boxShadow:'0 4px 16px hsl(215 55% 62%/0.2)',position:'relative',zIndex:1}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="hsl(215 38% 82%)" strokeWidth="2.2" strokeLinecap="round">
                <path d="M15 5l4 4-8 8-5 1 1-5 8-8z"/><path d="M12 8l4 4"/>
              </svg>
            </div>
            <div style={{flex:1,position:'relative',zIndex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <p style={{fontSize:18,fontWeight:800,color:'hsl(215 38% 88%)',letterSpacing:'-0.3px'}}>Start Mining</p>
                {isMining && (
                  <div style={{display:'flex',alignItems:'center',gap:4,background:'hsl(155 45% 43%/0.14)',
                    border:'1px solid hsl(155 45% 43%/0.28)',borderRadius:20,padding:'2px 8px'}}>
                    <div className="mining-pulse" style={{width:5,height:5,borderRadius:'50%',background:'hsl(155 45% 43%)'}}/>
                    <span style={{fontSize:9,fontWeight:700,color:'hsl(155 45% 55%)'}}>LIVE</span>
                  </div>
                )}
              </div>
              <p style={{fontSize:11,color:'hsl(215 25% 48%)'}}>Earn ARX-P · {isMining?`${liveEarn.toFixed(2)} earned`:'Tap to begin session'}</p>
            </div>
            <ChevronRight size={20} color="hsl(215 25% 45%)" style={{flexShrink:0,position:'relative',zIndex:1}}/>
          </motion.button>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
            {quickItems.map((item,i)=>(
              <motion.button key={item.id}
                initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:0.1+i*0.05}}
                whileTap={{scale:0.91}}
                onClick={()=>navigate(item.path)}
                className="press glass-elevated card-lift"
                style={{borderRadius:18,padding:'14px 8px 12px',display:'flex',flexDirection:'column',
                  alignItems:'center',gap:9,cursor:'pointer',position:'relative',
                  border:'1px solid hsl(215 28% 20%/0.4)'}}>
                <div style={{position:'relative'}}>
                  <div style={{width:42,height:42,borderRadius:13,
                    background:'hsl(215 35% 62%/0.1)',
                    border:'1px solid hsl(215 35% 62%/0.18)',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    color:'hsl(215 35% 62%)'}}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      {item.icon}{item.icon2}
                    </svg>
                  </div>
                  {item.id === 'tasks' && pendingTasksCount > 0 && (
                    <span style={{position:'absolute',top:-4,right:-4,minWidth:18,height:18,borderRadius:9,
                      background:'hsl(0 60% 56%)',border:'2px solid hsl(225 28% 8%)',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:9,fontWeight:800,color:'white',padding:'0 4px',
                      boxShadow:'0 0 8px hsl(0 60% 56%/0.5)'}}>
                      {pendingTasksCount > 9 ? '9+' : pendingTasksCount}
                    </span>
                  )}
                </div>
                <span style={{fontSize:11,fontWeight:600,color:'hsl(215 25% 62%)',textAlign:'center',
                  fontFamily:"'Creato Display',-apple-system,sans-serif"}}>
                  {item.label}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Live Battles ── */}
        <motion.div variants={fadeUp} style={{padding:'24px 20px 0'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <p style={{fontSize:15,fontWeight:700,color:'hsl(215 20% 93%)'}}>Live Battles</p>
            <button onPointerDown={()=>navigate('/arena')}
              style={{display:'flex',alignItems:'center',gap:3,fontSize:11,color:'hsl(215 35% 62%)',fontWeight:600,background:'none',border:'none',cursor:'pointer'}}>
              View all <ChevronRight size={13}/>
            </button>
          </div>
          <div className="scrollbar-none" style={{display:'flex',gap:12,overflowX:'auto',paddingBottom:4,WebkitOverflowScrolling:'touch',touchAction:'pan-x'}}>
            {arenaLoading && !dashBattles.length && [0,1,2].map(i=>(
              <div key={i} style={{minWidth:200,height:155,borderRadius:20,flexShrink:0,
                background:'hsl(215 22% 9%)',border:'1px solid hsl(215 22% 13%)'}}/>
            ))}
            {dashBattles.map((battle:any)=>{
              const total=(battle.side_a_power||0)+(battle.side_b_power||0);
              const pctA=total>0?Math.round((battle.side_a_power||0)/total*100):50;
              const pctB=100-pctA;
              const isLive=battle._live||battle.status==='active';
              return (
                <motion.div key={battle.id} whileTap={{scale:0.97}}
                  onClick={()=>navigate('/arena')}
                  style={{minWidth:200,borderRadius:20,flexShrink:0,cursor:'pointer',overflow:'hidden',
                    background:'hsl(225 26% 8%)',border:'1px solid hsl(215 22% 14%)',display:'flex',flexDirection:'column'}}>
                  {battle.banner_image ? (
                    <div style={{height:76,overflow:'hidden',position:'relative',flexShrink:0}}>
                      <img src={battle.banner_image} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}
                        onError={e=>{(e.target as HTMLImageElement).parentElement!.style.display='none'}}/>
                      <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 30%,hsl(225 26% 8%))'}}/>
                      {isLive&&(<div style={{position:'absolute',top:7,right:8,display:'flex',alignItems:'center',gap:3,
                        background:'hsl(155 45% 40%/0.92)',borderRadius:8,padding:'2px 7px'}}>
                        <div style={{width:4,height:4,borderRadius:'50%',background:'white'}}/>
                        <span style={{fontSize:7,fontWeight:800,color:'white'}}>LIVE</span>
                      </div>)}
                    </div>
                  ):(
                    <div style={{height:38,background:'linear-gradient(135deg,hsl(215 35% 12%),hsl(225 28% 9%))',
                      display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 12px',flexShrink:0}}>
                      <span style={{fontSize:9,fontWeight:700,color:'hsl(215 18% 48%)'}}>Arena Battle</span>
                      {isLive&&(<div style={{display:'flex',alignItems:'center',gap:3,background:'hsl(155 45% 43%/0.14)',
                        border:'1px solid hsl(155 45% 43%/0.3)',borderRadius:7,padding:'2px 6px'}}>
                        <div style={{width:4,height:4,borderRadius:'50%',background:'hsl(155 45% 55%)'}}/>
                        <span style={{fontSize:7,fontWeight:800,color:'hsl(155 45% 55%)'}}>LIVE</span>
                      </div>)}
                    </div>
                  )}
                  <div style={{padding:'8px 11px 11px',flex:1}}>
                    <p style={{fontSize:11,fontWeight:600,color:'hsl(215 18% 80%)',marginBottom:7,lineHeight:1.3,
                      overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>
                      {battle.title||'Arena Battle'}
                    </p>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 20px 1fr',gap:5,alignItems:'stretch'}}>
                      <div style={{padding:'6px 8px',borderRadius:10,
                        background:battle.winner_side==='a'?'hsl(38 55% 52%/0.1)':'hsl(215 26% 12%)',
                        border:`1px solid ${battle.winner_side==='a'?'hsl(38 55% 52%/0.35)':'hsl(215 22% 18%)'}`}}>
                        <p style={{fontSize:9,fontWeight:600,color:'hsl(215 18% 72%)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{battle.side_a_name}</p>
                        <p style={{fontSize:13,fontWeight:900,color:battle.winner_side==='a'?'hsl(38 55% 58%)':'hsl(215 35% 68%)'}}>{pctA}%</p>
                      </div>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <span style={{fontSize:7,fontWeight:900,color:'hsl(215 22% 34%)'}}>VS</span>
                      </div>
                      <div style={{padding:'6px 8px',borderRadius:10,
                        background:battle.winner_side==='b'?'hsl(38 55% 52%/0.1)':'hsl(215 26% 12%)',
                        border:`1px solid ${battle.winner_side==='b'?'hsl(38 55% 52%/0.35)':'hsl(215 22% 18%)'}`}}>
                        <p style={{fontSize:9,fontWeight:600,color:'hsl(215 18% 72%)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{battle.side_b_name}</p>
                        <p style={{fontSize:13,fontWeight:900,color:battle.winner_side==='b'?'hsl(38 55% 58%)':'hsl(215 35% 68%)'}}>{pctB}%</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {!arenaLoading&&dashBattles.length===0&&(
              <div style={{minWidth:180,height:130,borderRadius:20,flexShrink:0,opacity:0.5,
                border:'1px dashed hsl(215 25% 18%)',display:'flex',flexDirection:'column',
                alignItems:'center',justifyContent:'center',gap:7,background:'hsl(225 28% 6%)'}}>
                <Zap size={26} color="hsl(215 25% 34%)"/>
                <p style={{fontSize:11,fontWeight:600,color:'hsl(215 18% 33%)'}}>No battles yet</p>
                <p style={{fontSize:9,color:'hsl(215 14% 22%)'}}>Check Arena</p>
              </div>
            )}
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
          {recentActivity.length === 0 ? (
            [{col:'hsl(155 45% 43%)',bg:'hsl(155 45% 43%/0.1)',bd:'hsl(155 45% 43%/0.2)',vc:'hsl(155 45% 55%)',
              label:'Mining Session',sub:'Start mining to see activity',val:'+0.00',
              icon:<path d="M15 5l4 4-8 8-5 1 1-5 8-8z"/>}
            ].map((it,i)=>(
              <motion.div key={i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
                transition={{delay:0.6+i*0.07}} whileTap={{scale:0.98}}
                className="glass-card press card-lift"
                style={{display:'flex',alignItems:'center',gap:13,padding:'14px 16px',borderRadius:18,marginBottom:9,cursor:'pointer'}}>
                <div style={{width:42,height:42,borderRadius:14,background:it.bg,border:`1px solid ${it.bd}`,
                  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:it.col}}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{it.icon}</svg>
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
            ))
          ) : recentActivity.map((it,i)=>{
            const iconPath = it.type==='mining_active'||it.type==='mining_done'
              ? <path d="M15 5l4 4-8 8-5 1 1-5 8-8z"/>
              : it.type==='nexus_send'
                ? <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>
                : <><polyline points="23 7 13.5 15.5 8.5 10.5 1 17"/><polyline points="17 7 23 7 23 13"/></>;
            return (
              <motion.div key={it.time+i} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
                transition={{delay:0.6+i*0.07}} whileTap={{scale:0.98}}
                className="glass-card press card-lift"
                style={{display:'flex',alignItems:'center',gap:13,padding:'14px 16px',borderRadius:18,marginBottom:9,cursor:'pointer'}}>
                <div style={{width:42,height:42,borderRadius:14,background:it.bg,border:`1px solid ${it.bd}`,
                  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:it.col}}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{iconPath}</svg>
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
            );
          })}
        </motion.div>
      </motion.div>
    </div>
  );
}
