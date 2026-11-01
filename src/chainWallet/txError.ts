/** Turn a chain or library error into one short line for the review screen. */
export function plainTxError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || '');
  const msg = raw.replace(/\s+/g, ' ').trim();
  if (/insufficient funds|gas required exceeds|exceeds the balance/i.test(msg)) {
    return 'Not enough for the amount and network fee.';
  }
  if (/user rejected|denied signature|rejected the request/i.test(msg)) return 'Send cancelled.';
  if (/timeout|timed out|\babort/i.test(msg)) return 'The network took too long. Try again.';
  if (/nonce too low|replacement transaction underpriced/i.test(msg)) return 'A previous send is still pending.';
  if (/dust/i.test(msg)) return 'That amount is too small to send.';
  const cut = msg
    .split(/Request Arguments|Version:|Details:/i)[0]
    .replace(/^Ethereum (send|RPC) failed:\s*/i, '')
    .replace(/\s*\(https?:\/\/[^)]+\)\s*/g, ' ')
    .trim();
  if (!cut) return 'Send failed.';
  if (cut.length > 90) return 'Send failed. Check the amount and try again.';
  return cut;
}
