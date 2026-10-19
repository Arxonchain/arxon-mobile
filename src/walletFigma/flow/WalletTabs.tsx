import { createContext, useContext, type CSSProperties } from 'react';
import { useLiveFrame } from './liveFrame';
import { FigmaImg } from '@/walletFigma/icons';
import { font } from '@/walletFigma/tokens';

export type WalletTabName = 'Home' | 'Vault' | 'Explore' | 'History' | 'Account' | 'Testnet';
export type WalletNet = 'mainnet' | 'testnet';

export const WalletNetworkContext = createContext<WalletNet>('mainnet');

export function useWalletNetwork() {
  return useContext(WalletNetworkContext);
}

const TABS: { name: WalletTabName; src: string; w: number; h: number }[] = [
  { name: 'Home', src: '/wallet-figma/activity/tab-home.svg', w: 22, h: 22 },
  { name: 'Vault', src: '/wallet-figma/activity/tab-vault.svg', w: 22, h: 23 },
  { name: 'Explore', src: '/wallet-figma/activity/tab-explore.svg', w: 24, h: 24 },
  { name: 'History', src: '/wallet-figma/activity/tab-history.svg', w: 20, h: 20 },
  { name: 'Account', src: '/wallet-figma/activity/tab-account.svg', w: 22, h: 22 },
  { name: 'Testnet', src: '/wallet-figma/receive/globe-test.svg', w: 20, h: 20 },
];

type Go = (id: string, remember?: boolean) => void;

/** Home is mainnet. Testnet stays on its own home. The other tabs keep the network you are already on. */
export function pickWalletTab(
  net: WalletNet,
  tab: WalletTabName,
  go: Go,
  main: { home: string; vault: string; history: string },
) {
  if (tab === 'Testnet') {
    go('testnet', false);
    return;
  }
  if (tab === 'Home') {
    go(net === 'testnet' ? 'home-funded' : main.home, false);
    return;
  }
  if (tab === 'Vault') {
    go(main.vault, false);
    return;
  }
  if (tab === 'Explore') {
    go('explore', false);
    return;
  }
  if (tab === 'History') {
    go(net === 'testnet' ? 'activity' : main.history, false);
    return;
  }
  go('account', false);
}

export function WalletTabs({ active, onSelect }: { active: WalletTabName; onSelect: (tab: WalletTabName) => void }) {
  const net = useWalletNetwork();
  const live = useLiveFrame();
  return (
    <nav style={live?.app
      ? { position: 'absolute', left: 0, right: 0, bottom: 0, background: '#050505', zIndex: 2 }
      : { position: 'absolute', left: 0, top: 728, width: 390, background: '#050505', zIndex: 2 }}>
      {net === 'testnet' && (
        <p style={{ margin: 0, height: 16, textAlign: 'center', fontFamily: font.sans, fontSize: 11, fontWeight: 600, color: '#accafe', lineHeight: '16px' }}>Arxon Testnet</p>
      )}
      <div style={{ display: 'flex', padding: '0 2px' }}>
        {TABS.map((tab) => {
          const on = tab.name === active;
          return (
            <button key={tab.name} type="button" onClick={() => onSelect(tab.name)} style={tabBtn(on)}>
              <span style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FigmaImg src={tab.src} width={tab.w} height={tab.h} />
              </span>
              {tab.name}
            </button>
          );
        })}
      </div>
      {live?.app ? null : (
      <div style={{ height: 16, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 128, bottom: 6, width: 134, height: 5, borderRadius: 10, background: '#212121' }} />
      </div>
      )}
    </nav>
  );
}

function tabBtn(on: boolean): CSSProperties {
  return {
    flex: 1,
    height: 64,
    border: 'none',
    background: 'none',
    color: on ? '#accafe' : '#8c8f99',
    fontFamily: font.sans,
    fontSize: 10,
    lineHeight: '12px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    padding: 0,
  };
}
