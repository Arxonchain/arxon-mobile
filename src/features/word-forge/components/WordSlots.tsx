import { useMemo } from 'react';
import type { LevelTileSkin } from '../data/uiAssets';

interface WordSlotsProps {
  targetWords: string[];
  /** Valid (non-rejected) found words, in the order they were forged */
  foundWords: string[];
  minWords: number;
  minWordLen: number;
  skin: LevelTileSkin;
  hintWord?: string | null;
  celebrateWord?: string | null;
}

interface SlotRow {
  key: string;
  letters: (string | null)[];
  filled: boolean;
  isBonusHint: boolean;
  justFilled: boolean;
}

/**
 * Crossword-style slot rows (image-2 pattern): one row of boxes per word the
 * player must forge. Found words fill rows with letter pops; remaining rows
 * show empty boxes sized from the shortest unfound target words.
 */
export function WordSlots({
  targetWords, foundWords, minWords, minWordLen, skin, hintWord, celebrateWord,
}: WordSlotsProps) {
  const rows = useMemo<SlotRow[]>(() => {
    const found = foundWords.slice(0, minWords);
    const foundSet = new Set(foundWords);
    const unfoundTargets = targetWords
      .filter((w) => !foundSet.has(w))
      .sort((a, b) => a.length - b.length);

    const out: SlotRow[] = found.map((w, i) => ({
      key: `found-${w}`,
      letters: w.split(''),
      filled: true,
      isBonusHint: false,
      justFilled: celebrateWord === w && i === found.length - 1,
    }));

    const remaining = minWords - found.length;
    for (let i = 0; i < remaining; i++) {
      const target = unfoundTargets[i];
      const len = target ? target.length : minWordLen;
      const hinted = !!target && !!hintWord && target === hintWord.toUpperCase();
      out.push({
        key: `slot-${i}-${len}`,
        letters: Array.from({ length: len }, (_, j) => {
          if (hinted && (j === 0 || j === len - 1)) return target![j];
          return null;
        }),
        filled: false,
        isBonusHint: hinted,
        justFilled: false,
      });
    }
    return out;
  }, [targetWords, foundWords, minWords, minWordLen, hintWord, celebrateWord]);

  const bonusCount = Math.max(0, foundWords.length - minWords);
  const maxLen = Math.max(3, ...rows.map((r) => r.letters.length));
  const box = Math.max(22, Math.min(36, Math.floor(272 / maxLen) - 3));

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
      width: '100%', overflowY: 'auto', padding: '4px 0',
    }}>
      {rows.map((row) => (
        <div key={row.key} style={{
          display: 'flex', gap: 4,
          animation: row.justFilled ? 'wf-row-pop 0.45s cubic-bezier(0.34,1.5,0.64,1)' : undefined,
        }}>
          {row.letters.map((ch, i) => {
            const revealed = ch != null;
            const ghost = revealed && !row.filled;
            return (
              <div
                key={i}
                style={{
                  width: box, height: box, borderRadius: Math.max(6, box * 0.24),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: box * 0.55, fontWeight: 900,
                  fontFamily: "'Creato Display', system-ui, sans-serif",
                  ...(row.filled ? {
                    color: '#fff',
                    background: `linear-gradient(180deg, ${skin.accent} 0%, ${shade(skin.accent)} 100%)`,
                    border: `1.5px solid rgba(255,255,255,0.35)`,
                    boxShadow: `0 3px 0 rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.4), 0 0 14px ${skin.glow}`,
                    textShadow: '0 2px 3px rgba(0,0,0,0.45)',
                    animation: row.justFilled ? `wf-letter-pop 0.35s cubic-bezier(0.34,1.6,0.64,1) ${i * 0.05}s both` : undefined,
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
      ))}

      {bonusCount > 0 && (
        <div style={{
          marginTop: 3, padding: '4px 12px', borderRadius: 10,
          background: 'rgba(255,217,61,0.12)', border: '1px solid rgba(255,217,61,0.4)',
          fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', color: '#ffd93d',
        }}>
          +{bonusCount} BONUS {bonusCount === 1 ? 'WORD' : 'WORDS'}
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
