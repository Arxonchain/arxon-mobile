export type SupportReport = {
  at: number;
  kind: string;
  note: string;
  version: string;
  device: string;
};

const KEY = 'arxon.supportReports';

export function saveSupportReport(input: { kind: string; note: string; diagnostics: boolean }) {
  const report: SupportReport = {
    at: Date.now(),
    kind: input.kind,
    note: input.note.trim().slice(0, 2000),
    version: input.diagnostics ? '1.0.0' : 'omitted',
    device: input.diagnostics ? navigator.userAgent.slice(0, 180) : 'omitted',
  };
  let prev: SupportReport[] = [];
  try {
    prev = JSON.parse(localStorage.getItem(KEY) ?? '[]') as SupportReport[];
  } catch {
    prev = [];
  }
  localStorage.setItem(KEY, JSON.stringify([report, ...prev].slice(0, 20)));
  return report;
}
