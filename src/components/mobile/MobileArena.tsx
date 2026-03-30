import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useArena, type ArenaBattle, type BattleHistoryEntry, type LeaderboardEntry } from '@/hooks/useArena';
import { useArenaMembership } from '@/hooks/useArenaMembership';
import { usePoints } from '@/hooks/usePoints';
import { ChevronLeft, ChevronRight, Users, Trophy } from 'lucide-react';
import AuthDialog from '@/components/auth/AuthDialog';
import ArenaOnboarding from '@/components/arena/ArenaOnboarding';
import { motion, AnimatePresence } from 'framer-motion';

const CSS = `
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
`;

type Tab = 'battles' | 'leaderboard' | 'my-stakes';

/* ── Countdown ─────────────────────────────────────────────────────────────── */
function useTimer(endsAt: string | null, active: boolean) {
  const [s, setS] = useState('');
  useEffect(() => {
    if (!active || !endsAt) return;
    const tick = () => {
      const d = Math.max(0, new Date(endsAt).getTime() - Date.now());
      const h = Math.floor(d / 3600000);
      const m = String(Math.floor((d % 3600000) / 60000)).padStart(2, '0');
      const sec = String(Math.floor((d % 60000) / 1000)).padStart(2, '0');
      setS(h > 0 ? `${h}:${m}:${sec}` : `${m}:${sec}`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [endsAt, active]);
  return s;
}

/* ── Side image (logo / flag / photo) ─────────────────────────────────────── */
function SideImg({ src, name, size = 60, circle = false }: {
  src: string | null; name: string; size?: number; circle?: boolean;
}) {
  const [err, setErr] = useState(false);
  const hue = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const r = circle ? '50%' : `${size * 0.22}px`;
  if (src && !err) {
    return (
      <div style={{ width: size, height: size, borderRadius: r, overflow: 'hidden',
        flexShrink: 0, border: '2px solid rgba(255,255,255,0.12)' }}>
        <img src={src} alt={name} onError={() => setErr(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }
  const init = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: r, flexShrink: 0,
      background: `linear-gradient(135deg,hsl(${hue} 55% 32%),hsl(${(hue + 50) % 360} 48% 20%))`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.28, fontWeight: 800, color: 'white',
      border: '2px solid rgba(255,255,255,0.12)' }}>
      {init}
    </div>
  );
}

/* ── Banner Battle Card (like the image reference) ────────────────────────── */
function BannerCard({ battle, isActive, userVoted, userWon, onClick }: {
  battle: ArenaBattle | BattleHistoryEntry;
  isActive?: boolean;
  userVoted?: boolean;
  userWon?: boolean;
  onClick: () => void;
}) {
  const timer = useTimer(battle.ends_at, !!isActive);
  const total = (battle.side_a_power || 0) + (battle.side_b_power || 0);
  const pctA = total > 0 ? Math.round((battle.side_a_power / total) * 100) : 50;
  const pctB = 100 - pctA;
  const concluded = !isActive && battle.winner_side;

  return (
    <motion.div whileTap={{ scale: 0.97 }} onClick={onClick}
      style={{ borderRadius: 22, overflow: 'hidden', marginBottom: 12, cursor: 'pointer',
        position: 'relative',
        background: concluded && userWon
          ? 'linear-gradient(135deg,hsl(155 40% 12%),hsl(225 28% 9%))'
          : 'linear-gradient(135deg,hsl(225 28% 10%),hsl(215 30% 13%),hsl(225 26% 8%))',
        border: `1px solid ${isActive ? 'hsl(215 28% 24%/0.6)' : concluded && userWon ? 'hsl(155 45% 43%/0.3)' : 'hsl(215 22% 16%)'}`,
        boxShadow: isActive ? '0 4px 24px hsl(215 55% 62%/0.06)' : 'none',
      }}>

      {/* Top shimmer for active */}
      {isActive && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg,transparent,hsl(215 35% 62%/0.6),transparent)',
            animation: 'shimmer 2.5s linear infinite' }} />
        </div>
      )}

      {/* Battle title + badge row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 14px 0' }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'hsl(215 18% 86%)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            letterSpacing: '-0.2px' }}>
            {battle.title || 'Arena Battle'}
          </p>
          {battle.description && (
            <p style={{ fontSize: 10, color: 'hsl(215 14% 40%)', marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {battle.description}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {isActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4,
              background: 'hsl(0 60% 56%/0.12)', border: '1px solid hsl(0 60% 56%/0.28)',
              borderRadius: 20, padding: '4px 9px' }}>
              <div className="pulse" style={{ width: 5, height: 5, borderRadius: '50%',
                background: 'hsl(0 60% 56%)' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: 'hsl(0 60% 65%)' }}>LIVE · {timer}</span>
            </div>
          )}
          {concluded && (
            <div style={{ fontSize: 9, fontWeight: 700, padding: '4px 9px', borderRadius: 20,
              color: userWon ? 'hsl(155 45% 55%)' : 'hsl(215 18% 45%)',
              background: userWon ? 'hsl(155 45% 43%/0.12)' : 'hsl(215 22% 12%)',
              border: `1px solid ${userWon ? 'hsl(155 45% 43%/0.25)' : 'hsl(215 22% 20%)'}` }}>
              {userVoted ? (userWon ? '🏆 Won' : '💧 Lost') : 'Ended'}
            </div>
          )}
          {!isActive && !concluded && (
            <div style={{ fontSize: 9, fontWeight: 700, padding: '4px 9px', borderRadius: 20,
              color: 'hsl(38 55% 52%)', background: 'hsl(38 55% 52%/0.1)',
              border: '1px solid hsl(38 55% 52%/0.22)' }}>Upcoming</div>
          )}
          <ChevronRight size={14} color="hsl(215 18% 32%)" />
        </div>
      </div>

      {/* ── Main VS banner ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 42px 1fr', gap: 0,
        padding: '14px 0 0', alignItems: 'stretch' }}>

        {/* Side A */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 8, padding: '0 10px 14px',
          background: battle.winner_side === 'a' ? 'hsl(38 55% 52%/0.06)' : 'transparent',
          borderRight: '1px solid hsl(215 22% 16%)' }}>
          <SideImg src={battle.side_a_image} name={battle.side_a_name} size={64} circle />
          <p style={{ fontSize: 12, fontWeight: 800, color: 'hsl(215 18% 88%)', textAlign: 'center',
            textTransform: 'uppercase', letterSpacing: '0.05em', maxWidth: 90,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {battle.side_a_name}
          </p>
          <div style={{ fontSize: 18, fontWeight: 800,
            color: battle.winner_side === 'a' ? 'hsl(38 55% 58%)' : 'hsl(215 30% 72%)' }}>
            {pctA}%
          </div>
          {battle.winner_side === 'a' && <span style={{ fontSize: 16 }}>👑</span>}
        </div>

        {/* VS center */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10,
            background: 'hsl(215 26% 12%)', border: '1px solid hsl(215 22% 20%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: 'hsl(215 22% 40%)',
              letterSpacing: '0.05em' }}>VS</span>
          </div>
        </div>

        {/* Side B */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 8, padding: '0 10px 14px',
          background: battle.winner_side === 'b' ? 'hsl(38 55% 52%/0.06)' : 'transparent',
          borderLeft: '1px solid hsl(215 22% 16%)' }}>
          <SideImg src={battle.side_b_image} name={battle.side_b_name} size={64} circle />
          <p style={{ fontSize: 12, fontWeight: 800, color: 'hsl(215 18% 88%)', textAlign: 'center',
            textTransform: 'uppercase', letterSpacing: '0.05em', maxWidth: 90,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {battle.side_b_name}
          </p>
          <div style={{ fontSize: 18, fontWeight: 800,
            color: battle.winner_side === 'b' ? 'hsl(38 55% 58%)' : 'hsl(215 30% 72%)' }}>
            {pctB}%
          </div>
          {battle.winner_side === 'b' && <span style={{ fontSize: 16 }}>👑</span>}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ padding: '0 14px 13px' }}>
        {/* Progress */}
        <div style={{ height: 4, borderRadius: 2, background: 'hsl(215 26% 12%)',
          overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ height: '100%', borderRadius: 2, width: `${pctA}%`,
            background: 'linear-gradient(90deg,hsl(215 35% 50%),hsl(215 45% 65%))',
            transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9,
          color: 'hsl(215 14% 35%)' }}>
          <span>⚡ {total.toLocaleString()} ARX-P staked</span>
          <span>{new Date(isActive ? battle.ends_at : battle.starts_at).toLocaleDateString()}</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Battle Detail full-page overlay ─────────────────────────────────────── */
