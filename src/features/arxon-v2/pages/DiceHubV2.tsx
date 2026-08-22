/**
 * Dice Roll hub — Daily Free Rolls, Challenge the House, 1v1 Duel, and Rumble.
 */
import { useCallback, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Dices, Gift, Swords, Users2, Sparkles, TrendingUp } from 'lucide-react';
import { usePoints } from '@/hooks/usePoints';
import { toast } from '@/hooks/use-toast';
import { useIsAppPreview, toPreviewPath } from '@/features/arxon-v2/preview/AppPreviewContext';
import { V2Page, fadeUp, stagger } from '../design/Kit';
import { neon } from '../design/neonTokens';
import { NeonScreenHeader, NeonGlassCard, NeonSectionLabel } from '../design/NeonSecondaryUI';
import { DicePair } from '@/features/dice/components/DiceFace';
import { RoundPips } from '@/features/dice/components/RoundPips';
import { DiceBalanceCard } from '@/features/dice/components/DiceBalanceCard';
import { DiceHistoryList } from '@/features/dice/components/DiceHistoryList';
import { useDiceGame, type DiceDailyState, type DiceFreeRollResult } from '@/features/dice/hooks/useDiceGame';
import {
  DICE_STAKE_TIERS,
  DICE_DAILY_FREE_ROLLS,
  DICE_FREE_ROLL_TABLE,
  dicePotForStake,
  diceAccent,
} from '@/features/dice/diceTokens';
import { useStakeCompliance } from '@/hooks/useStakeCompliance';
import { STAKING_DISCLAIMER_TEXT } from '@/components/legal/StakingDisclaimer';

function FreeRollCard({
  daily,
  loadingDaily,
  claimFreeRoll,
}: {
  daily: DiceDailyState;
  loadingDaily: boolean;
  claimFreeRoll: () => Promise<{ success: true; result: DiceFreeRollResult } | { success: false; error: string }>;
}) {
  const { triggerConfetti } = usePoints();
  const [rolling, setRolling] = useState(false);
  const [rollKey, setRollKey] = useState(0);
  const [dice, setDice] = useState<{ d1: number | null; d2: number | null }>({ d1: null, d2: null });
  const [reward, setReward] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const rollsLeft = daily.freeRollsLeft;
  const canRoll = !loadingDaily && rollsLeft > 0 && !busy;

  const handleRoll = useCallback(async () => {
    if (!canRoll) return;
    setBusy(true);
    setRolling(true);
    setReward(null);
    setRollKey((k) => k + 1);
    const startedAt = Date.now();

    const res = await claimFreeRoll();

    const elapsed = Date.now() - startedAt;
    await new Promise((r) => setTimeout(r, Math.max(0, 650 - elapsed)));

    if (!res.success) {
      setRolling(false);
      setBusy(false);
      const needsAuth = /sign in|not authenticated/i.test(res.error);
      toast({
        title: needsAuth ? 'Sign in required' : 'No luck',
        description: needsAuth
          ? 'Open /auth (or the real app) and sign in, then try again.'
          : res.error,
        variant: 'destructive',
      });
      return;
    }

    setDice({ d1: res.result.die1, d2: res.result.die2 });
    setReward(res.result.reward);
    setRolling(false);
    setBusy(false);
    if (res.result.reward >= 100) triggerConfetti();
  }, [canRoll, claimFreeRoll, triggerConfetti]);

  return (
    <NeonGlassCard accent={diceAccent.gold} padding="16px 16px 14px">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${diceAccent.gold}18`, border: `1px solid ${diceAccent.gold}38`, color: diceAccent.gold,
          }}>
            <Gift size={15} strokeWidth={2.2} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: neon.text }}>Daily Free Rolls</p>
            <p style={{ margin: '1px 0 0', fontSize: 9, color: 'rgba(184,239,248,0.5)' }}>No stake. Pure upside.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: DICE_DAILY_FREE_ROLLS }).map((_, i) => {
            const used = i < daily.freeRollsUsed;
            return (
              <span key={i} style={{
                width: 8, height: 8, borderRadius: '50%',
                background: used ? 'rgba(255,255,255,0.12)' : diceAccent.gold,
                boxShadow: used ? 'none' : `0 0 8px ${diceAccent.gold}80`,
              }} />
            );
          })}
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
        padding: '18px 0 14px',
      }}>
        <DicePair die1={dice.d1} die2={dice.d2} size={54} accent={diceAccent.gold} rolling={rolling} rollKey={rollKey} />
      </div>

      {/* Reserve the reward line's height so it mounting/unmounting doesn't reflow the
          card (and anything the user might be mid-scroll past) below it. */}
      <div style={{ minHeight: 33 }}>
        <AnimatePresence mode="wait">
          {reward != null && !rolling && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center', marginBottom: 12 }}
            >
              <span style={{
                fontSize: 15, fontWeight: 900, color: diceAccent.win,
                textShadow: `0 0 16px ${diceAccent.win}60`,
              }}>
                +{reward} ARX-P
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        type="button"
        whileTap={canRoll ? { scale: 0.97 } : undefined}
        onClick={handleRoll}
        disabled={!canRoll}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 14, border: 'none', cursor: canRoll ? 'pointer' : 'default',
          touchAction: 'manipulation',
          fontFamily: neon.font, fontSize: 12, fontWeight: 800, letterSpacing: '0.02em',
          background: canRoll ? `linear-gradient(135deg, ${diceAccent.gold}, #ffb020)` : 'rgba(255,255,255,0.06)',
          color: canRoll ? '#1a1400' : 'rgba(255,255,255,0.35)',
          boxShadow: canRoll ? `0 8px 24px ${diceAccent.gold}35` : 'none',
        }}
      >
        {rollsLeft > 0 ? `Roll Free Dice (${rollsLeft} left)` : 'Come back tomorrow'}
      </motion.button>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, justifyContent: 'center' }}>
        {DICE_FREE_ROLL_TABLE.map((t) => (
          <span key={t.label} style={{
            fontSize: 8, fontWeight: 700, padding: '3px 7px', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(184,239,248,0.55)',
          }}>
            {t.label} → <span style={{ color: diceAccent.gold }}>{t.reward}</span>
          </span>
        ))}
      </div>
    </NeonGlassCard>
  );
}

