interface ExposureMeterProps {
  exposure: number;
  max?: number;
}

export default function ExposureMeter({ exposure, max = 100 }: ExposureMeterProps) {
  const pct = Math.min(100, Math.max(0, (exposure / max) * 100));
  const hot = pct > 65;

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
        color: hot ? '#FF7B54' : 'hsl(215 20% 78%)', marginBottom: 6,
        fontFamily: "'Creato Display',system-ui,sans-serif",
      }}>
        Signal Exposure
      </div>
      <div style={{
        width: '100%', height: 14, borderRadius: 10,
        background: 'rgba(6,38,46,0.55)', border: '1px solid rgba(244,228,193,0.15)',
        overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: hot
            ? 'linear-gradient(90deg, #FFB347, #FF5A3C)'
            : 'linear-gradient(90deg, #7FE7C4, #4FD8EB)',
          transition: 'width 0.08s linear', borderRadius: 10,
          boxShadow: hot ? '0 0 12px rgba(255,90,60,0.5)' : 'none',
        }} />
      </div>
    </div>
  );
}
