export type DisclosureCode = {
  code: string;
  at: number;
  who: string;
  note: string;
  used: boolean;
};

const KEY = 'arxon.disclosureCodes';

function load(): DisclosureCode[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]') as DisclosureCode[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(rows: DisclosureCode[]) {
  localStorage.setItem(KEY, JSON.stringify(rows.slice(0, 40)));
}

function mintCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const chunk = () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `ARX-${chunk()}-${chunk()}-${chunk()}`;
}

export function listDisclosureCodes() {
  return load();
}

export function createDisclosureCode(who: string, note: string): DisclosureCode {
  const row: DisclosureCode = {
    code: mintCode(),
    at: Date.now(),
    who: who.trim() || 'Other',
    note: note.trim().slice(0, 280),
    used: false,
  };
  save([row, ...load()]);
  return row;
}

export function markDisclosureUsed(code: string) {
  save(load().map((row) => (row.code === code ? { ...row, used: true } : row)));
}
