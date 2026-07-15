import type { LevelTileSkin } from '../data/uiAssets';
import type { SlotRowAssignment } from '../engine/slotAssignment';

interface WordSlotsProps {
  /** Fixed slot rows for the round — shape never changes mid-round */
  rows: SlotRowAssignment[];
  /** Valid found words that fit no slot (paid as bonus finds) */
  extraCount: number;
  skin: LevelTileSkin;
  hintWord?: string | null;
  celebrateWord?: string | null;
}

/**
 * Crossword-style slot rows: one fixed row of boxes per word the player must
 * forge. Box counts are locked at level start; found words fill the matching
 * row with letter pops.
 */
export function WordSlots({ rows, extraCount, skin, hintWord, celebrateWord }: WordSlotsProps) {
  const maxLen = Math.max(3, ...rows.map((r) => r.target.length));
  const box = Math.max(22, Math.min(36, Math.floor(272 / maxLen) - 3));
  const hint = hintWord?.toUpperCase() ?? null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
      width: '100%', overflowY: 'auto', padding: '4px 0',
    }}>
      {rows.map((row, rowIdx) => {
        const filled = row.filledBy != null;
        const justFilled = filled && celebrateWord === row.filledBy;
        const hinted = !filled && hint != null && row.target === hint;
        const len = row.target.length;
        const letters: (string | null)[] = filled
          ? row.filledBy!.split('')
          : Array.from({ length: len }, (_, j) => (hinted && (j === 0 || j === len - 1) ? row.target[j] : null));

        return (
          <div key={`${rowIdx}-${row.target}`} style={{
            display: 'flex', gap: 4,
            animation: justFilled ? 'wf-row-pop 0.45s cubic-bezier(0.34,1.5,0.64,1)' : undefined,
          }}>
            {letters.map((ch, i) => {
              const ghost = ch != null && !filled;
              return (
                <div
                  key={i}
                  style={{
                    width: box, height: box, borderRadius: Math.max(6, box * 0.24),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: box * 0.55, fontWeight: 900,
                    fontFamily: "'Creato Display', system-ui, sans-serif",
                    ...(filled ? {
                      color: '#fff',
                      background: `linear-gradient(180deg, ${skin.accent} 0%, ${shade(skin.accent)} 100%)`,
                      border: `1.5px solid rgba(255,255,255,0.35)`,
                      boxShadow: `0 3px 0 rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.4), 0 0 14px ${skin.glow}`,
                      textShadow: '0 2px 3px rgba(0,0,0,0.45)',
                      animation: justFilled ? `wf-letter-pop 0.35s cubic-bezier(0.34,1.6,0.64,1) ${i * 0.05}s both` : undefined,
                    } : {
                      color: ghost ? '#ffd93d' : 'transparent',
                      background: 'rgba(4,14,28,0.72)',
                      border: ghost ? '1.5px solid rgba(255,217,61,0.6)' : '1.5px solid rgba(79,216,235,0.24)',
                      boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(255,255,255,0.06)',
                      textShadow: ghost ? '0 0 10px rgba(255,217,61,0.7)' : undefined,
                    }),
                  }}
                >
                  {ch ?? ''}
                </div>
              );
            })}
          </div>
        );
      })}

      {extraCount > 0 && (
        <div style={{
          marginTop: 3, padding: '4px 12px', borderRadius: 10,
          background: 'rgba(255,217,61,0.12)', border: '1px solid rgba(255,217,61,0.4)',
          fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', color: '#ffd93d',
        }}>
          +{extraCount} BONUS {extraCount === 1 ? 'WORD' : 'WORDS'}
        </div>
      )}

      <style>{`
        @keyframes wf-row-pop { 0%{transform:scale(1)} 40%{transform:scale(1.12)} 100%{transform:scale(1)} }
        @keyframes wf-letter-pop { 0%{transform:scale(0) rotate(-8deg);opacity:0} 100%{transform:scale(1) rotate(0);opacity:1} }
      `}</style>
    </div>
  );
}

/** Darken a hex color for the tile gradient bottom */
function shade(hex: string): string {
  const n = hex.replace('#', '');
  const r = Math.max(0, Math.round(parseInt(n.slice(0, 2), 16) * 0.52));
  const g = Math.max(0, Math.round(parseInt(n.slice(2, 4), 16) * 0.52));
  const b = Math.max(0, Math.round(parseInt(n.slice(4, 6), 16) * 0.52));
  return `rgb(${r},${g},${b})`;
}
