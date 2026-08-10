/** Dice Roll — vs House match table. Server resolves the whole match; client paces the reveal. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, ChevronLeft, Crown, SkipForward, User, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAppPreview, toPreviewPath } from '@/features/arxon-v2/preview/AppPreviewContext';
import { mobileTopPadding, mobileScrollPaddingNavHidden, mobilePageScrollRoot } from '@/lib/mobileLayout';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { neon } from '../design/neonTokens';
import { DicePair } from '@/features/dice/components/DiceFace';
import { RoundPips } from '@/features/dice/components/RoundPips';
import { useDiceGame, type DiceHouseMatchResult } from '@/features/dice/hooks/useDiceGame';
import { DICE_STAKE_TIERS, diceAccent } from '@/features/dice/diceTokens';

const ROUND_REVEAL_MS = 650;
const ROUND_HOLD_MS = 950;

function Seat({
  label,
  sub,
  icon,
  accent,
  wins,
  die1,
  die2,
  rolling,
  rollKey,
}: {
  label: string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
  wins: number;
  die1: number | null;
  die2: number | null;
  rolling: boolean;
  rollKey: number;
}) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${accent}18`, border: `1px solid ${accent}38`, color: accent,
        }}>
          {icon}
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: neon.text }}>{label}</p>
          <p style={{ margin: 0, fontSize: 8, color: 'rgba(184,239,248,0.45)' }}>{sub}</p>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <RoundPips wins={wins} accent={accent} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <DicePair die1={die1} die2={die2} size={46} accent={accent} rolling={rolling} rollKey={rollKey} gap={8} />
      </div>
    </div>
  );
}

export default function DiceMatchV2() {
  const navigate = useNavigate();
  const preview = useIsAppPreview();
  const [params] = useSearchParams();
  const { setHideNav } = useMobileNav();
  const { user } = useAuth();
  const { playHouseMatch } = useDiceGame();

  const stakeParam = Number(params.get('stake'));
  const stake = DICE_STAKE_TIERS.includes(stakeParam as any) ? stakeParam : DICE_STAKE_TIERS[1];

  const go = useCallback((path: string) => {
    navigate(preview ? toPreviewPath(path) : path);
  }, [navigate, preview]);

  const [phase, setPhase] = useState<'rolling' | 'playing' | 'finished' | 'error'>('rolling');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiceHouseMatchResult | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [rolling, setRolling] = useState(true);
  const [rollKey, setRollKey] = useState(0);
  const runIdRef = useRef(0);

  const startMatch = useCallback(async () => {
    const myRun = ++runIdRef.current;
    setPhase('rolling');
    setError(null);
    setResult(null);
    setRoundIndex(0);
    setRolling(true);
    setRollKey((k) => k + 1);

    const res = await playHouseMatch(stake);
    if (runIdRef.current !== myRun) return;

    if (!res.success) {
      setPhase('error');
      setError(res.error);
      return;
    }
    setResult(res.result);
    setPhase('playing');
  }, [playHouseMatch, stake]);

  useEffect(() => {
    if (typeof setHideNav === 'function') setHideNav(true);
    void startMatch();
    return () => { if (typeof setHideNav === 'function') setHideNav(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== 'playing' || !result) return;
    if (roundIndex >= result.rounds.length) {
      setPhase('finished');
      return;
    }
    setRolling(true);
    setRollKey((k) => k + 1);
    const t1 = setTimeout(() => setRolling(false), ROUND_REVEAL_MS);
    const t2 = setTimeout(() => setRoundIndex((i) => i + 1), ROUND_REVEAL_MS + ROUND_HOLD_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase, result, roundIndex]);

  const skipToEnd = useCallback(() => {
    if (!result) return;
    setRolling(false);
    setRoundIndex(result.rounds.length);
  }, [result]);

  const activeRound = result?.rounds[Math.min(roundIndex, (result?.rounds.length ?? 1) - 1)];
  const shownRound = result?.rounds[roundIndex] ?? activeRound;
  const userWins = roundIndex > 0 ? result?.rounds[roundIndex - 1]?.user_wins_after ?? 0 : 0;
  const botWins = roundIndex > 0 ? result?.rounds[roundIndex - 1]?.bot_wins_after ?? 0 : 0;
  const finalUserWins = phase === 'finished' ? (result?.userWins ?? userWins) : userWins;
  const finalBotWins = phase === 'finished' ? (result?.botWins ?? botWins) : botWins;

  const showingRound = phase === 'finished' ? null : shownRound;
  const userDice = phase === 'playing' && showingRound ? [showingRound.user_die1, showingRound.user_die2] : [null, null];
  const botDice = phase === 'playing' && showingRound ? [showingRound.bot_die1, showingRound.bot_die2] : [null, null];

  return (
    <div style={{
      ...mobilePageScrollRoot(preview),
      paddingBottom: mobileScrollPaddingNavHidden(),
      fontFamily: neon.font,
      background: neon.deep,
      boxSizing: 'border-box',
    }}>
      <div style={{ position: preview ? 'absolute' : 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', inset: -30,
          background: `
            radial-gradient(ellipse 90% 55% at 50% 0%, rgba(79,216,235,0.16) 0%, transparent 55%),
            radial-gradient(ellipse 70% 40% at 50% 100%, rgba(168,85,247,0.12) 0%, transparent 60%),
            ${neon.deep}
          `,
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: `${mobileTopPadding()} 16px 8px`,
        }}>
          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={() => go('/arena/dice')}
            style={{
              width: 36, height: 36, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: neon.text, cursor: 'pointer', touchAction: 'manipulation',
            }}
          >
            <ChevronLeft size={18} strokeWidth={2.4} />
          </motion.button>

          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(184,239,248,0.5)' }}>
              Vs. House
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 800, color: neon.text }}>
              Stake {stake} · Pot {result?.pot ?? Math.round(stake * 1.85)}
            </p>
          </div>

          {phase === 'playing' ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={skipToEnd}
              style={{
                width: 36, height: 36, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: neon.textMuted, cursor: 'pointer', touchAction: 'manipulation',
              }}
            >
              <SkipForward size={16} strokeWidth={2.4} />
            </motion.button>
          ) : <div style={{ width: 36 }} />}
        </div>

        <div style={{ padding: '28px 16px 0' }}>
          {phase === 'error' && (
            <div style={{
              textAlign: 'center', padding: '40px 20px', borderRadius: 18,
              background: 'rgba(255,107,74,0.08)', border: '1px solid rgba(255,107,74,0.25)',
            }}>
              <X size={28} color={diceAccent.lose} style={{ marginBottom: 10 }} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: neon.text }}>{error}</p>
              <button
                type="button"
                onClick={() => go('/arena/dice')}
                style={{
                  marginTop: 16, padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${neon.cyan}, ${neon.teal})`, color: '#02060e',
                  fontFamily: neon.font, fontSize: 11, fontWeight: 800,
                }}
              >
                Back to Dice Hub
              </button>
            </div>
          )}

          {(phase === 'rolling' || phase === 'playing') && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'rgba(184,239,248,0.5)' }}>
                  {phase === 'rolling' ? 'Rolling the match…' : `Round ${Math.min(roundIndex + 1, result?.rounds.length ?? 1)}`}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Seat
                  label="You"
                  sub={user?.email?.split('@')[0] ?? 'Miner'}
                  icon={<User size={13} strokeWidth={2.2} />}
                  accent={diceAccent.you}
                  wins={userWins}
                  die1={userDice[0]}
                  die2={userDice[1]}
                  rolling={phase === 'rolling' || rolling}
                  rollKey={rollKey}
                />
                <div style={{ paddingTop: 30, fontSize: 14, fontWeight: 900, color: 'rgba(255,255,255,0.25)' }}>VS</div>
                <Seat
                  label="ARX-BOT"
                  sub="House dealer"
                  icon={<Bot size={13} strokeWidth={2.2} />}
                  accent={diceAccent.bot}
                  wins={botWins}
                  die1={botDice[0]}
                  die2={botDice[1]}
                  rolling={phase === 'rolling' || rolling}
                  rollKey={rollKey}
                />
              </div>

              {/* Reserve height for the round-result badge so it appearing/disappearing during
                  auto-playback doesn't reflow the page under an in-progress scroll gesture. */}
              <div style={{ minHeight: 22 + 30 }}>
              <AnimatePresence mode="wait">
                {phase === 'playing' && !rolling && showingRound && (
                  <motion.div
                    key={roundIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ textAlign: 'center', marginTop: 22 }}
                  >
                    <span style={{
                      fontSize: 11, fontWeight: 800, padding: '6px 14px', borderRadius: 10,
                      color: showingRound.result === 'user' ? diceAccent.win : showingRound.result === 'bot' ? diceAccent.lose : neon.gold,
                      background: showingRound.result === 'user' ? `${diceAccent.win}14` : showingRound.result === 'bot' ? `${diceAccent.lose}14` : `${neon.gold}14`,
                      border: `1px solid ${showingRound.result === 'user' ? diceAccent.win : showingRound.result === 'bot' ? diceAccent.lose : neon.gold}30`,
                    }}>
                      {showingRound.user_total} vs {showingRound.bot_total} · {
                        showingRound.result === 'user' ? 'You win the round' : showingRound.result === 'bot' ? 'House wins the round' : 'Tie — reroll'
                      }
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </>
          )}

          {phase === 'finished' && result && (
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: result.won ? `${diceAccent.win}18` : `${diceAccent.lose}18`,
                  border: `2px solid ${result.won ? diceAccent.win : diceAccent.lose}55`,
                  boxShadow: `0 0 32px ${result.won ? diceAccent.win : diceAccent.lose}40`,
                }}>
                  {result.won
                    ? <Crown size={28} color={diceAccent.win} strokeWidth={2} />
                    : <X size={28} color={diceAccent.lose} strokeWidth={2.4} />}
                </div>
              </div>

              <h2 style={{
                margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em',
                color: result.won ? diceAccent.win : diceAccent.lose,
              }}>
                {result.won ? 'You Won!' : 'House Wins'}
              </h2>
              <p style={{ margin: '8px 0 0', fontSize: 26, fontWeight: 900, color: neon.text }}>
                {result.netChange > 0 ? '+' : ''}{result.netChange} <span style={{ fontSize: 12, color: 'rgba(184,239,248,0.5)' }}>ARX-P</span>
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 10, color: 'rgba(184,239,248,0.5)' }}>
                Final rounds {result.userWins}–{result.botWins} · Balance {Math.round(result.balance).toLocaleString()} ARX-P
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                <RoundPips wins={finalUserWins} accent={diceAccent.you} />
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>vs</span>
                <RoundPips wins={finalBotWins} accent={diceAccent.bot} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => go('/arena/dice')}
                  style={{
                  flex: 1, padding: '13px 0', borderRadius: 14, cursor: 'pointer', touchAction: 'manipulation',
                  border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)',
                  color: neon.text, fontFamily: neon.font, fontSize: 11, fontWeight: 800,
                }}
              >
                Back to Hub
                </button>
                <button
                  type="button"
                  onClick={() => void startMatch()}
                  style={{
                  flex: 1, padding: '13px 0', borderRadius: 14, border: 'none', cursor: 'pointer', touchAction: 'manipulation',
                  background: `linear-gradient(135deg, ${diceAccent.you}, ${neon.teal})`, color: '#02060e',
                  fontFamily: neon.font, fontSize: 11, fontWeight: 800,
                  boxShadow: `0 8px 24px ${diceAccent.you}30`,
                }}
              >
                Roll Again — {stake}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
