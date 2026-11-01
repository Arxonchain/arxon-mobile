import type { Address, Hex } from 'viem';

import type { TxClocks } from './clocks';
import { inspectTx } from './inspect';
import { storage } from './storage';

export type ActivityKind = 'shield' | 'transfer' | 'private' | 'unshield' | 'onchain' | 'receive';

export type ActivityItem = {
  hash: string;
  kind: ActivityKind;
  to: string;
  amount: string;
  maskBits: number;
  at: number;
  token?: string;
  network?: 'arxon' | 'ethereum' | 'bitcoin' | 'solana';
  clocks?: TxClocks;
};

const MAX = 50;

export function activityLabel(kind: ActivityKind) {
  if (kind === 'shield') return 'Shield';
  if (kind === 'private') return 'Private';
  if (kind === 'unshield') return 'Unshield';
  if (kind === 'transfer') return 'Sent';
  if (kind === 'receive') return 'Received';
  return 'On-chain';
}

export async function loadActivity(): Promise<ActivityItem[]> {
  const raw = await storage.getActivity();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ActivityItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function pushActivity(item: ActivityItem): Promise<void> {
  const prev = await loadActivity();
  const next = [item, ...prev.filter((row) => row.hash.toLowerCase() !== item.hash.toLowerCase())].slice(
    0,
    MAX
  );
  await storage.setActivity(JSON.stringify(next));
}

export async function saveClocks(hash: Hex, clocks: TxClocks): Promise<void> {
  const prev = await loadActivity();
  const next = prev.map((row) =>
    row.hash.toLowerCase() === hash.toLowerCase() ? { ...row, clocks } : row
  );
  await storage.setActivity(JSON.stringify(next));
}

export async function mergeHashes(hashes: Hex[], from: Address): Promise<ActivityItem[]> {
  const prev = await loadActivity();
  const have = new Set(prev.map((row) => row.hash.toLowerCase()));
  const extra: ActivityItem[] = hashes
    .filter((h) => !have.has(h.toLowerCase()))
    .map((hash) => ({
      hash,
      kind: 'onchain',
      to: from,
      amount: '',
      maskBits: 0,
      at: Date.now(),
      network: 'arxon',
    }));
  const next = [...extra, ...prev].slice(0, MAX);
  await storage.setActivity(JSON.stringify(next));
  return next;
}

/** Scan result with amount and Received vs Sent when the tx can be decoded. */
export async function mergeIncoming(rpcUrl: string, hashes: Hex[], address: Address): Promise<ActivityItem[]> {
  const prev = await loadActivity();
  const have = new Set(prev.map((row) => row.hash.toLowerCase()));
  const extra: ActivityItem[] = [];
  const want = address.toLowerCase();
  for (const hash of hashes) {
    if (have.has(hash.toLowerCase())) continue;
    try {
      const tx = await inspectTx(rpcUrl, hash);
      const toUs = (tx.to ?? '').toLowerCase() === want;
      const fromUs = tx.from.toLowerCase() === want;
      const kind: ActivityKind =
        toUs && !fromUs && (tx.kind === 'transfer' || tx.kind === 'unshield')
          ? 'receive'
          : tx.kind === 'other'
            ? 'onchain'
            : tx.kind;
      extra.push({
        hash,
        kind,
        to: tx.to ?? address,
        amount: tx.valueArx && tx.valueArx !== '0' ? tx.valueArx : '',
        maskBits: 0,
        at: Date.now(),
        token: 'tARX',
        network: 'arxon',
      });
    } catch {
      extra.push({
        hash,
        kind: 'onchain',
        to: address,
        amount: '',
        maskBits: 0,
        at: Date.now(),
        network: 'arxon',
      });
    }
  }
  const next = [...extra, ...prev].slice(0, MAX);
  await storage.setActivity(JSON.stringify(next));
  return next;
}
