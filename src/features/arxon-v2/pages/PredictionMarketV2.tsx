import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { mobileTopPaddingPage } from '@/lib/mobileLayout';
import { frostWash, sheetGlass, IceToggle } from '@/walletFigma/flow/LiveScroll';
import { neon } from '@/features/arxon-v2/design/neonTokens';
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
import { getOptionName, type ArenaSideId } from '@/lib/arenaOptions';
import MobileAIPredictionBadge from '@/components/mobile/MobileAIPredictionBadge';
import { useStakeCompliance } from '@/hooks/useStakeCompliance';
import { STAKING_DISCLAIMER_TEXT } from '@/components/legal/StakingDisclaimer';
import { useGoBack } from '@/lib/navBack';
import {
  V2Page,
  V2Card,
  V2Button,
  V2Eyebrow,
  V2StatGrid,
} from '../design/Kit';
import { v2 } from '../design/tokens';
import { MinerAvatar } from '../components/MinerAvatar';
import { MineLoad } from '../components/MineLoad';
import { usePullRefresh } from '@/walletFigma/flow/pullRefresh';

const CSS = `
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
.pulse{animation:pulse 1.2s ease-in-out infinite}
@keyframes spin{to{transform:rotate(360deg)}}
`;

type ArenaSide = ArenaSideId;
type Tab = 'battles' | 'leaderboard' | 'my-stakes';
type BattleFilter = 'live' | 'upcoming' | 'ended';

const ARENA = '#accafe';
const INK = '#0c1018';
const MUTED = '#5c6370';
const SOFT = '#8c8f99';

const frostCard: CSSProperties = {
  ...frostWash,
  borderRadius: 16,
  border: '1px solid rgba(61,109,255,0.32)',
  boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
  boxSizing: 'border-box',
};

const tokenSheet: CSSProperties = {
  borderRadius: 22,
  padding: '8px 12px 10px',
  boxSizing: 'border-box',
  overflow: 'hidden',
  ...sheetGlass,
};

const tokenRow: CSSProperties = {
  width: '100%',
  height: 40,
  minHeight: 40,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  border: 'none',
  background: 'none',
  color: '#fff',
  padding: 0,
  cursor: 'pointer',
  fontFamily: neon.font,
  textAlign: 'left',
};

const tokenGlyph: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 16,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#1c2025',
  color: '#fff',
  fontSize: 11,
  fontWeight: 700,
};

function MarketHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div style={{ padding: `${mobileTopPaddingPage()} 16px 14px` }}>
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.04)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <ChevronLeft size={18} strokeWidth={2.2} />
      </button>
      <h1
        style={{
          margin: '12px 0 0',
          fontSize: 22,
          fontWeight: 750,
          color: '#fff',
          letterSpacing: '-0.5px',
          lineHeight: 1.15,
          fontFamily: neon.font,
        }}
      >
        {title}
      </h1>
    </div>
  );
}

function FrostEarnCard({ amount }: { amount: number }) {
  return (
    <div style={{ ...frostCard, padding: '18px 16px', textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: MUTED }}>Arena earned</p>
      <p
        style={{
          margin: '6px 0 0',
          fontSize: 28,
          fontWeight: 750,
          color: INK,
          letterSpacing: '-0.8px',
          fontVariantNumeric: 'tabular-nums',
          fontFamily: neon.font,
        }}
      >
        {amount.toLocaleString()}
        <span style={{ marginLeft: 6, fontSize: 13, fontWeight: 600, color: MUTED }}>ARX-P</span>
      </p>
    </div>
  );
}

function SegmentTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: 4,
        borderRadius: 18,
        background: '#eef0f4',
      }}
    >
      {tabs.map((tab) => {
        const on = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1,
              height: 30,
              border: 'none',
              borderRadius: 15,
              background: on ? '#fff' : 'transparent',
              color: on ? INK : SOFT,
              fontSize: 11,
              fontWeight: 650,
              cursor: 'pointer',
              fontFamily: neon.font,
              boxShadow: on ? '0 2px 8px rgba(12,16,24,0.10)' : 'none',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function DarkPills<T extends string>({
  items,
  active,
  onChange,
}: {
  items: { id: T; label: string; count?: number }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, margin: '4px 0 6px' }}>
      {items.map((item) => {
        const on = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            style={{
              height: 28,
              padding: '0 12px',
              border: 'none',
              borderRadius: 14,
              background: on ? '#fff' : 'rgba(255,255,255,0.06)',
              color: on ? INK : SOFT,
              fontSize: 11,
              fontWeight: 650,
              cursor: 'pointer',
              fontFamily: neon.font,
            }}
          >
            {item.label}
            {item.count != null ? ` ${item.count}` : ''}
          </button>
        );
      })}
    </div>
  );
}

