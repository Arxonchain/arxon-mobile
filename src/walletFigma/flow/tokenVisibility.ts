import type { WalletNet } from './WalletTabs';

const KEY = (net: WalletNet) => `arxon.hiddenTokens.${net}`;

export function hiddenTokens(net: WalletNet): string[] {
  try {
    const rows = JSON.parse(localStorage.getItem(KEY(net)) || '[]');
    return Array.isArray(rows) ? rows.filter((row): row is string => typeof row === 'string') : [];
  } catch {
    return [];
  }
}

export function setTokenHidden(net: WalletNet, symbol: string, hidden: boolean) {
  const rest = hiddenTokens(net).filter((row) => row !== symbol);
  localStorage.setItem(KEY(net), JSON.stringify(hidden ? [...rest, symbol] : rest));
}

export function visibleTokens<T extends { symbol?: string }>(net: WalletNet, rows: T[]): T[] {
  const hidden = hiddenTokens(net);
  return rows.filter((row) => !row.symbol || !hidden.includes(row.symbol));
}
