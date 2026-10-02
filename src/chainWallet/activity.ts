import type { Address, Hex } from 'viem';

import { chainStorage } from './storage';

export type ActivityKind = 'transfer' | 'onchain';

export type ActivityItem = {
  hash: Hex;
  kind: ActivityKind;
  to: string;
  amount: string;
  at: number;
};

const MAX = 50;

export async function loadActivity(): Promise<ActivityItem[]> {
  const raw = await chainStorage.getActivity();
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
  await chainStorage.setActivity(JSON.stringify(next));
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
      at: Date.now(),
    }));
  const next = [...extra, ...prev].slice(0, MAX);
  await chainStorage.setActivity(JSON.stringify(next));
  return next;
}
