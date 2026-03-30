import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useArenaMembership } from '@/hooks/useArenaMembership';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, Send, RefreshCw } from 'lucide-react';

type Channel = 'general' | 'alpha' | 'omega' | 'nexus_exchange';
interface ChatMessage {
  id: string;
  channel: Channel;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  message: string;
  created_at: string;
}

const CHANNELS: { id: Channel; label: string; icon: string; desc: string; teamOnly?: 'alpha'|'omega' }[] = [
  { id:'general',        label:'General',       icon:'🌐', desc:'Everyone can chat here' },
  { id:'alpha',          label:'Alpha Team',    icon:'⬡',  desc:'Alpha members only',   teamOnly:'alpha' },
  { id:'omega',          label:'Omega Team',    icon:'⬡',  desc:'Omega members only',   teamOnly:'omega' },
  { id:'nexus_exchange', label:'Nexus Exchange',icon:'📡', desc:'Share Nexus UIDs & send ARX-P' },
];

const CHAN_COLORS: Record<Channel,string> = {
  general:        'hsl(215 35% 62%)',
  alpha:          'hsl(215 35% 62%)',
  omega:          'hsl(255 50% 65%)',
  nexus_exchange: 'hsl(155 45% 50%)',
};

function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); }
  catch { return ''; }
}

