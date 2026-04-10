import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useArenaMembership } from '@/hooks/useArenaMembership';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, Send, RefreshCw, X, CornerUpLeft, Copy, Trash2 } from 'lucide-react';

type Channel = 'general' | 'alpha' | 'omega' | 'nexus_exchange';
interface Msg {
  id: string; channel: Channel; user_id: string;
  username: string|null; avatar_url: string|null;
  message: string; created_at: string;
  reply_to_id?: string|null;
  reply_to_username?: string|null;
  reply_to_message?: string|null;
}
const CHANNELS = [
  { id:'general'        as Channel, label:'General',       icon:'🌐', desc:'Everyone can chat here' },
  { id:'alpha'          as Channel, label:'Alpha Team',    icon:'⬡',  desc:'Alpha members only',  lock:'alpha' },
  { id:'omega'          as Channel, label:'Omega Team',    icon:'⬡',  desc:'Omega members only',  lock:'omega' },
  { id:'nexus_exchange' as Channel, label:'Nexus Exchange',icon:'📡', desc:'Share Nexus UIDs & send ARX-P' },
];
const CC: Record<Channel,string> = {
  general:'hsl(215 35% 62%)', alpha:'hsl(215 35% 62%)',
  omega:'hsl(255 50% 65%)', nexus_exchange:'hsl(155 45% 50%)',
};
const fmt = (iso:string) => { try { return new Date(iso).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); } catch { return ''; }};

function Av({url,name,col,sz=28}:{url:string|null;name:string|null;col:string;sz?:number}) {
  const [e,setE] = useState(false);
  if (url && !e) return <div style={{width:sz,height:sz,borderRadius:sz*.35,overflow:'hidden',flexShrink:0}}><img src={url} alt="" onError={()=>setE(true)} style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>;
  return <div style={{width:sz,height:sz,borderRadius:sz*.35,flexShrink:0,fontSize:sz*.38,fontWeight:700,background:`${col}18`,border:`1px solid ${col}33`,color:col,display:'flex',alignItems:'center',justifyContent:'center'}}>{(name||'?')[0].toUpperCase()}</div>;
}