function SheetEmpty({ title }: { title: string }) {
  return (
    <p style={{ margin: '16px 0 12px', fontSize: 13, color: SOFT, textAlign: 'center', fontFamily: neon.font }}>
      {title}
    </p>
  );
}

function getPoolStats(battle: Parameters<typeof getArenaPoolStats>[0]) {
  return getArenaPoolStats(battle);
}

function sideName(
  battle: Parameters<typeof getOptionName>[0],
  side: ArenaSide,
) {
  return getOptionName(battle, side);
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

function battleArt(battle: ArenaBattle | BattleHistoryEntry) {
  const row = battle as ArenaBattle & {
    banner_image?: string | null;
    side_a_image?: string | null;
    side_b_image?: string | null;
  };
  return {
    banner: row.banner_image || null,
    left: row.side_a_image || null,
    right: row.side_b_image || null,
  };
}

function compactPts(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  return n.toLocaleString();
}

function BattleCard({
  battle,
  isActive,
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
  const { total: totalPow } = getPoolStats(battle);
  const { banner, left, right } = battleArt(battle);

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'relative',
        width: '100%',
        height: 128,
        border: 'none',
        borderRadius: 16,
        overflow: 'hidden',
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: neon.font,
        background: '#12151c',
      }}
    >
      {banner ? (
        <img
          src={banner}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : left || right ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
          {left ? (
            <img src={left} alt="" style={{ flex: 1, minWidth: 0, height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ flex: 1, background: '#1c2025' }} />
          )}
          {right ? (
            <img src={right} alt="" style={{ flex: 1, minWidth: 0, height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ flex: 1, background: '#1c2025' }} />
          )}
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.08) 20%, rgba(0,0,0,0.78) 100%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100%',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 10,
          padding: '12px 12px 10px',
          boxSizing: 'border-box',
        }}
      >
        <span
          style={{
            minWidth: 0,
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.25,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {battle.title}
        </span>
        <span style={{ flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: 4, whiteSpace: 'nowrap', color: isActive || userWon ? ARENA : '#fff' }}>
          <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{compactPts(totalPow)}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>ARX-P</span>
        </span>
      </div>
    </button>
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
        ...frostWash,
        border: selected ? '1.5px solid #0c1018' : '1px solid rgba(61,109,255,0.32)',
        boxShadow: selected
          ? '0 10px 24px rgba(0,0,0,0.22)'
          : '0 8px 18px rgba(0,0,0,0.12)',
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
            color: MUTED,
          }}
        >
          Tap
        </div>
      )}
      <p style={{ fontSize: 12, fontWeight: 700, color: INK, textAlign: 'center', margin: 0, lineHeight: 1.25 }}>
        {name}
      </p>
      <div
        style={{
          fontSize: 26,
          fontWeight: 750,
          letterSpacing: '-0.02em',
          color: won ? '#3d6dff' : INK,
        }}
      >
        {pct}%
      </div>
      <p style={{ fontSize: 11, color: MUTED, textAlign: 'center', margin: 0 }}>
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
  const { total: totalPow, options: poolOptions } = getPoolStats(battle);
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
      <V2Page style={{ minHeight: '100%' }}>
        <MarketHeader
          title={battle.title}
          onBack={onClose}
        />
        <p style={{ margin: '-6px 16px 14px', fontSize: 13, color: SOFT, fontFamily: neon.font }}>
          {isResolved
            ? `${winnerLabel} won`
            : isActive
              ? timer
              : 'Awaiting results'}
        </p>

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
                    display: poolOptions.length === 2 ? 'grid' : 'flex',
                    gridTemplateColumns: poolOptions.length === 2 ? '1fr 36px 1fr' : undefined,
                    flexDirection: poolOptions.length === 2 ? undefined : 'column',
                    gap: 12,
                    alignItems: 'stretch',
                    marginBottom: 14,
                    padding: '2px 2px 6px',
                  }}
                >
                  {poolOptions.length === 2 ? (
                    <>
                      <BattleDetailSide
                        name={poolOptions[0].name}
                        pct={poolOptions[0].pct}
                        power={poolOptions[0].power}
                        side={poolOptions[0].id as ArenaSide}
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
                        name={poolOptions[1].name}
                        pct={poolOptions[1].pct}
                        power={poolOptions[1].power}
                        side={poolOptions[1].id as ArenaSide}
                        activeSide={activeSide}
                        winnerSide={battle.winner_side}
                        isActive={isActive}
                        existingVote={existingVote}
                        onSelect={setLocalSide}
                      />
                    </>
                  ) : (
                    poolOptions.map((opt) => (
                      <BattleDetailSide
                        key={opt.id}
                        name={opt.name}
                        pct={opt.pct}
                        power={opt.power}
                        side={opt.id as ArenaSide}
                        activeSide={activeSide}
                        winnerSide={battle.winner_side}
                        isActive={isActive}
                        existingVote={existingVote}
                        onSelect={setLocalSide}
                      />
                    ))
                  )}
                </div>

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
                    animate={{ width: `${poolOptions[0]?.pct ?? 50}%` }}
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

          {(loadingParticipants || battleParticipants.length > 0) && (
            <div style={tokenSheet}>
              <p style={{ margin: '6px 0 4px', fontSize: 13, fontWeight: 650, color: '#fff', fontFamily: neon.font }}>
                {isResolved ? 'Stakers' : 'Live stakers'}
              </p>
              {loadingParticipants ? (
                <SheetEmpty title="Loading" />
              ) : (
                battleParticipants.slice(0, 8).map((p) => (
                  <div key={p.user_id} style={{ ...tokenRow, cursor: 'default' }}>
                    <span style={tokenGlyph}>
                      {p.username?.[0]?.toUpperCase() || '?'}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.username || 'Miner'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexShrink: 0, whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>
                        {p.power_spent.toLocaleString()}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: SOFT }}>ARX-P</span>
                    </span>
                  </div>
                ))
              )}
            </div>
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
  isMe,
}: {
  entry: {
    user_id: string;
    username?: string;
    avatar_url?: string;
    total_staked?: number;
    total_power_staked?: number;
    total_earned?: number;
    total_wins?: number;
    total_battles?: number;
  };
  rank: number;
  isMe: boolean;
}) {
  const wins = Number(entry.total_wins) || 0;
  const battles = Number(entry.total_battles) || 0;
  const losses = Math.max(0, battles - wins);
  const earned = Number(entry.total_earned || entry.total_staked || entry.total_power_staked) || 0;
  const medals = ['1', '2', '3'];

  return (
    <div style={{ ...tokenRow, height: 48, minHeight: 48, cursor: 'default' }}>
      <span
        style={{
          ...tokenGlyph,
          fontSize: 11,
          color: rank <= 3 || isMe ? INK : '#fff',
          background: rank <= 3 || isMe ? ARENA : '#1c2025',
        }}
      >
        {rank <= 3 ? medals[rank - 1] : rank}
      </span>
      <MinerAvatar url={entry.avatar_url} size={32} />
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isMe ? 'You' : (entry.username || 'Miner')}
        </span>
        <span style={{ fontSize: 11, color: SOFT }}>{wins}W {losses}L</span>
      </span>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexShrink: 0, whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: 13, fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>{compactPts(earned)}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: SOFT }}>ARX-P</span>
      </span>
    </div>
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
    total_earned?: number;
    total_wins?: number;
    total_battles?: number;
  }[];
  loading: boolean;
  currentUserId?: string;
}) {
  const [activeTeam, setActiveTeam] = useState<'alpha' | 'omega'>('alpha');

  const getScore = (e: (typeof leaderboard)[0]) =>
    Number(e.total_earned || e.total_staked || e.total_power_staked || 0);

  const alphaTeam = leaderboard.filter((e) => e.club === 'alpha').sort((a, b) => getScore(b) - getScore(a));
  const omegaTeam = leaderboard.filter((e) => e.club === 'omega').sort((a, b) => getScore(b) - getScore(a));
  const hasClubData = leaderboard.some((e) => e.club === 'alpha' || e.club === 'omega');
  const allPlayers = [...leaderboard].sort((a, b) => getScore(b) - getScore(a));
  const alphaScore = alphaTeam.reduce((s, e) => s + getScore(e), 0);
  const omegaScore = omegaTeam.reduce((s, e) => s + getScore(e), 0);
  const alphaWins = alphaTeam.reduce((s, e) => s + (Number(e.total_wins) || 0), 0);
  const omegaWins = omegaTeam.reduce((s, e) => s + (Number(e.total_wins) || 0), 0);
  const rows = hasClubData ? (activeTeam === 'alpha' ? alphaTeam : omegaTeam) : allPlayers;

  if (loading) {
    return (
      <MineLoad waiting kind="rows" rowCount={6} radius={22}>
        <div style={{ ...tokenSheet, minHeight: 240 }} />
      </MineLoad>
    );
  }

  return (
    <div>
      {hasClubData && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <IceToggle
              label="Team Alpha or Omega"
              left="Alpha"
              right="Omega"
              onRight={activeTeam === 'omega'}
              onLeft={() => setActiveTeam('alpha')}
              onRightPick={() => setActiveTeam('omega')}
              width={156}
            />
          </div>

          <div
            style={{
              padding: '16px 16px 14px',
              marginBottom: 10,
              textAlign: 'center',
              borderRadius: 16,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.14)',
              boxSizing: 'border-box',
            }}
          >
            <p style={{ margin: 0, fontSize: 12, fontWeight: 650, color: 'rgba(255,255,255,0.72)' }}>
              {activeTeam === 'alpha' ? 'Team Alpha' : 'Team Omega'}
            </p>
            <p style={{
              margin: '6px 0 0',
              fontSize: 26,
              fontWeight: 750,
              color: '#fff',
              letterSpacing: '-0.6px',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {compactPts(activeTeam === 'alpha' ? alphaScore : omegaScore)}
              <span style={{ marginLeft: 6, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.72)' }}>ARX-P</span>
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.72)' }}>
              {activeTeam === 'alpha' ? alphaTeam.length : omegaTeam.length} members · {activeTeam === 'alpha' ? alphaWins : omegaWins}W
            </p>
          </div>
        </>
      )}
      <div style={tokenSheet}>
        {rows.length === 0 ? (
          <SheetEmpty title="No rankings yet" />
        ) : (
          rows.map((e, i) => (
            <PlayerRow key={e.user_id} entry={e} rank={i + 1} isMe={e.user_id === currentUserId} />
          ))
        )}
      </div>
    </div>
  );
}

