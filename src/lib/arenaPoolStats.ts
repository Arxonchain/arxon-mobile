export function getArenaPoolStats(battle: {
  side_a_power?: number;
  side_b_power?: number;
  side_c_power?: number | null;
  side_c_name?: string | null;
}) {
  const hasSideC = !!battle.side_c_name;
  const powC = hasSideC ? Number(battle.side_c_power ?? 0) : 0;
  const powA = Number(battle.side_a_power ?? 0);
  const powB = Number(battle.side_b_power ?? 0);
  const total = powA + powB + powC;
  if (total <= 0) {
    return { total: 0, pctA: hasSideC ? 33 : 50, pctB: hasSideC ? 33 : 50, pctC: hasSideC ? 34 : 0, hasSideC, powC };
  }
  return {
    total,
    pctA: Math.round((powA / total) * 100),
    pctB: Math.round((powB / total) * 100),
    pctC: hasSideC ? Math.round((powC / total) * 100) : 0,
    hasSideC,
    powC,
  };
}