function HouseCard({
  onEnter,
  daily,
  loadingDaily,
  houseWinCapReached,
}: {
  onEnter: (stake: number) => void;
  daily: DiceDailyState;
  loadingDaily: boolean;
  houseWinCapReached: boolean;
}) {
  const { points } = usePoints();
  const balance = Math.round(points?.total_points ?? 0);
  const [stake, setStake] = useState<number>(DICE_STAKE_TIERS[1]);

  const pot = dicePotForStake(stake);
  const affordable = balance >= stake;
  const matchesLeft = daily.houseMatchesLeft;
  const blocked = matchesLeft <= 0 || houseWinCapReached;

  return (
    <NeonGlassCard accent={diceAccent.you} padding="16px 16px 14px">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${diceAccent.you}18`, border: `1px solid ${diceAccent.you}38`, color: diceAccent.you,
        }}>
          <Swords size={15} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: neon.text }}>Challenge the House</p>
          <p style={{ margin: '1px 0 0', fontSize: 9, color: 'rgba(184,239,248,0.5)' }}>
            Best of 3 · Win pays {dicePotForStake(100) / 100}x your stake
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <RoundPips wins={0} accent={diceAccent.you} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {DICE_STAKE_TIERS.map((tier) => {
          const active = tier === stake;
          const disabled = balance < tier;
          return (
            <button
              key={tier}
              type="button"
              disabled={disabled}
              onClick={() => setStake(tier)}
              style={{
                flex: '1 1 auto', minWidth: 46, padding: '8px 4px', borderRadius: 11, cursor: disabled ? 'default' : 'pointer',
                touchAction: 'manipulation',
                border: `1px solid ${active ? diceAccent.you : 'rgba(255,255,255,0.1)'}`,
                background: active ? `${diceAccent.you}20` : 'rgba(255,255,255,0.03)',
                color: disabled ? 'rgba(255,255,255,0.25)' : active ? diceAccent.you : 'rgba(184,239,248,0.7)',
                fontFamily: neon.font, fontSize: 11, fontWeight: 800,
                boxShadow: active ? `inset 0 0 0 1px ${diceAccent.you}50` : 'none',
              }}
            >
              {tier}
            </button>
          );
        })}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderRadius: 12, marginBottom: 12,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(184,239,248,0.45)' }}>Stake</p>
          <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 800, color: neon.text }}>{stake} <span style={{ fontSize: 9, color: 'rgba(184,239,248,0.5)' }}>ARX-P</span></p>
        </div>
        <TrendingUp size={14} color={diceAccent.win} />
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(184,239,248,0.45)' }}>Win Payout</p>
          <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 800, color: diceAccent.win }}>{pot} <span style={{ fontSize: 9, color: 'rgba(184,239,248,0.5)' }}>ARX-P</span></p>
        </div>
      </div>

      <p style={{ margin: '0 0 10px', fontSize: 9, color: 'rgba(184,239,248,0.45)', lineHeight: 1.45 }}>
        {STAKING_DISCLAIMER_TEXT}
      </p>

      <motion.button
        type="button"
        whileTap={affordable && !blocked ? { scale: 0.97 } : undefined}
        onClick={() => affordable && !blocked && onEnter(stake)}
        disabled={!affordable || blocked}
        style={{
          width: '100%', padding: '12px 0', borderRadius: 14, border: 'none',
          cursor: affordable && !blocked ? 'pointer' : 'default',
          touchAction: 'manipulation',
          fontFamily: neon.font, fontSize: 12, fontWeight: 800,
          background: affordable && !blocked ? `linear-gradient(135deg, ${diceAccent.you}, ${neon.teal})` : 'rgba(255,255,255,0.06)',
          color: affordable && !blocked ? '#02060e' : 'rgba(255,255,255,0.35)',
          boxShadow: affordable && !blocked ? `0 8px 24px ${diceAccent.you}30` : 'none',
        }}
      >
        {blocked
          ? (matchesLeft <= 0 ? 'Daily match limit reached' : 'Daily winnings cap reached')
          : affordable ? `Enter Match — Stake ${stake}` : 'Insufficient ARX-P'}
      </motion.button>

      {!loadingDaily && (
        <p style={{ margin: '10px 0 0', fontSize: 9, textAlign: 'center', color: 'rgba(184,239,248,0.4)' }}>
          {matchesLeft}/{20} house matches left today
        </p>
      )}
    </NeonGlassCard>
  );
}

function ModeTile({ icon, title, sub, accent, onClick }: { icon: ReactNode; title: string; sub: string; accent: string; onClick: () => void }) {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        flex: 1, borderRadius: 16, padding: '14px 12px', position: 'relative', overflow: 'hidden', cursor: 'pointer',
        touchAction: 'manipulation',
        background: 'linear-gradient(155deg, rgba(12,28,48,0.6) 0%, rgba(6,12,24,0.7) 100%)',
        border: `1px solid ${accent}28`,
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${accent}14`, border: `1px solid ${accent}2a`, color: accent, marginBottom: 8,
      }}>
        {icon}
      </div>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: neon.text }}>{title}</p>
      <p style={{ margin: '3px 0 0', fontSize: 9, color: 'rgba(184,239,248,0.45)', lineHeight: 1.4 }}>{sub}</p>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 8,
        fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
        padding: '3px 7px', borderRadius: 7, color: accent,
        background: `${accent}12`, border: `1px solid ${accent}28`,
      }}>
        Play <ChevronRight size={9} strokeWidth={2.5} />
      </span>
    </motion.div>
  );
}

