/** Recent Dice Roll plays — merged free rolls + house matches, newest first. */
import { motion } from 'framer-motion';
import { Bot, Crown, Gift } from 'lucide-react';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import { NeonGlassCard } from '@/features/arxon-v2/design/NeonSecondaryUI';
import { diceAccent } from '../diceTokens';
import type { DiceHistoryEntry } from '../hooks/useDiceGame';

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function HistoryRow({ entry }: { entry: DiceHistoryEntry }) {
  const isFreeRoll = entry.kind === 'free_roll';
  const positive = entry.net >= 0;
  const accent = isFreeRoll ? diceAccent.gold : positive ? diceAccent.win : diceAccent.lose;

  const icon = isFreeRoll
    ? <Gift size={14} strokeWidth={2.2} />
    : positive
      ? <Crown size={14} strokeWidth={2.2} />
      : <Bot size={14} strokeWidth={2.2} />;

  const title = isFreeRoll ? 'Free Roll' : `vs House · Stake ${entry.stake}`;
  const subtitle = isFreeRoll ? relTime(entry.at) : `${positive ? 'Won' : 'Lost'} · ${relTime(entry.at)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 10px', marginBottom: 6, borderRadius: 14,
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div style={{
        width: 30, height: 30, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${accent}14`, border: `1px solid ${accent}30`, color: accent,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#b8eff8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </p>
        <p style={{ margin: '1px 0 0', fontSize: 9, color: 'rgba(184,239,248,0.45)' }}>{subtitle}</p>
      </div>
      <span style={{ fontSize: 12, fontWeight: 800, color: positive ? diceAccent.win : diceAccent.lose, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {positive ? '+' : ''}{entry.net}
      </span>
    </motion.div>
  );
}

export function DiceHistoryList({ history, loading }: { history: DiceHistoryEntry[]; loading: boolean }) {
  if (loading) {
    return (
      <NeonGlassCard accent={diceAccent.you} padding="20px 14px" style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 10, color: 'rgba(184,239,248,0.4)' }}>Loading play history…</p>
      </NeonGlassCard>
    );
  }

  if (history.length === 0) {
    return (
      <NeonGlassCard accent={diceAccent.you} padding="22px 14px" style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: neon.text }}>No plays yet</p>
        <p style={{ margin: '4px 0 0', fontSize: 9, color: 'rgba(184,239,248,0.45)' }}>
          Try a free roll or challenge the house to see your history here.
        </p>
      </NeonGlassCard>
    );
  }

  return (
    <div>
      {history.map((entry) => (
        <HistoryRow key={`${entry.kind}-${entry.id}`} entry={entry} />
      ))}
    </div>
  );
}
