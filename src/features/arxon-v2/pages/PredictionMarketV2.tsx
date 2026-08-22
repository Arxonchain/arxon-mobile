import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useArena, type ArenaBattle, type BattleHistoryEntry } from '@/hooks/useArena';
import { useArenaMarkets } from '@/hooks/useArenaMarkets';
import { useArenaMembership } from '@/hooks/useArenaMembership';
import { usePoints } from '@/hooks/usePoints';
import AuthDialog from '@/components/auth/AuthDialog';
import ArenaOnboarding from '@/components/arena/ArenaOnboarding';
import { toast } from '@/hooks/use-toast';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { getArenaPoolStats } from '@/lib/arenaPoolStats';
import MobileAIPredictionBadge from '@/components/mobile/MobileAIPredictionBadge';
import { useStakeCompliance } from '@/hooks/useStakeCompliance';
import { STAKING_DISCLAIMER_TEXT } from '@/components/legal/StakingDisclaimer';
import { useIsAppPreview, toPreviewPath } from '@/features/arxon-v2/preview/AppPreviewContext';
import {
  V2Page,
  V2Header,
  V2HeroCard,
  V2Card,
  V2Button,
  V2ButtonGhost,
  V2Tabs,
  V2Pills,
  V2SectionHeader,
  V2Eyebrow,
  V2StatGrid,
  fadeUp,
} from '../design/Kit';
import { v2 } from '../design/tokens';

const CSS = `
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
.pulse{animation:pulse 1.2s ease-in-out infinite}
@keyframes spin{to{transform:rotate(360deg)}}
`;

type ArenaSide = 'a' | 'b' | 'c';
type Tab = 'battles' | 'leaderboard' | 'my-stakes';
type BattleFilter = 'live' | 'upcoming' | 'ended';

const ARENA = v2.accent.arena;
const ALPHA = 'hsl(195 80% 50%)';
const OMEGA = 'hsl(255 60% 65%)';

function getPoolStats(battle: Parameters<typeof getArenaPoolStats>[0]) {
  return getArenaPoolStats(battle);
}

function sideName(
  battle: { side_a_name: string; side_b_name: string; side_c_name?: string | null },
  side: ArenaSide,
) {
  if (side === 'a') return battle.side_a_name;
  if (side === 'c') return battle.side_c_name || 'Draw';
  return battle.side_b_name;
}

function useTimer(endsAt: string | null, active: boolean) {
  const [str, setStr] = useState('');
  useEffect(() => {
    if (!active || !endsAt) return;
    const tick = () => {
      const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setStr(h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt, active]);
  return str;
}

function StatusBadge({
  isActive,
  isEnded,
  concluded,
  userVoted,
  userWon,
  timer,
}: {
  isActive?: boolean;
  isEnded?: boolean;
  concluded: boolean;
  userVoted?: boolean;
  userWon?: boolean;
  timer: string;
}) {
  if (isActive) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: `${v2.accent.danger}18`,
          border: `1px solid ${v2.accent.danger}38`,
          borderRadius: 20,
          padding: '3px 9px',
        }}
      >
        <div className="pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: v2.accent.danger }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: v2.accent.danger }}>LIVE · {timer}</span>
      </div>
    );
  }
  if (concluded) {
    const label = userVoted ? (userWon ? '🏆 Won' : '💧 Lost') : 'Resolved';
    return (
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          padding: '3px 9px',
          borderRadius: 20,
          color: userVoted ? (userWon ? v2.accent.success : v2.brand.mutedSoft) : v2.accent.gold,
          background: userVoted
            ? userWon
              ? `${v2.accent.success}18`
              : v2.brand.raised
            : `${v2.accent.gold}18`,
          border: `1px solid ${
            userVoted
              ? userWon
                ? `${v2.accent.success}38`
                : v2.brand.border
              : `${v2.accent.gold}44`
          }`,
        }}
      >
        {label}
      </div>
    );
  }
  if (!isEnded) {
    return (
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          padding: '3px 9px',
          borderRadius: 20,
          color: v2.brand.steel,
          background: `${v2.brand.steel}12`,
          border: `1px solid ${v2.brand.steel}33`,
        }}
      >
        Upcoming
      </div>
    );
  }
  return (
    <div
      style={{
        fontSize: 9,
        fontWeight: 700,
        padding: '3px 9px',
        borderRadius: 20,
        color: v2.brand.mutedSoft,
        background: v2.brand.raised,
        border: `1px solid ${v2.brand.border}`,
      }}
    >
      Awaiting results
    </div>
  );
}

