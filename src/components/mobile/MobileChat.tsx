import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useArenaMembership } from '@/hooks/useArenaMembership';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, Send, ImageIcon, X, CornerUpLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Channel = 'general' | 'alpha' | 'omega' | 'nexus_exchange';
interface Msg {
  id: string; channel: Channel; user_id: string; username: string | null;
  avatar_url: string | null; message: string; image_url?: string | null;
  reply_to_id?: string | null; read_by?: string[]; created_at: string;
}

const CHANNELS = [
  { id: 'general'        as Channel, label: 'General',    icon: '🌐', desc: 'All miners', lock: null },
  { id: 'alpha'          as Channel, label: 'Alpha',      icon: '⬡',  desc: 'Alpha only', lock: 'alpha' },
  { id: 'omega'          as Channel, label: 'Omega',      icon: '⬡',  desc: 'Omega only', lock: 'omega' },
  { id: 'nexus_exchange' as Channel, label: 'Nexus',      icon: '📡', desc: 'Nexus UIDs', lock: null },
];
const CC: Record<Channel, string> = {
  general: '#accafe', alpha: '#accafe', omega: '#c084fc', nexus_exchange: '#2dd4a0',
};
const EMOJIS = [
  '😂','😍','🔥','💯','👍','❤️','🎉','😎','🚀','💰','😭','🤣',
  '✅','💪','👀','🤔','😏','🙏','⚡','🏆','🫡','🫶','💫','⭐',
  '💎','🌟','🤝','👊','💥','🎊','🥳','😤','🦁','🐉','⚔️','🌊',
];
const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

function Av({ url, name, sz = 30 }: { url: string|null; name: string|null; sz?: number }) {
  const [e, setE] = useState(false);
  const init = (name||'?')[0].toUpperCase();
  const hue = (name||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0)%360;
  return url && !e
    ? <div style={{width:sz,height:sz,borderRadius:sz*0.35,overflow:'hidden',flexShrink:0}}>
        <img src={url} alt="" onError={()=>setE(true)} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
      </div>
    : <div style={{width:sz,height:sz,borderRadius:sz*0.35,flexShrink:0,fontSize:sz*0.38,fontWeight:700,
        background:`linear-gradient(135deg,hsl(${hue} 50% 28%),hsl(${(hue+45)%360} 45% 18%))`,
        display:'flex',alignItems:'center',justifyContent:'center',color:'white'}}>{init}</div>;
}

