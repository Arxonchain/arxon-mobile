import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useArenaMembership } from '@/hooks/useArenaMembership';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, Send, RefreshCw, X, CornerUpLeft, Copy, Trash2, Pencil, Check } from 'lucide-react';

type Channel = 'general' | 'alpha' | 'omega' | 'nexus_exchange';

interface Msg {
  id: string;
  channel: Channel;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  message: string;
  created_at: string;
  reply_to_id?: string | null;
  reply_to_username?: string | null;
  reply_to_message?: string | null;
}

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

const fmt = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

function Av({ url, name, col, sz = 30 }: { url: string | null; name: string | null; col: string; sz?: number }) {
  const [err, setErr] = useState(false);
  if (url && !err) {
    return (
      <div style={{ width: sz, height: sz, borderRadius: sz * 0.35, overflow: 'hidden', flexShrink: 0, border: `1.5px solid ${col}30` }}>
        <img src={url} alt="" onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }
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

type MenuState = { msg: Msg; x: number; y: number } | null;
type EditState = { id: string; text: string } | null;

export default function MobileChat() {
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const { profile }  = useProfile();
  const { membership } = useArenaMembership();

  const [ch,      setCh]      = useState<Channel>('general');
  const [msgs,    setMsgs]    = useState<Msg[]>([]);
  const [txt,     setTxt]     = useState('');
  const [busy,    setBusy]    = useState(false);
  const [load,    setLoad]    = useState(true);
  const [ok,      setOk]      = useState<boolean | null>(null);
  const [key,     setKey]     = useState(0);
  const [rep,     setRep]     = useState<Msg | null>(null);
  const [menu,    setMenu]    = useState<MenuState>(null);
  const [editing, setEditing] = useState<EditState>(null);
  const [saving,  setSaving]  = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const botRef  = useRef<HTMLDivElement>(null);
  const subRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const inpRef  = useRef<HTMLTextAreaElement>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const uname = profile?.username || user?.email?.split('@')[0] || 'Miner';
  // Store userId persistently — user object can be null when menu re-renders on mobile
  const [myUserId, setMyUserId] = useState<string | null>(null);
  useEffect(() => { if (user?.id) setMyUserId(user.id); }, [user?.id]);
  const effectiveUserId = myUserId || user?.id || null;
  const canPost = (c: Channel) =>
    c === 'alpha' ? membership?.club === 'alpha' :
    c === 'omega' ? membership?.club === 'omega' : true;

  // ── Load messages ───────────────────────────────────────────────
  const loadMsgs = useCallback(async (c: Channel) => {
    setLoad(true);
    const { data, error } = await supabase
      .from('chat_messages').select('*')
      .eq('channel', c).order('created_at', { ascending: true }).limit(80);
    if (error) { setOk(error.code === '42P01' ? false : null); setMsgs([]); }
    else        { setOk(true); setMsgs((data || []) as Msg[]); }
    setLoad(false);
  }, []);

  useEffect(() => { loadMsgs(ch); }, [ch, loadMsgs, key]);

  // ── Real-time subscription ───────────────────────────────────────
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

  // Close context menu on outside tap
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    document.addEventListener('touchstart', close, { passive: true });
    document.addEventListener('mousedown', close);
    return () => {
      document.removeEventListener('touchstart', close);
      document.removeEventListener('mousedown', close);
    };
  }, [menu]);

  // ── Send ─────────────────────────────────────────────────────────
  const send = async () => {
    if (!user || !txt.trim() || busy || !canPost(ch)) return;
    const t = txt.trim();
    setTxt('');
    setBusy(true);
    const payload: Record<string, unknown> = {
      channel: ch, user_id: user.id, username: uname,
      avatar_url: profile?.avatar_url || null, message: t,
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

  // ── Edit save ────────────────────────────────────────────────────
  const saveEdit = async () => {
    if (!editing || !editing.text.trim() || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from('chat_messages')
      .update({ message: editing.text.trim() })
      .eq('id', editing.id)
      .eq('user_id', effectiveUserId || '');
    if (!error) {
      setMsgs(p => p.map(m => m.id === editing.id ? { ...m, message: editing.text.trim() } : m));
      setEditing(null);
      setTxt('');
    }
    setSaving(false);
  };

  const cancelEdit = () => {
    setEditing(null);
    setTxt('');
    setTimeout(() => inpRef.current?.focus(), 80);
  };

  // ── Delete ───────────────────────────────────────────────────────
  const doDelete = async (m: Msg) => {
    setMenu(null);
    setDeleting(m.id);
    const { error } = await supabase
      .from('chat_messages').delete()
      .eq('id', m.id).eq('user_id', effectiveUserId || '');
    if (!error) setMsgs(p => p.filter(x => x.id !== m.id));
    setDeleting(null);
  };

  // ── Context menu actions ─────────────────────────────────────────
  const doReply = (m: Msg) => {
    setRep(m); setMenu(null); setEditing(null); setTxt('');
    setTimeout(() => inpRef.current?.focus(), 120);
  };

  const doCopy = (m: Msg) => {
    navigator.clipboard?.writeText(m.message).catch(() => {});
    setMenu(null);
  };

  const doEdit = (m: Msg) => {
    setMenu(null); setRep(null);
    setEditing({ id: m.id, text: m.message });
    setTimeout(() => inpRef.current?.focus(), 120);
  };

  // ── Long press ───────────────────────────────────────────────────
  const startPress = (e: React.TouchEvent | React.MouseEvent, m: Msg) => {
    const touch = 'touches' in e ? e.touches[0] : e as MouseEvent;
    pressTimer.current = setTimeout(() => {
      setMenu({ msg: m, x: touch.clientX, y: touch.clientY });
    }, 420);
  };

  const endPress = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  };

  const col = CC[ch];
  const inputValue = editing ? editing.text : txt;
  const setInputValue = (v: string) => editing ? setEditing({ ...editing, text: v }) : setTxt(v);
  const canSend = editing ? editing.text.trim().length > 0 && !saving : txt.trim().length > 0 && !busy;

  return (
    <div
      style={{
        minHeight: '100vh', background: 'hsl(225 30% 3%)', display: 'flex',
        flexDirection: 'column', fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif",
        paddingBottom: 90,
      }}
      onClick={() => setMenu(null)}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity:0; transform:scale(0.92) translateY(6px) } to { opacity:1; transform:scale(1) translateY(0) } }
      `}</style>

      {/* Context menu */}
      {menu && (
        <div
          style={{
            position: 'fixed', zIndex: 9999,
            top: Math.min(menu.y + 8, window.innerHeight - 240),
            left: Math.min(Math.max(menu.x - 120, 10), window.innerWidth - 240),
            background: 'hsl(225 26% 9%)', border: '1px solid hsl(215 22% 18%)',
            borderRadius: 20, overflow: 'hidden', minWidth: 230,
            boxShadow: '0 16px 60px rgba(0,0,0,0.7), 0 0 0 1px hsl(215 22% 22%)',
            animation: 'fadeIn 0.15s ease',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Preview */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid hsl(215 22% 13%)', background: 'hsl(225 28% 7%)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: col, marginBottom: 4 }}>{menu.msg.username || 'Miner'}</p>
            <p style={{ fontSize: 12, color: 'hsl(215 18% 60%)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {menu.msg.message}
            </p>
          </div>

          {/* Reply */}
          <button
            onTouchEnd={e => { e.preventDefault(); doReply(menu.msg); }}
            onClick={() => doReply(menu.msg)}
            style={menuBtn}
          >
            <CornerUpLeft size={16} color="hsl(215 35% 62%)" />
            <span style={menuLabel}>Reply</span>
          </button>

          {/* Copy */}
          <button
            onTouchEnd={e => { e.preventDefault(); doCopy(menu.msg); }}
            onClick={() => doCopy(menu.msg)}
            style={{ ...menuBtn, borderBottom: effectiveUserId && menu.msg.user_id === effectiveUserId ? '1px solid hsl(215 22% 12%)' : 'none' }}
          >
            <Copy size={16} color="hsl(215 25% 50%)" />
            <span style={menuLabel}>Copy text</span>
          </button>

          {/* Edit + Delete — only own messages */}
          {effectiveUserId && menu.msg.user_id === effectiveUserId && (
            <>
              <button
                onTouchEnd={e => { e.preventDefault(); doEdit(menu.msg); }}
                onClick={() => doEdit(menu.msg)}
                style={{ ...menuBtn, borderBottom: '1px solid hsl(215 22% 12%)' }}
              >
                <Pencil size={16} color={col} />
                <span style={menuLabel}>Edit message</span>
              </button>
              <button
                onTouchEnd={e => { e.preventDefault(); doDelete(menu.msg); }}
                onClick={() => doDelete(menu.msg)}
                style={{ ...menuBtn, borderBottom: 'none' }}
              >
                <Trash2 size={16} color="hsl(0 60% 56%)" />
                <span style={{ ...menuLabel, color: 'hsl(0 60% 62%)' }}>Delete message</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '52px 20px 0', flexShrink: 0 }}>
        <button onClick={() => navigate('/')} style={navBtn}>
          <ChevronLeft size={20} color="hsl(215 25% 55%)" />
        </button>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'hsl(215 20% 93%)' }}>Community</h1>
          <p style={{ fontSize: 11, color: col, marginTop: 1, fontWeight: 600 }}>
            {CHANNELS.find(c => c.id === ch)?.icon} {CHANNELS.find(c => c.id === ch)?.label}
          </p>
        </div>
        <button onClick={() => setKey(k => k + 1)} style={navBtn}>
          <RefreshCw size={15} color="hsl(215 25% 55%)" style={{ animation: load ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Channel tabs */}
      <div className="scrollbar-none" style={{ display: 'flex', gap: 8, padding: '14px 20px 0', overflowX: 'auto', flexShrink: 0 }}>
        {CHANNELS.map(c => {
          const ac = canPost(c.id); const ia = ch === c.id;
          return (
            <button key={c.id} onClick={() => ac && setCh(c.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              borderRadius: 22, fontSize: 12, fontWeight: 700, border: 'none',
              cursor: ac ? 'pointer' : 'not-allowed', outline: 'none', transition: 'all .2s',
              flexShrink: 0, background: ia ? `${CC[c.id]}22` : 'hsl(215 22% 10%)',
              color: ia ? CC[c.id] : ac ? 'hsl(215 18% 48%)' : 'hsl(215 14% 28%)',
              boxShadow: ia ? `0 0 0 1.5px ${CC[c.id]}50` : `0 0 0 1px hsl(215 20% 16%)`,
              opacity: ac ? 1 : 0.45,
            }}>
              <span>{c.icon}</span>
              {c.label}
              {c.lock && !ac && <span style={{ fontSize: 9 }}>🔒</span>}
            </button>
          );
        })}
      </div>

      {/* Desc */}
      <div style={{ padding: '7px 20px 0', flexShrink: 0 }}>
        <p style={{ fontSize: 11, color: 'hsl(215 14% 33%)' }}>
          {CHANNELS.find(c => c.id === ch)?.desc}
          {ch === 'alpha' && membership?.club === 'alpha' && ' · Welcome, Alpha!'}
          {ch === 'omega' && membership?.club === 'omega' && ' · Welcome, Omega!'}
          {' '}· <span style={{ color: 'hsl(215 14% 26%)' }}>Hold to reply / edit / delete</span>
        </p>
      </div>

      {/* DB not set up warning */}
      {ok === false && (
        <div style={{ margin: '10px 20px', padding: '13px 15px', borderRadius: 16, background: 'hsl(38 55% 52% / 0.08)', border: '1px solid hsl(38 55% 52% / 0.22)', flexShrink: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'hsl(38 55% 58%)', marginBottom: 3 }}>⚙️ Chat Setup Required</p>
          <p style={{ fontSize: 11, color: 'hsl(38 55% 52% / 0.7)', lineHeight: 1.5 }}>Run the SQL migration in Supabase to enable chat.</p>
        </div>
      )}

      {/* Messages */}
      <div className="scrollbar-none" style={{ flex: 1, overflowY: 'auto', padding: '10px 20px 0', minHeight: 0 }}>
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
          const me = m.user_id === user?.id;
          const showHeader = i === 0 || msgs[i - 1].user_id !== m.user_id;
          const isDeleting = deleting === m.id;
          const isEdited = editing?.id === m.id;

          return (
            <div
              key={m.id}
              onMouseDown={e => startPress(e, m)}
              onMouseUp={endPress}
              onMouseLeave={endPress}
              onTouchStart={e => startPress(e, m)}
              onTouchEnd={endPress}
              onTouchCancel={endPress}
              onTouchMove={endPress}
              style={{
                marginBottom: showHeader ? 12 : 4,
                display: 'flex',
                flexDirection: me ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
                gap: 8,
                WebkitUserSelect: 'none',
                userSelect: 'none',
                WebkitTouchCallout: 'none',
                opacity: isDeleting ? 0.4 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {!me && showHeader && <Av url={m.avatar_url} name={m.username} col={col} sz={30} />}
              {!me && !showHeader && <div style={{ width: 30, flexShrink: 0 }} />}

              <div style={{ maxWidth: '76%' }}>
                {showHeader && !me && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{m.username || 'Miner'}</span>
                    <span style={{ fontSize: 9, color: 'hsl(215 14% 30%)' }}>{fmt(m.created_at)}</span>
                  </div>
                )}

                {/* Reply quote */}
                {m.reply_to_id && m.reply_to_message && (
                  <div style={{
                    marginBottom: 2, padding: '7px 11px',
                    borderRadius: '12px 12px 0 0',
                    background: 'hsl(215 22% 10%)',
                    borderLeft: `3px solid ${col}`,
                  }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: col, marginBottom: 2 }}>{m.reply_to_username || 'Miner'}</p>
                    <p style={{ fontSize: 11, color: 'hsl(215 14% 48%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                      {m.reply_to_message}
                    </p>
                  </div>
                )}

                {/* Bubble */}
                <div style={{
                  padding: '10px 14px',
                  borderRadius: m.reply_to_id
                    ? (me ? '0 16px 4px 16px' : '16px 0 16px 4px')
                    : (me ? '18px 18px 4px 18px' : '18px 18px 18px 4px'),
                  background: me ? `linear-gradient(135deg, ${col}20, ${col}0d)` : 'hsl(225 24% 9%)',
                  border: `1px solid ${me ? `${col}28` : 'hsl(215 22% 14%)'}`,
                  wordBreak: 'break-word',
                  outline: isEdited ? `1.5px solid ${col}60` : 'none',
                }}>
                  <p style={{ fontSize: 13, color: 'hsl(215 18% 88%)', lineHeight: 1.55, margin: 0 }}>{m.message}</p>
                </div>

                {me && (
                  <p style={{ fontSize: 9, color: 'hsl(215 14% 26%)', marginTop: 3, textAlign: 'right' }}>{fmt(m.created_at)}</p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={botRef} />
      </div>

      {/* Edit banner */}
      {editing && (
        <div style={{
          margin: '0 20px 6px', padding: '10px 12px', borderRadius: 14,
          background: `${col}12`, border: `1px solid ${col}35`,
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Pencil size={14} color={col} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: col, marginBottom: 1 }}>Editing message</p>
            <p style={{ fontSize: 11, color: 'hsl(215 14% 42%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {editing.text}
            </p>
          </div>
          <button onClick={cancelEdit} style={{ padding: 5, borderRadius: 8, background: 'hsl(215 22% 13%)', border: 'none', cursor: 'pointer', outline: 'none', flexShrink: 0 }}>
            <X size={13} color="hsl(215 18% 42%)" />
          </button>
        </div>
      )}

      {/* Reply banner */}
      {rep && !editing && (
        <div style={{
          margin: '0 20px 6px', padding: '10px 12px', borderRadius: 14,
          background: 'hsl(215 22% 9%)', border: `1px solid ${col}35`,
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ width: 3, alignSelf: 'stretch', minHeight: 32, borderRadius: 2, background: col, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: col, marginBottom: 2 }}>↩ Replying to {rep.username || 'Miner'}</p>
            <p style={{ fontSize: 11, color: 'hsl(215 14% 42%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rep.message}</p>
          </div>
          <button onClick={() => setRep(null)} style={{ padding: 5, borderRadius: 8, background: 'hsl(215 22% 13%)', border: 'none', cursor: 'pointer', outline: 'none', flexShrink: 0 }}>
            <X size={13} color="hsl(215 18% 42%)" />
          </button>
        </div>
      )}

      {/* Input */}
      {user && ok === true && (
        <div style={{ padding: '4px 20px 12px', flexShrink: 0 }}>
          {!canPost(ch) ? (
            <div style={{ padding: '14px 16px', borderRadius: 18, textAlign: 'center', background: 'hsl(215 22% 9%)', border: '1px solid hsl(215 20% 14%)' }}>
              <p style={{ fontSize: 12, color: 'hsl(215 18% 38%)' }}>🔒 Join {ch === 'alpha' ? 'Alpha' : 'Omega'} team in Arena</p>
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 10,
              background: 'hsl(225 26% 8%)', border: `1.5px solid ${col}35`,
              borderRadius: 22, padding: '10px 10px 10px 16px',
            }}>
              <textarea
                ref={inpRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editing ? saveEdit() : send(); }
                  if (e.key === 'Escape' && editing) cancelEdit();
                  if (e.key === 'Escape' && rep) setRep(null);
                }}
                placeholder={editing ? 'Edit your message…' : rep ? `Reply to ${rep.username || 'Miner'}…` : 'Type a message…'}
                rows={1}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontSize: 14, color: 'hsl(215 18% 88%)', resize: 'none',
                  fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif",
                  lineHeight: '1.5', maxHeight: 80, overflow: 'auto',
                }}
              />
              <button
                onClick={editing ? saveEdit : send}
                disabled={!canSend}
                style={{
                  width: 38, height: 38, borderRadius: 13, flexShrink: 0,
                  cursor: canSend ? 'pointer' : 'default',
                  background: canSend ? `${col}25` : 'hsl(215 22% 11%)',
                  border: `1px solid ${canSend ? `${col}50` : 'hsl(215 22% 16%)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .2s', outline: 'none',
                }}
              >
                {editing
                  ? <Check size={16} color={canSend ? col : 'hsl(215 18% 30%)'} />
                  : <Send size={15} color={canSend ? col : 'hsl(215 18% 30%)'} />
                }
              </button>
            </div>
          )}
        </div>
      )}

      {!user && (
        <div style={{ padding: '12px 20px', flexShrink: 0 }}>
          <button
            onClick={() => navigate('/auth')}
            style={{
              width: '100%', padding: '16px', borderRadius: 18, fontWeight: 700, fontSize: 14,
              cursor: 'pointer',
              background: 'linear-gradient(135deg, hsl(215 35% 55%), hsl(215 40% 42%))',
              border: 'none', color: 'white', outline: 'none',
              fontFamily: "'Creato Display',-apple-system,sans-serif",
            }}
          >
            Sign In to Chat
          </button>
        </div>
      )}
    </div>
  );
}

const menuBtn: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', gap: 13,
  padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer',
  outline: 'none', borderBottom: '1px solid hsl(215 22% 12%)',
};

const menuLabel: React.CSSProperties = {
  fontSize: 14, fontWeight: 600, color: 'hsl(215 18% 86%)',
};

const navBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 14, background: 'hsl(215 25% 10%)',
  border: '1px solid hsl(215 22% 17%)', display: 'flex', alignItems: 'center',
  justifyContent: 'center', cursor: 'pointer', outline: 'none',
};
