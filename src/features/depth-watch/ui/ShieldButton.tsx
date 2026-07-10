interface ShieldButtonProps {
  active: boolean;
  charges: number;
  onActivate: () => void;
  disabled?: boolean;
}

export default function ShieldButton({ active, charges, onActivate, disabled }: ShieldButtonProps) {
  const ready = charges > 0 && !active;
  const label = active ? 'SHIELD\nON' : charges > 0 ? `SHIELD\n${charges}` : 'NO\nSHIELD';

  return (
    <button
      type="button"
      disabled={disabled || (!ready && !active)}
      onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); if (ready) onActivate(); }}
      onClick={() => { if (ready) onActivate(); }}
      style={{
        position: 'absolute', bottom: 42, right: 22, width: 88, height: 88,
        borderRadius: '50%', zIndex: 30, touchAction: 'none', pointerEvents: 'auto', cursor: 'pointer',
        background: active
          ? 'linear-gradient(180deg,#a78bfa,#7c3aed)'
          : ready
            ? 'linear-gradient(180deg,rgba(167,139,250,0.45),rgba(124,58,237,0.55))'
            : 'linear-gradient(180deg,rgba(0,0,0,0.4),rgba(0,0,0,0.55))',
        border: `4px solid ${ready || active ? '#fff' : 'rgba(255,255,255,0.35)'}`,
        boxShadow: ready
          ? '0 6px 0 #5b21b6, 0 0 22px rgba(167,139,250,0.55)'
          : active
            ? '0 6px 0 #5b21b6, 0 0 28px rgba(167,139,250,0.85)'
            : '0 4px 0 rgba(0,0,0,0.4)',
        opacity: disabled ? 0.35 : !ready && !active ? 0.55 : 1,
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
