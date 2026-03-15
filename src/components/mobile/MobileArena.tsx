import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useArena } from '@/hooks/useArena';
import { useState, useEffect } from 'react';

const BRAND = '#0c1e38'; const BRAND3 = '#061220';
const STEEL = '#8BAED6'; const STEEL3 = '#C8E0FF'; const TEXT = '#EEF2F7';

const anim = `
@keyframes strokeDash{0%{stroke-dashoffset:600}100%{stroke-dashoffset:0}}
@keyframes strokeGlow{0%,100%{opacity:.45;stroke-width:1.5}50%{opacity:1;stroke-width:2.5}}
@keyframes shimmerswipe{0%{left:-120%}65%,100%{left:160%}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
`;

function StrokeCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ position:'relative', borderRadius:26, overflow:'hidden', background:`linear-gradient(145deg,${BRAND},#0a1828,${BRAND3})`, ...style }}>
      <style>{anim}</style>
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }} viewBox="0 0 311 200" preserveAspectRatio="none">
        <path d="M 16 2 Q 155 -6 295 2" fill="none" stroke="rgba(139,174,214,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600"
          style={{ animation:'strokeDash 3s ease-in-out infinite alternate, strokeGlow 2.5s ease-in-out infinite' }}/>
        <path d="M 16 198 Q 155 206 295 198" fill="none" stroke="rgba(168,196,232,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600"
          style={{ animation:'strokeDash 3s ease-in-out infinite alternate, strokeGlow 2.5s ease-in-out infinite', animationDelay:'0.5s' }}/>
      </svg>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(200,228,255,.2),transparent)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', top:0, left:'-120%', width:'50%', height:'100%', background:'linear-gradient(90deg,transparent,rgba(168,196,232,.05),transparent)', animation:'shimmerswipe 5s ease-in-out infinite', pointerEvents:'none' }}/>
      <div style={{ position:'relative', zIndex:5 }}>{children}</div>
    </div>
  );
}

