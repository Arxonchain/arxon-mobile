/** Live send destinations. Sample arx1 contacts are preview-only. */
export function isBtcAddress(addr: string) {
  return /^(bc1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{11,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(addr.trim());
}

export function isSolAddress(addr: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr.trim());
}

export function isLiveSendDest(
  addr: string,
  testnet: boolean,
  asset?: { symbol?: string; chain?: 'ethereum' | 'solana' },
) {
  const t = addr.trim();
  if (!t) return false;
  if (/^arx1/i.test(t)) return false;
  const symbol = (asset?.symbol || '').toUpperCase();
  if (symbol === 'BTC') return isBtcAddress(t);
  if (symbol === 'SOL') return isSolAddress(t);
  if ((symbol === 'USDT' || symbol === 'USDC') && !testnet && asset?.chain === 'solana') return isSolAddress(t);
  if (/^0x[0-9a-fA-F]{40}$/.test(t)) return true;
  if (testnet && /^(0x)?[0-9a-fA-F]{64}$/.test(t)) return true;
  return false;
}

export function parseTokenQty(amount: string) {
  const n = Number(String(amount).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
