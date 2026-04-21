import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useArenaMembership } from '@/hooks/useArenaMembership';
import { supabase } from '@/integrations/supabase/client';
import {
  ChevronLeft, Send, X, CornerUpLeft, Copy,
  Trash2, Pencil, Check, Smile, Menu, RefreshCw
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
type Channel = 'general' | 'alpha' | 'omega' | 'nexus_exchange';
type MsgType  = 'text' | 'image' | 'sticker';

interface Msg {
  id: string; channel: Channel; user_id: string;
  username: string | null; avatar_url: string | null;
  message: string; msg_type?: MsgType; image_url?: string | null;
  created_at: string;
  reply_to_id?: string | null;
  reply_to_username?: string | null;
  reply_to_message?: string | null;
}

// ── Static data ───────────────────────────────────────────────────────────────
const CHANNELS = [
  { id: 'general'       as Channel, label: 'General',        icon: '🌐', desc: 'Open to everyone',           lock: null    },
  { id: 'alpha'         as Channel, label: 'Alpha Team',     icon: '⬡',  desc: 'Alpha members only',         lock: 'alpha' },
  { id: 'omega'         as Channel, label: 'Omega Team',     icon: '⬡',  desc: 'Omega members only',         lock: 'omega' },
  { id: 'nexus_exchange'as Channel, label: 'Nexus Exchange', icon: '📡', desc: 'Share Nexus UIDs & ARX-P',   lock: null    },
];

const CC: Record<Channel, string> = {
  general:       'hsl(215 35% 62%)',
  alpha:         'hsl(195 80% 50%)',
  omega:         'hsl(255 60% 65%)',
  nexus_exchange:'hsl(155 45% 50%)',
};

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const stickerUrl = (f: string) =>
  SUPABASE_URL
    ? `${SUPABASE_URL}/storage/v1/object/public/chat-images/stickers/${f}`
    : `/${f}`;

const STICKERS = [
  { id:'s1', file:'sticker_1.png', label:'Welcome'  },
  { id:'s2', file:'sticker_2.png', label:'Rich'     },
  { id:'s3', file:'sticker_3.png', label:'Verified' },
  { id:'s4', file:'sticker_4.png', label:'Wen?'     },
  { id:'s5', file:'sticker_5.png', label:'LOL'      },
];

const EMOJIS = [
  '😀','😂','🤣','😍','🥰','😎','🤩','😏','😅','🤔',
  '🔥','💯','💪','👀','🚀','💰','🏆','⚡','🎯','✅',
  '👍','❤️','😭','🙏','💎','🌙','⭐','🎉','💸','🤑',
  '😤','😱','🤯','👏','🫡','🥳','😴','🤝','💬','🎮',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtTime = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }); }
  catch { return ''; }
};

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Av({ url, name, col, sz = 30 }: { url: string|null; name: string|null; col: string; sz?: number }) {
  const [err, setErr] = useState(false);
  const letter = (name || '?')[0].toUpperCase();
  const base: React.CSSProperties = {
    width: sz, height: sz, borderRadius: sz * 0.36,
    flexShrink: 0, overflow: 'hidden',
    border: `1.5px solid ${col}30`,
  };
  if (url && !err) return (
    <div style={base}>
      <img src={url} alt="" onError={() => setErr(true)}
        style={{ width:'100%', height:'100%', objectFit:'cover' }} />
    </div>
  );
  return (
    <div style={{ ...base, display:'flex', alignItems:'center', justifyContent:'center',
      background:`${col}18`, color: col, fontSize: sz * 0.42, fontWeight: 700 }}>
      {letter}
    </div>
  );
}

// ── Context-menu button ───────────────────────────────────────────────────────
function CMBtn({ icon, label, onTap, border = true, danger = false }: {
  icon: React.ReactNode; label: string; onTap: ()=>void; border?: boolean; danger?: boolean;
}) {
  return (
    <button
      onPointerDown={e => { e.preventDefault(); e.stopPropagation(); onTap(); }}
      style={{ width:'100%', display:'flex', alignItems:'center', gap: 12,
        padding:'12px 16px', background:'none', border:'none', cursor:'pointer', outline:'none',
        borderBottom: border ? '1px solid hsl(215 22% 12%)' : 'none' }}>
      {icon}
      <span style={{ fontSize:14, fontWeight:600,
        color: danger ? 'hsl(0 60% 62%)' : 'hsl(215 18% 84%)' }}>{label}</span>
    </button>
  );
}

// ── Types for local state ─────────────────────────────────────────────────────
type CtxMenu = { msg: Msg; x: number; y: number } | null;
type EditSt  = { id: string; text: string } | null;
type Panel   = 'none' | 'stickers' | 'emoji' | 'channels';

