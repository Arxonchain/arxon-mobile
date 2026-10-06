import { inBlockText, provedText, type TxClocks } from '@/chainWallet/clocks';

export function ClockLabels({ clocks }: { clocks?: TxClocks }) {
  const proved = provedText(clocks);
  const inBlock = inBlockText(clocks);
  if (!proved && !inBlock) return null;
  return (
    <span style={{ display: 'block', clear: 'both' }}>
      {proved ? (
        <span style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'hsl(215 14% 52%)', marginTop: 4 }}>
          {proved}
        </span>
      ) : null}
      {inBlock ? (
        <span
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 700,
            color: 'hsl(215 14% 52%)',
            marginTop: proved ? 2 : 4,
          }}
        >
          {inBlock}
        </span>
      ) : null}
    </span>
  );
}
