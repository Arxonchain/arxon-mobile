// MobileNexus.tsx
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usePoints } from '@/hooks/usePoints';
import { useState } from 'react';

const BRAND = '#0c1e38'; const BRAND3 = '#061220';
const STEEL = '#8BAED6'; const STEEL3 = '#C8E0FF'; const TEXT = '#EEF2F7';
const anim = `@keyframes strokeDash{0%{stroke-dashoffset:600}100%{stroke-dashoffset:0}}@keyframes strokeGlow{0%,100%{opacity:.45;stroke-width:1.5}50%{opacity:1;stroke-width:2.5}}@keyframes shimmerswipe{0%{left:-120%}65%,100%{left:160%}}`;

function StrokeCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ position:'relative', borderRadius:26, overflow:'hidden', background:`linear-gradient(145deg,${BRAND},#0a1828,${BRAND3})`, ...style }}>
      <style>{anim}</style>
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents:'none' }} viewBox="0 0 311 140" preserveAspectRatio="none">
        <path d="M 16 2 Q 155 -6 295 2" fill="none" stroke="rgba(139,174,214,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600" style={{ animation:'strokeDash 3s ease-in-out infinite alternate, strokeGlow 2.5s ease-in-out infinite' }}/>
        <path d="M 16 138 Q 155 146 295 138" fill="none" stroke="rgba(168,196,232,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600" style={{ animation:'strokeDash 3s ease-in-out infinite alternate, strokeGlow 2.5s ease-in-out infinite', animationDelay:'0.5s' }}/>
      </svg>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(200,228,255,.2),transparent)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', top:0, left:'-120%', width:'50%', height:'100%', background:'linear-gradient(90deg,transparent,rgba(168,196,232,.05),transparent)', animation:'shimmerswipe 5s ease-in-out infinite', pointerEvents:'none' }}/>
      <div style={{ position:'relative', zIndex:5 }}>{children}</div>
    </div>
  );
}

const HISTORY = [
  { label:'Received from Kira', sub:'Today, 14:22', val:'+500', color:'#5DB08A', bg:'rgba(93,176,138,.1)', border:'rgba(93,176,138,.2)' },
  { label:'Sent to Sage',       sub:'Yesterday, 09:14', val:'-200', color:'#E06060', bg:'rgba(224,96,96,.08)', border:'rgba(224,96,96,.18)' },
  { label:'Mining Reward',      sub:'2 days ago', val:'+1,186', color:STEEL, bg:'rgba(139,174,214,.07)', border:'rgba(139,174,214,.14)' },
  { label:'Arena Win Reward',   sub:'4 days ago', val:'+300', color:'#C8963C', bg:'rgba(200,150,60,.08)', border:'rgba(200,150,60,.18)' },
];

