import { createContext, useContext, type CSSProperties } from 'react';
import { useLiveFrame } from './liveFrame';
import { font } from '@/walletFigma/tokens';

export type WalletTabName = 'Home' | 'Explore' | 'Market' | 'Account' | 'Testnet';
export type WalletNet = 'mainnet' | 'testnet';

/** Keep tabbed lists above the 64px bar at y=728 in the 844 frame. */
export const WALLET_TAB_CLEAR = 'calc(116px + env(safe-area-inset-bottom, 0px))';

export const WalletNetworkContext = createContext<WalletNet>('mainnet');

export function useWalletNetwork() {
  return useContext(WalletNetworkContext);
}

const TABS: { name: WalletTabName; src: string; w: number; h: number }[] = [
  { name: 'Home', src: '/wallet-figma/activity/tab-home.svg', w: 22, h: 22 },
  { name: 'Market', src: '/wallet-figma/activity/tab-history.svg', w: 20, h: 20 },
  { name: 'Explore', src: '/wallet-figma/activity/tab-explore.svg', w: 24, h: 24 },
  { name: 'Testnet', src: '/wallet-figma/receive/globe-test.svg', w: 20, h: 20 },
  { name: 'Account', src: '/wallet-figma/activity/tab-account.svg', w: 22, h: 22 },
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
  if (tab === 'Explore') {
    go('explore', false);
    return;
  }
  if (tab === 'Market') {
    go('market', false);
    return;
  }
  go('account', false);
}

const ACCENT = '#accafe';
const IDLE = '#8c8f99';
const ACTIVE_GLOW = 'rgba(172, 202, 254, 0.14)';

export function WalletTabs({ active, onSelect }: { active: WalletTabName | null; onSelect: (tab: WalletTabName) => void }) {
  const live = useLiveFrame();
  return (
    <nav style={{ position: 'absolute', left: 0, top: 728, width: 390, background: '#050505', zIndex: 8, overflow: 'visible', paddingBottom: live?.app ? 'env(safe-area-inset-bottom, 0px)' : 0 }}>
      <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: -28, height: 28, pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(5,5,5,0) 0%, #050505 100%)' }} />
      <div style={{ display: 'flex', padding: '0 2px' }}>
        {TABS.map((tab) => {
          const on = tab.name === active;
          return (
            <button
              key={tab.name}
              type="button"
              aria-current={on ? 'page' : undefined}
              onClick={() => onSelect(tab.name)}
              style={tabBtn(on)}
            >
              <span style={iconHalo(on)}>
                <span style={tabGlyph(tab.src, tab.w, tab.h, on)} />
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
    color: on ? ACCENT : IDLE,
    fontFamily: font.sans,
    fontSize: 10,
    lineHeight: '12px',
    fontWeight: on ? 600 : 500,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    padding: 0,
  };
}

function iconHalo(on: boolean): CSSProperties {
  return {
    width: 36,
    height: 36,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: on ? ACTIVE_GLOW : 'transparent',
  };
}

function tabGlyph(src: string, width: number, height: number, on: boolean): CSSProperties {
  return {
    width,
    height,
    display: 'block',
    backgroundColor: on ? ACCENT : IDLE,
    WebkitMaskImage: `url(${src})`,
    WebkitMaskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    WebkitMaskSize: 'contain',
    maskImage: `url(${src})`,
    maskRepeat: 'no-repeat',
    maskPosition: 'center',
    maskSize: 'contain',
  };
}
