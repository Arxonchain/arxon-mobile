import type { CSSProperties } from 'react';

export type TokenMarkId = 'ETH' | 'USDC' | 'USDT' | 'ARX';

const SRC: Record<TokenMarkId, string> = {
  ETH: '/assets/tokens/eth.svg',
  USDC: '/assets/tokens/usdc.svg',
  USDT: '/assets/tokens/usdt.svg',
  ARX: '/assets/tokens/arx.svg',
};

export function TokenMark({
  id,
  size = 28,
  style,
}: {
  id: TokenMarkId;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <img
      src={SRC[id]}
      alt={id}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'block',
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

export function TokenName({ id, name, size = 28 }: { id: TokenMarkId; name: string; size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, verticalAlign: 'middle' }}>
      <TokenMark id={id} size={size} />
      <span style={{ fontSize: 14, fontWeight: 600 }}>{name}</span>
    </span>
  );
}
