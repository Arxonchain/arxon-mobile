import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useArenaMembership } from '@/hooks/useArenaMembership';
import { supabase } from '@/integrations/supabase/client';
import {
  ChevronLeft, Send, X, CornerUpLeft,
  Copy, Trash2, Pencil, Check, Smile, Menu, RefreshCw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Channel = 'general' | 'alpha' | 'omega' | 'nexus_exchange';

interface Msg {
  id: string; channel: Channel; user_id: string;
  username: string | null; avatar_url: string | null;
  message: string; msg_type?: string; image_url?: string | null;
  created_at: string; reply_to_id?: string | null;
  reply_to_username?: string | null; reply_to_message?: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const CHANNELS: { id: Channel; label: string; icon: string; desc: string; needsTeam: string | null }[] = [
  { id: 'general',        label: 'General',        icon: '🌐', desc: 'Open to everyone',         needsTeam: null    },
  { id: 'alpha',          label: 'Alpha Team',      icon: '⬡',  desc: 'Alpha members only',       needsTeam: 'alpha' },
  { id: 'omega',          label: 'Omega Team',      icon: '⬡',  desc: 'Omega members only',       needsTeam: 'omega' },
  { id: 'nexus_exchange', label: 'Nexus Exchange',  icon: '📡', desc: 'Share Nexus UIDs & ARX-P', needsTeam: null    },
];

const THEME: Record<Channel, string> = {
  general:        'hsl(215 35% 62%)',
  alpha:          'hsl(195 80% 50%)',
  omega:          'hsl(255 60% 65%)',
  nexus_exchange: 'hsl(155 45% 50%)',
};

const SB_URL  = (import.meta as any).env?.VITE_SUPABASE_URL ?? '';
const stUrl   = (f: string) => SB_URL
  ? `${SB_URL}/storage/v1/object/public/chat-images/stickers/${f}`
  : `/${f}`;

const STICKERS = [
  { id: 's1', file: 'sticker_1.png', label: 'Welcome'  },
  { id: 's2', file: 'sticker_2.png', label: 'Rich'      },
  { id: 's3', file: 'sticker_3.png', label: 'Verified'  },
  { id: 's4', file: 'sticker_4.png', label: 'Wen?'      },
  { id: 's5', file: 'sticker_5.png', label: 'LOL'       },
];

const EMOJIS = [
  '😀','😂','🤣','😍','🥰','😎','🤩','😅','🤔','😤',
  '🔥','💯','💪','👀','🚀','💰','🏆','⚡','🎯','✅',
  '👍','❤️','😭','🙏','💎','⭐','🎉','💸','🤑','😱',
  '👏','🫡','🥳','😴','🤝','💬','🎮','🌙','🔑','⚠️',
];

const fmt = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

async function clipCopy(text: string) {
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } } catch {}
  try {
    const el = Object.assign(document.createElement('textarea'), {
      value: text, style: 'position:fixed;top:-999px;opacity:0',
    });
    document.body.appendChild(el); el.focus(); el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch { return false; }
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
function Av({ url, name, color, size = 30 }: { url: string | null; name: string | null; color: string; size?: number }) {
  const [err, setErr] = useState(false);
  const r = Math.round(size * 0.36);
  const style: React.CSSProperties = {
    width: size, height: size, borderRadius: r, flexShrink: 0,
    border: `1.5px solid ${color}30`, overflow: 'hidden',
  };
  if (url && !err) return (
    <div style={style}>
      <img src={url} alt="" onError={() => setErr(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
  return (
    <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `${color}18`, color, fontSize: size * 0.42, fontWeight: 700 }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

// ─── Context-menu row ─────────────────────────────────────────────────────────
function CMRow({ icon, label, onTap, danger, divider = true }: {
  icon: React.ReactNode; label: string; onTap: () => void; danger?: boolean; divider?: boolean;
}) {
  return (
    <button
      onPointerDown={e => { e.preventDefault(); e.stopPropagation(); onTap(); }}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', background: 'none', border: 'none',
        borderBottom: divider ? '1px solid hsl(215 22% 12%)' : 'none',
        cursor: 'pointer', outline: 'none',
      }}>
      {icon}
      <span style={{ fontSize: 14, fontWeight: 600, color: danger ? 'hsl(0 62% 60%)' : 'hsl(215 18% 84%)' }}>
        {label}
      </span>
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MobileChat() {
  const navigate       = useNavigate();
  const { user }       = useAuth();
  const { profile }    = useProfile();
  const { membership } = useArenaMembership();

  // chat state
  const [ch,       setCh]      = useState<Channel>('general');
  const [msgs,     setMsgs]    = useState<Msg[]>([]);
  const [ready,    setReady]   = useState(false);  // db loaded ok
  const [dbErr,    setDbErr]   = useState(false);
  const [loading,  setLoading] = useState(true);
  const [busy,     setBusy]    = useState(false);
  const [tick,     setTick]    = useState(0);      // force reload

  // ui state
  const [rep,      setRep]     = useState<Msg | null>(null);
  const [ctxMenu,  setCtx]     = useState<{ msg: Msg; x: number; y: number } | null>(null);
  const [editing,  setEdit]    = useState<{ id: string; text: string } | null>(null);
  const [saving,   setSaving]  = useState(false);
  const [delId,    setDelId]   = useState<string | null>(null);
  const [panel,    setPanel]   = useState<'none' | 'stickers' | 'emoji' | 'channels'>('none');
  const [uploading,setUpload]  = useState(false);
  const [toastTxt, setToast]   = useState('');

  // refs — never stale
  const botRef     = useRef<HTMLDivElement>(null);
  const subRef     = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const inpRef     = useRef<HTMLTextAreaElement>(null);
  const holdTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileId     = useRef(`fi-${Date.now()}`);
  const killed     = useRef(new Set<string>());  // optimistically deleted ids
  const txtRef     = useRef('');
  const repRef     = useRef<Msg | null>(null);
  const [txt, _sx] = useState('');
  const setTxt     = (v: string) => { txtRef.current = v; _sx(v); };
  useEffect(() => { repRef.current = rep; }, [rep]);

  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => { if (user?.id) setUid(user.id); }, [user?.id]);

  const uname   = profile?.username || user?.email?.split('@')[0] || 'Miner';
  const canPost = (c: Channel) =>
    CHANNELS.find(x => x.id === c)?.needsTeam === null ? true :
    CHANNELS.find(x => x.id === c)?.needsTeam === 'alpha' ? membership?.club === 'alpha' :
    membership?.club === 'omega';
  const isOwn   = (m: Msg) => !!uid && m.user_id === uid;

  const toast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  // ── Load ─────────────────────────────────────────────────────────────────
  const loadMsgs = useCallback(async (c: Channel) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chat_messages').select('*')
      .eq('channel', c).order('created_at', { ascending: true }).limit(120);
    if (error) {
      setDbErr(error.code === '42P01');
      setReady(false);
      setMsgs([]);
    } else {
      setDbErr(false);
      setReady(true);
      setMsgs((data ?? []) as Msg[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadMsgs(ch); }, [ch, loadMsgs, tick]);

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    subRef.current && supabase.removeChannel(subRef.current);
    const s = supabase.channel(`chat:${ch}:${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel=eq.${ch}` }, ({ new: m }) => {
        const msg = m as Msg;
        if (killed.current.has(msg.id)) return;
        setMsgs(p => p.some(x => x.id === msg.id) ? p : [...p, msg]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `channel=eq.${ch}` }, ({ new: m }) => {
        const msg = m as Msg;
        setMsgs(p => p.map(x => x.id === msg.id ? { ...x, message: msg.message } : x));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, ({ old: o }) => {
        const id = (o as Msg).id;
        killed.current.delete(id);
        setMsgs(p => p.filter(x => x.id !== id));
      })
      .subscribe();
    subRef.current = s;
    return () => { supabase.removeChannel(s); };
  }, [ch, ready]);

  useEffect(() => { botRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  // ── Send text — resilient with column-aware fallback ─────────────────────
  // If the DB is missing rich columns (msg_type, reply_to_*), we fall back
  // to the minimal payload that always works. Retries up to 3x on 5xx errors.
  const sendText = useCallback(async () => {
    const text = txtRef.current.trim();
    if (!user || !text || busy) return;
    const reply = repRef.current;
    setTxt(''); setRep(null); setBusy(true);

    // Full payload — requires new columns
    const fullRow: Record<string, unknown> = {
      channel: ch, user_id: user.id, username: uname,
      avatar_url: profile?.avatar_url ?? null,
      message: text, msg_type: 'text',
    };
    if (reply) {
      fullRow.reply_to_id       = reply.id;
      fullRow.reply_to_username = reply.username ?? 'Miner';
      fullRow.reply_to_message  = reply.message.slice(0, 80);
    }

    // Minimal payload — works even on old schema
    const minRow: Record<string, unknown> = {
      channel: ch, user_id: user.id, username: uname,
      avatar_url: profile?.avatar_url ?? null,
      message: text,
    };

    let sent = false;

    // Attempt 1-3: full payload with retry
    for (let attempt = 0; attempt < 3 && !sent; attempt++) {
      const { error } = await supabase.from('chat_messages').insert(fullRow);
      if (!error) { sent = true; break; }
      // 400/42xxx = schema mismatch — don't retry full, fall back immediately
      if (error.code?.startsWith('42') || error.code === 'PGRST204' ||
          (error.message && (error.message.includes('column') || error.message.includes('schema')))) {
        break;
      }
      // 5xx — wait and retry
      if (attempt < 2) await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
    }

    // Fallback: minimal payload (no rich columns)
    if (!sent) {
      const { error: minErr } = await supabase.from('chat_messages').insert(minRow);
      if (!minErr) {
        sent = true;
        // Alert developer once that migration is needed
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Chat] Sent with minimal schema. Run the chat migration SQL to enable replies/stickers.');
        }
      }
    }

    if (!sent) {
      setTxt(text); setRep(reply);
      toast('Could not send — check connection');
    }
    setBusy(false);
  }, [user, busy, ch, uname, profile]);

  // ── Send sticker — with minimal fallback ────────────────────────────────
  const sendSticker = useCallback(async (url: string) => {
    if (!user || busy) return;
    setPanel('none'); setBusy(true);

    // Try full payload first
    let { error } = await supabase.from('chat_messages').insert({
      channel: ch, user_id: user.id, username: uname,
      avatar_url: profile?.avatar_url ?? null,
      message: '🐉', msg_type: 'sticker', image_url: url,
    });

    // Fallback: send as text message with the URL embedded
    if (error) {
      const { error: fallbackErr } = await supabase.from('chat_messages').insert({
        channel: ch, user_id: user.id, username: uname,
        avatar_url: profile?.avatar_url ?? null,
        message: `🐉 [sticker] ${url}`,
      });
      if (fallbackErr) toast('Sticker failed');
    }
    setBusy(false);
  }, [user, busy, ch, uname, profile]);

  // ── Emoji ─────────────────────────────────────────────────────────────────
  const addEmoji = useCallback((em: string) => {
    const pos  = inpRef.current?.selectionStart ?? txtRef.current.length;
    const next = txtRef.current.slice(0, pos) + em + txtRef.current.slice(pos);
    setTxt(next);
    setTimeout(() => {
      const inp = inpRef.current;
      if (inp) { inp.focus(); inp.setSelectionRange(pos + em.length, pos + em.length); }
    }, 20);
  }, []);

  // ── Image upload ──────────────────────────────────────────────────────────
  const pickImage = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 8 * 1024 * 1024) { toast('Max 8 MB'); return; }
    setUpload(true);
    try {
      const ext  = file.name.split('.').pop() ?? 'jpg';
      const path = `chat/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('chat-images').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('chat-images').getPublicUrl(path);
      // Try with rich columns first, fall back to URL-in-text
      let { error: msgErr } = await supabase.from('chat_messages').insert({
        channel: ch, user_id: user.id, username: uname,
        avatar_url: profile?.avatar_url ?? null,
        message: '📷 Image', msg_type: 'image', image_url: pub.publicUrl,
      });
      if (msgErr) {
        const { error: fbErr } = await supabase.from('chat_messages').insert({
          channel: ch, user_id: user.id, username: uname,
          avatar_url: profile?.avatar_url ?? null,
          message: `📷 ${pub.publicUrl}`,
        });
        if (fbErr) throw fbErr;
      }
      toast('📷 Sent!');
    } catch (err: any) {
      toast(err?.message?.includes('Bucket') ? 'Create chat-images bucket in Supabase' : 'Upload failed');
    } finally { setUpload(false); e.target.value = ''; }
  }, [user, ch, uname, profile]);

  // ── Edit ──────────────────────────────────────────────────────────────────
  const saveEdit = useCallback(async () => {
    if (!editing || !editing.text.trim() || saving) return;
    setSaving(true);
    const text = editing.text.trim();
    const { error } = await supabase.from('chat_messages')
      .update({ message: text })
      .eq('id', editing.id).eq('user_id', uid ?? '');
    if (!error) {
      setMsgs(p => p.map(m => m.id === editing!.id ? { ...m, message: text } : m));
      setEdit(null); setTxt('');
    } else toast('Edit failed');
    setSaving(false);
  }, [editing, saving, uid]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const doDelete = useCallback(async (m: Msg) => {
    setCtx(null);
    killed.current.add(m.id);
    setMsgs(p => p.filter(x => x.id !== m.id));
    setDelId(m.id);
    const { error } = await supabase.from('chat_messages').delete()
      .eq('id', m.id).eq('user_id', uid ?? '');
    if (error) {
      killed.current.delete(m.id);
      setMsgs(p => [...p, m].sort((a, b) => a.created_at.localeCompare(b.created_at)));
      toast('Delete failed');
    }
    setDelId(null);
  }, [uid]);

  const doReply = useCallback((m: Msg) => {
    setRep(m); setCtx(null); setEdit(null); setTxt('');
    setTimeout(() => inpRef.current?.focus(), 150);
  }, []);
  const doCopy = useCallback(async (m: Msg) => {
    setCtx(null);
    toast((await clipCopy(m.message)) ? '✓ Copied' : 'Copy failed');
  }, []);
  const doEdit = useCallback((m: Msg) => {
    setCtx(null); setRep(null);
    setEdit({ id: m.id, text: m.message });
    setTimeout(() => inpRef.current?.focus(), 150);
  }, []);

  // ── Long press ────────────────────────────────────────────────────────────
  const pressStart = useCallback((e: React.TouchEvent | React.MouseEvent, m: Msg) => {
    const t = 'touches' in e ? e.touches[0] : (e as unknown as MouseEvent);
    holdTimer.current = setTimeout(() => {
      setPanel('none');
      setCtx({ msg: m, x: t.clientX, y: t.clientY });
    }, 480);
  }, []);
  const pressEnd = useCallback(() => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
  }, []);

  // ── Close drawers on outside tap ──────────────────────────────────────────
  // We use a simple approach: the BACKDROP div closes on its own click.
  // No global event listeners needed — eliminates the race condition.

  const col    = THEME[ch];
  const chInfo = CHANNELS.find(c => c.id === ch)!;
  const editVal = editing?.text ?? txt;
  const setVal  = (v: string) => {
    if (editing) setEdit(p => p ? { ...p, text: v } : null);
    else setTxt(v);
  };
  // Always read txtRef for send-button highlight to avoid stale state
  const hasTxt = editing ? editing.text.trim().length > 0 : txtRef.current.trim().length > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      // Takes full viewport height. The bottom nav is fixed-position overlay,
      // so we add paddingBottom to ensure input bar is always visible above it.
      minHeight: '100dvh',
      paddingBottom: 90,   // clears the fixed nav bar
      background: 'hsl(225 30% 3%)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif",
      boxSizing: 'border-box',
    }}>

      <style>{`
        @keyframes spin   { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes popIn  { from { opacity:0; transform:scale(.88) } to { opacity:1; transform:scale(1) } }
        @keyframes toastUp{ 0%{opacity:0;transform:translateX(-50%) translateY(8px)} 15%{opacity:1;transform:translateX(-50%) translateY(0)} 80%{opacity:1} 100%{opacity:0} }
        .hs::-webkit-scrollbar { display:none }
        .hs { scrollbar-width:none; -ms-overflow-style:none }
      `}</style>

      {/* ── Toast ── */}
      {toastTxt && (
        <div style={{
          position: 'fixed', top: 90, left: '50%', zIndex: 30000, pointerEvents: 'none',
          background: 'hsl(225 28% 13%)', border: '1px solid hsl(215 30% 22%)',
          color: 'hsl(215 18% 90%)', padding: '9px 22px', borderRadius: 24,
          fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
          animation: 'toastUp 2.2s ease forwards',
          boxShadow: '0 8px 32px rgba(0,0,0,.6)',
        }}>{toastTxt}</div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          CHANNEL DRAWER — fixed, sits ABOVE the nav bar
          Uses a simple backdrop+sheet pattern. No global listeners.
      ═══════════════════════════════════════════════════════════════════ */}
      {panel === 'channels' && (
        <div
          // Backdrop — clicking it closes the drawer
          onClick={() => setPanel('none')}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0,
            bottom: 90,            // stops at the nav bar, never overlaps it
            zIndex: 10000,
            background: 'rgba(0,0,0,.65)',
            display: 'flex',
            alignItems: 'flex-end',
          }}>

          {/* Sheet — stop click propagation so tapping inside doesn't close */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              background: 'hsl(225 26% 9%)',
              borderRadius: '24px 24px 0 0',
              border: '1px solid hsl(215 22% 18%)',
              borderBottom: 'none',
              animation: 'fadeUp .22s ease',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '60vh',    // never taller than 60% of viewport
              overflow: 'hidden',
            }}>

            {/* Drag handle */}
            <div style={{
              width: 42, height: 4, borderRadius: 2,
              background: 'hsl(215 22% 26%)',
              margin: '14px auto 0', flexShrink: 0,
            }} />

            <p style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.15em',
              textTransform: 'uppercase', color: 'hsl(215 14% 36%)',
              padding: '10px 20px', flexShrink: 0,
            }}>Switch Channel</p>

            {/* Scrollable list */}
            <div className="hs" style={{ overflowY: 'auto', flex: 1, paddingBottom: 14 }}>
              {CHANNELS.map(c => {
                const ok     = canPost(c.id);
                const active = ch === c.id;
                const color  = THEME[c.id];
                return (
                  <button key={c.id}
                    onClick={() => { if (ok) { setCh(c.id); setPanel('none'); } }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                      padding: '13px 20px', border: 'none', outline: 'none',
                      background: active ? `${color}12` : 'transparent',
                      cursor: ok ? 'pointer' : 'not-allowed',
                      opacity: ok ? 1 : 0.38,
                    }}>
                    <div style={{
                      width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22,
                      background: active ? `${color}22` : 'hsl(215 22% 12%)',
                      border: `1.5px solid ${active ? `${color}44` : 'hsl(215 22% 18%)'}`,
                    }}>{c.icon}</div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <p style={{ fontSize: 14, fontWeight: 700, margin: 0,
                        color: active ? color : 'hsl(215 18% 82%)' }}>
                        {c.label}{!ok ? ' 🔒' : ''}
                      </p>
                      <p style={{ fontSize: 11, color: 'hsl(215 14% 38%)', marginTop: 3 }}>{c.desc}</p>
                    </div>
                    {active && <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />}
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
          // Backdrop for context menu
          onClick={() => setCtx(null)}
          style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,.3)' }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              top:  Math.min(ctxMenu.y + 8, window.innerHeight - 280),
              left: Math.min(Math.max(ctxMenu.x - 130, 10), window.innerWidth - 254),
              background: 'hsl(225 26% 9%)', border: '1px solid hsl(215 22% 18%)',
              borderRadius: 20, overflow: 'hidden', minWidth: 244,
              boxShadow: '0 20px 70px rgba(0,0,0,.85)',
              animation: 'popIn .14s ease',
            }}>
            {/* Preview */}
            <div style={{ padding: '11px 16px', borderBottom: '1px solid hsl(215 22% 13%)', background: 'hsl(225 28% 7%)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: col, marginBottom: 3 }}>
                {ctxMenu.msg.username || 'Miner'}
              </p>
              {ctxMenu.msg.msg_type === 'sticker' ? (
                <p style={{ fontSize: 12, color: 'hsl(215 18% 48%)' }}>🐉 Sticker</p>
              ) : ctxMenu.msg.msg_type === 'image' ? (
                <p style={{ fontSize: 12, color: 'hsl(215 18% 48%)' }}>📷 Image</p>
              ) : (
                <p style={{ fontSize: 12, color: 'hsl(215 18% 58%)', lineHeight: 1.4,
                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {ctxMenu.msg.message}
                </p>
              )}
            </div>
            <CMRow icon={<CornerUpLeft size={15} color="hsl(215 35% 62%)" />} label="Reply"    onTap={() => doReply(ctxMenu.msg)} />
            {(!ctxMenu.msg.msg_type || ctxMenu.msg.msg_type === 'text') && (
              <CMRow icon={<Copy size={15} color="hsl(215 25% 52%)" />}       label="Copy text" onTap={() => doCopy(ctxMenu.msg)} divider={isOwn(ctxMenu.msg)} />
            )}
            {isOwn(ctxMenu.msg) && <>
              {(!ctxMenu.msg.msg_type || ctxMenu.msg.msg_type === 'text') && (
                <CMRow icon={<Pencil size={15} color={col} />} label="Edit" onTap={() => doEdit(ctxMenu.msg)} />
              )}
              <CMRow icon={<Trash2 size={15} color="hsl(0 62% 55%)" />} label="Delete" onTap={() => doDelete(ctxMenu.msg)} danger divider={false} />
            </>}
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '52px 18px 10px', flexShrink: 0 }}>
        <button onPointerDown={e => { e.stopPropagation(); navigate('/'); }}
          style={NB}>
          <ChevronLeft size={20} color="hsl(215 25% 55%)" />
        </button>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'hsl(215 20% 93%)', margin: 0 }}>Community</h1>
          <p style={{ fontSize: 11, color: col, marginTop: 2, fontWeight: 600 }}>
            {chInfo.icon} {chInfo.label}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onPointerDown={() => setTick(k => k + 1)} style={NB}>
            <RefreshCw size={15} color="hsl(215 25% 50%)"
              style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button
            onClick={() => setPanel(p => p === 'channels' ? 'none' : 'channels')}
            style={{ ...NB,
              background: panel === 'channels' ? `${col}1a` : 'hsl(215 25% 10%)',
              border: `1px solid ${panel === 'channels' ? `${col}44` : 'hsl(215 22% 17%)'}`,
            }}>
            <Menu size={18} color={panel === 'channels' ? col : 'hsl(215 25% 55%)'} />
          </button>
        </div>
      </div>

      <p style={{ fontSize: 10, color: 'hsl(215 14% 28%)', padding: '0 18px 5px', flexShrink: 0 }}>
        {chInfo.desc} · Hold a message to reply / edit / delete
      </p>

      {dbErr && (
        <div style={{ margin: '4px 18px 6px', padding: '10px 14px', borderRadius: 13,
          background: 'hsl(38 55% 52%/0.07)', border: '1px solid hsl(38 55% 52%/0.22)', flexShrink: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'hsl(38 55% 58%)', margin: 0 }}>
            ⚙️ Chat table missing — run Supabase migration
          </p>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="hs" style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 8px', minHeight: 0 }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%',
              border: `2px solid ${col}22`, borderTopColor: col, animation: 'spin 1s linear infinite' }} />
          </div>
        )}
        {!loading && msgs.length === 0 && !dbErr && (
          <div style={{ textAlign: 'center', paddingTop: 56 }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>{chInfo.icon}</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'hsl(215 18% 40%)' }}>No messages yet</p>
            <p style={{ fontSize: 11, color: 'hsl(215 14% 28%)', marginTop: 4 }}>Be first to say something!</p>
          </div>
        )}
        {msgs.map((m, i) => {
          const me      = isOwn(m);
          const showHdr = i === 0 || msgs[i - 1].user_id !== m.user_id;
          const dying   = delId === m.id;
          const isStick = m.msg_type === 'sticker';
          const isImg   = m.msg_type === 'image';
          return (
            <div key={m.id}
              onMouseDown={e => { e.stopPropagation(); pressStart(e, m); }}
              onMouseUp={pressEnd} onMouseLeave={pressEnd}
              onTouchStart={e => { e.stopPropagation(); pressStart(e, m); }}
              onTouchEnd={pressEnd} onTouchCancel={pressEnd} onTouchMove={pressEnd}
              style={{
                marginBottom: showHdr ? 10 : 3,
                display: 'flex', flexDirection: me ? 'row-reverse' : 'row',
                alignItems: 'flex-end', gap: 7,
                WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
                opacity: dying ? 0.3 : 1, transition: 'opacity .18s',
              }}>
              {!me && showHdr && <Av url={m.avatar_url} name={m.username} color={col} size={28} />}
              {!me && !showHdr && <div style={{ width: 28, flexShrink: 0 }} />}
              <div style={{ maxWidth: isStick ? '52%' : '76%' }}>
                {showHdr && !me && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{m.username || 'Miner'}</span>
                    <span style={{ fontSize: 9, color: 'hsl(215 14% 28%)' }}>{fmt(m.created_at)}</span>
                  </div>
                )}
                {m.reply_to_id && m.reply_to_message && (
                  <div style={{ marginBottom: 2, padding: '6px 10px', borderRadius: '11px 11px 0 0',
                    background: 'hsl(215 22% 10%)', borderLeft: `3px solid ${col}` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: col, marginBottom: 1 }}>{m.reply_to_username || 'Miner'}</p>
                    <p style={{ fontSize: 11, color: 'hsl(215 14% 46%)', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>{m.reply_to_message}</p>
                  </div>
                )}
                {isStick && m.image_url ? (
                  <img src={m.image_url} alt="sticker"
                    style={{ width: 120, height: 120, objectFit: 'contain', display: 'block',
                      filter: 'drop-shadow(0 3px 12px rgba(0,0,0,.4))', borderRadius: 8 }}
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '.2'; }} />
                ) : isImg && m.image_url ? (
                  <div style={{ borderRadius: me ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    overflow: 'hidden', border: `1px solid ${col}25`, maxWidth: 220 }}>
                    <img src={m.image_url} alt="img"
                      style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} />
                  </div>
                ) : (
                  <div style={{
                    padding: '9px 13px',
                    borderRadius: m.reply_to_id
                      ? (me ? '0 14px 4px 14px' : '14px 0 14px 4px')
                      : (me ? '16px 16px 4px 16px' : '16px 16px 16px 4px'),
                    background: me ? `linear-gradient(135deg,${col}1e,${col}0c)` : 'hsl(225 24% 9%)',
                    border: `1px solid ${me ? `${col}25` : 'hsl(215 22% 13%)'}`,
                    wordBreak: 'break-word',
                  }}>
                    <p style={{ fontSize: 13, color: 'hsl(215 18% 88%)', lineHeight: 1.5, margin: 0 }}>{m.message}</p>
                  </div>
                )}
                {me && <p style={{ fontSize: 9, color: 'hsl(215 14% 24%)', marginTop: 2, textAlign: 'right' }}>{fmt(m.created_at)}</p>}
              </div>
            </div>
          );
        })}
        <div ref={botRef} />
      </div>

      {/* ── Sticker tray ── */}
      {panel === 'stickers' && (
        <div style={{ margin: '0 14px 6px', padding: '12px', borderRadius: 18, flexShrink: 0,
          background: 'hsl(225 26% 7%)', border: `1px solid ${col}28`, animation: 'fadeUp .18s ease' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: col, marginBottom: 9,
            textTransform: 'uppercase', letterSpacing: '0.14em' }}>Arxon Stickers</p>
          <div className="hs" style={{ display: 'flex', gap: 9, overflowX: 'auto' }}>
            {STICKERS.map(s => {
              const url = stUrl(s.file);
              return (
                <button key={s.id}
                  onPointerDown={e => { e.preventDefault(); e.stopPropagation(); sendSticker(url); }}
                  style={{ flexShrink: 0, width: 76, height: 76, borderRadius: 14,
                    border: '1px solid hsl(215 22% 15%)', background: 'hsl(215 22% 9%)',
                    cursor: 'pointer', padding: 5, outline: 'none',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                  <img src={url} alt={s.label} style={{ width: 50, height: 50, objectFit: 'contain' }}
                    onError={e => { const img = e.target as HTMLImageElement; if (!img.dataset.t) { img.dataset.t = '1'; img.src = `/${s.file}`; } }} />
                  <span style={{ fontSize: 8, color: 'hsl(215 14% 38%)', fontWeight: 600 }}>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Emoji tray ── */}
      {panel === 'emoji' && (
        <div className="hs" style={{ margin: '0 14px 6px', padding: '10px', borderRadius: 18, flexShrink: 0,
          background: 'hsl(225 26% 7%)', border: `1px solid ${col}28`,
          animation: 'fadeUp .18s ease', maxHeight: 170, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10,1fr)', gap: 2 }}>
            {EMOJIS.map(em => (
              <button key={em}
                onPointerDown={e => { e.preventDefault(); e.stopPropagation(); addEmoji(em); }}
                style={{ fontSize: 22, padding: 3, borderRadius: 8, border: 'none',
                  background: 'transparent', cursor: 'pointer', outline: 'none', lineHeight: 1 }}>
                {em}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Edit banner ── */}
      {editing && (
        <div style={{ margin: '0 14px 5px', padding: '9px 11px', borderRadius: 12, flexShrink: 0,
          background: `${col}10`, border: `1px solid ${col}30`, display: 'flex', alignItems: 'center', gap: 9 }}>
          <Pencil size={13} color={col} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: col, marginBottom: 1 }}>Editing</p>
            <p style={{ fontSize: 11, color: 'hsl(215 14% 40%)', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editing.text}</p>
          </div>
          <button onPointerDown={() => { setEdit(null); setTxt(''); }} style={IB}>
            <X size={12} color="hsl(215 18% 42%)" />
          </button>
        </div>
      )}

      {/* ── Reply banner ── */}
      {rep && !editing && (
        <div style={{ margin: '0 14px 5px', padding: '9px 11px', borderRadius: 12, flexShrink: 0,
          background: 'hsl(215 22% 8%)', border: `1px solid ${col}30`, display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 3, alignSelf: 'stretch', minHeight: 28, borderRadius: 2, background: col, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: col, marginBottom: 1 }}>↩ {rep.username || 'Miner'}</p>
            <p style={{ fontSize: 11, color: 'hsl(215 14% 40%)', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rep.message}</p>
          </div>
          <button onPointerDown={() => setRep(null)} style={IB}>
            <X size={12} color="hsl(215 18% 42%)" />
          </button>
        </div>
      )}

      {/* ── Input bar — always visible, never hidden under nav ── */}
      <div style={{ padding: '4px 14px 10px', flexShrink: 0 }}>
        {!user ? (
          <button onPointerDown={() => navigate('/auth')}
            style={{ width: '100%', padding: 15, borderRadius: 18, fontWeight: 700, fontSize: 14,
              cursor: 'pointer', background: 'linear-gradient(135deg,hsl(215 35% 52%),hsl(215 40% 40%))',
              border: 'none', color: 'white', outline: 'none',
              fontFamily: "'Creato Display',-apple-system,sans-serif" }}>
            Sign in to chat
          </button>
        ) : !canPost(ch) ? (
          <div style={{ padding: 13, borderRadius: 16, textAlign: 'center',
            background: 'hsl(215 22% 8%)', border: '1px solid hsl(215 20% 13%)' }}>
            <p style={{ fontSize: 12, color: 'hsl(215 18% 35%)', margin: 0 }}>
              🔒 Join {ch === 'alpha' ? 'Alpha' : 'Omega'} team to chat here
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7,
            background: 'hsl(225 26% 7%)', border: `1.5px solid ${col}30`,
            borderRadius: 22, padding: '7px 7px 7px 11px' }}>

            {/* Image */}
            {!editing && (
              <label htmlFor={fileId.current}
                style={{ width: 33, height: 33, borderRadius: 10, flexShrink: 0,
                  background: uploading ? `${col}20` : 'hsl(215 22% 12%)',
                  border: '1px solid hsl(215 22% 17%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                {uploading
                  ? <div style={{ width: 13, height: 13, borderRadius: '50%',
                      border: `2px solid ${col}25`, borderTopColor: col, animation: 'spin .8s linear infinite' }} />
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="hsl(215 25% 48%)" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                }
                <input id={fileId.current} type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  style={{ display: 'none' }} onChange={pickImage} />
              </label>
            )}

            {/* Sticker */}
            {!editing && (
              <button
                onClick={() => setPanel(p => p === 'stickers' ? 'none' : 'stickers')}
                style={{ width: 33, height: 33, borderRadius: 10, flexShrink: 0,
                  background: panel === 'stickers' ? `${col}20` : 'hsl(215 22% 12%)',
                  border: `1px solid ${panel === 'stickers' ? `${col}38` : 'hsl(215 22% 17%)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', outline: 'none' }}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>🐉</span>
              </button>
            )}

            {/* Emoji */}
            {!editing && (
              <button
                onClick={() => setPanel(p => p === 'emoji' ? 'none' : 'emoji')}
                style={{ width: 33, height: 33, borderRadius: 10, flexShrink: 0,
                  background: panel === 'emoji' ? `${col}20` : 'hsl(215 22% 12%)',
                  border: `1px solid ${panel === 'emoji' ? `${col}38` : 'hsl(215 22% 17%)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', outline: 'none' }}>
                <Smile size={14} color={panel === 'emoji' ? col : 'hsl(215 25% 48%)'} />
              </button>
            )}

            {/* Text area */}
            <textarea ref={inpRef} value={editVal} onChange={e => setVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editing ? saveEdit() : sendText(); }
                if (e.key === 'Escape') { if (editing) { setEdit(null); setTxt(''); } else if (rep) setRep(null); }
              }}
              placeholder={editing ? 'Edit message…' : rep ? `Reply to ${rep.username ?? 'them'}…` : 'Type a message…'}
              rows={1}
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 14, color: 'hsl(215 18% 88%)', resize: 'none',
                fontFamily: "'Creato Display',-apple-system,sans-serif",
                lineHeight: '1.5', maxHeight: 80, overflow: 'auto', paddingTop: 7, paddingBottom: 7 }} />

            {/* Send */}
            <button
              onPointerDown={e => { e.preventDefault(); e.stopPropagation(); editing ? saveEdit() : sendText(); }}
              style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, outline: 'none',
                cursor: 'pointer', transition: 'all .18s',
                background: hasTxt ? `${col}22` : 'hsl(215 22% 10%)',
                border: `1px solid ${hasTxt ? `${col}45` : 'hsl(215 22% 15%)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {editing
                ? <Check size={15} color={hasTxt ? col : 'hsl(215 18% 30%)'} />
                : <Send  size={14} color={hasTxt ? col : 'hsl(215 18% 30%)'} />
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const NB: React.CSSProperties = {
  width: 38, height: 38, borderRadius: 13,
  background: 'hsl(215 25% 10%)', border: '1px solid hsl(215 22% 16%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', outline: 'none', flexShrink: 0,
};
const IB: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 8,
  background: 'hsl(215 22% 12%)', border: 'none',
  cursor: 'pointer', outline: 'none', flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
