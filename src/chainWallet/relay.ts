import type { Hex } from 'viem';

import { DEFAULT_RPC } from './chain';

/** Live primary relayer. Pays gas for relayed 0x801 spends. */
export const RELAYER_PAYER = '0xf55260F227cb6A1b5a4CafB4DD365A0531B41fa7' as const;
/** Live backup relayer (`/relay-b`). Same job, different EOA so downtime never leaks tx.from. */
export const RELAYER_PAYER_B = '0x94893661395d055289E16b3784CB67b2ec267317' as const;

const RELAYER_PAYERS = [RELAYER_PAYER, RELAYER_PAYER_B] as const;

export function isRelayerPayer(addr: string): boolean {
  const a = addr.trim().toLowerCase();
  return RELAYER_PAYERS.some((p) => p.toLowerCase() === a);
}

const RELAY_DOWN =
  'Relayer is down. Try again in a minute. Your address was not used for gas.';

function rpcBase(rpcUrl: string): string {
  return (rpcUrl.trim() || DEFAULT_RPC).replace(/\/$/, '');
}

function extraRelayUrl(): string | null {
  const raw = (import.meta.env.VITE_ARXON_RELAY_B as string | undefined)?.trim();
  return raw || null;
}

export function relayUrls(rpcUrl: string): string[] {
  const base = rpcBase(rpcUrl);
  const urls: string[] = [];
  try {
    const host = new URL(base).hostname.toLowerCase();
    if (host === 'rpc-test.arxonchain.xyz' || host === 'localhost' || host === '127.0.0.1') {
      urls.push(`${base}/relay`);
    }
    if (host === 'rpc-test.arxonchain.xyz') {
      urls.push(`${base}/relay-b`);
    }
  } catch {
    return extraRelayUrl() ? [extraRelayUrl() as string] : [];
  }
  const extra = extraRelayUrl();
  if (extra) urls.push(extra.replace(/\/$/, ''));
  return [...new Set(urls)];
}

/** True when this RPC has at least one Arxon relayer URL. */
export function relayUrl(rpcUrl: string): string | null {
  return relayUrls(rpcUrl)[0] ?? null;
}

async function postRelay(url: string, data: Hex): Promise<Hex> {
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function submitRelayed(rpcUrl: string, data: Hex): Promise<Hex> {
  const urls = relayUrls(rpcUrl);
  if (!urls.length) throw new Error(RELAY_DOWN);
  let last = RELAY_DOWN;
  for (const url of urls) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await postRelay(url, data);
      } catch (e) {
        last = e instanceof Error ? e.message : RELAY_DOWN;
        await sleep(300);
      }
    }
  }
  throw new Error(last || RELAY_DOWN);
}
