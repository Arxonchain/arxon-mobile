import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface Wallet {
  id: string;
  wallet_address: string;
  wallet_type: string;
  is_primary: boolean;
  connected_at: string;
}

declare global {
  interface Window {
    injectedWeb3?: {
      [key: string]: {
        enable: () => Promise<any>;
        version: string;
      };
    };
  }
}

export const useWallet = () => {
  const { user } = useAuth();

  // Wallet connect is currently "Coming Soon" in the UI, so keep this hook zero-impact
  // to avoid backend calls that can degrade overall app responsiveness.
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const fetchWallets = useCallback(async () => {
    setWallets([]);
    setLoading(false);
  }, []);

  const connectPolkadotWallet = async () => {
    toast({
      title: "Coming Soon",
      description: "Wallet connect will be available soon. Stay tuned!",
    });
  };

  const disconnectWallet = async () => {
    toast({
      title: "Coming Soon",
      description: "Wallet management will be available soon.",
    });
  };

  const setPrimaryWallet = async () => {
    toast({
      title: "Coming Soon",
      description: "Wallet management will be available soon.",
    });
  };

  useEffect(() => {
    // Keep behavior stable if other pages call into this hook.
    // (No backend traffic until wallet connect ships.)
    void fetchWallets();
  }, [fetchWallets, user?.id]);

  const primaryWallet = wallets.find((w) => w.is_primary) || wallets[0];

  return {
    wallets,
    primaryWallet,
    loading,
    connecting,
    connectPolkadotWallet,
    disconnectWallet,
    setPrimaryWallet,
    hasPolkadotExtension: typeof window !== 'undefined' && !!window.injectedWeb3?.['polkadot-js'],
  };
};

