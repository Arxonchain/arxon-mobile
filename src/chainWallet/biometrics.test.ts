import { describe, expect, it } from 'vitest';
import { bioEnableLabel, bioVerb, kindFromNativeType } from './biometrics';

describe('kindFromNativeType', () => {
  it('maps Touch ID and fingerprint to fingerprint', () => {
    expect(kindFromNativeType(1).kind).toBe('fingerprint');
    expect(kindFromNativeType(3).fingerprint).toBe(true);
    expect(kindFromNativeType(3).face).toBe(false);
  });

  it('maps Face ID to face', () => {
    expect(kindFromNativeType(2).kind).toBe('face');
    expect(kindFromNativeType(4).face).toBe(true);
  });

  it('maps multiple biometrics to fingerprint-first with face too', () => {
    const caps = kindFromNativeType(6);
    expect(caps.fingerprint).toBe(true);
    expect(caps.face).toBe(true);
    expect(caps.kind).toBe('fingerprint');
  });
});

describe('bio copy', () => {
  it('names fingerprint unlock', () => {
    expect(bioVerb('fingerprint')).toBe('Use fingerprint');
    expect(bioEnableLabel('fingerprint')).toBe('Enable fingerprint');
  });
});
