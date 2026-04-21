import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useArenaMembership } from '@/hooks/useArenaMembership';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, Send, RefreshCw, X, CornerUpLeft, Copy, Trash2, Pencil, Check, Smile, Menu } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────
type Channel = 'general' | 'alpha' | 'omega' | 'nexus_exchange';
type MsgType = 'text' | 'image' | 'sticker';

interface Msg {
  id: string; channel: Channel; user_id: string;
  username: string | null; avatar_url: string | null;
  message: string; msg_type?: MsgType; image_url?: string | null;
  created_at: string; reply_to_id?: string | null;
  reply_to_username?: string | null; reply_to_message?: string | null;
}

// ── Channels ──────────────────────────────────────────────────────────────
const CHANNELS = [
  { id: 'general' as Channel, label: 'General', icon: '🌐', desc: 'Open to everyone', lock: null },
  { id: 'alpha' as Channel, label: 'Alpha Team', icon: '⬡', desc: 'Alpha members only', lock: 'alpha' },
  { id: 'omega' as Channel, label: 'Omega Team', icon: '⬡', desc: 'Omega members only', lock: 'omega' },
  { id: 'nexus_exchange' as Channel, label: 'Nexus Exchange', icon: '📡', desc: 'Share Nexus UIDs & ARX-P', lock: null },
];

const CC: Record<Channel, string> = {
  general: 'hsl(215 35% 62%)', alpha: 'hsl(195 80% 50%)',
  omega: 'hsl(255 60% 65%)', nexus_exchange: 'hsl(155 45% 50%)',
};

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const getStickerUrl = (f: string) =>
  SUPABASE_URL ? `${SUPABASE_URL}/storage/v1/object/public/chat-images/stickers/${f}`
    : `${window.location.protocol}//${window.location.host}/${f}`;

const STICKERS = [
  { id: 's1', filename: 'sticker_1.png', label: 'Welcome' },
  { id: 's2', filename: 'sticker_2.png', label: 'Rich' },
  { id: 's3', filename: 'sticker_3.png', label: 'Verified' },
  { id: 's4', filename: 'sticker_4.png', label: 'Wen?' },
  { id: 's5', filename: 'sticker_5.png', label: 'LOL' },
];

// Emoji rows
const EMOJIS = [
  '😀','😂','🤣','😍','🥰','😎','🤩','😏','😅','🤔',
  '🔥','💯','💪','👀','🚀','💰','🏆','⚡','🎯','✅',
  '👍','❤️','😭','🙏','💎','🌙','⭐','🎉','💸','🤑',
  '😤','😱','🤯','👏','🫡','🥳','😴','🤝','💬','🎮',
];

const fmtTime = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

async function copyToClipboard(text: string) {
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } } catch {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.cssText = 'position:fixed;top:-9999px;opacity:0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand('copy'); document.body.removeChild(ta); return ok;
  } catch { return false; }
}

