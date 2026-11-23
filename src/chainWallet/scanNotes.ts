import { decodeFunctionData, formatEther, type Hex } from 'viem';

import { pushActivity } from './activity';
import { PRECOMPILE, fetchEncryptedNotes, publicClient } from './chain';
import { debugWalletLog } from './debugWalletIngest';
import { TITLE_RECEIVED, creditedToYourVaultCopy, notifyTx } from './txNotify';
import { decryptNote, NOTE_CIPHER_LEN, toHex } from './noteCipher';
import { adoptIncomingNotes, hydrateLeaves, loadNotes } from './notes';
import { storage } from './storage';
import { SUBMIT_ABI } from './submit801';

const UNIT = BigInt(1_000_000_000);
const HEADER_BATCH = 150;
const HEADER_PARALLEL = 16;
const TX_BATCH = 20;
const TX_PARALLEL = 8;

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

type RpcTx = { hash?: string; to?: string; input?: string };
type RpcBlock = { number?: string; gasUsed?: string; transactions?: RpcTx[] | string[] };

async function rpcBlocks(rpcUrl: string, nums: bigint[], withTxs: boolean): Promise<RpcBlock[]> {
  if (!nums.length) return [];
  const body = nums.map((n, i) => ({
    jsonrpc: '2.0' as const,
    id: i,
    method: 'eth_getBlockByNumber',
    params: [`0x${n.toString(16)}`, withTxs],
  }));
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { id?: number; result?: RpcBlock }[] | { error?: unknown };
  if (!Array.isArray(json)) return [];
  const byId = new Map(json.map((row) => [row.id, row.result]));
  return nums.map((_, i) => byId.get(i)).filter((block): block is RpcBlock => !!block);
}

function chunkRanges(fromBlock: bigint, toBlock: bigint, size: number) {
  const ranges: { start: bigint; last: bigint }[] = [];
  const span = BigInt(size);
  for (let start = fromBlock; start <= toBlock; start += span) {
    const last = start + span - 1n > toBlock ? toBlock : start + span - 1n;
    ranges.push({ start, last });
  }
  return ranges;
}

function numsIn(range: { start: bigint; last: bigint }) {
  const nums: bigint[] = [];
  for (let n = range.start; n <= range.last; n++) nums.push(n);
  return nums;
}

async function collectSubmitTxs(
  rpcUrl: string,
  fromBlock: bigint,
  toBlock: bigint,
  onProgress?: (msg: string) => void
): Promise<{ txs: { hash: Hex; outputs: OutputWire[] }[]; busyBlocks: number }> {
  const submit = PRECOMPILE.submit.toLowerCase();
  const found: { hash: Hex; outputs: OutputWire[] }[] = [];
  const busy: bigint[] = [];
  const headerRanges = chunkRanges(fromBlock, toBlock, HEADER_BATCH);
  for (let i = 0; i < headerRanges.length; i += HEADER_PARALLEL) {
    const slice = headerRanges.slice(i, i + HEADER_PARALLEL);
    onProgress?.(`Restoring vault notes… ${slice[0].start.toString()}`);
    const batches = await Promise.all(slice.map((range) => rpcBlocks(rpcUrl, numsIn(range), false)));
    for (const blocks of batches) {
      for (const block of blocks) {
        if (!block.gasUsed || block.gasUsed === '0x0' || block.gasUsed === '0x') continue;
        const num = block.number ? BigInt(block.number) : null;
        if (num != null) busy.push(num);
      }
    }
  }
  for (let i = 0; i < busy.length; i += TX_BATCH * TX_PARALLEL) {
    const wave = busy.slice(i, i + TX_BATCH * TX_PARALLEL);
    const groups: bigint[][] = [];
    for (let j = 0; j < wave.length; j += TX_BATCH) groups.push(wave.slice(j, j + TX_BATCH));
    const batches = await Promise.all(groups.map((group) => rpcBlocks(rpcUrl, group, true)));
    for (const blocks of batches) {
      for (const block of blocks) {
        for (const tx of block.transactions ?? []) {
          if (!tx || typeof tx === 'string') continue;
          if (typeof tx.to !== 'string' || tx.to.toLowerCase() !== submit) continue;
          const outputs = outputsFromInput(tx.input as Hex | undefined);
          if (outputs.length && typeof tx.hash === 'string') {
            found.push({ hash: tx.hash as Hex, outputs });
          }
        }
      }
    }
  }
  return { txs: found, busyBlocks: busy.length };
}

