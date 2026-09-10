import { getBattleOptions, type ArenaBattleOptionsSource } from './arenaOptions';

export function getArenaPoolStats(battle: ArenaBattleOptionsSource) {
  const options = getBattleOptions(battle);
  const total = options.reduce((sum, o) => sum + o.power, 0);
  const equalPct = options.length > 0 ? Math.round(100 / options.length) : 50;

  const withPct = options.map((o) => ({
    ...o,
    pct: total > 0 ? Math.round((o.power / total) * 100) : equalPct,
  }));

  const optA = withPct.find((o) => o.id === 'a');
  const optB = withPct.find((o) => o.id === 'b');
  const optC = withPct.find((o) => o.id === 'c');

  return {
    total,
    options: withPct,
    hasSideC: options.length > 2,
    pctA: optA?.pct ?? (options.length > 2 ? equalPct : 50),
    pctB: optB?.pct ?? (options.length > 2 ? equalPct : 50),
    pctC: optC?.pct ?? 0,
    powC: optC?.power ?? 0,
  };
}