export default function MobileArena() {
  const navigate = useNavigate();
  const [vote, setVote] = useState<'alpha'|'omega'|null>(null);
  const [stakeAmt, setStakeAmt] = useState('');
  const [timer, setTimer] = useState(2700);

  useEffect(() => {
    const t = setInterval(() => setTimer(s => Math.max(0, s-1)), 1000);
    return () => clearInterval(t);
  }, []);

  const m = String(Math.floor(timer/60)).padStart(2,'0');
  const s = String(timer%60).padStart(2,'0');
  const alphaPct = 57; const omegaPct = 43;
  const alphaPool = 12840; const omegaPool = 9620;

  return (
    <div style={{ minHeight:'100vh', background:'#000', fontFamily:"'Creato Display', -apple-system, system-ui, sans-serif", paddingBottom:90 }}>
      <div style={{ padding:'52px 20px 12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:21, fontWeight:900, color:TEXT, letterSpacing:'-.4px' }}>Arena</div>
          <div style={{ fontSize:11, color:'rgba(238,242,247,.3)', marginTop:2 }}>Predict &amp; earn ARX-P</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(224,96,96,.1)', border:'1px solid rgba(224,96,96,.22)', borderRadius:20, padding:'5px 12px' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#E06060', animation:'pulse 1.2s infinite' }}/>
          <span style={{ fontSize:11, fontWeight:700, color:'#E06060' }}>LIVE</span>
        </div>
      </div>

      {/* Battle hero card */}
      <div style={{ margin:'0 16px 12px' }}>
        <StrokeCard>
          <div style={{ padding:'20px 18px' }}>
            <div style={{ fontSize:9, textTransform:'uppercase', letterSpacing:'1.2px', color:'rgba(168,196,232,.45)', fontWeight:600, marginBottom:4 }}>Current Battle</div>
            <div style={{ fontSize:22, fontWeight:900, color:'#fff', marginBottom:14, letterSpacing:'-.5px' }}>⚔️ Boost Battle</div>
            {/* VS Split */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <motion.div whileTap={{ scale:0.97 }} onClick={() => setVote('alpha')}
                style={{ flex:1, background:'rgba(139,174,214,.07)', border:`2px solid ${vote==='alpha'?'rgba(139,174,214,.5)':'rgba(139,174,214,.15)'}`, borderRadius:16, padding:'14px 12px', textAlign:'center', cursor:'pointer', transition:'border-color .2s' }}>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'1px', color:'rgba(139,174,214,.55)', fontWeight:700, marginBottom:4 }}>ALPHA</div>
                <div style={{ fontSize:22, fontWeight:900, color:TEXT }}>{alphaPct}%</div>
                <div style={{ fontSize:10, color:'rgba(139,174,214,.45)', marginTop:2 }}>{alphaPool.toLocaleString()} ARX-P</div>
                {vote==='alpha' && <div style={{ fontSize:10, color:'#5DB08A', marginTop:6, fontWeight:700 }}>✓ Your vote</div>}
              </motion.div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flexShrink:0 }}>
                <div style={{ fontSize:14, fontWeight:900, color:'rgba(139,174,214,.4)' }}>VS</div>
                <div style={{ fontSize:11, fontWeight:700, color:'#E06060', fontVariantNumeric:'tabular-nums' }}>{m}:{s}</div>
                <div style={{ fontSize:8, color:'rgba(238,242,247,.25)', textTransform:'uppercase', letterSpacing:'.5px' }}>left</div>
              </div>
              <motion.div whileTap={{ scale:0.97 }} onClick={() => setVote('omega')}
                style={{ flex:1, background:'rgba(139,174,214,.07)', border:`2px solid ${vote==='omega'?'rgba(139,174,214,.5)':'rgba(139,174,214,.15)'}`, borderRadius:16, padding:'14px 12px', textAlign:'center', cursor:'pointer', transition:'border-color .2s' }}>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'1px', color:'rgba(139,174,214,.55)', fontWeight:700, marginBottom:4 }}>OMEGA</div>
                <div style={{ fontSize:22, fontWeight:900, color:TEXT }}>{omegaPct}%</div>
                <div style={{ fontSize:10, color:'rgba(139,174,214,.45)', marginTop:2 }}>{omegaPool.toLocaleString()} ARX-P</div>
                {vote==='omega' && <div style={{ fontSize:10, color:'#5DB08A', marginTop:6, fontWeight:700 }}>✓ Your vote</div>}
              </motion.div>
            </div>
            {/* Progress bar */}
            <div style={{ height:6, borderRadius:3, background:'rgba(139,174,214,.1)', overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:3, background:`linear-gradient(90deg,${STEEL},#A8C4E8)`, width:`${alphaPct}%`, transition:'width .5s ease' }}/>
            </div>
          </div>
        </StrokeCard>
      </div>

      {/* Stake */}
      <div style={{ padding:'0 16px 12px' }}>
        <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.8px', color:'rgba(139,174,214,.5)', fontWeight:600, marginBottom:8 }}>Stake Amount</div>
        <div style={{ background:`linear-gradient(145deg,${BRAND},${BRAND3})`, border:'1px solid rgba(139,174,214,.22)', borderRadius:16, padding:'14px 16px', display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <input type="number" value={stakeAmt} onChange={e => setStakeAmt(e.target.value)} placeholder="0"
            style={{ flex:1, background:'none', border:'none', outline:'none', fontSize:22, fontWeight:800, color:'#fff', fontFamily:"'Creato Display', system-ui" }}/>
          <span style={{ fontSize:13, fontWeight:700, color:STEEL }}>ARX-P</span>
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          {['100','500','1000','Max'].map(q => (
            <button key={q} onClick={() => setStakeAmt(q==='Max'?'99999':q)}
              style={{ flex:1, padding:'8px 0', borderRadius:12, background:'rgba(139,174,214,.07)', border:'1px solid rgba(139,174,214,.13)', color:STEEL, fontSize:12, fontWeight:700, cursor:'pointer', outline:'none' }}>
              {q}
            </button>
          ))}
        </div>
        <motion.button whileTap={{ scale:0.97 }}
          disabled={!vote||!stakeAmt}
          style={{ width:'100%', padding:17, borderRadius:18,
            background: vote&&stakeAmt ? `linear-gradient(135deg,${BRAND},#0c2040)` : 'rgba(139,174,214,.05)',
            border: `1px solid ${vote&&stakeAmt?'rgba(139,174,214,.3)':'rgba(139,174,214,.08)'}`,
            color: vote&&stakeAmt ? STEEL3 : 'rgba(238,242,247,.25)',
            fontSize:15, fontWeight:800, cursor:vote&&stakeAmt?'pointer':'not-allowed', outline:'none', transition:'all .2s',
            fontFamily:"'Creato Display', system-ui",
          }}>
          {vote ? `Stake on ${vote.toUpperCase()}` : 'Select ALPHA or OMEGA first'}
        </motion.button>
      </div>

      {/* Upcoming */}
      <div style={{ padding:'0 20px 10px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:15, fontWeight:800, color:TEXT }}>Next Battle</span>
        <span style={{ fontSize:11, color:'rgba(139,174,214,.4)', fontWeight:600 }}>In 4h</span>
      </div>
      <div style={{ padding:'0 16px', marginBottom:14 }}>
        <div style={{ height:80, borderRadius:20, background:'linear-gradient(135deg,#081420,#0c1e30)', border:'1px dashed rgba(139,174,214,.2)', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(139,174,214,.4)" strokeWidth="1.6"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          <span style={{ fontSize:12, fontWeight:700, color:'rgba(238,242,247,.4)' }}>Coming Soon · Next battle in 4h</span>
        </div>
      </div>

      {/* Live feed */}
      <div style={{ padding:'0 20px 8px', fontSize:10, textTransform:'uppercase', letterSpacing:'1px', color:'rgba(238,242,247,.25)', fontWeight:600 }}>Live Feed</div>
      <div style={{ padding:'0 16px 20px' }}>
        {[
          { init:'K', name:'Kira staked 500',  side:'ALPHA', ago:'1m ago', col:'#C8963C' },
          { init:'T', name:'Theo staked 300',  side:'OMEGA', ago:'2m ago', col:STEEL },
          { init:'A', name:'Ama staked 150',   side:'ALPHA', ago:'4m ago', col:STEEL },
          { init:'M', name:'Marco staked 200', side:'OMEGA', ago:'5m ago', col:STEEL },
        ].map((item,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:14, marginBottom:6, background:`linear-gradient(145deg,${BRAND},${BRAND3})`, border:'1px solid rgba(139,174,214,.1)' }}>
            <div style={{ width:36, height:36, borderRadius:12, background:'rgba(139,174,214,.08)', border:'1px solid rgba(139,174,214,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:item.col, flexShrink:0 }}>{item.init}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#C8E0FF' }}>{item.name}</div>
              <div style={{ fontSize:10, color:'rgba(139,174,214,.45)', marginTop:1 }}>on {item.side} · {item.ago}</div>
            </div>
            <span style={{ fontSize:10, fontWeight:700, color:'rgba(139,174,214,.5)', background:'rgba(139,174,214,.07)', border:'1px solid rgba(139,174,214,.12)', borderRadius:8, padding:'3px 8px' }}>{item.side}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
