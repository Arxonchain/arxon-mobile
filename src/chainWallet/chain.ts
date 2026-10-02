import { createPublicClient, createWalletClient, defineChain, http } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';

export const ARXON = defineChain({
  id: 7171,
  name: 'Arxon',
  nativeCurrency: { name: 'ARX', symbol: 'ARX', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc-test.arxon.io'] } },
});

export const DEFAULT_RPC = 'https://rpc-test.arxon.io';
export const START_URL = 'https://rpc-test.arxon.io/start/';
export const SCAN_URL = 'https://scan.arxon.io';

export function publicClient(rpcUrl: string) {
  return createPublicClient({
    chain: defineChain({ ...ARXON, rpcUrls: { default: { http: [rpcUrl] } } }),
    transport: http(rpcUrl, { timeout: 60_000 }),
  });
}

export function walletClient(rpcUrl: string, mnemonic: string) {
  const account = mnemonicToAccount(mnemonic.trim());
  return createWalletClient({
    account,
    chain: defineChain({ ...ARXON, rpcUrls: { default: { http: [rpcUrl] } } }),
    transport: http(rpcUrl, { timeout: 60_000 }),
  });
}
