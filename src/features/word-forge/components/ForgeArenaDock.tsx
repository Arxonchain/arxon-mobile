import {
  BarChart3, Gift, Map, Menu, Settings, Sparkles, Trophy, X,
} from 'lucide-react';
import { GlossyIconButton } from './GlossyKit';

interface ForgeArenaDockProps {
  dailyDone: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStats: () => void;
  onSettings: () => void;
  onLeaderboard: () => void;
  onMap: () => void;
  onDaily: () => void;
  onRewards: () => void;
}

/** Compact hamburger menu — frees vertical space for slot grid + wheel */
export function ForgeArenaDock({
  dailyDone, open, onOpenChange, onStats, onSettings, onLeaderboard, onMap, onDaily, onRewards,
}: ForgeArenaDockProps) {

  const items = [
    { label: 'Stats', icon: BarChart3, onClick: onStats },
    { label: 'Leaderboard', icon: Trophy, onClick: onLeaderboard },
    { label: 'Sector Map', icon: Map, onClick: onMap },
    {
      label: 'Daily Milestone',
      icon: Gift,
      onClick: onDaily,
      badge: dailyDone ? null : '+50',
      accent: !dailyDone,
    },
    { label: 'Rewards', icon: Sparkles, onClick: onRewards },
    { label: 'Settings', icon: Settings, onClick: onSettings },
  ];

  const run = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        <GlossyIconButton
          label="Game menu"
          caption="Menu"
          color="slate"
          size={44}
          onClick={() => onOpenChange(true)}
        >
          <Menu size={20} strokeWidth={2.8} />
        </GlossyIconButton>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Game menu"
          style={{
            position: 'fixed', inset: 0, zIndex: 55,
            background: 'rgba(2,8,18,0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: '0 16px max(18px, env(safe-area-inset-bottom))',
          }}
          onClick={() => onOpenChange(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 380, borderRadius: 20,
              background: 'linear-gradient(180deg, rgba(12,32,58,0.98), rgba(4,12,24,0.98))',
              border: '1px solid rgba(79,216,235,0.28)',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.55)',
              padding: '14px 14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.18em', color: 'rgba(79,216,235,0.75)' }}>
                ARENA TOOLS
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => onOpenChange(false)}
                style={{
                  width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(79,216,235,0.25)',
                  background: 'rgba(2,10,22,0.8)', color: '#e8fcff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => run(item.onClick)}
                  style={{
                    position: 'relative',
                    padding: '12px 8px 10px',
                    borderRadius: 14,
                    border: `1px solid ${item.accent ? 'rgba(255,217,61,0.35)' : 'rgba(79,216,235,0.2)'}`,
                    background: item.accent
                      ? 'linear-gradient(180deg, rgba(255,217,61,0.14), rgba(2,10,22,0.85))'
                      : 'rgba(2,10,22,0.75)',
                    color: '#e8fcff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {item.badge && (
                    <span style={{
                      position: 'absolute', top: 6, right: 8,
                      fontSize: 8, fontWeight: 900, color: '#ffd93d',
                    }}>
                      {item.badge}
                    </span>
                  )}
                  <item.icon size={18} strokeWidth={2.5} color={item.accent ? '#ffd93d' : '#4FD8EB'} />
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textAlign: 'center' }}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
