import type { CSSProperties } from 'react';

/** Solid ARX coin — no keyhole, proper circular coin shape */
export function ArxCoinVisual({ size = 64, style }: { size?: number; style?: CSSProperties }) {
  const uid = `arx-coin-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0, ...style }}
      aria-hidden
    >
      <defs>
        <radialGradient id={`${uid}-face`} cx="42%" cy="38%" r="58%">
          <stop offset="0%" stopColor="#1a4a6e" />
          <stop offset="55%" stopColor="#0c2844" />
          <stop offset="100%" stopColor="#061828" />
        </radialGradient>
        <linearGradient id={`${uid}-rim`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4f4ff" />
          <stop offset="35%" stopColor="#7ec8e8" />
          <stop offset="70%" stopColor="#4a9ec4" />
          <stop offset="100%" stopColor="#2a6a8a" />
        </linearGradient>
        <linearGradient id={`${uid}-rimSide`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3d8aad" />
          <stop offset="100%" stopColor="#1a5070" />
        </linearGradient>
        <linearGradient id={`${uid}-bar`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#e8fcff" />
          <stop offset="100%" stopColor="#6ec8e8" />
        </linearGradient>
        <filter id={`${uid}-glow`}>
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(79,216,235,0.45)" />
        </filter>
      </defs>

      {/* Rim thickness (3D edge) */}
      <ellipse cx="62" cy="50" rx="7" ry="40" fill={`url(#${uid}-rimSide)`} opacity={0.9} />

      {/* Outer rim */}
      <circle cx="46" cy="50" r="44" fill={`url(#${uid}-rim)`} filter={`url(#${uid}-glow)`} />

      {/* Rim highlight */}
      <path
        d="M 12 50 A 34 34 0 0 1 46 14"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Coin face */}
      <circle cx="44" cy="48" r="36" fill={`url(#${uid}-face)`} />

      {/* Inner face ring */}
      <circle cx="44" cy="48" r="36" stroke="rgba(79,216,235,0.2)" strokeWidth="0.8" fill="none" />

      {/* ARX bars — solid, no keyhole */}
      <rect x="36" y="30" width="16" height="7" rx="3.5" fill={`url(#${uid}-bar)`} />
      <rect x="31" y="41" width="13" height="7" rx="3.5" fill={`url(#${uid}-bar)`} />
      <rect x="48" y="41" width="13" height="7" rx="3.5" fill={`url(#${uid}-bar)`} />
      <rect x="26" y="52" width="36" height="9" rx="4.5" fill={`url(#${uid}-bar)`} />

      {/* Specular highlight on face */}
      <ellipse cx="34" cy="36" rx="10" ry="6" fill="rgba(255,255,255,0.08)" />
    </svg>
  );
}