function SidePool({
  name,
  pct,
  isWinner,
  align = 'left',
}: {
  name: string;
  pct: number;
  isWinner: boolean;
  align?: 'left' | 'center';
}) {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRadius: v2.radius.sm,
        background: isWinner ? `${v2.accent.gold}14` : `${v2.brand.raised}88`,
        border: `1.5px solid ${isWinner ? `${v2.accent.gold}55` : `${v2.brand.steel}22`}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        alignItems: align === 'center' ? 'center' : 'stretch',
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: v2.brand.steelLight,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.3,
          textAlign: align,
        }}
      >
        {name}
      </p>
      <p
        style={{
          fontSize: 15,
          fontWeight: 900,
          color: isWinner ? v2.accent.gold : v2.brand.steelLight,
          lineHeight: 1,
        }}
      >
        {pct}%
      </p>
      {isWinner && <span style={{ fontSize: 9, fontWeight: 700, color: v2.accent.gold }}>👑 Winner</span>}
    </div>
  );
}

function BattleCard({
  battle,
  isActive,
  isEnded,
  userVoted,
  userWon,
  onClick,
}: {
  battle: ArenaBattle | BattleHistoryEntry;
  isActive?: boolean;
  isEnded?: boolean;
  userVoted?: boolean;
  userWon?: boolean;
  onClick: () => void;
}) {
  const timer = useTimer(battle.ends_at, !!isActive);
  const { total: totalPow, pctA, pctB, pctC, hasSideC } = getPoolStats(battle);
  const concluded = (isEnded || !isActive) && battle.winner_side;
  const totalVoters = (battle as ArenaBattle & { total_participants?: number }).total_participants ?? 0;
  const banner = (battle as ArenaBattle & { banner_image?: string }).banner_image;

  const accent = concluded && userWon ? v2.accent.success : isActive ? ARENA : v2.brand.steel;

  return (
    <V2Card
      accent={accent}
      onClick={onClick}
      padding="0"
      style={{
        marginBottom: 12,
        background: concluded && userWon ? `linear-gradient(160deg, ${v2.accent.success}10, hsl(225 30% 6% / 0.56))` : undefined,
        boxShadow: isActive ? v2.shadow(ARENA, 0.18) : accent ? v2.shadow(accent, 0.1) : undefined,
      }}
    >
      {isActive && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${ARENA}88, transparent)`,
            zIndex: 2,
          }}
        />
      )}

      {banner && (
        <div style={{ height: 90, overflow: 'hidden', position: 'relative' }}>
          <img
            src={banner}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => {
              (e.target as HTMLImageElement).parentElement!.style.display = 'none';
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(to bottom, transparent 35%, ${v2.brand.deep}bb)`,
            }}
          />
        </div>
      )}

      <div style={{ padding: '14px 16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
            <p
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: v2.brand.steelBright,
                letterSpacing: '-0.2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                margin: 0,
              }}
            >
              {battle.title}
            </p>
            {battle.description && (
              <p
                style={{
                  fontSize: 10,
                  color: v2.brand.muted,
                  marginTop: 3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {battle.description}
              </p>
            )}
            <MobileAIPredictionBadge
              sideAProbability={(battle as ArenaBattle & { ai_side_a_probability?: number }).ai_side_a_probability}
              sideBProbability={(battle as ArenaBattle & { ai_side_b_probability?: number }).ai_side_b_probability}
              sideAName={battle.side_a_name}
              sideBName={battle.side_b_name}
              confidence={(battle as ArenaBattle & { ai_confidence?: number }).ai_confidence}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <StatusBadge
              isActive={isActive}
              isEnded={isEnded}
              concluded={!!concluded}
              userVoted={userVoted}
              userWon={userWon}
              timer={timer}
            />
            <ChevronRight size={14} color={v2.brand.muted} style={{ marginLeft: 6 }} />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: hasSideC ? '1fr 1fr 1fr' : '1fr 32px 1fr',
            gap: 8,
            alignItems: 'stretch',
            marginBottom: 10,
          }}
        >
          <SidePool name={battle.side_a_name} pct={pctA} isWinner={battle.winner_side === 'a'} />
          {hasSideC ? (
            <SidePool
              name={battle.side_c_name || 'Draw'}
              pct={pctC}
              isWinner={battle.winner_side === 'c'}
              align="center"
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  background: `${ARENA}14`,
                  border: `1px solid ${ARENA}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: 8, fontWeight: 900, color: ARENA }}>VS</span>
              </div>
            </div>
          )}
          <SidePool name={battle.side_b_name} pct={pctB} isWinner={battle.winner_side === 'b'} />
        </div>

        <div
          style={{
            height: 4,
            borderRadius: 2,
            background: v2.brand.raised,
            overflow: 'hidden',
            marginBottom: 8,
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: 2,
              width: `${pctA}%`,
              background: `linear-gradient(90deg, ${v2.brand.steel}, ${ARENA})`,
              transition: 'width 0.5s ease',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: v2.brand.muted }}>
            {totalPow.toLocaleString()} ARX-P · {totalVoters} voter{totalVoters !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 9, color: concluded ? v2.accent.gold : v2.brand.muted, fontWeight: concluded ? 700 : 400 }}>
            {concluded
              ? `Resolved · ${sideName(battle, battle.winner_side as ArenaSide)}`
              : new Date(isActive ? battle.ends_at : battle.starts_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </V2Card>
  );
}

function BattleDetailSide({
  name,
  pct,
  power,
  side,
  activeSide,
  winnerSide,
  isActive,
  existingVote,
  onSelect,
}: {
  name: string;
  pct: number;
  power: number;
  side: ArenaSide;
  activeSide: ArenaSide | null;
  winnerSide: string | null;
  isActive?: boolean;
  existingVote: ArenaSide | null;
  onSelect: (s: ArenaSide) => void;
}) {
  const selected = activeSide === side;
  const won = winnerSide === side;
  const pressable = !!(isActive && !existingVote);
  const borderColor = selected
    ? `${ARENA}aa`
    : won
      ? `${v2.accent.gold}88`
      : pressable
        ? `${v2.brand.steel}55`
        : `${v2.brand.steel}28`;
  return (
    <motion.div
      whileTap={pressable ? { scale: 0.96, y: 1 } : undefined}
      whileHover={pressable ? { y: -2 } : undefined}
      onClick={() => pressable && onSelect(side)}
      role={pressable ? 'button' : undefined}
      tabIndex={pressable ? 0 : undefined}
      onKeyDown={(e) => {
        if (!pressable) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(side);
        }
      }}
      style={{
        position: 'relative',
        borderRadius: 18,
        padding: '18px 12px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        cursor: pressable ? 'pointer' : 'default',
        touchAction: 'manipulation',
        // Solid “portable card” sitting on the big battle panel — not flat text.
        background: selected
          ? `linear-gradient(165deg, hsl(255 45% 22%) 0%, hsl(225 28% 9%) 55%, hsl(225 30% 6%) 100%)`
          : `linear-gradient(165deg, hsl(225 26% 14%) 0%, hsl(225 28% 8%) 60%, hsl(225 30% 5%) 100%)`,
        border: `1.5px solid ${borderColor}`,
        boxShadow: selected
          ? `0 14px 32px rgba(0,0,0,0.55), 0 0 28px ${ARENA}40, inset 0 1px 0 rgba(255,255,255,0.12)`
          : `0 12px 28px rgba(0,0,0,0.5), 0 2px 0 rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08)`,
        transform: selected ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease',
      }}
    >
      {pressable && !selected && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            fontSize: 8,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: `${v2.brand.steel}99`,
          }}
        >
          Tap
        </div>
      )}
      <p style={{ fontSize: 12, fontWeight: 700, color: v2.brand.steelLight, textAlign: 'center', margin: 0, lineHeight: 1.25 }}>
        {name}
      </p>
      <div
        style={{
          fontSize: 26,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: won ? v2.accent.gold : selected ? ARENA : v2.brand.steelBright,
          textShadow: selected ? `0 0 18px ${ARENA}66` : undefined,
        }}
      >
        {pct}%
      </div>
      <p style={{ fontSize: 10, color: v2.brand.muted, textAlign: 'center', margin: 0 }}>
        {power.toLocaleString()} ARX-P
      </p>
      {won && (
        <div
          style={{
            marginTop: 2,
            fontSize: 10,
            fontWeight: 800,
            color: v2.accent.gold,
            padding: '3px 8px',
            borderRadius: 999,
            background: `${v2.accent.gold}18`,
            border: `1px solid ${v2.accent.gold}44`,
          }}
        >
          👑 Winner
        </div>
      )}
      {selected && isActive && (
        <div
          style={{
            marginTop: 2,
            fontSize: 10,
            fontWeight: 800,
            color: v2.accent.success,
            padding: '4px 10px',
            borderRadius: 999,
            background: `${v2.accent.success}18`,
            border: `1px solid ${v2.accent.success}55`,
            boxShadow: `0 0 14px ${v2.accent.success}33`,
          }}
        >
          ✓ Your pick
        </div>
      )}
    </motion.div>
  );
}

