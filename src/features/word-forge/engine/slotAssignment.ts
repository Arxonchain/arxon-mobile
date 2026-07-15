export interface SlotRowAssignment {
  /** The fixed target word for this slot (determines box count, never changes) */
  target: string;
  /** The found word displayed in this slot, or null while unfilled */
  filledBy: string | null;
}

export interface SlotAssignmentResult {
  rows: SlotRowAssignment[];
  /** Valid found words that didn't fit any slot — paid as bonus finds */
  extraWords: string[];
  filledCount: number;
}

/**
 * Deterministically map found words onto the fixed slot rows.
 *
 * Slots never change shape: a found word fills the slot whose target matches
 * exactly, otherwise the first unfilled slot of the SAME length. Words that
 * fit no slot are extras (still paid, shown as bonus finds).
 */
export function assignSlots(slotWords: string[], foundWords: string[]): SlotAssignmentResult {
  const rows: SlotRowAssignment[] = slotWords.map((target) => ({ target, filledBy: null }));
  const extraWords: string[] = [];

  for (const word of foundWords) {
    const exact = rows.find((r) => !r.filledBy && r.target === word);
    if (exact) {
      exact.filledBy = word;
      continue;
    }
    const sameLen = rows.find((r) => !r.filledBy && r.target.length === word.length);
    if (sameLen) {
      sameLen.filledBy = word;
      continue;
    }
    extraWords.push(word);
  }

  return {
    rows,
    extraWords,
    filledCount: rows.filter((r) => r.filledBy).length,
  };
}