async function restoreFromChainNotes(
  rpcUrl: string,
  ourPk: string,
  onProgress?: (msg: string) => void
): Promise<{ added: number; getter: 'ok' | 'missing' | 'empty' | 'snapshot' }> {
  onProgress?.('Restoring vault notes from chain…');
  let rows = await fetchEncryptedNotes(rpcUrl);
  let getter: 'ok' | 'missing' | 'empty' | 'snapshot' = rows == null ? 'missing' : rows.length ? 'ok' : 'empty';
  if (!rows?.length) {
    try {
      const res = await fetch('/vault-chain-notes.json', { cache: 'no-store' });
      if (res.ok) {
        const parsed = (await res.json()) as {
          notes?: { cm?: Hex; cv?: Hex; encryptedNote?: Hex; index?: number; input?: Hex }[];
        };
        if (Array.isArray(parsed.notes) && parsed.notes.length) {
          const decoded: NonNullable<typeof rows> = [];
          for (const n of parsed.notes) {
            if (n.cm && n.cv && n.encryptedNote) {
              decoded.push({ index: n.index ?? decoded.length, cm: n.cm, cv: n.cv, encryptedNote: n.encryptedNote });
              continue;
            }
            if (n.input) {
              for (const out of outputsFromInput(n.input)) {
                decoded.push({ index: decoded.length, ...out });
              }
            }
          }
          if (decoded.length) {
            rows = decoded;
            getter = 'snapshot';
          }
        }
      }
    } catch {
      /* snapshot is optional until the live runtime stores ciphertexts */
    }
  }
  if (!rows?.length) {
    return { added: 0, getter };
  }
  const incoming: { cm: Hex; cv: Hex; rho: Hex; amountWei: string; pk: Hex; hash: Hex }[] = [];
  for (const row of rows) {
    const opened = decryptNote(row.encryptedNote, ourPk);
    if (!opened) continue;
    incoming.push({
      cm: row.cm,
      cv: row.cv,
      rho: toHex(opened.rho),
      amountWei: (opened.amount * UNIT).toString(),
      pk: toHex(opened.pk),
      hash: `0x${row.index.toString(16).padStart(64, '0')}` as Hex,
    });
  }
  const added = await adoptIncomingNotes(incoming, ourPk);
  // #region agent log
  debugWalletLog('G', 'scanNotes.ts:restoreFromChainNotes', 'seed restore from chain ciphertexts', {
    getter,
    chainRowCount: rows.length,
    fullCipherCount: rows.filter((row) => {
      const hex = row.encryptedNote.replace(/^0x/i, '');
      return hex.length / 2 === NOTE_CIPHER_LEN;
    }).length,
    decryptHits: incoming.length,
    added: added.length,
  }, 'post-fix');
  // #endregion
  return { added: added.length, getter };
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
  const localNotesBefore = (await loadNotes()).length;
  const client = publicClient(rpcUrl);
  const latest = await client.getBlockNumber();
  const saved = await storage.getLeafScanAt();
  const to = latest;
  let from = 0n;
  if (localNotesBefore > 0 && saved && /^\d+$/.test(saved)) from = BigInt(saved) + 1n;
  // #region agent log
  debugWalletLog('G', 'scanNotes.ts:scanIncomingNotesInner', 'vault scan start', {
    from: from.toString(),
    to: to.toString(),
    lookback: 'none',
    fullHistory: localNotesBefore === 0,
    localNotesBefore,
    pkLen: ourPk.length,
  }, 'post-fix');
  // #endregion
  if (from > to) {
    await storage.setLeafScanAt(to.toString());
    return 0;
  }
  await hydrateLeaves(rpcUrl);
  const gap = to - from;
  const chainRestore = await restoreFromChainNotes(rpcUrl, ourPk, onProgress);
  // #region agent log
  debugWalletLog('G', 'scanNotes.ts:scanIncomingNotesInner', 'vault chain ciphertext restore', {
    getter: chainRestore.getter,
    added: chainRestore.added,
    localNotesBefore,
    from: from.toString(),
    to: to.toString(),
    gap: gap.toString(),
  }, 'post-fix');
  // #endregion
  if (chainRestore.added > 0) {
    await storage.setLeafScanAt(to.toString());
    return chainRestore.added;
  }
  if (localNotesBefore === 0 && from === 0n && gap > 10_000n) {
    // Do not walk hundreds of thousands of empty blocks on the phone, and do
    // not move the cursor to tip — that would hide older notes forever.
    // #region agent log
    debugWalletLog('G', 'scanNotes.ts:scanIncomingNotesInner', 'vault note scan window', {
      from: from.toString(),
      to: to.toString(),
      lookback: 'none',
      fullHistory: true,
      skippedGenesis: true,
      skippedCursorMoved: false,
      getter: chainRestore.getter,
      savedCursorPresent: !!(saved && /^\d+$/.test(saved)),
      submitTxCount: 0,
      busyBlocks: 0,
      decryptHits: 0,
      added: 0,
      localNotesBefore,
      pkLen: ourPk.length,
    }, 'post-fix');
    // #endregion
    return 0;
  }
  onProgress?.('Restoring vault notes from chain…');
  const collected = await collectSubmitTxs(rpcUrl, from, to, onProgress);
  const txs = collected.txs;
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
  // #region agent log
  debugWalletLog('G', 'scanNotes.ts:scanIncomingNotesInner', 'vault note scan window', {
    runId: 'post-fix',
    from: from.toString(),
    to: to.toString(),
    lookback: 'none',
    fullHistory: localNotesBefore === 0,
    savedCursorPresent: !!(saved && /^\d+$/.test(saved)),
    submitTxCount: txs.length,
    busyBlocks: collected.busyBlocks,
    decryptHits: incoming.length,
    added: added.length,
    localNotesBefore,
    pkLen: ourPk.length,
  }, 'post-fix');
  // #endregion
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
