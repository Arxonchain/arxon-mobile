import { decodeFunctionData, formatEther, type Hex, type Transaction } from 'viem';

import { pushActivity } from './activity';
import { PRECOMPILE, publicClient } from './chain';
import { TITLE_RECEIVED, creditedToYourVaultCopy, notifyTx } from './txNotify';
import { decryptNote, toHex } from './noteCipher';
import { adoptIncomingNotes, hydrateLeaves } from './notes';
import { storage } from './storage';
import { SUBMIT_ABI } from './submit801';

const UNIT = BigInt(1_000_000_000);
const LOOKBACK = 1024n;
const BATCH = 12n;

type OutputWire = {
  cm: Hex;
  cv: Hex;
  encryptedNote: Hex;
};

function asOutput(row: unknown): OutputWire | null {
  if (!row || typeof row !== 'object') return null;
  const named = row as { cm?: Hex; cv?: Hex; encryptedNote?: Hex };
  const arr = Array.isArray(row) ? row : null;
  const cm = named.cm ?? (arr?.[0] as Hex | undefined);
  const cv = named.cv ?? (arr?.[1] as Hex | undefined);
  const encryptedNote = named.encryptedNote ?? (arr?.[4] as Hex | undefined);
  if (!cm || !cv || !encryptedNote) return null;
  return { cm, cv, encryptedNote };
}

function outputsFromInput(input: Hex | undefined): OutputWire[] {
  if (!input || input === '0x') return [];
  try {
    const decoded = decodeFunctionData({ abi: SUBMIT_ABI, data: input }) as {
      functionName: string;
      args: readonly unknown[];
    };
    let rows: unknown[] = [];
    if (decoded.functionName === 'shield') rows = (decoded.args[0] as unknown[]) ?? [];
    else if (decoded.functionName === 'submitPrivateTransfer') rows = (decoded.args[2] as unknown[]) ?? [];
    else if (decoded.functionName === 'unshield') rows = (decoded.args[4] as unknown[]) ?? [];
    return rows.map(asOutput).filter((row): row is OutputWire => row != null);
  } catch {
    /* not 0x801 */
  }
  return [];
}

function txInput(tx: Transaction): Hex | undefined {
  if (!tx || typeof tx !== 'object') return undefined;
  return (tx as Transaction & { input?: Hex }).input;
}

async function collectSubmitTxs(
  rpcUrl: string,
  fromBlock: bigint,
  toBlock: bigint
): Promise<{ hash: Hex; outputs: OutputWire[] }[]> {
  const client = publicClient(rpcUrl);
  const submit = PRECOMPILE.submit.toLowerCase();
  const found: { hash: Hex; outputs: OutputWire[] }[] = [];
  for (let start = fromBlock; start <= toBlock; start += BATCH) {
    const nums: bigint[] = [];
    const last = start + BATCH - 1n > toBlock ? toBlock : start + BATCH - 1n;
    for (let n = start; n <= last; n++) nums.push(n);
    const blocks = await Promise.all(
      nums.map(async (n) => {
        try {
          return await client.getBlock({ blockNumber: n, includeTransactions: true });
        } catch {
          return null;
        }
      })
    );
    for (const block of blocks) {
      if (!block) continue;
      for (const tx of block.transactions) {
        if (!tx || typeof tx === 'string') continue;
        if (typeof tx.to !== 'string' || tx.to.toLowerCase() !== submit) continue;
        const outputs = outputsFromInput(txInput(tx));
        if (outputs.length) found.push({ hash: tx.hash, outputs });
      }
    }
  }
  return found;
}

let scanTail: Promise<number> = Promise.resolve(0);

/** Trial-decrypt 0x801 outputs as this wallet's shielded key and store matching notes. */
export async function scanIncomingNotes(
  rpcUrl: string,
  ourPk: string | null,
  onProgress?: (msg: string) => void
): Promise<number> {
  const run = scanTail.then(() => scanIncomingNotesInner(rpcUrl, ourPk, onProgress));
  scanTail = run.then(
    () => 0,
    () => 0
  );
  return run;
}

async function scanIncomingNotesInner(
  rpcUrl: string,
  ourPk: string | null,
  onProgress?: (msg: string) => void
): Promise<number> {
  if (!ourPk) return 0;
  await hydrateLeaves(rpcUrl);
  const client = publicClient(rpcUrl);
  const latest = await client.getBlockNumber();
  const saved = await storage.getLeafScanAt();
  const to = latest;
  const minFrom = to >= LOOKBACK ? to - LOOKBACK + 1n : 0n;
  let from = saved && /^\d+$/.test(saved) ? BigInt(saved) + 1n : minFrom;
  if (from < minFrom) from = minFrom;
  if (from > to) {
    await storage.setLeafScanAt(to.toString());
    return 0;
  }
  onProgress?.('Scanning incoming notes…');
  const txs = await collectSubmitTxs(rpcUrl, from, to);
  const incoming: { cm: Hex; cv: Hex; rho: Hex; amountWei: string; pk: Hex; hash: Hex }[] = [];
  for (const tx of txs) {
    for (const out of tx.outputs) {
      const opened = decryptNote(out.encryptedNote, ourPk);
      if (!opened) continue;
      incoming.push({
        cm: out.cm,
        cv: out.cv,
        rho: toHex(opened.rho),
        amountWei: (opened.amount * UNIT).toString(),
        pk: toHex(opened.pk),
        hash: tx.hash,
      });
    }
  }
  const added = await adoptIncomingNotes(incoming, ourPk);
  const addedCms = new Set(added.map((n) => n.cm.toLowerCase()));
  const seen = new Set<string>();
  for (const note of incoming) {
    if (!addedCms.has(note.cm.toLowerCase()) || seen.has(note.hash.toLowerCase())) continue;
    seen.add(note.hash.toLowerCase());
    const amount = formatEther(BigInt(note.amountWei));
    await pushActivity({
      hash: note.hash,
      kind: 'receive',
      to: ourPk,
      amount,
      maskBits: 0,
      at: Date.now(),
      token: 'tARX',
      network: 'arxon',
    });
    notifyTx(TITLE_RECEIVED, creditedToYourVaultCopy(amount), `tx-recv-${note.hash}`);
  }
  await storage.setLeafScanAt(to.toString());
  return added.length;
}