export default function MobileChat() {
  const navigate       = useNavigate();
  const { user }       = useAuth();
  const { profile }    = useProfile();
  const { membership } = useArenaMembership();

  const [channel,  setChannel]  = useState<Channel>('general');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  // null=unknown (checking), true=table ok, false=table missing
  const [tableOk,  setTableOk]  = useState<boolean | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const subRef    = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const username = profile?.username || user?.email?.split('@')[0] || 'Miner';

  const canAccess = (ch: Channel) => {
    if (ch === 'alpha') return membership?.club === 'alpha';
    if (ch === 'omega') return membership?.club === 'omega';
    return true;
  };

  const loadMessages = useCallback(async (ch: Channel) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel', ch)
        .order('created_at', { ascending: true })
        .limit(80);

      if (error) {
        setTableOk(error.code === '42P01' ? false : null);
        setMessages([]);
      } else {
        setTableOk(true);
        setMessages((data || []) as ChatMessage[]);
      }
    } catch {
      setTableOk(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMessages(channel); }, [channel, loadMessages, retryKey]);

  // Only subscribe after confirmed table exists
  useEffect(() => {
    if (tableOk !== true) return;
    if (subRef.current) { supabase.removeChannel(subRef.current); subRef.current = null; }

    const sub = supabase
      .channel(`chat-${channel}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `channel=eq.${channel}`,
      }, (payload) => {
        setMessages(prev => {
          const m = payload.new as ChatMessage;
          return prev.some(p => p.id === m.id) ? prev : [...prev, m];
        });
      })
      .subscribe();

    subRef.current = sub;
    return () => { supabase.removeChannel(sub); subRef.current = null; };
  }, [channel, tableOk]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMsg = async () => {
    if (!user || !input.trim() || sending) return;
    if (!canAccess(channel)) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        channel, user_id: user.id, username,
        avatar_url: profile?.avatar_url || null, message: text,
      });
      if (error) {
        if (error.code === '42P01') setTableOk(false);
        else setInput(text);
      }
    } catch { setInput(text); }
    finally { setSending(false); }
  };

  const chanColor = CHAN_COLORS[channel];

  return (
    <div style={{minHeight:'100vh', background:'hsl(225 30% 3%)', display:'flex',
      flexDirection:'column', fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif",
      paddingBottom:90}}>

      {/* Header */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'52px 20px 0', flexShrink:0}}>
        <button onClick={() => navigate('/')}
          style={{width:40,height:40,borderRadius:14,background:'hsl(215 25% 11%)',
            border:'1px solid hsl(215 22% 18%)',display:'flex',alignItems:'center',
            justifyContent:'center',cursor:'pointer',outline:'none'}}>
          <ChevronLeft size={20} color="hsl(215 25% 55%)"/>
        </button>
        <div style={{textAlign:'center'}}>
          <h1 style={{fontSize:19,fontWeight:700,color:'hsl(215 20% 93%)'}}>Community</h1>
          <p style={{fontSize:10,color:'hsl(215 14% 38%)',marginTop:2}}>
            {CHANNELS.find(c=>c.id===channel)?.icon} {CHANNELS.find(c=>c.id===channel)?.label}
          </p>
        </div>
        <button onClick={() => setRetryKey(k => k+1)}
          style={{width:40,height:40,borderRadius:14,background:'hsl(215 25% 11%)',
            border:'1px solid hsl(215 22% 18%)',display:'flex',alignItems:'center',
            justifyContent:'center',cursor:'pointer',outline:'none'}}>
          <RefreshCw size={15} color="hsl(215 25% 55%)" style={{animation:loading?'spin 1s linear infinite':'none'}}/>
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        </button>
      </div>

      {/* Channel tabs */}
      <div className="scrollbar-none"
        style={{display:'flex',gap:8,padding:'16px 20px 0',overflowX:'auto',flexShrink:0}}>
        {CHANNELS.map(ch => {
          const accessible = canAccess(ch.id);
          const isActive   = channel === ch.id;
          return (
            <button key={ch.id}
              onClick={() => accessible ? setChannel(ch.id) : undefined}
              style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',
                borderRadius:22,fontSize:12,fontWeight:700,border:'none',
                cursor:accessible?'pointer':'not-allowed',
                outline:'none',transition:'all 0.2s',flexShrink:0,
                background:isActive?`${CHAN_COLORS[ch.id]}22`:'hsl(215 22% 10%)',
                color:isActive?CHAN_COLORS[ch.id]:accessible?'hsl(215 18% 45%)':'hsl(215 14% 28%)',
                borderWidth:1,borderStyle:'solid',
                borderColor:isActive?`${CHAN_COLORS[ch.id]}44`:'hsl(215 20% 16%)',
                opacity:accessible?1:0.45,
                fontFamily:"'Creato Display',-apple-system,sans-serif"}}>
              <span>{ch.icon}</span>
              {ch.label}
              {ch.teamOnly && !accessible && <span style={{fontSize:9}}>🔒</span>}
            </button>
          );
        })}
      </div>

      {/* Channel desc */}
      <div style={{padding:'10px 20px 0',flexShrink:0}}>
        <p style={{fontSize:11,color:'hsl(215 14% 35%)'}}>
          {CHANNELS.find(c=>c.id===channel)?.desc}
          {channel==='alpha'&&membership?.club==='alpha'&&' · Welcome, Alpha!'}
          {channel==='omega'&&membership?.club==='omega'&&' · Welcome, Omega!'}
        </p>
      </div>

      {/* Table not ready */}
      {tableOk === false && (
        <div style={{margin:'12px 20px',padding:'14px 16px',borderRadius:16,
          background:'hsl(38 55% 52%/0.08)',border:'1px solid hsl(38 55% 52%/0.22)',flexShrink:0}}>
          <p style={{fontSize:12,fontWeight:600,color:'hsl(38 55% 58%)',marginBottom:4}}>⚙️ Chat Setup Required</p>
          <p style={{fontSize:11,color:'hsl(38 55% 52%/0.7)',lineHeight:1.5}}>
            Run the SQL migration in your Supabase dashboard to enable chat.
          </p>
        </div>
      )}

      {/* Network error retry */}
      {tableOk === null && !loading && (
        <button onClick={() => setRetryKey(k=>k+1)}
          style={{margin:'12px 20px',padding:'14px 16px',borderRadius:16,
            background:'hsl(0 55% 52%/0.08)',border:'1px solid hsl(0 55% 52%/0.22)',
            flexShrink:0,cursor:'pointer',textAlign:'left',outline:'none'}}>
          <p style={{fontSize:12,fontWeight:600,color:'hsl(0 55% 62%)'}}>
            ⚠️ Could not connect. Tap to retry.
          </p>
        </button>
      )}

      {/* Messages */}
      <div className="scrollbar-none"
        style={{flex:1,overflowY:'auto',padding:'12px 20px 0',minHeight:0}}>

        {loading && tableOk === null && (
          <div style={{display:'flex',justifyContent:'center',paddingTop:40}}>
            <div style={{width:32,height:32,borderRadius:'50%',
              border:'2px solid hsl(215 35% 62%/0.2)',
              borderTopColor:'hsl(215 35% 62%)',animation:'spin 1s linear infinite'}}/>
          </div>
        )}

        {!loading && tableOk === true && messages.length === 0 && (
          <div style={{textAlign:'center',paddingTop:48}}>
            <div style={{fontSize:44,marginBottom:12}}>{CHANNELS.find(c=>c.id===channel)?.icon}</div>
            <p style={{fontSize:15,fontWeight:700,color:'hsl(215 18% 50%)',marginBottom:6}}>No messages yet</p>
            <p style={{fontSize:12,color:'hsl(215 14% 32%)'}}>Be the first to say something!</p>
          </div>
        )}

        {tableOk === true && messages.map((msg, i) => {
          const isMe       = msg.user_id === user?.id;
          const showHeader = i === 0 || messages[i-1].user_id !== msg.user_id;
          return (
            <div key={msg.id} style={{marginBottom:showHeader?12:4,display:'flex',
              flexDirection:isMe?'row-reverse':'row',alignItems:'flex-end',gap:8}}>
              {!isMe && showHeader && (
                <div style={{width:30,height:30,borderRadius:10,overflow:'hidden',flexShrink:0,
                  background:'hsl(215 25% 14%)',border:'1px solid hsl(215 22% 20%)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:12,fontWeight:700,color:'hsl(215 25% 55%)'}}>
                  {msg.avatar_url
                    ? <img src={msg.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    : msg.username?.[0]?.toUpperCase()||'?'}
                </div>
              )}
              {!isMe && !showHeader && <div style={{width:30,flexShrink:0}}/>}
              <div style={{maxWidth:'72%'}}>
                {showHeader && !isMe && (
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                    <span style={{fontSize:11,fontWeight:700,color:chanColor}}>{msg.username||'Miner'}</span>
                    <span style={{fontSize:9,color:'hsl(215 14% 30%)'}}>{fmtTime(msg.created_at)}</span>
                  </div>
                )}
                <div style={{padding:'10px 14px',
                  borderRadius:isMe?'18px 18px 4px 18px':'18px 18px 18px 4px',
                  background:isMe?`linear-gradient(135deg,${chanColor}22,${chanColor}12)`:'hsl(225 24% 10%)',
                  border:`1px solid ${isMe?`${chanColor}30`:'hsl(215 22% 16%)'}`,wordBreak:'break-word'}}>
                  <p style={{fontSize:13,color:'hsl(215 18% 88%)',lineHeight:1.55}}>{msg.message}</p>
                </div>
                {isMe && (
                  <p style={{fontSize:9,color:'hsl(215 14% 28%)',marginTop:3,textAlign:'right'}}>
                    {fmtTime(msg.created_at)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      {user && tableOk === true && (
        <div style={{padding:'12px 20px',flexShrink:0,
          background:'linear-gradient(to top,hsl(225 30% 3%),transparent)'}}>
          {!canAccess(channel) ? (
            <div style={{padding:'14px 16px',borderRadius:18,textAlign:'center',
              background:'hsl(215 22% 10%)',border:'1px solid hsl(215 20% 16%)'}}>
              <p style={{fontSize:12,color:'hsl(215 18% 40%)'}}>
                🔒 Join {channel==='alpha'?'Alpha':'Omega'} team in Arena to access this channel
              </p>
            </div>
          ) : (
            <div style={{display:'flex',alignItems:'flex-end',gap:10,
              background:'hsl(225 26% 9%)',border:`1px solid ${chanColor}30`,
              borderRadius:20,padding:'10px 10px 10px 16px'}}>
              <textarea value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}}}
                placeholder="Type a message…" rows={1}
                style={{flex:1,background:'none',border:'none',outline:'none',
                  fontSize:14,color:'hsl(215 18% 88%)',resize:'none',
                  fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif",
                  lineHeight:'1.5',maxHeight:80,overflow:'auto'}}/>
              <button onClick={sendMsg} disabled={!input.trim()||sending}
                style={{width:38,height:38,borderRadius:13,flexShrink:0,
                  cursor:input.trim()?'pointer':'default',
                  background:input.trim()?`${chanColor}22`:'hsl(215 22% 12%)',
                  border:`1px solid ${input.trim()?`${chanColor}44`:'hsl(215 22% 18%)'}`,
                  display:'flex',alignItems:'center',justifyContent:'center',
                  transition:'all 0.2s',outline:'none'}}>
                <Send size={16} color={input.trim()?chanColor:'hsl(215 18% 35%)'}/>
              </button>
            </div>
          )}
        </div>
      )}

      {!user && (
        <div style={{padding:'12px 20px',flexShrink:0}}>
          <button onClick={()=>navigate('/auth')}
            style={{width:'100%',padding:'16px',borderRadius:18,fontWeight:700,fontSize:14,
              cursor:'pointer',background:'linear-gradient(135deg,hsl(215 35% 55%),hsl(215 40% 45%))',
              border:'none',color:'white',outline:'none',
              fontFamily:"'Creato Display',-apple-system,sans-serif"}}>
            Sign In to Chat
          </button>
        </div>
      )}
    </div>
  );
}
