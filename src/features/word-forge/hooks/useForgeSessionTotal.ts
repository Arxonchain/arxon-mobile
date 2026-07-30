const SESSION_TOTAL_KEY = 'word-forge-run-total';

export function loadForgeSessionTotal(): number {
  try {
    const raw = sessionStorage.getItem(SESSION_TOTAL_KEY);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  } catch {
    return 0;
  }
}

export function saveForgeSessionTotal(total: number): void {
  try {
    sessionStorage.setItem(SESSION_TOTAL_KEY, String(Math.max(0, Math.round(total))));
  } catch { /* ignore */ }
}

export function clearForgeSessionTotal(): void {
  try {
    sessionStorage.removeItem(SESSION_TOTAL_KEY);
  } catch { /* ignore */ }
}
