import { NavLink, useLocation } from 'react-router-dom';
import { WORD_FORGE_ENABLED } from '@/lib/wordForgeFeature';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import { APP_PREVIEW_BASE } from './AppPreviewContext';

const sections: { title: string; pages: { path: string; label: string }[] }[] = [
  {
    title: 'Main tabs',
    pages: [
      { path: APP_PREVIEW_BASE, label: 'Dashboard' },
      { path: `${APP_PREVIEW_BASE}/arena`, label: 'Game Arena' },
      { path: `${APP_PREVIEW_BASE}/arena/prediction-market`, label: 'Prediction Market' },
      { path: `${APP_PREVIEW_BASE}/wallet`, label: 'Wallet' },
      { path: `${APP_PREVIEW_BASE}/profile`, label: 'Profile' },
    ],
  },
  {
    title: 'More pages',
    pages: [
      { path: `${APP_PREVIEW_BASE}/tasks`, label: 'Tasks' },
      { path: `${APP_PREVIEW_BASE}/referrals`, label: 'Referrals' },
      { path: `${APP_PREVIEW_BASE}/nexus`, label: 'Nexus' },
      { path: `${APP_PREVIEW_BASE}/leaderboard`, label: 'Leaderboard' },
      { path: `${APP_PREVIEW_BASE}/settings`, label: 'Settings' },
      { path: `${APP_PREVIEW_BASE}/notifications`, label: 'Notifications' },
      { path: `${APP_PREVIEW_BASE}/points-history`, label: 'Points history' },
    ],
  },
  ...(WORD_FORGE_ENABLED
    ? [{
        title: 'Word Forge',
        pages: [
          { path: `${APP_PREVIEW_BASE}/word-forge`, label: 'Word Forge game' },
          { path: `${APP_PREVIEW_BASE}/word-forge/stats`, label: 'Forge stats' },
          { path: `${APP_PREVIEW_BASE}/word-forge/map`, label: 'Sector map' },
          { path: `${APP_PREVIEW_BASE}/word-forge/leaderboard`, label: 'Forge leaderboard' },
        ],
      }]
    : []),
];

function isActive(pathname: string, path: string) {
  if (path === APP_PREVIEW_BASE) return pathname === APP_PREVIEW_BASE || pathname === `${APP_PREVIEW_BASE}/`;
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function PreviewPageRail() {
  const { pathname } = useLocation();

  return (
    <aside style={{
      width: 220, flexShrink: 0, padding: '24px 16px', borderRight: '1px solid rgba(255,255,255,0.06)',
      background: '#060a12', overflowY: 'auto', maxHeight: '100vh', fontFamily: neon.font,
    }}>
      <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: neon.cyan }}>
        Arxon Preview
      </p>
      <p style={{ margin: '0 0 20px', fontSize: 11, color: neon.textMuted, lineHeight: 1.4 }}>
        Browse every screen as it appears in the native app. Mock data on dashboard & mining.
      </p>

      {sections.map((section) => (
        <div key={section.title} style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 8px', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(232,252,255,0.35)' }}>
            {section.title}
          </p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {section.pages.map(({ path, label }) => {
              const active = isActive(pathname, path);
              return (
                <NavLink
                  key={path}
                  to={path}
                  end={path === APP_PREVIEW_BASE}
                  style={{
                    display: 'block', padding: '8px 10px', borderRadius: 10, fontSize: 12, fontWeight: active ? 700 : 500,
                    textDecoration: 'none', color: active ? neon.text : neon.textMuted,
                    background: active ? 'rgba(79,216,235,0.12)' : 'transparent',
                    border: active ? '1px solid rgba(79,216,235,0.25)' : '1px solid transparent',
                  }}
                >
                  {label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      ))}
    </aside>
  );
}
