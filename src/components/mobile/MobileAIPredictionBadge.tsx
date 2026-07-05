/** Compact AI prediction chip for mobile arena cards (inline styles). */
export default function MobileAIPredictionBadge({
  sideAProbability,
  sideBProbability,
  sideAName,
  sideBName,
  confidence,
}: {
  sideAProbability?: number | null;
  sideBProbability?: number | null;
  sideAName: string;
  sideBName: string;
  confidence?: string | null;
}) {
  if (sideAProbability == null || Number.isNaN(Number(sideAProbability))) return null;

  const probA = Number(sideAProbability);
  const probB = sideBProbability != null ? Number(sideBProbability) : 100 - probA;
  const favoriteName = probA >= probB ? sideAName : sideBName;
  const favoriteProb = Math.max(probA, probB);

  return (
    <div
      title={confidence ? `AI confidence: ${confidence.replace(/_/g, ' ')}` : 'AI prediction'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        marginTop: 6,
        padding: '3px 8px',
        borderRadius: 20,
        background: 'hsl(215 45% 55%/0.1)',
        border: '1px solid hsl(215 45% 55%/0.22)',
      }}
    >
      <span style={{ fontSize: 9, fontWeight: 800, color: 'hsl(215 45% 68%)' }}>AI</span>
      <span style={{ fontSize: 9, fontWeight: 700, color: 'hsl(215 18% 72%)' }}>
        {favoriteProb.toFixed(0)}% {favoriteName}
      </span>
    </div>
  );
}