export default function DiceHubV2() {
  const navigate = useNavigate();
  const preview = useIsAppPreview();
  const { points } = usePoints();
  const dice = useDiceGame();
  const { gateStakeAction, complianceDialog } = useStakeCompliance();

  const go = useCallback((path: string) => {
    navigate(preview ? toPreviewPath(path) : path);
  }, [navigate, preview]);

  const handleEnterMatch = useCallback((stake: number) => {
    gateStakeAction(() => go(`/arena/dice/house?stake=${stake}`));
  }, [gateStakeAction, go]);

  const balance = Math.round(points?.total_points ?? 0);

  return (
    <V2Page>
      {complianceDialog}
      <NeonScreenHeader
        eyebrow="Arena · Game 03"
        title="Dice Roll"
        subtitle="Roll for ARX-P. Beat the house, then the miners."
        onBack={() => go('/arena')}
        right={
          <div style={{
            width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${diceAccent.you}14`, border: `1px solid ${diceAccent.you}30`, color: diceAccent.you,
          }}>
            <Dices size={18} strokeWidth={2.2} />
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" style={{ padding: '0 16px' }}>
        <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
          <DiceBalanceCard balance={balance} summary={dice.summary} loading={dice.loadingSummary} />
        </motion.div>

        <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
          <FreeRollCard daily={dice.daily} loadingDaily={dice.loadingDaily} claimFreeRoll={dice.claimFreeRoll} />
        </motion.div>

        <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
          <HouseCard
            onEnter={handleEnterMatch}
            daily={dice.daily}
            loadingDaily={dice.loadingDaily}
            houseWinCapReached={dice.houseWinCapReached}
          />
        </motion.div>

        <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
          <NeonSectionLabel>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={12} color={neon.purple} /> More Modes
            </span>
          </NeonSectionLabel>
          <div style={{ display: 'flex', gap: 10 }}>
            <ModeTile
              icon={<Swords size={14} strokeWidth={2.2} />}
              title="1v1 Duel"
              sub="Challenge a miner, winner takes the pot."
              accent={neon.purple}
              onClick={() => go('/arena/dice/duel')}
            />
            <ModeTile
              icon={<Users2 size={14} strokeWidth={2.2} />}
              title="Rumble"
              sub="Multiplayer elimination dice arena."
              accent={neon.gold}
              onClick={() => go('/arena/dice/rumble')}
            />
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <NeonSectionLabel>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Dices size={12} color={diceAccent.you} /> Recent Plays
            </span>
          </NeonSectionLabel>
          <DiceHistoryList history={dice.summary.history} loading={dice.loadingSummary} />
        </motion.div>
      </motion.div>
    </V2Page>
  );
}