function EmojiPanel({ onPick }: { onPick: (e: string) => void }) {
  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:8}}
      style={{position:'absolute',bottom:'100%',left:0,right:0,margin:'0 0 4px',
        background:'#0a0e1a',border:'1px solid rgba(139,174,214,0.15)',borderRadius:18,padding:'12px 14px',zIndex:60}}>
      <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
        {EMOJIS.map(em=>(
          <button key={em} onClick={()=>onPick(em)}
            style={{background:'none',border:'none',cursor:'pointer',fontSize:24,padding:'2px',lineHeight:1}}>
            {em}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function ReplyPreview({ msg, onCancel }: { msg: Msg; onCancel: () => void }) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 16px 0',
      background:'#090d17',borderTop:'1px solid rgba(139,174,214,0.1)'}}>
      <CornerUpLeft size={13} color="rgba(139,174,214,0.5)" style={{flexShrink:0}}/>
      <div style={{flex:1,borderLeft:'2px solid rgba(139,174,214,0.4)',paddingLeft:8,minWidth:0}}>
        <p style={{fontSize:10,fontWeight:700,color:'#accafe',marginBottom:1}}>{msg.username||'Miner'}</p>
        <p style={{fontSize:11,color:'rgba(139,174,214,0.45)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
          {msg.image_url?'📷 Image':msg.message}
        </p>
      </div>
      <button onClick={onCancel} style={{background:'none',border:'none',cursor:'pointer',
        color:'rgba(139,174,214,0.4)',padding:2,flexShrink:0}}><X size={15}/></button>
    </div>
  );
}

function Bubble({ msg, isMe, showHead, replyMsg, color, onReply }: {
  msg: Msg; isMe: boolean; showHead: boolean; replyMsg: Msg|null; color: string; onReply:(m:Msg)=>void;
}) {
  const lpTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const startLP = () => { lpTimer.current = setTimeout(()=>onReply(msg), 500); };
  const cancelLP = () => { if (lpTimer.current) clearTimeout(lpTimer.current); };
  const readers = (msg.read_by||[]).filter(id=>id!==msg.user_id);
  const isRead = isMe && readers.length>0;

  return (
    <div style={{display:'flex',flexDirection:isMe?'row-reverse':'row',alignItems:'flex-end',
      gap:7,marginBottom:showHead?10:3}}>
      {!isMe && showHead && <Av url={msg.avatar_url} name={msg.username} sz={28}/>}
      {!isMe && !showHead && <div style={{width:28,flexShrink:0}}/>}
      <div style={{maxWidth:'72%'}}>
        {showHead && !isMe && (
          <p style={{fontSize:10,fontWeight:700,color,marginBottom:3,marginLeft:4}}>{msg.username||'Miner'}</p>
        )}
        {replyMsg && (
          <div style={{marginBottom:2,padding:'5px 9px',background:'rgba(139,174,214,0.06)',
            borderRadius:'10px 10px 0 0',borderLeft:`2.5px solid ${color}`}}>
            <p style={{fontSize:9,fontWeight:700,color,marginBottom:1}}>{replyMsg.username||'Miner'}</p>
            <p style={{fontSize:10,color:'rgba(139,174,214,0.4)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:190}}>
              {replyMsg.image_url?'📷 Image':replyMsg.message}
            </p>
          </div>
        )}
        <div
          onTouchStart={startLP} onTouchEnd={cancelLP} onTouchMove={cancelLP}
          onMouseDown={startLP} onMouseUp={cancelLP} onMouseLeave={cancelLP}
          onContextMenu={e=>{e.preventDefault();onReply(msg);}}
          style={{
            padding:msg.image_url&&!msg.message?'4px':'9px 13px',
            borderRadius:isMe
              ?(replyMsg?'14px 14px 4px 14px':'16px 16px 4px 16px')
              :(replyMsg?'14px 14px 14px 4px':'16px 16px 16px 4px'),
            background:isMe?`linear-gradient(135deg,${color}20,${color}10)`:'rgba(139,174,214,0.06)',
            border:`1px solid ${isMe?`${color}28`:'rgba(139,174,214,0.1)'}`,
            wordBreak:'break-word',cursor:'default',
          }}>
          {msg.image_url && (
            <img src={msg.image_url} alt="" style={{maxWidth:200,maxHeight:200,borderRadius:10,display:'block',
              marginBottom:msg.message?5:0,objectFit:'cover',cursor:'pointer'}}
              onClick={()=>window.open(msg.image_url!,'_blank')}/>
          )}
          {msg.message && (
            <p style={{fontSize:13,color:'rgba(240,244,255,0.9)',lineHeight:1.5,margin:0}}>{msg.message}</p>
          )}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:3,marginTop:2,
          justifyContent:isMe?'flex-end':'flex-start'}}>
          <span style={{fontSize:9,color:'rgba(139,174,214,0.25)'}}>{fmt(msg.created_at)}</span>
          {isMe && (
            <svg width="16" height="10" viewBox="0 0 16 10">
              <path d="M1 5l3 3L10 1" stroke={isRead?'#2dd4a0':'rgba(139,174,214,0.3)'}
                strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 5l3 3 6-7" stroke={isRead?'#2dd4a0':'rgba(139,174,214,0.3)'}
                strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>
      <button onClick={()=>onReply(msg)} style={{background:'none',border:'none',cursor:'pointer',
        padding:'0 1px',color:'rgba(139,174,214,0.25)',alignSelf:'center',flexShrink:0,opacity:0.7}}>
        <CornerUpLeft size={12}/>
      </button>
    </div>
  );
}

/* ── SETUP GUIDE shown when table doesn't exist yet ── */
function SetupGuide() {
  const [copied, setCopied] = useState(false);
  const sql = `-- Run in Supabase Dashboard → SQL Editor\n-- Or run the file: supabase/arxon-all-migrations.sql`;
  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      padding:'0 24px',gap:0}}>
      <div style={{fontSize:44,marginBottom:16}}>⚙️</div>
      <div style={{fontSize:18,fontWeight:900,color:'rgba(240,244,255,0.9)',marginBottom:8,textAlign:'center'}}>
        Chat Setup Required
      </div>
      <div style={{fontSize:13,color:'rgba(139,174,214,0.55)',textAlign:'center',lineHeight:1.7,marginBottom:24}}>
        The chat database tables need to be created. Run the SQL migration to enable chat.
      </div>
      <div style={{width:'100%',padding:'14px',borderRadius:16,background:'rgba(139,174,214,0.06)',
        border:'1px solid rgba(139,174,214,0.15)',marginBottom:16}}>
        <div style={{fontSize:10,color:'rgba(139,174,214,0.45)',textTransform:'uppercase',letterSpacing:'.08em',marginBottom:8,fontWeight:700}}>
          How to fix:
        </div>
        {[
          '1. Go to supabase.com → your project',
          '2. Click SQL Editor → New Query',
          '3. Paste contents of supabase/arxon-all-migrations.sql',
          '4. Click Run — done! ✅',
        ].map((s,i)=>(
          <div key={i} style={{fontSize:12,color:'rgba(240,244,255,0.7)',marginBottom:6,lineHeight:1.5}}>{s}</div>
        ))}
      </div>
      <button onClick={()=>{
        navigator.clipboard.writeText('supabase/arxon-all-migrations.sql');
        setCopied(true); setTimeout(()=>setCopied(false),1800);
      }} style={{padding:'10px 20px',borderRadius:14,background:'rgba(139,174,214,0.1)',
        border:'1px solid rgba(139,174,214,0.2)',color:'#accafe',fontSize:12,fontWeight:700,cursor:'pointer'}}>
        {copied?'Copied!':'Copy file path'}
      </button>
    </div>
  );
}

