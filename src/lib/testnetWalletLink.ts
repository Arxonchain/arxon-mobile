const linkKey = (userId: string) => `arxon.testnetWalletLink.${userId}`;
const histKey = (userId: string) => `arxon.testnetTaskHistory.${userId}`;

export type LinkedTestnetWallet = {
  address: string;
  linkedAt: number;
};

export type TestnetTaskHistoryItem = {
  id: string;
  key: string;
  label: string;
  utcDate: string;
  at: number;
};

export function readTestnetLink(userId: string): LinkedTestnetWallet | null {
  try {
    const raw = window.localStorage.getItem(linkKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LinkedTestnetWallet;
    if (!parsed?.address) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeTestnetLink(userId: string, address: string): LinkedTestnetWallet {
  const next: LinkedTestnetWallet = { address: address.toLowerCase(), linkedAt: Date.now() };
  window.localStorage.setItem(linkKey(userId), JSON.stringify(next));
  window.dispatchEvent(new Event('arxon-wallet-linked'));
  return next;
}

export function clearTestnetLink(userId: string) {
  window.localStorage.removeItem(linkKey(userId));
}

export function readTaskHistory(userId: string): TestnetTaskHistoryItem[] {
  try {
    const raw = window.localStorage.getItem(histKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TestnetTaskHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function upsertTaskHistory(userId: string, items: TestnetTaskHistoryItem[]) {
  const prev = readTaskHistory(userId);
  const map = new Map(prev.map((row) => [row.id, row]));
  for (const item of items) map.set(item.id, item);
  const next = [...map.values()].sort((a, b) => b.at - a.at).slice(0, 80);
  window.localStorage.setItem(histKey(userId), JSON.stringify(next));
  return next;
}

export function shortAddress(address: string) {
  if (address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
