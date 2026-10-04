import { NETWORKS, type WalletNetworkId } from '@/chainWallet/networks';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { walletFont } from '@/chainWallet/ui';

const ORDER: WalletNetworkId[] = ['ethereum', 'arxon'];

export default function NetworkSwitcher() {
  const { network, setNetwork } = useChainWallet();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '12px 0 16px' }}>
      {ORDER.map((id) => {
        const on = network === id;
        const item = NETWORKS[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => void setNetwork(id)}
            style={{
              padding: '12px 10px',
              borderRadius: 16,
              border: on
                ? item.kind === 'real'
                  ? '1px solid hsl(155 45% 42%/0.65)'
                  : '1px solid hsl(215 35% 62%/0.55)'
                : '1px solid hsl(215 22% 18%)',
              background: on
                ? item.kind === 'real'
                  ? 'hsl(155 40% 18%/0.55)'
                  : 'hsl(215 35% 62%/0.15)'
                : 'transparent',
              color: on ? 'hsl(215 20% 96%)' : 'hsl(215 18% 70%)',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              fontFamily: walletFont,
              lineHeight: 1.25,
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
