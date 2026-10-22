const KEY = 'arxon.browse.history';
const MAX = 20;

export type BrowseVisit = { title: string; url: string; at: number };

export function readBrowseHistory(): BrowseVisit[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BrowseVisit[];
    return Array.isArray(parsed) ? parsed.filter((row) => row?.url) : [];
  } catch {
    return [];
  }
}

export function recordBrowseVisit(title: string, url: string) {
  const label = (title.trim() || hostOf(url)).replace(/\s+/g, ' ').slice(0, 48);
  const next: BrowseVisit[] = [
    { title: label, url, at: Date.now() },
    ...readBrowseHistory().filter((row) => row.url !== url),
  ].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0] || url;
  }
}

export function toBrowseUrl(raw: string) {
  const q = raw.trim();
  if (!q) return null;
  if (/^https?:\/\//i.test(q)) return q;
  if (/^[\w.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(q) && !/\s/.test(q)) return `https://${q}`;
  return `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
}