function BattleDetail({ battle, isActive, userVote, participants, voting, castVote, available, onClose }: {
  battle: ArenaBattle | BattleHistoryEntry;
  isActive?: boolean;
  userVote: any;
  participants: any[];
  voting: boolean;
  castVote: (id: string, side: 'a' | 'b', amt: number) => Promise<boolean>;
  available: number;
  onClose: () => void;
}) {
  const timer = useTimer(battle.ends_at, !!isActive);
  const total = (battle.side_a_power || 0) + (battle.side_b_power || 0);
  const pctA = total > 0 ? Math.round((battle.side_a_power / total) * 100) : 50;
  const pctB = 100 - pctA;
  const existingVote = userVote?.side ?? null;
  const [side, setSide] = useState<'a' | 'b' | null>(null);
  const [amt, setAmt] = useState('');
  const pick = existingVote ?? side;

  const doVote = async () => {
    if (!pick) return;
    const n = parseInt(amt);
    if (isNaN(n) || n < 1000) { alert('Minimum 1,000 ARX-P'); return; }
    if (n > available) { alert('Insufficient ARX-P'); return; }
    const ok = await castVote(battle.id, pick, n);
    if (ok) { setAmt(''); setSide(null); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'hsl(225 30% 3%)', zIndex: 400,
        overflowY: 'auto', paddingBottom: 80,
        fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif" }}>
      <style>{CSS}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '52px 20px 0', position: 'sticky', top: 0, zIndex: 10,
        background: 'hsl(225 30% 3%/0.95)', backdropFilter: 'blur(12px)' }}>
        <button onClick={onClose} className="press"
          style={{ width: 40, height: 40, borderRadius: 14, background: 'hsl(215 25% 11%)',
            border: '1px solid hsl(215 22% 18%)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={20} color="hsl(215 25% 55%)" />
        </button>
        <div style={{ textAlign: 'center', flex: 1, padding: '0 12px' }}>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: 'hsl(215 20% 93%)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {battle.title || 'Battle Detail'}
          </h1>
          {isActive && timer && (
            <p style={{ fontSize: 10, color: 'hsl(0 60% 60%)', marginTop: 2 }}>⏱ {timer} remaining</p>
          )}
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        {/* Big VS hero */}
        <div className="glass-elevated" style={{ borderRadius: 22, overflow: 'hidden', marginBottom: 14,
          border: `1px solid ${isActive ? 'hsl(215 28% 24%/0.5)' : 'hsl(215 22% 16%)'}`,
          background: isActive ? 'linear-gradient(145deg,hsl(225 28% 11%),hsl(215 30% 14%))' : 'hsl(225 26% 9%)' }}>
          {battle.description && (
            <p style={{ fontSize: 12, color: 'hsl(215 18% 52%)', padding: '12px 16px 0',
              textAlign: 'center' }}>{battle.description}</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 44px 1fr',
            padding: '18px 12px 16px', gap: 0, alignItems: 'center' }}>
            {/* Side A */}
            <motion.div whileTap={{ scale: 0.96 }} onClick={() => isActive && !existingVote && setSide('a')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                padding: '16px 10px', borderRadius: 16, cursor: isActive && !existingVote ? 'pointer' : 'default',
                transition: 'all 0.2s',
                background: pick === 'a' ? 'hsl(215 35% 62%/0.12)' : battle.winner_side === 'a' ? 'hsl(38 55% 52%/0.08)' : 'hsl(215 26% 10%)',
                border: `2px solid ${pick === 'a' ? 'hsl(215 35% 62%/0.5)' : battle.winner_side === 'a' ? 'hsl(38 55% 52%/0.4)' : 'hsl(215 22% 17%)'}` }}>
              <SideImg src={battle.side_a_image} name={battle.side_a_name} size={72} circle />
              <p style={{ fontSize: 12, fontWeight: 800, color: 'hsl(215 18% 84%)', textAlign: 'center',
                textTransform: 'uppercase', letterSpacing: '0.04em' }}>{battle.side_a_name}</p>
              <div style={{ fontSize: 28, fontWeight: 800,
                color: battle.winner_side === 'a' ? 'hsl(38 55% 58%)' : pick === 'a' ? 'hsl(215 35% 72%)' : 'hsl(215 20% 88%)' }}>
                {pctA}%
              </div>
              <p style={{ fontSize: 10, color: 'hsl(215 14% 40%)', textAlign: 'center' }}>
                {battle.side_a_power.toLocaleString()} ARX-P
              </p>
              {battle.winner_side === 'a' && <p style={{ fontSize: 12, color: 'hsl(38 55% 58%)', fontWeight: 700 }}>👑 Winner</p>}
              {pick === 'a' && isActive && <p style={{ fontSize: 11, color: 'hsl(155 45% 55%)', fontWeight: 700 }}>✓ Your pick</p>}
            </motion.div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontWeight: 900, fontSize: 11, color: 'hsl(215 18% 35%)' }}>VS</div>
            </div>

            {/* Side B */}
            <motion.div whileTap={{ scale: 0.96 }} onClick={() => isActive && !existingVote && setSide('b')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                padding: '16px 10px', borderRadius: 16, cursor: isActive && !existingVote ? 'pointer' : 'default',
                transition: 'all 0.2s',
                background: pick === 'b' ? 'hsl(215 35% 62%/0.12)' : battle.winner_side === 'b' ? 'hsl(38 55% 52%/0.08)' : 'hsl(215 26% 10%)',
                border: `2px solid ${pick === 'b' ? 'hsl(215 35% 62%/0.5)' : battle.winner_side === 'b' ? 'hsl(38 55% 52%/0.4)' : 'hsl(215 22% 17%)'}` }}>
              <SideImg src={battle.side_b_image} name={battle.side_b_name} size={72} circle />
              <p style={{ fontSize: 12, fontWeight: 800, color: 'hsl(215 18% 84%)', textAlign: 'center',
                textTransform: 'uppercase', letterSpacing: '0.04em' }}>{battle.side_b_name}</p>
              <div style={{ fontSize: 28, fontWeight: 800,
                color: battle.winner_side === 'b' ? 'hsl(38 55% 58%)' : pick === 'b' ? 'hsl(215 35% 72%)' : 'hsl(215 20% 88%)' }}>
                {pctB}%
              </div>
              <p style={{ fontSize: 10, color: 'hsl(215 14% 40%)', textAlign: 'center' }}>
                {battle.side_b_power.toLocaleString()} ARX-P
              </p>
              {battle.winner_side === 'b' && <p style={{ fontSize: 12, color: 'hsl(38 55% 58%)', fontWeight: 700 }}>👑 Winner</p>}
              {pick === 'b' && isActive && <p style={{ fontSize: 11, color: 'hsl(155 45% 55%)', fontWeight: 700 }}>✓ Your pick</p>}
            </motion.div>
          </div>

          {/* Progress */}
          <div style={{ margin: '0 16px 8px', height: 6, borderRadius: 3,
            background: 'hsl(215 26% 12%)', overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${pctA}%` }} transition={{ duration: 0.8 }}
              style={{ height: '100%', borderRadius: 3,
                background: 'linear-gradient(90deg,hsl(215 35% 50%),hsl(215 45% 65%))' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px 14px',
            fontSize: 10, color: 'hsl(215 14% 35%)' }}>
            <span>Total: {total.toLocaleString()} ARX-P</span>
            <span>{participants.length} stakers</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Pool A', val: battle.side_a_power.toLocaleString(), col: 'hsl(215 35% 62%)' },
            { label: 'Stakers', val: String(participants.length), col: 'hsl(155 45% 50%)' },
            { label: 'Pool B', val: battle.side_b_power.toLocaleString(), col: 'hsl(255 50% 65%)' },
          ].map((s, i) => (
            <div key={i} className="glass-card" style={{ borderRadius: 16, padding: '12px 8px', textAlign: 'center' }}>
              <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em',
                color: 'hsl(215 14% 32%)', fontWeight: 600, marginBottom: 4 }}>{s.label}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: s.col }}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* Stake panel */}
        {isActive && !existingVote && (
          <div className="glass-elevated" style={{ borderRadius: 20, padding: '16px', marginBottom: 14,
            border: '1px solid hsl(215 28% 20%)' }}>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em',
              color: 'hsl(215 14% 35%)', fontWeight: 700, marginBottom: 10 }}>
              Stake ARX-P · {pick ? `backing ${pick === 'a' ? battle.side_a_name : battle.side_b_name}` : 'tap a side above first'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8,
              background: 'hsl(215 26% 10%)', border: '1px solid hsl(215 26% 17%)',
              borderRadius: 14, padding: '12px 16px', marginBottom: 10 }}>
              <input type="number" value={amt} onChange={e => setAmt(e.target.value)}
                placeholder="1,000"
                style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 22,
                  fontWeight: 700, color: 'hsl(215 20% 93%)',
                  fontFamily: "'Creato Display',-apple-system,sans-serif" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(215 35% 55%)' }}>ARX-P</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
              {[['1K', '1000'], ['5K', '5000'], ['10K', '10000'], ['Max', String(available)]].map(([l, v]) => (
                <button key={l} onClick={() => setAmt(v)}
                  style={{ padding: '8px', borderRadius: 11, background: 'hsl(215 25% 12%)',
                    border: '1px solid hsl(215 25% 20%)', color: 'hsl(215 25% 55%)',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
                  {l}
                </button>
              ))}
            </div>
            <button onClick={doVote} disabled={voting || !pick || !amt}
              style={{ width: '100%', padding: '15px', borderRadius: 16, fontWeight: 700, fontSize: 14,
                cursor: pick && amt ? 'pointer' : 'default', outline: 'none', transition: 'all 0.2s',
                fontFamily: "'Creato Display',-apple-system,sans-serif",
                background: pick && amt ? 'linear-gradient(135deg,hsl(215 35% 55%),hsl(215 40% 44%))' : 'hsl(215 25% 12%)',
                color: pick && amt ? 'white' : 'hsl(215 18% 35%)',
                border: `1.5px solid ${pick && amt ? 'hsl(215 35% 62%/0.45)' : 'hsl(215 25% 18%)'}`,
                boxShadow: pick && amt ? '0 4px 16px hsl(215 55% 62%/0.2)' : 'none' }}>
              {voting ? 'Staking…' : pick ? `Stake on ${pick === 'a' ? battle.side_a_name : battle.side_b_name}` : '← Select a side above'}
            </button>
            <p style={{ fontSize: 9, color: 'hsl(215 14% 30%)', marginTop: 8, textAlign: 'center' }}>
              Min 1,000 · Max 100,000 ARX-P · Winners earn from the losing pool
            </p>
          </div>
        )}

        {/* Voted confirmation */}
        {existingVote && isActive && (
          <div style={{ marginBottom: 14, padding: '13px 16px',
            background: 'hsl(155 45% 43%/0.07)', border: '1px solid hsl(155 45% 43%/0.25)',
            borderRadius: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, fontSize: 18, flexShrink: 0,
              background: 'hsl(155 45% 43%/0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'hsl(155 45% 55%)' }}>
                Staked {userVote?.power_spent?.toLocaleString()} ARX-P
              </p>
              <p style={{ fontSize: 11, color: 'hsl(155 45% 43%/0.6)', marginTop: 2 }}>
                On {existingVote === 'a' ? battle.side_a_name : battle.side_b_name} · Awaiting result
              </p>
            </div>
          </div>
        )}

        {/* Live stakers */}
        {participants.length > 0 && (
          <>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em',
              color: 'hsl(215 14% 30%)', fontWeight: 700, marginBottom: 10 }}>
              Stakers ({participants.length})
            </p>
            {participants.slice(0, 10).map((p: any) => (
              <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 13px', borderRadius: 14, marginBottom: 7,
                background: 'hsl(225 24% 8%)', border: '1px solid hsl(215 20% 13%)' }}>
                <div style={{ width: 30, height: 30, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
                  background: 'hsl(215 25% 13%)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'hsl(215 25% 52%)' }}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (p.username?.[0] || '?').toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(215 18% 80%)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.username || 'Miner'}
                  </p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'hsl(215 35% 62%)', flexShrink: 0 }}>
                  {p.power_spent.toLocaleString()} ARX-P
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ── Leaderboard row ─────────────────────────────────────────────────────── */
function LbRow({ entry, rank, col }: { entry: LeaderboardEntry; rank: number; col: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px',
      borderRadius: 14, marginBottom: 7,
      background: `${col}08`, border: `1px solid ${col}22` }}>
      <div style={{ width: 26, height: 26, borderRadius: 9, flexShrink: 0,
        background: `${col}20`, border: `1px solid ${col}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, color: col }}>
        {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
      </div>
      <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        background: 'hsl(225 25% 14%)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color: col }}>
        {entry.avatar_url
          ? <img src={entry.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (entry.username?.[0] || '?').toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(215 18% 84%)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.username || 'Miner'}
        </p>
        <p style={{ fontSize: 9, color: 'hsl(215 14% 38%)', marginTop: 1 }}>
          {entry.total_wins} wins · {entry.total_battles} battles
        </p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: col }}>
          {entry.total_power_staked.toLocaleString()}
        </p>
        <p style={{ fontSize: 9, color: 'hsl(215 14% 32%)', marginTop: 1 }}>ARX-P</p>
      </div>
    </div>
  );
}

