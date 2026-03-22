import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import AuthDialog from '@/components/auth/AuthDialog';
import { Copy, Check } from 'lucide-react';

const CSS = `
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes shimmer{0%{left:-100%}100%{left:200%}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
`;

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ position:'relative', borderRadius:22, overflow:'hidden',
      background:'linear-gradient(145deg,#0c1e38,#091525,#050e1a)', ...style }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1,
        background:'linear-gradient(90deg,transparent,rgba(200,228,255,.12),transparent)', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', top:0, left:'-100%', width:'60%', height:'100%',
        background:'linear-gradient(90deg,transparent,rgba(168,196,232,.04),transparent)',
        animation:'shimmer 5s ease-in-out infinite', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', inset:0, borderRadius:22,
        border:'1px solid rgba(139,174,214,.12)', pointerEvents:'none' }}/>
      <div style={{ position:'relative', zIndex:2 }}>{children}</div>
    </div>
  );
}

export default function MobileNexus() {
  const { user }                  = useAuth();
  const { points, refreshPoints } = usePoints();
  const { profile, loading: profileLoading } = useProfile();
  const [tab,     setTab]     = useState<'send'|'history'|'explorer'>('send');
  const [amount,  setAmount]  = useState('');
  const [receiver,setReceiver]= useState('');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [txList,  setTxList]  = useState<any[]>([]);
  const [allTx,   setAllTx]   = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [showAuth,setShowAuth]= useState(false);

  const balance    = points?.total_points ?? 0;
  const nexusAddr  = profile?.nexus_address;

  const fetchTx = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('nexus_transactions').select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at',{ ascending:false }).limit(20);
    setTxList(data||[]);
    setLoading(false);
  };
  const fetchAllTx = async () => {
    const { data } = await supabase.from('nexus_transactions').select('*')
      .eq('private_mode',false).order('created_at',{ ascending:false }).limit(30);
    setAllTx(data||[]);
  };

  useEffect(() => { if (user) { fetchTx(); fetchAllTx(); } }, [user]);

  const copyAddr = async () => {
    if (!nexusAddr) return;
    await navigator.clipboard.writeText(nexusAddr);
    setCopied(true);
    toast({ title:'Copied!', description:'Nexus UID copied' });
    setTimeout(()=>setCopied(false),2000);
  };

  const handleSend = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!receiver.trim()) { toast({ title:'Error', description:'Enter receiver UID', variant:'destructive' }); return; }
    const num = Number(amount);
    if (!Number.isInteger(num)||num<1||num>10) { toast({ title:'Error', description:'Amount must be 1–10 ARX-P', variant:'destructive' }); return; }
    if (balance<num) { toast({ title:'Insufficient', description:"Not enough ARX-P", variant:'destructive' }); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.rpc('send_nexus_transfer' as any,{
        p_sender_id:user.id, p_receiver_address:receiver.trim(), p_amount:num });
      if (error) throw error;
      const res = data as any;
      if (!res?.success) { toast({ title:'Failed', description:res?.error||'Unknown error', variant:'destructive' }); return; }
      toast({ title:'Sent! 🎉', description:`${num} ARX-P sent. +20% mining boost!` });
      setSent(true); setAmount(''); setReceiver('');
      await refreshPoints(); await fetchTx(); await fetchAllTx();
      setTimeout(()=>setSent(false),3000);
    } catch (e:any) { toast({ title:'Error', description:e.message, variant:'destructive' }); }
    finally { setSending(false); }
  };

  if (!user) return (
    <div style={{minHeight:'100vh',background:'#000',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'0 32px',fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif"}}>
      <style>{CSS}</style>
      <div style={{position:'relative',width:130,height:130,marginBottom:32}}>
        <svg style={{position:'absolute',inset:0,animation:'spin 8s linear infinite'}} width="130" height="130" viewBox="0 0 130 130">
          <circle cx="65" cy="65" r="60" fill="none" stroke="rgba(93,176,138,0.08)" strokeWidth="1"/>
          <circle cx="65" cy="65" r="60" fill="none" stroke="rgba(93,176,138,0.3)" strokeWidth="1.5" strokeDasharray="35 342" strokeLinecap="round"/>
        </svg>
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{width:78,height:78,borderRadius:24,background:'linear-gradient(145deg,#0a1a14,#061210)',border:'1.5px solid rgba(93,176,138,.3)',display:'flex',alignItems:'center',justifyContent:'center',animation:'float 3s ease-in-out infinite',boxShadow:'0 8px 32px rgba(93,176,138,.15)'}}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#5DB08A" strokeWidth="1.8">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </div>
        </div>
      </div>
      <div style={{fontSize:28,fontWeight:900,color:'#EEF2F7',letterSpacing:'-.5px',marginBottom:10,textAlign:'center'}}>Nexus Transfer</div>
      <div style={{fontSize:14,color:'rgba(139,174,214,.45)',marginBottom:36,textAlign:'center',lineHeight:1.6}}>Send ARX-P to other miners and earn 20% mining boosts</div>
      <motion.button whileTap={{scale:.96}} onClick={()=>setShowAuth(true)}
        style={{width:'100%',padding:'18px',borderRadius:20,background:'linear-gradient(135deg,#0a1a14,#0d2018)',border:'1.5px solid rgba(93,176,138,.3)',color:'#5DB08A',fontSize:15,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 24px rgba(93,176,138,.12)'}}>
        Sign In
      </motion.button>
      <AuthDialog open={showAuth} onOpenChange={setShowAuth}/>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:'#000',fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif",paddingBottom:100}}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{padding:'52px 24px 0',display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:28,fontWeight:900,color:'#EEF2F7',letterSpacing:'-.5px'}}>Nexus</div>
          <div style={{fontSize:12,color:'rgba(139,174,214,.4)',marginTop:4}}>Send & receive ARX-P</div>
        </div>
        {/* Tabs */}
        <div style={{display:'flex',gap:6,marginTop:4}}>
          {(['send','history','explorer'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{padding:'6px 12px',borderRadius:20,fontSize:10,fontWeight:700,border:'none',cursor:'pointer',
                textTransform:'capitalize',outline:'none',transition:'all .2s',
                background:tab===t?'rgba(139,174,214,.18)':'rgba(139,174,214,.06)',
                color:tab===t?'#8BAED6':'rgba(139,174,214,.4)',
                borderWidth:1,borderStyle:'solid',
                borderColor:tab===t?'rgba(139,174,214,.3)':'rgba(139,174,214,.08)'}}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* UID + Balance */}
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:.05}}
        style={{margin:'20px 24px 0'}}>
        <Card>
          <div style={{padding:'20px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <div>
                <div style={{fontSize:8,textTransform:'uppercase',letterSpacing:'1px',color:'rgba(168,196,232,.4)',fontWeight:600,marginBottom:4}}>Your Nexus UID</div>
                <div style={{fontSize:13,fontWeight:700,color:'#8BAED6',fontFamily:'monospace',letterSpacing:'.3px',wordBreak:'break-all'}}>
                  {profileLoading ? 'Loading...' : nexusAddr||'Generating...'}
                </div>
              </div>
              <button onClick={copyAddr}
                style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:14,flexShrink:0,marginLeft:12,
                  background:'rgba(139,174,214,.1)',border:'1px solid rgba(139,174,214,.2)',
                  color:'#8BAED6',fontSize:11,fontWeight:700,cursor:'pointer',outline:'none'}}>
                {copied ? <><Check size={12}/>Copied</> : <><Copy size={12}/>Copy</>}
              </button>
            </div>
            <div style={{borderTop:'1px solid rgba(139,174,214,.08)',paddingTop:12,display:'flex',alignItems:'baseline',gap:6}}>
              <span style={{fontSize:32,fontWeight:900,color:'#fff',letterSpacing:'-1px'}}>{Math.floor(balance).toLocaleString()}</span>
              <span style={{fontSize:13,fontWeight:700,color:'#8BAED6'}}>ARX-P available</span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* SEND TAB */}
      {tab==='send' && (
        <>
          {/* Amount display */}
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.1}}
            style={{margin:'14px 24px 0'}}>
            <Card>
              <div style={{padding:'24px 20px',textAlign:'center',position:'relative'}}>
                <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,
                  background:'radial-gradient(ellipse at 50% 0%,rgba(93,176,138,.06) 0%,transparent 65%)',pointerEvents:'none'}}/>
                <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'1.2px',color:'rgba(139,174,214,.4)',fontWeight:600,marginBottom:12}}>Amount to Send</div>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'center',gap:4,marginBottom:6}}>
                  <span style={{fontSize:64,fontWeight:900,letterSpacing:'-3px',color:'#fff',lineHeight:1}}>{amount||'0'}</span>
                  <span style={{fontSize:22,fontWeight:700,color:'rgba(139,174,214,.4)',marginTop:12}}>.00</span>
                </div>
                <div style={{fontSize:11,color:'rgba(139,174,214,.3)'}}>Max 10 ARX-P · Earn 20% mining boost</div>
              </div>
            </Card>
          </motion.div>

          {/* Receiver */}
          <div style={{margin:'12px 24px 0',background:'rgba(139,174,214,.05)',border:'1px solid rgba(139,174,214,.1)',borderRadius:18,padding:'14px 16px',display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:36,height:36,borderRadius:12,background:'rgba(139,174,214,.08)',border:'1px solid rgba(139,174,214,.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(139,174,214,.5)" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <input value={receiver} onChange={e=>setReceiver(e.target.value)}
              placeholder="Receiver Nexus UID"
              style={{flex:1,background:'none',border:'none',outline:'none',fontSize:14,fontWeight:600,color:'#EEF2F7',fontFamily:"'Creato Display',-apple-system,system-ui"}}/>
          </div>

          {/* Numpad */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,padding:'14px 24px 0'}}>
            {['1','2','3','4','5','6','7','8','9','.','0','del'].map(k=>(
              <motion.button key={k} whileTap={{scale:.9}}
                onClick={()=>{
                  if(k==='del') setAmount(a=>a.slice(0,-1));
                  else if(k==='.'&&amount.includes('.')) return;
                  else if(amount.length<2) setAmount(a=>a+k);
                }}
                style={{background:'rgba(139,174,214,.06)',border:'1px solid rgba(139,174,214,.09)',borderRadius:18,
                  padding:'17px 0',fontSize:24,fontWeight:700,color:'#EEF2F7',cursor:'pointer',outline:'none',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontFamily:"'Creato Display',-apple-system,system-ui"}}>
                {k==='del'
                  ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
                  : k}
              </motion.button>
            ))}
          </div>

          {/* Send button */}
          <div style={{padding:'16px 24px 0'}}>
            <motion.button whileTap={{scale:.97}} onClick={handleSend} disabled={sending}
              style={{width:'100%',padding:'19px',borderRadius:22,
                background: sent ? 'linear-gradient(135deg,rgba(93,176,138,.15),rgba(93,176,138,.08))' : 'linear-gradient(135deg,#0a1a14,#0d2018)',
                border:`1.5px solid ${sent?'rgba(93,176,138,.4)':'rgba(93,176,138,.25)'}`,
                color: sent?'#5DB08A':'rgba(160,220,190,.9)',
                fontSize:15,fontWeight:800,cursor:'pointer',transition:'all .25s',
                display:'flex',alignItems:'center',justifyContent:'center',gap:10,
                fontFamily:"'Creato Display',-apple-system,system-ui",
                boxShadow: sent?'0 0 20px rgba(93,176,138,.15)':'none'}}>
              {sent
                ? <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Sent! Boost activated</>
                : sending ? 'Sending...'
                : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>Send ARX-P</>}
            </motion.button>
            <div style={{marginTop:12,padding:'12px 16px',background:'rgba(93,176,138,.04)',border:'1px solid rgba(93,176,138,.12)',borderRadius:16,fontSize:11,color:'rgba(93,176,138,.6)',lineHeight:1.6}}>
              💡 Each transfer earns a <strong style={{color:'rgba(93,176,138,.9)'}}>20% mining boost</strong> for 3 days. Max 5 sends/day. 1–10 ARX-P per send.
            </div>
          </div>
        </>
      )}

      {/* HISTORY TAB */}
      {tab==='history' && (
        <div style={{padding:'20px 24px 0'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{fontSize:15,fontWeight:800,color:'#EEF2F7'}}>Your Transactions</div>
            <button onClick={fetchTx} style={{fontSize:12,color:'#8BAED6',fontWeight:600,background:'none',border:'none',cursor:'pointer'}}>Refresh</button>
          </div>
          {loading ? (
            Array.from({length:5}).map((_,i)=>(
              <div key={i} style={{height:60,borderRadius:16,marginBottom:8,background:'rgba(139,174,214,.04)',border:'1px solid rgba(139,174,214,.06)',animation:'pulse 1.5s ease-in-out infinite',animationDelay:`${i*0.1}s`}}/>
            ))
          ) : txList.length===0 ? (
            <div style={{textAlign:'center',padding:'48px 0'}}>
              <div style={{fontSize:40,marginBottom:12}}>📭</div>
              <div style={{fontSize:15,fontWeight:700,color:'rgba(139,174,214,.4)'}}>No transactions yet</div>
              <div style={{fontSize:12,color:'rgba(139,174,214,.25)',marginTop:6}}>Send your first ARX-P</div>
            </div>
          ) : txList.map(tx=>{
            const isSender = tx.sender_id===user?.id;
            return (
              <div key={tx.id} style={{display:'flex',alignItems:'center',gap:13,padding:'14px 16px',borderRadius:18,marginBottom:8,background:'rgba(13,17,23,.9)',border:'1px solid rgba(139,174,214,.07)'}}>
                <div style={{width:42,height:42,borderRadius:14,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                  background:isSender?'rgba(224,96,96,.08)':'rgba(93,176,138,.1)',
                  border:`1px solid ${isSender?'rgba(224,96,96,.18)':'rgba(93,176,138,.22)'}`}}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={isSender?'#E06060':'#5DB08A'} strokeWidth="2">
                    {isSender ? <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></> : <><polyline points="23 7 13.5 15.5 8.5 10.5 1 17"/><polyline points="17 7 23 7 23 13"/></>}
                  </svg>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#EEF2F7'}}>{isSender?'Sent':'Received'}</div>
                  <div style={{fontSize:10,color:'rgba(139,174,214,.35)',marginTop:2,fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {isSender?tx.receiver_address?.slice(0,20)+'...':tx.sender_address?.slice(0,20)+'...'}
                  </div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:14,fontWeight:800,color:isSender?'#E06060':'#5DB08A'}}>{isSender?'-':'+​'}{tx.amount} ARX-P</div>
                  <div style={{fontSize:9,color:'rgba(139,174,214,.3)',marginTop:1}}>{new Date(tx.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EXPLORER TAB */}
      {tab==='explorer' && (
        <div style={{padding:'20px 24px 0'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div style={{fontSize:15,fontWeight:800,color:'#EEF2F7'}}>Public Feed</div>
            <button onClick={fetchAllTx} style={{fontSize:12,color:'#8BAED6',fontWeight:600,background:'none',border:'none',cursor:'pointer'}}>Refresh</button>
          </div>
          {allTx.length===0 ? (
            <div style={{textAlign:'center',padding:'48px 0'}}>
              <div style={{fontSize:40,marginBottom:12}}>🌐</div>
              <div style={{fontSize:15,fontWeight:700,color:'rgba(139,174,214,.4)'}}>No public transactions</div>
            </div>
          ) : allTx.map(tx=>(
            <div key={tx.id} style={{display:'flex',alignItems:'center',gap:13,padding:'14px 16px',borderRadius:18,marginBottom:8,background:'rgba(13,17,23,.9)',border:'1px solid rgba(139,174,214,.07)'}}>
              <div style={{width:42,height:42,borderRadius:14,flexShrink:0,background:'rgba(139,174,214,.07)',border:'1px solid rgba(139,174,214,.12)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8BAED6" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:10,color:'rgba(139,174,214,.4)',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {tx.hide_usernames?'***':tx.sender_address?.slice(0,14)+'...'} →
                </div>
                <div style={{fontSize:10,color:'rgba(139,174,214,.4)',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {tx.hide_usernames?'***':tx.receiver_address?.slice(0,14)+'...'}
                </div>
              </div>
              <div style={{fontSize:14,fontWeight:800,color:'#8BAED6',flexShrink:0}}>
                {tx.hide_amount?'***':tx.amount} ARX-P
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{height:20}}/>
      <AuthDialog open={showAuth} onOpenChange={setShowAuth}/>
    </div>
  );
}
