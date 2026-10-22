import { Capacitor, registerPlugin } from '@capacitor/core';
import { NativeBiometric, type AvailableResult } from '@capgo/capacitor-native-biometric';
import { currentPassword, sessionStore } from './session';

type ArxonBioPlugin = {
  verify: (opts: { title: string; subtitle: string }) => Promise<{ ok: boolean }>;
};

const ArxonBioNative = registerPlugin<ArxonBioPlugin>('ArxonBiometric', {
  web: {
    verify: async () => {
      throw new Error('not implemented');
    },
  },
});

const BIO_SERVER = 'xyz.arxonchain.app';

/** Native plugin biometryType: NONE=0 TOUCH_ID=1 FACE_ID=2 FINGERPRINT=3 FACE_AUTH=4 IRIS=5 MULTIPLE=6 */
export type BioKind = 'none' | 'fingerprint' | 'face';

export type BioCaps = {
  available: boolean;
  fingerprint: boolean;
  face: boolean;
  kind: BioKind;
  reason?: string;
};

export function kindFromNativeType(type: number): BioCaps {
  if (type === 2 || type === 4) return { available: true, fingerprint: false, face: true, kind: 'face' };
  if (type === 5) return { available: true, fingerprint: false, face: true, kind: 'face' };
  if (type === 6) return { available: true, fingerprint: true, face: true, kind: 'fingerprint' };
  if (type === 1 || type === 3) return { available: true, fingerprint: true, face: false, kind: 'fingerprint' };
  return { available: false, fingerprint: false, face: false, kind: 'none' };
}

export function bioVerb(kind: BioKind): string {
  if (kind === 'face') return 'Use Face ID';
  if (kind === 'fingerprint') return 'Use fingerprint';
  return 'Use biometrics';
}

export function bioEnableLabel(kind: BioKind): string {
  if (kind === 'face') return 'Enable Face ID';
  if (kind === 'fingerprint') return 'Enable fingerprint';
  return 'Enable biometrics';
}

function nativePlatform() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function nativePlugin() {
  if (!nativePlatform()) return null;
  return NativeBiometric;
}

type BioBridge = { verify: (id: string, title: string, subtitle: string) => void };

function biometricBridge(): BioBridge | null {
  try {
    const bridge = (window as unknown as { ArxonBiometric?: BioBridge }).ArxonBiometric;
    if (!bridge) return null;
    // Android JavascriptInterface methods often fail `typeof === 'function'`.
    if (typeof bridge.verify === 'function' || typeof (bridge as { verify?: unknown }).verify !== 'undefined') {
      return bridge;
    }
  } catch {
    /* no bridge on this document */
  }
  return null;
}

function pluginMissing(e: unknown) {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return (
    msg.includes('not implemented') ||
    msg.includes('unimplemented') ||
    msg.includes('plugin is not implemented') ||
    msg.includes('"arxonbiometric" plugin') ||
    msg.includes('is not available')
  );
}