export default function MobileChat() {
  const navigate = useNavigate();
  const {user}   = useAuth();
  const {profile}= useProfile();
  const {membership} = useArenaMembership();
  const [ch,  setCh]   = useState<Channel>('general');
  const [msgs, setMsgs]= useState<Msg[]>([]);
  const [txt,  setTxt] = useState('');
  const [busy, setBusy]= useState(false);
  const [load, setLoad]= useState(true);
  const [ok,   setOk]  = useState<boolean|null>(null);
  const [key,  setKey] = useState(0);
  const [rep,  setRep] = useState<Msg|null>(null);
  const [menu, setMenu]= useState<Msg|null>(null);
  const bot  = useRef<HTMLDivElement>(null);
  const sub  = useRef<ReturnType<typeof supabase.channel>|null>(null);
  const pt   = useRef<NodeJS.Timeout|null>(null);
  const inp  = useRef<HTMLTextAreaElement>(null);
  const uname= profile?.username || user?.email?.split('@')[0] || 'Miner';
  const can  = (c:Channel) => c==='alpha'?membership?.club==='alpha':c==='omega'?membership?.club==='omega':true;

  const load_ = useCallback(async (c:Channel) => {
    setLoad(true);
    const {data,error} = await supabase.from('chat_messages').select('*').eq('channel',c).order('created_at',{ascending:true}).limit(80);
    if (error) { setOk(error.code==='42P01'?false:null); setMsgs([]); }
    else       { setOk(true); setMsgs((data||[]) as Msg[]); }
    setLoad(false);
  },[]);

  useEffect(()=>{load_(ch);},[ch,load_,key]);

  useEffect(()=>{
    if (ok!==true) return;
    if (sub.current) { supabase.removeChannel(sub.current); sub.current=null; }
    const s = supabase.channel(`chat-${ch}-${Date.now()}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages',filter:`channel=eq.${ch}`},(p)=>{
        setMsgs(prev=>{ const m=p.new as Msg; return prev.some(x=>x.id===m.id)?prev:[...prev,m]; });
      }).subscribe();
    sub.current=s;
    return ()=>{ supabase.removeChannel(s); sub.current=null; };
  },[ch,ok]);

  useEffect(()=>{ bot.current?.scrollIntoView({behavior:'smooth'}); },[msgs]);

  const send = async () => {
    if (!user||!txt.trim()||busy) return;
    if (!can(ch)) return;
    const t=txt.trim(); setTxt(''); setBusy(true);
    const payload:any = {channel:ch,user_id:user.id,username:uname,avatar_url:profile?.avatar_url||null,message:t};
    if (rep) { payload.reply_to_id=rep.id; payload.reply_to_username=rep.username||'Miner'; payload.reply_to_message=rep.message.slice(0,80); }
    const {error} = await supabase.from('chat_messages').insert(payload);
    if (error) { if (error.code==='42P01') setOk(false); else setTxt(t); }
    else setRep(null);
    setBusy(false);
  };

  const longStart=(m:Msg)=>{ pt.current=setTimeout(()=>setMenu(m),500); };
  const longEnd=()=>{ if(pt.current){clearTimeout(pt.current);pt.current=null;} };

  const col=CC[ch];

  return (
    <div style={{minHeight:'100vh',background:'hsl(225 30% 3%)',display:'flex',flexDirection:'column',fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif",paddingBottom:90}}>

      {/* Long-press context menu */}
      {menu&&(
        <div onClick={()=>setMenu(null)} style={{position:'fixed',inset:0,zIndex:999,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div onClick={e=>e.stopPropagation()} style={{background:'hsl(225 26% 11%)',border:'1px solid hsl(215 22% 20%)',borderRadius:22,overflow:'hidden',minWidth:230,maxWidth:280}}>
            {/* Preview */}
            <div style={{padding:'14px 16px',borderBottom:'1px solid hsl(215 22% 15%)'}}>
              <p style={{fontSize:10,fontWeight:700,color:CC[ch],marginBottom:4}}>{menu.username||'Miner'}</p>
              <p style={{fontSize:12,color:'hsl(215 18% 70%)',lineHeight:1.4,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{menu.message}</p>
            </div>
            {/* Reply */}
            <button onClick={()=>{setRep(menu);setMenu(null);setTimeout(()=>inp.current?.focus(),100);}}
              style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:'none',border:'none',cursor:'pointer',outline:'none',borderBottom:'1px solid hsl(215 22% 13%)'}}>
              <CornerUpLeft size={17} color="hsl(215 35% 62%)"/>
              <span style={{fontSize:14,fontWeight:600,color:'hsl(215 18% 88%)'}}>Reply</span>
            </button>
            {/* Copy */}
            <button onClick={()=>{navigator.clipboard?.writeText(menu.message);setMenu(null);}}
              style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:'none',border:'none',cursor:'pointer',outline:'none'}}>
              <Copy size={17} color="hsl(215 25% 55%)"/>
              <span style={{fontSize:14,fontWeight:600,color:'hsl(215 18% 88%)'}}>Copy</span>
            </button>
            {/* Delete — only own messages */}
            {menu.user_id===user?.id&&(
              <button onClick={async()=>{
                await supabase.from('chat_messages').delete().eq('id',menu.id);
                setMsgs(p=>p.filter(m=>m.id!==menu.id)); setMenu(null);
              }} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:'none',border:'none',cursor:'pointer',outline:'none',borderTop:'1px solid hsl(215 22% 13%)'}}>
                <Trash2 size={17} color="hsl(0 60% 56%)"/>
                <span style={{fontSize:14,fontWeight:600,color:'hsl(0 60% 62%)'}}>Delete</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'52px 20px 0',flexShrink:0}}>
        <button onClick={()=>navigate('/')} style={{width:40,height:40,borderRadius:14,background:'hsl(215 25% 11%)',border:'1px solid hsl(215 22% 18%)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',outline:'none'}}>
          <ChevronLeft size={20} color="hsl(215 25% 55%)"/>
        </button>
        <div style={{textAlign:'center'}}>
          <h1 style={{fontSize:19,fontWeight:700,color:'hsl(215 20% 93%)'}}>Community</h1>
          <p style={{fontSize:10,color:'hsl(215 14% 38%)',marginTop:2}}>{CHANNELS.find(c=>c.id===ch)?.icon} {CHANNELS.find(c=>c.id===ch)?.label}</p>
        </div>
        <button onClick={()=>setKey(k=>k+1)} style={{width:40,height:40,borderRadius:14,background:'hsl(215 25% 11%)',border:'1px solid hsl(215 22% 18%)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',outline:'none'}}>
          <RefreshCw size={15} color="hsl(215 25% 55%)" style={{animation:load?'spin 1s linear infinite':'none'}}/>
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        </button>
      </div>

      {/* Tabs */}
      <div className="scrollbar-none" style={{display:'flex',gap:8,padding:'14px 20px 0',overflowX:'auto',flexShrink:0}}>
        {CHANNELS.map(c=>{
          const ac=can(c.id); const ia=ch===c.id;
          return <button key={c.id} onClick={()=>ac?setCh(c.id):undefined}
            style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:22,fontSize:12,fontWeight:700,border:'none',cursor:ac?'pointer':'not-allowed',outline:'none',transition:'all .2s',flexShrink:0,
              background:ia?`${CC[c.id]}22`:'hsl(215 22% 10%)',color:ia?CC[c.id]:ac?'hsl(215 18% 45%)':'hsl(215 14% 28%)',
              borderWidth:1,borderStyle:'solid',borderColor:ia?`${CC[c.id]}44`:'hsl(215 20% 16%)',opacity:ac?1:.45}}>
            <span>{c.icon}</span>{c.label}{(c as any).lock&&!ac&&<span style={{fontSize:9}}>🔒</span>}
          </button>;
        })}
      </div>

      {/* Desc */}
      <div style={{padding:'8px 20px 0',flexShrink:0}}>
        <p style={{fontSize:11,color:'hsl(215 14% 35%)'}}>{CHANNELS.find(c=>c.id===ch)?.desc}
          {ch==='alpha'&&membership?.club==='alpha'&&' · Welcome, Alpha!'}
          {ch==='omega'&&membership?.club==='omega'&&' · Welcome, Omega!'}
        </p>
      </div>

      {ok===false&&<div style={{margin:'10px 20px',padding:'13px 15px',borderRadius:14,background:'hsl(38 55% 52%/0.08)',border:'1px solid hsl(38 55% 52%/0.22)',flexShrink:0}}>
        <p style={{fontSize:12,fontWeight:600,color:'hsl(38 55% 58%)',marginBottom:3}}>⚙️ Chat Setup Required</p>
        <p style={{fontSize:11,color:'hsl(38 55% 52%/0.7)',lineHeight:1.5}}>Run the SQL migration in Supabase to enable chat.</p>
      </div>}

      {/* Messages */}
      <div className="scrollbar-none" style={{flex:1,overflowY:'auto',padding:'10px 20px 0',minHeight:0}}>
        {load&&ok===null&&<div style={{display:'flex',justifyContent:'center',paddingTop:40}}><div style={{width:32,height:32,borderRadius:'50%',border:'2px solid hsl(215 35% 62%/0.2)',borderTopColor:'hsl(215 35% 62%)',animation:'spin 1s linear infinite'}}/></div>}
        {!load&&ok===true&&msgs.length===0&&<div style={{textAlign:'center',paddingTop:48}}><div style={{fontSize:44,marginBottom:12}}>{CHANNELS.find(c=>c.id===ch)?.icon}</div><p style={{fontSize:15,fontWeight:700,color:'hsl(215 18% 50%)',marginBottom:6}}>No messages yet</p><p style={{fontSize:12,color:'hsl(215 14% 32%)'}}>Be the first to say something!</p></div>}

        {ok===true&&msgs.map((m,i)=>{
          const me=m.user_id===user?.id;
          const sh=i===0||msgs[i-1].user_id!==m.user_id;
          return (
            <div key={m.id}
              onMouseDown={()=>longStart(m)} onMouseUp={longEnd}
              onTouchStart={()=>longStart(m)} onTouchEnd={longEnd} onTouchMove={longEnd}
              style={{marginBottom:sh?12:4,display:'flex',flexDirection:me?'row-reverse':'row',alignItems:'flex-end',gap:8,userSelect:'none'}}>

              {!me&&sh&&<Av url={m.avatar_url} name={m.username} col={col} sz={30}/>}
              {!me&&!sh&&<div style={{width:30,flexShrink:0}}/>}

              <div style={{maxWidth:'75%'}}>
                {sh&&!me&&<div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                  <span style={{fontSize:11,fontWeight:700,color:col}}>{m.username||'Miner'}</span>
                  <span style={{fontSize:9,color:'hsl(215 14% 30%)'}}>{fmt(m.created_at)}</span>
                </div>}

                {/* Reply quote */}
                {m.reply_to_id&&m.reply_to_message&&(
                  <div style={{marginBottom:2,padding:'7px 10px',
                    borderRadius:m.reply_to_id?'10px 10px 0 0':'10px',
                    background:'hsl(215 22% 12%)',borderLeft:`3px solid ${col}`,opacity:.9}}>
                    <p style={{fontSize:10,fontWeight:700,color:col,marginBottom:2}}>{m.reply_to_username||'Miner'}</p>
                    <p style={{fontSize:11,color:'hsl(215 14% 48%)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:200}}>{m.reply_to_message}</p>
                  </div>
                )}

                {/* Bubble */}
                <div style={{padding:'10px 14px',
                  borderRadius:m.reply_to_id?(me?'0 18px 4px 18px':'18px 0 18px 4px'):(me?'18px 18px 4px 18px':'18px 18px 18px 4px'),
                  background:me?`linear-gradient(135deg,${col}22,${col}12)`:'hsl(225 24% 10%)',
                  border:`1px solid ${me?`${col}30`:'hsl(215 22% 16%)'}`,wordBreak:'break-word'}}>
                  <p style={{fontSize:13,color:'hsl(215 18% 88%)',lineHeight:1.55}}>{m.message}</p>
                </div>
                {me&&<p style={{fontSize:9,color:'hsl(215 14% 28%)',marginTop:3,textAlign:'right'}}>{fmt(m.created_at)}</p>}
              </div>
            </div>
          );
        })}
        <div ref={bot}/>
      </div>

      {/* Reply bar */}
      {rep&&(
        <div style={{margin:'0 20px 6px',padding:'9px 12px',borderRadius:14,background:'hsl(215 22% 10%)',border:`1px solid ${col}33`,flexShrink:0,display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:3,alignSelf:'stretch',borderRadius:2,background:col,flexShrink:0}}/>
          <div style={{flex:1,minWidth:0}}>
            <p style={{fontSize:11,fontWeight:700,color:col,marginBottom:2}}>↩ Replying to {rep.username||'Miner'}</p>
            <p style={{fontSize:11,color:'hsl(215 14% 45%)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{rep.message}</p>
          </div>
          <button onClick={()=>setRep(null)} style={{padding:5,borderRadius:8,background:'hsl(215 22% 14%)',border:'none',cursor:'pointer',outline:'none',flexShrink:0}}>
            <X size={14} color="hsl(215 18% 45%)"/>
          </button>
        </div>
      )}

      {/* Input */}
      {user&&ok===true&&(
        <div style={{padding:'4px 20px 12px',flexShrink:0}}>
          {!can(ch)?(
            <div style={{padding:'14px 16px',borderRadius:18,textAlign:'center',background:'hsl(215 22% 10%)',border:'1px solid hsl(215 20% 16%)'}}>
              <p style={{fontSize:12,color:'hsl(215 18% 40%)'}}>🔒 Join {ch==='alpha'?'Alpha':'Omega'} team in Arena</p>
            </div>
          ):(
            <div style={{display:'flex',alignItems:'flex-end',gap:10,background:'hsl(225 26% 9%)',border:`1px solid ${col}30`,borderRadius:20,padding:'10px 10px 10px 16px'}}>
              <textarea ref={inp} value={txt} onChange={e=>setTxt(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}
                placeholder={rep?`Reply to ${rep.username||'Miner'}…`:'Type a message… (hold to reply)'}
                rows={1}
                style={{flex:1,background:'none',border:'none',outline:'none',fontSize:14,color:'hsl(215 18% 88%)',resize:'none',fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif",lineHeight:'1.5',maxHeight:80,overflow:'auto'}}/>
              <button onClick={send} disabled={!txt.trim()||busy}
                style={{width:38,height:38,borderRadius:13,flexShrink:0,cursor:txt.trim()?'pointer':'default',background:txt.trim()?`${col}22`:'hsl(215 22% 12%)',border:`1px solid ${txt.trim()?`${col}44`:'hsl(215 22% 18%)'}`,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s',outline:'none'}}>
                <Send size={16} color={txt.trim()?col:'hsl(215 18% 35%)'}/>
              </button>
            </div>
          )}
        </div>
      )}

      {!user&&(
        <div style={{padding:'12px 20px',flexShrink:0}}>
          <button onClick={()=>navigate('/auth')} style={{width:'100%',padding:'16px',borderRadius:18,fontWeight:700,fontSize:14,cursor:'pointer',background:'linear-gradient(135deg,hsl(215 35% 55%),hsl(215 40% 45%))',border:'none',color:'white',outline:'none',fontFamily:"'Creato Display',-apple-system,sans-serif"}}>
            Sign In to Chat
          </button>
        </div>
      )}
    </div>
  );
}
