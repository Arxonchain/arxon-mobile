import { getAddress, toFunctionSelector, type Address } from 'viem';

import { publicClient } from './chain';
import { storage } from './storage';

export type ListedToken = {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  /** ARX-20 has a vault. Plain ERC-20 is public only. */
  standard: 'arx20' | 'erc20';
};

const ERC20_META_ABI = [
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

/** IARX20.shield — bytecode probe to tell ARX-20 from plain ERC-20.
 *  Plain ERC-20 never gets a vault. Native ARX is not listed here. */
const ARX20_SHIELD_SELECTOR = toFunctionSelector(
  'function shield(uint256,(bytes32,bytes32,bytes32,bytes32,bytes)[],uint8,uint256,(bytes,bytes,bytes,bytes,bytes))'
);

async function loadJson<T>(raw: string | null, fallback: T): Promise<T> {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function loadListedTokens(): Promise<ListedToken[]> {
  return loadJson(await storage.getListedTokens(), []);
}

export async function saveListedTokens(tokens: ListedToken[]): Promise<void> {
  await storage.setListedTokens(JSON.stringify(tokens));
}

export async function readTokenMeta(
  rpcUrl: string,
  token: Address
): Promise<Pick<ListedToken, 'name' | 'symbol' | 'decimals'>> {
  const client = publicClient(rpcUrl);
  const [name, symbol, decimals] = await Promise.all([
    client.readContract({ address: token, abi: ERC20_META_ABI, functionName: 'name' }),
    client.readContract({ address: token, abi: ERC20_META_ABI, functionName: 'symbol' }),
    client.readContract({ address: token, abi: ERC20_META_ABI, functionName: 'decimals' }),
  ]);
  return { name, symbol, decimals };
}

export async function tokenPublicBalance(
  rpcUrl: string,
  token: Address,
  owner: Address
): Promise<bigint> {
  return publicClient(rpcUrl).readContract({
    address: token,
    abi: ERC20_META_ABI,
    functionName: 'balanceOf',
    args: [owner],
  });
}

export async function detectStandard(rpcUrl: string, token: Address): Promise<'arx20' | 'erc20'> {
  const code = await publicClient(rpcUrl).getCode({ address: token });
  if (!code || code === '0x') throw new Error('No contract at that address.');
  return code.toLowerCase().includes(ARX20_SHIELD_SELECTOR.slice(2).toLowerCase())
    ? 'arx20'
    : 'erc20';
}

export async function addListedToken(rpcUrl: string, raw: string): Promise<ListedToken> {
  const address = getAddress(raw.trim()) as Address;
  const listed = await loadListedTokens();
  const existing = listed.find((t) => t.address.toLowerCase() === address.toLowerCase());
  if (existing) return existing;
  const meta = await readTokenMeta(rpcUrl, address);
  const standard = await detectStandard(rpcUrl, address);
  const token: ListedToken = { address, ...meta, standard };
  listed.push(token);
  await saveListedTokens(listed);
  return token;
}

export async function removeListedToken(address: string): Promise<void> {
  const listed = await loadListedTokens();
  await saveListedTokens(listed.filter((t) => t.address.toLowerCase() !== address.toLowerCase()));
}

export { ERC20_META_ABI };
