/** Build public/vault-chain-notes.json from live 0x801 calldata. */
import { writeFile } from 'node:fs/promises';
import { decodeFunctionData } from 'viem';

const RPC = process.env.ARXON_RPC || 'https://rpc-test.arxonchain.xyz';
const SUBMIT = '0x0000000000000000000000000000000000000801';
const HEADER = 250;
const PARALLEL = 16;
const TX_WAVE = 32;

const OUTPUT = {
  type: 'tuple[]',
  components: [
    { type: 'bytes32', name: 'cm' },
    { type: 'bytes32', name: 'cv' },
    { type: 'bytes32', name: 'revealedReceiver' },
    { type: 'bytes32', name: 'revealedAmount' },
    { type: 'bytes', name: 'encryptedNote' },
  ],
};
const INPUT = {
  type: 'tuple[]',
  components: [
    { type: 'bytes32', name: 'nullifier' },
    { type: 'bytes32', name: 'cv' },
    { type: 'bytes32', name: 'revealedSender' },
  ],
};
const PROOFS = {
  type: 'tuple',
  components: [
    { type: 'bytes', name: 'spend' },
    { type: 'bytes', name: 'output' },
    { type: 'bytes', name: 'balance' },
    { type: 'bytes', name: 'receipt' },
    { type: 'bytes', name: 'compliance' },
  ],
};
const PTR = {
  type: 'tuple',
  components: [
    { type: 'bool', name: 'present' },
    { type: 'uint8', name: 'outputIndex' },
    { type: 'bytes32', name: 'id' },
  ],
};
const ABI = [
  { name: 'shield', type: 'function', inputs: [OUTPUT, { type: 'uint8' }, { type: 'uint256' }, PROOFS] },
  {
    name: 'unshield',
    type: 'function',
    inputs: [
      { type: 'address' },
      { type: 'uint256' },
      { type: 'bytes32' },
      INPUT,
      OUTPUT,
      { type: 'uint8' },
      { type: 'uint256' },
      PROOFS,
    ],
  },
  {
    name: 'submitPrivateTransfer',
    type: 'function',
    inputs: [
      { type: 'bytes32' },
      INPUT,
      OUTPUT,
      { type: 'uint8' },
      { type: 'uint256' },
      PTR,
      { ...PTR },
      PROOFS,
    ],
  },
];

async function rpc(body) {
  const res = await fetch(RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`rpc ${res.status}`);
  return res.json();
}

async function blocks(nums, full) {
  if (!nums.length) return [];
  const json = await rpc(
    nums.map((n, i) => ({
      jsonrpc: '2.0',
      id: i,
      method: 'eth_getBlockByNumber',
      params: [`0x${n.toString(16)}`, full],
    })),
  );
  if (!Array.isArray(json)) return [];
  const byId = new Map(json.map((row) => [row.id, row.result]));
  return nums.map((_, i) => byId.get(i)).filter(Boolean);
}

function outputsFromInput(input) {
  if (!input || input === '0x') return [];
  try {
    const decoded = decodeFunctionData({ abi: ABI, data: input });
    let rows = [];
    if (decoded.functionName === 'shield') rows = decoded.args[0] ?? [];
    else if (decoded.functionName === 'submitPrivateTransfer') rows = decoded.args[2] ?? [];
    else if (decoded.functionName === 'unshield') rows = decoded.args[4] ?? [];
    return rows
      .map((row) => ({
        cm: row?.cm,
        cv: row?.cv,
        encryptedNote: row?.encryptedNote,
      }))
      .filter((row) => row.cm && row.cv && row.encryptedNote);
  } catch {
    return [];
  }
}

const latest = BigInt((await rpc({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] })).result);
const notes = [];
const busy = [];
console.log(`indexing 0..${latest} via ${RPC}`);

for (let start = 0n; start <= latest; ) {
  const ranges = [];
  for (let p = 0; p < PARALLEL && start <= latest; p++) {
    const nums = [];
    const last = start + BigInt(HEADER) - 1n > latest ? latest : start + BigInt(HEADER) - 1n;
    for (let n = start; n <= last; n++) nums.push(n);
    ranges.push(nums);
    start = last + 1n;
  }
  const batches = await Promise.all(ranges.map((nums) => blocks(nums, false)));
  for (const batch of batches) {
    for (const block of batch) {
      if (!Array.isArray(block.transactions) || block.transactions.length === 0) continue;
      busy.push(BigInt(block.number));
    }
  }
  if (Number(start % 50000n) < HEADER * PARALLEL) {
    console.log(`headers ${start}/${latest} busy=${busy.length} notes=${notes.length}`);
  }
}

console.log(`busy blocks ${busy.length}; fetching 0x801 txs`);
for (let i = 0; i < busy.length; i += TX_WAVE) {
  const slice = busy.slice(i, i + TX_WAVE);
  const blks = await blocks(slice, true);
  for (const block of blks) {
    for (const tx of block.transactions ?? []) {
      if (!tx || typeof tx === 'string') continue;
      if (typeof tx.to !== 'string' || tx.to.toLowerCase() !== SUBMIT) continue;
      const outs = outputsFromInput(tx.input);
      for (const out of outs) {
        notes.push({
          index: notes.length,
          cm: out.cm,
          cv: out.cv,
          encryptedNote: out.encryptedNote,
          hash: tx.hash,
          block: block.number,
        });
      }
    }
  }
}

const path = new URL('../public/vault-chain-notes.json', import.meta.url);
await writeFile(
  path,
  JSON.stringify({ v: 1, updatedAtBlock: latest.toString(), noteCount: notes.length, notes }, null, 2),
);
console.log(`wrote ${notes.length} encrypted notes to public/vault-chain-notes.json`);
