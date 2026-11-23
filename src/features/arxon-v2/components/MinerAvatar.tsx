import { useState, type CSSProperties } from 'react';

function PersonIcon({ size, color = '#eef3ff' }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8.6" r="3.5" stroke={color} strokeWidth="1.8" />
      <path
        d="M5.8 18.6c.9-3.4 3.2-5.1 6.2-5.1s5.3 1.7 6.2 5.1"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Photo when present; person glyph when the miner has no profile pic. */
export function MinerAvatar({
  url,
  size,
  color,
}: {
  url?: string | null;
  size: number;
  color?: string;
}) {
  const [err, setErr] = useState(false);
  const wrap: CSSProperties = {
    width: size,
    height: size,
    borderRadius: size / 2,
    flexShrink: 0,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1c2025',
  };
  if (url && !err) {
    return (
      <span style={wrap}>
        <img
          src={url}
          alt=""
          onError={() => setErr(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </span>
    );
  }
  return (
    <span style={wrap}>
      <PersonIcon size={Math.round(size * 0.5)} color={color} />
    </span>
  );
}
