import type { Hex } from 'viem';

import { DEFAULT_RPC } from './chain';

/** Live relayer. Pays gas for relayed 0x801 spends. */
export const RELAYER_PAYER = '0xf55260F227cb6A1b5a4CafB4DD365A0531B41fa7' as const;

export function relayUrl(rpcUrl: string): string | null {
  const base = (rpcUrl.trim() || DEFAULT_RPC).replace(/\/$/, '');
  try {
    const host = new URL(base).hostname.toLowerCase();
    if (host === 'rpc-test.arxon.io') return `${base}/relay`;
  } catch {
    return null;
  }
  return null;
}

export async function submitRelayed(rpcUrl: string, data: Hex): Promise<Hex> {
  const url = relayUrl(rpcUrl);
  if (!url) {
    throw new Error('No relayer on this RPC. Private pay / Unshield gas would be your EVM from.');
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  let json: { hash?: string; error?: string } = {};
  try {
    json = (await res.json()) as { hash?: string; error?: string };
  } catch {
    throw new Error(`Relayer HTTP ${res.status}`);
  }
  if (!res.ok || !json.hash?.startsWith('0x')) {
    throw new Error(json.error || `Relayer HTTP ${res.status}`);
  }
  return json.hash as Hex;
}
