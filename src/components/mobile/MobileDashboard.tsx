import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { useMiningStatus } from '@/hooks/useMiningStatus';
import { Bell, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

const CSS = `
@keyframes coinfloat3d{0%,100%{transform:translateY(0) rotateY(0deg)}25%{transform:translateY(-8px) rotateY(15deg)}50%{transform:translateY(-10px) rotateY(0deg)}75%{transform:translateY(-6px) rotateY(-12deg)}}
@keyframes coinorbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes shimmerswipe{0%{left:-120%}65%,100%{left:160%}}
@keyframes strokeDash{0%{stroke-dashoffset:600}100%{stroke-dashoffset:0}}
@keyframes strokeGlow{0%,100%{opacity:.4;stroke-width:1.5}50%{opacity:1;stroke-width:2.5}}
@keyframes barbeat{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.16)}}
@keyframes rankpulse{0%,100%{box-shadow:0 0 5px rgba(139,174,214,.8)}50%{box-shadow:0 0 12px rgba(139,174,214,.3)}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}
@keyframes orbright{0%,100%{transform:translate(0,0)}50%{transform:translate(7px,-9px)}}
@keyframes orbleft{0%,100%{transform:translate(0,0)}50%{transform:translate(-9px,7px)}}
`;

function HeroCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{position:'relative',borderRadius:26,overflow:'hidden',minHeight:220,
      background:'linear-gradient(145deg,#0c2340 0%,#0a1c33 38%,#061428 65%,#040e1e 100%)'}}>
      <div style={{position:'absolute',top:-40,right:-20,width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle,rgba(100,160,230,.13) 0%,transparent 70%)',animation:'orbright 7s ease-in-out infinite',pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:-30,left:-10,width:140,height:140,borderRadius:'50%',background:'radial-gradient(circle,rgba(80,130,200,.09) 0%,transparent 70%)',animation:'orbleft 9s ease-in-out infinite',pointerEvents:'none'}}/>
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}} viewBox="0 0 343 220">
        {([[28,18,1,'white',.5,2.1],[95,30,.8,'white',.55,1.8],[175,14,1.1,'#A8C4E8',.65,2.4],[258,24,.7,'white',.5,1.9],[316,38,1,'white',.4,3],[44,52,.6,'#8BAED6',.45,2.6],[140,46,.9,'white',.35,1.5]] as [number,number,number,string,number,number][]).map(([cx,cy,r,fill,op,dur],i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill={fill} opacity={op}><animate attributeName="opacity" values={`${op};1;${op}`} dur={`${dur}s`} repeatCount="indefinite"/></circle>
        ))}
      </svg>
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}} viewBox="0 0 343 220" preserveAspectRatio="none">
        {[{d:'M 20 2 Q 171 -8 323 2',s:'rgba(139,174,214,0.55)',dl:'0s'},{d:'M 20 218 Q 171 228 323 218',s:'rgba(168,196,232,0.35)',dl:'0.5s'},{d:'M 2 20 Q -8 110 2 200',s:'rgba(200,228,255,0.2)',dl:'1s'},{d:'M 341 20 Q 351 110 341 200',s:'rgba(139,174,214,0.3)',dl:'1.5s'}].map((p,i) => (
          <path key={i} d={p.d} fill="none" stroke={p.s} strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600" style={{animation:`strokeDash 3s ease-in-out infinite alternate,strokeGlow 2.5s ease-in-out infinite`,animationDelay:p.dl}}/>
        ))}
      </svg>
      <div style={{position:'absolute',top:0,left:'-120%',width:'50%',height:'100%',background:'linear-gradient(90deg,transparent,rgba(168,196,232,.05),transparent)',animation:'shimmerswipe 5s ease-in-out infinite',pointerEvents:'none'}}/>
      <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(200,228,255,.22),transparent)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',inset:0,borderRadius:26,border:'1px solid rgba(139,174,214,.18)',pointerEvents:'none'}}/>
      <div style={{position:'relative',zIndex:5}}>{children}</div>
    </div>
  );
}

