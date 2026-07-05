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
        position: 'absolute', bottom: 50, right: 28, width: 78, height: 78,
        borderRadius: '50%', zIndex: 15, touchAction: 'none', cursor: 'pointer',
        background: ready ? 'rgba(79,216,235,0.18)' : 'rgba(79,216,235,0.08)',
        border: `2px solid ${ready ? '#4FD8EB' : 'rgba(79,216,235,0.35)'}`,
        boxShadow: ready ? '0 0 18px rgba(79,216,235,0.55)' : 'none',
        opacity: disabled ? 0.35 : cooldown > 0 && !active ? 0.4 : 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Creato Display',system-ui,sans-serif",
        fontSize: 11, fontWeight: 700, color: '#4FD8EB',
        whiteSpace: 'pre-line', lineHeight: 1.2,
      }}
    >
      {label}
    </button>
  );
}
