/** Dice Roll — Rumble lobby: open a multiplayer elimination lobby or join someone else's. */
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users2, Clock, X, Crown, UsersRound } from 'lucide-react';
import { usePoints } from '@/hooks/usePoints';
import { toast } from '@/hooks/use-toast';
import { useIsAppPreview, toPreviewPath } from '@/features/arxon-v2/preview/AppPreviewContext';
import { V2Page, fadeUp, stagger } from '../design/Kit';
import { neon } from '../design/neonTokens';
import { NeonScreenHeader, NeonGlassCard, NeonSectionLabel } from '../design/NeonSecondaryUI';
import { useDiceRumbleLobby, type RumbleLobby } from '@/features/dice/hooks/useDiceRumble';
import { DICE_STAKE_TIERS, DICE_RUMBLE_LOBBY_SIZES, diceAccent, diceRumblePot, diceRumblePayout } from '@/features/dice/diceTokens';

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function TierPicker<T extends number>({ options, value, onChange, balance }: { options: readonly T[]; value: T; onChange: (v: T) => void; balance?: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
      {options.map((opt) => {
        const active = opt === value;
        const disabled = balance !== undefined && balance < opt;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt)}
            style={{
              flex: '1 1 auto', minWidth: 40, padding: '8px 4px', borderRadius: 11, cursor: disabled ? 'default' : 'pointer',
              touchAction: 'manipulation',
              border: `1px solid ${active ? neon.gold : 'rgba(255,255,255,0.1)'}`,
              background: active ? `${neon.gold}20` : 'rgba(255,255,255,0.03)',
              color: disabled ? 'rgba(255,255,255,0.25)' : active ? neon.gold : 'rgba(184,239,248,0.7)',
              fontFamily: neon.font, fontSize: 11, fontWeight: 800,
              boxShadow: active ? `inset 0 0 0 1px ${neon.gold}50` : 'none',
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function LobbyRow({ lobby, onJoin, busy }: { lobby: RumbleLobby; onJoin: () => void; busy: boolean }) {
  const full = lobby.playersJoined >= lobby.maxPlayers;
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
        background: `${neon.gold}18`, border: `1px solid ${neon.gold}38`,
        color: neon.gold, fontSize: 13, fontWeight: 800,
      }}>
        {lobby.username.slice(0, 1).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: neon.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lobby.username}'s lobby
        </p>
        <p style={{ margin: '1px 0 0', fontSize: 9, color: 'rgba(184,239,248,0.45)' }}>
          Stake {lobby.stake} · {lobby.playersJoined}/{lobby.maxPlayers} joined · {relTime(lobby.createdAt)}
        </p>
      </div>
      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        disabled={busy || full}
        onClick={onJoin}
        style={{
          flexShrink: 0, padding: '8px 14px', borderRadius: 11, border: 'none', cursor: busy || full ? 'default' : 'pointer',
          touchAction: 'manipulation',
          background: full ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${neon.gold}, #ffb020)`,
          color: full ? 'rgba(255,255,255,0.35)' : '#1a1400',
          fontFamily: neon.font, fontSize: 10, fontWeight: 800,
        }}
      >
        {full ? 'Full' : 'Join'}
      </motion.button>
    </motion.div>
  );
}

export default function DiceRumbleLobbyV2() {
  const navigate = useNavigate();
  const preview = useIsAppPreview();
  const { points } = usePoints();
  const { lobbies, myMatch, loading, busy, createLobby, joinLobby, cancelLobby } = useDiceRumbleLobby();
  const [stake, setStake] = useState<number>(DICE_STAKE_TIERS[1]);
  const [size, setSize] = useState<number>(DICE_RUMBLE_LOBBY_SIZES[1]);

  const balance = Math.round(points?.total_points ?? 0);

  const go = useCallback((path: string) => {
    navigate(preview ? toPreviewPath(path) : path);
  }, [navigate, preview]);

  const handleCreate = useCallback(async () => {
    if (balance < stake) {
      toast({ title: 'Insufficient ARX-P', description: `You need ${stake} ARX-P to open this lobby.`, variant: 'destructive' });
      return;
    }
    const res = await createLobby(stake, size);
    if (!res.success) {
      toast({ title: 'Could not create lobby', description: res.error, variant: 'destructive' });
      return;
    }
    go(`/arena/dice/rumble/${res.matchId}`);
  }, [balance, stake, size, createLobby, go]);

  const handleJoin = useCallback(async (lobby: RumbleLobby) => {
    if (balance < lobby.stake) {
      toast({ title: 'Insufficient ARX-P', description: `You need ${lobby.stake} ARX-P to join.`, variant: 'destructive' });
      return;
    }
    const res = await joinLobby(lobby.id);
    if (!res.success) {
      toast({ title: 'Could not join', description: res.error, variant: 'destructive' });
      return;
    }
    go(`/arena/dice/rumble/${res.matchId ?? lobby.id}`);
  }, [balance, joinLobby, go]);

  const handleCancel = useCallback(async () => {
    if (!myMatch) return;
    const res = await cancelLobby(myMatch.id);
    if (!res.success) toast({ title: 'Could not cancel', description: res.error, variant: 'destructive' });
  }, [myMatch, cancelLobby]);

  return (
    <V2Page>
      <NeonScreenHeader
        eyebrow="Dice Roll · PvP"
        title="Rumble"
        subtitle="Multiplayer elimination. Lowest roll each round is out."
        onBack={() => go('/arena/dice')}
        right={
          <div style={{
            width: 38, height: 38, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${neon.gold}14`, border: `1px solid ${neon.gold}30`, color: neon.gold,
          }}>
            <Users2 size={18} strokeWidth={2.2} />
          </div>
        }
      />

      <motion.div variants={stagger} initial="hidden" animate="show" style={{ padding: '0 16px' }}>
        {myMatch ? (
          <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
            <NeonGlassCard accent={neon.gold} padding="16px 16px 14px" onClick={() => go(`/arena/dice/rumble/${myMatch.id}`)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${neon.gold}18`, border: `1px solid ${neon.gold}38`, color: neon.gold,
                }}>
                  {myMatch.status === 'active' ? <UsersRound size={15} strokeWidth={2.2} /> : <Clock size={15} strokeWidth={2.2} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: neon.text }}>
                    {myMatch.status === 'active' ? 'Rumble in progress!' : 'Your open lobby'}
                  </p>
                  <p style={{ margin: '1px 0 0', fontSize: 9, color: 'rgba(184,239,248,0.5)' }}>Stake {myMatch.stake} ARX-P</p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); go(`/arena/dice/rumble/${myMatch.id}`); }}
                style={{
                  width: '100%', padding: '11px 0', borderRadius: 13, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${neon.gold}, #ffb020)`, color: '#1a1400',
                  fontFamily: neon.font, fontSize: 11, fontWeight: 800,
                }}
              >
                {myMatch.status === 'active' ? 'Enter Match' : 'View Lobby'}
              </button>
            </NeonGlassCard>
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} style={{ marginBottom: 14 }}>
            <NeonGlassCard accent={neon.gold} padding="16px 16px 14px">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${neon.gold}18`, border: `1px solid ${neon.gold}38`, color: neon.gold,
                }}>
                  <Users2 size={15} strokeWidth={2.2} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: neon.text }}>Open a Lobby</p>
                  <p style={{ margin: '1px 0 0', fontSize: 9, color: 'rgba(184,239,248,0.5)' }}>Last miner standing takes the pot.</p>
                </div>
              </div>

              <p style={{ margin: '0 0 6px', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(184,239,248,0.45)' }}>Stake</p>
              <TierPicker options={DICE_STAKE_TIERS} value={stake} onChange={setStake} balance={balance} />

              <p style={{ margin: '0 0 6px', fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(184,239,248,0.45)' }}>Lobby Size</p>
              <TierPicker options={DICE_RUMBLE_LOBBY_SIZES} value={size} onChange={setSize} />

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: 12, marginBottom: 12,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(184,239,248,0.45)' }}>Full Pot</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 800, color: neon.text }}>{diceRumblePot(stake, size)} <span style={{ fontSize: 9, color: 'rgba(184,239,248,0.5)' }}>ARX-P</span></p>
                </div>
                <Crown size={14} color={diceAccent.win} />
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(184,239,248,0.45)' }}>Winner Gets</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 800, color: diceAccent.win }}>{diceRumblePayout(stake, size)} <span style={{ fontSize: 9, color: 'rgba(184,239,248,0.5)' }}>ARX-P</span></p>
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
                  background: balance >= stake ? `linear-gradient(135deg, ${neon.gold}, #ffb020)` : 'rgba(255,255,255,0.06)',
                  color: balance >= stake ? '#1a1400' : 'rgba(255,255,255,0.35)',
                  boxShadow: balance >= stake ? `0 8px 24px ${neon.gold}30` : 'none',
                }}
              >
                {balance >= stake ? `Open Lobby — Stake ${stake}` : 'Insufficient ARX-P'}
              </motion.button>
            </NeonGlassCard>
          </motion.div>
        )}

        <motion.div variants={fadeUp}>
          <NeonSectionLabel>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Users2 size={12} color={neon.gold} /> Open Lobbies
            </span>
          </NeonSectionLabel>

          {loading ? (
            <NeonGlassCard accent={neon.gold} padding="20px 14px" style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 10, color: 'rgba(184,239,248,0.4)' }}>Loading lobbies…</p>
            </NeonGlassCard>
          ) : lobbies.length === 0 ? (
            <NeonGlassCard accent={neon.gold} padding="22px 14px" style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: neon.text }}>No open lobbies</p>
              <p style={{ margin: '4px 0 0', fontSize: 9, color: 'rgba(184,239,248,0.45)' }}>
                Open one above and wait for other miners to join.
              </p>
            </NeonGlassCard>
          ) : (
            <div>
              {lobbies.map((l) => (
                <LobbyRow key={l.id} lobby={l} busy={busy} onJoin={() => void handleJoin(l)} />
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </V2Page>
  );
}
