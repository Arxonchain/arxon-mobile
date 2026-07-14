import { motion } from 'framer-motion';

export function ForgeTitle({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ textAlign: compact ? 'left' : 'center', lineHeight: 0.95 }}>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          margin: 0,
          fontSize: compact ? 9 : 10,
          fontWeight: 800,
          letterSpacing: compact ? '0.28em' : '0.42em',
          textTransform: 'uppercase',
          color: 'rgba(79,216,235,0.85)',
          fontFamily: "'Creato Display', system-ui, sans-serif",
        }}
      >
        Arxon
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 22, delay: 0.05 }}
        style={{
          margin: compact ? '2px 0 0' : '4px 0 0',
          fontSize: compact ? 22 : 'clamp(28px, 7vw, 36px)',
          fontWeight: 900,
          letterSpacing: '-0.02em',
          fontFamily: "'Creato Display', system-ui, sans-serif",
          background: 'linear-gradient(180deg, #f0fcff 0%, #4FD8EB 38%, #7FE7C4 72%, #2dd4a8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 3px 0 rgba(0,80,100,0.85)) drop-shadow(0 6px 18px rgba(79,216,235,0.35))',
        }}
      >
        WORD FORGE
      </motion.h1>
    </div>
  );
}

export function TechLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: 'rgba(79,216,235,0.65)',
      fontFamily: "'Creato Display', system-ui, sans-serif",
    }}>
      {children}
    </span>
  );
}

export function TechPanel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      border: '1px solid rgba(79,216,235,0.22)',
      borderRadius: 4,
      background: 'rgba(0,8,16,0.72)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04), 0 0 24px rgba(79,216,235,0.08)',
      ...style,
    }}>
      {children}
    </div>
  );
}

export function TechButton({
  children, onClick, disabled, variant = 'primary',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
}) {
  const primary = variant === 'primary';
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.96 }}
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '12px 20px', minHeight: 44,
        borderRadius: 2,
        border: primary ? '1px solid rgba(79,216,235,0.55)' : '1px solid rgba(255,255,255,0.15)',
        background: primary
          ? 'linear-gradient(180deg, rgba(79,216,235,0.35), rgba(14,60,80,0.85))'
          : 'rgba(0,0,0,0.45)',
        color: primary ? '#e8fcff' : 'rgba(255,255,255,0.7)',
        fontWeight: 800,
        fontSize: 12,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        fontFamily: "'Creato Display', system-ui, sans-serif",
        boxShadow: primary ? '0 0 20px rgba(79,216,235,0.25)' : undefined,
      }}
    >
      {children}
    </motion.button>
  );
}