function promptViaBridge(title: string, subtitle: string): Promise<void> {
  const bridge = biometricBridge();
  if (!bridge) return Promise.reject(new Error('no-bridge'));
  return new Promise((resolve, reject) => {
    const id = `bio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const w = window as unknown as { __arxonBioResult?: (rid: string, ok: boolean, err: string) => void };
    const previous = w.__arxonBioResult;
    const timer = window.setTimeout(() => {
      finish();
      reject(new Error('Fingerprint timed out. Try again.'));
    }, 60_000);
    const finish = () => {
      window.clearTimeout(timer);
      if (w.__arxonBioResult === handler) w.__arxonBioResult = previous;
    };
    const handler = (rid: string, ok: boolean, err: string) => {
      if (rid !== id) {
        previous?.(rid, ok, err);
        return;
      }
      finish();
      if (ok) resolve();
      else reject(new Error(err || 'Canceled.'));
    };
    w.__arxonBioResult = handler;
    try {
      bridge.verify(id, title, subtitle);
    } catch (e) {
      finish();
      reject(e instanceof Error ? e : new Error('Could not open fingerprint.'));
    }
  });
}

async function promptOnPhone(title: string, subtitle: string): Promise<void> {
  if (nativePlatform()) {
    try {
      await Promise.race([
        ArxonBioNative.verify({ title, subtitle }),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('Fingerprint timed out. Try again.')), 60_000);
        }),
      ]);
      return;
    } catch (e) {
      if (!pluginMissing(e)) throw bioError(e, 'Could not confirm fingerprint.');
    }
  }
  if (biometricBridge()) {
    await promptViaBridge(title, subtitle);
    return;
  }
  throw new Error('Fingerprint isn’t ready in this session. Force-close Arxon, open it again, then turn this on.');
}

async function webAuthAvailable() {
  if (nativePlatform()) return false;
  try {
    return !!(await window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.());
  } catch {
    return false;
  }
}

function availabilityMessage(result: AvailableResult) {
  if (result.errorCode === 3) return 'Add a fingerprint or face unlock in this phone’s Settings, then try again.';
  if (result.errorCode === 14) return 'Set a screen lock on this phone, then try again.';
  if (result.errorCode === 1) return 'This phone does not expose fingerprint or Face ID to apps.';
  return 'Fingerprint and Face ID are not available right now.';
}

function bioError(e: unknown, fallback: string) {
  const msg = e instanceof Error ? e.message : typeof e === 'string' ? e : '';
  const lower = msg.toLowerCase();
  if (lower.includes('cancel') || lower.includes('canceled') || lower.includes('cancelled')) {
    return new Error('Canceled.');
  }
  if (lower.includes('not enrolled') || lower.includes('no biometrics')) {
    return new Error('Add a fingerprint or face unlock in this phone’s Settings, then try again.');
  }
  if (lower.includes('missing properties')) {
    return new Error('Enter your wallet password, then turn this on.');
  }
  if (msg.trim()) return new Error(msg);
  return new Error(fallback);
}

function capsFromResult(result: AvailableResult): BioCaps {
  if (!result.isAvailable) {
    return { available: false, fingerprint: false, face: false, kind: 'none', reason: availabilityMessage(result) };
  }
  const mapped = kindFromNativeType(Number(result.biometryType ?? 0));
  if (nativePlatform() && Capacitor.getPlatform() === 'android') {
    return {
      available: true,
      fingerprint: true,
      face: true,
      kind: mapped.kind === 'face' ? 'face' : 'fingerprint',
    };
  }
  if (mapped.available) return mapped;
  return { available: true, fingerprint: true, face: false, kind: 'fingerprint' };
}

export async function biometricsCaps(): Promise<BioCaps> {
  if (biometricBridge() || (nativePlatform() && Capacitor.getPlatform() === 'android')) {
    return { available: true, fingerprint: true, face: true, kind: 'fingerprint' };
  }
  const native = nativePlugin();
  if (native) {
    try {
      return capsFromResult(await native.isAvailable({ useFallback: false }));
    } catch {
      /* fall through */
    }
  }
  if (await webAuthAvailable()) {
    return { available: true, fingerprint: true, face: false, kind: 'fingerprint' };
  }
  if (nativePlatform()) {
    return {
      available: false,
      fingerprint: false,
      face: false,
      kind: 'none',
      reason: 'Fingerprint isn’t available in this app build. Close Arxon fully, then open it again.',
    };
  }
  return { available: false, fingerprint: false, face: false, kind: 'none' };
}

export async function biometricsAvailable() {
  return (await biometricsCaps()).available;
}

export async function saveBiometricSecret(password: string) {
  if (!password) return;
  const native = nativePlugin();
  if (!native) return;
  await native.setCredentials({ username: 'arxon', password, server: BIO_SERVER });
}

async function loadBiometricSecret(): Promise<string | null> {
  const native = nativePlugin();
  if (!native) return null;
  try {
    const creds = await native.getCredentials({ server: BIO_SERVER });
    return creds?.password || null;
  } catch {
    return null;
  }
}

export async function clearBiometricSecret() {
  const native = nativePlugin();
  if (!native) return;
  try {
    await native.deleteCredentials({ server: BIO_SERVER });
  } catch {
    /* already empty */
  }
}

export async function enableBiometrics(password?: string) {
  const pass = (password || currentPassword() || '').trim();
  if (!pass) throw new Error('Enter your wallet password, then turn this on.');

  if (nativePlatform()) {
    try {
      await promptOnPhone('Arxon', 'Confirm it’s you to turn this on');
    } catch (e) {
      throw bioError(e, 'Could not enable fingerprint or Face ID.');
    }
    try {
      await saveBiometricSecret(pass);
    } catch {
      /* prompt already succeeded — keep the toggle on */
    }
    sessionStore.setBiometrics(true);
    return true;
  }

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  const userId = new Uint8Array(16);
  crypto.getRandomValues(userId);
  try {
    await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'Arxon', id: window.location.hostname },
        user: { id: userId, name: 'arxon-user', displayName: 'Arxon User' },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60_000,
      },
    } as CredentialCreationOptions);
  } catch (e) {
    throw bioError(e, 'Could not enable fingerprint or Face ID.');
  }
  sessionStore.setBiometrics(true);
  return true;
}

export async function disableBiometrics() {
  sessionStore.setBiometrics(false);
  await clearBiometricSecret();
}

export async function verifyBiometrics(): Promise<{ ok: boolean; password: string | null }> {
  if (!sessionStore.biometrics()) return { ok: false, password: null };
  if (nativePlatform()) {
    try {
      await promptOnPhone('Arxon', 'Confirm it’s you');
    } catch (e) {
      throw bioError(e, 'Could not unlock with fingerprint or Face ID.');
    }
    const stored = await loadBiometricSecret();
    return { ok: true, password: stored || currentPassword() };
  }
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  const cred = await navigator.credentials.get({
    publicKey: {
      challenge,
      timeout: 60_000,
      userVerification: 'required',
      rpId: window.location.hostname,
    },
  } as CredentialRequestOptions);
  if (!cred) return { ok: false, password: null };
  return { ok: true, password: currentPassword() };
}
