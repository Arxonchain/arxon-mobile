/** Password hashing and AES-GCM boxes for the on-device wallet lock. */

const ITERS = 120_000;

function bytesToB64(bytes: Uint8Array) {
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin);
}

function b64ToBytes(value: string) {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(password: string, salt: Uint8Array, usages: KeyUsage[]) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    usages,
  );
}

export type PassRecord = { salt: string; hash: string; iters: number };

export async function hashPassword(password: string): Promise<PassRecord> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt, ['encrypt']);
  const probe = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: new Uint8Array(12) },
    key,
    new TextEncoder().encode('arxon-pass'),
  );
  return { salt: bytesToB64(salt), hash: bytesToB64(new Uint8Array(probe)), iters: ITERS };
}

export async function verifyPassword(password: string, record: PassRecord): Promise<boolean> {
  try {
    const key = await deriveKey(password, b64ToBytes(record.salt), ['encrypt']);
    const probe = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: new Uint8Array(12) },
      key,
      new TextEncoder().encode('arxon-pass'),
    );
    return bytesToB64(new Uint8Array(probe)) === record.hash;
  } catch {
    return false;
  }
}

export type SecretBox = { salt: string; iv: string; data: string };

export async function sealSecret(password: string, plain: string): Promise<SecretBox> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ['encrypt']);
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain),
  );
  return { salt: bytesToB64(salt), iv: bytesToB64(iv), data: bytesToB64(new Uint8Array(data)) };
}

export async function openSecret(password: string, box: SecretBox): Promise<string> {
  const key = await deriveKey(password, b64ToBytes(box.salt), ['decrypt']);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(box.iv) },
    key,
    b64ToBytes(box.data),
  );
  return new TextDecoder().decode(plain);
}
