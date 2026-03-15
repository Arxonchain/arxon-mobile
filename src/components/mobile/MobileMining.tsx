import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMining } from '@/hooks/useMining';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { Clock, Zap, Copy } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';
import AuthDialog from '@/components/auth/AuthDialog';

const BRAND  = '#0c1e38';
const BRAND3 = '#061220';
const STEEL  = '#8BAED6';
const STEEL3 = '#C8E0FF';
const TEXT   = '#EEF2F7';

const cardAnim = `
@keyframes strokeDash{0%{stroke-dashoffset:600}100%{stroke-dashoffset:0}}
@keyframes strokeGlow{0%,100%{opacity:.45;stroke-width:1.5}50%{opacity:1;stroke-width:2.5}}
@keyframes shimmerswipe{0%{left:-120%}65%,100%{left:160%}}
@keyframes coinfloat3d{0%,100%{transform:translateY(0) rotateY(0deg)}25%{transform:translateY(-8px) rotateY(15deg)}50%{transform:translateY(-10px) rotateY(0deg)}75%{transform:translateY(-6px) rotateY(-12deg)}}
@keyframes coinorbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes miningcore{0%,100%{transform:scale(1);filter:drop-shadow(0 0 8px rgba(139,174,214,.5))}50%{transform:scale(1.06);filter:drop-shadow(0 0 16px rgba(139,174,214,.9))}}
@keyframes particlerise{0%{transform:translateY(0);opacity:0}10%{opacity:.7}90%{opacity:.2}100%{transform:translateY(-80px);opacity:0}}
@keyframes pulsering{0%,100%{opacity:.5;transform:translate(-50%,-50%) scale(1)}50%{opacity:.15;transform:translate(-50%,-50%) scale(1.05)}}
@keyframes barbeat{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.16)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
`;

function StrokeCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ position:'relative', borderRadius:26, overflow:'hidden', background:`linear-gradient(145deg,${BRAND} 0%,#0a1828 50%,${BRAND3} 100%)`, ...style }}>
      <style>{cardAnim}</style>
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }} viewBox="0 0 311 280" preserveAspectRatio="none">
        <path d="M 18 2 Q 155 -6 293 2" fill="none" stroke="rgba(139,174,214,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600"
          style={{ animation:'strokeDash 3s ease-in-out infinite alternate, strokeGlow 2.5s ease-in-out infinite' }}/>
        <path d="M 18 278 Q 155 286 293 278" fill="none" stroke="rgba(168,196,232,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600"
          style={{ animation:'strokeDash 3s ease-in-out infinite alternate, strokeGlow 2.5s ease-in-out infinite', animationDelay:'0.5s' }}/>
        <path d="M 2 20 Q -6 140 2 260" fill="none" stroke="rgba(200,228,255,0.2)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600"
          style={{ animation:'strokeDash 3s ease-in-out infinite alternate, strokeGlow 2.5s ease-in-out infinite', animationDelay:'1s' }}/>
        <path d="M 309 20 Q 317 140 309 260" fill="none" stroke="rgba(139,174,214,0.35)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600"
          style={{ animation:'strokeDash 3s ease-in-out infinite alternate, strokeGlow 2.5s ease-in-out infinite', animationDelay:'1.5s' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, borderRadius:26, pointerEvents:'none', zIndex:1 }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(200,228,255,.2),transparent)' }}/>
        <div style={{ position:'absolute', top:0, left:'-120%', width:'50%', height:'100%', background:'linear-gradient(90deg,transparent,rgba(168,196,232,.05),transparent)', animation:'shimmerswipe 5s ease-in-out infinite' }}/>
      </div>
      {/* Stars */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none', zIndex:1 }} viewBox="0 0 311 280">
        {[[40,20],[120,35],[220,18],[280,50],[60,80],[180,65],[250,90]].map(([cx,cy],i)=>(
          <circle key={i} cx={cx} cy={cy} r={0.7} fill={i%2===0?'#A8C4E8':'white'} opacity={0.5}>
            <animate attributeName="opacity" values="0.3;1;0.3" dur={`${1.8+i*0.3}s`} repeatCount="indefinite"/>
          </circle>
        ))}
      </svg>
      <div style={{ position:'relative', zIndex:5 }}>{children}</div>
    </div>
  );
}

