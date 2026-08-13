import { describe, expect, it } from 'vitest';
import { parseAuthAppLink } from './parseAuthAppLink';

describe('parseAuthAppLink', () => {
  it('parses pages.dev confirm with query', () => {
    const r = parseAuthAppLink(
      'https://arxon-mobile.pages.dev/auth/confirm?token_hash=abc&type=signup',
    );
    expect(r).toEqual({
      pathWithSearch: '/auth/confirm?token_hash=abc&type=signup',
      implicitHash: undefined,
    });
  });

  it('parses recovery confirm on brand host', () => {
    const r = parseAuthAppLink(
      'https://arxonchain.xyz/auth/confirm?token_hash=xyz&type=recovery',
    );
    expect(r?.pathWithSearch).toBe('/auth/confirm?token_hash=xyz&type=recovery');
  });

  it('captures implicit access_token hash', () => {
    const r = parseAuthAppLink(
      'https://arxonchain.xyz/auth/confirm#access_token=tok&refresh_token=ref&type=recovery',
    );
    expect(r?.pathWithSearch).toBe('/auth/confirm');
    expect(r?.implicitHash).toContain('access_token=tok');
  });

  it('accepts reset-password path', () => {
    const r = parseAuthAppLink('https://www.arxonchain.xyz/reset-password');
    expect(r?.pathWithSearch).toBe('/reset-password');
  });

  it('rejects unrelated hosts/paths', () => {
    expect(parseAuthAppLink('https://evil.example/auth/confirm?token_hash=x')).toBeNull();
    expect(parseAuthAppLink('https://arxonchain.xyz/dashboard')).toBeNull();
  });
});
