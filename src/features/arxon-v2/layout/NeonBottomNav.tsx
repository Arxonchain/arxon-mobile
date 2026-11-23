import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import type { NavTab } from './navTabs';

const spring = { type: 'spring' as const, stiffness: 520, damping: 38, mass: 0.72 };

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
  const { to, label, icon } = tab;

  return (
    <NavLink
      to={to}
      end={end}
      data-tour={`nav-${tab.id}`}
      style={{
        textDecoration: 'none',
        position: 'relative',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        flexShrink: 0,
      }}
    >
      <motion.div
        whileTap={{ scale: 0.94 }}
        animate={{
          paddingLeft: 12,
          paddingRight: isActive ? 14 : 12,
          gap: isActive ? 8 : 0,
        }}
        transition={spring}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 44,
          minWidth: 44,
          borderRadius: 22,
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {isActive && (
          <motion.div
            layoutId={layoutId}
            transition={spring}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 22,
              background: '#ffffff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
            }}
          />
        )}

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexShrink: 0 }}>
          {icon(isActive)}
        </div>

        <motion.span
          initial={false}
          animate={{
            opacity: isActive ? 1 : 0,
            maxWidth: isActive ? 92 : 0,
          }}
          transition={spring}
          style={{
            position: 'relative',
            zIndex: 1,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            fontSize: 13,
            fontWeight: 650,
            letterSpacing: '-0.2px',
            color: '#0c1018',
            fontFamily: neon.font,
            lineHeight: 1,
            pointerEvents: 'none',
          }}
        >
          {label}
        </motion.span>
      </motion.div>
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
    <div
      style={{
        position,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        padding: '0 16px max(12px, env(safe-area-inset-bottom, 0px))',
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        data-tour="nav-bar"
        style={{
          pointerEvents: 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 2,
          padding: 5,
          borderRadius: 28,
          background: 'rgba(10,12,16,0.92)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          border: `1.5px solid ${neon.cyan}`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
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
  );
}