export default function MobileChat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { membership } = useArenaMembership();

  const [ch, setCh]             = useState<Channel>('general');
  const [msgs, setMsgs]         = useState<Msg[]>([]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [tableOk, setTableOk]   = useState(true);
  const [replyTo, setReplyTo]   = useState<Msg|null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [imgPreview, setImgPreview] = useState<{file:File;url:string}|null>(null);
  const [uploading, setUploading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const username  = profile?.username || user?.email?.split('@')[0] || 'Miner';
  const color     = CC[ch];

  const canAccess = (c: Channel) => {
    if (c === 'alpha') return membership?.club === 'alpha';
    if (c === 'omega') return membership?.club === 'omega';
    return true;
  };

  const load = useCallback(async (c: Channel) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages').select('*')
        .eq('channel', c).order('created_at',{ascending:true}).limit(120);
      if (error) {
        if (error.code === '42P01') { setTableOk(false); setMsgs([]); }
        else throw error;
      } else {
        setTableOk(true);
        setMsgs((data||[]) as Msg[]);
      }
    } catch { setMsgs([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(ch); }, [ch, load]);

  useEffect(() => {
    if (!tableOk) return;
    const sub = supabase.channel(`chat:${ch}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'chat_messages',filter:`channel=eq.${ch}`},
        payload => {
          if (payload.eventType==='INSERT') setMsgs(p=>[...p,payload.new as Msg]);
          else if (payload.eventType==='UPDATE') setMsgs(p=>p.map(m=>m.id===(payload.new as Msg).id?(payload.new as Msg):m));
        }).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [ch, tableOk]);

  useEffect(() => {
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:'smooth'}),80);
  }, [msgs.length]);

  useEffect(() => {
    if (!user||!msgs.length) return;
    msgs.filter(m=>m.user_id!==user.id&&!(m.read_by||[]).includes(user.id))
      .forEach(m=>supabase.rpc('mark_message_read',{p_message_id:m.id,p_user_id:user.id}).catch(()=>{}));
  }, [msgs, user]);

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setImgPreview({file:f,url:URL.createObjectURL(f)});
    if (fileRef.current) fileRef.current.value='';
  };

  const uploadImg = async (file: File): Promise<string|null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop()||'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('chat-images').upload(path,file,{upsert:true,contentType:file.type});
    if (error) { console.error(error); return null; }
    return supabase.storage.from('chat-images').getPublicUrl(path).data.publicUrl;
  };

  const send = async () => {
    if (!user||sending) return;
    if (!input.trim()&&!imgPreview) return;
    if (!canAccess(ch)) return;
    setSending(true);
    try {
      let imgUrl: string|null = null;
      if (imgPreview) {
        setUploading(true);
        imgUrl = await uploadImg(imgPreview.file);
        setUploading(false);
        URL.revokeObjectURL(imgPreview.url);
        setImgPreview(null);
      }
      const { error } = await supabase.from('chat_messages').insert({
        channel:ch, user_id:user.id, username,
        avatar_url:profile?.avatar_url||null,
        message:input.trim(), image_url:imgUrl||null,
        reply_to_id:replyTo?.id||null, read_by:[user.id],
      });
      if (error) {
        if (error.code==='42P01') setTableOk(false);
        else throw error;
      } else { setInput(''); setReplyTo(null); setShowEmoji(false); }
    } catch(err){console.error(err);}
    finally{setSending(false);}
  };

  const msgMap = Object.fromEntries(msgs.map(m=>[m.id,m]));
  const canSend = (!!input.trim()||!!imgPreview)&&canAccess(ch);

  return (
    <div style={{minHeight:'100vh',background:'#060a12',display:'flex',flexDirection:'column',
      fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif",paddingBottom:90}}>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'52px 20px 0',flexShrink:0,background:'rgba(6,10,18,0.96)',
        backdropFilter:'blur(16px)',borderBottom:'1px solid rgba(139,174,214,0.08)'}}>
        <button onClick={()=>navigate(-1)} style={{width:40,height:40,borderRadius:14,
          background:'rgba(139,174,214,0.08)',border:'1px solid rgba(139,174,214,0.15)',
          display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
          <ChevronLeft size={20} color="rgba(139,174,214,0.7)"/>
        </button>
        <div style={{textAlign:'center'}}>
          <h1 style={{fontSize:17,fontWeight:800,color:'rgba(240,244,255,0.95)'}}>Community</h1>
          <p style={{fontSize:10,color:'rgba(139,174,214,0.4)',marginTop:1}}>
            {CHANNELS.find(c=>c.id===ch)?.icon} {CHANNELS.find(c=>c.id===ch)?.label}
          </p>
        </div>
        <div style={{width:40}}/>
      </div>

      {/* Channel tabs */}
      <div style={{display:'flex',gap:6,padding:'10px 16px',overflowX:'auto',flexShrink:0,
        scrollbarWidth:'none',borderBottom:'1px solid rgba(139,174,214,0.06)'}}>
        {CHANNELS.map(c=>{
          const ok = canAccess(c.id); const active = ch===c.id;
          return (
            <button key={c.id} onClick={()=>ok&&setCh(c.id)}
              style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',
                borderRadius:20,fontSize:11,fontWeight:700,border:'none',cursor:ok?'pointer':'not-allowed',
                outline:'none',transition:'all 0.2s',flexShrink:0,
                background:active?`${CC[c.id]}18`:'rgba(139,174,214,0.04)',
                color:active?CC[c.id]:ok?'rgba(139,174,214,0.45)':'rgba(139,174,214,0.2)',
                borderWidth:1,borderStyle:'solid',
                borderColor:active?`${CC[c.id]}35`:'rgba(139,174,214,0.1)',
                opacity:ok?1:0.4}}>
              {c.icon} {c.label}
              {c.lock&&!ok&&<span style={{fontSize:9}}>🔒</span>}
            </button>
          );
        })}
      </div>

      {/* Image preview */}
      {imgPreview && (
        <div style={{margin:'8px 16px 0',position:'relative',flexShrink:0}}>
          <img src={imgPreview.url} alt="preview" style={{maxHeight:110,borderRadius:12,objectFit:'cover',
            display:'block',border:'1px solid rgba(139,174,214,0.15)'}}/>
          <button onClick={()=>{URL.revokeObjectURL(imgPreview.url);setImgPreview(null);}}
            style={{position:'absolute',top:6,right:6,width:22,height:22,borderRadius:'50%',
              background:'rgba(6,10,18,0.85)',border:'none',cursor:'pointer',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
            <X size={12} color="white"/>
          </button>
          {uploading&&<p style={{fontSize:10,color:'rgba(139,174,214,0.5)',marginTop:2}}>Uploading…</p>}
        </div>
      )}

      {/* Messages / Setup guide */}
      {!tableOk ? <SetupGuide/> : (
        <div style={{flex:1,overflowY:'auto',padding:'12px 16px 0',minHeight:0,scrollbarWidth:'none'}}>
          {loading ? (
            <div style={{display:'flex',justifyContent:'center',paddingTop:56}}>
              <div style={{width:30,height:30,borderRadius:'50%',
                border:'2px solid rgba(139,174,214,0.15)',borderTopColor:'rgba(139,174,214,0.7)',
                animation:'spin 1s linear infinite'}}/>
            </div>
          ) : msgs.length === 0 ? (
            <div style={{textAlign:'center',paddingTop:60}}>
              <div style={{fontSize:44,marginBottom:12}}>{CHANNELS.find(c=>c.id===ch)?.icon}</div>
              <p style={{fontSize:15,fontWeight:700,color:'rgba(139,174,214,0.45)',marginBottom:6}}>No messages yet</p>
              <p style={{fontSize:12,color:'rgba(139,174,214,0.3)'}}>Be first to say something!</p>
            </div>
          ) : msgs.map((msg,i)=>{
            const isMe = msg.user_id===user?.id;
            const showHead = i===0||msgs[i-1].user_id!==msg.user_id;
            const replyMsg = msg.reply_to_id?msgMap[msg.reply_to_id]||null:null;
            return <Bubble key={msg.id} msg={msg} isMe={isMe} showHead={showHead}
              replyMsg={replyMsg} color={color} onReply={m=>setReplyTo(m)}/>;
          })}
          <div ref={bottomRef}/>
        </div>
      )}

      {/* Input zone */}
      {user && tableOk && (
        <div style={{flexShrink:0,position:'relative'}}>
          <AnimatePresence>
            {showEmoji && (
              <div style={{position:'absolute',bottom:'100%',left:0,right:0,padding:'0 16px'}}>
                <EmojiPanel onPick={em=>setInput(p=>p+em)}/>
              </div>
            )}
          </AnimatePresence>
          {replyTo && <ReplyPreview msg={replyTo} onCancel={()=>setReplyTo(null)}/>}

          {!canAccess(ch) ? (
            <div style={{padding:'10px 16px 12px',background:'#070b15',borderTop:'1px solid rgba(139,174,214,0.08)'}}>
              <div style={{padding:'13px',borderRadius:16,textAlign:'center',
                background:'rgba(139,174,214,0.04)',border:'1px solid rgba(139,174,214,0.1)'}}>
                <p style={{fontSize:12,color:'rgba(139,174,214,0.4)'}}>
                  🔒 Join {ch==='alpha'?'Alpha':'Omega'} team in Arena to access this channel
                </p>
              </div>
            </div>
          ) : (
            <div style={{padding:'10px 16px 12px',background:'rgba(6,10,18,0.97)',
              borderTop:'1px solid rgba(139,174,214,0.08)'}}>
              <div style={{display:'flex',alignItems:'flex-end',gap:8}}>
                {/* Emoji */}
                <button onClick={()=>setShowEmoji(v=>!v)}
                  style={{width:38,height:38,borderRadius:12,flexShrink:0,cursor:'pointer',
                    background:showEmoji?`${color}18`:'rgba(139,174,214,0.06)',
                    border:`1px solid ${showEmoji?`${color}35`:'rgba(139,174,214,0.12)'}`,
                    display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,outline:'none'}}>
                  😊
                </button>
                {/* Image */}
                <button onClick={()=>fileRef.current?.click()}
                  style={{width:38,height:38,borderRadius:12,flexShrink:0,cursor:'pointer',
                    background:'rgba(139,174,214,0.06)',border:'1px solid rgba(139,174,214,0.12)',
                    display:'flex',alignItems:'center',justifyContent:'center',outline:'none'}}>
                  <ImageIcon size={15} color="rgba(139,174,214,0.5)"/>
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={onFilePick} style={{display:'none'}}/>
                {/* Text box */}
                <div style={{flex:1,background:'rgba(139,174,214,0.05)',
                  border:`1px solid ${color}25`,borderRadius:18,padding:'9px 13px'}}>
                  <textarea value={input} onChange={e=>setInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
                    placeholder="Message…" rows={1}
                    style={{width:'100%',background:'none',border:'none',outline:'none',fontSize:14,
                      color:'rgba(240,244,255,0.9)',resize:'none',maxHeight:80,overflow:'auto',
                      fontFamily:"'Creato Display',-apple-system,sans-serif",lineHeight:1.5,display:'block'}}/>
                </div>
                {/* Send */}
                <button onClick={send} disabled={!canSend||sending}
                  style={{width:38,height:38,borderRadius:12,flexShrink:0,
                    cursor:canSend?'pointer':'default',outline:'none',transition:'all 0.2s',
                    background:canSend?`${color}18`:'rgba(139,174,214,0.04)',
                    border:`1px solid ${canSend?`${color}35`:'rgba(139,174,214,0.08)'}`,
                    display:'flex',alignItems:'center',justifyContent:'center'}}>
                  {sending
                    ?<div style={{width:14,height:14,borderRadius:'50%',
                        border:`2px solid ${color}30`,borderTopColor:color,animation:'spin 1s linear infinite'}}/>
                    :<Send size={14} color={canSend?color:'rgba(139,174,214,0.25)'}/>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!user && (
        <div style={{padding:'12px 16px 14px',flexShrink:0}}>
          <button onClick={()=>navigate('/auth')}
            style={{width:'100%',padding:'16px',borderRadius:18,fontWeight:800,fontSize:14,cursor:'pointer',
              background:'linear-gradient(135deg,rgba(139,174,214,0.2),rgba(139,174,214,0.1))',
              border:'1px solid rgba(172,202,254,0.3)',color:'#accafe',outline:'none',
              fontFamily:"'Creato Display',-apple-system,sans-serif"}}>
            Sign In to Chat
          </button>
        </div>
      )}
    </div>
  );
}
