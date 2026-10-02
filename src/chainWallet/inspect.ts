import {
  decodeFunctionData,
  formatEther,
  type Address,
  type Hex,
} from 'viem';

import { publicClient } from './chain';
import { fromBits, type PrivacyFlags } from './privacy';
import { RELAYER_PAYER } from './relay';
import { SUBMIT_ABI } from './submit801';

const ZERO = /^0x0+$/i;

export type InspectedTx = {
  hash: Hex;
  status: 'success' | 'reverted' | 'pending';
  blockNumber: string | null;
  from: Address;
  to: Address | null;
  valueArx: string;
  kind: 'shield' | 'private' | 'unshield' | 'transfer' | 'other';
  rows: { label: string; value: string; state: 'hidden' | 'public' | 'info' }[];
};

function isZero(h: string): boolean {
  return ZERO.test(h);
}

function gasFromRow(from: Address): InspectedTx['rows'][number] {
  const relayed = from.toLowerCase() === RELAYER_PAYER.toLowerCase();
  return {
    label: 'Gas',
    value: relayed ? `${from} · relayer` : from,
    state: 'public',
  };
}

function flagRows(flags: PrivacyFlags, opts: {
  amountHidden?: boolean;
  receiverHidden?: boolean;
  senderHidden?: boolean;
  amountCalldata?: string;
  senderNote?: string;
}): InspectedTx['rows'] {
  return [
    {
      label: 'Amount',
      value: opts.amountHidden ? '0' : opts.amountCalldata ?? 'set',
      state: opts.amountHidden ? 'hidden' : 'public',
    },
    {
      label: 'Receiver',
      value: opts.receiverHidden ? '0' : 'set',
      state: opts.receiverHidden ? 'hidden' : 'public',
    },
    {
      label: 'Sender',
      value: opts.senderNote ?? (opts.senderHidden ? '0' : 'set'),
      state: opts.senderHidden ? 'hidden' : 'public',
    },
  ].filter((row) => row.value !== 'omit');
}

export async function inspectTx(rpcUrl: string, hash: Hex): Promise<InspectedTx> {
  const client = publicClient(rpcUrl);
  const tx = await client.getTransaction({ hash });
  let status: InspectedTx['status'] = 'pending';
  let blockNumber: string | null = tx.blockNumber != null ? tx.blockNumber.toString() : null;
  try {
    const receipt = await client.getTransactionReceipt({ hash });
    status = receipt.status === 'success' ? 'success' : 'reverted';
    blockNumber = receipt.blockNumber.toString();
  } catch {
    // mempool
  }

  const base: InspectedTx = {
    hash,
    status,
    blockNumber,
    from: tx.from,
    to: tx.to,
    valueArx: formatEther(tx.value),
    kind: 'other',
    rows: [],
  };

  const statusRow: InspectedTx['rows'][number] = {
    label: 'Status',
    value: status === 'success' ? 'Included' : status === 'reverted' ? 'Reverted (not applied)' : 'Pending',
    state: status === 'reverted' ? 'public' : 'info',
  };

  if (tx.to && tx.input && tx.input !== '0x') {
    try {
      const decoded = decodeFunctionData({ abi: SUBMIT_ABI, data: tx.input }) as {
        functionName: string;
        args: readonly unknown[];
      };
      if (decoded.functionName === 'shield') {
        const [outputs, maskBits] = decoded.args as [
          { cm: Hex; revealedAmount: Hex; revealedReceiver: Hex }[],
          number,
        ];
        const flags = fromBits(Number(maskBits));
        const out = outputs[0];
        return {
          ...base,
          kind: 'shield',
          rows: [
            statusRow,
            { label: 'To', value: tx.to, state: 'info' },
            { label: 'Depositor', value: tx.from, state: 'public' },
            ...flagRows(flags, {
              amountHidden: out ? isZero(out.revealedAmount) : false,
              receiverHidden: out ? isZero(out.revealedReceiver) : false,
              senderHidden: false,
              amountCalldata: `${formatEther(tx.value)} ARX`,
              senderNote: 'omit',
            }),
            { label: 'cm', value: out?.cm ?? '—', state: 'info' },
          ],
        };
      }
      if (decoded.functionName === 'submitPrivateTransfer') {
        const [anchor, inputs, outputs, maskBits] = decoded.args as [
          Hex,
          { nullifier: Hex; revealedSender: Hex }[],
          { cm: Hex; revealedAmount: Hex; revealedReceiver: Hex }[],
          number,
        ];
        const flags = fromBits(Number(maskBits));
        const out = outputs[0];
        const inp = inputs[0];
        return {
          ...base,
          kind: 'private',
          rows: [
            statusRow,
            { label: 'To', value: tx.to, state: 'info' },
            gasFromRow(tx.from),
            { label: 'Anchor', value: anchor, state: 'info' },
            ...flagRows(flags, {
              amountHidden: out ? isZero(out.revealedAmount) : false,
              receiverHidden: out ? isZero(out.revealedReceiver) : false,
              senderHidden: inp ? isZero(inp.revealedSender) : false,
            }),
            { label: 'nf', value: inp?.nullifier ?? '—', state: 'info' },
            { label: 'cm', value: out?.cm ?? '—', state: 'info' },
          ],
        };
      }
      if (decoded.functionName === 'unshield') {
        const [recipient, amount, anchor, inputs, outputs, maskBits] = decoded.args as [
          Address,
          bigint,
          Hex,
          { nullifier: Hex; revealedSender: Hex }[],
          { cm: Hex; revealedAmount: Hex; revealedReceiver: Hex }[],
          number,
        ];
        const flags = fromBits(Number(maskBits));
        const out = outputs[0];
        const inp = inputs[0];
        return {
          ...base,
          kind: 'unshield',
          rows: [
            statusRow,
            { label: 'Payout', value: recipient, state: 'public' },
            { label: 'Exit', value: `${formatEther(amount)} ARX`, state: 'public' },
            gasFromRow(tx.from),
            { label: 'Anchor', value: anchor, state: 'info' },
            ...flagRows(flags, {
              amountHidden: out ? isZero(out.revealedAmount) : !out,
              receiverHidden: out ? isZero(out.revealedReceiver) : !out,
              senderHidden: inp ? isZero(inp.revealedSender) : false,
            }),
            { label: 'nf', value: inp?.nullifier ?? '—', state: 'info' },
          ],
        };
      }
    } catch {
      // not 0x801
    }
  }

  return {
    ...base,
    kind: tx.input === '0x' || !tx.input ? 'transfer' : 'other',
    rows: [
      statusRow,
      { label: 'To', value: tx.to ?? 'contract create', state: 'public' },
      { label: 'From', value: tx.from, state: 'public' },
      { label: 'Amount', value: `${formatEther(tx.value)} ARX`, state: 'public' },
    ],
  };
}

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
