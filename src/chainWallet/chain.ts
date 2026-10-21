import { createPublicClient, createWalletClient, defineChain, http, type Hex } from 'viem';
import { resolveAccount } from './keys';

export const ARXON = defineChain({
  id: 7171,
  name: 'Arxon Testnet',
  nativeCurrency: { name: 'tARX', symbol: 'tARX', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc-test.arxon.io'] } },
});

export const ARXON_CAIP = 'eip155:7171';
export const ARXON_CHAIN_ID_HEX = '0x1c03';
export const DEFAULT_RPC = 'https://rpc-test.arxon.io';
export const START_URL = 'https://rpc-test.arxon.io/start/';
export const SCAN_URL = 'https://scan.arxon.io';

export const PRECOMPILE = {
  view: '0x0000000000000000000000000000000000000800' as const,
  submit: '0x0000000000000000000000000000000000000801' as const,
  arx20: '0x0000000000000000000000000000000000000802' as const,
};

export const VIEW_ABI = [
  {
    name: 'getNoteTreeRoot',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'bytes32' }],
  },
  {
    name: 'isKnownNoteRoot',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'bytes32', name: 'root' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'getNoteLeafCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getNoteLeaf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'uint256', name: 'index' }],
    outputs: [{ type: 'bytes32' }],
  },
] as const;

export const ARX20_VIEW_ABI = [
  {
    name: 'getNoteTreeRoot',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address', name: 'token' }],
    outputs: [{ type: 'bytes32' }],
  },
  {
    name: 'isKnownNoteRoot',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { type: 'address', name: 'token' },
      { type: 'bytes32', name: 'root' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'getNoteLeafCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address', name: 'token' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'getNoteLeaf',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { type: 'address', name: 'token' },
      { type: 'uint256', name: 'index' },
    ],
    outputs: [{ type: 'bytes32' }],
  },
] as const;

export function publicClient(rpcUrl: string) {
  return createPublicClient({
    chain: defineChain({ ...ARXON, rpcUrls: { default: { http: [rpcUrl] } } }),
    transport: http(rpcUrl, { timeout: 60_000 }),
  });
}

export class PendingTxError extends Error {
  hash: Hex;
  constructor(hash: Hex) {
    super(`Transaction submitted (${hash}). Waiting for the network to include it. Do not send again.`);
    this.name = 'PendingTxError';
    this.hash = hash;
  }
}

export function receiptOutcome(receipt: { status?: string } | null | undefined): 'success' | 'reverted' | 'pending' {
  if (!receipt || receipt.status == null) return 'pending';
  if (receipt.status === 'success') return 'success';
  return 'reverted';
}

export async function waitIncluded(rpcUrl: string, hash: Hex) {
  const client = publicClient(rpcUrl);
  try {
    return await client.waitForTransactionReceipt({ hash, timeout: 180_000 });
  } catch {
    try {
      return await client.getTransactionReceipt({ hash });
    } catch {
      throw new PendingTxError(hash);
    }
  }
}

export function walletClient(rpcUrl: string, mnemonic: string, addressIndex = 0) {
  const account = resolveAccount(mnemonic, addressIndex);
  return createWalletClient({
    account,
    chain: defineChain({ ...ARXON, rpcUrls: { default: { http: [rpcUrl] } } }),
    transport: http(rpcUrl, { timeout: 60_000 }),
  });
}

export async function fetchNoteLeaves(rpcUrl: string): Promise<Hex[] | null> {
  const client = publicClient(rpcUrl);
  try {
    const count = await client.readContract({
      address: PRECOMPILE.view,
      abi: VIEW_ABI,
      functionName: 'getNoteLeafCount',
    });
    const n = Number(count);
    if (!Number.isSafeInteger(n) || n < 0) return null;
    const leaves: Hex[] = [];
    for (let i = 0; i < n; i++) {
      const leaf = await client.readContract({
        address: PRECOMPILE.view,
        abi: VIEW_ABI,
        functionName: 'getNoteLeaf',
        args: [BigInt(i)],
      });
      leaves.push(leaf);
    }
    return leaves;
  } catch {
    return null;
  }
}

export async function assertKnownAnchor(rpcUrl: string, anchor: Hex) {
  const known = await publicClient(rpcUrl).readContract({
    address: PRECOMPILE.view,
    abi: VIEW_ABI,
    functionName: 'isKnownNoteRoot',
    args: [anchor],
  });
  if (!known) {
    throw new Error(
      'Note tree on this device did not match the chain (leaf order). Reload the wallet so it can read every pool commitment, then send Private pay again.'
    );
  }
}

export async function fetchArx20NoteLeaves(rpcUrl: string, token: Hex): Promise<Hex[] | null> {
  const client = publicClient(rpcUrl);
  try {
    const count = await client.readContract({
      address: PRECOMPILE.arx20,
      abi: ARX20_VIEW_ABI,
      functionName: 'getNoteLeafCount',
      args: [token],
    });
    const n = Number(count);
    if (!Number.isSafeInteger(n) || n < 0) return null;
    const leaves: Hex[] = [];
    for (let i = 0; i < n; i++) {
      const leaf = await client.readContract({
        address: PRECOMPILE.arx20,
        abi: ARX20_VIEW_ABI,
        functionName: 'getNoteLeaf',
        args: [token, BigInt(i)],
      });
      leaves.push(leaf);
    }
    return leaves;
  } catch {
    return null;
  }
}

export async function assertKnownArx20Anchor(rpcUrl: string, token: Hex, anchor: Hex) {
  const known = await publicClient(rpcUrl).readContract({
    address: PRECOMPILE.arx20,
    abi: ARX20_VIEW_ABI,
    functionName: 'isKnownNoteRoot',
    args: [token, anchor],
  });
  if (!known) {
    throw new Error(
      'This token’s vault on this device did not match the chain. Reload, then try again.'
    );
  }
}