export default function MobileNexus() {
  const { points } = usePoints();
  const [tab, setTab]       = useState<'send'|'receive'|'history'>('send');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [sent, setSent]     = useState(false);

  const handleNumpad = (key: string) => {
    if (key==='del') setAmount(a=>a.slice(0,-1));
    else if (key==='.'&&amount.includes('.')) return;
    else if (amount.length<10) setAmount(a=>a+key);
  };

  const handleSend = () => {
    if (!amount||amount==='0') return;
    setSent(true);
    setTimeout(() => { setSent(false); setAmount(''); setRecipient(''); }, 2200);
  };

  return (
    <div style={{ minHeight:'100vh', background:'#000', fontFamily:"'Creato Display', -apple-system, system-ui, sans-serif", paddingBottom:90 }}>
      <div style={{ padding:'52px 20px 8px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:21, fontWeight:900, color:TEXT, letterSpacing:'-.4px' }}>Nexus</div>
        <div style={{ display:'flex', gap:6 }}>
          {(['send','receive','history'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ background:tab===t?'rgba(139,174,214,.14)':'rgba(139,174,214,.05)', border:`1px solid ${tab===t?'rgba(139,174,214,.3)':'rgba(139,174,214,.1)'}`, borderRadius:20, padding:'5px 12px', fontSize:12, fontWeight:700, color:tab===t?STEEL:'rgba(238,242,247,.35)', cursor:'pointer', outline:'none', textTransform:'capitalize' }}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {tab==='send' && (
        <>
          <div style={{ margin:'8px 16px 10px' }}>
            <StrokeCard>
              <div style={{ padding:'24px 20px 20px', textAlign:'center' }}>
                <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'1px', color:'rgba(139,174,214,.45)', marginBottom:8, fontWeight:600 }}>ARX-P</div>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'center', marginBottom:6 }}>
                  <span style={{ fontSize:52, fontWeight:900, letterSpacing:'-2px', color:'#fff', lineHeight:1 }}>{amount||'0'}</span>
                  <span style={{ fontSize:20, fontWeight:700, color:'rgba(139,174,214,.5)', marginTop:8 }}>.00</span>
                </div>
                <div style={{ fontSize:12, color:'rgba(139,174,214,.35)' }}>Balance: {(points||0).toLocaleString()} ARX-P</div>
              </div>
            </StrokeCard>
          </div>
          <div style={{ padding:'0 16px 10px' }}>
            <div style={{ background:`linear-gradient(145deg,${BRAND},${BRAND3})`, border:'1px solid rgba(139,174,214,.22)', borderRadius:16, padding:'14px 16px', display:'flex', alignItems:'center', gap:10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(139,174,214,.5)" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <input value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="Username or address"
                style={{ flex:1, background:'none', border:'none', outline:'none', fontSize:14, fontWeight:600, color:TEXT, fontFamily:"'Creato Display', system-ui" }}/>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, padding:'0 16px 12px' }}>
            {['1','2','3','4','5','6','7','8','9','.','0','del'].map(k => (
              <motion.button key={k} whileTap={{ scale:0.93 }} onClick={() => handleNumpad(k)}
                style={{ background:'rgba(139,174,214,.07)', border:'1px solid rgba(139,174,214,.1)', borderRadius:16, padding:16, fontSize:22, fontWeight:700, color:TEXT, cursor:'pointer', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Creato Display', system-ui" }}>
                {k==='del' ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg> : k}
              </motion.button>
            ))}
          </div>
          <div style={{ padding:'0 16px 20px' }}>
            <motion.button whileTap={{ scale:0.97 }} onClick={handleSend}
              style={{ width:'100%', padding:17, borderRadius:18, background:sent?'rgba(93,176,138,.12)':`linear-gradient(135deg,${BRAND},#0c2040)`, border:`1px solid ${sent?'rgba(93,176,138,.3)':'rgba(139,174,214,.3)'}`, color:sent?'#5DB08A':STEEL3, fontSize:15, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:9, outline:'none', transition:'all .2s', fontFamily:"'Creato Display', system-ui" }}>
              {sent ? <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Sent!</> : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>Send ARX-P</>}
            </motion.button>
          </div>
        </>
      )}

      {tab==='receive' && (
        <div style={{ padding:'10px 16px 20px' }}>
          <StrokeCard style={{ marginBottom:14, textAlign:'center' }}>
            <div style={{ padding:'24px 20px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'rgba(139,174,214,.5)', marginBottom:16, textTransform:'uppercase', letterSpacing:'1px' }}>Your Address</div>
              <div style={{ width:140, height:140, margin:'0 auto 16px', background:'rgba(139,174,214,.06)', border:'2px solid rgba(139,174,214,.18)', borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <rect x="4" y="4" width="28" height="28" rx="3" fill="none" stroke="rgba(139,174,214,.5)" strokeWidth="2"/>
                  <rect x="10" y="10" width="16" height="16" rx="1" fill="rgba(139,174,214,.35)"/>
                  <rect x="48" y="4" width="28" height="28" rx="3" fill="none" stroke="rgba(139,174,214,.5)" strokeWidth="2"/>
                  <rect x="54" y="10" width="16" height="16" rx="1" fill="rgba(139,174,214,.35)"/>
                  <rect x="4" y="48" width="28" height="28" rx="3" fill="none" stroke="rgba(139,174,214,.5)" strokeWidth="2"/>
                  <rect x="10" y="54" width="16" height="16" rx="1" fill="rgba(139,174,214,.35)"/>
                  <rect x="48" y="48" width="8" height="8" rx="1" fill="rgba(139,174,214,.35)"/>
                  <rect x="60" y="48" width="8" height="8" rx="1" fill="rgba(139,174,214,.35)"/>
                  <rect x="60" y="60" width="16" height="16" rx="1" fill="rgba(139,174,214,.35)"/>
                </svg>
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:TEXT, marginBottom:4, fontFamily:'monospace' }}>@your.arxon</div>
              <div style={{ fontSize:10, color:'rgba(139,174,214,.4)', fontFamily:'monospace' }}>ARX-P address</div>
            </div>
          </StrokeCard>
          <button style={{ width:'100%', padding:15, borderRadius:18, background:`linear-gradient(135deg,${BRAND},#0c2040)`, border:'1px solid rgba(139,174,214,.3)', color:STEEL3, fontSize:14, fontWeight:800, cursor:'pointer', outline:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:"'Creato Display', system-ui" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Copy Address
          </button>
        </div>
      )}

      {tab==='history' && (
        <div style={{ padding:'10px 16px 20px' }}>
          {HISTORY.map((item,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 14px', borderRadius:16, marginBottom:6, background:`linear-gradient(145deg,${BRAND},${BRAND3})`, border:'1px solid rgba(139,174,214,.08)' }}>
              <div style={{ width:40, height:40, borderRadius:13, background:item.bg, border:`1px solid ${item.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={item.color} strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color:TEXT }}>{item.label}</div>
                <div style={{ fontSize:10, color:'rgba(238,242,247,.3)', marginTop:1 }}>{item.sub}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:14, fontWeight:800, color:item.color }}>{item.val}</div>
                <div style={{ fontSize:9, color:'rgba(238,242,247,.3)' }}>ARX-P</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
