/** Available ARX-P balance + lifetime Dice Roll earnings. */
import { Wallet, TrendingUp, Crown, Dices } from 'lucide-react';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import { NeonGlassCard } from '@/features/arxon-v2/design/NeonSecondaryUI';
import { diceAccent } from '../diceTokens';
import type { DiceSummary } from '../hooks/useDiceGame';

export function DiceBalanceCard({
  balance,
  summary,
  loading,
}: {
  balance: number;
  summary: DiceSummary;
  loading: boolean;
}) {
  const net = summary.lifetimeNet;
  const netPositive = net >= 0;
  const totalPlays = summary.houseMatches + summary.freeRollsClaimed;

  return (
    <NeonGlassCard accent={diceAccent.you} padding="14px 14px 12px">
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <p style={{
            margin: 0, display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'rgba(184,239,248,0.5)',
          }}>
            <Wallet size={10} strokeWidth={2.4} /> Available Balance
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 5 }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: neon.text, letterSpacing: '-0.6px' }}>
              {balance.toLocaleString()}
            </span>
            <span style={{ fontSize: 10, fontWeight: 800, color: diceAccent.you }}>ARX-P</span>
          </div>
        </div>

        <div style={{ width: 1, background: 'rgba(255,255,255,0.08)', alignSelf: 'stretch' }} />

        <div style={{ flex: 1 }}>
          <p style={{
            margin: 0, display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: 'rgba(184,239,248,0.5)',
          }}>
            <TrendingUp size={10} strokeWidth={2.4} /> Earned From Dice
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 5 }}>
            <span style={{
              fontSize: 22, fontWeight: 900, letterSpacing: '-0.6px',
              color: loading ? 'rgba(255,255,255,0.3)' : netPositive ? diceAccent.win : diceAccent.lose,
            }}>
              {loading ? '—' : `${netPositive ? '+' : ''}${Math.round(net).toLocaleString()}`}
            </span>
            {!loading && <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(184,239,248,0.4)' }}>ARX-P</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        {[
          { label: 'Wins', value: summary.wins, icon: <Crown size={11} strokeWidth={2.2} />, accent: diceAccent.win },
          { label: 'Plays', value: totalPlays, icon: <Dices size={11} strokeWidth={2.2} />, accent: diceAccent.you },
          { label: 'Lifetime Won', value: Math.round(summary.lifetimeWon), icon: <TrendingUp size={11} strokeWidth={2.2} />, accent: diceAccent.gold },
        ].map((s) => (
          <div key={s.label} style={{
            flex: 1, padding: '6px 4px', borderRadius: 10, textAlign: 'center',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, color: s.accent }}>
              {s.icon}
              <span style={{ fontSize: 12, fontWeight: 800 }}>{loading ? '—' : s.value.toLocaleString()}</span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: 7, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(184,239,248,0.4)' }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </NeonGlassCard>
  );
}
