interface CloakButtonProps {
  active: boolean;
  cooldown: number;
  onActivate: () => void;
  disabled?: boolean;
}

export default function CloakButton({ active, cooldown, onActivate, disabled }: CloakButtonProps) {
  const ready = !active && cooldown <= 0;
  const label = active ? 'CLOAKED' : cooldown > 0 ? `${Math.ceil(cooldown)}s` : 'CLOAK\nREADY';

  return (
    <button
      type="button"
      disabled={disabled || (!ready && !active)}
      onTouchStart={(e) => { e.preventDefault(); if (ready) onActivate(); }}
      onClick={() => { if (ready) onActivate(); }}
      style={{
        position: 'absolute', bottom: 42, right: 22, width: 88, height: 88,
        borderRadius: '50%', zIndex: 15, touchAction: 'none', cursor: 'pointer',
        background: active
          ? 'linear-gradient(180deg,#4FD8EB,#0891b2)'
          : ready
            ? 'linear-gradient(180deg,rgba(79,216,235,0.35),rgba(8,145,178,0.45))'
            : 'linear-gradient(180deg,rgba(0,0,0,0.4),rgba(0,0,0,0.55))',
        border: `4px solid ${ready || active ? '#fff' : 'rgba(255,255,255,0.35)'}`,
        boxShadow: ready
          ? '0 6px 0 #0e7490, 0 0 22px rgba(79,216,235,0.55)'
          : active
            ? '0 6px 0 #0e7490, 0 0 28px rgba(79,216,235,0.8)'
            : '0 4px 0 rgba(0,0,0,0.4)',
        opacity: disabled ? 0.35 : cooldown > 0 && !active ? 0.55 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Creato Display',system-ui,sans-serif",
        fontSize: 11, fontWeight: 900, color: '#fff',
        whiteSpace: 'pre-line', lineHeight: 1.15,
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
      }}
    >
      {label}
    </button>
  );
}
