import { defineChain } from 'viem';
import { ARXON, DEFAULT_RPC, SCAN_URL, START_URL } from './chain';

/** Replace this HTTPS endpoint later if the public RPC rate-limits. */
export const ETHEREUM_RPC = 'https://ethereum-rpc.publicnode.com';

export const ETHEREUM_RPC_TIMEOUT_MS = 20_000;

export const ETHEREUM = defineChain({
  id: 1,
  name: 'Ethereum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [ETHEREUM_RPC] } },
  blockExplorers: { default: { name: 'Etherscan', url: 'https://etherscan.io' } },
});

export type WalletNetworkId = 'ethereum' | 'arxon';

export type WalletNetwork = {
  id: WalletNetworkId;
  chainId: number;
  name: string;
  /** Loud UI label. Never mix real ETH with Arxon play. */
  label: string;
  kind: 'real' | 'play';
  nativeSymbol: string;
  explorer: string;
  faucet?: string;
};

export const NETWORKS: Record<WalletNetworkId, WalletNetwork> = {
  ethereum: {
    id: 'ethereum',
    chainId: 1,
    name: 'Ethereum',
    label: 'Ethereum · real',
    kind: 'real',
    nativeSymbol: 'ETH',
    explorer: 'https://etherscan.io',
  },
  arxon: {
    id: 'arxon',
    chainId: ARXON.id,
    name: 'Arxon Testnet',
    label: 'Arxon Testnet · play',
    kind: 'play',
    nativeSymbol: 'ARX',
    explorer: SCAN_URL,
    faucet: START_URL,
  },
};

export const USDC_ETH = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const;
export const USDT_ETH = '0xdAC17F958D2ee523a2206206994597C13D831ec7' as const;

export type EthereumToken = 'ETH' | 'USDC' | 'USDT';

export const ETHEREUM_TOKENS: {
  symbol: EthereumToken;
  decimals: number;
  address: `0x${string}` | null;
}[] = [
  { symbol: 'ETH', decimals: 18, address: null },
  { symbol: 'USDC', decimals: 6, address: USDC_ETH },
  { symbol: 'USDT', decimals: 6, address: USDT_ETH },
];

export function isWalletNetworkId(value: string | null | undefined): value is WalletNetworkId {
  return value === 'ethereum' || value === 'arxon';
}

export function networkRpc(id: WalletNetworkId, arxonRpc = DEFAULT_RPC) {
  return id === 'ethereum' ? ETHEREUM_RPC : arxonRpc;
}
