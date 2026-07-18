import { describe, it, expect } from 'vitest';
import { DICTIONARY, hasWord, ingestWordlistForTest, PLAYER_MIN_WORD_LEN } from '../../data/dictionary';
import { validateWordLocal } from '../wordValidator';

describe('dictionary', () => {
  it('curated list includes common 3-letter words', () => {
    for (const w of ['LOT', 'CAN', 'BAN', 'RAN', 'FOUR', 'CAT']) {
      expect(DICTIONARY.has(w)).toBe(true);
    }
  });

  it('ingests CRLF wordlist lines without trailing carriage returns', () => {
    ingestWordlistForTest('LOT\r\nCAN\r\nFOUR\r\n');
    expect(hasWord('LOT')).toBe(true);
    expect(hasWord('CAN')).toBe(true);
    expect(hasWord('FOUR')).toBe(true);
  });
});

describe('validateWordLocal with swipe path', () => {
  it('accepts LOT from selected wheel tiles', () => {
    const r = validateWordLocal('LOT', ['L', 'O', 'T', 'R'], new Set(), PLAYER_MIN_WORD_LEN, ['L', 'O', 'T']);
    expect(r.ok).toBe(true);
  });

  it('rejects when path letters do not spell the word', () => {
    const r = validateWordLocal('LOT', ['L', 'O', 'T'], new Set(), PLAYER_MIN_WORD_LEN, ['L', 'O', 'G']);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('pool');
  });
});
