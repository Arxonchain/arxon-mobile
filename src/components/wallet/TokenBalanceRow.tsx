import type { ReactNode } from 'react';
import { formatUsd, usdFromAmount, type TokenUsd } from '@/chainWallet/prices';
import { TokenChangePct, TokenSparkline } from '@/components/wallet/TokenSparkline';
import { TokenName, type TokenMarkId } from '@/components/wallet/TokenMark';

function fmt(v: string | null, digits: number) {
  if (v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function TokenBalanceRow({
  id,
  name,
  amount,
  digits,
  quote,
  hidden,
  show,
  onClick,
  padded,
}: {
  id?: TokenMarkId;
  name: string;
  amount: string | null;
  digits: number;
  quote: TokenUsd;
  hidden: boolean;
  show: (v: string | null | undefined) => string;
  onClick: () => void;
  padded?: boolean;
}) {
  const fiat = quote.noMarket ? null : formatUsd(usdFromAmount(amount, quote.usd));
  const crypto = `${fmt(amount, digits)} ${name}`;
  const testnet = quote.noMarket;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        textAlign: 'left',
        background: padded ? '#1c2025' : 'none',
        border: padded ? '1px solid #2a3447' : 'none',
        color: '#fff',
        padding: padded ? 16 : '14px 0',
        borderTop: padded ? undefined : '1px solid #2a3447',
        borderRadius: padded ? 16 : 0,
        cursor: 'pointer',
        marginBottom: padded ? 10 : 0,
        fontFamily: 'inherit',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {id ? <TokenName id={id} name={name} size={padded ? 32 : 28} /> : (
          <span style={{ fontSize: 14, fontWeight: 600 }}>{name}</span>
        )}
        {testnet ? (
          <span style={{ display: 'block', fontSize: 11, color: 'hsl(215 14% 48%)', marginTop: 4 }}>
            $0.00
          </span>
        ) : null}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: padded ? 15 : 14, fontWeight: 700, lineHeight: 1.2 }}>
          {hidden ? '••••' : testnet ? show(fmt(amount, digits)) : show(fiat ?? fmt(amount, digits))}
        </div>
        <div style={{ fontSize: 11, color: 'hsl(215 14% 48%)', marginTop: 3 }}>
          {hidden ? '••••' : testnet ? name : crypto}
        </div>
      </div>
      {testnet || hidden ? null : (
        <>
          <TokenSparkline quote={quote} />
          <TokenChangePct quote={quote} />
        </>
      )}
    </button>
  );
}

export function WalletUsdHero({
  totalUsd,
  cryptoLabel,
  hidden,
  mark,
}: {
  totalUsd: number | null;
  cryptoLabel: string;
  hidden: boolean;
  mark: ReactNode;
}) {
  const fiat = formatUsd(totalUsd);
  return (
    <>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: '4px 0 4px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {mark}
        {hidden ? '••••' : fiat ?? cryptoLabel}
      </h1>
      {hidden || fiat ? (
        <p style={{ fontSize: 13, color: 'hsl(215 14% 48%)', margin: '0 0 16px' }}>
          {hidden ? '••••' : cryptoLabel}
        </p>
      ) : (
        <div style={{ marginBottom: 16 }} />
      )}
    </>
  );
}