// ═════════════════════════════════════════════════════════════════════════════
//  Main component
// ═════════════════════════════════════════════════════════════════════════════
export default function MobileChat() {
  const navigate = useNavigate();
  const { user }       = useAuth();
  const { profile }    = useProfile();
  const { membership } = useArenaMembership();

  // ── Chat state ─────────────────────────────────────────────────────────────
  const [ch,       setCh]      = useState<Channel>('general');
  const [msgs,     setMsgs]    = useState<Msg[]>([]);
  const [dbReady,  setDbReady] = useState<boolean>(false);   // true once first load succeeds
  const [dbError,  setDbError] = useState<boolean>(false);   // true if table missing
  const [loading,  setLoading] = useState<boolean>(true);
  const [busy,     setBusy]    = useState<boolean>(false);
  const [refreshK, setRefresh] = useState<number>(0);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [rep,      setRep]     = useState<Msg|null>(null);
  const [ctxMenu,  setCtxMenu] = useState<CtxMenu>(null);
  const [editing,  setEditing] = useState<EditSt|null>(null);
  const [saving,   setSaving]  = useState(false);
  const [deletingId,setDel]    = useState<string|null>(null);
  const [panel,    setPanel]   = useState<Panel>('none');
  const [uploading,setUpload]  = useState(false);
  const [toastMsg, setToast]   = useState('');

  // ── Refs ───────────────────────────────────────────────────────────────────
  const botRef      = useRef<HTMLDivElement>(null);
  const subRef      = useRef<ReturnType<typeof supabase.channel>|null>(null);
  const inpRef      = useRef<HTMLTextAreaElement>(null);
  const pressTimer  = useRef<ReturnType<typeof setTimeout>|null>(null);
  const fileId      = useRef(`chat-img-${Date.now()}`);
  const deletedSet  = useRef(new Set<string>());

  // txt via ref so send() always reads the latest value without stale closure
  const txtRef   = useRef('');
  const repRef   = useRef<Msg|null>(null);
  const [txt, _setTxt] = useState('');
  const setTxt = (v: string) => { txtRef.current = v; _setTxt(v); };
  useEffect(() => { repRef.current = rep; }, [rep]);

  // Persist uid so context menu always knows owner
  const [uid, setUid] = useState<string|null>(null);
  useEffect(() => { if (user?.id) setUid(user.id); }, [user?.id]);

  const uname   = profile?.username || user?.email?.split('@')[0] || 'Miner';
  const canPost = (c: Channel) =>
    c === 'alpha' ? membership?.club === 'alpha'  :
    c === 'omega' ? membership?.club === 'omega'  : true;
  const isOwn   = (m: Msg) => !!uid && m.user_id === uid;

  const toast = (msg: string, ms = 2000) => {
    setToast(msg);
    setTimeout(() => setToast(''), ms);
  };

  // ── Load messages ──────────────────────────────────────────────────────────
  const load = useCallback(async (c: Channel) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('channel', c)
      .order('created_at', { ascending: true })
      .limit(120);

    if (error) {
      setDbError(error.code === '42P01');
      setDbReady(false);
      setMsgs([]);
    } else {
      setDbError(false);
      setDbReady(true);
      setMsgs((data ?? []) as Msg[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(ch); }, [ch, load, refreshK]);

  // ── Realtime ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dbReady) return;
    if (subRef.current) { supabase.removeChannel(subRef.current); subRef.current = null; }

    const s = supabase
      .channel(`chat-${ch}-${Date.now()}`)
      .on('postgres_changes',
        { event:'INSERT', schema:'public', table:'chat_messages', filter:`channel=eq.${ch}` },
        ({ new: m }) => {
          const msg = m as Msg;
          if (deletedSet.current.has(msg.id)) return;
          setMsgs(p => p.some(x => x.id === msg.id) ? p : [...p, msg]);
        })
      .on('postgres_changes',
        { event:'UPDATE', schema:'public', table:'chat_messages', filter:`channel=eq.${ch}` },
        ({ new: m }) => {
          const msg = m as Msg;
          setMsgs(p => p.map(x => x.id === msg.id ? { ...x, message: msg.message } : x));
        })
      .on('postgres_changes',
        { event:'DELETE', schema:'public', table:'chat_messages' },
        ({ old: o }) => {
          const id = (o as Msg).id;
          deletedSet.current.delete(id);
          setMsgs(p => p.filter(x => x.id !== id));
        })
      .subscribe();

    subRef.current = s;
    return () => { if (subRef.current) { supabase.removeChannel(subRef.current); subRef.current = null; } };
  }, [ch, dbReady]);

  // Auto-scroll
  useEffect(() => { botRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  // ── Send text ─────────────────────────────────────────────────────────────
  // NOTE: reads txtRef.current so it's never stale on Android
  const sendText = useCallback(async () => {
    const text = txtRef.current.trim();
    if (!user || !text || busy) return;

    const reply = repRef.current;
    setTxt('');
    setRep(null);
    setBusy(true);

    const row: Record<string, unknown> = {
      channel:    ch,
      user_id:    user.id,
      username:   uname,
      avatar_url: profile?.avatar_url ?? null,
      message:    text,
      msg_type:   'text',
    };
    if (reply) {
      row.reply_to_id       = reply.id;
      row.reply_to_username = reply.username ?? 'Miner';
      row.reply_to_message  = reply.message.slice(0, 80);
    }

    const { error } = await supabase.from('chat_messages').insert(row);
    if (error) {
      // restore on failure
      setTxt(text);
      setRep(reply);
      toast('Send failed — try again');
    }
    setBusy(false);
  }, [user, busy, ch, uname, profile]);

  // ── Send sticker ──────────────────────────────────────────────────────────
  const sendSticker = useCallback(async (url: string) => {
    if (!user || busy) return;
    setPanel('none');
    setBusy(true);
    const { error } = await supabase.from('chat_messages').insert({
      channel:    ch,
      user_id:    user.id,
      username:   uname,
      avatar_url: profile?.avatar_url ?? null,
      message:    '🐉',
      msg_type:   'sticker',
      image_url:  url,
    });
    if (error) toast('Sticker failed');
    setBusy(false);
  }, [user, busy, ch, uname, profile]);

  // ── Emoji ─────────────────────────────────────────────────────────────────
  const addEmoji = useCallback((emoji: string) => {
    const inp = inpRef.current;
    const pos = inp?.selectionStart ?? txtRef.current.length;
    const next = txtRef.current.slice(0, pos) + emoji + txtRef.current.slice(pos);
    setTxt(next);
    // keep emoji panel open, refocus
    setTimeout(() => {
      if (inp) { inp.focus(); inp.setSelectionRange(pos + emoji.length, pos + emoji.length); }
    }, 20);
  }, []);

  // ── Image upload ──────────────────────────────────────────────────────────
  const pickImage = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 8 * 1024 * 1024) { toast('Image too large — max 8 MB'); return; }

    setUpload(true);
    try {
      const ext  = file.name.split('.').pop() ?? 'jpg';
      const path = `chat/${user.id}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('chat-images')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('chat-images').getPublicUrl(path);

      const { error: msgErr } = await supabase.from('chat_messages').insert({
        channel:    ch,
        user_id:    user.id,
        username:   uname,
        avatar_url: profile?.avatar_url ?? null,
        message:    '📷 Image',
        msg_type:   'image',
        image_url:  pub.publicUrl,
      });
      if (msgErr) throw msgErr;
      toast('📷 Sent!');
    } catch (err: any) {
      toast(err?.message?.includes('Bucket') ? 'Storage bucket missing' : 'Upload failed');
    } finally {
      setUpload(false);
      e.target.value = '';
    }
  }, [user, ch, uname, profile]);

  // ── Edit save ─────────────────────────────────────────────────────────────
  const saveEdit = useCallback(async () => {
    if (!editing || !editing.text.trim() || saving) return;
    setSaving(true);
    const text = editing.text.trim();
    const { error } = await supabase
      .from('chat_messages')
      .update({ message: text })
      .eq('id', editing.id)
      .eq('user_id', uid ?? '');
    if (!error) {
      setMsgs(p => p.map(m => m.id === editing!.id ? { ...m, message: text } : m));
      setEditing(null);
      setTxt('');
    } else toast('Edit failed');
    setSaving(false);
  }, [editing, saving, uid]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const doDelete = useCallback(async (m: Msg) => {
    setCtxMenu(null);
    deletedSet.current.add(m.id);
    setMsgs(p => p.filter(x => x.id !== m.id));
    setDel(m.id);
    const { error } = await supabase
      .from('chat_messages').delete()
      .eq('id', m.id).eq('user_id', uid ?? '');
    if (error) {
      deletedSet.current.delete(m.id);
      setMsgs(p => [...p, m].sort((a, b) => a.created_at.localeCompare(b.created_at)));
      toast('Delete failed');
    }
    setDel(null);
  }, [uid]);

  // ── Context-menu actions ──────────────────────────────────────────────────
  const doReply = useCallback((m: Msg) => {
    setRep(m); setCtxMenu(null); setEditing(null); setTxt('');
    setTimeout(() => inpRef.current?.focus(), 150);
  }, []);
  const doCopy  = useCallback(async (m: Msg) => {
    setCtxMenu(null);
    toast((await copyText(m.message)) ? '✓ Copied' : 'Copy failed');
  }, []);
  const doEdit  = useCallback((m: Msg) => {
    setCtxMenu(null); setRep(null);
    setEditing({ id: m.id, text: m.message });
    setTimeout(() => inpRef.current?.focus(), 150);
  }, []);

  // ── Long-press ────────────────────────────────────────────────────────────
  const onPressStart = useCallback((e: React.TouchEvent|React.MouseEvent, m: Msg) => {
    const t = 'touches' in e ? e.touches[0] : (e as unknown as MouseEvent);
    pressTimer.current = setTimeout(() => {
      setPanel('none');
      setCtxMenu({ msg: m, x: t.clientX, y: t.clientY });
    }, 480);
  }, []);
  const onPressEnd = useCallback(() => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  }, []);

  // ── Close panels on outside tap ───────────────────────────────────────────
  useEffect(() => {
    if (panel === 'none' && !ctxMenu) return;
    const close = (e: Event) => {
      if ((e.target as HTMLElement).closest('[data-keep]')) return;
      setCtxMenu(null);
      setPanel('none');
    };
    // delay so the triggering tap doesn't immediately close
    const tid = setTimeout(() => {
      document.addEventListener('touchend', close, { passive: true });
      document.addEventListener('mouseup',  close);
    }, 60);
    return () => {
      clearTimeout(tid);
      document.removeEventListener('touchend', close);
      document.removeEventListener('mouseup',  close);
    };
  }, [panel, ctxMenu]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const col     = CC[ch];
  const chInfo  = CHANNELS.find(c => c.id === ch)!;
  const editVal = editing?.text ?? txt;
  const setVal  = (v: string) => {
    if (editing) setEditing(p => p ? { ...p, text: v } : null);
    else         setTxt(v);
  };
  // hasTxt is always live because we read txtRef for non-edit mode
  const hasTxt  = editing ? (editing.text.trim().length > 0) : (txtRef.current.trim().length > 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Global CSS ── */}
      <style>{`
        @keyframes spin  { to { transform:rotate(360deg) } }
        @keyframes fadeIn{ from{opacity:0;transform:scale(.9) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes slideU{ from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes toastA{ 0%{opacity:0;transform:translateX(-50%) translateY(8px)} 15%{opacity:1;transform:translateX(-50%) translateY(0)} 80%{opacity:1} 100%{opacity:0} }
        .hide-scroll::-webkit-scrollbar { display:none }
        .hide-scroll { scrollbar-width:none; -ms-overflow-style:none }
      `}</style>

      {/* Whole-screen layout */}
      <div style={{
        position:'fixed', top:0, left:0, right:0,
        bottom:0,
        background:'hsl(225 30% 3%)',
        display:'flex', flexDirection:'column',
        fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif",
        overflow:'hidden',
        /* Capacitor safe-area */
        paddingBottom:'env(safe-area-inset-bottom, 0px)',
      }}>

        {/* ── Toast ── */}
        {toastMsg && (
          <div style={{ position:'fixed', top:88, left:'50%', zIndex:20000,
            background:'hsl(225 28% 13%)', border:'1px solid hsl(215 30% 22%)',
            color:'hsl(215 18% 90%)', padding:'9px 22px', borderRadius:22,
            fontSize:13, fontWeight:600, pointerEvents:'none',
            animation:'toastA 2s ease forwards',
            boxShadow:'0 8px 32px rgba(0,0,0,.55)' }}>
            {toastMsg}
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────── */}
        {/* Channel drawer — bottom sheet, scrollable, above nav bar         */}
        {/* ────────────────────────────────────────────────────────────────── */}
        {panel === 'channels' && (
          /* Backdrop */
          <div
            data-keep="1"
            onClick={() => setPanel('none')}
            style={{ position:'fixed', inset:0, zIndex:8000,
              background:'rgba(0,0,0,.65)',
              /* Push sheet above bottom nav */
              paddingBottom: 72,
              display:'flex', alignItems:'flex-end' }}
          >
            {/* Sheet */}
            <div
              data-keep="1"
              onClick={e => e.stopPropagation()}
              style={{
                width:'100%',
                /* max-height keeps it from covering too much screen */
                maxHeight:'70vh',
                background:'hsl(225 26% 9%)',
                borderRadius:'24px 24px 0 0',
                border:'1px solid hsl(215 22% 18%)',
                borderBottom:'none',
                display:'flex', flexDirection:'column',
                animation:'slideU .2s ease',
              }}
            >
              {/* Drag handle */}
              <div style={{ width:40, height:4, borderRadius:2,
                background:'hsl(215 22% 24%)', margin:'14px auto 0',
                flexShrink:0 }} />

              <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.15em',
                textTransform:'uppercase', color:'hsl(215 14% 36%)',
                padding:'12px 20px 10px', flexShrink:0 }}>
                Switch Channel
              </p>

              {/* Scrollable list */}
              <div className="hide-scroll" style={{ overflowY:'auto', flex:1,
                paddingBottom:16 }}>
                {CHANNELS.map(c => {
                  const accessible = canPost(c.id);
                  const active     = ch === c.id;
                  return (
                    <button
                      key={c.id}
                      data-keep="1"
                      onPointerDown={() => {
                        if (!accessible) return;
                        setCh(c.id);
                        setPanel('none');
                      }}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:14,
                        padding:'13px 20px', border:'none', outline:'none',
                        background: active ? `${CC[c.id]}12` : 'transparent',
                        cursor: accessible ? 'pointer' : 'not-allowed',
                        opacity: accessible ? 1 : 0.4 }}
                    >
                      <div style={{ width:46, height:46, borderRadius:14, flexShrink:0,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:22,
                        background: active ? `${CC[c.id]}22` : 'hsl(215 22% 12%)',
                        border:`1.5px solid ${active ? `${CC[c.id]}44` : 'hsl(215 22% 18%)'}` }}>
                        {c.icon}
                      </div>
                      <div style={{ flex:1, textAlign:'left' }}>
                        <p style={{ fontSize:14, fontWeight:700, margin:0,
                          color: active ? CC[c.id] : 'hsl(215 18% 82%)' }}>
                          {c.label} {!accessible && '🔒'}
                        </p>
                        <p style={{ fontSize:11, color:'hsl(215 14% 38%)',
                          marginTop:3 }}>{c.desc}</p>
                      </div>
                      {active && (
                        <div style={{ width:8, height:8, borderRadius:'50%',
                          background: CC[c.id], flexShrink:0 }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Context menu ── */}
        {ctxMenu && (
          <div
            data-keep="1"
            onTouchStart={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            style={{ position:'fixed', zIndex:9999,
              top:  Math.min(ctxMenu.y + 10, window.innerHeight - 300),
              left: Math.min(Math.max(ctxMenu.x - 130, 10), window.innerWidth - 255),
              background:'hsl(225 26% 9%)', border:'1px solid hsl(215 22% 18%)',
              borderRadius:20, overflow:'hidden', minWidth:244,
              boxShadow:'0 20px 70px rgba(0,0,0,.85)',
              animation:'fadeIn .14s ease' }}
          >
            {/* Preview */}
            <div style={{ padding:'11px 16px', borderBottom:'1px solid hsl(215 22% 13%)',
              background:'hsl(225 28% 7%)' }}>
              <p style={{ fontSize:11, fontWeight:700, color:col, marginBottom:3 }}>
                {ctxMenu.msg.username || 'Miner'}
              </p>
              {ctxMenu.msg.msg_type === 'sticker'
                ? <p style={{ fontSize:12, color:'hsl(215 18% 48%)' }}>🐉 Sticker</p>
                : ctxMenu.msg.msg_type === 'image'
                ? <p style={{ fontSize:12, color:'hsl(215 18% 48%)' }}>📷 Image</p>
                : <p style={{ fontSize:12, color:'hsl(215 18% 58%)', lineHeight:1.4,
                    overflow:'hidden', display:'-webkit-box',
                    WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                    {ctxMenu.msg.message}
                  </p>
              }
            </div>
            <CMBtn icon={<CornerUpLeft size={15} color="hsl(215 35% 62%)" />}
              label="Reply" onTap={() => doReply(ctxMenu.msg)} />
            {(!ctxMenu.msg.msg_type || ctxMenu.msg.msg_type === 'text') && (
              <CMBtn icon={<Copy size={15} color="hsl(215 25% 52%)" />}
                label="Copy text" onTap={() => doCopy(ctxMenu.msg)}
                border={isOwn(ctxMenu.msg)} />
            )}
            {isOwn(ctxMenu.msg) && (
              <>
                {(!ctxMenu.msg.msg_type || ctxMenu.msg.msg_type === 'text') && (
                  <CMBtn icon={<Pencil size={15} color={col} />}
                    label="Edit" onTap={() => doEdit(ctxMenu.msg)} />
                )}
                <CMBtn icon={<Trash2 size={15} color="hsl(0 60% 55%)" />}
                  label="Delete" onTap={() => doDelete(ctxMenu.msg)}
                  danger border={false} />
              </>
            )}
          </div>
        )}

        {/* ── Header ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'52px 18px 10px', flexShrink:0 }}>
          <button onPointerDown={e => { e.stopPropagation(); navigate('/'); }}
            style={navBtn}>
            <ChevronLeft size={20} color="hsl(215 25% 55%)" />
          </button>
          <div style={{ textAlign:'center' }}>
            <h1 style={{ fontSize:18, fontWeight:700, color:'hsl(215 20% 93%)', margin:0 }}>Community</h1>
            <p style={{ fontSize:11, color:col, marginTop:2, fontWeight:600 }}>
              {chInfo.icon} {chInfo.label}
            </p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {/* Refresh */}
            <button onPointerDown={() => setRefresh(k => k + 1)} style={navBtn}>
              <RefreshCw size={15} color="hsl(215 25% 50%)"
                style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            {/* Hamburger — channel switcher */}
            <button
              data-keep="1"
              onPointerDown={e => { e.stopPropagation(); setPanel(p => p === 'channels' ? 'none' : 'channels'); }}
              style={{ ...navBtn,
                background: panel === 'channels' ? `${col}1a` : 'hsl(215 25% 10%)',
                border:`1px solid ${panel === 'channels' ? `${col}44` : 'hsl(215 22% 17%)'}` }}>
              <Menu size={18} color={panel === 'channels' ? col : 'hsl(215 25% 55%)'} />
            </button>
          </div>
        </div>

        <p style={{ fontSize:10, color:'hsl(215 14% 28%)', padding:'0 18px 6px', flexShrink:0 }}>
          {chInfo.desc} · Hold to reply / edit / delete
        </p>

        {/* DB error */}
        {dbError && (
          <div style={{ margin:'6px 18px', padding:'11px 14px', borderRadius:14, flexShrink:0,
            background:'hsl(38 55% 52%/0.07)', border:'1px solid hsl(38 55% 52%/0.22)' }}>
            <p style={{ fontSize:12, fontWeight:700, color:'hsl(38 55% 58%)' }}>
              ⚙️ Chat table missing — run Supabase migration
            </p>
          </div>
        )}

        {/* ── Messages ── */}
        <div className="hide-scroll" style={{ flex:1, overflowY:'auto',
          padding:'4px 18px 8px', minHeight:0 }}>

          {loading && (
            <div style={{ display:'flex', justifyContent:'center', paddingTop:48 }}>
              <div style={{ width:28, height:28, borderRadius:'50%',
                border:`2px solid ${col}22`, borderTopColor:col,
                animation:'spin 1s linear infinite' }} />
            </div>
          )}

          {!loading && msgs.length === 0 && !dbError && (
            <div style={{ textAlign:'center', paddingTop:56 }}>
              <div style={{ fontSize:38, marginBottom:10 }}>{chInfo.icon}</div>
              <p style={{ fontSize:14, fontWeight:700, color:'hsl(215 18% 40%)' }}>No messages yet</p>
              <p style={{ fontSize:11, color:'hsl(215 14% 28%)', marginTop:4 }}>
                Be first to say something!
              </p>
            </div>
          )}

          {msgs.map((m, i) => {
            const me      = isOwn(m);
            const showHdr = i === 0 || msgs[i-1].user_id !== m.user_id;
            const dying   = deletingId === m.id;
            const isStick = m.msg_type === 'sticker';
            const isImg   = m.msg_type === 'image';

            return (
              <div key={m.id}
                onMouseDown={e => { e.stopPropagation(); onPressStart(e, m); }}
                onMouseUp={onPressEnd} onMouseLeave={onPressEnd}
                onTouchStart={e => { e.stopPropagation(); onPressStart(e, m); }}
                onTouchEnd={onPressEnd} onTouchCancel={onPressEnd} onTouchMove={onPressEnd}
                style={{ marginBottom: showHdr ? 10 : 3,
                  display:'flex', flexDirection: me ? 'row-reverse' : 'row',
                  alignItems:'flex-end', gap:7,
                  WebkitUserSelect:'none', userSelect:'none', WebkitTouchCallout:'none',
                  opacity: dying ? .3 : 1, transition:'opacity .18s' }}>

                {!me && showHdr && <Av url={m.avatar_url} name={m.username} col={col} sz={28} />}
                {!me && !showHdr && <div style={{ width:28, flexShrink:0 }} />}

                <div style={{ maxWidth: isStick ? '52%' : '76%' }}>
                  {showHdr && !me && (
                    <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:col }}>{m.username || 'Miner'}</span>
                      <span style={{ fontSize:9, color:'hsl(215 14% 28%)' }}>{fmtTime(m.created_at)}</span>
                    </div>
                  )}

                  {/* Reply quote */}
                  {m.reply_to_id && m.reply_to_message && (
                    <div style={{ marginBottom:2, padding:'6px 10px',
                      borderRadius:'11px 11px 0 0',
                      background:'hsl(215 22% 10%)', borderLeft:`3px solid ${col}` }}>
                      <p style={{ fontSize:10, fontWeight:700, color:col, marginBottom:1 }}>
                        {m.reply_to_username || 'Miner'}
                      </p>
                      <p style={{ fontSize:11, color:'hsl(215 14% 46%)',
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:190 }}>
                        {m.reply_to_message}
                      </p>
                    </div>
                  )}

                  {/* Sticker */}
                  {isStick && m.image_url
                    ? <img src={m.image_url} alt="sticker"
                        style={{ width:120, height:120, objectFit:'contain', display:'block',
                          filter:'drop-shadow(0 3px 12px rgba(0,0,0,.4))', borderRadius:8 }}
                        onError={e => { (e.target as HTMLImageElement).style.opacity='.25'; }} />

                  /* Image */
                  : isImg && m.image_url
                    ? <div style={{ borderRadius: me ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        overflow:'hidden', border:`1px solid ${col}25`, maxWidth:220 }}>
                        <img src={m.image_url} alt="img"
                          style={{ width:'100%', maxHeight:260, objectFit:'cover', display:'block' }} />
                      </div>

                  /* Text bubble */
                  : <div style={{ padding:'9px 13px',
                      borderRadius: m.reply_to_id
                        ? (me ? '0 14px 4px 14px' : '14px 0 14px 4px')
                        : (me ? '16px 16px 4px 16px' : '16px 16px 16px 4px'),
                      background: me
                        ? `linear-gradient(135deg,${col}1e,${col}0c)`
                        : 'hsl(225 24% 9%)',
                      border:`1px solid ${me ? `${col}25` : 'hsl(215 22% 13%)'}`,
                      wordBreak:'break-word' }}>
                      <p style={{ fontSize:13, color:'hsl(215 18% 88%)',
                        lineHeight:1.5, margin:0 }}>{m.message}</p>
                    </div>
                  }

                  {me && (
                    <p style={{ fontSize:9, color:'hsl(215 14% 24%)',
                      marginTop:2, textAlign:'right' }}>
                      {fmtTime(m.created_at)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={botRef} />
        </div>

        {/* ── Sticker tray ── */}
        {panel === 'stickers' && (
          <div data-keep="1" style={{ margin:'0 14px 6px', padding:'12px',
            borderRadius:18, background:'hsl(225 26% 7%)',
            border:`1px solid ${col}28`, flexShrink:0,
            animation:'slideU .18s ease' }}>
            <p style={{ fontSize:9, fontWeight:700, color:col, marginBottom:9,
              textTransform:'uppercase', letterSpacing:'0.14em' }}>
              Arxon Stickers
            </p>
            <div className="hide-scroll" style={{ display:'flex', gap:9, overflowX:'auto' }}>
              {STICKERS.map(s => {
                const url = stickerUrl(s.file);
                return (
                  <button key={s.id} data-keep="1"
                    onPointerDown={e => { e.preventDefault(); e.stopPropagation(); sendSticker(url); }}
                    style={{ flexShrink:0, width:76, height:76, borderRadius:14,
                      border:'1px solid hsl(215 22% 15%)', background:'hsl(215 22% 9%)',
                      cursor:'pointer', padding:5, outline:'none',
                      display:'flex', flexDirection:'column',
                      alignItems:'center', justifyContent:'center', gap:3 }}>
                    <img src={url} alt={s.label}
                      style={{ width:50, height:50, objectFit:'contain' }}
                      onError={e => {
                        const img = e.target as HTMLImageElement;
                        if (!img.dataset.tried) { img.dataset.tried='1'; img.src=`/${s.file}`; }
                      }} />
                    <span style={{ fontSize:8, color:'hsl(215 14% 38%)', fontWeight:600 }}>
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Emoji tray ── */}
        {panel === 'emoji' && (
          <div data-keep="1" className="hide-scroll"
            style={{ margin:'0 14px 6px', padding:'12px', borderRadius:18,
              background:'hsl(225 26% 7%)', border:`1px solid ${col}28`,
              flexShrink:0, animation:'slideU .18s ease',
              maxHeight:180, overflowY:'auto' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(10,1fr)', gap:1 }}>
              {EMOJIS.map(em => (
                <button key={em} data-keep="1"
                  onPointerDown={e => { e.preventDefault(); e.stopPropagation(); addEmoji(em); }}
                  style={{ fontSize:22, padding:4, borderRadius:8,
                    border:'none', background:'transparent',
                    cursor:'pointer', outline:'none', lineHeight:1 }}>
                  {em}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Edit banner ── */}
        {editing && (
          <div style={{ margin:'0 14px 5px', padding:'9px 11px', borderRadius:12,
            background:`${col}10`, border:`1px solid ${col}30`,
            flexShrink:0, display:'flex', alignItems:'center', gap:9 }}>
            <Pencil size={13} color={col} style={{ flexShrink:0 }} />
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:10, fontWeight:700, color:col, marginBottom:1 }}>Editing</p>
              <p style={{ fontSize:11, color:'hsl(215 14% 40%)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {editing.text}
              </p>
            </div>
            <button onPointerDown={() => { setEditing(null); setTxt(''); }} style={iconBtn}>
              <X size={12} color="hsl(215 18% 42%)" />
            </button>
          </div>
        )}

        {/* ── Reply banner ── */}
        {rep && !editing && (
          <div style={{ margin:'0 14px 5px', padding:'9px 11px', borderRadius:12,
            background:'hsl(215 22% 8%)', border:`1px solid ${col}30`,
            flexShrink:0, display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:3, alignSelf:'stretch', minHeight:28,
              borderRadius:2, background:col, flexShrink:0 }} />
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:10, fontWeight:700, color:col, marginBottom:1 }}>
                ↩ {rep.username || 'Miner'}
              </p>
              <p style={{ fontSize:11, color:'hsl(215 14% 40%)',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {rep.message}
              </p>
            </div>
            <button onPointerDown={() => setRep(null)} style={iconBtn}>
              <X size={12} color="hsl(215 18% 42%)" />
            </button>
          </div>
        )}

        {/* ── Input bar ── */}
        <div style={{ padding:'4px 14px 10px', flexShrink:0 }}>
          {!user ? (
            <button onPointerDown={() => navigate('/auth')}
              style={{ width:'100%', padding:'15px', borderRadius:18,
                fontWeight:700, fontSize:14, cursor:'pointer',
                background:'linear-gradient(135deg,hsl(215 35% 52%),hsl(215 40% 40%))',
                border:'none', color:'white', outline:'none' }}>
              Sign in to chat
            </button>

          ) : !canPost(ch) ? (
            <div style={{ padding:'13px', borderRadius:16, textAlign:'center',
              background:'hsl(215 22% 8%)', border:'1px solid hsl(215 20% 13%)' }}>
              <p style={{ fontSize:12, color:'hsl(215 18% 35%)' }}>
                🔒 Join {ch === 'alpha' ? 'Alpha' : 'Omega'} team to chat here
              </p>
            </div>

          ) : (
            <div style={{ display:'flex', alignItems:'flex-end', gap:7,
              background:'hsl(225 26% 7%)',
              border:`1.5px solid ${col}30`,
              borderRadius:22, padding:'7px 7px 7px 11px' }}>

              {/* Image */}
              {!editing && (
                <label htmlFor={fileId.current}
                  style={{ width:33, height:33, borderRadius:10, flexShrink:0,
                    background: uploading ? `${col}20` : 'hsl(215 22% 12%)',
                    border:'1px solid hsl(215 22% 17%)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor:'pointer' }}>
                  {uploading
                    ? <div style={{ width:13, height:13, borderRadius:'50%',
                        border:`2px solid ${col}25`, borderTopColor:col,
                        animation:'spin .8s linear infinite' }} />
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                        stroke="hsl(215 25% 48%)" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                      </svg>
                  }
                  <input id={fileId.current} type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    style={{ display:'none' }}
                    onChange={pickImage} />
                </label>
              )}

              {/* Sticker */}
              {!editing && (
                <button data-keep="1"
                  onPointerDown={e => { e.preventDefault(); e.stopPropagation();
                    setPanel(p => p === 'stickers' ? 'none' : 'stickers'); }}
                  style={{ width:33, height:33, borderRadius:10, flexShrink:0,
                    background: panel==='stickers' ? `${col}20` : 'hsl(215 22% 12%)',
                    border:`1px solid ${panel==='stickers' ? `${col}38` : 'hsl(215 22% 17%)'}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor:'pointer', outline:'none' }}>
                  <span style={{ fontSize:16, lineHeight:1 }}>🐉</span>
                </button>
              )}

              {/* Emoji */}
              {!editing && (
                <button data-keep="1"
                  onPointerDown={e => { e.preventDefault(); e.stopPropagation();
                    setPanel(p => p === 'emoji' ? 'none' : 'emoji'); }}
                  style={{ width:33, height:33, borderRadius:10, flexShrink:0,
                    background: panel==='emoji' ? `${col}20` : 'hsl(215 22% 12%)',
                    border:`1px solid ${panel==='emoji' ? `${col}38` : 'hsl(215 22% 17%)'}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor:'pointer', outline:'none' }}>
                  <Smile size={14} color={panel==='emoji' ? col : 'hsl(215 25% 48%)'} />
                </button>
              )}

              {/* Textarea */}
              <textarea
                ref={inpRef}
                value={editVal}
                onChange={e => setVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    editing ? saveEdit() : sendText();
                  }
                  if (e.key === 'Escape') {
                    if (editing) { setEditing(null); setTxt(''); }
                    else if (rep) setRep(null);
                  }
                }}
                placeholder={
                  editing      ? 'Edit message…'                   :
                  rep          ? `Reply to ${rep.username ?? 'them'}…` :
                                 'Type a message…'
                }
                rows={1}
                style={{ flex:1, background:'none', border:'none', outline:'none',
                  fontSize:14, color:'hsl(215 18% 88%)', resize:'none',
                  fontFamily:"'Creato Display',-apple-system,sans-serif",
                  lineHeight:'1.5', maxHeight:80, overflow:'auto',
                  paddingTop:7, paddingBottom:7 }}
              />

              {/* Send / Confirm */}
              <button
                onPointerDown={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  editing ? saveEdit() : sendText();
                }}
                style={{ width:36, height:36, borderRadius:12, flexShrink:0,
                  outline:'none', cursor:'pointer', transition:'all .18s',
                  background: hasTxt ? `${col}22` : 'hsl(215 22% 10%)',
                  border:`1px solid ${hasTxt ? `${col}45` : 'hsl(215 22% 15%)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                {editing
                  ? <Check size={15} color={hasTxt ? col : 'hsl(215 18% 30%)'} />
                  : <Send  size={14} color={hasTxt ? col : 'hsl(215 18% 30%)'} />
                }
              </button>
            </div>
          )}
        </div>

      </div>{/* end layout */}
    </>
  );
}

// ── Shared button styles ───────────────────────────────────────────────────────
const navBtn: React.CSSProperties = {
  width:38, height:38, borderRadius:13,
  background:'hsl(215 25% 10%)', border:'1px solid hsl(215 22% 16%)',
  display:'flex', alignItems:'center', justifyContent:'center',
  cursor:'pointer', outline:'none', flexShrink:0,
};
const iconBtn: React.CSSProperties = {
  width:26, height:26, borderRadius:8,
  background:'hsl(215 22% 12%)', border:'none',
  cursor:'pointer', outline:'none', flexShrink:0,
  display:'flex', alignItems:'center', justifyContent:'center',
};
