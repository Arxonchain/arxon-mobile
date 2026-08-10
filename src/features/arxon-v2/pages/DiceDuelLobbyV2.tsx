/** Dice Roll — 1v1 Duel lobby: create an open challenge or accept someone else's. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Swords, Users, X, Clock, Crown, Copy, Link2 } from 'lucide-react';
import { usePoints } from '@/hooks/usePoints';
import { toast } from '@/hooks/use-toast';
import { useIsAppPreview, toPreviewPath } from '@/features/arxon-v2/preview/AppPreviewContext';
import { V2Page, fadeUp, stagger } from '../design/Kit';
import { neon } from '../design/neonTokens';
import { NeonScreenHeader, NeonGlassCard, NeonSectionLabel } from '../design/NeonSecondaryUI';
import { useDiceDuelLobby, type DuelChallenge } from '@/features/dice/hooks/useDiceDuel';
import { DICE_STAKE_TIERS, diceAccent, diceDuelPot } from '@/features/dice/diceTokens';
import { buildDiceInviteUrl } from '@/features/dice/diceInviteUrl';

function formatCountdown(expiresAt?: string | null) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function StakePicker({ stake, setStake, balance }: { stake: number; setStake: (n: number) => void; balance: number }) {
  return (
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
  );
}

function ChallengeRow({ challenge, onAccept, busy }: { challenge: DuelChallenge; onAccept: () => void; busy: boolean }) {
  const [cd, setCd] = useState(() => formatCountdown(challenge.expiresAt));
  useEffect(() => {
    const id = window.setInterval(() => setCd(formatCountdown(challenge.expiresAt)), 1000);
    return () => window.clearInterval(id);
  }, [challenge.expiresAt]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 10px', marginBottom: 8, borderRadius: 14,
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 11, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${neon.purple}18`, border: `1px solid ${neon.purple}38`,
        color: neon.purple, fontSize: 13, fontWeight: 800,
      }}>
        {challenge.username.slice(0, 1).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: neon.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {challenge.username}
        </p>
        <p style={{ margin: '1px 0 0', fontSize: 9, color: 'rgba(184,239,248,0.45)' }}>
          Stake {challenge.stake} · Pot {challenge.pot}{cd ? ` · ${cd}` : ''}
        </p>
      </div>
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        disabled={busy || cd === 'Expired'}
        onClick={onAccept}
        style={{
          flexShrink: 0, padding: '8px 14px', borderRadius: 11, border: 'none', cursor: busy ? 'default' : 'pointer',
          touchAction: 'manipulation',
          background: `linear-gradient(135deg, ${neon.purple}, ${neon.cyan})`, color: '#050510',
          fontFamily: neon.font, fontSize: 10, fontWeight: 800, opacity: busy || cd === 'Expired' ? 0.6 : 1,
        }}
      >
        Accept
      </motion.button>
    </motion.div>
  );
}

export default function DiceDuelLobbyV2() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const preview = useIsAppPreview();
  const { points } = usePoints();
  const { challenges, myMatch, loading, busy, createChallenge, joinChallenge, joinByCode, cancelChallenge } = useDiceDuelLobby();
  const [stake, setStake] = useState<number>(DICE_STAKE_TIERS[1]);
  const [joinCode, setJoinCode] = useState('');
  const [countdown, setCountdown] = useState(() => formatCountdown(myMatch?.expiresAt));
  const autoJoinTried = useRef(false);

  const balance = Math.round(points?.total_points ?? 0);

  useEffect(() => {
    setCountdown(formatCountdown(myMatch?.expiresAt));
    if (!myMatch?.expiresAt) return;
    const id = window.setInterval(() => setCountdown(formatCountdown(myMatch.expiresAt)), 1000);
    return () => window.clearInterval(id);
  }, [myMatch?.expiresAt]);

  const go = useCallback((path: string) => {
    navigate(preview ? toPreviewPath(path) : path);
  }, [navigate, preview]);

  useEffect(() => {
    const code = (searchParams.get('code') || '').trim().toUpperCase();
    if (code) setJoinCode(code);
  }, [searchParams]);

  useEffect(() => {
    const code = (searchParams.get('code') || '').trim().toUpperCase();
    if (!code || autoJoinTried.current || loading || busy || myMatch || preview) return;
    autoJoinTried.current = true;
    void (async () => {
      const res = await joinByCode(code);
      const next = new URLSearchParams(searchParams);
      next.delete('code');
      setSearchParams(next, { replace: true });
      if (!res.success) {
        toast({ title: 'Could not join invite', description: res.error, variant: 'destructive' });
        return;
      }
      go(`/arena/dice/duel/${res.matchId}`);
    })();
  }, [searchParams, loading, busy, myMatch, preview, joinByCode, setSearchParams, go]);

  const copyInvite = useCallback(async () => {
    if (!myMatch?.inviteCode) return;
    const link = buildDiceInviteUrl('/arena/dice/duel', myMatch.inviteCode);
    try {
      await navigator.clipboard.writeText(`${myMatch.inviteCode} · ${link}`);
      toast({ title: 'Invite copied', description: `Code ${myMatch.inviteCode}` });
    } catch {
      toast({ title: 'Invite code', description: myMatch.inviteCode });
    }
  }, [myMatch?.inviteCode]);

  const handleCreate = useCallback(async () => {
    if (balance < stake) {
      toast({ title: 'Insufficient ARX-P', description: `You need ${stake} ARX-P to open this challenge.`, variant: 'destructive' });
      return;
    }
    const res = await createChallenge(stake);
    if (!res.success) {
      toast({ title: 'Could not create challenge', description: res.error, variant: 'destructive' });
      return;
    }
    // Stay on persistent lobby slot — navigate into waiting room for this match
    go(`/arena/dice/duel/${res.matchId}`);
  }, [balance, stake, createChallenge, go]);

  const handleAccept = useCallback(async (challenge: DuelChallenge) => {
    if (balance < challenge.stake) {
      toast({ title: 'Insufficient ARX-P', description: `You need ${challenge.stake} ARX-P to accept.`, variant: 'destructive' });
      return;
    }
    const res = await joinChallenge(challenge.id);
    if (!res.success) {
      toast({ title: 'Could not join', description: res.error, variant: 'destructive' });
      return;
    }
    go(`/arena/dice/duel/${res.matchId ?? challenge.id}`);
  }, [balance, joinChallenge, go]);

  const handleJoinCode = useCallback(async () => {
    if (!joinCode.trim()) return;
    const res = await joinByCode(joinCode);
    if (!res.success) {
      toast({ title: 'Could not join', description: res.error, variant: 'destructive' });
      return;
    }
    go(`/arena/dice/duel/${res.matchId}`);
  }, [joinCode, joinByCode, go]);

  const handleCancel = useCallback(async () => {
    if (!myMatch) return;
    const res = await cancelChallenge(myMatch.id);
    if (!res.success) toast({ title: 'Could not cancel', description: res.error, variant: 'destructive' });
  }, [myMatch, cancelChallenge]);

  return (
    <V2Page>
      <NeonScreenHeader
        eyebrow="Dice Roll · Duel"
        title="1v1 Duel"
        subtitle="Open a lobby for 15 minutes. Share your code — winner takes the pot."
        onBack={() => go('/arena/dice')}
        right={
          <div style={{
            width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${neon.purple}14`, border: `1px solid ${neon.purple}30`, color: neon.purple,
          }}>
            <Swords size={18} strokeWidth={2.2} />
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" style={{ padding: '0 16px' }}>
        {myMatch ? (
          <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
            <NeonGlassCard
              accent={neon.purple}
              padding="16px 16px 14px"
              onClick={() => go(`/arena/dice/duel/${myMatch.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${neon.purple}18`, border: `1px solid ${neon.purple}38`, color: neon.purple,
                }}>
                  {myMatch.status === 'active' ? <Swords size={15} strokeWidth={2.2} /> : <Clock size={15} strokeWidth={2.2} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: neon.text }}>
                    {myMatch.status === 'active' ? 'Opponent found!' : 'Your open challenge'}
                  </p>
                  <p style={{ margin: '1px 0 0', fontSize: 9, color: 'rgba(184,239,248,0.5)' }}>
                    Stake {myMatch.stake} · Pot {diceDuelPot(myMatch.stake)} ARX-P
                    {countdown ? ` · ${countdown} left` : ''}
                  </p>
                </div>
              </div>

              {myMatch.status === 'open' && myMatch.inviteCode && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                  padding: '10px 12px', borderRadius: 12,
                  background: 'rgba(79,216,235,0.08)', border: '1px solid rgba(79,216,235,0.22)',
                }}>
                  <Link2 size={14} color={neon.cyan} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(184,239,248,0.45)', textTransform: 'uppercase' }}>Invite code</p>
                    <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 900, letterSpacing: '0.18em', color: neon.cyan }}>{myMatch.inviteCode}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void copyInvite(); }}
                    style={{
                      width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(79,216,235,0.3)',
                      background: 'rgba(79,216,235,0.12)', color: neon.cyan, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              )}

              {myMatch.status === 'active' ? (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); go(`/arena/dice/duel/${myMatch.id}`); }}
                  style={{
                    width: '100%', padding: '11px 0', borderRadius: 13, border: 'none', cursor: 'pointer',
                    background: `linear-gradient(135deg, ${neon.purple}, ${neon.cyan})`, color: '#050510',
                    fontFamily: neon.font, fontSize: 11, fontWeight: 800,
                  }}
                >
                  Resume Match
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); go(`/arena/dice/duel/${myMatch.id}`); }}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                      background: `linear-gradient(135deg, ${neon.purple}, ${neon.cyan})`, color: '#050510',
                      fontFamily: neon.font, fontSize: 10, fontWeight: 800,
                    }}
                  >
                    Open Waiting Room
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); void handleCancel(); }}
                    disabled={busy}
                    style={{
                      flexShrink: 0, width: 40, borderRadius: 12, border: '1px solid rgba(255,107,74,0.3)',
                      background: 'rgba(255,107,74,0.1)', color: diceAccent.lose, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X size={16} strokeWidth={2.4} />
                  </button>
                </div>
              )}
            </NeonGlassCard>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
            <NeonGlassCard accent={diceAccent.you} padding="16px 16px 14px">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${diceAccent.you}18`, border: `1px solid ${diceAccent.you}38`, color: diceAccent.you,
                }}>
                  <Swords size={15} strokeWidth={2.2} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: neon.text }}>Open a Challenge</p>
                  <p style={{ margin: '1px 0 0', fontSize: 9, color: 'rgba(184,239,248,0.5)' }}>Lobby stays open 15 minutes. Stake is escrowed.</p>
                </div>
              </div>

              <StakePicker stake={stake} setStake={setStake} balance={balance} />

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: 12, marginBottom: 12,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(184,239,248,0.45)' }}>Stake</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 800, color: neon.text }}>{stake} <span style={{ fontSize: 9, color: 'rgba(184,239,248,0.5)' }}>ARX-P</span></p>
                </div>
                <Crown size={14} color={diceAccent.win} />
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(184,239,248,0.45)' }}>Winner Gets</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 800, color: diceAccent.win }}>{diceDuelPot(stake) - Math.round(diceDuelPot(stake) * 0.05)} <span style={{ fontSize: 9, color: 'rgba(184,239,248,0.5)' }}>ARX-P</span></p>
                </div>
              </div>

              <motion.button
                type="button"
                whileTap={balance >= stake ? { scale: 0.97 } : undefined}
                onClick={handleCreate}
                disabled={balance < stake || busy}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 14, border: 'none',
                  cursor: balance >= stake ? 'pointer' : 'default',
                  touchAction: 'manipulation',
                  fontFamily: neon.font, fontSize: 12, fontWeight: 800,
                  background: balance >= stake ? `linear-gradient(135deg, ${diceAccent.you}, ${neon.purple})` : 'rgba(255,255,255,0.06)',
                  color: balance >= stake ? '#02060e' : 'rgba(255,255,255,0.35)',
                  boxShadow: balance >= stake ? `0 8px 24px ${diceAccent.you}30` : 'none',
                }}
              >
                {balance >= stake ? `Open Challenge — Stake ${stake}` : 'Insufficient ARX-P'}
              </motion.button>
            </NeonGlassCard>
          </motion.div>
        )}

        {!myMatch && (
          <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
            <NeonGlassCard accent={neon.cyan} padding="14px 14px 12px">
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, color: neon.text }}>Join with invite code</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={8}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 12,
                    border: '1px solid rgba(79,216,235,0.25)', background: 'rgba(0,0,0,0.25)',
                    color: neon.text, fontFamily: neon.font, fontSize: 13, fontWeight: 800, letterSpacing: '0.14em',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  disabled={busy || joinCode.trim().length < 4}
                  onClick={() => void handleJoinCode()}
                  style={{
                    padding: '10px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: `linear-gradient(135deg, ${neon.cyan}, ${neon.teal})`, color: '#041018',
                    fontFamily: neon.font, fontSize: 11, fontWeight: 800,
                    opacity: joinCode.trim().length < 4 ? 0.5 : 1,
                  }}
                >
                  Join
                </button>
              </div>
            </NeonGlassCard>
          </motion.div>
        )}

        <motion.div variants={fadeUp}>
          <NeonSectionLabel>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Users size={12} color={neon.purple} /> Open Challenges
            </span>
          </NeonSectionLabel>

          {loading ? (
            <NeonGlassCard accent={neon.purple} padding="20px 14px" style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 10, color: 'rgba(184,239,248,0.4)' }}>Loading challenges…</p>
            </NeonGlassCard>
          ) : challenges.length === 0 ? (
            <NeonGlassCard accent={neon.purple} padding="22px 14px" style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: neon.text }}>No open challenges</p>
              <p style={{ margin: '4px 0 0', fontSize: 9, color: 'rgba(184,239,248,0.45)' }}>
                Be the first — open a challenge above and share your invite code.
              </p>
            </NeonGlassCard>
          ) : (
            <div>
              {challenges.map((c) => (
                <ChallengeRow key={c.id} challenge={c} busy={busy} onAccept={() => void handleAccept(c)} />
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </V2Page>
  );
}
