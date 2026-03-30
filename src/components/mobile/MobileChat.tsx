import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useArenaMembership } from '@/hooks/useArenaMembership';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, Send, ImageIcon, X, CornerUpLeft, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Types ───────────────────────────────────────────────────────────────── */
type Channel = 'general' | 'alpha' | 'omega' | 'nexus_exchange';

interface Msg {
  id: string;
  channel: Channel;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  message: string;
  image_url?: string | null;
  reply_to_id?: string | null;
  read_by?: string[];
  created_at: string;
}

const CHANNELS = [
  { id: 'general'        as Channel, label: 'General',        icon: '🌐', desc: 'All miners', lock: null },
  { id: 'alpha'          as Channel, label: 'Alpha Team',     icon: '⬡',  desc: 'Alpha only', lock: 'alpha' as 'alpha' },
  { id: 'omega'          as Channel, label: 'Omega Team',     icon: '⬡',  desc: 'Omega only', lock: 'omega' as 'omega' },
  { id: 'nexus_exchange' as Channel, label: 'Nexus',          icon: '📡', desc: 'Nexus UIDs', lock: null },
];

const CC: Record<Channel, string> = {
  general: 'hsl(215 35% 62%)',
  alpha:   'hsl(215 35% 62%)',
  omega:   'hsl(255 50% 65%)',
  nexus_exchange: 'hsl(155 45% 50%)',
};

const EMOJIS = [
  '😂','😍','🔥','💯','👍','❤️','🎉','😎','🚀','💰','😭','🤣',
  '✅','💪','👀','🤔','😏','🙏','⚡','🏆','🫡','🫶','💫','⭐',
  '💎','🌟','🤝','👊','💥','🎊','🥳','😤','🦁','🐉','⚔️','🌊',
];

