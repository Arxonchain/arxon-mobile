import { formatEther, type Hex } from 'viem';

import { fetchNoteLeaves } from './chain';
import { storage } from './storage';

export type StoredNote = {
  cm: Hex;
  cv: Hex;
  rho: Hex;
  amountWei: string;
  pk: Hex;
  leafIndex: number;
  spent: boolean;
};

async function loadJson<T>(read: () => Promise<string | null>, fallback: T): Promise<T> {
  const raw = await read();
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function loadNotes(): Promise<StoredNote[]> {
  return loadJson(storage.getNotes, []);
}

export async function loadLeaves(): Promise<Hex[]> {
  return loadJson(storage.getLeaves, []);
}

export async function saveNotes(notes: StoredNote[]): Promise<void> {
  await storage.setNotes(JSON.stringify(notes));
}

export async function saveLeaves(leaves: Hex[]): Promise<void> {
  await storage.setLeaves(JSON.stringify(leaves));
}

async function applyLeaves(leaves: Hex[]): Promise<void> {
  if (!leaves.length) return;
  await saveLeaves(leaves);
  const notes = await loadNotes();
  await saveNotes(
    notes.map((n) => {
      const idx = leaves.findIndex((l) => l.toLowerCase() === n.cm.toLowerCase());
      return idx >= 0 ? { ...n, leafIndex: idx } : n;
    })
  );
}

/** Rebuild the note tree from 0x800 (insertion order), then fix leafIndex. */
export async function hydrateLeaves(
  rpcUrl: string,
  onProgress?: (msg: string) => void
): Promise<void> {
  onProgress?.('Reading note tree…');
  const chain = await fetchNoteLeaves(rpcUrl);
  if (chain && chain.length > 0) {
    await applyLeaves(chain);
  }
}

/** Append every output cm (tree order). Keep secrets only for notes we own. */
export async function commitOutputs(
  outputs: { cm: Hex; cv: Hex; rho: Hex; amountWei: string; pk: Hex }[],
  ourPk: string | null
): Promise<void> {
  const leaves = await loadLeaves();
  const notes = await loadNotes();
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
  await saveLeaves(leaves);
  await saveNotes(notes);
}

export async function markSpent(cm: Hex): Promise<void> {
  const notes = await loadNotes();
  await saveNotes(
    notes.map((n) => (n.cm.toLowerCase() === cm.toLowerCase() ? { ...n, spent: true } : n))
  );
}

/** Notes whose commitment is actually in this chain's tree (drops Alice-chain leftovers). */
export function notesOnChain(notes: StoredNote[], leaves: Hex[]): StoredNote[] {
  const set = new Set(leaves.map((l) => l.toLowerCase()));
  return notes.filter((n) => set.has(n.cm.toLowerCase()));
}

export async function loadLiveNotes(rpcUrl: string): Promise<{ leaves: Hex[]; notes: StoredNote[] }> {
  await hydrateLeaves(rpcUrl);
  const chain = await fetchNoteLeaves(rpcUrl);
  if (!chain) {
    throw new Error('Could not read note-tree leaves from 0x800. Check RPC.');
  }
  if (!chain.length) {
    throw new Error(
      'No notes on this chain yet. Shield in first. Notes from the old Alice node cannot be spent here.'
    );
  }
  return { leaves: chain, notes: notesOnChain(await loadNotes(), chain) };
}

export function pickNote(notes: StoredNote[], amountWei: bigint): StoredNote {
  const fit = notes
    .filter((n) => !n.spent && BigInt(n.amountWei) >= amountWei)
    .sort((a, b) => (BigInt(a.amountWei) < BigInt(b.amountWei) ? -1 : 1));
  if (!fit[0]) {
    const shielded = notes.filter((n) => !n.spent);
    const total = shielded.reduce((s, n) => s + BigInt(n.amountWei), 0n);
    throw new Error(
      shielded.length
        ? `No one note covers ${formatEther(amountWei)} ARX (shielded ${formatEther(total)} ARX).`
        : 'No spendable notes on this device. Shield in a new amount (the 0.1 already in the pool cannot be spent without saved secrets).'
    );
  }
  return fit[0];
}

export function shieldedTotal(notes: StoredNote[]): bigint {
  return notes.filter((n) => !n.spent).reduce((s, n) => s + BigInt(n.amountWei), 0n);
}
