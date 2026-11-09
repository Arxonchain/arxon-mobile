import type { WalletNet } from './WalletTabs';

type PaintLive = {
  app?: boolean;
  ready?: boolean;
  chainNetwork?: string;
} | null | undefined;

export type SkeletonKind =
  | 'home'
  | 'testnet'
  | 'wallet'
  | 'market'
  | 'explore'
  | 'account'
  | 'send'
  | 'receive'
  | 'token'
  | 'activity'
  | 'detail';

/** Keep multi-step flows mounted so form state survives; remount everything else. */
export function routeFamily(id: string) {
  if (id.startsWith('send')) return 'send';
  if (id === 'receive' || id === 'network' || id === 'add-network') return 'receive';
  if (id.startsWith('swap')) return 'swap';
  if (id.startsWith('buy')) return 'buy';
  if (id.startsWith('activity')) return 'activity';
  if (
    id.startsWith('vault')
    || id.startsWith('priv-')
    || id.startsWith('unshield-')
    || id.startsWith('shield-')
  ) return 'vault';
  if (id === 'account' || id === 'currency' || id === 'help' || id === 'report') return 'account';
  return id;
}

export function skeletonKind(id: string): SkeletonKind | null {
  if (id === 'splash' || id === 'gateway' || id === 'slide15' || id === 'slide16') return null;
  if (id === 'unlock' || id === 'unlock-wrong' || id === 'create' || id === 'import') return null;
  if (id === 'home' || id.startsWith('home-') || id === 'more') return 'home';
  if (id === 'testnet') return 'testnet';
  if (id === 'public-wallet' || id === 'shielded-wallet') return 'wallet';
  if (id === 'market') return 'market';
  if (id === 'explore' || id === 'dapps') return 'explore';
  if (id === 'account' || id === 'currency' || id === 'help' || id === 'report') return 'account';
  if (id === 'send-token' || id === 'search' || id === 'manage') return 'send';
  if (id === 'receive') return 'receive';
  if (id.startsWith('token-')) return 'token';
  if (id.startsWith('activity')) return 'activity';
  return 'detail';
}

export function livePaintReady(
  _id: string,
  live: PaintLive,
  _net: WalletNet,
) {
  if (!live?.app) return true;
  if (live.address) return true;
  return !!live.ready;
}
