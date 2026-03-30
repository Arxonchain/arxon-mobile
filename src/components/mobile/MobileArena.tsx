import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useArena, type ArenaBattle, type BattleHistoryEntry, type LeaderboardEntry } from '@/hooks/useArena';
import { useArenaMembership } from '@/hooks/useArenaMembership';
import { usePoints } from '@/hooks/usePoints';
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import AuthDialog from '@/components/auth/AuthDialog';
import ArenaOnboarding from '@/components/arena/ArenaOnboarding';
import { motion, AnimatePresence } from 'framer-motion';

const CSS = `
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shimmer{0%{left:-120%}100%{left:160%}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes oddsFlash{0%{opacity:1}50%{opacity:.6}100%{opacity:1}}
`;

type Tab = 'battles' | 'leaderboard' | 'my-stakes';

function useTimer(endsAt: string | null, active: boolean) {
  const [s, setS] = useState('');
  useEffect(() => {
    if (!active || !endsAt) return;
    const tick = () => {
      const d = Math.max(0, new Date(endsAt).getTime() - Date.now());
      const h = Math.floor(d / 3600000);
      const m = String(Math.floor((d % 3600000) / 60000)).padStart(2, '0');
      const sc = String(Math.floor((d % 60000) / 1000)).padStart(2, '0');
      setS(h > 0 ? `${h}:${m}:${sc}` : `${m}:${sc}`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [endsAt, active]);
  return s;
}

/* ── SideImg: shows real photo/logo/flag or branded initials fallback ── */
function SideImg({ src, name, size = 60, shape = 'circle' }: {
  src: string | null; name: string; size?: number; shape?: 'circle' | 'square';
}) {
  const [err, setErr] = useState(false);
  const hue = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const radius = shape === 'circle' ? '50%' : `${size * 0.2}px`;
  const init = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  if (src && !err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: radius, overflow: 'hidden', flexShrink: 0,
        border: '2px solid rgba(255,255,255,0.15)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}>
        <img src={src} alt={name} onError={() => setErr(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }

  // Beautiful branded fallback — NOT just plain letters
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: `linear-gradient(145deg,hsl(${hue} 55% 28%),hsl(${(hue+60)%360} 48% 18%))`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '2px solid rgba(255,255,255,0.15)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Shine */}
      <div style={{
        position: 'absolute', top: '-40%', left: '-40%', width: '80%', height: '80%',
        background: 'radial-gradient(ellipse,rgba(255,255,255,0.25),transparent 70%)',
        borderRadius: '50%',
      }}/>
      <span style={{
        fontSize: size * 0.3, fontWeight: 900, color: 'white',
        letterSpacing: '-0.02em', position: 'relative', zIndex: 1,
        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
      }}>{init}</span>
    </div>
  );
}

/* ── BETTING BANNER CARD ── Like Betway/1xBet but Arxon style ── */
function BannerCard({ battle, isActive, userVoted, userWon, onClick }: {
  battle: ArenaBattle | BattleHistoryEntry;
  isActive?: boolean; userVoted?: boolean; userWon?: boolean; onClick: () => void;
}) {
  const timer = useTimer(battle.ends_at, !!isActive);
  const total = (battle.side_a_power || 0) + (battle.side_b_power || 0);
  const pctA  = total > 0 ? Math.round((battle.side_a_power / total) * 100) : 50;
  const pctB  = 100 - pctA;
  const concluded = !isActive && battle.winner_side;

  // Implied odds multiplier (betting style)
  const oddsA = total > 0 && battle.side_a_power > 0
    ? (total / battle.side_a_power).toFixed(2) : '2.00';
  const oddsB = total > 0 && battle.side_b_power > 0
    ? (total / battle.side_b_power).toFixed(2) : '2.00';

  const cat = (battle as any).category || 'other';
  const catColor: Record<string, string> = {
    sports: '#2dd4a0', politics: '#f5a623', crypto: '#8BAED6',
    entertainment: '#c084fc', tech: '#60a5fa', other: '#94a3b8',
  };
  const accent = catColor[cat] || '#8BAED6';

  const aWon = battle.winner_side === 'a';
  const bWon = battle.winner_side === 'b';

  return (
    <motion.div whileTap={{ scale: 0.975 }} onClick={onClick} style={{
      borderRadius: 20, overflow: 'hidden', marginBottom: 12, cursor: 'pointer',
      background: concluded && userWon
        ? 'linear-gradient(145deg,#0d2218,#091520)'
        : 'linear-gradient(145deg,#0e1828,#0b1420,#070e18)',
      border: `1px solid ${isActive ? 'rgba(139,174,214,0.28)' : concluded && userWon ? 'rgba(45,212,160,0.28)' : 'rgba(139,174,214,0.1)'}`,
      boxShadow: isActive ? '0 4px 32px rgba(139,174,214,0.08)' : 'none',
    }}>
      {/* Shimmer line for live */}
      {isActive && (
        <div style={{ height: 2, background: `linear-gradient(90deg,transparent,${accent},transparent)`,
          opacity: 0.7, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)',
            animation: 'shimmer 2s linear infinite', width: '50%' }}/>
        </div>
      )}

      {/* ── TOP: title + badges ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: '12px 14px 0', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
              background: `${accent}18`, color: accent, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {cat}
            </span>
            {isActive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4,
                background: 'rgba(220,50,50,0.12)', border: '1px solid rgba(220,50,50,0.28)',
                borderRadius: 8, padding: '2px 7px' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#e05555',
                  animation: 'pulse 1.2s ease-in-out infinite' }}/>
                <span style={{ fontSize: 8, fontWeight: 800, color: '#e07070', letterSpacing: '.06em' }}>
                  LIVE · {timer}
                </span>
              </div>
            )}
            {concluded && (
              <div style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
                color: userWon ? '#2dd4a0' : 'rgba(139,174,214,0.45)',
                background: userWon ? 'rgba(45,212,160,0.1)' : 'rgba(139,174,214,0.06)',
                border: `1px solid ${userWon ? 'rgba(45,212,160,0.25)' : 'rgba(139,174,214,0.14)'}` }}>
                {userVoted ? (userWon ? '🏆 WON' : '💧 LOST') : 'ENDED'}
              </div>
            )}
            {!isActive && !concluded && (
              <div style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 8,
                color: '#f5a623', background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.22)' }}>
                UPCOMING
              </div>
            )}
          </div>
          <p style={{ fontSize: 13, fontWeight: 800, color: 'rgba(240,244,255,0.92)',
            lineHeight: 1.3, letterSpacing: '-0.2px' }}>
            {battle.title || 'Arena Battle'}
          </p>
          {battle.description && (
            <p style={{ fontSize: 10, color: 'rgba(139,174,214,0.5)', marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {battle.description}
            </p>
          )}
        </div>
        <ChevronRight size={14} color="rgba(139,174,214,0.3)" style={{ flexShrink: 0, marginTop: 2 }}/>
      </div>

      {/* ── MAIN VS SECTION ── Betting banner style ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 1fr',
        padding: '14px 12px 10px', gap: 0, alignItems: 'center' }}>

        {/* SIDE A */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
          padding: '0 8px 12px',
          borderRight: '1px solid rgba(139,174,214,0.08)',
          opacity: concluded && bWon ? 0.55 : 1,
        }}>
          {/* Image */}
          <div style={{ position: 'relative' }}>
            <SideImg src={battle.side_a_image} name={battle.side_a_name} size={62} shape="circle"/>
            {aWon && (
              <div style={{ position: 'absolute', top: -6, right: -6,
                width: 20, height: 20, borderRadius: '50%', background: '#f5a623',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, boxShadow: '0 0 10px rgba(245,166,35,0.6)' }}>👑</div>
            )}
          </div>
          {/* Name */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'rgba(240,244,255,0.9)',
            textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em',
            maxWidth: 82, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {battle.side_a_name}
          </p>
          {/* Betting odds pill */}
          <div style={{
            padding: '5px 12px', borderRadius: 10,
            background: aWon ? 'rgba(245,166,35,0.15)' : 'rgba(139,174,214,0.1)',
            border: `1px solid ${aWon ? 'rgba(245,166,35,0.35)' : 'rgba(139,174,214,0.2)'}`,
          }}>
            <div style={{ fontSize: 15, fontWeight: 900, textAlign: 'center',
              color: aWon ? '#f5a623' : '#accafe', letterSpacing: '-0.02em' }}>
              {oddsA}×
            </div>
            <div style={{ fontSize: 8, color: 'rgba(139,174,214,0.45)', textAlign: 'center',
              marginTop: 1, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {pctA}% backed
            </div>
          </div>
        </div>

        {/* VS CENTER */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 4 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(145deg,rgba(139,174,214,0.12),rgba(139,174,214,0.05))',
            border: '1px solid rgba(139,174,214,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(139,174,214,0.7)',
              letterSpacing: '0.04em' }}>VS</span>
          </div>
          {isActive && (
            <div style={{ fontSize: 8, color: 'rgba(139,174,214,0.3)', textAlign: 'center',
              lineHeight: 1.3, maxWidth: 36, wordBreak: 'break-all' }}>
              {(battle.side_a_power + battle.side_b_power).toLocaleString()}<br/>
              <span style={{ fontSize: 7 }}>ARX-P</span>
            </div>
          )}
        </div>

        {/* SIDE B */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
          padding: '0 8px 12px',
          borderLeft: '1px solid rgba(139,174,214,0.08)',
          opacity: concluded && aWon ? 0.55 : 1,
        }}>
          <div style={{ position: 'relative' }}>
            <SideImg src={battle.side_b_image} name={battle.side_b_name} size={62} shape="circle"/>
            {bWon && (
              <div style={{ position: 'absolute', top: -6, right: -6,
                width: 20, height: 20, borderRadius: '50%', background: '#f5a623',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, boxShadow: '0 0 10px rgba(245,166,35,0.6)' }}>👑</div>
            )}
          </div>
          <p style={{ fontSize: 11, fontWeight: 800, color: 'rgba(240,244,255,0.9)',
            textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em',
            maxWidth: 82, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {battle.side_b_name}
          </p>
          <div style={{
            padding: '5px 12px', borderRadius: 10,
            background: bWon ? 'rgba(245,166,35,0.15)' : 'rgba(139,174,214,0.1)',
            border: `1px solid ${bWon ? 'rgba(245,166,35,0.35)' : 'rgba(139,174,214,0.2)'}`,
          }}>
            <div style={{ fontSize: 15, fontWeight: 900, textAlign: 'center',
              color: bWon ? '#f5a623' : '#accafe', letterSpacing: '-0.02em' }}>
              {oddsB}×
            </div>
            <div style={{ fontSize: 8, color: 'rgba(139,174,214,0.45)', textAlign: 'center',
              marginTop: 1, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {pctB}% backed
            </div>
          </div>
        </div>
      </div>

      {/* ── PROGRESS BAR ── */}
      <div style={{ padding: '0 14px 12px' }}>
        <div style={{ height: 6, borderRadius: 3, background: 'rgba(139,174,214,0.06)',
          overflow: 'hidden', marginBottom: 6, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
            <div style={{ width: `${pctA}%`, background: `linear-gradient(90deg,rgba(139,174,214,0.6),rgba(172,202,254,0.9))`,
              borderRadius: '3px 0 0 3px', transition: 'width 0.6s ease' }}/>
            <div style={{ flex: 1, background: `linear-gradient(90deg,rgba(245,166,35,0.9),rgba(245,166,35,0.5))`,
              borderRadius: '0 3px 3px 0' }}/>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9,
          color: 'rgba(139,174,214,0.4)' }}>
          <span>⚡ {total.toLocaleString()} ARX-P staked</span>
          <span>{new Date(battle.ends_at).toLocaleDateString()}</span>
        </div>
      </div>
    </motion.div>
  );
}

/* ── BATTLE DETAIL OVERLAY ── */
function BattleDetail({ battle, isActive, userVote, participants, voting, castVote, available, onClose }: {
  battle: ArenaBattle | BattleHistoryEntry; isActive?: boolean; userVote: any;
  participants: any[]; voting: boolean;
  castVote: (id: string, side: 'a' | 'b', amt: number) => Promise<boolean>;
  available: number; onClose: () => void;
}) {
  const timer = useTimer(battle.ends_at, !!isActive);
  const total = (battle.side_a_power || 0) + (battle.side_b_power || 0);
  const pctA  = total > 0 ? Math.round((battle.side_a_power / total) * 100) : 50;
  const pctB  = 100 - pctA;
  const oddsA = total > 0 && battle.side_a_power > 0 ? (total / battle.side_a_power).toFixed(2) : '2.00';
  const oddsB = total > 0 && battle.side_b_power > 0 ? (total / battle.side_b_power).toFixed(2) : '2.00';
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

  const aWon = battle.winner_side === 'a';
  const bWon = battle.winner_side === 'b';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'hsl(225 30% 3%)', zIndex: 400,
        overflowY: 'auto', paddingBottom: 100,
        fontFamily: "'Creato Display',-apple-system,system-ui,sans-serif" }}>
      <style>{CSS}</style>

      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'hsl(225 30% 3%/0.95)',
        backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(139,174,214,0.08)',
        display: 'flex', alignItems: 'center', padding: '52px 20px 14px', gap: 14 }}>
        <button onClick={onClose} style={{ width: 40, height: 40, borderRadius: 14,
          background: 'rgba(139,174,214,0.08)', border: '1px solid rgba(139,174,214,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={20} color="rgba(139,174,214,0.7)" />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'rgba(240,244,255,0.95)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.2px' }}>
            {battle.title}
          </p>
          {isActive && timer && (
            <p style={{ fontSize: 10, color: '#e07070', marginTop: 2 }}>⏱ {timer} remaining</p>
          )}
        </div>
        {isActive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
            background: 'rgba(220,50,50,0.1)', border: '1px solid rgba(220,50,50,0.25)',
            borderRadius: 12, padding: '6px 10px' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#e05555',
              animation: 'pulse 1.2s ease-in-out infinite' }}/>
            <span style={{ fontSize: 9, fontWeight: 800, color: '#e07070' }}>LIVE</span>
          </div>
        )}
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Description */}
        {battle.description && (
          <div style={{ padding: '10px 14px', borderRadius: 14, background: 'rgba(139,174,214,0.05)',
            border: '1px solid rgba(139,174,214,0.1)', marginBottom: 14 }}>
            <p style={{ fontSize: 12, color: 'rgba(139,174,214,0.6)', lineHeight: 1.6, textAlign: 'center' }}>
              {battle.description}
            </p>
          </div>
        )}

        {/* BIG VS PANEL */}
        <div style={{ borderRadius: 22, overflow: 'hidden', marginBottom: 14,
          border: `1px solid ${isActive ? 'rgba(139,174,214,0.2)' : 'rgba(139,174,214,0.1)'}`,
          background: 'linear-gradient(145deg,#0e1828,#0b1420)' }}>

          {/* Shimmer top */}
          {isActive && (
            <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,rgba(172,202,254,0.6),transparent)',
              position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)',
                animation: 'shimmer 2s linear infinite', width: '50%' }}/>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 1fr',
            padding: '20px 10px 16px', gap: 0 }}>

            {/* SIDE A */}
            <motion.div whileTap={isActive && !existingVote ? { scale: 0.97 } : {}}
              onClick={() => isActive && !existingVote && setSide('a')}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                padding: '16px 8px', borderRadius: 18, cursor: isActive && !existingVote ? 'pointer' : 'default',
                transition: 'all 0.25s',
                background: pick === 'a' ? 'rgba(172,202,254,0.1)' : aWon ? 'rgba(245,166,35,0.06)' : 'rgba(139,174,214,0.03)',
                border: `2px solid ${pick === 'a' ? 'rgba(172,202,254,0.45)' : aWon ? 'rgba(245,166,35,0.4)' : 'rgba(139,174,214,0.1)'}`,
                opacity: battle.winner_side && bWon ? 0.5 : 1,
              }}>
              <div style={{ position: 'relative' }}>
                <SideImg src={battle.side_a_image} name={battle.side_a_name} size={80} shape="circle"/>
                {aWon && (
                  <div style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24,
                    borderRadius: '50%', background: '#f5a623', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 12, boxShadow: '0 0 12px rgba(245,166,35,0.7)' }}>👑</div>
                )}
              </div>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'rgba(240,244,255,0.95)',
                textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em',
                maxWidth: 90, lineHeight: 1.25 }}>
                {battle.side_a_name}
              </p>
              {/* Big odds */}
              <div style={{ padding: '8px 16px', borderRadius: 14,
                background: pick === 'a' ? 'rgba(172,202,254,0.18)' : aWon ? 'rgba(245,166,35,0.15)' : 'rgba(139,174,214,0.08)',
                border: `1.5px solid ${pick === 'a' ? 'rgba(172,202,254,0.45)' : aWon ? 'rgba(245,166,35,0.35)' : 'rgba(139,174,214,0.15)'}` }}>
                <div style={{ fontSize: 22, fontWeight: 900, textAlign: 'center', letterSpacing: '-0.03em',
                  color: aWon ? '#f5a623' : pick === 'a' ? '#accafe' : 'rgba(240,244,255,0.85)' }}>
                  {oddsA}×
                </div>
                <div style={{ fontSize: 9, textAlign: 'center', marginTop: 2, letterSpacing: '.04em',
                  color: 'rgba(139,174,214,0.5)', textTransform: 'uppercase' }}>
                  {pctA}% · {battle.side_a_power.toLocaleString()}
                </div>
              </div>
              {aWon && <div style={{ fontSize: 11, fontWeight: 700, color: '#f5a623' }}>👑 Winner</div>}
              {pick === 'a' && isActive && !existingVote && (
                <div style={{ fontSize: 10, fontWeight: 700, color: '#2dd4a0' }}>✓ Selected</div>
              )}
            </motion.div>

            {/* VS */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 6 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12,
                background: 'rgba(139,174,214,0.08)', border: '1px solid rgba(139,174,214,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: 'rgba(139,174,214,0.6)' }}>VS</span>
              </div>
              <div style={{ fontSize: 8, color: 'rgba(139,174,214,0.3)', textAlign: 'center' }}>
                {total.toLocaleString()}<br/>ARX-P
              </div>
            </div>

            {/* SIDE B */}
            <motion.div whileTap={isActive && !existingVote ? { scale: 0.97 } : {}}
              onClick={() => isActive && !existingVote && setSide('b')}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                padding: '16px 8px', borderRadius: 18, cursor: isActive && !existingVote ? 'pointer' : 'default',
                transition: 'all 0.25s',
                background: pick === 'b' ? 'rgba(245,166,35,0.08)' : bWon ? 'rgba(245,166,35,0.06)' : 'rgba(139,174,214,0.03)',
                border: `2px solid ${pick === 'b' ? 'rgba(245,166,35,0.45)' : bWon ? 'rgba(245,166,35,0.4)' : 'rgba(139,174,214,0.1)'}`,
                opacity: battle.winner_side && aWon ? 0.5 : 1,
              }}>
              <div style={{ position: 'relative' }}>
                <SideImg src={battle.side_b_image} name={battle.side_b_name} size={80} shape="circle"/>
                {bWon && (
                  <div style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24,
                    borderRadius: '50%', background: '#f5a623', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 12, boxShadow: '0 0 12px rgba(245,166,35,0.7)' }}>👑</div>
                )}
              </div>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'rgba(240,244,255,0.95)',
                textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em',
                maxWidth: 90, lineHeight: 1.25 }}>
                {battle.side_b_name}
              </p>
              <div style={{ padding: '8px 16px', borderRadius: 14,
                background: pick === 'b' ? 'rgba(245,166,35,0.15)' : bWon ? 'rgba(245,166,35,0.15)' : 'rgba(139,174,214,0.08)',
                border: `1.5px solid ${pick === 'b' ? 'rgba(245,166,35,0.45)' : bWon ? 'rgba(245,166,35,0.35)' : 'rgba(139,174,214,0.15)'}` }}>
                <div style={{ fontSize: 22, fontWeight: 900, textAlign: 'center', letterSpacing: '-0.03em',
                  color: bWon ? '#f5a623' : pick === 'b' ? '#f5a623' : 'rgba(240,244,255,0.85)' }}>
                  {oddsB}×
                </div>
                <div style={{ fontSize: 9, textAlign: 'center', marginTop: 2, letterSpacing: '.04em',
                  color: 'rgba(139,174,214,0.5)', textTransform: 'uppercase' }}>
                  {pctB}% · {battle.side_b_power.toLocaleString()}
                </div>
              </div>
              {bWon && <div style={{ fontSize: 11, fontWeight: 700, color: '#f5a623' }}>👑 Winner</div>}
              {pick === 'b' && isActive && !existingVote && (
                <div style={{ fontSize: 10, fontWeight: 700, color: '#2dd4a0' }}>✓ Selected</div>
              )}
            </motion.div>
          </div>

          {/* Progress bar */}
          <div style={{ margin: '0 14px 14px', height: 8, borderRadius: 4,
            background: 'rgba(139,174,214,0.06)', overflow: 'hidden' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${pctA}%` }} transition={{ duration: 0.8 }}
              style={{ height: '100%', borderRadius: '4px 0 0 4px',
                background: 'linear-gradient(90deg,rgba(139,174,214,0.6),rgba(172,202,254,0.9))' }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 14px 14px',
            fontSize: 9, color: 'rgba(139,174,214,0.35)' }}>
            <span>{battle.side_a_name} · {pctA}%</span>
            <span>{battle.side_b_name} · {pctB}%</span>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label:'Pool', val:`${total.toLocaleString()}`, sub:'ARX-P', col:'#accafe' },
            { label:'Stakers', val:String(participants.length), sub:'players', col:'#2dd4a0' },
            { label:'Bonus', val:`${((battle as any).bonus_percentage || 200)}%`, sub:'reward', col:'#f5a623' },
          ].map(s => (
            <div key={s.label} style={{ borderRadius: 16, padding: '12px 8px', textAlign: 'center',
              background: 'rgba(139,174,214,0.05)', border: '1px solid rgba(139,174,214,0.1)' }}>
              <div style={{ fontSize: 9, color: 'rgba(139,174,214,0.4)', textTransform: 'uppercase',
                letterSpacing: '.08em', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: s.col }}>{s.val}</div>
              <div style={{ fontSize: 8, color: 'rgba(139,174,214,0.3)', marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* STAKE PANEL */}
        {isActive && !existingVote && (
          <div style={{ borderRadius: 20, padding: '16px', marginBottom: 14,
            background: 'rgba(139,174,214,0.05)', border: '1px solid rgba(139,174,214,0.15)' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em',
              color: 'rgba(139,174,214,0.5)', fontWeight: 700, marginBottom: 12 }}>
              {pick ? `Stake on ${pick === 'a' ? battle.side_a_name : battle.side_b_name}` : '← Tap a side above to select'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(9,12,18,0.6)', border: '1px solid rgba(139,174,214,0.15)',
              borderRadius: 14, padding: '12px 16px', marginBottom: 10 }}>
              <input type="number" value={amt} onChange={e => setAmt(e.target.value)}
                placeholder="0" style={{ flex: 1, background: 'none', border: 'none', outline: 'none',
                  fontSize: 24, fontWeight: 900, color: 'rgba(240,244,255,0.95)',
                  fontFamily: "'Creato Display',-apple-system,sans-serif" }}/>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(139,174,214,0.6)' }}>ARX-P</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
              {[['1K','1000'],['5K','5000'],['10K','10000'],['Max',String(available)]].map(([l,v]) => (
                <button key={l} onClick={() => setAmt(v)}
                  style={{ padding: '8px', borderRadius: 10, background: 'rgba(139,174,214,0.08)',
                    border: '1px solid rgba(139,174,214,0.15)', color: 'rgba(139,174,214,0.8)',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {l}
                </button>
              ))}
            </div>
            <button onClick={doVote} disabled={voting || !pick || !amt}
              style={{ width: '100%', padding: '16px', borderRadius: 16, fontWeight: 800, fontSize: 15,
                cursor: pick && amt ? 'pointer' : 'default', outline: 'none', transition: 'all 0.2s',
                fontFamily: "'Creato Display',-apple-system,sans-serif",
                background: pick && amt
                  ? 'linear-gradient(135deg,rgba(139,174,214,0.3),rgba(172,202,254,0.15))'
                  : 'rgba(139,174,214,0.06)',
                color: pick && amt ? '#accafe' : 'rgba(139,174,214,0.3)',
                border: `1.5px solid ${pick && amt ? 'rgba(172,202,254,0.4)' : 'rgba(139,174,214,0.1)'}` }}>
              {voting ? 'Staking…' : pick ? `Stake on ${pick === 'a' ? battle.side_a_name : battle.side_b_name}` : 'Select a side first'}
            </button>
            <p style={{ fontSize: 9, color: 'rgba(139,174,214,0.3)', marginTop: 8, textAlign: 'center' }}>
              Min 1,000 · Max 100,000 ARX-P · Winners share the losing pool
            </p>
          </div>
        )}

        {/* Already voted */}
        {existingVote && isActive && (
          <div style={{ marginBottom: 14, padding: '14px 16px',
            background: 'rgba(45,212,160,0.07)', border: '1px solid rgba(45,212,160,0.2)',
            borderRadius: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(45,212,160,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>✓</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#2dd4a0' }}>
                Staked {userVote?.power_spent?.toLocaleString()} ARX-P
              </p>
              <p style={{ fontSize: 11, color: 'rgba(45,212,160,0.55)', marginTop: 2 }}>
                On {existingVote === 'a' ? battle.side_a_name : battle.side_b_name} · Awaiting result
              </p>
            </div>
          </div>
        )}

        {/* Stakers list */}
        {participants.length > 0 && (
          <>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em',
              color: 'rgba(139,174,214,0.35)', fontWeight: 700, marginBottom: 10 }}>
              Stakers ({participants.length})
            </p>
            {participants.slice(0, 10).map((p: any) => (
              <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 14, marginBottom: 7,
                background: 'rgba(139,174,214,0.04)', border: '1px solid rgba(139,174,214,0.08)' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(139,174,214,0.1)', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: 'rgba(139,174,214,0.7)' }}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" style={{ width:'100%',height:'100%',objectFit:'cover'}}/>
                    : (p.username?.[0] || '?').toUpperCase()}
                </div>
                <p style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'rgba(240,244,255,0.8)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.username || 'Miner'}
                </p>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#accafe', flexShrink: 0 }}>
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

/* ── Leaderboard row ── */
function LbRow({ entry, rank, col }: { entry: LeaderboardEntry; rank: number; col: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
      borderRadius: 14, marginBottom: 7, background: `${col}06`, border: `1px solid ${col}18` }}>
      <div style={{ width: 26, height: 26, borderRadius: 9, flexShrink: 0,
        background: `${col}18`, border: `1px solid ${col}38`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 800, color: col }}>
        {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : rank}
      </div>
      <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        background: 'rgba(139,174,214,0.1)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 12, fontWeight: 700, color: col }}>
        {entry.avatar_url
          ? <img src={entry.avatar_url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          : (entry.username?.[0] || '?').toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(240,244,255,0.85)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.username || 'Miner'}
        </p>
        <p style={{ fontSize: 9, color: 'rgba(139,174,214,0.4)', marginTop: 1 }}>
          {entry.total_wins}W · {entry.total_battles} battles
        </p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: col }}>{entry.total_power_staked.toLocaleString()}</p>
        <p style={{ fontSize: 8, color: 'rgba(139,174,214,0.3)', marginTop: 1 }}>ARX-P</p>
      </div>
    </div>
  );
}

/* ── MAIN ── */
export default function MobileArena() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const { points } = usePoints();
  const { activeBattle, userVote, participants, battleHistory, leaderboard, loading, voting, castVote } = useArena();
  const { membership, loading: memLoading, registering, registerMembership } = useArenaMembership();

  const [showAuth, setShowAuth]   = useState(false);
  const [tab, setTab]             = useState<Tab>('battles');
  const [selected, setSelected]   = useState<{ battle: ArenaBattle | BattleHistoryEntry; active: boolean } | null>(null);

  const available  = Math.round(points?.total_points ?? 0);
  const allHistory = battleHistory as BattleHistoryEntry[];
  const alphaBoard = leaderboard.filter((e: any) => e.club === 'alpha' || (!e.club && leaderboard.indexOf(e) % 2 === 0));
  const omegaBoard = leaderboard.filter((e: any) => e.club === 'omega' || (!e.club && leaderboard.indexOf(e) % 2 === 1));
  const myStakes   = allHistory.filter(b => b.user_participated);

  if (!user) return (
    <div style={{ minHeight:'100vh', background:'hsl(225 30% 3%)', display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', padding:'0 32px',
      fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif" }}>
      <style>{CSS}</style>
      <div style={{ fontSize:56, marginBottom:20 }}>⚔️</div>
      <h2 style={{ fontSize:26, fontWeight:800, color:'rgba(240,244,255,0.95)', marginBottom:10, textAlign:'center', letterSpacing:'-0.03em' }}>
        Prediction Arena
      </h2>
      <p style={{ fontSize:13, color:'rgba(139,174,214,0.5)', textAlign:'center', lineHeight:1.7, marginBottom:36 }}>
        Stake ARX-P on battle outcomes.<br/>Winners share the entire losing pool.
      </p>
      <button onClick={() => setShowAuth(true)} style={{ width:'100%', padding:'18px', borderRadius:20,
        cursor:'pointer', fontWeight:800, fontSize:15,
        background:'linear-gradient(135deg,rgba(139,174,214,0.18),rgba(139,174,214,0.08))',
        border:'1.5px solid rgba(172,202,254,0.35)', color:'#accafe', outline:'none',
        fontFamily:"'Creato Display',-apple-system,sans-serif" }}>
        Sign In to Enter
      </button>
      <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
    </div>
  );

  if (memLoading || loading) return (
    <div style={{ minHeight:'100vh', background:'hsl(225 30% 3%)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <style>{CSS}</style>
      <div style={{ width:44, height:44, borderRadius:'50%',
        border:'3px solid rgba(139,174,214,0.15)', borderTopColor:'rgba(139,174,214,0.7)',
        animation:'spin 1s linear infinite' }}/>
    </div>
  );

  if (!membership) return (
    <div style={{ minHeight:'100vh', background:'hsl(225 30% 3%)',
      fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif" }}>
      <style>{CSS}</style>
      <ArenaOnboarding onComplete={registerMembership} isLoading={registering} />
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'hsl(225 30% 3%)', paddingBottom:110,
      fontFamily:"'Creato Display',-apple-system,system-ui,sans-serif" }}>
      <style>{CSS}</style>

      {/* Detail overlay */}
      <AnimatePresence>
        {selected && (
          <BattleDetail battle={selected.battle} isActive={selected.active}
            userVote={selected.active ? userVote : null}
            participants={selected.active ? participants : []}
            voting={voting} castVote={castVote} available={available}
            onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ padding:'52px 20px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:'rgba(240,244,255,0.95)', letterSpacing:'-0.02em' }}>Arena</h1>
          <p style={{ fontSize:10, color:'rgba(139,174,214,0.45)', marginTop:2 }}>
            Team <span style={{ color: membership.club==='alpha' ? '#accafe' : '#c084fc',
              fontWeight:700, textTransform:'uppercase' }}>{membership.club}</span>
            {' · '}{available.toLocaleString()} ARX-P
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6,
          background:'rgba(220,50,50,0.1)', border:'1px solid rgba(220,50,50,0.22)',
          borderRadius:20, padding:'7px 14px' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#e05555',
            animation:'pulse 1.2s ease-in-out infinite' }}/>
          <span style={{ fontSize:10, fontWeight:800, color:'#e07070' }}>LIVE</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', padding:'16px 20px 0', borderBottom:'1px solid rgba(139,174,214,0.08)' }}>
        {([['battles','Battles'],['leaderboard','Board'],['my-stakes','My Bets']] as [Tab,string][]).map(([t,label]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex:1, padding:'10px 0', fontSize:12, fontWeight:700, border:'none',
              cursor:'pointer', outline:'none', background:'none',
              color: tab===t ? '#accafe' : 'rgba(139,174,214,0.35)',
              borderBottom:`2px solid ${tab===t ? '#accafe' : 'transparent'}`,
              fontFamily:"'Creato Display',-apple-system,sans-serif",
              transition:'all 0.2s' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding:'16px 16px 0' }}>

        {/* BATTLES TAB */}
        {tab === 'battles' && (
          <>
            {activeBattle && (
              <>
                <p style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.12em',
                  color:'rgba(220,80,80,0.7)', fontWeight:700, marginBottom:10 }}>🔴 Active Battle</p>
                <BannerCard battle={activeBattle} isActive
                  userVoted={!!userVote} userWon={false}
                  onClick={() => setSelected({ battle:activeBattle, active:true })} />
              </>
            )}
            {allHistory.length > 0 && (
              <>
                <p style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.12em',
                  color:'rgba(139,174,214,0.4)', fontWeight:700, marginBottom:10, marginTop:activeBattle?8:0 }}>
                  Past Battles ({allHistory.length})
                </p>
                {allHistory.map(b => (
                  <BannerCard key={b.id} battle={b} isActive={false}
                    userVoted={b.user_participated} userWon={b.user_won}
                    onClick={() => setSelected({ battle:b, active:false })} />
                ))}
              </>
            )}
            {!activeBattle && allHistory.length === 0 && (
              <div style={{ borderRadius:20, padding:'40px 20px', textAlign:'center',
                background:'rgba(139,174,214,0.04)', border:'1px solid rgba(139,174,214,0.08)' }}>
                <div style={{ fontSize:48, marginBottom:12 }}>⚔️</div>
                <p style={{ fontSize:15, fontWeight:700, color:'rgba(139,174,214,0.5)', marginBottom:6 }}>No battles yet</p>
                <p style={{ fontSize:12, color:'rgba(139,174,214,0.3)' }}>Admin will create a battle soon!</p>
              </div>
            )}
          </>
        )}

        {/* LEADERBOARD TAB */}
        {tab === 'leaderboard' && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:18 }}>
              {[
                { label:'Alpha', col:'#accafe', board:alphaBoard },
                { label:'Omega', col:'#c084fc', board:omegaBoard },
              ].map(t => (
                <div key={t.label} style={{ borderRadius:18, padding:'14px',
                  background:`${t.col}06`, border:`1px solid ${t.col}18` }}>
                  <p style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.1em',
                    color:t.col, fontWeight:700, marginBottom:6 }}>{t.label} Team</p>
                  <p style={{ fontSize:18, fontWeight:900, color:'rgba(240,244,255,0.9)', letterSpacing:'-0.03em' }}>
                    {t.board.reduce((s,e)=>s+e.total_power_staked,0).toLocaleString()}
                  </p>
                  <p style={{ fontSize:9, color:'rgba(139,174,214,0.35)', marginTop:3 }}>
                    ARX-P · {t.board.length} members
                  </p>
                </div>
              ))}
            </div>
            {alphaBoard.length > 0 && (
              <>
                <p style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.12em',
                  color:'#accafe', fontWeight:700, marginBottom:10 }}>Alpha Team</p>
                {alphaBoard.slice(0,10).map((e,i)=><LbRow key={e.user_id} entry={e} rank={i+1} col="#accafe"/>)}
              </>
            )}
            {omegaBoard.length > 0 && (
              <>
                <p style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'.12em',
                  color:'#c084fc', fontWeight:700, marginBottom:10, marginTop:alphaBoard.length?18:0 }}>Omega Team</p>
                {omegaBoard.slice(0,10).map((e,i)=><LbRow key={e.user_id} entry={e} rank={i+1} col="#c084fc"/>)}
              </>
            )}
            {leaderboard.length === 0 && (
              <div style={{ borderRadius:20, padding:'32px 20px', textAlign:'center',
                background:'rgba(139,174,214,0.04)', border:'1px solid rgba(139,174,214,0.08)' }}>
                <Trophy size={36} color="rgba(139,174,214,0.3)" style={{ marginBottom:12 }}/>
                <p style={{ fontSize:14, fontWeight:700, color:'rgba(139,174,214,0.4)', marginBottom:6 }}>No data yet</p>
                <p style={{ fontSize:12, color:'rgba(139,174,214,0.25)' }}>Stake in battles to appear here</p>
              </div>
            )}
          </>
        )}

        {/* MY STAKES TAB */}
        {tab === 'my-stakes' && (
          <>
            {myStakes.length === 0 ? (
              <div style={{ borderRadius:20, padding:'40px 20px', textAlign:'center',
                background:'rgba(139,174,214,0.04)', border:'1px solid rgba(139,174,214,0.08)' }}>
                <div style={{ fontSize:44, marginBottom:12 }}>🎯</div>
                <p style={{ fontSize:15, fontWeight:700, color:'rgba(139,174,214,0.4)', marginBottom:6 }}>No stakes yet</p>
                <p style={{ fontSize:12, color:'rgba(139,174,214,0.25)' }}>Enter a battle to see your history</p>
              </div>
            ) : (
              myStakes.map(b => (
                <BannerCard key={b.id} battle={b} isActive={false}
                  userVoted={b.user_participated} userWon={b.user_won}
                  onClick={() => setSelected({ battle:b, active:false })} />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