function ArxonCoin() {
  return (
    <div style={{animation:'coinfloat3d 4s ease-in-out infinite',position:'relative',width:92,height:92}}>
      <svg width="92" height="92" viewBox="0 0 92 92">
        <defs>
          <radialGradient id="dcf" cx="36%" cy="30%" r="68%"><stop offset="0%" stopColor="#C8E0FF"/><stop offset="30%" stopColor="#8BAED6"/><stop offset="65%" stopColor="#3A6898"/><stop offset="100%" stopColor="#0E2244"/></radialGradient>
          <linearGradient id="dce" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4A7AB8"/><stop offset="50%" stopColor="#1E4A80"/><stop offset="100%" stopColor="#081828"/></linearGradient>
          <radialGradient id="dch" cx="35%" cy="25%" r="55%"><stop offset="0%" stopColor="rgba(255,255,255,0.3)"/><stop offset="100%" stopColor="rgba(255,255,255,0)"/></radialGradient>
          <linearGradient id="dcr" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="rgba(139,174,214,0.6)"/><stop offset="100%" stopColor="rgba(30,74,128,0.3)"/></linearGradient>
          <filter id="dcs"><feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(0,0,0,0.5)"/></filter>
        </defs>
        <ellipse cx="46" cy="49" rx="8" ry="3" fill="url(#dce)"/>
        <ellipse cx="46" cy="47" rx="36" ry="9" fill="url(#dce)"/>
        <circle cx="46" cy="46" r="36" fill="url(#dcf)" filter="url(#dcs)"/>
        <circle cx="46" cy="46" r="34" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="1"/>
        <circle cx="46" cy="46" r="38" fill="none" stroke="url(#dcr)" strokeWidth="3.5"/>
        <ellipse cx="38" cy="30" rx="22" ry="12" fill="url(#dch)" style={{transform:'rotate(-25deg)',transformOrigin:'38px 30px'}}/>
        <g transform="translate(46,46)">
          <circle r="22" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="1"/>
          <text x="0" y="5" textAnchor="middle" fontSize="15" fontWeight="900" fill="white" fontFamily="-apple-system,sans-serif" letterSpacing="-1">ARX</text>
          <line x1="-10" y1="11" x2="10" y2="11" stroke="rgba(255,255,255,.25)" strokeWidth=".8"/>
          <text x="0" y="19" textAnchor="middle" fontSize="5.5" fontWeight="600" fill="rgba(200,228,255,.7)" fontFamily="-apple-system,sans-serif" letterSpacing="1.5">ARXON</text>
        </g>
        <circle cx="46" cy="46" r="36" fill="none" stroke="rgba(168,196,232,.15)" strokeWidth=".5"/>
      </svg>
      <div style={{position:'absolute',inset:-10,borderRadius:'50%',border:'1px solid rgba(139,174,214,.18)',animation:'coinorbit 5s linear infinite',pointerEvents:'none'}}>
        <div style={{width:8,height:8,borderRadius:'50%',background:'#8BAED6',position:'absolute',top:-4,left:'50%',transform:'translateX(-50%)',boxShadow:'0 0 10px rgba(139,174,214,1)'}}/>
      </div>
      <div style={{position:'absolute',inset:-22,borderRadius:'50%',border:'1px solid rgba(139,174,214,.07)',animation:'coinorbit 10s linear infinite reverse',pointerEvents:'none'}}>
        <div style={{width:5,height:5,borderRadius:'50%',background:'rgba(168,196,232,.55)',position:'absolute',top:-2.5,left:'50%',transform:'translateX(-50%)',boxShadow:'0 0 6px rgba(139,174,214,.6)'}}/>
      </div>
    </div>
  );
}