function ArxonCoin({ active }: { active: boolean }) {
  return (
    <div style={{ position:'relative', width:100, height:100, animation: active ? 'miningcore 2s ease-in-out infinite' : 'coinfloat3d 4s ease-in-out infinite' }}>
      <svg width="100" height="100" viewBox="0 0 92 92">
        <defs>
          <radialGradient id="mcf" cx="36%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#C8E0FF"/><stop offset="30%" stopColor="#8BAED6"/>
            <stop offset="65%" stopColor="#3A6898"/><stop offset="100%" stopColor="#0E2244"/>
          </radialGradient>
          <linearGradient id="mce" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4A7AB8"/><stop offset="100%" stopColor="#081828"/>
          </linearGradient>
          <filter id="mcs"><feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(0,0,0,0.5)"/></filter>
        </defs>
        <ellipse cx="46" cy="47" rx="36" ry="9" fill="url(#mce)"/>
        <circle cx="46" cy="46" r="36" fill="url(#mcf)" filter="url(#mcs)"/>
        <g transform="translate(46,46)">
          <circle r="22" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
          <text x="0" y="6" textAnchor="middle" fontSize="16" fontWeight="900" fill="white" fontFamily="-apple-system,sans-serif" letterSpacing="-1">ARX</text>
          <text x="0" y="20" textAnchor="middle" fontSize="6" fontWeight="600" fill="rgba(200,228,255,0.7)" fontFamily="-apple-system,sans-serif" letterSpacing="1.5">ARXON</text>
        </g>
      </svg>
      {/* Orbit rings */}
      <div style={{ position:'absolute', inset:-10, borderRadius:'50%', border:'1px solid rgba(139,174,214,.18)', animation:'coinorbit 5s linear infinite', pointerEvents:'none' }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:STEEL, position:'absolute', top:-4, left:'50%', transform:'translateX(-50%)', boxShadow:'0 0 10px rgba(139,174,214,1)' }}/>
      </div>
      <div style={{ position:'absolute', inset:-22, borderRadius:'50%', border:'1px solid rgba(139,174,214,.07)', animation:'coinorbit 10s linear infinite reverse', pointerEvents:'none' }}>
        <div style={{ width:5, height:5, borderRadius:'50%', background:'rgba(168,196,232,.55)', position:'absolute', top:-2.5, left:'50%', transform:'translateX(-50%)' }}/>
      </div>
      {/* Pulse rings */}
      <div style={{ position:'absolute', top:'50%', left:'50%', width:160, height:160, borderRadius:'50%', border:'1px solid rgba(139,174,214,.12)', animation:'pulsering 3s ease-in-out infinite', pointerEvents:'none' }}/>
    </div>
  );
}