const fmt = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/* ─── Avatar ─────────────────────────────────────────────────────────────── */
function Av({ url, name, sz = 30 }: { url: string | null; name: string | null; sz?: number }) {
  const [e, setE] = useState(false);
  const init = (name || '?')[0].toUpperCase();
  const hue = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return url && !e
    ? <div style={{ width: sz, height: sz, borderRadius: sz * 0.35, overflow: 'hidden', flexShrink: 0 }}>
        <img src={url} alt="" onError={() => setE(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    : <div style={{ width: sz, height: sz, borderRadius: sz * 0.35, flexShrink: 0, fontSize: sz * 0.38, fontWeight: 700,
        background: `linear-gradient(135deg,hsl(${hue} 50% 30%),hsl(${(hue + 45) % 360} 45% 20%))`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        {init}
      </div>;
}

/* ─── Emoji picker ───────────────────────────────────────────────────────── */
function EmojiPanel({ onPick }: { onPick: (e: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
      style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, margin: '0 0 4px',
        background: 'hsl(225 28% 8%)', border: '1px solid hsl(215 22% 16%)',
        borderRadius: 18, padding: '12px 14px', zIndex: 60 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {EMOJIS.map(em => (
          <button key={em} onClick={() => onPick(em)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, padding: '2px', lineHeight: 1 }}>
            {em}
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Reply preview ──────────────────────────────────────────────────────── */
function ReplyPreview({ msg, onCancel }: { msg: Msg; onCancel: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px 0',
      background: 'hsl(225 26% 8%)', borderTop: '1px solid hsl(215 22% 14%)' }}>
      <CornerUpLeft size={13} color="hsl(215 35% 55%)" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, borderLeft: '2px solid hsl(215 35% 55%)', paddingLeft: 8, minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'hsl(215 35% 62%)', marginBottom: 1 }}>
          {msg.username || 'Miner'}
        </p>
        <p style={{ fontSize: 11, color: 'hsl(215 18% 48%)', overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap' }}>
          {msg.image_url ? '📷 Image' : msg.message}
        </p>
      </div>
      <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer',
        color: 'hsl(215 18% 38%)', padding: 2, flexShrink: 0 }}>
        <X size={15} />
      </button>
    </div>
  );
}

/* ─── Message bubble ─────────────────────────────────────────────────────── */
function Bubble({ msg, isMe, showHead, replyMsg, color, onReply, userId }: {
  msg: Msg; isMe: boolean; showHead: boolean;
  replyMsg: Msg | null; color: string;
  onReply: (m: Msg) => void; userId: string;
}) {
  const [longPress, setLongPress] = useState(false);
  const lpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startLP = () => {
    lpTimer.current = setTimeout(() => { setLongPress(true); onReply(msg); }, 500);
  };
  const cancelLP = () => {
    if (lpTimer.current) clearTimeout(lpTimer.current);
    setLongPress(false);
  };

  const readers = (msg.read_by || []).filter(id => id !== msg.user_id);
  const isRead = isMe && readers.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row',
      alignItems: 'flex-end', gap: 7, marginBottom: showHead ? 10 : 3 }}>

      {/* Avatar (others only) */}
      {!isMe && showHead && <Av url={msg.avatar_url} name={msg.username} sz={28} />}
      {!isMe && !showHead && <div style={{ width: 28, flexShrink: 0 }} />}

      <div style={{ maxWidth: '72%' }}>
        {/* Sender name */}
        {showHead && !isMe && (
          <p style={{ fontSize: 10, fontWeight: 700, color, marginBottom: 3, marginLeft: 4 }}>
            {msg.username || 'Miner'}
          </p>
        )}

        {/* Quoted reply */}
        {replyMsg && (
          <div style={{ marginBottom: 2, padding: '5px 9px',
            background: 'hsl(225 25% 13%)', borderRadius: '10px 10px 0 0',
            borderLeft: `2.5px solid ${color}` }}>
            <p style={{ fontSize: 9, fontWeight: 700, color, marginBottom: 1 }}>{replyMsg.username || 'Miner'}</p>
            <p style={{ fontSize: 10, color: 'hsl(215 18% 48%)', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>
              {replyMsg.image_url ? '📷 Image' : replyMsg.message}
            </p>
          </div>
        )}

        {/* Main bubble */}
        <div
          onTouchStart={startLP} onTouchEnd={cancelLP} onTouchMove={cancelLP}
          onMouseDown={startLP} onMouseUp={cancelLP} onMouseLeave={cancelLP}
          onContextMenu={e => { e.preventDefault(); onReply(msg); }}
          style={{
            padding: msg.image_url && !msg.message ? '4px' : '9px 13px',
            borderRadius: isMe
              ? replyMsg ? '14px 14px 4px 14px' : '16px 16px 4px 16px'
              : replyMsg ? '14px 14px 14px 4px' : '16px 16px 16px 4px',
            background: isMe
              ? `linear-gradient(135deg,${color}25,${color}14)`
              : 'hsl(225 24% 10%)',
            border: `1px solid ${isMe ? `${color}35` : 'hsl(215 22% 16%)'}`,
            wordBreak: 'break-word', cursor: 'default',
            transform: longPress ? 'scale(0.96)' : 'scale(1)',
            transition: 'transform 0.1s',
          }}>
          {msg.image_url && (
            <img src={msg.image_url} alt=""
              style={{ maxWidth: 200, maxHeight: 200, borderRadius: 10, display: 'block',
                marginBottom: msg.message ? 5 : 0, objectFit: 'cover', cursor: 'pointer' }}
              onClick={() => window.open(msg.image_url!, '_blank')} />
          )}
          {msg.message && (
            <p style={{ fontSize: 13, color: 'hsl(215 18% 90%)', lineHeight: 1.5, margin: 0 }}>
              {msg.message}
            </p>
          )}
        </div>

        {/* Time + read ticks */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2,
          justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
          <span style={{ fontSize: 9, color: 'hsl(215 14% 28%)' }}>{fmt(msg.created_at)}</span>
          {isMe && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="10" viewBox="0 0 16 10">
                <path d="M1 5l3 3L10 1" stroke={isRead ? 'hsl(155 45% 50%)' : 'hsl(215 18% 38%)'}
                  strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 5l3 3 6-7" stroke={isRead ? 'hsl(155 45% 50%)' : 'hsl(215 18% 38%)'}
                  strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {isRead && readers.length > 0 && (
                <span style={{ fontSize: 8, color: 'hsl(155 45% 50%)', marginLeft: 1 }}>
                  {readers.length}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick reply tap */}
      <button onClick={() => onReply(msg)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px',
          color: 'hsl(215 18% 30%)', alignSelf: 'center', flexShrink: 0, opacity: 0.7 }}>
        <CornerUpLeft size={13} />
      </button>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function MobileChat() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { membership } = useArenaMembership();

  const [ch, setCh] = useState<Channel>('general');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tableOk, setTableOk] = useState(true);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [imgPreview, setImgPreview] = useState<{ file: File; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const username = profile?.username || user?.email?.split('@')[0] || 'Miner';
  const color = CC[ch];

  const canAccess = (c: Channel) => {
    if (c === 'alpha') return membership?.club === 'alpha';
    if (c === 'omega') return membership?.club === 'omega';
    return true;
  };

  /* Load messages */
  const load = useCallback(async (c: Channel) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages').select('*')
        .eq('channel', c).order('created_at', { ascending: true }).limit(100);
      if (error) {
        if (error.code === '42P01') { setTableOk(false); setMsgs([]); }
        else throw error;
      } else {
        setTableOk(true);
        setMsgs((data || []) as Msg[]);
      }
    } catch { setMsgs([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(ch); }, [ch, load]);

  /* Real-time */
  useEffect(() => {
    if (!tableOk) return;
    const sub = supabase.channel(`chat:${ch}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages',
        filter: `channel=eq.${ch}` }, payload => {
        if (payload.eventType === 'INSERT')
          setMsgs(p => [...p, payload.new as Msg]);
        else if (payload.eventType === 'UPDATE')
          setMsgs(p => p.map(m => m.id === (payload.new as Msg).id ? (payload.new as Msg) : m));
      }).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [ch, tableOk]);

  /* Auto-scroll */
  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [msgs.length]);

  /* Mark read */
  useEffect(() => {
    if (!user || !msgs.length) return;
    const unread = msgs.filter(m => m.user_id !== user.id && !(m.read_by || []).includes(user.id));
    unread.forEach(m => {
      supabase.rpc('mark_message_read', { p_message_id: m.id, p_user_id: user.id }).catch(() => {});
    });
  }, [msgs, user]);

  /* Image pick */
  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImgPreview({ file: f, url: URL.createObjectURL(f) });
    if (fileRef.current) fileRef.current.value = '';
  };

  /* Upload image */
  const uploadImg = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('chat-images')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) { console.error(error); return null; }
    return supabase.storage.from('chat-images').getPublicUrl(path).data.publicUrl;
  };

  /* Send */
  const send = async () => {
    if (!user || sending) return;
    if (!input.trim() && !imgPreview) return;
    if (!canAccess(ch)) return;
    setSending(true);
    try {
      let imgUrl: string | null = null;
      if (imgPreview) {
        setUploading(true);
        imgUrl = await uploadImg(imgPreview.file);
        setUploading(false);
        URL.revokeObjectURL(imgPreview.url);
        setImgPreview(null);
      }
      const { error } = await supabase.from('chat_messages').insert({
        channel: ch, user_id: user.id, username,
        avatar_url: profile?.avatar_url || null,
        message: input.trim(),
        image_url: imgUrl || null,
        reply_to_id: replyTo?.id || null,
        read_by: [user.id],
      });
      if (error) {
        if (error.code === '42P01') setTableOk(false);
        else throw error;
      } else {
        setInput(''); setReplyTo(null); setShowEmoji(false);
      }
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  const msgMap = Object.fromEntries(msgs.map(m => [m.id, m]));
  const canSend = (!!input.trim() || !!imgPreview) && canAccess(ch);

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(225 30% 3%)', display: 'flex',
      flexDirection: 'column', fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif",
      paddingBottom: 90 }}>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '52px 20px 0', flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} className="press"
          style={{ width: 40, height: 40, borderRadius: 14, background: 'hsl(215 25% 11%)',
            border: '1px solid hsl(215 22% 18%)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={20} color="hsl(215 25% 55%)" />
        </button>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'hsl(215 20% 93%)' }}>Community</h1>
          <p style={{ fontSize: 10, color: 'hsl(215 14% 38%)', marginTop: 2 }}>
            {CHANNELS.find(c => c.id === ch)?.icon} {CHANNELS.find(c => c.id === ch)?.label}
          </p>
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* ── Channel tabs ── */}
      <div className="scrollbar-none"
        style={{ display: 'flex', gap: 8, padding: '14px 20px 0', overflowX: 'auto', flexShrink: 0 }}>
        {CHANNELS.map(c => {
          const ok = canAccess(c.id);
          const active = ch === c.id;
          return (
            <button key={c.id} onClick={() => ok && setCh(c.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px',
                borderRadius: 22, fontSize: 12, fontWeight: 700, border: 'none',
                cursor: ok ? 'pointer' : 'not-allowed', outline: 'none', transition: 'all 0.2s',
                flexShrink: 0,
                background: active ? `${CC[c.id]}22` : 'hsl(215 22% 10%)',
                color: active ? CC[c.id] : ok ? 'hsl(215 18% 45%)' : 'hsl(215 14% 28%)',
                borderWidth: 1, borderStyle: 'solid',
                borderColor: active ? `${CC[c.id]}44` : 'hsl(215 20% 16%)',
                opacity: ok ? 1 : 0.4,
                fontFamily: "'Creato Display',-apple-system,sans-serif" }}>
              {c.icon} {c.label}
              {c.lock && !ok && <span style={{ fontSize: 9 }}>🔒</span>}
            </button>
          );
        })}
      </div>

      {/* Setup warning */}
      {!tableOk && (
        <div style={{ margin: '10px 20px 0', padding: '11px 15px', borderRadius: 14, flexShrink: 0,
          background: 'hsl(38 55% 52%/0.08)', border: '1px solid hsl(38 55% 52%/0.22)' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'hsl(38 55% 58%)' }}>
            ⚙️ Run supabase-chat-migration.sql and supabase-chat-v2-migration.sql to enable chat.
          </p>
        </div>
      )}

      {/* Image preview */}
      {imgPreview && (
        <div style={{ margin: '10px 20px 0', position: 'relative', flexShrink: 0 }}>
          <img src={imgPreview.url} alt="preview"
            style={{ maxHeight: 130, borderRadius: 12, objectFit: 'cover', display: 'block',
              border: '1px solid hsl(215 22% 20%)' }} />
          <button onClick={() => { URL.revokeObjectURL(imgPreview.url); setImgPreview(null); }}
            style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%',
              background: 'hsl(225 30% 3%/0.85)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} color="white" />
          </button>
          {uploading && <p style={{ fontSize: 10, color: 'hsl(215 18% 50%)', marginTop: 3 }}>Uploading…</p>}
        </div>
      )}

      {/* ── Messages ── */}
      <div className="scrollbar-none"
        style={{ flex: 1, overflowY: 'auto', padding: '12px 20px 0', minHeight: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 56 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%',
              border: '2px solid hsl(215 35% 62%/0.2)', borderTopColor: 'hsl(215 35% 62%)',
              animation: 'spin 1s linear infinite' }} />
          </div>
        ) : msgs.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 64 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>{CHANNELS.find(c => c.id === ch)?.icon}</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'hsl(215 18% 48%)', marginBottom: 6 }}>
              No messages yet
            </p>
            <p style={{ fontSize: 12, color: 'hsl(215 14% 30%)' }}>Be first to say something!</p>
          </div>
        ) : msgs.map((msg, i) => {
          const isMe = msg.user_id === user?.id;
          const showHead = i === 0 || msgs[i - 1].user_id !== msg.user_id;
          const replyMsg = msg.reply_to_id ? msgMap[msg.reply_to_id] || null : null;
          return (
            <Bubble key={msg.id} msg={msg} isMe={isMe} showHead={showHead}
              replyMsg={replyMsg} color={color} onReply={m => setReplyTo(m)}
              userId={user?.id || ''} />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Input zone ── */}
      {user && tableOk && (
        <div style={{ flexShrink: 0, position: 'relative' }}>
          {/* Emoji panel */}
          <AnimatePresence>
            {showEmoji && (
              <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, padding: '0 20px' }}>
                <EmojiPanel onPick={em => { setInput(p => p + em); }} />
              </div>
            )}
          </AnimatePresence>

          {/* Reply strip */}
          {replyTo && <ReplyPreview msg={replyTo} onCancel={() => setReplyTo(null)} />}

          {!canAccess(ch) ? (
            <div style={{ padding: '10px 20px 12px', background: 'hsl(225 26% 8%)',
              borderTop: '1px solid hsl(215 22% 14%)' }}>
              <div style={{ padding: '13px', borderRadius: 16, textAlign: 'center',
                background: 'hsl(215 22% 10%)', border: '1px solid hsl(215 20% 16%)' }}>
                <p style={{ fontSize: 12, color: 'hsl(215 18% 40%)' }}>
                  🔒 Join {ch === 'alpha' ? 'Alpha' : 'Omega'} team in Arena to access this channel
                </p>
              </div>
            </div>
          ) : (
            <div style={{ padding: '10px 20px 12px', background: 'hsl(225 26% 8%)',
              borderTop: '1px solid hsl(215 22% 14%)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                {/* Emoji */}
                <button onClick={() => setShowEmoji(v => !v)}
                  style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, cursor: 'pointer',
                    background: showEmoji ? `${color}22` : 'hsl(215 22% 12%)',
                    border: `1px solid ${showEmoji ? `${color}44` : 'hsl(215 22% 18%)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, outline: 'none' }}>
                  😊
                </button>

                {/* Image */}
                <button onClick={() => fileRef.current?.click()}
                  style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, cursor: 'pointer',
                    background: 'hsl(215 22% 12%)', border: '1px solid hsl(215 22% 18%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none' }}>
                  <ImageIcon size={16} color="hsl(215 25% 46%)" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={onFilePick} style={{ display: 'none' }} />

                {/* Text box */}
                <div style={{ flex: 1, background: 'hsl(225 26% 9%)',
                  border: `1px solid ${color}30`, borderRadius: 18, padding: '9px 13px' }}>
                  <textarea value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Message…" rows={1}
                    style={{ width: '100%', background: 'none', border: 'none', outline: 'none',
                      fontSize: 14, color: 'hsl(215 18% 88%)', resize: 'none', maxHeight: 80,
                      overflow: 'auto', fontFamily: "'Creato Display',-apple-system,sans-serif",
                      lineHeight: 1.5, display: 'block' }} />
                </div>

                {/* Send */}
                <button onClick={send} disabled={!canSend || sending}
                  style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                    cursor: canSend ? 'pointer' : 'default', outline: 'none', transition: 'all 0.2s',
                    background: canSend ? `${color}22` : 'hsl(215 22% 12%)',
                    border: `1px solid ${canSend ? `${color}44` : 'hsl(215 22% 18%)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {sending
                    ? <div style={{ width: 14, height: 14, borderRadius: '50%',
                        border: `2px solid ${color}40`, borderTopColor: color,
                        animation: 'spin 1s linear infinite' }} />
                    : <Send size={15} color={canSend ? color : 'hsl(215 18% 32%)'} />
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!user && (
        <div style={{ padding: '12px 20px 14px', flexShrink: 0 }}>
          <button onClick={() => navigate('/auth')}
            style={{ width: '100%', padding: '16px', borderRadius: 18, fontWeight: 700, fontSize: 14,
              cursor: 'pointer', background: 'linear-gradient(135deg,hsl(215 35% 55%),hsl(215 40% 44%))',
              border: 'none', color: 'white', outline: 'none',
              fontFamily: "'Creato Display',-apple-system,sans-serif" }}>
            Sign In to Chat
          </button>
        </div>
      )}
    </div>
  );
}