function Av({ url, name, col, sz = 30 }: { url: string | null; name: string | null; col: string; sz?: number }) {
  const [err, setErr] = useState(false);
  if (url && !err) return (
    <div style={{ width: sz, height: sz, borderRadius: sz * 0.35, overflow: 'hidden', flexShrink: 0, border: `1.5px solid ${col}30` }}>
      <img src={url} alt="" onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
  );
  return (
    <div style={{ width: sz, height: sz, borderRadius: sz * 0.35, flexShrink: 0, fontSize: sz * 0.42,
      fontWeight: 700, background: `${col}18`, border: `1.5px solid ${col}30`, color: col,
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

type MenuState = { msg: Msg; x: number; y: number } | null;
type EditState = { id: string; text: string } | null;
type Panel = 'none' | 'stickers' | 'emoji' | 'channels';

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
  const [ctxMenu, setCtxMenu] = useState<MenuState>(null);
  const [editing, setEditing] = useState<EditState>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>('none');
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState('');

  const botRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const inpRef = useRef<HTMLTextAreaElement>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputId = useRef(`cf-${Date.now()}`);
  const deletedIds = useRef(new Set<string>());
  const txtRef = useRef('');
  const repRef = useRef<Msg | null>(null);
  const [txt, _setTxt] = useState('');
  const setTxt = (v: string) => { txtRef.current = v; _setTxt(v); };
  useEffect(() => { repRef.current = rep; }, [rep]);

  const [myUserId, setMyUserId] = useState<string | null>(null);
  useEffect(() => { if (user?.id) setMyUserId(user.id); }, [user?.id]);
  const uid = myUserId || user?.id || null;
  const uname = profile?.username || user?.email?.split('@')[0] || 'Miner';
  const canPost = (c: Channel) =>
    c === 'alpha' ? membership?.club === 'alpha' :
    c === 'omega' ? membership?.club === 'omega' : true;
  const isOwnMsg = (m: Msg) => !!uid && m.user_id === uid;

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2000); };

  // ── Load ────────────────────────────────────────────────────────────────
  const loadMsgs = useCallback(async (c: Channel) => {
    setLoad(true);
    const { data, error } = await supabase.from('chat_messages').select('*')
      .eq('channel', c).order('created_at', { ascending: true }).limit(100);
    if (error) { setDbOk(error.code === '42P01' ? false : null); setMsgs([]); }
    else { setDbOk(true); setMsgs((data || []) as Msg[]); }
    setLoad(false);
  }, []);

  useEffect(() => { loadMsgs(ch); }, [ch, loadMsgs, refreshKey]);

  // ── Realtime ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (dbOk !== true) return;
    if (subRef.current) { supabase.removeChannel(subRef.current); subRef.current = null; }
    const s = supabase.channel(`chat-${ch}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel=eq.${ch}` }, p => {
        const m = p.new as Msg;
        if (deletedIds.current.has(m.id)) return;
        setMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `channel=eq.${ch}` }, p => {
        const m = p.new as Msg;
        setMsgs(prev => prev.map(x => x.id === m.id ? { ...x, message: m.message } : x));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, p => {
        const id = (p.old as Msg).id;
        deletedIds.current.delete(id);
        setMsgs(prev => prev.filter(x => x.id !== id));
      })
      .subscribe();
    subRef.current = s;
    return () => { if (subRef.current) { supabase.removeChannel(subRef.current); subRef.current = null; } };
  }, [ch, dbOk]);

  useEffect(() => { botRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  // Close panels on outside tap
  useEffect(() => {
    if (panel === 'none' && !ctxMenu) return;
    const close = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-noc]')) return;
      setCtxMenu(null);
      setPanel('none');
    };
    setTimeout(() => {
      document.addEventListener('touchend', close, { passive: true });
      document.addEventListener('mouseup', close);
    }, 50);
    return () => { document.removeEventListener('touchend', close); document.removeEventListener('mouseup', close); };
  }, [panel, ctxMenu]);

  // ── Send ─────────────────────────────────────────────────────────────────
  const send = useCallback(async () => {
    const t = txtRef.current.trim();
    if (!user || !t || busy) return;
    const r = repRef.current;
    setTxt(''); setRep(null); setBusy(true);
    const payload: Record<string, unknown> = {
      channel: ch, user_id: user.id, username: uname,
      avatar_url: profile?.avatar_url || null, message: t, msg_type: 'text',
    };
    if (r) { payload.reply_to_id = r.id; payload.reply_to_username = r.username || 'Miner'; payload.reply_to_message = r.message.slice(0, 80); }
    const { error } = await supabase.from('chat_messages').insert(payload);
    if (error) { if (error.code === '42P01') setDbOk(false); else { setTxt(t); setRep(r); } }
    setBusy(false);
  }, [user, busy, ch, uname, profile]);

  // ── Send sticker ─────────────────────────────────────────────────────────
  const sendSticker = useCallback(async (url: string) => {
    if (!user || busy) return;
    setPanel('none'); setBusy(true);
    await supabase.from('chat_messages').insert({
      channel: ch, user_id: user.id, username: uname,
      avatar_url: profile?.avatar_url || null,
      message: '🐉 sticker', msg_type: 'sticker', image_url: url,
    });
    setBusy(false);
  }, [user, busy, ch, uname, profile]);

  // ── Insert emoji into text ────────────────────────────────────────────────
  const insertEmoji = useCallback((emoji: string) => {
    const cur = txtRef.current;
    const inp = inpRef.current;
    const pos = inp?.selectionStart ?? cur.length;
    const next = cur.slice(0, pos) + emoji + cur.slice(pos);
    setTxt(next);
    setTimeout(() => {
      if (inp) { inp.setSelectionRange(pos + emoji.length, pos + emoji.length); inp.focus(); }
    }, 10);
  }, []);

  // ── Image upload ──────────────────────────────────────────────────────────
  const handleImagePick = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 8 * 1024 * 1024) { showToast('Image must be under 8MB'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `chat/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('chat-images').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(path);
      await supabase.from('chat_messages').insert({
        channel: ch, user_id: user.id, username: uname,
        avatar_url: profile?.avatar_url || null,
        message: '📷 Image', msg_type: 'image', image_url: urlData.publicUrl,
      });
      showToast('📷 Image sent!');
    } catch (err: any) {
      showToast(err?.message?.includes('Bucket') ? 'Storage bucket not found' : 'Upload failed');
    } finally { setUploading(false); e.target.value = ''; }
  }, [user, ch, uname, profile]);

  // ── Edit ─────────────────────────────────────────────────────────────────
  const saveEdit = useCallback(async () => {
    if (!editing || !editing.text.trim() || saving) return;
    setSaving(true);
    const newText = editing.text.trim();
    const { error } = await supabase.from('chat_messages').update({ message: newText })
      .eq('id', editing.id).eq('user_id', uid || '');
    if (!error) { setMsgs(p => p.map(m => m.id === editing!.id ? { ...m, message: newText } : m)); setEditing(null); setTxt(''); }
    else showToast('Edit failed');
    setSaving(false);
  }, [editing, saving, uid]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const doDelete = useCallback(async (m: Msg) => {
    setCtxMenu(null);
    deletedIds.current.add(m.id);
    setMsgs(prev => prev.filter(x => x.id !== m.id));
    setDeleting(m.id);
    const { error } = await supabase.from('chat_messages').delete().eq('id', m.id).eq('user_id', uid || '');
    if (error) { deletedIds.current.delete(m.id); setMsgs(prev => [...prev, m].sort((a, b) => a.created_at.localeCompare(b.created_at))); showToast('Delete failed'); }
    setDeleting(null);
  }, [uid]);

  const doReply = useCallback((m: Msg) => { setRep(m); setCtxMenu(null); setEditing(null); setTxt(''); setTimeout(() => inpRef.current?.focus(), 150); }, []);
  const doCopy  = useCallback(async (m: Msg) => { setCtxMenu(null); const ok = await copyToClipboard(m.message); showToast(ok ? '✓ Copied' : 'Copy failed'); }, []);
  const doEdit  = useCallback((m: Msg) => { setCtxMenu(null); setRep(null); setEditing({ id: m.id, text: m.message }); setTimeout(() => inpRef.current?.focus(), 150); }, []);

  const startPress = useCallback((e: React.TouchEvent | React.MouseEvent, m: Msg) => {
    const touch = 'touches' in e ? e.touches[0] : (e as unknown as MouseEvent);
    pressTimer.current = setTimeout(() => { setPanel('none'); setCtxMenu({ msg: m, x: touch.clientX, y: touch.clientY }); }, 500);
  }, []);
  const endPress = useCallback(() => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } }, []);

  const col = CC[ch];
  const chInfo = CHANNELS.find(c => c.id === ch)!;
  const inputValue = editing ? editing.text : txt;
  const setInputValue = (v: string) => { if (editing) setEditing(p => p ? { ...p, text: v } : null); else setTxt(v); };
  const hasTxt = editing ? editing.text.trim().length > 0 : txtRef.current.trim().length > 0;

  return (
    <div style={{ height: '100vh', background: 'hsl(225 30% 3%)', display: 'flex', flexDirection: 'column',
      fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif", overflow: 'hidden' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeM{from{opacity:0;transform:scale(0.9) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes slideU{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastA{0%{opacity:0;transform:translateX(-50%) translateY(8px)}15%{opacity:1;transform:translateX(-50%)}80%{opacity:1}100%{opacity:0}}
        .no-scroll::-webkit-scrollbar{display:none}
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 90, left: '50%', zIndex: 10001,
          background: 'hsl(225 28% 13%)', border: '1px solid hsl(215 30% 22%)',
          color: 'hsl(215 18% 88%)', padding: '9px 22px', borderRadius: 22,
          fontSize: 13, fontWeight: 600, pointerEvents: 'none',
          animation: 'toastA 2s ease forwards', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {toast}
        </div>
      )}

      {/* Channel switcher drawer */}
      {panel === 'channels' && (
        <div data-noc="1" style={{
          position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'flex-end',
        }} onPointerDown={() => setPanel('none')}>
          <div data-noc="1" style={{ width: '100%', background: 'hsl(225 26% 8%)',
            borderRadius: '24px 24px 0 0', padding: '20px 0 32px',
            border: '1px solid hsl(215 22% 16%)', animation: 'slideU 0.2s ease' }}
            onPointerDown={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'hsl(215 22% 22%)', margin: '0 auto 20px' }} />
            <p style={{ fontSize: 11, fontWeight: 700, color: 'hsl(215 14% 36%)', padding: '0 20px 12px',
              textTransform: 'uppercase', letterSpacing: '0.14em' }}>Switch Channel</p>
            {CHANNELS.map(c => {
              const ac = canPost(c.id); const ia = ch === c.id;
              return (
                <button key={c.id} data-noc="1"
                  onPointerDown={() => { if (ac) { setCh(c.id); setPanel('none'); } }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 20px', border: 'none', background: ia ? `${CC[c.id]}10` : 'transparent',
                    cursor: ac ? 'pointer' : 'not-allowed', opacity: ac ? 1 : 0.4 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 20,
                    background: ia ? `${CC[c.id]}20` : 'hsl(215 22% 11%)',
                    border: `1.5px solid ${ia ? `${CC[c.id]}40` : 'hsl(215 22% 16%)'}` }}>
                    {c.icon}
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: ia ? CC[c.id] : 'hsl(215 18% 80%)' }}>
                      {c.label} {!ac && '🔒'}
                    </p>
                    <p style={{ fontSize: 11, color: 'hsl(215 14% 36%)', marginTop: 2 }}>{c.desc}</p>
                  </div>
                  {ia && <div style={{ width: 8, height: 8, borderRadius: '50%', background: CC[c.id], flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Context menu */}
      {ctxMenu && (
        <div data-noc="1" style={{
          position: 'fixed', zIndex: 9999,
          top: Math.min(ctxMenu.y + 10, window.innerHeight - 290),
          left: Math.min(Math.max(ctxMenu.x - 125, 12), window.innerWidth - 252),
          background: 'hsl(225 26% 9%)', border: '1px solid hsl(215 22% 18%)',
          borderRadius: 20, overflow: 'hidden', minWidth: 240,
          boxShadow: '0 20px 70px rgba(0,0,0,0.8)', animation: 'fadeM 0.14s ease',
        }} onTouchStart={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
          <div style={{ padding: '11px 16px', borderBottom: '1px solid hsl(215 22% 13%)', background: 'hsl(225 28% 7%)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: col, marginBottom: 3 }}>{ctxMenu.msg.username || 'Miner'}</p>
            {ctxMenu.msg.msg_type === 'sticker' ? <p style={{ fontSize: 12, color: 'hsl(215 18% 48%)' }}>🐉 Sticker</p>
             : ctxMenu.msg.msg_type === 'image' ? <p style={{ fontSize: 12, color: 'hsl(215 18% 48%)' }}>📷 Image</p>
             : <p style={{ fontSize: 12, color: 'hsl(215 18% 58%)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{ctxMenu.msg.message}</p>}
          </div>
          <CMenuBtn icon={<CornerUpLeft size={15} color="hsl(215 35% 62%)" />} label="Reply" onTap={() => doReply(ctxMenu.msg)} border />
          {(!ctxMenu.msg.msg_type || ctxMenu.msg.msg_type === 'text') && (
            <CMenuBtn icon={<Copy size={15} color="hsl(215 25% 52%)" />} label="Copy text" onTap={() => doCopy(ctxMenu.msg)} border={isOwnMsg(ctxMenu.msg)} />
          )}
          {isOwnMsg(ctxMenu.msg) && (
            <>
              {(!ctxMenu.msg.msg_type || ctxMenu.msg.msg_type === 'text') && (
                <CMenuBtn icon={<Pencil size={15} color={col} />} label="Edit message" onTap={() => doEdit(ctxMenu.msg)} border />
              )}
              <CMenuBtn icon={<Trash2 size={15} color="hsl(0 60% 56%)" />} label="Delete" onTap={() => doDelete(ctxMenu.msg)} labelColor="hsl(0 60% 62%)" border={false} />
            </>
          )}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '52px 20px 12px', flexShrink: 0 }}>
        <button onPointerDown={e => { e.stopPropagation(); navigate('/'); }} style={navBtn}>
          <ChevronLeft size={20} color="hsl(215 25% 55%)" />
        </button>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'hsl(215 20% 93%)' }}>Community</h1>
          <p style={{ fontSize: 11, color: col, marginTop: 1, fontWeight: 600 }}>{chInfo.icon} {chInfo.label}</p>
        </div>
        {/* Hamburger to switch channels */}
        <button data-noc="1" onPointerDown={e => { e.stopPropagation(); setPanel(p => p === 'channels' ? 'none' : 'channels'); }} style={{
          ...navBtn, background: panel === 'channels' ? `${col}18` : 'hsl(215 25% 10%)',
          border: `1px solid ${panel === 'channels' ? `${col}40` : 'hsl(215 22% 17%)'}`,
        }}>
          <Menu size={18} color={panel === 'channels' ? col : 'hsl(215 25% 55%)'} />
        </button>
      </div>

      <div style={{ padding: '0 20px 6px', flexShrink: 0 }}>
        <p style={{ fontSize: 10, color: 'hsl(215 14% 28%)' }}>
          {chInfo.desc} · Hold a message to reply / edit / delete
        </p>
      </div>

      {dbOk === false && (
        <div style={{ margin: '6px 20px', padding: '11px 14px', borderRadius: 14, flexShrink: 0,
          background: 'hsl(38 55% 52% / 0.06)', border: '1px solid hsl(38 55% 52% / 0.2)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'hsl(38 55% 58%)' }}>⚙️ Chat table not found — run Supabase migration</p>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="no-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 0', minHeight: 0 }}>
        {load && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${col}20`, borderTopColor: col, animation: 'spin 1s linear infinite' }} />
          </div>
        )}
        {!load && dbOk === true && msgs.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 48 }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>{chInfo.icon}</div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'hsl(215 18% 44%)' }}>No messages yet</p>
            <p style={{ fontSize: 11, color: 'hsl(215 14% 28%)', marginTop: 4 }}>Be the first to say something!</p>
          </div>
        )}
        {dbOk === true && msgs.map((m, i) => {
          const me = isOwnMsg(m);
          const showHdr = i === 0 || msgs[i - 1].user_id !== m.user_id;
          const isDeleting = deleting === m.id;
          return (
            <div key={m.id}
              onMouseDown={e => { e.stopPropagation(); startPress(e, m); }}
              onMouseUp={endPress} onMouseLeave={endPress}
              onTouchStart={e => { e.stopPropagation(); startPress(e, m); }}
              onTouchEnd={endPress} onTouchCancel={endPress} onTouchMove={endPress}
              style={{ marginBottom: showHdr ? 10 : 3, display: 'flex',
                flexDirection: me ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 7,
                WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
                opacity: isDeleting ? 0.3 : 1, transition: 'opacity 0.18s' }}>
              {!me && showHdr && <Av url={m.avatar_url} name={m.username} col={col} sz={28} />}
              {!me && !showHdr && <div style={{ width: 28, flexShrink: 0 }} />}
              <div style={{ maxWidth: m.msg_type === 'sticker' ? '52%' : '76%' }}>
                {showHdr && !me && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{m.username || 'Miner'}</span>
                    <span style={{ fontSize: 9, color: 'hsl(215 14% 28%)' }}>{fmtTime(m.created_at)}</span>
                  </div>
                )}
                {m.reply_to_id && m.reply_to_message && (
                  <div style={{ marginBottom: 2, padding: '6px 10px', borderRadius: '11px 11px 0 0',
                    background: 'hsl(215 22% 10%)', borderLeft: `3px solid ${col}` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: col, marginBottom: 1 }}>{m.reply_to_username || 'Miner'}</p>
                    <p style={{ fontSize: 11, color: 'hsl(215 14% 46%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>{m.reply_to_message}</p>
                  </div>
                )}
                {m.msg_type === 'sticker' && m.image_url ? (
                  <img src={m.image_url} alt="sticker" style={{ width: 120, height: 120, objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 3px 12px rgba(0,0,0,0.4))', borderRadius: 8 }}
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0.3'; }} />
                ) : m.msg_type === 'image' && m.image_url ? (
                  <div style={{ borderRadius: me ? '16px 16px 4px 16px' : '16px 16px 16px 4px', overflow: 'hidden', border: `1px solid ${col}25`, maxWidth: 220 }}>
                    <img src={m.image_url} alt="img" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} />
                  </div>
                ) : (
                  <div style={{ padding: '9px 13px',
                    borderRadius: m.reply_to_id ? (me ? '0 14px 4px 14px' : '14px 0 14px 4px') : (me ? '16px 16px 4px 16px' : '16px 16px 16px 4px'),
                    background: me ? `linear-gradient(135deg,${col}1e,${col}0c)` : 'hsl(225 24% 9%)',
                    border: `1px solid ${me ? `${col}25` : 'hsl(215 22% 13%)'}`, wordBreak: 'break-word' }}>
                    <p style={{ fontSize: 13, color: 'hsl(215 18% 88%)', lineHeight: 1.5, margin: 0 }}>{m.message}</p>
                  </div>
                )}
                {me && <p style={{ fontSize: 9, color: 'hsl(215 14% 24%)', marginTop: 2, textAlign: 'right' }}>{fmtTime(m.created_at)}</p>}
              </div>
            </div>
          );
        })}
        <div ref={botRef} />
      </div>

      {/* ── Sticker tray ── */}
      {panel === 'stickers' && (
        <div data-noc="1" style={{ margin: '0 14px 6px', padding: '12px', borderRadius: 18,
          background: 'hsl(225 26% 7%)', border: `1px solid ${col}28`, flexShrink: 0, animation: 'slideU 0.18s ease' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: col, marginBottom: 9, textTransform: 'uppercase', letterSpacing: '0.14em' }}>Arxon Stickers</p>
          <div className="no-scroll" style={{ display: 'flex', gap: 9, overflowX: 'auto' }}>
            {STICKERS.map(s => {
              const url = getStickerUrl(s.filename);
              return (
                <button key={s.id} data-noc="1"
                  onPointerDown={e => { e.preventDefault(); e.stopPropagation(); sendSticker(url); }}
                  style={{ flexShrink: 0, width: 76, height: 76, borderRadius: 14, border: '1px solid hsl(215 22% 15%)',
                    background: 'hsl(215 22% 9%)', cursor: 'pointer', padding: 5, outline: 'none',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                  <img src={url} alt={s.label} style={{ width: 50, height: 50, objectFit: 'contain' }}
                    onError={e => { const img = e.target as HTMLImageElement; if (!img.dataset.r) { img.dataset.r = '1'; img.src = `/${s.filename}`; } }} />
                  <span style={{ fontSize: 8, color: 'hsl(215 14% 38%)', fontWeight: 600 }}>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Emoji tray ── */}
      {panel === 'emoji' && (
        <div data-noc="1" style={{ margin: '0 14px 6px', padding: '12px', borderRadius: 18,
          background: 'hsl(225 26% 7%)', border: `1px solid ${col}28`, flexShrink: 0, animation: 'slideU 0.18s ease', maxHeight: 180, overflowY: 'auto' }}
          className="no-scroll">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 2 }}>
            {EMOJIS.map(em => (
              <button key={em} data-noc="1"
                onPointerDown={e => { e.preventDefault(); e.stopPropagation(); insertEmoji(em); }}
                style={{ fontSize: 22, padding: '4px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', outline: 'none', lineHeight: 1 }}>
                {em}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Edit banner ── */}
      {editing && (
        <div style={{ margin: '0 14px 5px', padding: '9px 11px', borderRadius: 12,
          background: `${col}10`, border: `1px solid ${col}30`, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 9 }}>
          <Pencil size={13} color={col} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: col, marginBottom: 1 }}>Editing message</p>
            <p style={{ fontSize: 11, color: 'hsl(215 14% 40%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{editing.text}</p>
          </div>
          <button onPointerDown={() => { setEditing(null); setTxt(''); }} style={xBtn}><X size={12} color="hsl(215 18% 40%)" /></button>
        </div>
      )}

      {/* ── Reply banner ── */}
      {rep && !editing && (
        <div style={{ margin: '0 14px 5px', padding: '9px 11px', borderRadius: 12,
          background: 'hsl(215 22% 8%)', border: `1px solid ${col}30`, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 3, alignSelf: 'stretch', minHeight: 28, borderRadius: 2, background: col, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: col, marginBottom: 1 }}>↩ {rep.username || 'Miner'}</p>
            <p style={{ fontSize: 11, color: 'hsl(215 14% 40%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rep.message}</p>
          </div>
          <button onPointerDown={() => setRep(null)} style={xBtn}><X size={12} color="hsl(215 18% 40%)" /></button>
        </div>
      )}

      {/* ── Input bar ── */}
      {user && dbOk === true ? (
        <div style={{ padding: '4px 14px 14px', flexShrink: 0 }}>
          {!canPost(ch) ? (
            <div style={{ padding: '13px', borderRadius: 16, textAlign: 'center', background: 'hsl(215 22% 8%)', border: '1px solid hsl(215 20% 13%)' }}>
              <p style={{ fontSize: 12, color: 'hsl(215 18% 35%)' }}>🔒 Join {ch === 'alpha' ? 'Alpha' : 'Omega'} team in Arena to chat here</p>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7,
              background: 'hsl(225 26% 7%)', border: `1.5px solid ${col}30`,
              borderRadius: 22, padding: '7px 7px 7px 11px' }}>

              {/* Image upload via label */}
              {!editing && (
                <label htmlFor={fileInputId.current} style={{ width: 33, height: 33, borderRadius: 10, flexShrink: 0,
                  background: uploading ? `${col}20` : 'hsl(215 22% 12%)', border: '1px solid hsl(215 22% 17%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  {uploading
                    ? <div style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${col}25`, borderTopColor: col, animation: 'spin 0.8s linear infinite' }} />
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="hsl(215 25% 48%)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  }
                  <input id={fileInputId.current} type="file" accept="image/jpeg,image/png,image/gif,image/webp" style={{ display: 'none' }} onChange={handleImagePick} />
                </label>
              )}

              {/* Sticker */}
              {!editing && (
                <button data-noc="1" onPointerDown={e => { e.preventDefault(); e.stopPropagation(); setPanel(p => p === 'stickers' ? 'none' : 'stickers'); }}
                  style={{ width: 33, height: 33, borderRadius: 10, flexShrink: 0,
                    background: panel === 'stickers' ? `${col}20` : 'hsl(215 22% 12%)',
                    border: `1px solid ${panel === 'stickers' ? `${col}38` : 'hsl(215 22% 17%)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none' }}>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>🐉</span>
                </button>
              )}

              {/* Emoji */}
              {!editing && (
                <button data-noc="1" onPointerDown={e => { e.preventDefault(); e.stopPropagation(); setPanel(p => p === 'emoji' ? 'none' : 'emoji'); }}
                  style={{ width: 33, height: 33, borderRadius: 10, flexShrink: 0,
                    background: panel === 'emoji' ? `${col}20` : 'hsl(215 22% 12%)',
                    border: `1px solid ${panel === 'emoji' ? `${col}38` : 'hsl(215 22% 17%)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: 'none' }}>
                  <Smile size={14} color={panel === 'emoji' ? col : 'hsl(215 25% 48%)'} />
                </button>
              )}

              {/* Textarea */}
              <textarea ref={inpRef} value={inputValue} onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); editing ? saveEdit() : send(); }
                  if (e.key === 'Escape') { if (editing) { setEditing(null); setTxt(''); } else if (rep) setRep(null); }
                }}
                placeholder={editing ? 'Edit message…' : rep ? `Reply to ${rep.username || 'them'}…` : 'Type a message…'}
                rows={1} style={{ flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontSize: 14, color: 'hsl(215 18% 88%)', resize: 'none',
                  fontFamily: "'Creato Display',-apple-system,sans-serif",
                  lineHeight: '1.5', maxHeight: 80, overflow: 'auto', paddingTop: 7, paddingBottom: 7 }} />

              {/* Send */}
              <button onPointerDown={e => { e.preventDefault(); e.stopPropagation(); editing ? saveEdit() : send(); }}
                style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0, outline: 'none', cursor: 'pointer',
                  background: hasTxt ? `${col}22` : 'hsl(215 22% 10%)',
                  border: `1px solid ${hasTxt ? `${col}45` : 'hsl(215 22% 15%)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .18s' }}>
                {editing ? <Check size={15} color={hasTxt ? col : 'hsl(215 18% 28%)'} /> : <Send size={14} color={hasTxt ? col : 'hsl(215 18% 28%)'} />}
              </button>
            </div>
          )}
        </div>
      ) : !user ? (
        <div style={{ padding: '10px 14px 14px', flexShrink: 0 }}>
          <button onPointerDown={() => navigate('/auth')} style={{ width: '100%', padding: '15px', borderRadius: 18, fontWeight: 700, fontSize: 14,
            cursor: 'pointer', background: 'linear-gradient(135deg,hsl(215 35% 52%),hsl(215 40% 40%))',
            border: 'none', color: 'white', outline: 'none', fontFamily: "'Creato Display',-apple-system,sans-serif" }}>
            Sign In to Chat
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CMenuBtn({ icon, label, onTap, border = true, labelColor }: {
  icon: React.ReactNode; label: string; onTap: () => void; border?: boolean; labelColor?: string;
}) {
  return (
    <button data-noc="1"
      onPointerDown={e => { e.preventDefault(); e.stopPropagation(); onTap(); }}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', outline: 'none',
        borderBottom: border ? '1px solid hsl(215 22% 11%)' : 'none' }}>
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
