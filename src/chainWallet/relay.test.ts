import { describe, expect, it } from 'vitest';

import { isRelayerPayer, RELAYER_PAYER, RELAYER_PAYER_B, relayUrls } from './relay';

describe('relay urls', () => {
  it('retries live /relay-b after /relay', () => {
    expect(relayUrls('https://rpc-test.arxonchain.xyz')).toEqual([
      'https://rpc-test.arxonchain.xyz/relay',
      'https://rpc-test.arxonchain.xyz/relay-b',
    ]);
  });

  it('treats both live payers as the Arxon relayer', () => {
    expect(isRelayerPayer(RELAYER_PAYER)).toBe(true);
    expect(isRelayerPayer(RELAYER_PAYER_B)).toBe(true);
    expect(isRelayerPayer('0x1111111111111111111111111111111111111111')).toBe(false);
  });
});
