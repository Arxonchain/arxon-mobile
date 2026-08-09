/** Best-of-3 round indicator: filled pips = rounds won. */
export function RoundPips({
  wins,
  target = 2,
  accent,
  size = 8,
}: {
  wins: number;
  target?: number;
  accent: string;
  size?: number;
}) {
  return (
    <div style={{ display: 'flex', gap: 5 }}>
      {Array.from({ length: target }).map((_, i) => {
        const filled = i < wins;
        return (
          <span
            key={i}
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              background: filled ? accent : 'rgba(255,255,255,0.1)',
              border: `1px solid ${filled ? accent : 'rgba(255,255,255,0.18)'}`,
              boxShadow: filled ? `0 0 8px ${accent}90` : 'none',
              transition: 'all 0.25s ease',
            }}
          />
        );
      })}
    </div>
  );
}
