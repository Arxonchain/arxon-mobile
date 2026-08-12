/** Dice Roll — Rumble waiting room + live elimination match. */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Crown, Skull, User, X, Clock, Play, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAppPreview, toPreviewPath } from '@/features/arxon-v2/preview/AppPreviewContext';
import { mobileTopPadding, mobileScrollPaddingNavHidden, mobilePageScrollRoot } from '@/lib/mobileLayout';
import { useMobileNav } from '@/contexts/MobileNavContext';
import { toast } from '@/hooks/use-toast';
import { neon } from '../design/neonTokens';
import { DicePair } from '@/features/dice/components/DiceFace';
import { useDiceRumbleMatch, type RumblePlayerInfo } from '@/features/dice/hooks/useDiceRumble';
import { diceAccent, diceRumblePot, diceRumblePayout } from '@/features/dice/diceTokens';
import { buildDiceInviteUrl } from '@/features/dice/diceInviteUrl';

function PlayerChip({ player, rolling, rollKey }: { player: RumblePlayerInfo; rolling: boolean; rollKey: number }) {
  const accent = player.isMe ? diceAccent.you : player.alive ? neon.gold : 'rgba(255,255,255,0.25)';
  return (
    <div style={{
      flex: '1 1 auto', minWidth: 96, padding: '10px 8px', borderRadius: 14, textAlign: 'center',
      background: player.alive ? 'rgba(255,255,255,0.03)' : 'rgba(255,60,60,0.05)',
      border: `1px solid ${player.alive ? `${accent}30` : 'rgba(255,107,74,0.2)'}`,
      opacity: player.alive ? 1 : 0.55,
      position: 'relative',
    }}>
      {!player.alive && (
        <div style={{ position: 'absolute', top: 6, right: 6, color: diceAccent.lose }}>
          <Skull size={12} strokeWidth={2.2} />
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 6 }}>
        <User size={11} strokeWidth={2.2} color={accent} />
        <p style={{
          margin: 0, fontSize: 10, fontWeight: 800, color: player.alive ? neon.text : 'rgba(255,255,255,0.4)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 70,
        }}>
          {player.isMe ? 'You' : player.username}
        </p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <DicePair
          die1={player.roll?.die1 ?? null}
          die2={player.roll?.die2 ?? null}
          size={26}
          accent={accent}
          rolling={player.isMe && rolling}
          rollKey={rollKey}
        />
      </div>
    </div>
  );
}

