import type { Address, Hex } from 'viem';

import { publicClient } from './chain';

export async function scanRecentFrom(
  rpcUrl: string,
  from: Address,
  blocks = 256
): Promise<Hex[]> {
  const client = publicClient(rpcUrl);
  const latest = await client.getBlockNumber();
  const hashes: Hex[] = [];
  const want = from.toLowerCase();
  const batch = 8n;
  const look = BigInt(blocks);
  for (let done = 0n; done < look; done += batch) {
    const nums: bigint[] = [];
    for (let j = 0n; j < batch; j++) {
      const n = latest - done - j;
      if (n < 0n) break;
      nums.push(n);
    }
    const blks = await Promise.all(
      nums.map(async (n) => {
        try {
          return await client.getBlock({ blockNumber: n, includeTransactions: true });
        } catch {
          return null;
        }
      })
    );
    for (const block of blks) {
      if (!block) continue;
      for (const tx of block.transactions) {
        if (typeof tx === 'string') continue;
        if (typeof tx !== 'object' || !tx.from) continue;
        const sent = tx.from.toLowerCase() === want;
        const got = typeof tx.to === 'string' && tx.to.toLowerCase() === want;
        if (sent || got) hashes.push(tx.hash);
      }
    }
  }
  return [...new Set(hashes)];
}
