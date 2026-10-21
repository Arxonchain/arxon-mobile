import { describe, expect, it } from 'vitest';
import { EXAMPLE_PHRASE, phraseQuiz, phraseQuizReady, resolvePhraseWords } from './phraseWords';

const real = ['canyon', 'river', 'amber', 'north', 'silver', 'garden', 'orbit', 'maple', 'quiet', 'harbor', 'velvet', 'stone'];

describe('resolvePhraseWords', () => {
  it('uses the example phrase only in preview', () => {
    expect(resolvePhraseWords({ app: false }).words).toEqual([...EXAMPLE_PHRASE]);
    expect(resolvePhraseWords({ app: false }).usable).toBe(true);
  });

  it('never exposes the example phrase in the live app', () => {
    expect(resolvePhraseWords({ app: true, words: [...EXAMPLE_PHRASE] })).toEqual({ words: [], usable: false });
    expect(resolvePhraseWords({ app: true, words: null }).usable).toBe(false);
    expect(resolvePhraseWords({ app: true, words: ['only', 'eleven', 'words', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] }).usable).toBe(false);
  });

  it('returns a real 12-word mnemonic in the live app', () => {
    expect(resolvePhraseWords({ app: true, words: real })).toEqual({ words: real, usable: true });
  });
});

describe('phraseQuizReady', () => {
  it('rejects the example phrase even if every quiz pick matches', () => {
    const checks = phraseQuiz([...EXAMPLE_PHRASE]);
    expect(phraseQuizReady([...EXAMPLE_PHRASE], checks.map((c) => c.answer))).toBe(false);
  });

  it('accepts the real mnemonic when the quiz picks match', () => {
    const checks = phraseQuiz(real);
    expect(phraseQuizReady(real, checks.map((c) => c.answer))).toBe(true);
    expect(phraseQuizReady(real, ['wrong', checks[1].answer, checks[2].answer])).toBe(false);
  });
});
