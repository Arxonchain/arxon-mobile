import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import type { NavTab } from './navTabs';

const NAV_CSS = `
@keyframes navShimmer {
  0% { transform: translateX(-120%); opacity: 0; }
  20% { opacity: 0.55; }
  100% { transform: translateX(220%); opacity: 0; }
}
@keyframes navIconGlow {
  0%, 100% { filter: drop-shadow(0 0 3px var(--nav-accent-glow)); }
  50% { filter: drop-shadow(0 0 7px var(--nav-accent-glow)); }
}
`;

const spring = { type: 'spring' as const, stiffness: 460, damping: 34, mass: 0.78 };

function NavIconSlot({ active, accent, children }: { active: boolean; accent: string; children: ReactNode }) {
  return (
    <motion.div
      animate={active ? { scale: 1.05, y: -0.5 } : { scale: 1, y: 0 }}
      whileTap={{ scale: 0.9 }}
      transition={spring}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 26,
        height: 26,
        borderRadius: 9,
        touchAction: 'manipulation',
        ['--nav-accent-glow' as string]: `${accent}77`,
        animation: active ? 'navIconGlow 2.8s ease-in-out infinite' : undefined,
      }}
    >
      {active && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            position: 'absolute',
            inset: -1,
            borderRadius: 10,
            background: `radial-gradient(circle, ${accent}28 0%, transparent 68%)`,
          }}
          transition={spring}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex' }}>{children}</div>
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
        justifyContent: 'center',
        gap: 3,
        padding: '6px 2px 5px',
        textDecoration: 'none',
        position: 'relative',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    >
      {isActive && (
        <motion.div
          layoutId={layoutId}
          transition={spring}
          style={{
            position: 'absolute',
            inset: '3px 5px',
            borderRadius: 16,
            background: `linear-gradient(160deg, ${accent}22 0%, ${accent}0A 100%)`,
            border: `1px solid ${accent}40`,
            boxShadow: `0 4px 14px ${accent}1A, inset 0 1px 0 rgba(255,255,255,0.1)`,
          }}
        />
      )}

      <NavIconSlot active={isActive} accent={accent}>
        {icon(isActive)}
      </NavIconSlot>

      <motion.span
        animate={isActive ? { opacity: 1 } : { opacity: 0.48 }}
        transition={{ duration: 0.16 }}
        style={{
          position: 'relative',
          zIndex: 1,
          fontSize: 9,
          fontWeight: isActive ? 800 : 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: isActive ? accent : 'rgba(232,252,255,0.42)',
          fontFamily: neon.font,
          lineHeight: 1.1,
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
        padding: '0 14px max(12px, env(safe-area-inset-bottom, 0px))',
        pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <div style={{
            position: 'relative',
            borderRadius: 26,
            padding: '4px 4px',
            overflow: 'hidden',
            background: 'linear-gradient(165deg, rgba(14,30,52,0.94) 0%, rgba(6,12,24,0.96) 100%)',
            backdropFilter: 'blur(28px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.4)',
            border: '1px solid rgba(79,216,235,0.22)',
            boxShadow: [
              '0 10px 36px rgba(0,0,0,0.55)',
              '0 2px 12px rgba(79,216,235,0.08)',
              'inset 0 1px 0 rgba(255,255,255,0.1)',
              'inset 0 -1px 0 rgba(0,0,0,0.35)',
            ].join(', '),
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
                width: '40%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(79,216,235,0.55), transparent)',
                animation: 'navShimmer 5.5s ease-in-out infinite',
              }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'stretch', position: 'relative', zIndex: 1, minHeight: 52 }}>
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