function BattleDetail({
  battle,
  isActive,
  battleUserVote,
  battleParticipants,
  loadingParticipants,
  voting,
  castVote,
  available,
  onClose,
}: {
  battle: ArenaBattle | BattleHistoryEntry;
  isActive?: boolean;
  battleUserVote: { side?: ArenaSide; power_spent?: number } | null;
  battleParticipants: {
    user_id: string;
    power_spent: number;
    username?: string;
    avatar_url?: string;
  }[];
  loadingParticipants?: boolean;
  voting: boolean;
  castVote: (id: string, side: ArenaSide, amt: number) => Promise<boolean>;
  available: number;
  onClose: () => void;
}) {
  const { gateStakeAction, complianceDialog } = useStakeCompliance();
  const timer = useTimer(battle.ends_at, !!isActive);
  const { total: totalPow, pctA, pctB, pctC, hasSideC, powC } = getPoolStats(battle);
  const existingVote = (battleUserVote?.side ?? null) as ArenaSide | null;
  const [localSide, setLocalSide] = useState<ArenaSide | null>(null);
  const [stakeAmt, setStakeAmt] = useState('');
  const activeSide = existingVote ?? localSide;
  const banner = (battle as ArenaBattle & { banner_image?: string }).banner_image;
  const winnerSide = (battle.winner_side ?? null) as ArenaSide | null;
  const isResolved = !!winnerSide;
  const userWon = !!(existingVote && winnerSide && existingVote === winnerSide);
  const winnerLabel = winnerSide ? sideName(battle, winnerSide) : null;
  const detailAccent = isResolved
    ? userWon
      ? v2.accent.success
      : existingVote
        ? v2.brand.steel
        : v2.accent.gold
    : isActive
      ? ARENA
      : v2.brand.steel;

  const handleVote = () => {
    if (!activeSide) return;
    const amt = parseInt(stakeAmt);
    if (isNaN(amt) || amt < 1000) {
      toast({ title: 'Minimum stake', description: 'Minimum 1,000 ARX-P required', variant: 'destructive' });
      return;
    }
    if (amt > available) {
      toast({ title: 'Insufficient balance', description: 'Not enough ARX-P to stake', variant: 'destructive' });
      return;
    }
    gateStakeAction(() => {
      void (async () => {
        const ok = await castVote(battle.id, activeSide, amt);
        if (ok) {
          setStakeAmt('');
          setLocalSide(null);
        }
      })();
    });
  };

  return (
    <>
      {complianceDialog}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: v2.brand.deep,
        zIndex: 300,
        // NeonPage (via V2Page) owns the scrollport — avoid nested overflow-y here.
        overflow: 'hidden',
        fontFamily: v2.font,
      }}
    >
      <style>{CSS}</style>
      <V2Page style={{ minHeight: '100%', background: v2.gradient.mesh }}>
        <V2Header
          title={battle.title}
          subtitle={
            isResolved
              ? `Resolved · ${winnerLabel} won`
              : isActive
                ? `⏱ ${timer} remaining`
                : 'Awaiting results'
          }
          onBack={onClose}
        />

        <div style={{ padding: '8px 20px 0' }}>
          {isResolved && (
            <V2Card
              accent={detailAccent}
              padding="14px 16px"
              style={{
                marginBottom: 14,
                background: userWon
                  ? `linear-gradient(160deg, ${v2.accent.success}14, hsl(225 30% 6% / 0.56))`
                  : existingVote
                    ? undefined
                    : `linear-gradient(160deg, ${v2.accent.gold}12, hsl(225 30% 6% / 0.56))`,
                boxShadow: v2.shadow(detailAccent, 0.16),
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    background: `${detailAccent}18`,
                    border: `1px solid ${detailAccent}44`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {userWon ? '🏆' : existingVote ? '💧' : '✓'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: detailAccent,
                        padding: '3px 8px',
                        borderRadius: 999,
                        background: `${detailAccent}18`,
                        border: `1px solid ${detailAccent}44`,
                      }}
                    >
                      Resolved
                    </span>
                    {existingVote && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: userWon ? v2.accent.success : v2.brand.mutedSoft,
                        }}
                      >
                        {userWon ? 'You won' : 'You lost'}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: v2.brand.steelBright, margin: 0 }}>
                    {winnerLabel} won
                  </p>
                  {existingVote && (
                    <p style={{ fontSize: 11, color: v2.brand.muted, margin: '3px 0 0' }}>
                      You staked {(battleUserVote?.power_spent ?? 0).toLocaleString()} ARX-P on{' '}
                      {sideName(battle, existingVote)}
                    </p>
                  )}
                </div>
              </div>
            </V2Card>
          )}

          <V2Card
            accent={detailAccent}
            padding="0"
            style={{
              marginBottom: 14,
              background: isActive ? v2.gradient.arena : undefined,
              boxShadow: isActive ? v2.shadow(ARENA, 0.2) : isResolved ? v2.shadow(detailAccent, 0.12) : undefined,
            }}
          >
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: `linear-gradient(90deg, transparent, ${ARENA}, transparent)`,
                  zIndex: 2,
                }}
              />
            )}

            <div style={{ padding: banner ? 0 : '20px 18px 18px' }}>
              {banner && (
                <div style={{ height: 100, overflow: 'hidden', position: 'relative', borderRadius: `${v2.radius.lg}px ${v2.radius.lg}px 0 0` }}>
                  <img src={banner} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: `linear-gradient(to bottom, transparent 30%, ${v2.brand.deep}ee)`,
                    }}
                  />
                  {isResolved && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 10,
                        right: 10,
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: v2.accent.gold,
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: `${v2.brand.deep}cc`,
                        border: `1px solid ${v2.accent.gold}55`,
                      }}
                    >
                      Resolved
                    </div>
                  )}
                </div>
              )}

              <div style={{ padding: banner ? '14px 18px 18px' : 0 }}>
                {!banner && isResolved && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: v2.accent.gold,
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: `${v2.accent.gold}18`,
                        border: `1px solid ${v2.accent.gold}44`,
                      }}
                    >
                      Resolved
                    </span>
                  </div>
                )}
                {battle.description && (
                  <p style={{ fontSize: 12, color: v2.brand.mutedSoft, marginBottom: 14, textAlign: 'center' }}>{battle.description}</p>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                  <MobileAIPredictionBadge
                    sideAProbability={(battle as ArenaBattle & { ai_side_a_probability?: number }).ai_side_a_probability}
                    sideBProbability={(battle as ArenaBattle & { ai_side_b_probability?: number }).ai_side_b_probability}
                    sideAName={battle.side_a_name}
                    sideBName={battle.side_b_name}
                    confidence={(battle as ArenaBattle & { ai_confidence?: number }).ai_confidence}
                  />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 36px 1fr',
                    gap: 12,
                    alignItems: 'stretch',
                    marginBottom: 14,
                    padding: '2px 2px 6px',
                  }}
                >
                  <BattleDetailSide
                    name={battle.side_a_name}
                    pct={pctA}
                    power={battle.side_a_power}
                    side="a"
                    activeSide={activeSide}
                    winnerSide={battle.winner_side}
                    isActive={isActive}
                    existingVote={existingVote}
                    onSelect={setLocalSide}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontSize: 10,
                        letterSpacing: '0.04em',
                        color: ARENA,
                        background: 'rgba(0,0,0,0.35)',
                        border: `1px solid ${ARENA}55`,
                        boxShadow: `0 6px 16px rgba(0,0,0,0.4), 0 0 12px ${ARENA}33`,
                      }}
                    >
                      VS
                    </div>
                  </div>
                  <BattleDetailSide
                    name={battle.side_b_name}
                    pct={pctB}
                    power={battle.side_b_power}
                    side="b"
                    activeSide={activeSide}
                    winnerSide={battle.winner_side}
                    isActive={isActive}
                    existingVote={existingVote}
                    onSelect={setLocalSide}
                  />
                </div>

                {hasSideC && (
                  <motion.div
                    whileTap={isActive && !existingVote ? { scale: 0.97, y: 1 } : undefined}
                    onClick={() => isActive && !existingVote && setLocalSide('c')}
                    role={isActive && !existingVote ? 'button' : undefined}
                    style={{
                      borderRadius: 18,
                      padding: '14px 16px',
                      marginBottom: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: isActive && !existingVote ? 'pointer' : 'default',
                      touchAction: 'manipulation',
                      background:
                        activeSide === 'c'
                          ? `linear-gradient(165deg, hsl(255 45% 22%) 0%, hsl(225 28% 9%) 55%, hsl(225 30% 6%) 100%)`
                          : `linear-gradient(165deg, hsl(225 26% 14%) 0%, hsl(225 28% 8%) 60%, hsl(225 30% 5%) 100%)`,
                      border: `1.5px solid ${
                        activeSide === 'c'
                          ? `${ARENA}aa`
                          : battle.winner_side === 'c'
                            ? `${v2.accent.gold}88`
                            : `${v2.brand.steel}55`
                      }`,
                      boxShadow:
                        activeSide === 'c'
                          ? `0 14px 32px rgba(0,0,0,0.55), 0 0 28px ${ARENA}40, inset 0 1px 0 rgba(255,255,255,0.12)`
                          : `0 12px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)`,
                      transform: activeSide === 'c' ? 'translateY(-2px)' : undefined,
                    }}
                  >
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: v2.brand.steelLight, margin: 0 }}>{battle.side_c_name}</p>
                      <p style={{ fontSize: 10, color: v2.brand.muted, marginTop: 2 }}>{powC.toLocaleString()} ARX-P</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 800,
                          color:
                            battle.winner_side === 'c'
                              ? v2.accent.gold
                              : activeSide === 'c'
                                ? ARENA
                                : v2.brand.steelBright,
                        }}
                      >
                        {pctC}%
                      </div>
                      {battle.winner_side === 'c' && (
                        <div style={{ fontSize: 10, fontWeight: 800, color: v2.accent.gold, marginTop: 4 }}>👑 Winner</div>
                      )}
                      {activeSide === 'c' && isActive && (
                        <div
                          style={{
                            marginTop: 4,
                            display: 'inline-block',
                            fontSize: 10,
                            fontWeight: 800,
                            color: v2.accent.success,
                            padding: '3px 8px',
                            borderRadius: 999,
                            background: `${v2.accent.success}18`,
                            border: `1px solid ${v2.accent.success}55`,
                          }}
                        >
                          ✓ Your pick
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                <div
                  style={{
                    height: 5,
                    borderRadius: 3,
                    background: v2.brand.raised,
                    overflow: 'hidden',
                    marginBottom: 8,
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pctA}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      borderRadius: 3,
                      background: `linear-gradient(90deg, ${v2.brand.steel}, ${ARENA})`,
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: v2.brand.muted }}>
                  <span>Total: {totalPow.toLocaleString()} ARX-P staked</span>
                  <span>{battleParticipants.length} stakers</span>
                </div>
              </div>
            </div>
          </V2Card>

          <V2Card accent={v2.brand.steel} padding="16px 18px" style={{ marginBottom: 14 }}>
            <V2StatGrid
              stats={[
                { label: 'Pool A', value: battle.side_a_power.toLocaleString(), accent: v2.brand.steel },
                { label: 'Stakers', value: String(battleParticipants.length), accent: v2.accent.mining },
                { label: 'Pool B', value: battle.side_b_power.toLocaleString(), accent: ARENA },
              ]}
            />
          </V2Card>

          {isActive && !existingVote && (
            <V2Card accent={ARENA} padding="18px" style={{ marginBottom: 14 }}>
              <V2Eyebrow accent={ARENA}>
                Stake ARX-P · {activeSide ? `backing ${sideName(battle, activeSide)}` : 'select a side above'}
              </V2Eyebrow>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: v2.brand.surface,
                  border: `1px solid ${v2.brand.border}`,
                  borderRadius: v2.radius.sm,
                  padding: '14px 16px',
                  marginTop: 12,
                  marginBottom: 10,
                }}
              >
                <input
                  type="number"
                  value={stakeAmt}
                  onChange={(e) => setStakeAmt(e.target.value)}
                  placeholder="1,000"
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    fontSize: 22,
                    fontWeight: 700,
                    color: v2.brand.steelBright,
                    fontFamily: v2.font,
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: v2.brand.steel }}>ARX-P</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                {(
                  [
                    ['1K', '1000'],
                    ['5K', '5000'],
                    ['10K', '10000'],
                    ['Max', String(available)],
                  ] as const
                ).map(([l, v]) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setStakeAmt(v)}
                    style={{
                      padding: '8px',
                      borderRadius: 11,
                      background: v2.brand.raised,
                      border: `1px solid ${v2.brand.border}`,
                      color: v2.brand.steel,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none',
                      fontFamily: v2.font,
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 9, color: v2.brand.muted, marginBottom: 10, lineHeight: 1.45, marginTop: 0 }}>
                {STAKING_DISCLAIMER_TEXT}
              </p>
              <V2Button
                accent={ARENA}
                fullWidth
                disabled={voting || !activeSide || !stakeAmt}
                onClick={handleVote}
                style={{
                  background: activeSide && stakeAmt ? `linear-gradient(135deg, ${ARENA}, ${v2.accent.purple})` : undefined,
                }}
              >
                {voting ? 'Staking…' : activeSide ? `Stake on ${sideName(battle, activeSide)}` : '← Select a side above first'}
              </V2Button>
              <p style={{ fontSize: 9, color: v2.brand.muted, marginTop: 10, textAlign: 'center', marginBottom: 0 }}>
                Min 1,000 · Max 100,000 ARX-P · Winners earn from the losing pool
              </p>
            </V2Card>
          )}

          {existingVote && isActive && (
            <V2Card accent={v2.accent.success} padding="14px 16px" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    background: `${v2.accent.success}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: v2.accent.success, margin: 0 }}>
                    Staked {battleUserVote?.power_spent?.toLocaleString()} ARX-P
                  </p>
                  <p style={{ fontSize: 11, color: `${v2.accent.success}99`, marginTop: 2, marginBottom: 0 }}>
                    On {sideName(battle, existingVote)} · Awaiting results
                  </p>
                </div>
              </div>
            </V2Card>
          )}

          {existingVote && !isActive && !isResolved && (
            <V2Card accent={v2.brand.steel} padding="14px 16px" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    background: `${v2.brand.steel}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: v2.brand.steelLight, margin: 0 }}>
                    Staked {battleUserVote?.power_spent?.toLocaleString()} ARX-P
                  </p>
                  <p style={{ fontSize: 11, color: v2.brand.muted, marginTop: 2, marginBottom: 0 }}>
                    On {sideName(battle, existingVote)} · Awaiting results
                  </p>
                </div>
              </div>
            </V2Card>
          )}

          {loadingParticipants && (
            <>
              <V2SectionHeader title={isResolved ? 'Stakers' : 'Live Stakers'} />
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 52,
                    borderRadius: v2.radius.sm,
                    marginBottom: 8,
                    background: v2.brand.raised,
                    opacity: 1 - i * 0.2,
                  }}
                />
              ))}
            </>
          )}

          {!loadingParticipants && battleParticipants.length > 0 && (
            <>
              <V2SectionHeader title={`${isResolved ? 'Stakers' : 'Live Stakers'} (${battleParticipants.length})`} />
              {battleParticipants.slice(0, 8).map((p) => (
                <V2Card key={p.user_id} accent={v2.brand.steel} padding="10px 14px" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: v2.brand.raised,
                        border: `1px solid ${v2.brand.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        color: v2.brand.steel,
                        flexShrink: 0,
                        overflow: 'hidden',
                      }}
                    >
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        p.username?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: v2.brand.steelLight, margin: 0 }}>{p.username || 'Miner'}</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: ARENA }}>{p.power_spent.toLocaleString()} ARX-P</span>
                  </div>
                </V2Card>
              ))}
            </>
          )}
        </div>
      </V2Page>
    </motion.div>
    </>
  );
}

function PlayerRow({
  entry,
  rank,
  color,
  isMe,
  fmt,
}: {
  entry: {
    user_id: string;
    username?: string;
    avatar_url?: string;
    total_staked?: number;
    total_power_staked?: number;
    total_wins?: number;
    total_battles?: number;
  };
  rank: number;
  color: string;
  isMe: boolean;
  fmt: (n: number) => string;
}) {
  const medals = ['🥇', '🥈', '🥉'];
  const wins = Number(entry.total_wins) || 0;
  const battles = Number(entry.total_battles) || 0;
  const losses = Math.max(0, battles - wins);

  return (
    <V2Card accent={color} padding="10px 14px" style={{ marginBottom: 8, background: isMe ? `${color}10` : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 9,
            flexShrink: 0,
            background: `${color}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: rank <= 3 ? 14 : 10,
            fontWeight: 800,
            color,
          }}
        >
          {rank <= 3 ? medals[rank - 1] : rank}
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            overflow: 'hidden',
            flexShrink: 0,
            background: `${color}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            color,
            border: `1.5px solid ${color}40`,
          }}
        >
          {entry.avatar_url ? (
            <img
              src={entry.avatar_url}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            entry.username?.[0]?.toUpperCase() || '?'
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: isMe ? color : v2.brand.steelLight,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              margin: 0,
            }}
          >
            {entry.username || 'Miner'}
            {isMe ? ' (You)' : ''}
          </p>
          <p style={{ fontSize: 10, color: v2.brand.muted, marginTop: 1, marginBottom: 0 }}>
            <span style={{ color: v2.accent.success }}>{wins}W</span> / <span style={{ color: v2.accent.danger }}>{losses}L</span>
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color, margin: 0 }}>
            {fmt(Number(entry.total_staked || entry.total_power_staked) || 0)}
          </p>
          <p style={{ fontSize: 9, color: v2.brand.muted, margin: '2px 0 0' }}>ARX-P Staked</p>
        </div>
      </div>
    </V2Card>
  );
}

function LeaderboardTab({
  leaderboard,
  loading,
  currentUserId,
}: {
  leaderboard: {
    user_id: string;
    club?: string;
    username?: string;
    avatar_url?: string;
    total_staked?: number;
    total_power_staked?: number;
    total_wins?: number;
    total_battles?: number;
  }[];
  loading: boolean;
  currentUserId?: string;
}) {
  const [activeTeam, setActiveTeam] = useState<'alpha' | 'omega'>('alpha');

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toLocaleString();
  };

  const getScore = (e: (typeof leaderboard)[0]) => Number(e.total_staked || e.total_power_staked || 0);

  const alphaTeam = leaderboard.filter((e) => e.club === 'alpha').sort((a, b) => getScore(b) - getScore(a));
  const omegaTeam = leaderboard.filter((e) => e.club === 'omega').sort((a, b) => getScore(b) - getScore(a));
  const hasClubData = leaderboard.some((e) => e.club === 'alpha' || e.club === 'omega');
  const allPlayers = [...leaderboard].sort((a, b) => getScore(b) - getScore(a));

  const alphaStaked = alphaTeam.reduce((s, e) => s + getScore(e), 0);
  const omegaStaked = omegaTeam.reduce((s, e) => s + getScore(e), 0);
  const alphaWins = alphaTeam.reduce((s, e) => s + (Number(e.total_wins) || 0), 0);
  const omegaWins = omegaTeam.reduce((s, e) => s + (Number(e.total_wins) || 0), 0);

  if (loading) {
    return (
      <div style={{ padding: '12px 0' }}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              height: 60,
              borderRadius: v2.radius.lg,
              background: v2.brand.raised,
              marginBottom: 8,
              opacity: 1 - i * 0.15,
            }}
          />
        ))}
      </div>
    );
  }

  if (!hasClubData) {
    return (
      <div>
        <p style={{ fontSize: 11, color: v2.brand.muted, marginBottom: 12, textAlign: 'center' }}>Overall Rankings</p>
        {allPlayers.length === 0 ? (
          <V2Card padding="40px 20px">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: v2.brand.mutedSoft, marginBottom: 4 }}>No rankings yet</p>
              <p style={{ fontSize: 12, color: v2.brand.muted }}>Participate in battles to appear here</p>
            </div>
          </V2Card>
        ) : (
          allPlayers.map((e, i) => (
            <PlayerRow key={e.user_id} entry={e} rank={i + 1} color={ALPHA} isMe={e.user_id === currentUserId} fmt={fmt} />
          ))
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        {(
          [
            { label: 'Team Alpha', count: alphaTeam.length, staked: alphaStaked, wins: alphaWins, col: ALPHA, team: 'alpha' as const },
            { label: 'Team Omega', count: omegaTeam.length, staked: omegaStaked, wins: omegaWins, col: OMEGA, team: 'omega' as const },
          ] as const
        ).map((t) => (
          <button
            key={t.team}
            type="button"
            onClick={() => setActiveTeam(t.team)}
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: v2.radius.lg,
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: v2.font,
              background: activeTeam === t.team ? `${t.col}15` : v2.brand.surface,
              boxShadow: activeTeam === t.team ? `0 0 0 1.5px ${t.col}50` : `0 0 0 1px ${v2.brand.border}`,
              transition: 'all 0.18s',
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 800, color: t.col, marginBottom: 4, marginTop: 0 }}>{t.label}</p>
            <p style={{ fontSize: 16, fontWeight: 900, color: v2.brand.steelBright, margin: 0 }}>{fmt(t.staked)}</p>
            <p style={{ fontSize: 10, color: v2.brand.muted, marginTop: 2, marginBottom: 0 }}>
              {t.count} members · {t.wins}W
            </p>
          </button>
        ))}
      </div>
      {(activeTeam === 'alpha' ? alphaTeam : omegaTeam).length === 0 ? (
        <V2Card padding="32px 20px">
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: v2.brand.mutedSoft, margin: 0 }}>No {activeTeam} members yet</p>
            <p style={{ fontSize: 12, color: v2.brand.muted, marginTop: 4, marginBottom: 0 }}>
              Join {activeTeam} team in Arena to appear here
            </p>
          </div>
        </V2Card>
      ) : (
        (activeTeam === 'alpha' ? alphaTeam : omegaTeam).map((e, i) => (
          <PlayerRow
            key={e.user_id}
            entry={e}
            rank={i + 1}
            color={activeTeam === 'alpha' ? ALPHA : OMEGA}
            isMe={e.user_id === currentUserId}
            fmt={fmt}
          />
        ))
      )}
    </div>
  );
}

function EmptyState({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <V2Card accent={ARENA} padding="40px 20px">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</div>
        <p style={{ fontSize: 15, fontWeight: 800, color: v2.brand.steelLight, marginBottom: 6 }}>{title}</p>
        <p style={{ fontSize: 12, color: v2.brand.muted, margin: 0 }}>{subtitle}</p>
      </div>
    </V2Card>
  );
}

function LiveIndicator({ liveCt, upcomingCt }: { liveCt: number; upcomingCt: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: liveCt > 0 ? `${v2.accent.danger}18` : v2.brand.raised,
        border: liveCt > 0 ? `1px solid ${v2.accent.danger}38` : `1px solid ${v2.brand.border}`,
        borderRadius: 20,
        padding: '6px 12px',
        minWidth: 40,
        justifyContent: 'center',
      }}
    >
      {liveCt > 0 ? (
        <>
          <div className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: v2.accent.danger }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: v2.accent.danger }}>LIVE</span>
        </>
      ) : (
        <span style={{ fontSize: 10, fontWeight: 600, color: v2.brand.muted }}>
          {upcomingCt > 0 ? `${upcomingCt} soon` : '—'}
        </span>
      )}
    </div>
  );
}

export default function PredictionMarketV2() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const preview = useIsAppPreview();
  const goArena = () => navigate(preview ? toPreviewPath('/arena') : '/arena');
  const { points } = usePoints();
  const { leaderboard, battleHistory, loading } = useArena();
  const {
    earningsLeaderboard,
    liveMarkets,
    upcomingMarkets,
    endedMarkets,
    userPositions,
    loading: lbLoading,
    voting: marketsVoting,
    placeVote,
  } = useArenaMarkets();
  const { membership, loading: memLoading, registering, registerMembership } = useArenaMembership();

  const fullLeaderboard = earningsLeaderboard?.length ? earningsLeaderboard : leaderboard;

  const [showAuth, setShowAuth] = useState(false);
  const [tab, setTab] = useState<Tab>('battles');
  const [battleFilter, setBattleFilter] = useState<BattleFilter>('live');
  const [selectedBattle, setSelectedBattle] = useState<(ArenaBattle | BattleHistoryEntry) | null>(null);
  const [endedVisible, setEndedVisible] = useState(10);
  const [isBattleActive, setIsBattleActive] = useState(false);
  const { setHideNav } = useMobileNav();
  const [battleParticipants, setBattleParticipants] = useState<
    { user_id: string; power_spent: number; username?: string; avatar_url?: string }[]
  >([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  const available = Math.round(points?.total_points ?? 0);

  useEffect(() => {
    setHideNav(!!selectedBattle);
    return () => setHideNav(false);
  }, [selectedBattle, setHideNav]);

  const openBattle = useCallback(async (battle: ArenaBattle | BattleHistoryEntry, active: boolean) => {
    setSelectedBattle(battle);
    setIsBattleActive(active);
    setBattleParticipants([]);
    setLoadingParticipants(true);
    try {
      const { data } = await (await import('@/integrations/supabase/client')).supabase.rpc('get_arena_participation' as never, {
        p_battle_id: battle.id,
      });
      setBattleParticipants(
        ((data || []) as { user_id: string; power_spent: number; username?: string; avatar_url?: string }[]).map((item) => ({
          user_id: item.user_id,
          power_spent: item.power_spent,
          username: item.username,
          avatar_url: item.avatar_url,
        })),
      );
    } catch {
      setBattleParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  }, []);

  const castVoteForBattle = useCallback(
    async (battleId: string, side: ArenaSide, amount: number): Promise<boolean> => {
      const ok = await placeVote(battleId, side, amount);
      if (ok) {
        try {
          const { data } = await (await import('@/integrations/supabase/client')).supabase.rpc('get_arena_participation' as never, {
            p_battle_id: battleId,
          });
          setBattleParticipants(
            ((data || []) as { user_id: string; power_spent: number; username?: string; avatar_url?: string }[]).map((item) => ({
              user_id: item.user_id,
              power_spent: item.power_spent,
              username: item.username,
              avatar_url: item.avatar_url,
            })),
          );
        } catch {
          /* refresh optional */
        }
      }
      return ok;
    },
    [placeVote],
  );

  if (!user) {
    return (
      <V2Page style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
        <style>{CSS}</style>
        <motion.div variants={fadeUp} initial="hidden" animate="show" style={{ width: '100%', maxWidth: 360 }}>
          <V2HeroCard
            eyebrow="Arxon Prediction Market"
            title="Stake. Predict. Earn."
            subtitle="Stake ARX-P on battle outcomes and earn from the winning pool"
            cta="Sign In to Enter"
            onCta={() => setShowAuth(true)}
            accent={ARENA}
            gradient={v2.gradient.arena}
            icon={<span style={{ fontSize: 12 }}>⚔️</span>}
          />
        </motion.div>
        <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
      </V2Page>
    );
  }

  if (memLoading || loading) {
    return (
      <V2Page style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <style>{CSS}</style>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: `3px solid ${ARENA}33`,
            borderTopColor: ARENA,
            animation: 'spin 1s linear infinite',
          }}
        />
      </V2Page>
    );
  }

  if (!membership) {
    return (
      <V2Page>
        <style>{CSS}</style>
        <ArenaOnboarding onComplete={registerMembership} isLoading={registering} />
      </V2Page>
    );
  }

  const seenIds = new Set((battleHistory as BattleHistoryEntry[]).map((b) => b.id));
  const allHistory: (ArenaBattle | BattleHistoryEntry)[] = [
    ...(battleHistory as BattleHistoryEntry[]),
    ...liveMarkets.filter((m) => !seenIds.has(m.id)),
    ...upcomingMarkets.filter((m) => !seenIds.has(m.id)),
    ...endedMarkets.filter((m) => !seenIds.has(m.id)),
  ];

  const now = new Date();
  const liveList = allHistory.filter((b) => {
    const s = new Date(b.starts_at);
    const e = new Date(b.ends_at);
    return s <= now && e > now && (b.is_active ?? true) && !b.winner_side;
  });
  const upcomingList = allHistory.filter((b) => new Date(b.starts_at) > now && !b.winner_side);
  const endedList = allHistory.filter((b) => b.winner_side || new Date(b.ends_at) <= now);

  const liveCt = liveList.length;
  const upcomingCt = upcomingList.length;
  const endedCt = endedList.length;

  const myStakes = (() => {
    const byId = new Map<string, BattleHistoryEntry | ArenaBattle>();
    for (const b of battleHistory as BattleHistoryEntry[]) {
      if (b.user_participated) byId.set(b.id, b);
    }
    for (const b of allHistory) {
      if (userPositions.has(b.id)) byId.set(b.id, b);
    }
    return Array.from(byId.values());
  })();

  const featuredLive = liveList[0];

  return (
    <V2Page>
      <style>{CSS}</style>

      <AnimatePresence>
        {selectedBattle && (
          <BattleDetail
            key={selectedBattle.id}
            battle={selectedBattle}
            isActive={isBattleActive}
            battleUserVote={userPositions.get(selectedBattle.id) ?? null}
            battleParticipants={battleParticipants}
            loadingParticipants={loadingParticipants}
            voting={marketsVoting}
            castVote={castVoteForBattle}
            available={available}
            onClose={() => {
              setSelectedBattle(null);
              setBattleParticipants([]);
            }}
          />
        )}
      </AnimatePresence>

      <V2Header
        title="Prediction Market"
        subtitle={`Team ${membership.club.toUpperCase()} · ${available.toLocaleString()} ARX-P`}
        onBack={goArena}
        right={<LiveIndicator liveCt={liveCt} upcomingCt={upcomingCt} />}
        large
      />

      <div style={{ padding: '0 20px' }}>
        {featuredLive && tab === 'battles' && battleFilter === 'live' && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" style={{ marginBottom: 18 }}>
            <V2HeroCard
              eyebrow="Live Battle"
              title={featuredLive.title}
              subtitle={`${featuredLive.side_a_name} vs ${featuredLive.side_b_name}`}
              cta="Enter Battle"
              onCta={() => openBattle(featuredLive, true)}
              accent={ARENA}
              gradient={v2.gradient.arena}
              image={(featuredLive as ArenaBattle & { banner_image?: string }).banner_image}
              compact
            />
          </motion.div>
        )}

        <V2Tabs
          tabs={[
            { id: 'battles' as Tab, label: 'Battles' },
            { id: 'leaderboard' as Tab, label: 'Leaderboard' },
            { id: 'my-stakes' as Tab, label: 'My Stakes', count: myStakes.length || undefined },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        {tab === 'battles' && (
          <>
            <V2Pills
              items={[
                { id: 'live' as BattleFilter, label: 'Live', count: liveCt, dot: true, accent: v2.accent.danger },
                { id: 'upcoming' as BattleFilter, label: 'Upcoming', count: upcomingCt, accent: v2.brand.steel },
                { id: 'ended' as BattleFilter, label: 'Resolved', count: endedCt, accent: v2.accent.gold },
              ]}
              active={battleFilter}
              onChange={setBattleFilter}
            />

            {battleFilter === 'live' &&
              (liveCt === 0 ? (
                <EmptyState emoji="🔴" title="No live battles right now" subtitle="Check Upcoming for battles starting soon" />
              ) : (
                liveList.map((b) => (
                  <BattleCard
                    key={b.id}
                    battle={b}
                    isActive
                    userVoted={!!userPositions.get(b.id)}
                    userWon={false}
                    onClick={() => openBattle(b, true)}
                  />
                ))
              ))}

            {battleFilter === 'upcoming' &&
              (upcomingCt === 0 ? (
                <EmptyState emoji="🕐" title="No upcoming battles scheduled" subtitle="New battles will appear here when scheduled" />
              ) : (
                upcomingList.map((b) => (
                  <BattleCard
                    key={b.id}
                    battle={b}
                    isActive={false}
                    userVoted={!!userPositions.get(b.id)}
                    userWon={false}
                    onClick={() => openBattle(b, false)}
                  />
                ))
              ))}

            {battleFilter === 'ended' &&
              (endedCt === 0 ? (
                <EmptyState emoji="🏁" title="No resolved battles yet" subtitle="Results will appear here once battles conclude" />
              ) : (
                <>
                  {endedList.slice(0, endedVisible).map((b) => (
                    <BattleCard
                      key={b.id}
                      battle={b}
                      isEnded
                      userVoted={!!userPositions.get(b.id)}
                      userWon={userPositions.get(b.id)?.side === b.winner_side}
                      onClick={() => openBattle(b, false)}
                    />
                  ))}
                  {endedCt > endedVisible && (
                    <V2ButtonGhost fullWidth accent={ARENA} onClick={() => setEndedVisible((v) => v + 10)}>
                      Load more ({endedCt - endedVisible} remaining)
                    </V2ButtonGhost>
                  )}
                </>
              ))}
          </>
        )}

        {tab === 'leaderboard' && (
          <LeaderboardTab leaderboard={fullLeaderboard} loading={loading || lbLoading} currentUserId={user?.id} />
        )}

        {tab === 'my-stakes' &&
          (myStakes.length === 0 ? (
            <EmptyState emoji="🎯" title="No stakes yet" subtitle="Stake ARX-P on a battle to see your history" />
          ) : (
            myStakes.map((b) => {
              const starts = new Date(b.starts_at);
              const ends = new Date(b.ends_at);
              const active =
                starts <= now && ends > now && (b.is_active ?? true) && !b.winner_side;
              const ended = !!b.winner_side || ends <= now;
              return (
                <BattleCard
                  key={b.id}
                  battle={b}
                  isActive={active}
                  isEnded={ended}
                  userVoted={!!userPositions.get(b.id)}
                  userWon={userPositions.get(b.id)?.side === b.winner_side}
                  onClick={() => openBattle(b, active)}
                />
              );
            })
          ))}
      </div>

      <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
    </V2Page>
  );
}