export default function PredictionMarketV2() {
  const { user } = useAuth();
  const goArena = useGoBack('/arena');
  const { points } = usePoints();
  const { leaderboard, battleHistory, loading, refreshLeaderboard: refreshArenaLb } = useArena();
  const {
    earningsLeaderboard,
    liveMarkets,
    upcomingMarkets,
    endedMarkets,
    userPositions,
    loading: lbLoading,
    voting: marketsVoting,
    placeVote,
    myArenaEarned,
    refreshMarkets,
    refreshLeaderboard: refreshEarnLb,
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

  const pull = usePullRefresh(async () => {
    await Promise.all([refreshMarkets(), refreshEarnLb(), refreshArenaLb()]);
  }, { threshold: 28 });
  const pageWait = memLoading || loading;

  if (!user) {
    return (
      <V2Page>
        <MarketHeader title="Prediction Market" onBack={goArena} />
        <div style={{ ...frostCard, margin: '0 16px', padding: '22px 18px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: MUTED }}>Predict · Stake · Earn</p>
          <button
            type="button"
            onClick={() => setShowAuth(true)}
            style={{
              height: 44,
              marginTop: 16,
              padding: '0 22px',
              border: 'none',
              borderRadius: 14,
              background: INK,
              color: '#fff',
              fontFamily: neon.font,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Sign in
          </button>
        </div>
        <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
      </V2Page>
    );
  }

  if (!memLoading && !membership) {
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

  const arenaEarned = myArenaEarned;

  return (
    <V2Page pull={pull}>
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

      <MarketHeader title="Prediction Market" onBack={goArena} />
      <div style={{ margin: '0 16px 16px' }}>
        <MineLoad waiting={pageWait} extra={pull.busy} frost kind="card" radius={16}>
          <FrostEarnCard amount={arenaEarned} />
        </MineLoad>
      </div>

      <div style={{ padding: '0 16px' }}>
        <div style={{ ...frostCard, padding: '12px 12px 14px' }}>
          <SegmentTabs
            tabs={[
              { id: 'battles' as Tab, label: 'Battles' },
              { id: 'leaderboard' as Tab, label: 'Leaderboard' },
              { id: 'my-stakes' as Tab, label: 'My Stakes' },
            ]}
            active={tab}
            onChange={setTab}
          />
        </div>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        {tab === 'battles' && (
          <>
            <DarkPills
              items={[
                { id: 'live' as BattleFilter, label: 'Live', count: liveCt },
                { id: 'upcoming' as BattleFilter, label: 'Upcoming', count: upcomingCt },
                { id: 'ended' as BattleFilter, label: 'Resolved', count: endedCt },
              ]}
              active={battleFilter}
              onChange={setBattleFilter}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pageWait && liveCt === 0 && upcomingCt === 0 && endedCt === 0 ? (
              [0, 1, 2].map((i) => (
                <MineLoad key={i} waiting extra={pull.busy} kind="card" radius={16}>
                  <div style={{ height: 128 }} />
                </MineLoad>
              ))
            ) : null}
            {battleFilter === 'live' &&
              (liveCt === 0 && !pageWait ? (
                <SheetEmpty title="No live battles" />
              ) : (
                liveList.map((b) => (
                  <MineLoad key={b.id} waiting={false} extra={pull.busy} kind="card" radius={16}>
                  <BattleCard
                    battle={b}
                    isActive
                    userVoted={!!userPositions.get(b.id)}
                    userWon={false}
                    onClick={() => openBattle(b, true)}
                  />
                  </MineLoad>
                ))
              ))}

            {battleFilter === 'upcoming' &&
              (upcomingCt === 0 && !pageWait ? (
                <SheetEmpty title="No upcoming battles" />
              ) : (
                upcomingList.map((b) => (
                  <MineLoad key={b.id} extra={pull.busy} kind="card" radius={16}>
                  <BattleCard
                    battle={b}
                    isActive={false}
                    userVoted={!!userPositions.get(b.id)}
                    userWon={false}
                    onClick={() => openBattle(b, false)}
                  />
                  </MineLoad>
                ))
              ))}

            {battleFilter === 'ended' &&
              (endedCt === 0 && !pageWait ? (
                <SheetEmpty title="No resolved battles" />
              ) : (
                <>
                  {endedList.slice(0, endedVisible).map((b) => (
                    <MineLoad key={b.id} extra={pull.busy} kind="card" radius={16}>
                    <BattleCard
                      battle={b}
                      isEnded
                      userVoted={!!userPositions.get(b.id)}
                      userWon={userPositions.get(b.id)?.side === b.winner_side}
                      onClick={() => openBattle(b, false)}
                    />
                    </MineLoad>
                  ))}
                  {endedCt > endedVisible && (
                    <button
                      type="button"
                      onClick={() => setEndedVisible((v) => v + 10)}
                      style={{
                        width: '100%',
                        height: 36,
                        border: 'none',
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.06)',
                        color: '#fff',
                        fontFamily: neon.font,
                        fontSize: 12,
                        fontWeight: 650,
                        cursor: 'pointer',
                      }}
                    >
                      Load more
                    </button>
                  )}
                </>
              ))}
            </div>
          </>
        )}

        {tab === 'leaderboard' && (
          <LeaderboardTab leaderboard={fullLeaderboard} loading={loading || lbLoading} currentUserId={user?.id} />
        )}

        {tab === 'my-stakes' &&
          (pageWait && myStakes.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[0, 1].map((i) => (
                <MineLoad key={i} waiting extra={pull.busy} kind="card" radius={16}>
                  <div style={{ height: 128 }} />
                </MineLoad>
              ))}
            </div>
          ) : myStakes.length === 0 ? (
            <div style={tokenSheet}><SheetEmpty title="No stakes yet" /></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myStakes.map((b) => {
              const starts = new Date(b.starts_at);
              const ends = new Date(b.ends_at);
              const active =
                starts <= now && ends > now && (b.is_active ?? true) && !b.winner_side;
              const ended = !!b.winner_side || ends <= now;
              return (
                <MineLoad key={b.id} extra={pull.busy} kind="card" radius={16}>
                <BattleCard
                  battle={b}
                  isActive={active}
                  isEnded={ended}
                  userVoted={!!userPositions.get(b.id)}
                  userWon={userPositions.get(b.id)?.side === b.winner_side}
                  onClick={() => openBattle(b, active)}
                />
                </MineLoad>
              );
            })}
            </div>
          ))}
      </div>

      <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
    </V2Page>
  );
}
