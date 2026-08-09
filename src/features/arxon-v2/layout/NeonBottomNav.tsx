import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import type { NavTab } from './navTabs';

const NAV_CSS = `
@keyframes navShimmer {
  0% { transform: translateX(-120%); opacity: 0; }
  15% { opacity: 0.45; }
  100% { transform: translateX(220%); opacity: 0; }
}
@keyframes navIconGlow {
  0%, 100% { filter: drop-shadow(0 0 4px var(--nav-accent-glow)); }
  50% { filter: drop-shadow(0 0 8px var(--nav-accent-glow)); }
}
`;

const spring = { type: 'spring' as const, stiffness: 480, damping: 36, mass: 0.75 };

function NavIconSlot({ active, accent, children }: { active: boolean; accent: string; children: ReactNode }) {
  return (
    <motion.div
      animate={active ? { scale: 1.06, y: -1 } : { scale: 1, y: 0 }}
      whileTap={{ scale: 0.88 }}
      transition={spring}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 10,
        ['--nav-accent-glow' as string]: `${accent}88`,
        animation: active ? 'navIconGlow 2.6s ease-in-out infinite' : undefined,
      }}
    >
      {active && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            position: 'absolute',
            inset: 1,
            borderRadius: 9,
            background: `radial-gradient(circle, ${accent}24 0%, transparent 70%)`,
          }}
          transition={spring}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </motion.div>
  );
}

function NavTabLink({
  tab,
  isActive,
  layoutId,
  end,
}: {
  tab: NavTab;
  isActive: boolean;
  layoutId: string;
  end?: boolean;
}) {
  const { to, label, icon, accent } = tab;

  return (
    <NavLink
      to={to}
      end={end}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        padding: '2px 0 3px',
        textDecoration: 'none',
        position: 'relative',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {isActive && (
        <motion.div
          layoutId={layoutId}
          transition={spring}
          style={{
            position: 'absolute',
            inset: '0 2px',
            borderRadius: 14,
            background: `linear-gradient(145deg, ${accent}20 0%, ${accent}08 100%)`,
            border: `1px solid ${accent}38`,
            boxShadow: `0 2px 12px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.08)`,
          }}
        />
      )}

      <NavIconSlot active={isActive} accent={accent}>
        {icon(isActive)}
      </NavIconSlot>

      <motion.span
        animate={isActive ? { opacity: 1 } : { opacity: 0.5 }}
        transition={{ duration: 0.18 }}
        style={{
          position: 'relative',
          zIndex: 1,
          fontSize: 7,
          fontWeight: isActive ? 800 : 600,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: isActive ? accent : 'rgba(232,252,255,0.4)',
          fontFamily: neon.font,
          lineHeight: 1,
        }}
      >
        {label}
      </motion.span>
    </NavLink>
  );
}

export default function NeonBottomNav({
  tabs,
  activeId,
  layoutId,
  position = 'fixed',
}: {
  tabs: NavTab[];
  activeId: string;
  layoutId: string;
  position?: 'fixed' | 'absolute';
}) {
  return (
    <>
      <style>{NAV_CSS}</style>
      <div style={{
        position,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        paddingBottom: 'max(6px, env(safe-area-inset-bottom, 0px))',
        pointerEvents: 'none',
      }}>
        <div style={{ margin: '0 10px 0', pointerEvents: 'auto' }}>
          <div style={{
            position: 'relative',
            borderRadius: 20,
            padding: '3px 2px',
            overflow: 'hidden',
            background: 'linear-gradient(165deg, rgba(12,28,48,0.92) 0%, rgba(6,10,22,0.94) 100%)',
            backdropFilter: 'blur(20px) saturate(1.35)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.35)',
            border: '1px solid rgba(79,216,235,0.18)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(79,216,235,0.06), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '35%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(79,216,235,0.5), transparent)',
                animation: 'navShimmer 5s ease-in-out infinite',
              }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
              {tabs.map((tab) => (
                <NavTabLink
                  key={tab.to}
                  tab={tab}
                  isActive={tab.id === activeId}
                  layoutId={layoutId}
                  end={tab.end}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
