/** Shared helpers for arena battle vote options (2+ sides). */

export type ArenaVoteOption = {
  id: string;
  name: string;
  color: string;
  power: number;
};

export type ArenaBattleOptionsSource = {
  vote_options?: unknown;
  side_a_name: string;
  side_a_color?: string | null;
  side_a_power?: number | null;
  side_b_name: string;
  side_b_color?: string | null;
  side_b_power?: number | null;
  side_c_name?: string | null;
  side_c_color?: string | null;
  side_c_power?: number | null;
};

export type ArenaSideId = string;

export const DEFAULT_OPTION_COLORS = [
  '#4ade80',
  '#f87171',
  '#FFD700',
  '#60a5fa',
  '#c084fc',
  '#fb923c',
  '#2dd4bf',
  '#f472b6',
  '#a3e635',
  '#818cf8',
] as const;

const MAX_OPTIONS = 26;

export function optionIdForIndex(index: number): string {
  return String.fromCharCode('a'.charCodeAt(0) + index);
}

export function nextOptionId(existingIds: string[]): string {
  for (let i = 0; i < MAX_OPTIONS; i++) {
    const id = optionIdForIndex(i);
    if (!existingIds.includes(id)) return id;
  }
  throw new Error('Maximum vote options reached');
}

export function defaultColorForIndex(index: number): string {
  return DEFAULT_OPTION_COLORS[index % DEFAULT_OPTION_COLORS.length];
}

function normalizeOption(raw: unknown): ArenaVoteOption | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === 'string' ? row.id.trim() : '';
  const name = typeof row.name === 'string' ? row.name.trim() : '';
  if (!id || !name) return null;
  return {
    id,
    name,
    color: typeof row.color === 'string' && row.color ? row.color : defaultColorForIndex(0),
    power: Number(row.power) || 0,
  };
}

export function parseVoteOptions(raw: unknown): ArenaVoteOption[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const parsed = raw.map(normalizeOption).filter((o): o is ArenaVoteOption => o !== null);
  return parsed.length >= 2 ? parsed : null;
}

/** Effective options: vote_options JSONB when present, else legacy side_a/b/c columns. */
export function getBattleOptions(battle: ArenaBattleOptionsSource): ArenaVoteOption[] {
  const fromJson = parseVoteOptions(battle.vote_options);
  if (fromJson) return fromJson;

  const options: ArenaVoteOption[] = [
    {
      id: 'a',
      name: battle.side_a_name,
      color: battle.side_a_color || defaultColorForIndex(0),
      power: Number(battle.side_a_power) || 0,
    },
    {
      id: 'b',
      name: battle.side_b_name,
      color: battle.side_b_color || defaultColorForIndex(1),
      power: Number(battle.side_b_power) || 0,
    },
  ];

  if (battle.side_c_name && battle.side_c_name.trim()) {
    options.push({
      id: 'c',
      name: battle.side_c_name.trim(),
      color: battle.side_c_color || defaultColorForIndex(2),
      power: Number(battle.side_c_power) || 0,
    });
  }

  return options;
}

export function getOptionById(
  battle: ArenaBattleOptionsSource,
  sideId: string,
): ArenaVoteOption | undefined {
  return getBattleOptions(battle).find((o) => o.id === sideId);
}

export function getOptionName(battle: ArenaBattleOptionsSource, sideId: string): string {
  if (sideId === 'none') return 'Void / Tie';
  return getOptionById(battle, sideId)?.name || `Option ${sideId.toUpperCase()}`;
}

export function getOptionColor(battle: ArenaBattleOptionsSource, sideId: string): string {
  const opt = getOptionById(battle, sideId);
  if (opt) return opt.color;
  const idx = sideId.charCodeAt(0) - 'a'.charCodeAt(0);
  return defaultColorForIndex(idx >= 0 ? idx : 0);
}

export function getTotalBattlePower(battle: ArenaBattleOptionsSource): number {
  return getBattleOptions(battle).reduce((sum, o) => sum + o.power, 0);
}

export function isValidBattleSide(battle: ArenaBattleOptionsSource, sideId: string): boolean {
  return getBattleOptions(battle).some((o) => o.id === sideId);
}

export type ArenaOptionDraft = {
  id: string;
  name: string;
  color: string;
};

/** Build vote_options JSON + legacy side_a/b/c columns for inserts/updates. */
export function buildBattleOptionsPayload(
  drafts: ArenaOptionDraft[],
  existingPowerById: Record<string, number> = {},
): {
  vote_options: ArenaVoteOption[];
  side_a_name: string;
  side_a_color: string;
  side_a_power: number;
  side_b_name: string;
  side_b_color: string;
  side_b_power: number;
  side_c_name: string | null;
  side_c_color: string | null;
  side_c_power: number;
} {
  const trimmed = drafts
    .map((d, i) => ({
      id: d.id || optionIdForIndex(i),
      name: d.name.trim(),
      color: d.color || defaultColorForIndex(i),
    }))
    .filter((d) => d.name);

  if (trimmed.length < 2) {
    throw new Error('At least 2 vote options are required');
  }

  const vote_options: ArenaVoteOption[] = trimmed.map((d, i) => ({
    id: d.id || optionIdForIndex(i),
    name: d.name,
    color: d.color,
    power: existingPowerById[d.id] ?? 0,
  }));

  const a = vote_options[0];
  const b = vote_options[1];
  const c = vote_options[2];

  return {
    vote_options,
    side_a_name: a.name,
    side_a_color: a.color,
    side_a_power: a.power,
    side_b_name: b.name,
    side_b_color: b.color,
    side_b_power: b.power,
    side_c_name: c?.name ?? null,
    side_c_color: c?.color ?? null,
    side_c_power: c?.power ?? 0,
  };
}

export function draftsFromBattle(battle: ArenaBattleOptionsSource): ArenaOptionDraft[] {
  return getBattleOptions(battle).map(({ id, name, color }) => ({ id, name, color }));
}

export function createEmptyOptionDrafts(count = 2): ArenaOptionDraft[] {
  return Array.from({ length: count }, (_, i) => ({
    id: optionIdForIndex(i),
    name: '',
    color: defaultColorForIndex(i),
  }));
}