export default function MobileMining() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { points } = usePoints();
  const { profile } = useProfile();
  const {
    isMining, loading, settingsLoading, elapsedTime, remainingTime,
    earnedPoints, maxTimeSeconds, startMining, stopMining, claimPoints,
    formatTime, pointsPerSecond, pointsPerHour, totalBoostPercentage, miningSettings
  } = useMining({ tickMs: 250 });
  const [showAuth, setShowAuth] = useState(false);
  const [chartRange, setChartRange] = useState('1D');

  const miningDisabled = !settingsLoading && !miningSettings?.publicMiningEnabled;
  const progressPct = maxTimeSeconds > 0 ? Math.min((elapsedTime / maxTimeSeconds) * 100, 100) : 0;
  const circumference = 2 * Math.PI * 84;

  const copyCode = () => {
    if (!profile?.referral_code) return;
    navigator.clipboard.writeText(profile.referral_code);
    toast({ title:'Copied!', description:'Referral code copied' });
  };

  const handleMine = () => {
    if (!user) { setShowAuth(true); return; }
    if (isMining) stopMining(); else startMining();
  };

  const particles = [
    { left:'28%', delay:'0s', dur:'2.8s' },
    { left:'45%', delay:'0.6s', dur:'3.1s' },
    { left:'60%', delay:'1.1s', dur:'2.5s' },
    { left:'35%', delay:'1.7s', dur:'3.4s' },
    { left:'55%', delay:'0.3s', dur:'2.9s' },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'#000', fontFamily:"'Creato Display', -apple-system, system-ui, sans-serif", paddingBottom:90 }}>

      {/* Header */}
      <div style={{ padding:'52px 20px 12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:21, fontWeight:900, color:TEXT, letterSpacing:'-.4px' }}>Mining</div>
          <div style={{ fontSize:11, color:'rgba(238,242,247,.3)', marginTop:2 }}>Live session dashboard</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5, background:isMining?'rgba(93,176,138,.12)':'rgba(100,100,100,.1)', border:`1px solid ${isMining?'rgba(93,176,138,.28)':'rgba(100,100,100,.2)'}`, borderRadius:20, padding:'5px 12px' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:isMining?'#5DB08A':'rgba(238,242,247,.3)', animation:isMining?'pulse 2s infinite':'none' }}/>
          <span style={{ fontSize:11, fontWeight:700, color:isMining?'#5DB08A':'rgba(238,242,247,.4)' }}>{isMining?`Active · ${(pointsPerHour||0).toFixed(1)}/hr`:'Idle'}</span>
        </div>
      </div>

      {/* Hero mining card */}
      <StrokeCard style={{ margin:'0 16px 12px', position:'relative' }}>
        {/* Particles */}
        {isMining && particles.map((p,i) => (
          <div key={i} style={{ position:'absolute', bottom:'30%', left:p.left, width:4, height:4, borderRadius:'50%', background:'rgba(139,174,214,.7)', animation:`particlerise ${p.dur} ${p.delay} ease-out infinite`, zIndex:2, pointerEvents:'none' }}/>
        ))}
        {/* Energy beam */}
        <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:1, height:'60%', background:'linear-gradient(to top,rgba(139,174,214,.4),transparent)', pointerEvents:'none', zIndex:2 }}/>

        <div style={{ padding:'20px 20px 10px', display:'flex', flexDirection:'column', alignItems:'center' }}>
          {/* Ring + coin */}
          <div style={{ display:'flex', justifyContent:'center', padding:'4px 0 16px', position:'relative', width:196, height:196, flexShrink:0 }}>
            {/* Progress ring */}
            <svg style={{ position:'absolute', top:0, left:0 }} width="196" height="196" viewBox="0 0 196 196">
              <defs>
                <linearGradient id="rg2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3a70aa"/><stop offset="100%" stopColor="#A8C4E8"/>
                </linearGradient>
              </defs>
              <circle cx="98" cy="98" r="84" fill="none" stroke="rgba(139,174,214,.05)" strokeWidth="10"/>
              <circle cx="98" cy="98" r="84" fill="none" stroke="rgba(139,174,214,.08)" strokeWidth="18" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={circumference*(1-progressPct/100)}
                transform="rotate(-90 98 98)" style={{ filter:'blur(5px)', transition:'stroke-dashoffset 0.5s' }}/>
              <circle cx="98" cy="98" r="84" fill="none" stroke="url(#rg2)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={circumference*(1-progressPct/100)}
                transform="rotate(-90 98 98)" style={{ transition:'stroke-dashoffset 0.5s' }}/>
            </svg>
            {/* Coin centred inside ring */}
            <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)' }}>
              <ArxonCoin active={isMining}/>
            </div>
          </div>

          {/* Session earnings */}
          <div style={{ textAlign:'center', padding:'4px 20px 14px', width:'100%' }}>
            <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'1.2px', color:'rgba(139,174,214,.4)', fontWeight:600, marginBottom:6 }}>Session Earnings</div>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:6 }}>
              <span style={{ fontSize:48, fontWeight:900, letterSpacing:'-2px', color:'#fff', lineHeight:1 }}>{Math.floor(earnedPoints||0).toLocaleString()}</span>
              <span style={{ fontSize:18, fontWeight:700, color:'rgba(139,174,214,.55)', marginTop:8 }}>.{String((earnedPoints||0).toFixed(2)).split('.')[1]}</span>
            </div>
            <div style={{ fontSize:12, color:'rgba(139,174,214,.45)', marginTop:4 }}>ARX-P this session</div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginTop:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(93,176,138,.12)', border:'1px solid rgba(93,176,138,.28)', borderRadius:20, padding:'5px 13px' }}>
                <svg width="9" height="9" viewBox="0 0 10 10"><polygon points="5,1 9,9 1,9" fill="#5DB08A"/></svg>
                <span style={{ fontSize:11, fontWeight:700, color:'#5DB08A' }}>{(pointsPerHour||0).toFixed(1)} ARX-P/hr</span>
              </div>
              {totalBoostPercentage > 0 && (
                <div style={{ background:'rgba(200,150,60,.1)', border:'1px solid rgba(200,150,60,.25)', borderRadius:20, padding:'5px 11px' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'#C8963C' }}>🔥 +{totalBoostPercentage}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </StrokeCard>

      {/* 3 stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, padding:'0 16px 14px' }}>
        {[
          { label:'Elapsed',   val:formatTime(elapsedTime),   color:TEXT },
          { label:'Per Hour',  val:`${(pointsPerHour||0).toFixed(1)}`, color:STEEL },
          { label:'Boost',     val:`+${totalBoostPercentage||0}%`, color:'#C8963C', labelColor:'rgba(200,150,60,.6)' },
        ].map((s,i) => (
          <div key={i} style={{ background:'#0d1117', border:'1px solid rgba(139,174,214,.1)', borderRadius:16, padding:12, textAlign:'center' }}>
            <div style={{ fontSize:8, textTransform:'uppercase', letterSpacing:'.8px', color:s.labelColor||'rgba(139,174,214,.38)', fontWeight:600, marginBottom:6 }}>{s.label}</div>
            <div style={{ fontSize:14, fontWeight:900, color:s.color, fontVariantNumeric:'tabular-nums' }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Stop / Start button */}
      <div style={{ padding:'0 16px 14px' }}>
        <motion.button whileTap={{ scale:0.97 }} onClick={handleMine}
          disabled={loading||miningDisabled}
          style={{ width:'100%', padding:17, borderRadius:18,
            background: isMining ? 'rgba(224,96,96,.08)' : `linear-gradient(135deg,${BRAND},#0c2040)`,
            border: isMining ? '1px solid rgba(224,96,96,.22)' : '1px solid rgba(139,174,214,.3)',
            color: isMining ? '#E06060' : STEEL3,
            fontSize:15, fontWeight:800, cursor:miningDisabled?'not-allowed':'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:9,
            fontFamily:"'Creato Display', -apple-system, system-ui, sans-serif",
            transition:'all .2s',
          }}>
          {isMining
            ? <><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>Stop &amp; Collect</>
            : <><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>Start Mining</>
          }
        </motion.button>
      </div>

      {/* Claim button */}
      {isMining && (earnedPoints||0) > 0 && (
        <div style={{ padding:'0 16px 14px' }}>
          <motion.button whileTap={{ scale:0.96 }} onClick={claimPoints}
            style={{ width:'100%', padding:14, borderRadius:16, border:'1px solid rgba(93,176,138,.28)', background:'rgba(93,176,138,.1)', color:'#5DB08A', fontSize:14, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontFamily:"'Creato Display', system-ui" }}>
            <Zap size={14}/> Claim {(earnedPoints||0).toFixed(0)} ARX-P now
          </motion.button>
        </div>
      )}

      {/* Chart */}
      <div style={{ padding:'0 16px 12px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <span style={{ fontSize:15, fontWeight:800, color:TEXT }}>Earnings Chart</span>
          <div style={{ display:'flex', gap:4 }}>
            {['1D','1W','1M','All'].map(r => (
              <button key={r} onClick={() => setChartRange(r)}
                style={{ padding:'4px 10px', borderRadius:10, fontSize:11, fontWeight:700, border:'none', cursor:'pointer', background:chartRange===r?'rgba(139,174,214,.18)':'transparent', color:chartRange===r?STEEL:'rgba(139,174,214,.4)', outline:'none' }}>
                {r}
              </button>
            ))}
          </div>
        </div>
        <div style={{ background:'#0d1117', border:'1px solid rgba(139,174,214,.08)', borderRadius:18, padding:'16px 14px 10px', height:100, display:'flex', alignItems:'flex-end', gap:4 }}>
          {[30,45,62,38,70,55,82,48,90,65,78,85,92,70,88].map((h,i) => (
            <div key={i} style={{ flex:1, borderRadius:'3px 3px 0 0', background:i===14?'linear-gradient(to top,rgba(139,174,214,.5),rgba(190,220,255,.8))':'rgba(139,174,214,.12)', height:`${h}%`, animation:`barbeat 2.4s ease-in-out infinite ${i*0.08}s` }}/>
          ))}
        </div>
      </div>

      {/* Referral */}
      {profile?.referral_code && (
        <div style={{ margin:'0 16px 20px', background:'rgba(139,174,214,.05)', border:'1px solid rgba(139,174,214,.1)', borderRadius:16, padding:'13px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:8, textTransform:'uppercase', letterSpacing:'.8px', color:'rgba(139,174,214,.38)', marginBottom:3, fontWeight:600 }}>Referral Code</div>
            <div style={{ fontSize:15, fontWeight:700, color:STEEL, letterSpacing:'.05em' }}>{profile.referral_code}</div>
          </div>
          <motion.button whileTap={{ scale:0.88 }} onClick={copyCode}
            style={{ width:34, height:34, borderRadius:10, background:'rgba(139,174,214,.1)', border:'1px solid rgba(139,174,214,.2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <Copy size={13} color={STEEL}/>
          </motion.button>
        </div>
      )}

      {showAuth && <AuthDialog open={showAuth} onOpenChange={setShowAuth}/>}
    </div>
  );
}
