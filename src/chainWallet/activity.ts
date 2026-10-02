import type { Address, Hex } from 'viem';

import { storage } from './storage';

export type ActivityKind = 'shield' | 'transfer' | 'private' | 'unshield' | 'onchain';

export type ActivityItem = {
  hash: Hex;
  kind: ActivityKind;
  to: string;
  amount: string;
  maskBits: number;
  at: number;
};

const MAX = 50;

export function activityLabel(kind: ActivityKind) {
  if (kind === 'shield') return 'Shield';
  if (kind === 'private') return 'Private';
  if (kind === 'unshield') return 'Unshield';
  if (kind === 'transfer') return 'Sent';
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
    }));
  const next = [...extra, ...prev].slice(0, MAX);
  await storage.setActivity(JSON.stringify(next));
  return next;
}
