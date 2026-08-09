/** Dice Roll — live 1v1 Duel match. Both miners roll independently; server resolves each round. */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Crown, User, X, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAppPreview, toPreviewPath } from '@/features/arxon-v2/preview/AppPreviewContext';
import { mobileTopPadding, mobileScrollPaddingNavHidden } from '@/lib/mobileLayout';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { toast } from '@/hooks/use-toast';
import { neon } from '../design/neonTokens';
import { DicePair } from '@/features/dice/components/DiceFace';
import { RoundPips } from '@/features/dice/components/RoundPips';
import { useDiceDuelMatch } from '@/features/dice/hooks/useDiceDuel';
import { diceAccent } from '@/features/dice/diceTokens';

function Seat({
  label,
  sub,
  accent,
  wins,
  die1,
  die2,
  rolling,
  rollKey,
  ready,
}: {
  label: string;
  sub: string;
  accent: string;
  wins: number;
  die1: number | null;
  die2: number | null;
  rolling: boolean;
  rollKey: number;
  ready?: boolean;
}) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${accent}18`, border: `1px solid ${accent}38`, color: accent,
        }}>
          <User size={13} strokeWidth={2.2} />
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: neon.text }}>{label}</p>
          <p style={{ margin: 0, fontSize: 8, color: 'rgba(184,239,248,0.45)' }}>{sub}</p>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <RoundPips wins={wins} accent={accent} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
        <DicePair die1={die1} die2={die2} size={46} accent={accent} rolling={rolling} rollKey={rollKey} gap={8} />
        {ready && die1 == null && !rolling && (
          <span style={{
            position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)',
            fontSize: 8, fontWeight: 700, color: diceAccent.win, whiteSpace: 'nowrap',
          }}>
            Ready
          </span>
        )}
      </div>
    </div>
  );
}

export default function DiceDuelMatchV2() {
  const navigate = useNavigate();
  const preview = useIsAppPreview();
  const { matchId } = useParams<{ matchId: string }>();
  const { setHideNav } = useMobileNav();
  const { user } = useAuth();
  const {
    match, me, opponent, myCurrentRoll, oppHasRolled, lastRound, waitingForOpponent,
    loading, rolling, error, isCreator, roll,
  } = useDiceDuelMatch(matchId);

  const [rollKey, setRollKey] = useState(0);
  const [localRolling, setLocalRolling] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const go = useCallback((path: string) => {
    navigate(preview ? toPreviewPath(path) : path);
  }, [navigate, preview]);

  useEffect(() => {
    if (typeof setHideNav === 'function') setHideNav(true);
    return () => { if (typeof setHideNav === 'function') setHideNav(false); };
  }, [setHideNav]);

  const handleRoll = useCallback(async () => {
    setLocalRolling(true);
    setRollKey((k) => k + 1);
    await roll();
    setLocalRolling(false);
  }, [roll]);

  const handleCancel = useCallback(async () => {
    if (!matchId) return;
    setCancelling(true);
    try {
      const { data, error: err } = await supabase.rpc('cancel_dice_duel_match' as any, { p_match_id: matchId });
      if (err || !(data as any)?.success) {
        toast({ title: 'Could not cancel', description: err?.message || (data as any)?.error, variant: 'destructive' });
        return;
      }
      go('/arena/dice/duel');
    } finally {
      setCancelling(false);
    }
  }, [matchId, go]);

  const stake = match?.stake ?? 0;
  const pot = match?.pot ?? 0;
  const iWon = match?.status === 'complete' && match?.winner_id === user?.id;

  return (
    <div style={{
      minHeight: '100vh', position: 'relative', overflowX: 'hidden',
      paddingBottom: mobileScrollPaddingNavHidden(), fontFamily: neon.font, background: neon.deep,
      touchAction: 'pan-y', overscrollBehaviorY: 'contain',
    }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', inset: -30,
          background: `
            radial-gradient(ellipse 90% 55% at 50% 0%, rgba(168,85,247,0.16) 0%, transparent 55%),
            radial-gradient(ellipse 70% 40% at 50% 100%, rgba(79,216,235,0.12) 0%, transparent 60%),
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
            onClick={() => go('/arena/dice/duel')}
            style={{
              width: 36, height: 36, borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: neon.text, cursor: 'pointer',
            }}
          >
            <ChevronLeft size={18} strokeWidth={2.4} />
          </motion.button>

          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(184,239,248,0.5)' }}>
              1v1 Duel
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 800, color: neon.text }}>
              Stake {stake} · Pot {pot}
            </p>
          </div>

          <div style={{ width: 36 }} />
        </div>

        <div style={{ padding: '24px 16px 0' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ fontSize: 11, color: 'rgba(184,239,248,0.5)' }}>Loading match…</p>
            </div>
          )}

          {!loading && (error || !match) && (
            <div style={{
              textAlign: 'center', padding: '40px 20px', borderRadius: 18,
              background: 'rgba(255,107,74,0.08)', border: '1px solid rgba(255,107,74,0.25)',
            }}>
              <X size={28} color={diceAccent.lose} style={{ marginBottom: 10 }} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: neon.text }}>{error ?? 'Match not found'}</p>
              <button
                type="button"
                onClick={() => go('/arena/dice/duel')}
                style={{
                  marginTop: 16, padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${neon.purple}, ${neon.cyan})`, color: '#050510',
                  fontFamily: neon.font, fontSize: 11, fontWeight: 800,
                }}
              >
                Back to Duel Lobby
              </button>
            </div>
          )}

          {!loading && match && match.status === 'open' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '10px auto 16px', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: `${neon.purple}14`, border: `2px solid ${neon.purple}40`,
              }}>
                <Clock size={26} color={neon.purple} strokeWidth={2} />
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: neon.text }}>Waiting for a challenger…</p>
              <p style={{ margin: '6px 0 0', fontSize: 10, color: 'rgba(184,239,248,0.5)' }}>
                Share the Duel lobby with a miner, or hang tight — anyone can accept.
              </p>
              {isCreator && (
                <button
                  type="button"
                  onClick={() => void handleCancel()}
                  disabled={cancelling}
                  style={{
                    marginTop: 20, padding: '10px 22px', borderRadius: 12, cursor: 'pointer',
                    border: '1px solid rgba(255,107,74,0.3)', background: 'rgba(255,107,74,0.1)',
                    color: diceAccent.lose, fontFamily: neon.font, fontSize: 11, fontWeight: 800,
                  }}
                >
                  Cancel Challenge
                </button>
              )}
            </div>
          )}

          {!loading && match && (match.status === 'cancelled' || match.status === 'expired') && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: neon.text }}>
                This challenge was {match.status}.
              </p>
              <button
                type="button"
                onClick={() => go('/arena/dice/duel')}
                style={{
                  marginTop: 16, padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${neon.purple}, ${neon.cyan})`, color: '#050510',
                  fontFamily: neon.font, fontSize: 11, fontWeight: 800,
                }}
              >
                Back to Duel Lobby
              </button>
            </div>
          )}

          {!loading && match && match.status === 'active' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'rgba(184,239,248,0.5)' }}>
                  Round {match.current_round}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Seat
                  label="You"
                  sub={me?.username ?? 'Miner'}
                  accent={diceAccent.you}
                  wins={me?.roundsWon ?? 0}
                  die1={myCurrentRoll?.die1 ?? null}
                  die2={myCurrentRoll?.die2 ?? null}
                  rolling={localRolling || rolling}
                  rollKey={rollKey}
                />
                <div style={{ paddingTop: 30, fontSize: 14, fontWeight: 900, color: 'rgba(255,255,255,0.25)' }}>VS</div>
                <Seat
                  label={opponent?.username ?? 'Opponent'}
                  sub="Miner"
                  accent={neon.purple}
                  wins={opponent?.roundsWon ?? 0}
                  die1={null}
                  die2={null}
                  rolling={false}
                  rollKey={0}
                  ready={oppHasRolled}
                />
              </div>

              {/* Reserve height for the round-result badge so it appearing/disappearing doesn't
                  reflow the page under an in-progress scroll gesture. */}
              <div style={{ minHeight: 22 + 30 }}>
              <AnimatePresence mode="wait">
                {lastRound && lastRound.round === match.current_round - 1 && !localRolling && !rolling && (
                  <motion.div
                    key={lastRound.round}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ textAlign: 'center', marginTop: 22 }}
                  >
                    <span style={{
                      fontSize: 11, fontWeight: 800, padding: '6px 14px', borderRadius: 10,
                      color: lastRound.result === 'me' ? diceAccent.win : lastRound.result === 'opponent' ? diceAccent.lose : neon.gold,
                      background: lastRound.result === 'me' ? `${diceAccent.win}14` : lastRound.result === 'opponent' ? `${diceAccent.lose}14` : `${neon.gold}14`,
                      border: `1px solid ${lastRound.result === 'me' ? diceAccent.win : lastRound.result === 'opponent' ? diceAccent.lose : neon.gold}30`,
                    }}>
                      {lastRound.myTotal} vs {lastRound.oppTotal} · {
                        lastRound.result === 'me' ? 'You won the round' : lastRound.result === 'opponent' ? 'Opponent won the round' : 'Tie — reroll'
                      }
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>

              <div style={{ textAlign: 'center', marginTop: 28 }}>
                <motion.button
                  type="button"
                  whileTap={!waitingForOpponent && !rolling ? { scale: 0.96 } : undefined}
                  onClick={() => void handleRoll()}
                  disabled={waitingForOpponent || localRolling || rolling}
                  style={{
                    padding: '13px 36px', borderRadius: 16, border: 'none',
                    cursor: waitingForOpponent || rolling ? 'default' : 'pointer',
                    touchAction: 'manipulation',
                    fontFamily: neon.font, fontSize: 12, fontWeight: 800,
                    background: waitingForOpponent || rolling ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${diceAccent.you}, ${neon.purple})`,
                    color: waitingForOpponent || rolling ? 'rgba(255,255,255,0.35)' : '#02060e',
                    boxShadow: waitingForOpponent || rolling ? 'none' : `0 8px 24px ${diceAccent.you}30`,
                  }}
                >
                  {rolling || localRolling ? 'Rolling…' : waitingForOpponent ? 'Waiting for opponent…' : 'Roll Dice'}
                </motion.button>
              </div>
            </>
          )}

          {!loading && match && match.status === 'complete' && (
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: iWon ? `${diceAccent.win}18` : `${diceAccent.lose}18`,
                  border: `2px solid ${iWon ? diceAccent.win : diceAccent.lose}55`,
                  boxShadow: `0 0 32px ${iWon ? diceAccent.win : diceAccent.lose}40`,
                }}>
                  {iWon ? <Crown size={28} color={diceAccent.win} strokeWidth={2} /> : <X size={28} color={diceAccent.lose} strokeWidth={2.4} />}
                </div>
              </div>

              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: iWon ? diceAccent.win : diceAccent.lose }}>
                {iWon ? 'You Won!' : 'You Lost'}
              </h2>
              <p style={{ margin: '8px 0 0', fontSize: 26, fontWeight: 900, color: neon.text }}>
                {iWon ? '+' : '-'}{iWon ? (pot - (match.rake ?? 0)) : stake} <span style={{ fontSize: 12, color: 'rgba(184,239,248,0.5)' }}>ARX-P</span>
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 10, color: 'rgba(184,239,248,0.5)' }}>
                Final rounds {me?.roundsWon ?? 0}–{opponent?.roundsWon ?? 0} vs {opponent?.username ?? 'opponent'}
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                <RoundPips wins={me?.roundsWon ?? 0} accent={diceAccent.you} />
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>vs</span>
                <RoundPips wins={opponent?.roundsWon ?? 0} accent={neon.purple} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button
                  type="button"
                  onClick={() => go('/arena/dice')}
                  style={{
                    flex: 1, padding: '13px 0', borderRadius: 14, cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)',
                    color: neon.text, fontFamily: neon.font, fontSize: 11, fontWeight: 800,
                  }}
                >
                  Dice Hub
                </button>
                <button
                  type="button"
                  onClick={() => go('/arena/dice/duel')}
                  style={{
                    flex: 1, padding: '13px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                    background: `linear-gradient(135deg, ${diceAccent.you}, ${neon.purple})`, color: '#02060e',
                    fontFamily: neon.font, fontSize: 11, fontWeight: 800,
                    boxShadow: `0 8px 24px ${diceAccent.you}30`,
                  }}
                >
                  New Challenge
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