/* ── Main Arena ──────────────────────────────────────────────────────────── */
export default function MobileArena() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const { points } = usePoints();
  const {
    activeBattle, userVote, participants, battleHistory,
    leaderboard, loading, voting, castVote,
  } = useArena();
  const { membership, loading: memLoading, registering, registerMembership } = useArenaMembership();

  const [showAuth, setShowAuth] = useState(false);
  const [tab, setTab] = useState<Tab>('battles');
  const [selected, setSelected] = useState<{ battle: ArenaBattle | BattleHistoryEntry; active: boolean } | null>(null);

  const available  = Math.round(points?.total_points ?? 0);
  const allHistory = battleHistory as BattleHistoryEntry[];

  // Split leaderboard by club
  const alphaBoard = leaderboard.filter((e: any) => e.club === 'alpha' || (!e.club && leaderboard.indexOf(e) % 2 === 0));
  const omegaBoard = leaderboard.filter((e: any) => e.club === 'omega' || (!e.club && leaderboard.indexOf(e) % 2 === 1));
  const myStakes   = allHistory.filter(b => b.user_participated);

  /* Not logged in */
  if (!user) return (
    <div style={{ minHeight: '100vh', background: 'hsl(225 30% 3%)', display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '0 32px', fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ fontSize: 56, marginBottom: 24 }}>⚔️</div>
      <h2 style={{ fontSize: 26, fontWeight: 700, color: 'hsl(215 20% 93%)', marginBottom: 10, textAlign: 'center' }}>
        Prediction Arena
      </h2>
      <p style={{ fontSize: 14, color: 'hsl(215 14% 42%)', textAlign: 'center', lineHeight: 1.65, marginBottom: 36 }}>
        Stake ARX-P on battle outcomes and earn from the winning pool
      </p>
      <button onClick={() => setShowAuth(true)} className="press glow-steel"
        style={{ width: '100%', padding: '18px', borderRadius: 20, cursor: 'pointer', fontWeight: 700,
          fontSize: 15, background: 'linear-gradient(135deg,hsl(215 35% 18%),hsl(225 32% 10%))',
          border: '1.5px solid hsl(215 35% 62%/0.35)', color: 'hsl(215 38% 85%)', outline: 'none',
          fontFamily: "'Creato Display',-apple-system,sans-serif" }}>
        Sign In to Enter
      </button>
      <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
    </div>
  );

  if (memLoading || loading) return (
    <div style={{ minHeight: '100vh', background: 'hsl(225 30% 3%)', display: 'flex',
      alignItems: 'center', justifyContent: 'center' }}>
      <style>{CSS}</style>
      <div style={{ width: 44, height: 44, borderRadius: '50%',
        border: '3px solid hsl(215 35% 62%/0.2)', borderTopColor: 'hsl(215 35% 62%)',
        animation: 'spin 1s linear infinite' }} />
    </div>
  );

  if (!membership) return (
    <div style={{ minHeight: '100vh', background: 'hsl(225 30% 3%)',
      fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif" }}>
      <style>{CSS}</style>
      <ArenaOnboarding onComplete={registerMembership} isLoading={registering} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(225 30% 3%)', paddingBottom: 100,
      fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif" }}>
      <style>{CSS}</style>

      {/* Detail overlay */}
      <AnimatePresence>
        {selected && (
          <BattleDetail
            battle={selected.battle}
            isActive={selected.active}
            userVote={selected.active ? userVote : null}
            participants={selected.active ? participants : []}
            voting={voting}
            castVote={castVote}
            available={available}
            onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div style={{ padding: '52px 20px 0', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between' }}>
        <button onClick={() => navigate(-1)} className="press"
          style={{ width: 40, height: 40, borderRadius: 14, background: 'hsl(215 25% 11%)',
            border: '1px solid hsl(215 22% 18%)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={20} color="hsl(215 25% 55%)" />
        </button>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 19, fontWeight: 700, color: 'hsl(215 20% 93%)' }}>Arena</h1>
          <p style={{ fontSize: 10, color: 'hsl(215 14% 38%)', marginTop: 2 }}>
            Team{' '}
            <span style={{ color: membership.club === 'alpha' ? 'hsl(215 35% 72%)' : 'hsl(255 50% 65%)',
              fontWeight: 700, textTransform: 'uppercase' }}>
              {membership.club}
            </span>
            {' · '}{available.toLocaleString()} ARX-P
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5,
          background: 'hsl(0 60% 56%/0.1)', border: '1px solid hsl(0 60% 56%/0.22)',
          borderRadius: 20, padding: '6px 12px' }}>
          <div className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'hsl(0 60% 56%)' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: 'hsl(0 60% 65%)' }}>LIVE</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', padding: '16px 20px 0' }}>
        {([['battles', 'Battles'], ['leaderboard', 'Leaderboard'], ['my-stakes', 'My Stakes']] as [Tab, string][])
          .map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '10px 0', fontSize: 12, fontWeight: 700, border: 'none',
                cursor: 'pointer', outline: 'none', transition: 'all 0.2s', background: 'none',
                color: tab === t ? 'hsl(215 35% 72%)' : 'hsl(215 14% 35%)',
                borderBottom: `2px solid ${tab === t ? 'hsl(215 35% 62%)' : 'hsl(215 20% 18%)'}`,
                fontFamily: "'Creato Display',-apple-system,sans-serif" }}>
              {label}
            </button>
          ))}
      </div>

      <div style={{ padding: '16px 20px 0' }}>

        {/* ═══ BATTLES ═══ */}
        {tab === 'battles' && (
          <>
            {activeBattle && (
              <>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em',
                  color: 'hsl(215 14% 30%)', fontWeight: 700, marginBottom: 10 }}>Active Battle</p>
                <BannerCard battle={activeBattle} isActive
                  userVoted={!!userVote} userWon={false}
                  onClick={() => setSelected({ battle: activeBattle, active: true })} />
              </>
            )}

            {allHistory.length > 0 && (
              <>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em',
                  color: 'hsl(215 14% 30%)', fontWeight: 700, marginBottom: 10,
                  marginTop: activeBattle ? 8 : 0 }}>
                  All Battles ({allHistory.length})
                </p>
                {allHistory.map(b => (
                  <BannerCard key={b.id} battle={b}
                    isActive={false}
                    userVoted={b.user_participated}
                    userWon={b.user_won}
                    onClick={() => setSelected({ battle: b, active: false })} />
                ))}
              </>
            )}

            {!activeBattle && allHistory.length === 0 && (
              <div className="glass-card" style={{ borderRadius: 20, padding: '32px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 44, marginBottom: 12 }}>⚔️</div>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'hsl(215 18% 48%)', marginBottom: 6 }}>
                  No battles yet
                </p>
                <p style={{ fontSize: 12, color: 'hsl(215 14% 32%)' }}>Check back soon!</p>
              </div>
            )}
          </>
        )}

        {/* ═══ LEADERBOARD ═══ */}
        {tab === 'leaderboard' && (
          <>
            {leaderboard.length === 0 ? (
              <div className="glass-card" style={{ borderRadius: 20, padding: '32px 20px', textAlign: 'center' }}>
                <Trophy size={36} color="hsl(215 18% 40%)" style={{ marginBottom: 12 }} />
                <p style={{ fontSize: 14, fontWeight: 700, color: 'hsl(215 18% 48%)', marginBottom: 6 }}>
                  No leaderboard data yet
                </p>
                <p style={{ fontSize: 12, color: 'hsl(215 14% 32%)' }}>
                  Stake in battles to appear here
                </p>
              </div>
            ) : (
              <>
                {/* Team totals */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                  {[
                    { label: 'Alpha Team', col: 'hsl(215 35% 62%)', count: alphaBoard.length,
                      total: alphaBoard.reduce((s, e) => s + e.total_power_staked, 0) },
                    { label: 'Omega Team', col: 'hsl(255 50% 65%)', count: omegaBoard.length,
                      total: omegaBoard.reduce((s, e) => s + e.total_power_staked, 0) },
                  ].map(t => (
                    <div key={t.label} className="glass-elevated" style={{ borderRadius: 18, padding: '14px',
                      border: `1px solid ${t.col}22` }}>
                      <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em',
                        color: t.col, fontWeight: 700, marginBottom: 6 }}>{t.label}</p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: 'hsl(215 20% 93%)',
                        letterSpacing: '-0.5px' }}>{t.total.toLocaleString()}</p>
                      <p style={{ fontSize: 9, color: 'hsl(215 14% 38%)', marginTop: 3 }}>
                        ARX-P · {t.count} members
                      </p>
                    </div>
                  ))}
                </div>

                {/* Alpha board */}
                {alphaBoard.length > 0 && (
                  <>
                    <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em',
                      color: 'hsl(215 35% 62%)', fontWeight: 700, marginBottom: 10 }}>
                      ⬡ Alpha Team
                    </p>
                    {alphaBoard.slice(0, 10).map((e, i) => (
                      <LbRow key={e.user_id} entry={e} rank={i + 1} col="hsl(215 35% 62%)" />
                    ))}
                  </>
                )}

                {/* Omega board */}
                {omegaBoard.length > 0 && (
                  <>
                    <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em',
                      color: 'hsl(255 50% 65%)', fontWeight: 700, marginBottom: 10,
                      marginTop: alphaBoard.length > 0 ? 18 : 0 }}>
                      ⬡ Omega Team
                    </p>
                    {omegaBoard.slice(0, 10).map((e, i) => (
                      <LbRow key={e.user_id} entry={e} rank={i + 1} col="hsl(255 50% 65%)" />
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ═══ MY STAKES ═══ */}
        {tab === 'my-stakes' && (
          <>
            {myStakes.length === 0 ? (
              <div className="glass-card" style={{ borderRadius: 20, padding: '32px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'hsl(215 18% 48%)', marginBottom: 6 }}>
                  No stakes yet
                </p>
                <p style={{ fontSize: 12, color: 'hsl(215 14% 32%)' }}>
                  Stake ARX-P in a battle to see history here
                </p>
              </div>
            ) : myStakes.map(b => (
              <BannerCard key={b.id} battle={b} isActive={false}
                userVoted={b.user_participated} userWon={b.user_won}
                onClick={() => setSelected({ battle: b, active: false })} />
            ))}
          </>
        )}
      </div>

      <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
    </div>
  );
}
