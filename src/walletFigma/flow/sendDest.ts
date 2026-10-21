/** Live send destinations. Sample arx1 contacts are preview-only. */
export function isLiveSendDest(addr: string, testnet: boolean) {
  const t = addr.trim();
  if (!t) return false;
  if (/^arx1/i.test(t)) return false;
  if (/^0x[0-9a-fA-F]{40}$/.test(t)) return true;
  if (testnet && /^(0x)?[0-9a-fA-F]{64}$/.test(t)) return true;
  return false;
}

export function parseTokenQty(amount: string) {
  const n = Number(String(amount).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
