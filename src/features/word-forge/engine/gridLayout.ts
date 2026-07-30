export interface GridLayout {
  cols: number;
  rows: number;
  label: string;
}

/** Square-ish grid for letter tiles in the playfield void */
export function gridLayoutForCount(count: number): GridLayout {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  return { cols, rows, label: `${cols}×${rows} Forge Grid` };
}
