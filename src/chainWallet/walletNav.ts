import { useEffect } from 'react';
import { useChainWallet } from './ChainWalletContext';
import type { WalletNetworkId } from './networks';

export function walletHomePath(network: WalletNetworkId) {
  return network === 'ethereum' ? '/balances' : '/testnet';
}

export function useLockNetwork(id: WalletNetworkId) {
  const { network, setNetwork } = useChainWallet();
  useEffect(() => {
    if (network !== id) void setNetwork(id);
  }, [id, network, setNetwork]);
}