export default function MobileDashboard() {
  const { user }         = useAuth();
  const navigate         = useNavigate();
  const { points, rank } = usePoints();
  const { profile }      = useProfile();
  const { isMining }     = useMiningStatus();

  const [todayEarnings,  setTodayEarnings]  = useState(0);
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [liveEarnings,   setLiveEarnings]   = useState(0);

  // ── points is a UserPoints OBJECT — must use .total_points ──
  const totalPoints = Math.round(points?.total_points ?? 0);
  const userRank    = rank ?? null;
  const streakDays  = points?.daily_streak ?? 0;
  const username    = profile?.username || user?.email?.split('@')[0] || 'Miner';

  useEffect(() => {
    if (!user) return;
    (async () => {
      const now     = new Date();
      const today   = now.toISOString().split('T')[0];
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
      const [{ data: td }, { data: wk }] = await Promise.all([
        supabase.from('mining_sessions').select('arx_mined').eq('user_id', user.id).gte('started_at', today),
        supabase.from('mining_sessions').select('arx_mined').eq('user_id', user.id).gte('started_at', weekAgo),
      ]);
      const t = td?.reduce((s, r) => s + Number(r.arx_mined || 0), 0) ?? 0;
      const w = wk?.reduce((s, r) => s + Number(r.arx_mined || 0), 0) ?? 0;
      setTodayEarnings(t); setWeeklyEarnings(w); setLiveEarnings(t);
    })();
  }, [user]);

  useEffect(() => {
    if (!isMining) return;
    const t = setInterval(() => setLiveEarnings(p => p + 148.2 / 3600), 1000);
    return () => clearInterval(t);
  }, [isMining]);

  const bars = [{h:'38%',o:.10},{h:'55%',o:.14},{h:'30%',o:.09},{h:'68%',o:.16},{h:'46%',o:.12},{h:'60%',o:.18},{h:'85%',accent:true}] as any[];

  return (
    <div style={{minHeight:'100vh',background:'#000',fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif",paddingBottom:90}}>
      <style>{CSS}</style>

      <div style={{padding:'52px 20px 6px',display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:11,color:'rgba(238,242,247,.35)',fontWeight:500,letterSpacing:'.04em',marginBottom:4}}>Hi {username} 👋</div>
          <div style={{fontSize:22,fontWeight:900,color:'#EEF2F7',letterSpacing:'-.5px'}}>Welcome back</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',marginTop:4}}>
          <motion.button whileTap={{scale:.9}} onClick={() => navigate('/notifications')}
            style={{width:36,height:36,borderRadius:'50%',background:'rgba(139,174,214,.07)',border:'1px solid rgba(139,174,214,.13)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',position:'relative'}}>
            <Bell size={16} color="rgba(139,174,214,.6)"/>
            <div style={{position:'absolute',top:6,right:7,width:7,height:7,borderRadius:'50%',background:'#E06060',border:'1.5px solid #000'}}/>
          </motion.button>
          <motion.button whileTap={{scale:.9}} onClick={() => navigate('/profile')}
            style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#2a3a5c,#8BAED6)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:14,color:'#fff',cursor:'pointer',border:'2px solid rgba(139,174,214,.3)'}}>
            {username[0]?.toUpperCase()}
          </motion.button>
        </div>
      </div>

      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:.45}} style={{margin:'8px 16px 0'}}>
        <HeroCard>
          <div style={{padding:'18px 18px 16px',display:'flex',gap:0,alignItems:'stretch'}}>
            <div style={{flex:1,minWidth:0,paddingRight:8}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                <div style={{fontSize:8,textTransform:'uppercase',letterSpacing:'1.4px',color:'rgba(168,196,232,.45)',fontWeight:600}}>Total Balance</div>
                <div style={{display:'flex',alignItems:'center',gap:4,background:'rgba(139,174,214,.1)',border:'1px solid rgba(139,174,214,.22)',borderRadius:20,padding:'3px 9px'}}>
                  <div style={{width:5,height:5,borderRadius:'50%',background:'#8BAED6',animation:'rankpulse 2s infinite'}}/>
                  <span style={{color:'#A8C4E8',fontSize:10,fontWeight:700,whiteSpace:'nowrap'}}>
                    {userRank ? `Rank #${userRank}` : 'Unranked'}
                  </span>
                </div>
              </div>
              {/* FIXED: points?.total_points — no more [object Object] */}
              <div style={{display:'flex',alignItems:'baseline',marginBottom:2}}>
                <span style={{fontSize:38,fontWeight:900,letterSpacing:'-1.8px',color:'#fff',lineHeight:1}}>
                  {totalPoints.toLocaleString()}
                </span>
                <span style={{fontSize:13,fontWeight:700,color:'#8BAED6',marginLeft:6}}>ARX-P</span>
              </div>
              <div style={{fontSize:9,color:'rgba(139,174,214,.35)',marginBottom:14}}>Your total mining rewards</div>
              <div style={{display:'flex',gap:0,marginBottom:12}}>
                {[
                  {label:'Today',     val:`+${Math.round(todayEarnings).toLocaleString()}`,  col:'#EEF2F7'},
                  {label:'This Week', val:`+${Math.round(weeklyEarnings).toLocaleString()}`, col:'#8BAED6'},
                  {label:'Streak',    val:`🔥 ${streakDays}d`,                               col:'#d4884a'},
                ].map((s,i) => (
                  <div key={i} style={{flex:1,borderLeft:i>0?'1px solid rgba(139,174,214,.08)':'none',paddingLeft:i>0?10:0}}>
                    <div style={{fontSize:7,textTransform:'uppercase',letterSpacing:'.9px',color:'rgba(168,196,232,.38)',fontWeight:600,marginBottom:2}}>{s.label}</div>
                    <div style={{fontSize:13,fontWeight:800,color:s.col}}>{s.val}</div>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',alignItems:'flex-end',gap:3,height:32}}>
                {bars.map((b,i) => (
                  <div key={i} style={{flex:1,borderRadius:'3px 3px 0 0',
                    background:b.accent?'linear-gradient(to top,rgba(139,174,214,.45),rgba(190,220,255,.65))':`rgba(139,174,214,${b.o})`,
                    height:b.h,animation:`barbeat 2.4s ease-in-out infinite ${i*0.15}s`}}/>
                ))}
              </div>
            </div>
            <div style={{width:108,flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
              <ArxonCoin/>
            </div>
          </div>
        </HeroCard>
      </motion.div>

      {isMining && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}} onClick={() => navigate('/mining')}
          style={{margin:'12px 16px 0',background:'rgba(93,176,138,.08)',border:'1px solid rgba(93,176,138,.22)',borderRadius:14,padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:7,height:7,borderRadius:'50%',background:'#5DB08A',animation:'pulse 2s infinite'}}/>
            <span style={{color:'#5DB08A',fontSize:13,fontWeight:700}}>Mining Active · {liveEarnings.toFixed(2)} ARX-P</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:4,color:'rgba(238,242,247,.3)',fontSize:12}}>View <ChevronRight size={14}/></div>
        </motion.div>
      )}

      {/* Quick Actions — dark with steel blue stroke */}
      <div style={{padding:'14px 20px 6px',fontSize:10,textTransform:'uppercase',letterSpacing:'1.2px',color:'rgba(238,242,247,.22)',fontWeight:600}}>Quick Access</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:10,padding:'0 16px 14px'}}>
        {[
          {label:'Mine',  path:'/mining',      d:<><path d="M15 5l4 4-8 8-5 1 1-5 8-8z"/><path d="M12 8l4 4"/></>},
          {label:'Arena', path:'/arena',       d:<><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><circle cx="19" cy="19" r="2"/><circle cx="5" cy="5" r="2"/></>},
          {label:'Ranks', path:'/leaderboard', d:<><path d="M6 9H4a2 2 0 00-2 2v4a2 2 0 002 2h2"/><path d="M6 5v16"/><path d="M18 9h2a2 2 0 012 2v4a2 2 0 01-2 2h-2"/><path d="M18 5v16"/><path d="M10 3h4v18h-4z"/></>},
          {label:'Nexus', path:'/nexus',       d:<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>},
        ].map((a,i) => (
          <motion.button key={a.label}
            initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}
            whileTap={{scale:.88}} onClick={() => navigate(a.path)}
            style={{background:'linear-gradient(145deg,#0c1e38,#061220)',border:'1.5px solid rgba(139,174,214,0.38)',borderRadius:20,padding:'14px 6px',display:'flex',flexDirection:'column',alignItems:'center',gap:7,cursor:'pointer'}}>
            <div style={{width:36,height:36,borderRadius:12,background:'rgba(139,174,214,.1)',border:'1px solid rgba(139,174,214,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8BAED6" strokeWidth="1.8">{a.d}</svg>
            </div>
            <span style={{fontSize:11,fontWeight:700,color:'#A8C4E8'}}>{a.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Live Battles */}
      <div style={{padding:'0 20px 8px',fontSize:10,textTransform:'uppercase',letterSpacing:'1.2px',color:'rgba(238,242,247,.22)',fontWeight:600}}>Live Battles</div>
      <div style={{display:'flex',gap:10,padding:'0 16px 14px',overflowX:'auto',scrollbarWidth:'none'}}>
        <motion.div whileTap={{scale:.97}} onClick={() => navigate('/arena')} style={{minWidth:200,borderRadius:20,overflow:'hidden',position:'relative',height:130,flexShrink:0,cursor:'pointer'}}>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,#0a1628,#0f2040,#1a3a60)'}}/>
          <div style={{position:'absolute',top:0,bottom:0,left:'50%',width:1,background:'linear-gradient(to bottom,transparent,rgba(139,174,214,.3),transparent)'}}/>
          <div style={{position:'absolute',left:0,top:0,bottom:0,width:'50%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#F7931A,#E8820A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:'white',boxShadow:'0 0 12px rgba(247,147,26,.4)'}}>₿</div>
            <span style={{fontSize:10,fontWeight:800,color:'#EEF2F7'}}>ALPHA</span>
            <span style={{fontSize:9,color:'rgba(139,174,214,.6)'}}>62%</span>
          </div>
          <div style={{position:'absolute',right:0,top:0,bottom:0,width:'50%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4}}>
            <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,#627EEA,#4060C8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:900,color:'white',boxShadow:'0 0 12px rgba(98,126,234,.4)'}}>Ξ</div>
            <span style={{fontSize:10,fontWeight:800,color:'#EEF2F7'}}>OMEGA</span>
            <span style={{fontSize:9,color:'rgba(139,174,214,.6)'}}>38%</span>
          </div>
          <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'rgba(139,174,214,.15)',border:'1px solid rgba(139,174,214,.3)',borderRadius:8,padding:'3px 7px'}}><span style={{fontSize:9,fontWeight:900,color:'#A8C4E8'}}>VS</span></div>
          <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'7px 10px',background:'linear-gradient(to top,rgba(0,0,0,.7),transparent)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:9,fontWeight:700,color:'rgba(238,242,247,.7)'}}>Boost Battle</span>
            <div style={{display:'flex',alignItems:'center',gap:3,background:'rgba(93,176,138,.15)',border:'1px solid rgba(93,176,138,.3)',borderRadius:8,padding:'2px 6px'}}>
              <div style={{width:5,height:5,borderRadius:'50%',background:'#5DB08A',animation:'pulse 1.5s infinite'}}/>
              <span style={{fontSize:8,fontWeight:700,color:'#5DB08A'}}>LIVE</span>
            </div>
          </div>
        </motion.div>
        <motion.div whileTap={{scale:.97}} onClick={() => navigate('/arena')} style={{minWidth:160,borderRadius:20,overflow:'hidden',position:'relative',height:130,flexShrink:0,cursor:'pointer',opacity:.8}}>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,#081420,#0c1e30)'}}/>
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8}}>
            <div style={{width:44,height:44,borderRadius:'50%',background:'rgba(139,174,214,.08)',border:'1px solid rgba(139,174,214,.22)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8BAED6" strokeWidth="1.6"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <span style={{fontSize:11,fontWeight:700,color:'rgba(238,242,247,.5)'}}>Coming Soon</span>
            <span style={{fontSize:9,color:'rgba(238,242,247,.22)'}}>Next battle in 4h</span>
          </div>
          <div style={{position:'absolute',inset:0,borderRadius:20,border:'1px dashed rgba(139,174,214,.2)',pointerEvents:'none'}}/>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px 10px'}}>
        <span style={{fontSize:15,fontWeight:800,color:'#EEF2F7'}}>Recent Activity</span>
        <button onClick={() => navigate('/nexus')} style={{fontSize:12,color:'#8BAED6',fontWeight:600,cursor:'pointer',background:'none',border:'none'}}>See all</button>
      </div>
      <div style={{padding:'0 16px 20px'}}>
        {[
          {bg:'rgba(93,176,138,.1)', bdr:'rgba(93,176,138,.2)',  stk:'#5DB08A', d:<path d="M15 5l4 4-8 8-5 1 1-5 8-8z"/>,                       label:'Mining Session',  sub:'Today · ongoing',         val:`+${liveEarnings.toFixed(2)}`, vc:'#5DB08A'},
          {bg:'rgba(139,174,214,.07)',bdr:'rgba(139,174,214,.14)',stk:'#8BAED6', d:<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>, label:'Session Complete', sub:'Yesterday · 8hr',           val:'+1,186.40',          vc:'#8BAED6'},
          {bg:'rgba(200,150,60,.08)', bdr:'rgba(200,150,60,.18)', stk:'#C8963C', d:<path d="M12 2l2.5 7h7l-5.5 4 2 7L12 16l-6 4 2-7L2 9h7z"/>, label:'Streak Bonus',    sub:`${streakDays}-day streak`, val:'+50.00',             vc:'#C8963C'},
        ].map((it,i) => (
          <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'13px 14px',borderRadius:16,marginBottom:6,background:'#0d1117',border:'1px solid rgba(139,174,214,.07)'}}>
            <div style={{width:40,height:40,borderRadius:13,background:it.bg,border:`1px solid ${it.bdr}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={it.stk} strokeWidth="2">{it.d}</svg>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:'#EEF2F7'}}>{it.label}</div>
              <div style={{fontSize:10,color:'rgba(238,242,247,.3)',marginTop:1}}>{it.sub}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:14,fontWeight:800,color:it.vc}}>{it.val}</div>
              <div style={{fontSize:9,color:'rgba(238,242,247,.3)'}}>ARX-P</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
