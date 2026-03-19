import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from '@/hooks/usePoints';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import AuthDialog from '@/components/auth/AuthDialog';
import { Copy, Check } from 'lucide-react';

const CSS = `
@keyframes strokeDash{0%{stroke-dashoffset:600}100%{stroke-dashoffset:0}}
@keyframes strokeGlow{0%,100%{opacity:.4;stroke-width:1.5}50%{opacity:1;stroke-width:2.5}}
@keyframes shimmerswipe{0%{left:-120%}65%,100%{left:160%}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
`;

function StrokeCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{position:'relative',borderRadius:26,overflow:'hidden',
      background:'linear-gradient(145deg,#0c1e38,#0a1828,#061220)',...style}}>
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}} viewBox="0 0 311 140" preserveAspectRatio="none">
        <path d="M 16 2 Q 155 -6 295 2" fill="none" stroke="rgba(139,174,214,0.5)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600" style={{animation:'strokeDash 3s ease-in-out infinite alternate,strokeGlow 2.5s ease-in-out infinite'}}/>
        <path d="M 16 138 Q 155 146 295 138" fill="none" stroke="rgba(168,196,232,0.3)" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="600" style={{animation:'strokeDash 3s ease-in-out infinite alternate,strokeGlow 2.5s ease-in-out infinite',animationDelay:'.5s'}}/>
      </svg>
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}} viewBox="0 0 311 140">
        <circle cx="20" cy="15" r=".8" fill="white" opacity=".5"><animate attributeName="opacity" values=".5;1;.5" dur="2.1s" repeatCount="indefinite"/></circle>
        <circle cx="290" cy="80" r=".7" fill="#8BAED6" opacity=".4"><animate attributeName="opacity" values=".4;.9;.4" dur="1.9s" repeatCount="indefinite"/></circle>
      </svg>
      <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(200,228,255,.2),transparent)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',top:0,left:'-120%',width:'50%',height:'100%',background:'linear-gradient(90deg,transparent,rgba(168,196,232,.05),transparent)',animation:'shimmerswipe 5s ease-in-out infinite',pointerEvents:'none'}}/>
      <div style={{position:'relative',zIndex:5}}>{children}</div>
    </div>
  );
}

