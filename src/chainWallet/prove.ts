import { Capacitor } from '@capacitor/core';

export const PROVE_URL = 'http://127.0.0.1:17871';
const WASM_JS_REMOTE = 'https://rpc-test.arxon.io/prove/arxon_prove.js';
const WASM_BIN_REMOTE = 'https://rpc-test.arxon.io/prove/arxon_prove_bg.wasm';

function localProve(name: string) {
  const base = (import.meta.env.BASE_URL || './').replace(/\/?$/, '/');
  return `${base}prove/${name}`;
}

export type ShieldProof = {
  sk_hex: string;
  pk_hex: string;
  amount_wei: string;
  mask_bits: number;
  expiry_block: number;
  outputs: OutputWire[];
  proofs: ProofsWire;
  note: NoteSecrets;
};

export type SpendProof = {
  anchor: `0x${string}`;
  mask_bits: number;
  expiry_block: number;
  amount_wei: string;
  inputs: {
    nullifier: `0x${string}`;
    cv: `0x${string}`;
    revealed_sender: `0x${string}`;
  }[];
  outputs: OutputWire[];
  proofs: ProofsWire;
  notes: NoteSecrets[];
};

export type NoteSecrets = {
  cm: `0x${string}`;
  cv: `0x${string}`;
  rho: `0x${string}`;
  amount_wei: string;
  pk_hex: `0x${string}`;
};

export type OutputWire = {
  cm: `0x${string}`;
  cv: `0x${string}`;
  revealed_receiver: `0x${string}`;
  revealed_amount: `0x${string}`;
  encrypted_note: `0x${string}`;
};

export type ProofsWire = {
  spend: `0x${string}`;
  output: `0x${string}`;
  balance: `0x${string}`;
  receipt: `0x${string}`;
  compliance: `0x${string}`;
};

type WasmFn = (json: string) => string;

type WasmBindgen = ((url: string) => Promise<unknown>) & {
  warm: () => void;
  keys: WasmFn;
  shield: WasmFn;
  transfer: WasmFn;
  unshield: WasmFn;
};

let wasm: WasmBindgen | null = null;
let wasmLoad: Promise<WasmBindgen | null> | null = null;

function onWeb(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function windowBindgen(): WasmBindgen | undefined {
  return (window as unknown as { wasm_bindgen?: WasmBindgen }).wasm_bindgen;
}

async function probeJs(url: string): Promise<boolean> {
  try {
    const probe = await fetch(url, { method: 'GET' });
    return probe.ok;
  } catch {
    return false;
  }
}

async function loadWasm(): Promise<WasmBindgen | null> {
  if (wasm) return wasm;
  if (!onWeb()) {
    return null;
  }
  if (!wasmLoad) {
    wasmLoad = (async () => {
      try {
        const localJs = localProve('arxon_prove.js');
        const localBin = localProve('arxon_prove_bg.wasm');
        const local = await probeJs(localJs);
        const remote = !local && (await probeJs(WASM_JS_REMOTE));
        if (!remote && !local) {
          throw new Error('prover JS missing');
        }
        const js = local ? localJs : WASM_JS_REMOTE;
        const bin = local ? localBin : WASM_BIN_REMOTE;
        const existing = document.querySelector(`script[data-arxon-prove="1"]`);
        if (!existing && !windowBindgen()) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement('script');
            s.src = js;
            s.dataset.arxonProve = '1';
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('wasm script'));
            document.head.appendChild(s);
          });
        }
        const bind = windowBindgen();
        if (!bind) {
          throw new Error('wasm_bindgen missing after script load');
        }
        await bind(bin);
        wasm = bind;
        return bind;
      } catch (e) {
        wasmLoad = null;
        throw e;
      }
    })();
  }
  return wasmLoad;
}

async function postHttp<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 180_000);
  try {
    res = await fetch(`${PROVE_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message.toLowerCase() : '';
    if (msg.includes('abort')) {
      throw new Error('Prover timed out.');
    }
    throw new Error(
      'No in-app Halo2 prover. Wait for the first wasm load, or keep arxon-prove on 127.0.0.1:17871.'
    );
  } finally {
    clearTimeout(timer);
  }
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(json.error || `prover HTTP ${res.status}`);
  }
  return json;
}

async function call<T>(
  method: 'keys' | 'shield' | 'transfer' | 'unshield',
  body: unknown
): Promise<T> {
  if (onWeb()) {
    try {
      const api = await loadWasm();
      if (api) {
        if (method !== 'keys') {
          api.warm();
        }
        return JSON.parse(api[method](JSON.stringify(body))) as T;
      }
    } catch {
      /* sidecar HTTP below */
    }
  }
  if (Capacitor.isNativePlatform()) {
    throw new Error('In-app prover is not ready yet. Open Send again in a moment.');
  }
  return postHttp(`/v1/${method}`, body);
}

export function proveKeys(skHex?: string | null) {
  return call<{ sk_hex: string; pk_hex: string }>('keys', { sk_hex: skHex ?? null });
}

export function proveShield(input: {
  amountWei: bigint;
  maskBits: number;
  expiryBlock: number;
  skHex?: string | null;
  token?: string | null;
}): Promise<ShieldProof> {
  return call('shield', {
    amount_wei: input.amountWei.toString(),
    mask_bits: input.maskBits,
    expiry_block: input.expiryBlock,
    sk_hex: input.skHex ?? null,
    token: input.token ?? null,
  });
}

export function proveTransfer(input: {
  amountWei: bigint;
  maskBits: number;
  expiryBlock: number;
  skHex: string;
  recipientPk: string;
  note: { amountWei: string; rho: string; leafIndex: number };
  leaves: string[];
  token?: string | null;
}): Promise<SpendProof> {
  return call('transfer', {
    amount_wei: input.amountWei.toString(),
    mask_bits: input.maskBits,
    expiry_block: input.expiryBlock,
    sk_hex: input.skHex,
    recipient_pk: input.recipientPk,
    note: {
      amount_wei: input.note.amountWei,
      rho: input.note.rho,
      leaf_index: input.note.leafIndex,
    },
    leaves: input.leaves,
    token: input.token ?? null,
  });
}

export function proveUnshield(input: {
  amountWei: bigint;
  maskBits: number;
  expiryBlock: number;
  skHex: string;
  recipient: string;
  note: { amountWei: string; rho: string; leafIndex: number };
  leaves: string[];
  token?: string | null;
}): Promise<SpendProof> {
  return call('unshield', {
    amount_wei: input.amountWei.toString(),
    mask_bits: input.maskBits,
    expiry_block: input.expiryBlock,
    sk_hex: input.skHex,
    recipient: input.recipient,
    note: {
      amount_wei: input.note.amountWei,
      rho: input.note.rho,
      leaf_index: input.note.leafIndex,
    },
    leaves: input.leaves,
    token: input.token ?? null,
  });
}
