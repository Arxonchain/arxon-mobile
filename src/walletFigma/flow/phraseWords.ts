/** Preview-only example. The live app must never reveal or quiz these words. */
export const EXAMPLE_PHRASE = [
  'river',
  'cloud',
  'mango',
  'window',
  'candle',
  'ocean',
  'tiger',
  'garden',
  'silver',
  'mountain',
  'paper',
  'apple',
] as const;

export type PhraseResolution = {
  words: string[];
  usable: boolean;
};

function sameAsExample(words: string[]) {
  if (words.length < EXAMPLE_PHRASE.length) return false;
  return EXAMPLE_PHRASE.every((word, i) => words[i] === word);
}

/** Live app: real mnemonic only. Preview (/flow) may use the example phrase. */
export function resolvePhraseWords(input: { app: boolean; words?: string[] | null }): PhraseResolution {
  if (!input.app) {
    return { words: [...EXAMPLE_PHRASE], usable: true };
  }
  const next = (input.words ?? []).map((word) => word.trim()).filter(Boolean);
  if (next.length < 12) return { words: [], usable: false };
  const twelve = next.slice(0, 12);
  if (sameAsExample(twelve)) return { words: [], usable: false };
  return { words: twelve, usable: true };
}

export function phraseQuiz(words: string[]) {
  const slots: [number, string, string][] = [
    [0, 'rebel', 'cactus'],
    [9, 'spoil', 'diet'],
    [11, 'tiger', 'ocean'],
  ];
  return slots.map(([index, a, b]) => {
    const answer = words[index] || '';
    const extras = [a, b, 'maple'].filter((word) => word && word !== answer);
    const options = [answer, extras[0], extras[1]].filter(Boolean);
    return {
      label: `#${index + 1}`,
      options,
      answer,
    };
  });
}

export function phraseQuizReady(words: string[], picks: Array<string | null>) {
  if (!resolvePhraseWords({ app: true, words }).usable) return false;
  const checks = phraseQuiz(words);
  if (checks.some((check) => !check.answer)) return false;
  if (sameAsExample(words)) return false;
  return checks.every((check, i) => picks[i] === check.answer);
}
