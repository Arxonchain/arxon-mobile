import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useArenaMembership } from '@/hooks/useArenaMembership';
import { supabase } from '@/integrations/supabase/client';
import {
  ChevronLeft, Send, RefreshCw, X, CornerUpLeft,
  Copy, Trash2, Pencil, Check, ImagePlus, Smile
} from 'lucide-react';

type Channel = 'general' | 'alpha' | 'omega' | 'nexus_exchange';
type MsgType = 'text' | 'image' | 'sticker';

interface Msg {
  id: string;
  channel: Channel;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  message: string;
  msg_type?: MsgType;
  image_url?: string | null;
  created_at: string;
  reply_to_id?: string | null;
  reply_to_username?: string | null;
  reply_to_message?: string | null;
}

// FIXED: Sticker paths with correct underscore format
const STICKERS = [
  { id: 's1', url: '/sticker_1.png', label: 'Welcome' },
  { id: 's2', url: '/sticker_2.png', label: 'Rich' },
  { id: 's3', url: '/sticker_3.png', label: 'Verified' },
  { id: 's4', url: '/sticker_4.png', label: 'Wen?' },
  { id: 's5', url: '/sticker_5.png', label: 'LOL' },
];

const CHANNELS = [
  { id: 'general' as Channel,        label: 'General',        icon: '🌐', desc: 'Everyone can chat here',   lock: null },
  { id: 'alpha' as Channel,          label: 'Alpha Team',     icon: '⬡',  desc: 'Alpha members only',       lock: 'alpha' },
  { id: 'omega' as Channel,          label: 'Omega Team',     icon: '⬡',  desc: 'Omega members only',       lock: 'omega' },
  { id: 'nexus_exchange' as Channel, label: 'Nexus Exchange', icon: '📡', desc: 'Share Nexus UIDs & ARX-P', lock: null },
];

const CC: Record<Channel, string> = {
  general:        'hsl(215 35% 62%)',
  alpha:          'hsl(195 80% 50%)',
  omega:          'hsl(255 60% 65%)',
  nexus_exchange: 'hsl(155 45% 50%)',
};

const fmtTime = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