export default function MobileNexus() {
  const navigate                  = useNavigate();
  const { user }                  = useAuth();
  const { points, refreshPoints } = usePoints();
  const { profile, loading: profileLoading } = useProfile();

  const [tab,          setTab]          = useState<'send'|'history'|'explorer'>('send');
  const [amount,       setAmount]       = useState('');
  const [receiver,     setReceiver]     = useState('');
  const [sending,      setSending]      = useState(false);
  const [sent,         setSent]         = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [allTx,        setAllTx]        = useState<any[]>([]);
  const [loadingTx,    setLoadingTx]    = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [showAuth,     setShowAuth]     = useState(false);

  // ── Real balance from usePoints hook ──
  const balance = points?.total_points ?? 0;
  const nexusAddress = profile?.nexus_address;

  // ── Fetch real transactions from Supabase ──
  const fetchTx = async () => {
    if (!user) return;
    setLoadingTx(true);
    try {
      const { data } = await supabase
        .from('nexus_transactions')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(20);
      setTransactions(data || []);
    } finally { setLoadingTx(false); }
  };

  const fetchAllTx = async () => {
    const { data } = await supabase
      .from('nexus_transactions')
      .select('*')
      .eq('private_mode', false)
      .order('created_at', { ascending: false })
      .limit(30);
    setAllTx(data || []);
  };

  useEffect(() => {
    if (user) { fetchTx(); fetchAllTx(); }
  }, [user]);

  const copyAddress = async () => {
    if (!nexusAddress) return;
    await navigator.clipboard.writeText(nexusAddress);
    setCopied(true);
    toast({ title:'Copied!', description:'Nexus UID copied' });
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Real send via RPC ──
  const handleSend = async () => {
    if (!user) { setShowAuth(true); return; }
    if (!receiver.trim()) { toast({ title:'Error', description:'Enter a receiver UID', variant:'destructive' }); return; }
    const num = Number(amount);
    if (!Number.isInteger(num) || num < 1 || num > 10) {
      toast({ title:'Error', description:'Amount must be 1–10 ARX-P', variant:'destructive' }); return;
    }
    if (balance < num) {
      toast({ title:'Insufficient Balance', description:"You don't have enough ARX-P", variant:'destructive' }); return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.rpc('send_nexus_transfer' as any, {
        p_sender_id: user.id,
        p_receiver_address: receiver.trim(),
        p_amount: num,
      });
      if (error) throw error;
      const result = data as any;
      if (!result?.success) {
        toast({ title:'Transfer Failed', description: result?.error || 'Unknown error', variant:'destructive' });
        return;
      }
      toast({ title:'Sent! 🎉', description:`Sent ${num} ARX-P. You earned a 20% mining boost!` });
      setSent(true);
      setAmount(''); setReceiver('');
      await refreshPoints();
      await fetchTx(); await fetchAllTx();
      setTimeout(() => setSent(false), 2500);
    } catch (err: any) {
      toast({ title:'Error', description: err.message, variant:'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div style={{minHeight:'100vh',background:'#000',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
        <style>{CSS}</style>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:48,marginBottom:16}}>⚡</div>
          <div style={{fontSize:20,fontWeight:900,color:'#EEF2F7',marginBottom:8}}>Nexus</div>
          <div style={{fontSize:13,color:'rgba(139,174,214,.5)',marginBottom:24}}>Send & receive ARX-P instantly</div>
          <motion.button whileTap={{scale:.95}} onClick={() => setShowAuth(true)}
            style={{padding:'14px 32px',borderRadius:18,background:'linear-gradient(135deg,#1E3A5F,#0c2040)',border:'1px solid rgba(139,174,214,.3)',color:'#C8E0FF',fontSize:15,fontWeight:800,cursor:'pointer'}}>
            Sign In
          </motion.button>
        </div>
        <AuthDialog open={showAuth} onOpenChange={setShowAuth}/>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh',background:'#000',fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif",paddingBottom:90}}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{padding:'12px 20px 8px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontSize:21,fontWeight:900,color:'#EEF2F7'}}>Nexus</div>
        <div style={{display:'flex',gap:6}}>
          {(['send','history','explorer'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{background:tab===t?'rgba(139,174,214,.14)':'rgba(139,174,214,.05)',
                border:`1px solid ${tab===t?'rgba(139,174,214,.3)':'rgba(139,174,214,.1)'}`,
                borderRadius:20,padding:'5px 12px',fontSize:12,fontWeight:700,
                color:tab===t?'#8BAED6':'rgba(238,242,247,.35)',cursor:'pointer',outline:'none',textTransform:'capitalize'}}>
              {t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Nexus UID + balance card */}
      <div style={{margin:'0 16px 10px'}}>
        <StrokeCard>
          <div style={{padding:'16px 18px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <div>
                <div style={{fontSize:8,textTransform:'uppercase',letterSpacing:'1px',color:'rgba(168,196,232,.4)',fontWeight:600,marginBottom:3}}>Your Nexus UID</div>
                <div style={{fontSize:12,fontWeight:700,color:'#8BAED6',fontFamily:'monospace',letterSpacing:'.3px'}}>
                  {profileLoading ? 'Loading...' : nexusAddress || 'Generating...'}
                </div>
              </div>
              <button onClick={copyAddress} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 12px',borderRadius:12,background:'rgba(139,174,214,.1)',border:'1px solid rgba(139,174,214,.2)',color:'#8BAED6',fontSize:11,fontWeight:700,cursor:'pointer',outline:'none',flexShrink:0}}>
                {copied ? <><Check size={12}/> Copied</> : <><Copy size={12}/> Copy</>}
              </button>
            </div>
            <div style={{borderTop:'1px solid rgba(139,174,214,.08)',paddingTop:10,display:'flex',alignItems:'baseline',gap:6}}>
              <span style={{fontSize:28,fontWeight:900,color:'#fff',letterSpacing:'-1px'}}>{balance.toLocaleString()}</span>
              <span style={{fontSize:13,fontWeight:700,color:'#8BAED6'}}>ARX-P available</span>
            </div>
          </div>
        </StrokeCard>
      </div>

      {/* ── SEND TAB ── */}
      {tab === 'send' && (
        <>
          {/* Amount display */}
          <div style={{margin:'0 16px 10px',background:'linear-gradient(145deg,#0c1e38,#061220)',border:'1px solid rgba(139,174,214,.2)',borderRadius:20,padding:'20px',textAlign:'center',position:'relative',overflow:'hidden'}}>
            <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'1px',color:'rgba(139,174,214,.45)',marginBottom:8,fontWeight:600}}>Amount to Send</div>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'center',marginBottom:6}}>
              <span style={{fontSize:52,fontWeight:900,letterSpacing:'-2px',color:'#fff',lineHeight:1}}>{amount||'0'}</span>
              <span style={{fontSize:20,fontWeight:700,color:'rgba(139,174,214,.5)',marginTop:8}}>.00</span>
            </div>
            <div style={{fontSize:11,color:'rgba(139,174,214,.35)'}}>Max 10 ARX-P per transfer · Earn 20% mining boost</div>
          </div>

          {/* Receiver input */}
          <div style={{padding:'0 16px 10px'}}>
            <div style={{background:'#0d1117',border:'1px solid rgba(139,174,214,.18)',borderRadius:16,padding:'14px 16px',display:'flex',alignItems:'center',gap:10}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(139,174,214,.5)" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <input value={receiver} onChange={e => setReceiver(e.target.value)}
                placeholder="Receiver Nexus UID"
                style={{flex:1,background:'none',border:'none',outline:'none',fontSize:14,fontWeight:600,color:'#EEF2F7',fontFamily:"'Creato Display',-apple-system,system-ui"}}/>
            </div>
          </div>

          {/* Numpad */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,padding:'0 16px 12px'}}>
            {['1','2','3','4','5','6','7','8','9','.','0','del'].map(k => (
              <motion.button key={k} whileTap={{scale:.93}}
                onClick={() => {
                  if (k==='del') setAmount(a => a.slice(0,-1));
                  else if (k==='.'&&amount.includes('.')) return;
                  else if (amount.length < 4) setAmount(a => a+k);
                }}
                style={{background:'rgba(139,174,214,.07)',border:'1px solid rgba(139,174,214,.1)',borderRadius:16,padding:16,fontSize:22,fontWeight:700,color:'#EEF2F7',cursor:'pointer',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Creato Display',-apple-system,system-ui"}}>
                {k==='del'
                  ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
                  : k}
              </motion.button>
            ))}
          </div>

          {/* Send button */}
          <div style={{padding:'0 16px 20px'}}>
            <motion.button whileTap={{scale:.97}} onClick={handleSend} disabled={sending}
              style={{width:'100%',padding:17,borderRadius:18,
                background:sent?'rgba(93,176,138,.12)':'linear-gradient(135deg,#1E3A5F,#0c2040)',
                border:`1px solid ${sent?'rgba(93,176,138,.3)':'rgba(139,174,214,.3)'}`,
                color:sent?'#5DB08A':'#C8E0FF',fontSize:15,fontWeight:800,cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',gap:9,transition:'all .2s',
                fontFamily:"'Creato Display',-apple-system,system-ui"}}>
              {sent
                ? <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Sent! +20% Mining Boost</>
                : sending
                  ? 'Sending...'
                  : <><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>Send ARX-P</>
              }
            </motion.button>
            <div style={{marginTop:10,padding:'10px 14px',background:'rgba(93,176,138,.05)',border:'1px solid rgba(93,176,138,.15)',borderRadius:14,fontSize:11,color:'rgba(93,176,138,.7)',lineHeight:1.5}}>
              💡 Each transfer earns a 20% mining boost for 3 days. Max 5 transfers/day. 1–10 ARX-P per send.
            </div>
          </div>
        </>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <div style={{padding:'10px 16px 20px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <span style={{fontSize:15,fontWeight:800,color:'#EEF2F7'}}>Your Transactions</span>
            <button onClick={fetchTx} style={{fontSize:12,color:'#8BAED6',fontWeight:600,background:'none',border:'none',cursor:'pointer'}}>Refresh</button>
          </div>
          {loadingTx ? (
            <div style={{textAlign:'center',padding:'30px 0',color:'rgba(139,174,214,.4)'}}>Loading...</div>
          ) : transactions.length === 0 ? (
            <div style={{textAlign:'center',padding:'30px 0'}}>
              <div style={{fontSize:32,marginBottom:10}}>📭</div>
              <div style={{fontSize:13,color:'rgba(139,174,214,.4)'}}>No transactions yet</div>
            </div>
          ) : transactions.map((tx) => {
            const isSender = tx.sender_id === user.id;
            return (
              <div key={tx.id} style={{display:'flex',alignItems:'center',gap:12,padding:'13px 14px',borderRadius:16,marginBottom:6,background:'#0d1117',border:'1px solid rgba(139,174,214,.07)'}}>
                <div style={{width:40,height:40,borderRadius:13,background:isSender?'rgba(224,96,96,.08)':'rgba(93,176,138,.1)',border:`1px solid ${isSender?'rgba(224,96,96,.18)':'rgba(93,176,138,.2)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isSender?'#E06060':'#5DB08A'} strokeWidth="2">
                    {isSender ? <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></> : <><polyline points="23 7 13.5 15.5 8.5 10.5 1 17"/><polyline points="17 7 23 7 23 13"/></>}
                  </svg>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:'#EEF2F7'}}>{isSender ? 'Sent' : 'Received'}</div>
                  <div style={{fontSize:10,color:'rgba(139,174,214,.4)',marginTop:1,fontFamily:'monospace'}}>
                    {isSender ? tx.receiver_address?.slice(0,18)+'...' : tx.sender_address?.slice(0,18)+'...'}
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:14,fontWeight:800,color:isSender?'#E06060':'#5DB08A'}}>
                    {isSender?'-':'+​'}{tx.amount} ARX-P
                  </div>
                  <div style={{fontSize:9,color:'rgba(139,174,214,.3)'}}>
                    {new Date(tx.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── EXPLORER TAB ── */}
      {tab === 'explorer' && (
        <div style={{padding:'10px 16px 20px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <span style={{fontSize:15,fontWeight:800,color:'#EEF2F7'}}>Public Transactions</span>
            <button onClick={fetchAllTx} style={{fontSize:12,color:'#8BAED6',fontWeight:600,background:'none',border:'none',cursor:'pointer'}}>Refresh</button>
          </div>
          {allTx.length === 0 ? (
            <div style={{textAlign:'center',padding:'30px 0'}}>
              <div style={{fontSize:32,marginBottom:10}}>🌐</div>
              <div style={{fontSize:13,color:'rgba(139,174,214,.4)'}}>No public transactions</div>
            </div>
          ) : allTx.map((tx) => (
            <div key={tx.id} style={{display:'flex',alignItems:'center',gap:12,padding:'13px 14px',borderRadius:16,marginBottom:6,background:'#0d1117',border:'1px solid rgba(139,174,214,.07)'}}>
              <div style={{width:40,height:40,borderRadius:13,background:'rgba(139,174,214,.07)',border:'1px solid rgba(139,174,214,.14)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8BAED6" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,color:'rgba(139,174,214,.5)',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {tx.hide_usernames?'***':tx.sender_address?.slice(0,12)+'...'} →
                </div>
                <div style={{fontSize:11,color:'rgba(139,174,214,.5)',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {tx.hide_usernames?'***':tx.receiver_address?.slice(0,12)+'...'}
                </div>
              </div>
              <span style={{fontSize:14,fontWeight:800,color:'#8BAED6',flexShrink:0}}>
                {tx.hide_amount?'***':tx.amount} ARX-P
              </span>
            </div>
          ))}
        </div>
      )}

      <AuthDialog open={showAuth} onOpenChange={setShowAuth}/>
    </div>
  );
}
