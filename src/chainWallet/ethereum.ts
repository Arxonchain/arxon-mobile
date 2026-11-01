import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  formatEther,
  formatUnits,
  http,
  parseEther,
  parseUnits,
  type Address,
  type Hex,
} from 'viem';
import { plainTxError } from './txError';
import { resolveAccount } from './keys';
import { PendingTxError } from './chain';

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
  return new Error(plainTxError(err));
}

/** Network fee in ETH for a native or USDT/USDC transfer. Uses a typical limit if the node cannot simulate it. */
export async function quoteEthereumFee(token: EthereumToken, from: Address, to: Address, amount: string): Promise<number> {
  const client = ethereumPublicClient();
  const gasPrice = await client.getGasPrice();
  let gas = token === 'ETH' ? 21_000n : 65_000n;
  try {
    if (token === 'ETH') {
      gas = await client.estimateGas({ account: from, to, value: parseEther(amount || '0') });
    } else {
      const meta = ETHEREUM_TOKENS.find((row) => row.symbol === token);
      if (!meta?.address) throw new Error('Unknown token');
      const value = parseUnits((amount || '0').trim(), meta.decimals);
      const data = encodeFunctionData({
        abi: token === 'USDT' ? USDT_TRANSFER_ABI : ERC20_TRANSFER_ABI,
        functionName: 'transfer',
        args: [to, value],
      });
      gas = await client.estimateGas({ account: from, to: meta.address, data });
    }
  } catch {
    /* keep the typical limit so the review can still show a fee */
  }
  const eth = Number(formatEther(gas * gasPrice));
  return Number.isFinite(eth) ? eth : 0;
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
  const client = ethereumPublicClient(rpcUrl);
  try {
    const receipt = await client.waitForTransactionReceipt({
      hash,
      timeout: 90_000,
    });
    if (receipt.status !== 'success') {
      throw new Error(`Send reverted on Ethereum (${hash}).`);
    }
  } catch (e) {
    if (e instanceof PendingTxError) throw e;
    if (e instanceof Error && /reverted on Ethereum/.test(e.message)) throw e;
    try {
      const receipt = await client.getTransactionReceipt({ hash });
      if (receipt.status !== 'success') {
        throw new Error(`Send reverted on Ethereum (${hash}).`);
      }
    } catch (inner) {
      if (inner instanceof Error && /reverted on Ethereum/.test(inner.message)) throw inner;
      throw new PendingTxError(hash);
    }
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
    if (e instanceof PendingTxError) throw e;
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
    if (e instanceof PendingTxError) throw e;
    throw rpcFail(e);
  }
}
