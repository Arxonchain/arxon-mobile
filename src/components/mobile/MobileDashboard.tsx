import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { useMiningStatus } from '@/hooks/useMiningStatus';
import { Bell, Pickaxe, Swords, Trophy, Send, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

/* ── brand tokens ── */
const BRAND   = '#0c1e38';
const BRAND2  = '#0a1828';
const BRAND3  = '#061220';
const STEEL   = '#8BAED6';
const STEEL2  = '#A8C4E8';
const STEEL3  = '#C8E0FF';
const TEXT    = '#EEF2F7';
const DIM     = 'rgba(238,242,247,0.22)';
const BORDER  = 'rgba(139,174,214,0.13)';
const BORDER2 = 'rgba(139,174,214,0.22)';

/* ── animated stroke card ── */
const strokeAnim = `
@keyframes strokeDash{0%{stroke-dashoffset:600}100%{stroke-dashoffset:0}}
@keyframes strokeGlow{0%,100%{opacity:.5;stroke-width:1.5}50%{opacity:1;stroke-width:2.5}}
@keyframes shimmerswipe{0%{left:-120%}65%,100%{left:160%}}
@keyframes gemfloat{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-8px) rotate(3deg)}}
@keyframes coinfloat3d{0%,100%{transform:translateY(0) rotateY(0deg)}25%{transform:translateY(-8px) rotateY(15deg)}50%{transform:translateY(-10px) rotateY(0deg)}75%{transform:translateY(-6px) rotateY(-12deg)}}
@keyframes coinorbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes barbeat{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.16)}}
@keyframes rankpulse{0%,100%{box-shadow:0 0 5px rgba(139,174,214,.8)}50%{box-shadow:0 0 12px rgba(139,174,214,.3)}}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}
`;

function StrokeCard({ children, style, minHeight }: { children: React.ReactNode; style?: React.CSSProperties; minHeight?: number }) {
  return (
    <div style={{
      position: 'relative', borderRadius: 26, overflow: 'hidden',
      background: `linear-gradient(145deg, ${BRAND} 0%, ${BRAND2} 50%, ${BRAND3} 100%)`,
      minHeight, ...style
    }}>
      <style>{strokeAnim}</style>
      {/* Animated stroke SVG border */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', borderRadius: 26 }} viewBox="0 0 343 220" preserveAspectRatio="none">
        <path d="M 20 2 Q 171 -8 323 2" fill="none" stroke="rgba(139,174,214,0.55)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600"
          style={{ animation: 'strokeDash 3s ease-in-out infinite alternate, strokeGlow 2.5s ease-in-out infinite' }} />
        <path d="M 20 218 Q 171 228 323 218" fill="none" stroke="rgba(168,196,232,0.35)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600"
          style={{ animation: 'strokeDash 3s ease-in-out infinite alternate, strokeGlow 2.5s ease-in-out infinite', animationDelay: '0.4s' }} />
        <path d="M 2 20 Q -8 110 2 200" fill="none" stroke="rgba(200,228,255,0.25)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600"
          style={{ animation: 'strokeDash 3s ease-in-out infinite alternate, strokeGlow 2.5s ease-in-out infinite', animationDelay: '0.8s' }} />
        <path d="M 341 20 Q 351 110 341 200" fill="none" stroke="rgba(139,174,214,0.4)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600"
          style={{ animation: 'strokeDash 3s ease-in-out infinite alternate, strokeGlow 2.5s ease-in-out infinite', animationDelay: '1.2s' }} />
        <path d="M 2 40 Q 2 2 40 2" fill="none" stroke="rgba(168,196,232,0.35)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="80"
          style={{ animation: 'strokeDash 3s ease-in-out infinite alternate, strokeGlow 2.5s ease-in-out infinite', animationDelay: '0.2s' }} />
        <path d="M 341 180 Q 341 218 303 218" fill="none" stroke="rgba(200,228,255,0.25)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="80"
          style={{ animation: 'strokeDash 3s ease-in-out infinite alternate, strokeGlow 2.5s ease-in-out infinite', animationDelay: '0.6s' }} />
      </svg>
      {/* Atmosphere orbs */}
      <div style={{ position:'absolute', top:-40, right:-20, width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle,rgba(100,160,230,.1) 0%,transparent 70%)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', bottom:-30, left:-10, width:140, height:140, borderRadius:'50%', background:'radial-gradient(circle,rgba(80,130,200,.07) 0%,transparent 70%)', pointerEvents:'none' }} />
      {/* Stars */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }} viewBox="0 0 343 220">
        {[[28,18],[95,30],[175,14],[258,24],[316,38],[44,52],[140,46]].map(([cx,cy],i) => (
          <circle key={i} cx={cx} cy={cy} r={0.7+i*0.06} fill={i%3===0?STEEL2:'white'} opacity={0.5}>
            <animate attributeName="opacity" values={`${0.3+i*0.05};1;${0.3+i*0.05}`} dur={`${1.5+i*0.3}s`} repeatCount="indefinite"/>
          </circle>
        ))}
      </svg>
      {/* Top shine */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(200,228,255,.25),transparent)', pointerEvents:'none' }} />
      {/* Shimmer */}
      <div style={{ position:'absolute', top:0, left:'-120%', width:'50%', height:'100%', background:'linear-gradient(90deg,transparent,rgba(168,196,232,.06),transparent)', animation:'shimmerswipe 5s ease-in-out infinite', pointerEvents:'none' }} />
      {/* Content */}
      <div style={{ position:'relative', zIndex:5 }}>{children}</div>
    </div>
  );
}

function ArxonCoin() {
  return (
    <div style={{ animation:'coinfloat3d 4s ease-in-out infinite', position:'relative', width:92, height:92 }}>
      <svg width="92" height="92" viewBox="0 0 92 92">
        <defs>
          <radialGradient id="cf" cx="36%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#C8E0FF"/><stop offset="30%" stopColor="#8BAED6"/>
            <stop offset="65%" stopColor="#3A6898"/><stop offset="100%" stopColor="#0E2244"/>
          </radialGradient>
          <linearGradient id="ce" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4A7AB8"/><stop offset="50%" stopColor="#1E4A80"/><stop offset="100%" stopColor="#081828"/>
          </linearGradient>
          <radialGradient id="ch" cx="35%" cy="25%" r="55%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.3)"/><stop offset="100%" stopColor="rgba(255,255,255,0)"/>
          </radialGradient>
          <filter id="cs"><feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(0,0,0,0.5)"/></filter>
        </defs>
        <ellipse cx="46" cy="49" rx="8" ry="3" fill="url(#ce)"/>
        <ellipse cx="46" cy="47" rx="36" ry="9" fill="url(#ce)"/>
        <circle cx="46" cy="46" r="36" fill="url(#cf)" filter="url(#cs)"/>
        <ellipse cx="38" cy="30" rx="22" ry="12" fill="url(#ch)" style={{transform:'rotate(-25deg)',transformOrigin:'38px 30px'}}/>
        <g transform="translate(46,46)">
          <circle r="22" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
          <text x="0" y="6" textAnchor="middle" fontSize="16" fontWeight="900" fill="white" fontFamily="-apple-system,sans-serif" letterSpacing="-1">ARX</text>
          <line x1="-10" y1="12" x2="10" y2="12" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8"/>
          <text x="0" y="20" textAnchor="middle" fontSize="6" fontWeight="600" fill="rgba(200,228,255,0.7)" fontFamily="-apple-system,sans-serif" letterSpacing="1.5">ARXON</text>
        </g>
        <circle cx="46" cy="46" r="36" fill="none" stroke="rgba(168,196,232,0.2)" strokeWidth="0.5"/>
      </svg>
      <div style={{ position:'absolute', inset:-10, borderRadius:'50%', border:'1px solid rgba(139,174,214,.18)', animation:'coinorbit 5s linear infinite', pointerEvents:'none' }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:STEEL, position:'absolute', top:-4, left:'50%', transform:'translateX(-50%)', boxShadow:'0 0 10px rgba(139,174,214,1)' }}/>
      </div>
      <div style={{ position:'absolute', inset:-22, borderRadius:'50%', border:'1px solid rgba(139,174,214,.07)', animation:'coinorbit 10s linear infinite reverse', pointerEvents:'none' }}>
        <div style={{ width:5, height:5, borderRadius:'50%', background:'rgba(168,196,232,.55)', position:'absolute', top:-2.5, left:'50%', transform:'translateX(-50%)', boxShadow:'0 0 6px rgba(139,174,214,.6)' }}/>
      </div>
    </div>
  );
}

export default function MobileDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { points, rank } = usePoints();
  const { profile } = useProfile();
  const { isMining } = useMiningStatus();
  const [todayEarnings, setTodayEarnings]   = useState(0);
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [activityData, setActivityData]     = useState<{day:string;points:number}[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const now  = new Date();
      const today   = now.toISOString().split('T')[0];
      const weekAgo = new Date(now.getTime() - 7*86400000).toISOString().split('T')[0];
      const [td, wk, daily] = await Promise.all([
        supabase.from('mining_sessions').select('arx_mined').eq('user_id', user.id).gte('started_at', today),
        supabase.from('mining_sessions').select('arx_mined').eq('user_id', user.id).gte('started_at', weekAgo),
        supabase.from('mining_sessions').select('arx_mined, started_at').eq('user_id', user.id).gte('started_at', weekAgo).order('started_at', { ascending: true }),
      ]);
      setTodayEarnings(td.data?.reduce((s,r)=>s+Number(r.arx_mined||0),0)||0);
      setWeeklyEarnings(wk.data?.reduce((s,r)=>s+Number(r.arx_mined||0),0)||0);
      const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const totals: Record<string,number> = {};
      for (let i=6; i>=0; i--) {
        const d = new Date(now.getTime()-i*86400000);
        totals[d.toISOString().split('T')[0]] = 0;
      }
      daily.data?.forEach(s => { const k=s.started_at.split('T')[0]; if(totals[k]!==undefined) totals[k]+=Number(s.arx_mined||0); });
      setActivityData(Object.entries(totals).map(([date,pts])=>({day:dayNames[new Date(date).getDay()],points:pts})));
    })();
  }, [user]);

  const username = profile?.username || user?.email?.split('@')[0] || 'Miner';
  const bars = [38,55,30,68,46,60,85];

  return (
    <div style={{ minHeight:'100vh', background:'#000', fontFamily:"'Creato Display', -apple-system, system-ui, sans-serif", paddingBottom:90 }}>

      {/* Header */}
      <div style={{ padding:'52px 20px 10px', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:11, color:DIM, fontWeight:500, letterSpacing:'.04em', marginBottom:4 }}>Hi {username} 👋</div>
          <div style={{ fontSize:22, fontWeight:900, color:TEXT, letterSpacing:'-.5px' }}>Welcome back</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:4 }}>
          <motion.button whileTap={{ scale:0.9 }} onClick={() => navigate('/notifications')}
            style={{ width:36, height:36, borderRadius:'50%', background:'rgba(139,174,214,.07)', border:`1px solid ${BORDER}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}>
            <Bell size={16} color="rgba(139,174,214,.6)" />
            <div style={{ position:'absolute', top:6, right:7, width:7, height:7, borderRadius:'50%', background:'#E06060', border:'1.5px solid #000' }}/>
          </motion.button>
          <motion.button whileTap={{ scale:0.9 }} onClick={() => navigate('/profile')}
            style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg,#2a3a5c,#8BAED6)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:14, color:'#fff', cursor:'pointer', border:'2px solid rgba(139,174,214,.3)' }}>
            {username[0]?.toUpperCase()}
          </motion.button>
        </div>
      </div>

      {/* Hero Balance Card — animated strokes, brand deep */}
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.45 }}
        style={{ margin:'8px 16px 0' }}>
        <StrokeCard minHeight={220}>
          <div style={{ padding:'18px 18px 16px', display:'flex', gap:0, alignItems:'stretch' }}>
            {/* Left */}
            <div style={{ flex:1, minWidth:0, paddingRight:8 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div style={{ fontSize:8, textTransform:'uppercase', letterSpacing:'1.4px', color:'rgba(168,196,232,.45)', fontWeight:600 }}>Total Balance</div>
                <div style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(139,174,214,.1)', border:'1px solid rgba(139,174,214,.22)', borderRadius:20, padding:'3px 9px' }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:STEEL, animation:'rankpulse 2s infinite' }}/>
                  <span style={{ color:STEEL2, fontSize:10, fontWeight:700, whiteSpace:'nowrap' }}>Rank #{rank || '—'}</span>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'baseline', marginBottom:2 }}>
                <span style={{ fontSize:38, fontWeight:900, letterSpacing:'-1.8px', color:'#fff', lineHeight:1 }}>{(points||0).toLocaleString()}</span>
                <span style={{ fontSize:13, fontWeight:700, color:STEEL, marginLeft:6 }}>ARX-P</span>
              </div>
              <div style={{ fontSize:9, color:'rgba(139,174,214,.35)', marginBottom:14 }}>Your total mining rewards</div>
              {/* Stats strip */}
              <div style={{ display:'flex', gap:0, marginBottom:12 }}>
                {[
                  { label:'Today',     value:`+${todayEarnings.toLocaleString()}`,   color:TEXT },
                  { label:'This Week', value:`+${weeklyEarnings.toLocaleString()}`,  color:STEEL },
                  { label:'Streak',    value:`🔥 ${profile?.streak_days||0}d`,       color:'#d4884a' },
                ].map((s,i) => (
                  <div key={i} style={{ flex:1 }}>
                    {i>0 && <div style={{ position:'absolute', width:1, height:'100%', background:'rgba(139,174,214,.08)' }}/>}
                    <div style={{ paddingLeft: i>0?10:0, borderLeft: i>0?'1px solid rgba(139,174,214,.08)':'none' }}>
                      <div style={{ fontSize:7, textTransform:'uppercase', letterSpacing:'.9px', color:'rgba(168,196,232,.38)', fontWeight:600, marginBottom:2 }}>{s.label}</div>
                      <div style={{ fontSize:13, fontWeight:800, color:s.color }}>{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Wave bars */}
              <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:32 }}>
                {bars.map((h,i) => (
                  <div key={i} style={{ flex:1, borderRadius:'3px 3px 0 0', background: i===6?'linear-gradient(to top,rgba(139,174,214,.45),rgba(190,220,255,.65))':`rgba(139,174,214,${0.08+i*0.015})`, height:`${h}%`, animation:`barbeat 2.4s ease-in-out infinite ${i*0.15}s` }}/>
                ))}
              </div>
            </div>
            {/* Right: Coin */}
            <div style={{ width:108, flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative' }}>
              <ArxonCoin />
            </div>
          </div>
        </StrokeCard>
      </motion.div>

      {/* Mining active banner */}
      {isMining && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          onClick={() => navigate('/mining')}
          style={{ margin:'12px 16px 0', background:'rgba(93,176,138,.08)', border:'1px solid rgba(93,176,138,.22)', borderRadius:14, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#5DB08A', animation:'pulse 2s infinite' }}/>
            <span style={{ color:'#5DB08A', fontSize:13, fontWeight:700 }}>Mining Active</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4, color:'rgba(238,242,247,.3)', fontSize:12 }}>
            View session <ChevronRight size={14} />
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <div style={{ padding:'14px 20px 6px', fontSize:10, textTransform:'uppercase', letterSpacing:'1.2px', color:DIM, fontWeight:600 }}>Quick Access</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, padding:'0 16px 14px' }}>
        {[
          { icon: Pickaxe, label:'Mine',  path:'/mining' },
          { icon: Swords,  label:'Arena', path:'/arena' },
          { icon: Trophy,  label:'Ranks', path:'/leaderboard' },
          { icon: Send,    label:'Nexus', path:'/nexus' },
        ].map((action, i) => (
          <motion.button key={action.label}
            initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.06 }}
            whileTap={{ scale:0.88 }} onClick={() => navigate(action.path)}
            style={{ background:`linear-gradient(145deg,${BRAND},${BRAND3})`, border:`1px solid ${BORDER2}`, borderRadius:18, padding:'14px 6px', display:'flex', flexDirection:'column', alignItems:'center', gap:7, cursor:'pointer' }}>
            <action.icon size={21} color={STEEL} strokeWidth={2} />
            <span style={{ fontSize:10, fontWeight:700, color:STEEL3 }}>{action.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Bottom stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, padding:'0 16px 16px' }}>
        {[
          { label:'Mining', sub: isMining ? '⚡ Active now' : 'Tap to start', sub2:'148.2 ARX-P/hr', path:'/mining', iconColor:'#5DB08A', bg:'rgba(93,176,138,.1)', border:'rgba(93,176,138,.22)',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5DB08A" strokeWidth="2"><path d="M15 5l4 4-8 8-5 1 1-5 8-8z"/></svg> },
          { label:'Arena',  sub:'Boost Battle', sub2:'Live now ⚔️', path:'/arena', iconColor:'#B45FFF', bg:'rgba(180,95,255,.1)', border:'rgba(180,95,255,.2)',
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B45FFF" strokeWidth="2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><circle cx="19" cy="19" r="2"/><circle cx="5" cy="5" r="2"/></svg> },
        ].map((card) => (
          <motion.div key={card.label} whileTap={{ scale:0.96 }} onClick={() => navigate(card.path)}
            style={{ background:`linear-gradient(145deg,${BRAND},${BRAND3})`, border:`1px solid ${BORDER2}`, borderRadius:20, padding:16, cursor:'pointer', position:'relative', overflow:'hidden' }}>
            {/* Stroke accent */}
            <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }} viewBox="0 0 160 100">
              <path d="M 8 2 Q 80 -4 152 2" fill="none" stroke={`${card.iconColor}44`} strokeWidth="1.5" strokeDasharray="300"
                style={{ animation:'strokeDash 3s ease-in-out infinite alternate' }}/>
            </svg>
            <div style={{ position:'relative', zIndex:2 }}>
              <div style={{ width:34, height:34, borderRadius:11, background:card.bg, border:`1px solid ${card.border}`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
                {card.icon}
              </div>
              <div style={{ fontSize:15, fontWeight:800, color:TEXT, marginBottom:3 }}>{card.label}</div>
              <div style={{ fontSize:11, color:STEEL, marginBottom:2 }}>{card.sub}</div>
              <div style={{ fontSize:10, color:'rgba(238,242,247,.4)' }}>{card.sub2}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px 10px' }}>
        <span style={{ fontSize:15, fontWeight:800, color:TEXT }}>Recent Activity</span>
        <button onClick={() => navigate('/nexus')} style={{ fontSize:12, color:STEEL, fontWeight:600, cursor:'pointer', background:'none', border:'none' }}>See all</button>
      </div>
      <div style={{ padding:'0 16px 20px' }}>
        {[
          { icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#5DB08A" strokeWidth="2"><path d="M15 5l4 4-8 8-5 1 1-5 8-8z"/></svg>, bg:'rgba(93,176,138,.1)', border:'rgba(93,176,138,.2)', label:'Mining Session', sub:'Today · ongoing', val:`+${(todayEarnings||847).toFixed(2)}`, valColor:'#5DB08A' },
          { icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#8BAED6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>, bg:'rgba(139,174,214,.07)', border:'rgba(139,174,214,.14)', label:'Session Complete', sub:'Yesterday · 8hr', val:'+1,186.40', valColor:STEEL },
          { icon:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#C8963C" strokeWidth="2"><path d="M12 2l2.5 7h7l-5.5 4 2 7L12 16l-6 4 2-7L2 9h7z"/></svg>, bg:'rgba(200,150,60,.08)', border:'rgba(200,150,60,.18)', label:'Streak Bonus', sub:`${profile?.streak_days||2}-day streak`, val:'+50.00', valColor:'#C8963C' },
        ].map((item,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 14px', borderRadius:16, marginBottom:6, background:'#0d1117', border:'1px solid rgba(139,174,214,.07)' }}>
            <div style={{ width:40, height:40, borderRadius:13, background:item.bg, border:`1px solid ${item.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{item.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:TEXT }}>{item.label}</div>
              <div style={{ fontSize:10, color:'rgba(238,242,247,.3)', marginTop:1 }}>{item.sub}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:14, fontWeight:800, color:item.valColor }}>{item.val}</div>
              <div style={{ fontSize:9, color:'rgba(238,242,247,.3)' }}>ARX-P</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
