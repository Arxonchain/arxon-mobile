import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { validateAndCreditWord } from '../wordValidatorServer';

const invoke = supabase.functions.invoke as ReturnType<typeof vi.fn>;

describe('validateAndCreditWord', () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it('marks sync pending when the edge function errors', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('Function not found') });
    const result = await validateAndCreditWord(
      'CAT', ['C', 'A', 'T', 'S'], [], 1, 'attempt-1', 0, 3,
    );
    expect(result.ok).toBe(true);
    expect(result.credited).toBe(false);
    expect(result.syncPending).toBe(true);
    expect(result.payout).toBeGreaterThan(0);
  });

  it('rejects when server dictionary misses', async () => {
    invoke.mockResolvedValue({ data: { ok: false, reason: 'unknown' }, error: null });
    const result = await validateAndCreditWord(
      'CAT', ['C', 'A', 'T', 'S'], [], 1, 'attempt-1', 0, 3,
    );
    expect(result.ok).toBe(false);
  });

  it('rejects when server reports pool mismatch', async () => {
    invoke.mockResolvedValue({ data: { ok: false, reason: 'pool' }, error: null });
    const result = await validateAndCreditWord(
      'CAT', ['C', 'A', 'T', 'S'], [], 1, 'attempt-1', 0, 3, ['C', 'A', 'T'],
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('pool');
  });

  it('rejects duplicate when server is authoritative', async () => {
    invoke.mockResolvedValue({ data: { ok: false, reason: 'duplicate' }, error: null });
    const result = await validateAndCreditWord(
      'CAT', ['C', 'A', 'T'], [], 1, 'attempt-1', 0, 3,
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('duplicate');
  });

  it('rejects words that do not fill an open slot', async () => {
    const result = await validateAndCreditWord(
      'RAT', ['R', 'A', 'T', 'S'], ['DOG'], 1, 'attempt-1', 0, 3, undefined,
      ['CAT', 'FISH'],
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('noslot');
  });
});
