import { createContext, useContext, type CSSProperties } from 'react';
import { useLiveFrame } from './liveFrame';
import { font } from '@/walletFigma/tokens';

export type WalletTabName = 'Home' | 'Explore' | 'Market' | 'Account' | 'Testnet';
export type WalletNet = 'mainnet' | 'testnet';

/** Keep lists clear of the inset floating pill. Pixel number so Android WebView always applies it. */
export const WALLET_TAB_CLEAR = 148;

export const WalletNetworkContext = createContext<WalletNet>('mainnet');

export function useWalletNetwork() {
  return useContext(WalletNetworkContext);
}

const TABS: { name: WalletTabName; src: string; w: number; h: number }[] = [
  { name: 'Home', src: '/wallet-figma/activity/tab-home.svg', w: 22, h: 22 },
  { name: 'Market', src: '/wallet-figma/activity/tab-history.svg', w: 18, h: 18 },
  { name: 'Explore', src: '/wallet-figma/activity/tab-explore.svg', w: 20, h: 20 },
  { name: 'Testnet', src: '/wallet-figma/receive/globe-test.svg', w: 18, h: 18 },
  { name: 'Account', src: '/wallet-figma/activity/tab-account.svg', w: 20, h: 20 },
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
    go('explore');
    return;
  }
  if (tab === 'Market') {
    go('market');
    return;
  }
  go('account');
}

const ACCENT = '#accafe';
const IDLE = '#8c8f99';

export function WalletTabs({ active, onSelect }: { active: WalletTabName | null; onSelect: (tab: WalletTabName) => void }) {
  const live = useLiveFrame();
  return (
    <nav style={{
      position: 'absolute',
      left: 0,
      width: 390,
      background: 'transparent',
      zIndex: 8,
      overflow: 'visible',
      pointerEvents: 'none',
      ...(live?.app
        ? { top: 'auto', bottom: 0, paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))' }
        : { top: 728, paddingBottom: 0 }),
    }}>
      <div style={{
        pointerEvents: 'auto',
        margin: live?.app ? '0 16px 6px' : '0 22px',
        display: 'flex',
        alignItems: 'center',
        height: 64,
        padding: '4px 2px',
        borderRadius: 32,
        background: 'rgba(10,12,16,0.88)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxSizing: 'border-box',
      }}>
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
              {tab.name === 'Home' && on ? <HomeFill /> : <span style={tabGlyph(tab.src, Math.max(16, tab.w - 2), Math.max(16, tab.h - 2), on)} />}
              <span style={{ whiteSpace: 'nowrap', overflow: 'visible' }}>{tab.name}</span>
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

function HomeFill() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3.2 2.8 10.4c-.25.2-.1.7.3.7H5v8.4c0 .4.3.8.8.8h4.1v-5.4h4.2V20h4.1c.5 0 .8-.4.8-.8V11.1h1.9c.4 0 .55-.5.3-.7L12 3.2Z" fill="#accafe" />
    </svg>
  );
}

function tabBtn(on: boolean): CSSProperties {
  return {
    flex: 1,
    minWidth: 0,
    height: 56,
    border: 'none',
    background: 'none',
    color: on ? ACCENT : IDLE,
    fontFamily: font.sans,
    fontSize: 10,
    lineHeight: '12px',
    fontWeight: on ? 600 : 500,
    letterSpacing: -0.2,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: '0 1px',
    overflow: 'visible',
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