function Av({ url, name, col, sz = 30 }: { url: string | null; name: string | null; col: string; sz?: number }) {
  const [err, setErr] = useState(false);
  if (url && !err) return (
    <div style={{ width: sz, height: sz, borderRadius: sz * 0.35, overflow: 'hidden', flexShrink: 0, border: `1.5px solid ${col}30` }}>
      <img src={url} alt="" onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
  return (
    <div style={{
      width: sz, height: sz, borderRadius: sz * 0.35, flexShrink: 0,
      fontSize: sz * 0.42, fontWeight: 700,
      background: `${col}18`, border: `1.5px solid ${col}30`, color: col,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) { }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_) { return false; }
}

type MenuState = { msg: Msg; x: number; y: number } | null;
type EditState = { id: string; text: string } | null;

export default function MobileChat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { membership } = useArenaMembership();

  const [ch, setCh] = useState<Channel>('general');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [txt, setTxt] = useState('');
  const [busy, setBusy] = useState(false);
  const [load, setLoad] = useState(true);
  const [ok, setOk] = useState<boolean | null>(null);
  const [key, setKey] = useState(0);
  const [rep, setRep] = useState<Msg | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [editing, setEditing] = useState<EditState>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const botRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const inpRef = useRef<HTMLTextAreaElement>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uname = profile?.username || user?.email?.split('@')[0] || 'Miner';
  const [myUserId, setMyUserId] = useState<string | null>(null);
  useEffect(() => { if (user?.id) setMyUserId(user.id); }, [user?.id]);
  const uid = myUserId || user?.id || null;

  const canPost = (c: Channel) =>
    c === 'alpha' ? membership?.club === 'alpha' :
    c === 'omega' ? membership?.club === 'omega' : true;

  const loadMsgs = useCallback(async (c: Channel) => {
    setLoad(true);
    const { data, error } = await supabase
      .from('chat_messages').select('*')
      .eq('channel', c).order('created_at', { ascending: true }).limit(100);
    if (error) { setOk(error.code === '42P01' ? false : null); setMsgs([]); }
    else { setOk(true); setMsgs((data || []) as Msg[]); }
    setLoad(false);
  }, []);

  useEffect(() => { loadMsgs(ch); }, [ch, loadMsgs, key]);

  useEffect(() => {
    if (ok !== true) return;
    if (subRef.current) { supabase.removeChannel(subRef.current); subRef.current = null; }
    const s = supabase.channel(`chat-${ch}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel=eq.${ch}` }, (p) => {
        const m = p.new as Msg;
        setMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `channel=eq.${ch}` }, (p) => {
        const m = p.new as Msg;
        setMsgs(prev => prev.map(x => x.id === m.id ? { ...x, message: m.message } : x));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, (p) => {
        const id = (p.old as Msg).id;
        setMsgs(prev => prev.filter(x => x.id !== id));
      })
      .subscribe();
    subRef.current = s;
    return () => { supabase.removeChannel(s); subRef.current = null; };
  }, [ch, ok]);

  useEffect(() => { botRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  useEffect(() => {
    if (!menu && !showStickers) return;
    const close = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-menu]') || target.closest('[data-stickers]')) return;
      setMenu(null);
      setShowStickers(false);
    };
    document.addEventListener('touchstart', close, { passive: true });
    document.addEventListener('mousedown', close);
    return () => {
      document.removeEventListener('touchstart', close);
      document.removeEventListener('mousedown', close);
    };
  }, [menu, showStickers]);

  // FIXED #6: Send with proper reply reset
  const send = async () => {
    if (!user || !txt.trim() || busy || !canPost(ch)) return;
    const t = txt.trim();
    setTxt('');
    setBusy(true);
    const payload: Record<string, unknown> = {
      channel: ch, user_id: user.id, username: uname,
      avatar_url: profile?.avatar_url || null,
      message: t, msg_type: 'text',
    };
    if (rep) {
      payload.reply_to_id = rep.id;
      payload.reply_to_username = rep.username || 'Miner';
      payload.reply_to_message = rep.message.slice(0, 80);
    }
    const { error } = await supabase.from('chat_messages').insert(payload);
    if (error) { if (error.code === '42P01') setOk(false); else setTxt(t); }
    else setRep(null);
    setBusy(false);
  };

  // FIXED #3: Send sticker with error handling
  const sendSticker = async (stickerUrl: string) => {
    if (!user || !canPost(ch)) return;
    setShowStickers(false);
    setBusy(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        channel: ch, user_id: user.id, username: uname,
        avatar_url: profile?.avatar_url || null,
        message: '🐉', msg_type: 'sticker', image_url: stickerUrl,
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Sticker send failed:', err);
    } finally {
      setBusy(false);
    }
  };

  // FIXED #4: Upload with error handling
  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 8 * 1024 * 1024) { alert('Image must be under 8MB'); return; }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `chat/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('chat-images')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(path);
      const imageUrl = urlData.publicUrl;

      const { error: msgErr } = await supabase.from('chat_messages').insert({
        channel: ch, user_id: user.id, username: uname,
        avatar_url: profile?.avatar_url || null,
        message: '📷 Image', msg_type: 'image', image_url: imageUrl,
      });
      if (msgErr) throw msgErr;
    } catch (err: any) {
      if (err?.message?.includes('Bucket not found') || err?.error === 'Bucket not found') {
        alert('Image sharing requires a "chat-images" storage bucket in Supabase.');
      } else {
        alert('Failed to upload image. Please try again.');
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  // FIXED #5: Edit with proper error handling
  const saveEdit = async () => {
    if (!editing || !editing.text.trim() || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ message: editing.text.trim() })
        .eq('id', editing.id)
        .eq('user_id', uid || '');
      if (!error) {
        setMsgs(p => p.map(m => m.id === editing.id ? { ...m, message: editing.text.trim() } : m));
        setEditing(null);
        setTxt('');
      }
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setTxt('');
    setTimeout(() => inpRef.current?.focus(), 80);
  };

  // FIXED #5: Delete with immediate removal
  const doDelete = async (m: Msg) => {
    setMenu(null);
    setDeleting(m.id);
    try {
      const { error } = await supabase
        .from('chat_messages').delete()
        .eq('id', m.id).eq('user_id', uid || '');
      if (!error) {
        setMsgs(p => p.filter(x => x.id !== m.id));
      }
    } finally {
      setDeleting(null);
    }
  };

  const doReply = (m: Msg) => {
    setRep(m); setMenu(null); setEditing(null); setTxt('');
    setTimeout(() => inpRef.current?.focus(), 120);
  };

  const doCopy = async (m: Msg) => {
    const ok2 = await copyToClipboard(m.message);
    setMenu(null);
    if (ok2) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1800);
    }
  };

  const doEdit = (m: Msg) => {
    setMenu(null); setRep(null);
    setEditing({ id: m.id, text: m.message });
    setTimeout(() => inpRef.current?.focus(), 120);
  };

  const startPress = (e: React.TouchEvent | React.MouseEvent, m: Msg) => {
    const touch = 'touches' in e ? e.touches[0] : (e as unknown as MouseEvent);
    pressTimer.current = setTimeout(() => {
      setShowStickers(false);
      setMenu({ msg: m, x: touch.clientX, y: touch.clientY });
    }, 420);
  };
  const endPress = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  };

  const col = CC[ch];
  const inputValue = editing ? editing.text : txt;
  const setInputValue = (v: string) => editing ? setEditing({ ...editing, text: v }) : setTxt(v);
  const canSend = editing
    ? editing.text.trim().length > 0 && !saving
    : txt.trim().length > 0 && !busy;

  const isOwnMsg = (m: Msg) => !!uid && m.user_id === uid;

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(225 30% 3%)', display: 'flex', flexDirection: 'column', fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif", paddingBottom: 90 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:scale(0.92) translateY(6px) } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes slideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      {copyFeedback && (
        <div style={{ position: 'fixed', top: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 10000, background: 'hsl(155 45% 35%)', color: 'white', padding: '8px 20px', borderRadius: 20, fontSize: 13, fontWeight: 600, animation: 'slideUp 0.2s ease', pointerEvents: 'none' }}>
          ✓ Copied
        </div>
      )}

      {menu && (
        <div data-menu="1" style={{ position: 'fixed', zIndex: 9999, top: Math.min(menu.y + 8, window.innerHeight - 280), left: Math.min(Math.max(menu.x - 120, 10), window.innerWidth - 245), background: 'hsl(225 26% 9%)', border: '1px solid hsl(215 22% 18%)', borderRadius: 20, overflow: 'hidden', minWidth: 235, boxShadow: '0 16px 60px rgba(0,0,0,0.75)' }} onTouchStart={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid hsl(215 22% 13%)', background: 'hsl(225 28% 7%)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: col, marginBottom: 4 }}>{menu.msg.username || 'Miner'}</p>
            {menu.msg.msg_type === 'sticker' || menu.msg.msg_type === 'image' ? (
              <p style={{ fontSize: 12, color: 'hsl(215 18% 50%)' }}>{menu.msg.msg_type === 'sticker' ? '🐉 Sticker' : '📷 Image'}</p>
            ) : (
              <p style={{ fontSize: 12, color: 'hsl(215 18% 60%)', lineHeight: 1.4 }}>
                {menu.msg.message}
              </p>
            )}
          </div>

          <button onPointerDown={e => { e.stopPropagation(); doReply(menu.msg); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', outline: 'none', borderBottom: '1px solid hsl(215 22% 12%)' }}>
            <CornerUpLeft size={16} color="hsl(215 35% 62%)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'hsl(215 18% 86%)' }}>Reply</span>
          </button>

          {(!menu.msg.msg_type || menu.msg.msg_type === 'text') && (
            <button onPointerDown={e => { e.stopPropagation(); doCopy(menu.msg); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', outline: 'none', borderBottom: isOwnMsg(menu.msg) ? '1px solid hsl(215 22% 12%)' : 'none' }}>
              <Copy size={16} color="hsl(215 25% 50%)" />
              <span style={{ fontSize: 14, fontWeight: 600, color: 'hsl(215 18% 86%)' }}>Copy text</span>
            </button>
          )}

          {isOwnMsg(menu.msg) && (
            <>
              {(!menu.msg.msg_type || menu.msg.msg_type === 'text') && (
                <button onPointerDown={e => { e.stopPropagation(); doEdit(menu.msg); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', outline: 'none', borderBottom: '1px solid hsl(215 22% 12%)' }}>
                  <Pencil size={16} color={col} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'hsl(215 18% 86%)' }}>Edit message</span>
                </button>
              )}
              <button onPointerDown={e => { e.stopPropagation(); doDelete(menu.msg); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', outline: 'none' }}>
                <Trash2 size={16} color="hsl(0 60% 56%)" />
                <span style={{ fontSize: 14, fontWeight: 600, color: 'hsl(0 60% 62%)' }}>Delete message</span>
              </button>
            </>
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '52px 20px 0', flexShrink: 0 }}>
        <button onClick={() => navigate('/')} style={{ width: 40, height: 40, borderRadius: 14, background: 'hsl(215 25% 10%)', border: '1px solid hsl(215 22% 17%)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none' }}>
          <ChevronLeft size={20} color="hsl(215 25% 55%)" />
        </button>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'hsl(215 20% 93%)' }}>Community</h1>
          <p style={{ fontSize: 11, color: col, marginTop: 1, fontWeight: 600 }}>
            {CHANNELS.find(c => c.id === ch)?.icon} {CHANNELS.find(c => c.id === ch)?.label}
          </p>
        </div>
        <button onClick={() => setKey(k => k + 1)} style={{ width: 40, height: 40, borderRadius: 14, background: 'hsl(215 25% 10%)', border: '1px solid hsl(215 22% 17%)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none' }}>
          <RefreshCw size={15} color="hsl(215 25% 55%)" style={{ animation: load ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '14px 20px 0', overflowX: 'auto', flexShrink: 0 }}>
        {CHANNELS.map(c => {
          const ac = canPost(c.id); const ia = ch === c.id;
          return (
            <button key={c.id} onClick={() => ac && setCh(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 22, fontSize: 12, fontWeight: 700, border: 'none', cursor: ac ? 'pointer' : 'not-allowed', outline: 'none', flexShrink: 0, background: ia ? `${CC[c.id]}22` : 'hsl(215 22% 10%)', color: ia ? CC[c.id] : ac ? 'hsl(215 18% 48%)' : 'hsl(215 14% 28%)', opacity: ac ? 1 : 0.45 }}>
              <span>{c.icon}</span>
              {c.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding: '7px 20px 0', flexShrink: 0 }}>
        <p style={{ fontSize: 11, color: 'hsl(215 14% 33%)' }}>
          {CHANNELS.find(c => c.id === ch)?.desc}
          {ch === 'alpha' && membership?.club === 'alpha' && ' · Welcome, Alpha!'}
          {ch === 'omega' && membership?.club === 'omega' && ' · Welcome, Omega!'}
          {' '}· <span style={{ color: 'hsl(215 14% 26%)' }}>Hold to reply / edit / delete</span>
        </p>
      </div>

      {ok === false && (
        <div style={{ margin: '10px 20px', padding: '13px 15px', borderRadius: 16, background: 'hsl(38 55% 52% / 0.08)', border: '1px solid hsl(38 55% 52% / 0.22)', flexShrink: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'hsl(38 55% 58%)', marginBottom: 3 }}>⚙️ Chat Setup Required</p>
          <p style={{ fontSize: 11, color: 'hsl(38 55% 52% / 0.7)', lineHeight: 1.5 }}>Run the SQL migration in Supabase to enable chat.</p>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 0', minHeight: 0 }}>
        {load && ok === null && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid hsl(215 35% 62% / 0.2)', borderTopColor: col, animation: 'spin 1s linear infinite' }} />
          </div>
        )}

        {!load && ok === true && msgs.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>{CHANNELS.find(c => c.id === ch)?.icon}</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'hsl(215 18% 50%)', marginBottom: 6 }}>No messages yet</p>
            <p style={{ fontSize: 12, color: 'hsl(215 14% 32%)' }}>Be the first to say something!</p>
          </div>
        )}

        {ok === true && msgs.map((m, i) => {
          const me = isOwnMsg(m);
          const showHeader = i === 0 || msgs[i - 1].user_id !== m.user_id;
          const isBeingDeleted = deleting === m.id;
          const isBeingEdited = editing?.id === m.id;
          const isSticker = m.msg_type === 'sticker';
          const isImage = m.msg_type === 'image';

          return (
            <div key={m.id} onMouseDown={e => startPress(e, m)} onMouseUp={endPress} onMouseLeave={endPress} onTouchStart={e => startPress(e, m)} onTouchEnd={endPress} onTouchCancel={endPress} onTouchMove={endPress} style={{ marginBottom: showHeader ? 12 : 4, display: 'flex', flexDirection: me ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none', opacity: isBeingDeleted ? 0.35 : 1, transition: 'opacity 0.2s' }}>
              {!me && showHeader && <Av url={m.avatar_url} name={m.username} col={col} sz={30} />}
              {!me && !showHeader && <div style={{ width: 30, flexShrink: 0 }} />}

              <div style={{ maxWidth: isSticker ? '55%' : '76%' }}>
                {showHeader && !me && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{m.username || 'Miner'}</span>
                    <span style={{ fontSize: 9, color: 'hsl(215 14% 30%)' }}>{fmtTime(m.created_at)}</span>
                  </div>
                )}

                {m.reply_to_id && m.reply_to_message && (
                  <div style={{ marginBottom: 2, padding: '7px 11px', borderRadius: '12px 12px 0 0', background: 'hsl(215 22% 10%)', borderLeft: `3px solid ${col}` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: col, marginBottom: 2 }}>{m.reply_to_username || 'Miner'}</p>
                    <p style={{ fontSize: 11, color: 'hsl(215 14% 48%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                      {m.reply_to_message}
                    </p>
                  </div>
                )}

                {isSticker && m.image_url ? (
                  <div style={{ padding: 4, background: 'transparent' }}>
                    <img src={m.image_url} alt="sticker" style={{ width: 130, height: 130, objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.4))' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} loading="lazy" />
                  </div>
                ) : isImage && m.image_url ? (
                  <div style={{ borderRadius: me ? '18px 18px 4px 18px' : '18px 18px 18px 4px', overflow: 'hidden', border: `1px solid ${me ? `${col}28` : 'hsl(215 22% 14%)'}`, maxWidth: 220 }}>
                    <img src={m.image_url} alt="image" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }} onError={e => { (e.target as HTMLImageElement).alt = '⚠️ Image failed to load'; }} loading="lazy" />
                  </div>
                ) : (
                  <div style={{ padding: '10px 14px', borderRadius: m.reply_to_id ? (me ? '0 16px 4px 16px' : '16px 0 16px 4px') : (me ? '18px 18px 4px 18px' : '18px 18px 18px 4px'), background: me ? `linear-gradient(135deg, ${col}20, ${col}0d)` : 'hsl(225 24% 9%)', border: `1px solid ${me ? `${col}28` : 'hsl(215 22% 14%)'}`, wordBreak: 'break-word', outline: isBeingEdited ? `1.5px solid ${col}60` : 'none' }}>
                    <p style={{ fontSize: 13, color: 'hsl(215 18% 88%)', lineHeight: 1.55, margin: 0 }}>{m.message}</p>
                  </div>
                )}

                {me && (
                  <p style={{ fontSize: 9, color: 'hsl(215 14% 26%)', marginTop: 3, textAlign: 'right' }}>{fmtTime(m.created_at)}</p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={botRef} />
      </div>

      {showStickers && (
        <div data-stickers="1" style={{ margin: '0 20px 8px', padding: '14px 12px', borderRadius: 20, background: 'hsl(225 26% 8%)', border: `1px solid ${col}30`, flexShrink: 0, animation: 'slideUp 0.2s ease' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: col, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Arxon Stickers</p>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto' }} className="scrollbar-none">
            {STICKERS.map(s => (
              <button key={s.id} onPointerDown={e => { e.stopPropagation(); sendSticker(s.url); }} style={{ flexShrink: 0, width: 80, height: 80, borderRadius: 16, border: '1px solid hsl(215 22% 16%)', background: 'hsl(215 22% 10%)', cursor: 'pointer', padding: 6, outline: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all 0.15s' }}>
                <img src={s.url} alt={s.label} style={{ width: 54, height: 54, objectFit: 'contain' }} loading="lazy" />
                <span style={{ fontSize: 9, color: 'hsl(215 14% 42%)', fontWeight: 600 }}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <div style={{ margin: '0 20px 6px', padding: '10px 12px', borderRadius: 14, background: `${col}12`, border: `1px solid ${col}35`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Pencil size={14} color={col} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: col, marginBottom: 1 }}>Editing message</p>
            <p style={{ fontSize: 11, color: 'hsl(215 14% 42%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {editing.text}
            </p>
          </div>
          <button onPointerDown={cancelEdit} style={{ padding: 5, borderRadius: 8, background: 'hsl(215 22% 13%)', border: 'none', cursor: 'pointer', outline: 'none', flexShrink: 0 }}>
            <X size={13} color="hsl(215 18% 42%)" />
          </button>
        </div>
      )}

      {rep && !editing && (
        <div style={{ margin: '0 20px 6px', padding: '10px 12px', borderRadius: 14, background: 'hsl(215 22% 9%)', border: `1px solid ${col}35`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 3, alignSelf: 'stretch', minHeight: 32, borderRadius: 2, background: col, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: col, marginBottom: 2 }}>↩ Replying to {rep.username || 'Miner'}</p>
            <p style={{ fontSize: 11, color: 'hsl(215 14% 42%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rep.message}</p>
          </div>
          <button onPointerDown={() => setRep(null)} style={{ padding: 5, borderRadius: 8, background: 'hsl(215 22% 13%)', border: 'none', cursor: 'pointer', outline: 'none', flexShrink: 0 }}>
            <X size={13} color="hsl(215 18% 42%)" />
          </button>
        </div>
      )}

      {user && ok === true && (
        <div style={{ padding: '4px 20px 12px', flexShrink: 0 }}>
          {!canPost(ch) ? (
            <div style={{ padding: '14px 16px', borderRadius: 18, textAlign: 'center', background: 'hsl(215 22% 9%)', border: '1px solid hsl(215 20% 14%)' }}>
              <p style={{ fontSize: 12, color: 'hsl(215 18% 38%)' }}>🔒 Join {ch === 'alpha' ? 'Alpha' : 'Omega'} team in Arena</p>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: 'hsl(225 26% 8%)', border: `1.5px solid ${col}35`, borderRadius: 22, padding: '8px 8px 8px 12px' }}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImagePick} />

              {!editing && (
                <button onPointerDown={e => { e.stopPropagation(); fileRef.current?.click(); }} disabled={uploading} style={{ width: 34, height: 34, borderRadius: 11, flexShrink: 0, background: uploading ? `${col}25` : 'hsl(215 22% 13%)', border: `1px solid hsl(215 22% 18%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none', transition: 'all .2s' }}>
                  {uploading ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${col}30`, borderTopColor: col, animation: 'spin 0.8s linear infinite' }} /> : <ImagePlus size={15} color="hsl(215 25% 50%)" />}
                </button>
              )}

              {!editing && (
                <button data-stickers="1" onPointerDown={e => { e.stopPropagation(); setShowStickers(v => !v); setMenu(null); }} style={{ width: 34, height: 34, borderRadius: 11, flexShrink: 0, background: showStickers ? `${col}22` : 'hsl(215 22% 13%)', border: `1px solid ${showStickers ? `${col}40` : 'hsl(215 22% 18%)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none', transition: 'all .2s' }}>
                  <Smile size={15} color={showStickers ? col : 'hsl(215 25% 50%)'} />
                </button>
              )}

              <textarea ref={inpRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editing ? saveEdit() : send(); } if (e.key === 'Escape' && editing) cancelEdit(); if (e.key === 'Escape' && rep) setRep(null); }} placeholder={editing ? 'Edit message…' : rep ? `Reply to ${rep.username || 'Miner'}…` : 'Type a message…'} rows={1} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: 'hsl(215 18% 88%)', resize: 'none', fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif", lineHeight: '1.5', maxHeight: 80, overflow: 'auto', paddingTop: 8, paddingBottom: 8 }} />

              <button onPointerDown={() => editing ? saveEdit() : send()} disabled={!canSend} style={{ width: 38, height: 38, borderRadius: 13, flexShrink: 0, cursor: canSend ? 'pointer' : 'default', background: canSend ? `${col}25` : 'hsl(215 22% 11%)', border: `1px solid ${canSend ? `${col}50` : 'hsl(215 22% 16%)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s', outline: 'none' }}>
                {editing ? <Check size={16} color={canSend ? col : 'hsl(215 18% 30%)'} /> : <Send size={15} color={canSend ? col : 'hsl(215 18% 30%)'} />}
              </button>
            </div>
          )}
        </div>
      )}

      {!user && (
        <div style={{ padding: '12px 20px', flexShrink: 0 }}>
          <button onPointerDown={() => navigate('/auth')} style={{ width: '100%', padding: '16px', borderRadius: 18, fontWeight: 700, fontSize: 14, cursor: 'pointer', background: 'linear-gradient(135deg, hsl(215 35% 55%), hsl(215 40% 42%))', border: 'none', color: 'white', outline: 'none', fontFamily: "'Creato Display',-apple-system,sans-serif" }}>
            Sign In to Chat
          </button>
        </div>
      )}
    </div>
  );
}
