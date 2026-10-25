import { formatUnits, type Hex } from 'viem';

import { fetchArx20NoteLeaves } from './chain';
import { storage } from './storage';
import { hydrateLeaves, loadLeaves, loadNotes, notesOnChain, pickNote, shieldedTotal, type StoredNote } from './notes';

export type { StoredNote };

export type { StoredNote };

async function loadJson<T>(raw: string | null, fallback: T): Promise<T> {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function loadTokenNotes(token: string): Promise<StoredNote[]> {
  return loadJson(await storage.getTokenNotes(token), []);
}

export async function loadTokenLeaves(token: string): Promise<Hex[]> {
  return loadJson(await storage.getTokenLeaves(token), []);
}

export async function saveTokenNotes(token: string, notes: StoredNote[]): Promise<void> {
  await storage.setTokenNotes(token, JSON.stringify(notes));
}

export async function saveTokenLeaves(token: string, leaves: Hex[]): Promise<void> {
  await storage.setTokenLeaves(token, JSON.stringify(leaves));
}

async function applyTokenLeaves(token: string, leaves: Hex[]): Promise<void> {
  if (!leaves.length) return;
  await saveTokenLeaves(token, leaves);
  const notes = await loadTokenNotes(token);
  await saveTokenNotes(
    token,
    notes.map((n) => {
      const idx = leaves.findIndex((l) => l.toLowerCase() === n.cm.toLowerCase());
      return idx >= 0 ? { ...n, leafIndex: idx } : n;
    })
  );
}

export async function hydrateTokenLeaves(rpcUrl: string, token: Hex): Promise<void> {
  const chain = await fetchArx20NoteLeaves(rpcUrl, token);
  if (chain && chain.length > 0) {
    await applyTokenLeaves(token, chain);
  }
}

export async function commitTokenOutputs(
  token: string,
  outputs: { cm: Hex; cv: Hex; rho: Hex; amountWei: string; pk: Hex }[],
  ourPk: string | null
): Promise<void> {
  const leaves = await loadTokenLeaves(token);
  const notes = await loadTokenNotes(token);
  for (const o of outputs) {
    const existing = leaves.findIndex((l) => l.toLowerCase() === o.cm.toLowerCase());
    const leafIndex = existing >= 0 ? existing : leaves.length;
    if (existing < 0) leaves.push(o.cm);
    if (ourPk && o.pk.toLowerCase() === ourPk.toLowerCase()) {
      if (!notes.some((n) => n.cm.toLowerCase() === o.cm.toLowerCase())) {
        notes.push({ ...o, leafIndex, spent: false });
      }
    }
  }
  await saveTokenLeaves(token, leaves);
  await saveTokenNotes(token, notes);
}

export async function markTokenSpent(token: string, cm: Hex): Promise<void> {
  const notes = await loadTokenNotes(token);
  await saveTokenNotes(
    token,
    notes.map((n) => (n.cm.toLowerCase() === cm.toLowerCase() ? { ...n, spent: true } : n))
  );
}

export async function loadLiveTokenNotes(
  rpcUrl: string,
  token: Hex
): Promise<{ leaves: Hex[]; notes: StoredNote[] }> {
  await hydrateTokenLeaves(rpcUrl, token);
  const chain = await fetchArx20NoteLeaves(rpcUrl, token);
  if (!chain) {
    throw new Error('Could not read this token’s vault (0x802). The runtime may not have ARX-20 yet.');
  }
  if (!chain.length) {
    throw new Error('No vault notes for this token yet. Shield in first.');
  }
  return { leaves: chain, notes: notesOnChain(await loadTokenNotes(token), chain) };
}

export function pickTokenNote(notes: StoredNote[], amountWei: bigint, symbol: string): StoredNote {
  try {
    return pickNote(notes, amountWei);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'No note';
    throw new Error(msg.replaceAll(' tARX', ` ${symbol}`).replaceAll(' ARX', ` ${symbol}`));
  }
}

export type VaultHolding = {
  name: string;
  symbol: string;
  amount: string;
  icon: 'arx' | 'usdt' | 'usdc';
};

function holdingIcon(symbol: string): VaultHolding['icon'] {
  if (/usdt/i.test(symbol)) return 'usdt';
  if (/usdc/i.test(symbol)) return 'usdc';
  return 'arx';
}

function prettyAmount(wei: bigint, decimals: number) {
  const n = Number(formatUnits(wei, decimals));
  if (!Number.isFinite(n)) return formatUnits(wei, decimals);
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

/** Shielded totals this account can spend: native ARX notes, then each ARX-20 vault. */
export async function loadVaultHoldings(
  rpcUrl: string,
  listed: { address: Hex; name: string; symbol: string; decimals: number; standard: string }[],
): Promise<VaultHolding[]> {
  const rows: VaultHolding[] = [];
  try {
    await hydrateLeaves(rpcUrl);
  } catch {
    /* Saved notes still count when the tree read fails. */
  }
  const leaves = await loadLeaves();
  const nativeRaw = await loadNotes();
  const native = leaves.length ? notesOnChain(nativeRaw, leaves) : nativeRaw;
  const arx = shieldedTotal(native);
  if (arx > 0n) {
    rows.push({ name: 'Arxon', symbol: 'ARX', amount: prettyAmount(arx, 18), icon: 'arx' });
  }
  for (const token of listed) {
    if (token.standard !== 'arx20') continue;
    try {
      await hydrateTokenLeaves(rpcUrl, token.address);
    } catch {
      /* Keep the notes already saved for this token. */
    }
    const tokenLeaves = await loadTokenLeaves(token.address);
    const raw = await loadTokenNotes(token.address);
    const notes = tokenLeaves.length ? notesOnChain(raw, tokenLeaves) : raw;
    const total = shieldedTotal(notes);
    if (total <= 0n) continue;
    rows.push({
      name: token.name || token.symbol,
      symbol: token.symbol,
      amount: prettyAmount(total, token.decimals),
      icon: holdingIcon(token.symbol),
    });
  }
  return rows;
}

export { formatUnits, shieldedTotal };
