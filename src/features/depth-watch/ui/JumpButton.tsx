interface JumpButtonProps {
  onDown: () => void;
  onUp: () => void;
  disabled?: boolean;
}

export default function JumpButton({ onDown, onUp, disabled }: JumpButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onTouchStart={(e) => { e.preventDefault(); onDown(); }}
      onTouchEnd={(e) => { e.preventDefault(); onUp(); }}
      onMouseDown={onDown}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      style={{
        position: 'absolute', bottom: 130, right: 22, width: 64, height: 64,
        borderRadius: '50%', zIndex: 15, touchAction: 'none', cursor: 'pointer',
        background: 'linear-gradient(180deg,#ffd93d,#ffb800)',
        border: '4px solid #fff',
        boxShadow: '0 5px 0 #c98a00',
        opacity: disabled ? 0.4 : 1,
        fontFamily: "'Creato Display',system-ui,sans-serif",
        fontSize: 13, fontWeight: 900, color: '#5c3d00',
      }}
    >
      JUMP
    </button>
  );
}
