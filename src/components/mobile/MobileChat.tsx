import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useArenaMembership } from '@/hooks/useArenaMembership';
import { supabase } from '@/integrations/supabase/client';
import {
  ChevronLeft, Send, RefreshCw, X, CornerUpLeft,
  Copy, Trash2, Pencil, Check, Smile
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
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

// ── Stickers — use Supabase Storage for universal APK + web support ──────────
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';

// Get sticker URL that works in both web and Capacitor APK
// In Capacitor, window.location is capacitor://localhost so relative paths fail.
// Solution: use Supabase Storage public URL (always absolute, always works).
// Fallback: window.location.origin + path for web dev.
function getStickerUrl(filename: string): string {
  if (SUPABASE_URL) {
    return `${SUPABASE_URL}/storage/v1/object/public/chat-images/stickers/${filename}`;
  }
  // Dev fallback
  return `${window.location.protocol}//${window.location.host}/${filename}`;
}

const STICKERS = [
  { id: 's1', filename: 'sticker_1.png', label: 'Welcome' },
  { id: 's2', filename: 'sticker_2.png', label: 'Rich' },
  { id: 's3', filename: 'sticker_3.png', label: 'Verified' },
  { id: 's4', filename: 'sticker_4.png', label: 'Wen?' },
  { id: 's5', filename: 'sticker_5.png', label: 'LOL' },
];

// ── Channels ────────────────────────────────────────────────────────────────────
const CHANNELS = [
  { id: 'general' as Channel, label: 'General', icon: '🌐', desc: 'Everyone can chat here', lock: null },
  { id: 'alpha' as Channel, label: 'Alpha', icon: '⬡', desc: 'Alpha members only', lock: 'alpha' },
  { id: 'omega' as Channel, label: 'Omega', icon: '⬡', desc: 'Omega members only', lock: 'omega' },
  { id: 'nexus_exchange' as Channel, label: 'Nexus', icon: '📡', desc: 'Share Nexus UIDs & ARX-P', lock: null },
];

const CC: Record<Channel, string> = {
  general: 'hsl(215 35% 62%)',
  alpha: 'hsl(195 80% 50%)',
  omega: 'hsl(255 60% 65%)',
  nexus_exchange: 'hsl(155 45% 50%)',
};

const fmtTime = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

// ── Avatar ──────────────────────────────────────────────────────────────────────
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

// ── Clipboard helper ────────────────────────────────────────────────────────────
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch (_) {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (_) { return false; }
}

type MenuState = { msg: Msg; x: number; y: number } | null;
type EditState = { id: string; text: string } | null;

// ── Main component ──────────────────────────────────────────────────────────────
export default function MobileChat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { membership } = useArenaMembership();

  const [ch, setCh] = useState<Channel>('general');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [load, setLoad] = useState(true);
  const [dbOk, setDbOk] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [rep, setRep] = useState<Msg | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [editing, setEditing] = useState<EditState>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showStickers, setShowStickers] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');

  // ── Refs ────────────────────────────────────────────────────────────────────
  const botRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const inpRef = useRef<HTMLTextAreaElement>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputId = useRef(`chat-file-${Date.now()}`);
  // Track deleted message IDs so realtime DELETE event doesn't bounce them back
  const deletedIds = useRef<Set<string>>(new Set());
  // Store txt in a ref too so send() always reads latest value even if state hasn't flushed
  const txtRef = useRef('');
  const [txt, _setTxt] = useState('');
  const setTxt = (v: string) => { txtRef.current = v; _setTxt(v); };

  // Persist userId — never null when menu renders
  const [myUserId, setMyUserId] = useState<string | null>(null);
  useEffect(() => { if (user?.id) setMyUserId(user.id); }, [user?.id]);
  const uid = myUserId || user?.id || null;

  const uname = profile?.username || user?.email?.split('@')[0] || 'Miner';

  const canPost = (c: Channel) =>
    c === 'alpha' ? membership?.club === 'alpha' :
    c === 'omega' ? membership?.club === 'omega' : true;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  // ── Load messages ────────────────────────────────────────────────────────────
  const loadMsgs = useCallback(async (c: Channel) => {
    setLoad(true);
    const { data, error } = await supabase
      .from('chat_messages').select('*')
      .eq('channel', c).order('created_at', { ascending: true }).limit(100);
    if (error) { setDbOk(error.code === '42P01' ? false : null); setMsgs([]); }
    else { setDbOk(true); setMsgs((data || []) as Msg[]); }
    setLoad(false);
  }, []);

  useEffect(() => { loadMsgs(ch); }, [ch, loadMsgs, refreshKey]);

  // ── Realtime ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (dbOk !== true) return;
    if (subRef.current) { supabase.removeChannel(subRef.current); subRef.current = null; }
    const s = supabase.channel(`chat-${ch}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel=eq.${ch}` }, p => {
        const m = p.new as Msg;
        // Don't re-add messages we just optimistically deleted
        if (deletedIds.current.has(m.id)) return;
        setMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `channel=eq.${ch}` }, p => {
        const m = p.new as Msg;
        setMsgs(prev => prev.map(x => x.id === m.id ? { ...x, message: m.message } : x));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, p => {
        const id = (p.old as Msg).id;
        // Already removed optimistically — just clean up the tracking set
        deletedIds.current.delete(id);
        setMsgs(prev => prev.filter(x => x.id !== id));
      })
      .subscribe();
    subRef.current = s;
    return () => { if (subRef.current) { supabase.removeChannel(subRef.current); subRef.current = null; } };
  }, [ch, dbOk]);

  useEffect(() => { botRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  // ── Close menu/stickers on outside tap ──────────────────────────────────────
  useEffect(() => {
    if (!menu && !showStickers) return;
    const close = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-noclosemenu]')) return;
      setMenu(null);
      setShowStickers(false);
    };
    setTimeout(() => {
      document.addEventListener('touchend', close, { passive: true });
      document.addEventListener('mouseup', close);
    }, 50);
    return () => {
      document.removeEventListener('touchend', close);
      document.removeEventListener('mouseup', close);
    };
  }, [menu, showStickers]);

  // ── Send text (uses ref to avoid stale closure) ──────────────────────────────
  // repRef so send() always has latest rep value without stale closure
  const repRef = useRef<Msg | null>(null);
  // Keep repRef in sync
  useEffect(() => { repRef.current = rep; }, [rep]);

  const send = useCallback(async () => {
    const currentTxt = txtRef.current.trim();
    if (!user || !currentTxt || busy) return;
    // Capture rep before clearing state
    const currentRep = repRef.current;
    setTxt('');
    setRep(null);
    setBusy(true);
    const payload: Record<string, unknown> = {
      channel: ch, user_id: user.id, username: uname,
      avatar_url: profile?.avatar_url || null,
      message: currentTxt, msg_type: 'text',
    };
    if (currentRep) {
      payload.reply_to_id = currentRep.id;
      payload.reply_to_username = currentRep.username || 'Miner';
      payload.reply_to_message = currentRep.message.slice(0, 80);
    }
    const { error } = await supabase.from('chat_messages').insert(payload);
    if (error) {
      if (error.code === '42P01') setDbOk(false);
      else { setTxt(currentTxt); setRep(currentRep); }
    }
    setBusy(false);
  }, [user, busy, ch, uname, profile]);

  // ── Send sticker ─────────────────────────────────────────────────────────────
  const sendSticker = useCallback(async (stickerUrl: string) => {
    if (!user || !canPost(ch) || busy) return;
    setShowStickers(false);
    setBusy(true);
    const { error } = await supabase.from('chat_messages').insert({
      channel: ch, user_id: user.id, username: uname,
      avatar_url: profile?.avatar_url || null,
      message: '🐉 sticker', msg_type: 'sticker', image_url: stickerUrl,
    });
    if (error) showToast('Failed to send sticker');
    setBusy(false);
  }, [user, busy, ch, uname, profile, canPost]);

  // ── Image upload via label click (works in Android WebView) ─────────────────
  const handleImagePick = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 8 * 1024 * 1024) { showToast('Image must be under 8MB'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `chat/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('chat-images').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(path);
      await supabase.from('chat_messages').insert({
        channel: ch, user_id: user.id, username: uname,
        avatar_url: profile?.avatar_url || null,
        message: '📷 Image', msg_type: 'image', image_url: urlData.publicUrl,
      });
      showToast('Image sent!');
    } catch (err: any) {
      showToast(err?.message?.includes('Bucket') ? 'Storage bucket not found' : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }, [user, ch, uname, profile]);

  // ── Edit save ─────────────────────────────────────────────────────────────────
  const saveEdit = useCallback(async () => {
    if (!editing || !editing.text.trim() || saving) return;
    setSaving(true);
    const newText = editing.text.trim();
    const { error } = await supabase.from('chat_messages')
      .update({ message: newText })
      .eq('id', editing.id).eq('user_id', uid || '');
    if (!error) {
      setMsgs(p => p.map(m => m.id === editing!.id ? { ...m, message: newText } : m));
      setEditing(null);
      setTxt('');
    } else showToast('Edit failed');
    setSaving(false);
  }, [editing, saving, uid]);

  const cancelEdit = useCallback(() => {
    setEditing(null);
    setTxt('');
    setTimeout(() => inpRef.current?.focus(), 80);
  }, []);

  // ── Delete — optimistic, no navigation side effects ──────────────────────────
  const doDelete = useCallback(async (m: Msg) => {
    setMenu(null);
    // Track this ID so realtime event can't bounce it back
    deletedIds.current.add(m.id);
    // Optimistically remove from UI immediately
    setMsgs(prev => prev.filter(x => x.id !== m.id));
    setDeleting(m.id);
    const { error } = await supabase.from('chat_messages').delete()
      .eq('id', m.id).eq('user_id', uid || '');
    if (error) {
      // Restore on failure and remove from tracking
      deletedIds.current.delete(m.id);
      setMsgs(prev => {
        const exists = prev.some(x => x.id === m.id);
        return exists ? prev : [...prev, m].sort((a, b) => a.created_at.localeCompare(b.created_at));
      });
      showToast('Delete failed');
    }
    setDeleting(null);
  }, [uid]);

  // ── Context menu actions ──────────────────────────────────────────────────────
  const doReply = useCallback((m: Msg) => {
    setRep(m); setMenu(null); setEditing(null); setTxt('');
    setTimeout(() => { inpRef.current?.focus(); }, 150);
  }, []);

  const doCopy = useCallback(async (m: Msg) => {
    setMenu(null);
    const ok2 = await copyToClipboard(m.message);
    showToast(ok2 ? '✓ Copied' : 'Copy failed');
  }, []);

  const doEdit = useCallback((m: Msg) => {
    setMenu(null); setRep(null);
    setEditing({ id: m.id, text: m.message });
    setTimeout(() => inpRef.current?.focus(), 150);
  }, []);

  // ── Long press ────────────────────────────────────────────────────────────────
  const startPress = useCallback((e: React.TouchEvent | React.MouseEvent, m: Msg) => {
    const touch = 'touches' in e ? e.touches[0] : (e as unknown as MouseEvent);
    pressTimer.current = setTimeout(() => {
      setShowStickers(false);
      setMenu({ msg: m, x: touch.clientX, y: touch.clientY });
    }, 500);
  }, []);

  const endPress = useCallback(() => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  }, []);

  const col = CC[ch];
  // Editing overrides txt with editing.text
  const inputValue = editing ? editing.text : txt;
  const setInputValue = (v: string) => {
    if (editing) setEditing(prev => prev ? { ...prev, text: v } : null);
    else setTxt(v);
  };
  const canSend = editing
    ? editing.text.trim().length > 0 && !saving
    : txtRef.current.trim().length > 0 && !busy;

  const isOwnMsg = (m: Msg) => !!uid && m.user_id === uid;

  return (
    <div style={{
      height: '100vh', background: 'hsl(225 30% 3%)', display: 'flex',
      flexDirection: 'column', fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif",
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeInMenu{from{opacity:0;transform:scale(0.9) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastAnim{0%{opacity:0;transform:translateX(-50%) translateY(8px)}15%{opacity:1;transform:translateX(-50%) translateY(0)}80%{opacity:1}100%{opacity:0;transform:translateX(-50%) translateY(-4px)}}
        .chat-file-label{display:flex;align-items:center;justify-content:center;cursor:pointer}
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 88, left: '50%', zIndex: 10001,
          background: 'hsl(225 28% 14%)', border: '1px solid hsl(215 30% 24%)',
          color: 'hsl(215 18% 88%)', padding: '9px 22px', borderRadius: 22,
          fontSize: 13, fontWeight: 600, pointerEvents: 'none',
          animation: 'toastAnim 2s ease forwards',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {toast}
        </div>
      )}

      {/* Context menu — stops ALL propagation */}
      {menu && (
        <div
          data-noclosemenu="1"
          style={{
            position: 'fixed', zIndex: 9999,
            top: Math.min(menu.y + 10, window.innerHeight - 290),
            left: Math.min(Math.max(menu.x - 125, 12), window.innerWidth - 252),
            background: 'hsl(225 26% 9%)', border: '1px solid hsl(215 22% 18%)',
            borderRadius: 20, overflow: 'hidden', minWidth: 240,
            boxShadow: '0 20px 70px rgba(0,0,0,0.8)',
            animation: 'fadeInMenu 0.14s ease',
          }}
          onTouchStart={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
        >
          {/* Preview */}
          <div style={{ padding: '11px 16px', borderBottom: '1px solid hsl(215 22% 13%)', background: 'hsl(225 28% 7%)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: col, marginBottom: 3 }}>{menu.msg.username || 'Miner'}</p>
            {menu.msg.msg_type === 'sticker' ? (
              <p style={{ fontSize: 12, color: 'hsl(215 18% 48%)' }}>🐉 Sticker</p>
            ) : menu.msg.msg_type === 'image' ? (
              <p style={{ fontSize: 12, color: 'hsl(215 18% 48%)' }}>📷 Image</p>
            ) : (
              <p style={{ fontSize: 12, color: 'hsl(215 18% 58%)', lineHeight: 1.4,
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {menu.msg.message}
              </p>
            )}
          </div>
          <MenuBtn icon={<CornerUpLeft size={15} color="hsl(215 35% 62%)" />} label="Reply"
            onTap={() => doReply(menu.msg)} border />
          {(!menu.msg.msg_type || menu.msg.msg_type === 'text') && (
            <MenuBtn icon={<Copy size={15} color="hsl(215 25% 52%)" />} label="Copy text"
              onTap={() => doCopy(menu.msg)} border={isOwnMsg(menu.msg)} />
          )}
          {isOwnMsg(menu.msg) && (
            <>
              {(!menu.msg.msg_type || menu.msg.msg_type === 'text') && (
                <MenuBtn icon={<Pencil size={15} color={col} />} label="Edit message"
                  onTap={() => doEdit(menu.msg)} border />
              )}
              <MenuBtn icon={<Trash2 size={15} color="hsl(0 60% 56%)" />} label="Delete"
                onTap={() => doDelete(menu.msg)} labelColor="hsl(0 60% 62%)" border={false} />
            </>
          )}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '52px 20px 0', flexShrink: 0 }}>
        <button onPointerDown={e => { e.stopPropagation(); navigate('/'); }} style={navBtn}>
          <ChevronLeft size={20} color="hsl(215 25% 55%)" />
        </button>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'hsl(215 20% 93%)' }}>Community</h1>
          <p style={{ fontSize: 11, color: col, marginTop: 1, fontWeight: 600 }}>
            {CHANNELS.find(c => c.id === ch)?.icon} {CHANNELS.find(c => c.id === ch)?.label}
          </p>
        </div>
        <button onPointerDown={() => setRefreshKey(k => k + 1)} style={navBtn}>
          <RefreshCw size={15} color="hsl(215 25% 55%)"
            style={{ animation: load ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* ── Channel tabs ── */}
      <div className="scrollbar-none" style={{ display: 'flex', gap: 7, padding: '12px 20px 0', overflowX: 'auto', flexShrink: 0 }}>
        {CHANNELS.map(c => {
          const ac = canPost(c.id); const ia = ch === c.id;
          return (
            <button key={c.id} onPointerDown={() => ac && setCh(c.id)} style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px',
              borderRadius: 22, fontSize: 11, fontWeight: 700, border: 'none',
              cursor: ac ? 'pointer' : 'not-allowed', outline: 'none', flexShrink: 0,
              background: ia ? `${CC[c.id]}22` : 'hsl(215 22% 10%)',
              color: ia ? CC[c.id] : ac ? 'hsl(215 18% 48%)' : 'hsl(215 14% 28%)',
              boxShadow: ia ? `0 0 0 1.5px ${CC[c.id]}50` : `0 0 0 1px hsl(215 20% 16%)`,
              opacity: ac ? 1 : 0.45,
            }}>
              {c.icon} {c.label}
              {c.lock && !ac && ' 🔒'}
            </button>
          );
        })}
      </div>

      <div style={{ padding: '5px 20px 0', flexShrink: 0 }}>
        <p style={{ fontSize: 10, color: 'hsl(215 14% 28%)' }}>Hold a message to reply · edit · delete</p>
      </div>

      {dbOk === false && (
        <div style={{ margin: '8px 20px', padding: '11px 14px', borderRadius: 14,
          background: 'hsl(38 55% 52% / 0.08)', border: '1px solid hsl(38 55% 52% / 0.22)', flexShrink: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'hsl(38 55% 58%)' }}>⚙️ Chat table not found — run Supabase migration</p>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="scrollbar-none" style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 0', minHeight: 0 }}>
        {load && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%',
              border: `2px solid ${col}20`, borderTopColor: col, animation: 'spin 1s linear infinite' }} />
          </div>
        )}
        {!load && dbOk === true && msgs.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>{CHANNELS.find(c => c.id === ch)?.icon}</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'hsl(215 18% 46%)' }}>No messages yet</p>
            <p style={{ fontSize: 11, color: 'hsl(215 14% 30%)', marginTop: 4 }}>Be the first to say something!</p>
          </div>
        )}

        {dbOk === true && msgs.map((m, i) => {
          const me = isOwnMsg(m);
          const showHdr = i === 0 || msgs[i - 1].user_id !== m.user_id;
          const isDeleting = deleting === m.id;
          const isSticker = m.msg_type === 'sticker';
          const isImg = m.msg_type === 'image';

          return (
            <div
              key={m.id}
              onMouseDown={e => { e.stopPropagation(); startPress(e, m); }}
              onMouseUp={endPress}
              onMouseLeave={endPress}
              onTouchStart={e => { e.stopPropagation(); startPress(e, m); }}
              onTouchEnd={endPress}
              onTouchCancel={endPress}
              onTouchMove={endPress}
              style={{
                marginBottom: showHdr ? 10 : 3,
                display: 'flex', flexDirection: me ? 'row-reverse' : 'row',
                alignItems: 'flex-end', gap: 7,
                WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
                opacity: isDeleting ? 0.3 : 1, transition: 'opacity 0.18s',
              }}
            >
              {!me && showHdr && <Av url={m.avatar_url} name={m.username} col={col} sz={28} />}
              {!me && !showHdr && <div style={{ width: 28, flexShrink: 0 }} />}

              <div style={{ maxWidth: isSticker ? '52%' : '75%' }}>
                {showHdr && !me && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{m.username || 'Miner'}</span>
                    <span style={{ fontSize: 9, color: 'hsl(215 14% 28%)' }}>{fmtTime(m.created_at)}</span>
                  </div>
                )}

                {/* Reply quote */}
                {m.reply_to_id && m.reply_to_message && (
                  <div style={{
                    marginBottom: 2, padding: '6px 10px',
                    borderRadius: '11px 11px 0 0',
                    background: 'hsl(215 22% 10%)', borderLeft: `3px solid ${col}`,
                  }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: col, marginBottom: 1 }}>
                      {m.reply_to_username || 'Miner'}
                    </p>
                    <p style={{ fontSize: 11, color: 'hsl(215 14% 46%)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>
                      {m.reply_to_message}
                    </p>
                  </div>
                )}

                {/* Sticker */}
                {isSticker && m.image_url ? (
                  <img src={m.image_url} alt="sticker"
                    style={{ width: 120, height: 120, objectFit: 'contain', display: 'block',
                      filter: 'drop-shadow(0 3px 12px rgba(0,0,0,0.4))', borderRadius: 8 }}
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                ) : isImg && m.image_url ? (
                  <div style={{ borderRadius: me ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    overflow: 'hidden', border: `1px solid ${col}25`, maxWidth: 220 }}>
                    <img src={m.image_url} alt="img"
                      style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }}
                      onError={e => { (e.target as HTMLImageElement).alt = '⚠️ Failed'; }} />
                  </div>
                ) : (
                  /* Text bubble */
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

                {me && (
                  <p style={{ fontSize: 9, color: 'hsl(215 14% 24%)', marginTop: 2, textAlign: 'right' }}>
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
      {showStickers && (
        <div data-noclosemenu="1" style={{
          margin: '0 16px 6px', padding: '12px', borderRadius: 18,
          background: 'hsl(225 26% 7%)', border: `1px solid ${col}28`,
          flexShrink: 0, animation: 'slideUp 0.18s ease',
        }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: col, marginBottom: 9,
            textTransform: 'uppercase', letterSpacing: '0.14em' }}>
            Arxon Stickers
          </p>
          <div style={{ display: 'flex', gap: 9, overflowX: 'auto' }} className="scrollbar-none">
            {STICKERS.map(s => {
              const url = getStickerUrl(s.filename);
              return (
                <button
                  key={s.id}
                  data-noclosemenu="1"
                  onPointerDown={e => { e.preventDefault(); e.stopPropagation(); sendSticker(url); }}
                  style={{
                    flexShrink: 0, width: 76, height: 76, borderRadius: 14,
                    border: '1px solid hsl(215 22% 15%)', background: 'hsl(215 22% 9%)',
                    cursor: 'pointer', padding: 5, outline: 'none',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                  }}
                >
                  <img src={url} alt={s.label}
                    style={{ width: 50, height: 50, objectFit: 'contain' }}
                    onError={e => {
                      // Fallback: try the other URL format
                      const img = e.target as HTMLImageElement;
                      if (!img.dataset.retried) {
                        img.dataset.retried = '1';
                        img.src = url.startsWith('/') ? `${window.location.origin}${url}` : `/${s.filename}`;
                      }
                    }}
                  />
                  <span style={{ fontSize: 8, color: 'hsl(215 14% 38%)', fontWeight: 600 }}>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Edit banner ── */}
      {editing && (
        <div style={{ margin: '0 16px 5px', padding: '9px 11px', borderRadius: 12,
          background: `${col}10`, border: `1px solid ${col}30`,
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 9 }}>
          <Pencil size={13} color={col} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: col, marginBottom: 1 }}>Editing message</p>
            <p style={{ fontSize: 11, color: 'hsl(215 14% 40%)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editing.text}</p>
          </div>
          <button onPointerDown={cancelEdit} style={xBtn}><X size={12} color="hsl(215 18% 40%)" /></button>
        </div>
      )}

      {/* ── Reply banner ── */}
      {rep && !editing && (
        <div style={{ margin: '0 16px 5px', padding: '9px 11px', borderRadius: 12,
          background: 'hsl(215 22% 8%)', border: `1px solid ${col}30`,
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 3, alignSelf: 'stretch', minHeight: 28, borderRadius: 2, background: col, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: col, marginBottom: 1 }}>↩ {rep.username || 'Miner'}</p>
            <p style={{ fontSize: 11, color: 'hsl(215 14% 40%)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rep.message}</p>
          </div>
          <button onPointerDown={() => setRep(null)} style={xBtn}><X size={12} color="hsl(215 18% 40%)" /></button>
        </div>
      )}

      {/* ── Input bar ── */}
      {user && dbOk === true ? (
        <div style={{ padding: '4px 16px 14px', flexShrink: 0 }}>
          {!canPost(ch) ? (
            <div style={{ padding: '13px', borderRadius: 16, textAlign: 'center',
              background: 'hsl(215 22% 8%)', border: '1px solid hsl(215 20% 13%)' }}>
              <p style={{ fontSize: 12, color: 'hsl(215 18% 35%)' }}>
                🔒 Join {ch === 'alpha' ? 'Alpha' : 'Omega'} team to chat here
              </p>
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 7,
              background: 'hsl(225 26% 7%)', border: `1.5px solid ${col}30`,
              borderRadius: 22, padding: '7px 7px 7px 11px',
            }}>
              {/* Image upload — uses <label> which works in Android WebView unlike .click() */}
              {!editing && (
                <label htmlFor={fileInputId.current} className="chat-file-label"
                  style={{
                    width: 33, height: 33, borderRadius: 10, flexShrink: 0,
                    background: uploading ? `${col}20` : 'hsl(215 22% 12%)',
                    border: '1px solid hsl(215 22% 17%)',
                  }}>
                  {uploading
                    ? <div style={{ width: 13, height: 13, borderRadius: '50%',
                        border: `2px solid ${col}25`, borderTopColor: col, animation: 'spin 0.8s linear infinite' }} />
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="hsl(215 25% 48%)" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                      </svg>
                  }
                  <input id={fileInputId.current} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
                    style={{ display: 'none' }} onChange={handleImagePick} />
                </label>
              )}

              {/* Sticker button */}
              {!editing && (
                <button
                  data-noclosemenu="1"
                  onPointerDown={e => { e.preventDefault(); e.stopPropagation(); setShowStickers(v => !v); setMenu(null); }}
                  style={{
                    width: 33, height: 33, borderRadius: 10, flexShrink: 0,
                    background: showStickers ? `${col}20` : 'hsl(215 22% 12%)',
                    border: `1px solid ${showStickers ? `${col}38` : 'hsl(215 22% 17%)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', outline: 'none',
                  }}
                >
                  <Smile size={14} color={showStickers ? col : 'hsl(215 25% 48%)'} />
                </button>
              )}

              {/* Textarea */}
              <textarea
                ref={inpRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editing ? saveEdit() : send(); }
                  if (e.key === 'Escape') { if (editing) cancelEdit(); else if (rep) setRep(null); }
                }}
                placeholder={editing ? 'Edit your message…' : rep ? `Reply to ${rep.username || 'them'}…` : 'Type a message…'}
                rows={1}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontSize: 14, color: 'hsl(215 18% 88%)', resize: 'none',
                  fontFamily: "'Creato Display',-apple-system,sans-serif",
                  lineHeight: '1.5', maxHeight: 80, overflow: 'auto',
                  paddingTop: 7, paddingBottom: 7,
                }}
              />

              {/* Send / Confirm */}
              <button
                onPointerDown={e => { e.preventDefault(); e.stopPropagation(); editing ? saveEdit() : send(); }}
                style={{
                  width: 36, height: 36, borderRadius: 12, flexShrink: 0, outline: 'none',
                  cursor: 'pointer',
                  background: (editing ? editing.text.trim() : txtRef.current.trim())
                    ? `${col}22` : 'hsl(215 22% 10%)',
                  border: `1px solid ${(editing ? editing.text.trim() : txtRef.current.trim())
                    ? `${col}45` : 'hsl(215 22% 15%)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .18s',
                }}
              >
                {editing
                  ? <Check size={15} color={editing.text.trim() ? col : 'hsl(215 18% 28%)'} />
                  : <Send size={14} color={txtRef.current.trim() ? col : 'hsl(215 18% 28%)'} />
                }
              </button>
            </div>
          )}
        </div>
      ) : !user ? (
        <div style={{ padding: '10px 16px 14px', flexShrink: 0 }}>
          <button onPointerDown={() => navigate('/auth')} style={{
            width: '100%', padding: '15px', borderRadius: 18, fontWeight: 700, fontSize: 14,
            cursor: 'pointer', background: 'linear-gradient(135deg,hsl(215 35% 52%),hsl(215 40% 40%))',
            border: 'none', color: 'white', outline: 'none',
            fontFamily: "'Creato Display',-apple-system,sans-serif",
          }}>
            Sign In to Chat
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ── MenuBtn helper ──────────────────────────────────────────────────────────────
function MenuBtn({ icon, label, onTap, border = true, labelColor }: {
  icon: React.ReactNode; label: string; onTap: () => void;
  border?: boolean; labelColor?: string;
}) {
  return (
    <button
      data-noclosemenu="1"
      onPointerDown={e => { e.preventDefault(); e.stopPropagation(); onTap(); }}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', outline: 'none',
        borderBottom: border ? '1px solid hsl(215 22% 11%)' : 'none',
      }}
    >
      {icon}
      <span style={{ fontSize: 14, fontWeight: 600, color: labelColor || 'hsl(215 18% 84%)' }}>{label}</span>
    </button>
  );
}

const navBtn: React.CSSProperties = {
  width: 38, height: 38, borderRadius: 13, background: 'hsl(215 25% 10%)',
  border: '1px solid hsl(215 22% 16%)', display: 'flex', alignItems: 'center',
  justifyContent: 'center', cursor: 'pointer', outline: 'none',
};

const xBtn: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 8, background: 'hsl(215 22% 12%)',
  border: 'none', cursor: 'pointer', outline: 'none', flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
