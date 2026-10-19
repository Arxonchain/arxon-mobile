import { sessionStore } from './session';

type NativeBiometric = {
  isAvailable: () => Promise<{ isAvailable: boolean }>;
  verifyIdentity: (opts: { reason: string }) => Promise<void>;
  setCredentials?: (opts: { username: string; password: string; server: string }) => Promise<void>;
  getCredentials?: (opts: { server: string }) => Promise<{ password: string }>;
};

async function nativePlugin(): Promise<NativeBiometric | null> {
  try {
    const mod = await import('@capgo/capacitor-native-biometric');
    return (mod as { NativeBiometric?: NativeBiometric }).NativeBiometric ?? null;
  } catch {
    return null;
  }
}

export async function biometricsAvailable() {
  const native = await nativePlugin();
  if (native) {
    try {
      const result = await native.isAvailable();
      return !!result.isAvailable;
    } catch {
      /* fall through */
    }
  }
  try {
    return !!(await window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable?.());
  } catch {
    return false;
  }
}

export async function enableBiometrics() {
  const native = await nativePlugin();
  if (native) {
    await native.verifyIdentity({ reason: 'Enable Face ID for Arxon' });
    sessionStore.setBiometrics(true);
    return true;
  }
  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);
  const userId = new Uint8Array(16);
  crypto.getRandomValues(userId);
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
  sessionStore.setBiometrics(true);
  return true;
}

export async function verifyBiometrics() {
  if (!sessionStore.biometrics()) return false;
  const native = await nativePlugin();
  if (native) {
    await native.verifyIdentity({ reason: 'Unlock Arxon' });
    return true;
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
  return !!cred;
}
