import {
  createPublicClient,
  createWalletClient,
  formatEther,
  formatUnits,
  http,
  parseEther,
  parseUnits,
  type Address,
  type Hex,
} from 'viem';
import { resolveAccount } from './keys';

import {
  ETHEREUM,
  ETHEREUM_RPC,
  ETHEREUM_RPC_TIMEOUT_MS,
  ETHEREUM_TOKENS,
  USDC_ETH,
  USDT_ETH,
  type EthereumToken,
} from './networks';

const ERC20_BALANCE_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

/** USDT has no return value on transfer. Do not use the ERC-20 ABI that expects bool. */
const USDT_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

function rpcFail(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (/user rejected|denied|rejected the request/i.test(msg)) {
    return new Error(msg);
  }
  if (/insufficient funds|gas required exceeds/i.test(msg)) {
    return new Error(`Ethereum send failed: ${msg}`);
  }
  const timed = /timeout|timed out|abort/i.test(msg);
  return new Error(
    timed
      ? `Ethereum RPC timed out (${ETHEREUM_RPC}). Try again or replace ETHEREUM_RPC.`
      : `Ethereum RPC failed (${ETHEREUM_RPC}): ${msg}`
  );
}

export function ethereumPublicClient(rpcUrl = ETHEREUM_RPC) {
  return createPublicClient({
    chain: ETHEREUM,
    transport: http(rpcUrl, { timeout: ETHEREUM_RPC_TIMEOUT_MS, retryCount: 0 }),
  });
}

export function ethereumWalletClient(mnemonic: string, rpcUrl = ETHEREUM_RPC, addressIndex = 0) {
  const account = resolveAccount(mnemonic, addressIndex);
  return createWalletClient({
    account,
    chain: ETHEREUM,
    transport: http(rpcUrl, { timeout: ETHEREUM_RPC_TIMEOUT_MS, retryCount: 0 }),
  });
}

export type EthereumBalances = {
  ETH: string | null;
  USDC: string | null;
  USDT: string | null;
};

export async function fetchEthereumBalances(
  address: Address,
  rpcUrl = ETHEREUM_RPC
): Promise<{ balances: EthereumBalances; error: string | null }> {
  const client = ethereumPublicClient(rpcUrl);
  const balances: EthereumBalances = { ETH: null, USDC: null, USDT: null };
  let error: string | null = null;

  try {
    balances.ETH = formatEther(await client.getBalance({ address }));
  } catch (e) {
    error = rpcFail(e).message;
  }

  for (const token of ETHEREUM_TOKENS) {
    if (!token.address) continue;
    try {
      const raw = await client.readContract({
        address: token.address,
        abi: ERC20_BALANCE_ABI,
        functionName: 'balanceOf',
        args: [address],
      });
      balances[token.symbol] = formatUnits(raw, token.decimals);
    } catch (e) {
      const fail = rpcFail(e).message;
      error = error ?? fail;
    }
  }

  return { balances, error };
}

async function waitEth(rpcUrl: string, hash: Hex) {
  try {
    const receipt = await ethereumPublicClient(rpcUrl).waitForTransactionReceipt({
      hash,
      timeout: 90_000,
    });
    if (receipt.status !== 'success') {
      throw new Error(`Send reverted on Ethereum (${hash}).`);
    }
  } catch (e) {
    if (e instanceof Error && /reverted on Ethereum/.test(e.message)) throw e;
    throw rpcFail(e);
  }
}

export async function sendEthereumNative(
  mnemonic: string,
  to: Address,
  amount: string,
  rpcUrl = ETHEREUM_RPC,
  addressIndex = 0,
): Promise<Hex> {
  const client = ethereumWalletClient(mnemonic, rpcUrl, addressIndex);
  try {
    const hash = await client.sendTransaction({
      to,
      value: parseEther(amount),
    });
    await waitEth(rpcUrl, hash);
    return hash;
  } catch (e) {
    throw rpcFail(e);
  }
}

export async function sendEthereumToken(
  mnemonic: string,
  token: Exclude<EthereumToken, 'ETH'>,
  to: Address,
  amount: string,
  rpcUrl = ETHEREUM_RPC,
  addressIndex = 0,
): Promise<Hex> {
  const meta = ETHEREUM_TOKENS.find((t) => t.symbol === token);
  if (!meta?.address) throw new Error('Unknown Ethereum token');
  const client = ethereumWalletClient(mnemonic, rpcUrl, addressIndex);
  const value = parseUnits(amount.trim() || '0', meta.decimals);
  if (value === BigInt(0)) throw new Error('Enter an amount.');
  const account = client.account;

  try {
    const hash =
      token === 'USDT'
        ? await client.writeContract({
            account,
            address: USDT_ETH,
            abi: USDT_TRANSFER_ABI,
            functionName: 'transfer',
            args: [to, value],
            gas: BigInt(120_000),
          })
        : await client.writeContract({
            account,
            address: USDC_ETH,
            abi: ERC20_TRANSFER_ABI,
            functionName: 'transfer',
            args: [to, value],
            gas: BigInt(120_000),
          });
    await waitEth(rpcUrl, hash);
    return hash;
  } catch (e) {
    throw rpcFail(e);
  }
}