export default function DiceRumbleMatchV2() {
  const navigate = useNavigate();
  const preview = useIsAppPreview();
  const { matchId } = useParams<{ matchId: string }>();
  const { setHideNav } = useMobileNav();
  const { user } = useAuth();
  const {
    match, players, me, isCreator, alivePlayers, eliminatedPlayers, lastRound,
    loading, rolling, starting, error, roll, startNow,
  } = useDiceRumbleMatch(matchId);

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
      const { data, error: err } = await supabase.rpc('cancel_dice_rumble_lobby' as any, { p_match_id: matchId });
      if (err || !(data as any)?.success) {
        toast({ title: 'Could not cancel', description: err?.message || (data as any)?.error, variant: 'destructive' });
        return;
      }
      go('/arena/dice/rumble');
    } finally {
      setCancelling(false);
    }
  }, [matchId, go]);

  const copyInvite = useCallback(async () => {
    const code = match?.invite_code as string | undefined;
    if (!code) return;
    const link = buildDiceInviteUrl('rumble', code);
    try {
      await navigator.clipboard.writeText(`${code} · ${link}`);
      toast({ title: 'Invite copied', description: `Code ${code}` });
    } catch {
      toast({ title: 'Invite code', description: code });
    }
  }, [match?.invite_code]);

  const stake = match?.stake ?? 0;
  const playerCount = players.length;
  const iWon = match?.status === 'complete' && match?.winner_id === user?.id;
  const winner = players.find((p) => p.userId === match?.winner_id);
  const iHaveRolled = !!me?.roll;
  const iAmAlive = me?.alive ?? false;

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
            radial-gradient(ellipse 90% 55% at 50% 0%, rgba(255,196,74,0.14) 0%, transparent 55%),
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
            onClick={() => go('/arena/dice/rumble')}
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
              Rumble
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 800, color: neon.text }}>
              Stake {stake} · Pot {match?.pot ?? diceRumblePot(stake, playerCount || 1)}
            </p>
          </div>

          <div style={{ width: 36 }} />
        </div>

        <div style={{ padding: '20px 16px 0' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ fontSize: 11, color: 'rgba(184,239,248,0.5)' }}>Loading lobby…</p>
            </div>
          )}

          {!loading && (error || !match) && (
            <div style={{
              textAlign: 'center', padding: '40px 20px', borderRadius: 18,
              background: 'rgba(255,107,74,0.08)', border: '1px solid rgba(255,107,74,0.25)',
            }}>
              <X size={28} color={diceAccent.lose} style={{ marginBottom: 10 }} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: neon.text }}>{error ?? 'Lobby not found'}</p>
              <button
                type="button"
                onClick={() => go('/arena/dice/rumble')}
                style={{
                  marginTop: 16, padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${neon.gold}, #ffb020)`, color: '#1a1400',
                  fontFamily: neon.font, fontSize: 11, fontWeight: 800,
                }}
              >
                Back to Rumble Lobby
              </button>
            </div>
          )}

          {!loading && match && (match.status === 'cancelled' || match.status === 'expired') && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: neon.text }}>This lobby was {match.status}.</p>
              <button
                type="button"
                onClick={() => go('/arena/dice/rumble')}
                style={{
                  marginTop: 16, padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${neon.gold}, #ffb020)`, color: '#1a1400',
                  fontFamily: neon.font, fontSize: 11, fontWeight: 800,
                }}
              >
                Back to Rumble Lobby
              </button>
            </div>
          )}

          {!loading && match && match.status === 'open' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 18 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', margin: '4px auto 12px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: `${neon.gold}14`, border: `2px solid ${neon.gold}40`,
                }}>
                  <Clock size={24} color={neon.gold} strokeWidth={2} />
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: neon.text }}>
                  Waiting for miners — {playerCount}/{match.max_players}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 10, color: 'rgba(184,239,248,0.5)' }}>
                  Pot grows to {diceRumblePot(stake, match.max_players)} · Winner takes {diceRumblePayout(stake, match.max_players)} ARX-P
                </p>
              </div>

              {match.invite_code && (
                <div style={{
                  margin: '0 auto 16px', maxWidth: 300, padding: '12px 14px', borderRadius: 14,
                  background: 'rgba(79,216,235,0.08)', border: '1px solid rgba(79,216,235,0.25)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <p style={{ margin: 0, fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(184,239,248,0.45)', textTransform: 'uppercase' }}>Invite code</p>
                    <p style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 900, letterSpacing: '0.2em', color: neon.cyan }}>{match.invite_code}</p>
                    {match.expires_at && (
                      <p style={{ margin: '6px 0 0', fontSize: 10, color: 'rgba(184,239,248,0.5)', fontVariantNumeric: 'tabular-nums' }}>
                        Expires {new Date(match.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void copyInvite()}
                    style={{
                      width: 40, height: 40, borderRadius: 12, border: '1px solid rgba(79,216,235,0.3)',
                      background: 'rgba(79,216,235,0.12)', color: neon.cyan, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}
                  >
                    <Copy size={16} />
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                {players.map((p) => (
                  <div key={p.userId} style={{
                    width: 64, padding: '10px 6px', borderRadius: 12, textAlign: 'center',
                    background: `${p.isMe ? diceAccent.you : neon.gold}12`,
                    border: `1px solid ${p.isMe ? diceAccent.you : neon.gold}30`,
                  }}>
                    <User size={14} color={p.isMe ? diceAccent.you : neon.gold} strokeWidth={2.2} />
                    <p style={{
                      margin: '4px 0 0', fontSize: 9, fontWeight: 700, color: neon.text,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.isMe ? 'You' : p.username}
                    </p>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, match.max_players - playerCount) }).map((_, i) => (
                  <div key={`empty-${i}`} style={{
                    width: 64, padding: '10px 6px', borderRadius: 12, textAlign: 'center',
                    background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.12)',
                  }}>
                    <User size={14} color="rgba(255,255,255,0.2)" strokeWidth={2.2} />
                    <p style={{ margin: '4px 0 0', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)' }}>Open</p>
                  </div>
                ))}
              </div>

              {isCreator ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <motion.button
                    type="button"
                    whileTap={playerCount >= 3 ? { scale: 0.97 } : undefined}
                    onClick={() => void startNow()}
                    disabled={playerCount < 3 || starting}
                    style={{
                      flex: 1, padding: '12px 0', borderRadius: 14, border: 'none',
                      cursor: playerCount >= 3 ? 'pointer' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      fontFamily: neon.font, fontSize: 12, fontWeight: 800,
                      background: playerCount >= 3 ? `linear-gradient(135deg, ${neon.gold}, #ffb020)` : 'rgba(255,255,255,0.06)',
                      color: playerCount >= 3 ? '#1a1400' : 'rgba(255,255,255,0.35)',
                    }}
                  >
                    <Play size={14} strokeWidth={2.4} />
                    {playerCount >= 3 ? 'Start Now' : `Need ${3 - playerCount} more`}
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => void handleCancel()}
                    disabled={cancelling}
                    style={{
                      flexShrink: 0, width: 44, borderRadius: 14, border: '1px solid rgba(255,107,74,0.3)',
                      background: 'rgba(255,107,74,0.1)', color: diceAccent.lose, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X size={16} strokeWidth={2.4} />
                  </button>
                </div>
              ) : (
                <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(184,239,248,0.45)' }}>
                  Waiting for the host to start the rumble…
                </p>
              )}
            </div>
          )}

          {!loading && match && match.status === 'active' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'rgba(184,239,248,0.5)' }}>
                  Round {match.current_round} · {alivePlayers.length} left
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {players.map((p) => (
                  <PlayerChip key={p.userId} player={p} rolling={localRolling || rolling} rollKey={rollKey} />
                ))}
              </div>

              {/* Reserve height for the round-result summary so it appearing/disappearing
                  doesn't reflow the page under an in-progress scroll gesture. */}
              <div style={{ minHeight: 14 + 44 }}>
              <AnimatePresence mode="wait">
                {lastRound && lastRound.round === match.current_round - 1 && !localRolling && !rolling && (
                  <motion.div
                    key={lastRound.round}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ textAlign: 'center', marginBottom: 14 }}
                  >
                    <p style={{ margin: '0 0 6px', fontSize: 9, fontWeight: 700, color: 'rgba(184,239,248,0.5)' }}>
                      Round {lastRound.round} result
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                      {lastRound.rolls.map((r) => (
                        <span key={r.userId} style={{
                          fontSize: 9, fontWeight: 700, padding: '4px 9px', borderRadius: 9,
                          color: r.eliminated ? diceAccent.lose : diceAccent.win,
                          background: r.eliminated ? `${diceAccent.lose}14` : `${diceAccent.win}14`,
                          border: `1px solid ${r.eliminated ? diceAccent.lose : diceAccent.win}30`,
                        }}>
                          {r.username} {r.total} {r.eliminated ? '· Out' : ''}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>

              {iAmAlive ? (
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <motion.button
                    type="button"
                    whileTap={!iHaveRolled && !rolling ? { scale: 0.96 } : undefined}
                    onClick={() => void handleRoll()}
                    disabled={iHaveRolled || localRolling || rolling}
                    style={{
                      padding: '13px 36px', borderRadius: 16, border: 'none',
                      cursor: iHaveRolled || rolling ? 'default' : 'pointer',
                      touchAction: 'manipulation',
                      fontFamily: neon.font, fontSize: 12, fontWeight: 800,
                      background: iHaveRolled || rolling ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${diceAccent.you}, ${neon.gold})`,
                      color: iHaveRolled || rolling ? 'rgba(255,255,255,0.35)' : '#02060e',
                      boxShadow: iHaveRolled || rolling ? 'none' : `0 8px 24px ${diceAccent.you}30`,
                    }}
                  >
                    {rolling || localRolling ? 'Rolling…' : iHaveRolled ? 'Waiting for others…' : 'Roll Dice'}
                  </motion.button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 800, padding: '8px 18px', borderRadius: 12,
                    color: diceAccent.lose, background: `${diceAccent.lose}14`, border: `1px solid ${diceAccent.lose}30`,
                  }}>
                    You were eliminated — spectating
                  </span>
                </div>
              )}
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
                  {iWon ? <Crown size={28} color={diceAccent.win} strokeWidth={2} /> : <Skull size={28} color={diceAccent.lose} strokeWidth={2} />}
                </div>
              </div>

              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em', color: iWon ? diceAccent.win : diceAccent.lose }}>
                {iWon ? 'You Won the Rumble!' : 'Eliminated'}
              </h2>
              <p style={{ margin: '8px 0 0', fontSize: 26, fontWeight: 900, color: neon.text }}>
                {iWon ? '+' : '-'}{iWon ? (match.pot - (match.rake ?? 0)) : stake} <span style={{ fontSize: 12, color: 'rgba(184,239,248,0.5)' }}>ARX-P</span>
              </p>
              {!iWon && winner && (
                <p style={{ margin: '4px 0 0', fontSize: 10, color: 'rgba(184,239,248,0.5)' }}>
                  {winner.username} took the pot
                </p>
              )}

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
                  onClick={() => go('/arena/dice/rumble')}
                  style={{
                    flex: 1, padding: '13px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                    background: `linear-gradient(135deg, ${diceAccent.you}, ${neon.gold})`, color: '#02060e',
                    fontFamily: neon.font, fontSize: 11, fontWeight: 800,
                    boxShadow: `0 8px 24px ${diceAccent.you}30`,
                  }}
                >
                  New Lobby
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
