import { NavLink } from 'react-router-dom';
import { FigmaImg } from './icons';
import { font, ink } from './tokens';

type TabId = 'home' | 'vault' | 'explore' | 'history' | 'account';

const TABS: {
  id: TabId;
  to: string;
  label: string;
  active: string;
  idle: string;
  w: number;
  h: number;
}[] = [
  { id: 'home', to: '/', label: 'Home', active: '/wallet-figma/tab-home.svg', idle: '/wallet-figma/tab-home-idle.svg', w: 25, h: 25 },
  { id: 'vault', to: '/vault', label: 'Vault', active: '/wallet-figma/tab-vault-active.svg', idle: '/wallet-figma/tab-vault.svg', w: 26, h: 27 },
  { id: 'explore', to: '/explore', label: 'Explore', active: '/wallet-figma/tab-explore.svg', idle: '/wallet-figma/tab-explore.svg', w: 30, h: 30 },
  { id: 'history', to: '/activity', label: 'History', active: '/wallet-figma/tab-history.svg', idle: '/wallet-figma/tab-history.svg', w: 24, h: 24 },
  { id: 'account', to: '/account', label: 'Account', active: '/wallet-figma/tab-account.svg', idle: '/wallet-figma/tab-account.svg', w: 26.5, h: 26.5 },
];

export default function TabBar({ activeId }: { activeId: TabId | null }) {
  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        background: ink.page,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div style={{ display: 'flex', width: '100%', padding: '0 7.5px' }}>
        {TABS.map((tab) => {
          const on = tab.id === activeId;
          return (
            <NavLink
              key={tab.id}
              to={tab.to}
              style={{
                flex: 1,
                minWidth: 0,
                height: 78,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                textDecoration: 'none',
              }}
            >
              <span style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FigmaImg src={on ? tab.active : tab.idle} width={tab.w} height={tab.h} alt="" />
              </span>
              <span
                style={{
                  fontFamily: font.tab,
                  fontSize: 12,
                  lineHeight: '14px',
                  color: on ? ink.accent : ink.secondary,
                }}
              >
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export type { TabId };
