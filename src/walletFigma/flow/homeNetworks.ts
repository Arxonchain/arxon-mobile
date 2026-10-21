import { ARXON, DEFAULT_RPC } from '@/chainWallet/chain';
import type { useLiveFrame } from './liveFrame';
import type { WalletNet } from './WalletTabs';

/** Networks shown in Select network. Mainnet is ETH/SOL/BTC plus custom RPCs; testnet is Arxon plus custom RPCs. */
export type HomeNetwork = {
  id: string;
  scope: WalletNet;
  name: string;
  sub: string;
  icon: string;
  pill: string;
  asset: string;
  rpc?: string;
  chainId?: string;
  symbol?: string;
  explorer?: string;
  custom?: boolean;
};

export type NetworkForm = { name: string; rpc: string; chain: string; symbol: string; explorer: string };

const CUSTOM_KEY = 'arxon.customNetworks';
const PICK_KEY = (scope: WalletNet) => `arxon.homeNetwork.${scope}`;

const MAINNET: HomeNetwork[] = [
  { id: 'ethereum', scope: 'mainnet', name: 'Ethereum', sub: 'ETH, USDT, USDC', icon: 'globe.svg', pill: 'Ethereum', asset: 'ETH' },
  { id: 'solana', scope: 'mainnet', name: 'Solana', sub: 'SOL', icon: 'globe.svg', pill: 'Solana', asset: 'SOL' },
  { id: 'bitcoin', scope: 'mainnet', name: 'Bitcoin', sub: 'BTC', icon: 'globe.svg', pill: 'Bitcoin', asset: 'BTC' },
];

const TESTNET: HomeNetwork[] = [
  {
    id: 'arxon-testnet',
    scope: 'testnet',
    name: 'Arxon Testnet',
    sub: `Chain ${ARXON.id} · ${host(DEFAULT_RPC)}`,
    icon: 'globe-test.svg',
    pill: 'Arxon Testnet',
    asset: 'ARXt',
    rpc: DEFAULT_RPC,
    chainId: String(ARXON.id),
    symbol: 'tARX',
  },
];

function host(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function readCustom(): HomeNetwork[] {
  try {
    const rows = JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]');
    return Array.isArray(rows) ? rows.filter((row) => row && typeof row.id === 'string' && (row.scope === 'mainnet' || row.scope === 'testnet')) : [];
  } catch {
    return [];
  }
}

export function listNetworks(scope: WalletNet): HomeNetwork[] {
  const built = scope === 'testnet' ? TESTNET : MAINNET;
  return [...built, ...readCustom().filter((row) => row.scope === scope)];
}

export function selectedNetwork(scope: WalletNet): HomeNetwork {
  const rows = listNetworks(scope);
  const id = localStorage.getItem(PICK_KEY(scope));
  return rows.find((row) => row.id === id) ?? rows[0];
}

export function pickNetwork(scope: WalletNet, id: string) {
  localStorage.setItem(PICK_KEY(scope), id);
}

/** Chain 7171 or the Arxon RPC is a testnet, whichever page it was added from. */
export function scopeFor(form: NetworkForm, from: WalletNet): WalletNet {
  const chain = form.chain.trim();
  const rpc = form.rpc.trim();
  if (chain === String(ARXON.id) || rpc.includes('rpc-test.arxon.io') || /arxon/i.test(form.name)) return 'testnet';
  return from;
}

export function saveNetwork(form: NetworkForm, from: WalletNet): HomeNetwork | null {
  const name = form.name.trim();
  const rpc = form.rpc.trim();
  if (!name && !rpc) return null;
  const scope = scopeFor(form, from);
  const existing = listNetworks(scope).find((row) => (rpc && row.rpc === rpc) || (!rpc && row.name === name));
  if (existing) {
    pickNetwork(scope, existing.id);
    return existing;
  }
  const row: HomeNetwork = {
    id: `custom-${Date.now().toString(36)}`,
    scope,
    name: name || 'Custom network',
    sub: rpc ? `Custom RPC · ${host(rpc)}` : 'Custom RPC',
    icon: 'plus.svg',
    pill: name || 'Custom network',
    asset: scope === 'testnet' ? 'ARXt' : 'ETH',
    rpc: rpc || undefined,
    chainId: form.chain.trim() || undefined,
    symbol: form.symbol.trim() || undefined,
    explorer: form.explorer.trim() || undefined,
    custom: true,
  };
  localStorage.setItem(CUSTOM_KEY, JSON.stringify([...readCustom(), row]));
  pickNetwork(scope, row.id);
  return row;
}

/** Switch the live wallet to this network. Mainnet signs on Ethereum; Solana and Bitcoin set the receive asset. */
export async function applyNetwork(live: ReturnType<typeof useLiveFrame>, row: HomeNetwork) {
  pickNetwork(row.scope, row.id);
  if (!live?.app) return;
  if (row.scope === 'testnet') {
    live.setReceiveAsset(row.asset);
    await live.enableTestnet(row.rpc || DEFAULT_RPC);
    return;
  }
  live.setReceiveAsset(row.asset);
  await live.setNetwork('ethereum');
}
