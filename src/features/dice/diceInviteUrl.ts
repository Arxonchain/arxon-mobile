/** Brand-domain short links for Dice invites (web lander → open app / paste code).
 *
 * Scheme (arxonchain.xyz):
 *   Duel:   https://arxonchain.xyz/d/{CODE}
 *   Rumble: https://arxonchain.xyz/r/{CODE}
 *
 * Referral links stay separate: https://arxonchain.xyz/?ref=ARX-XXXXXX
 */

export type DiceInviteMode = 'duel' | 'rumble';

export const SHARE_ORIGIN = 'https://arxonchain.xyz';

const MODE_PREFIX: Record<DiceInviteMode, string> = {
  duel: 'd',
  rumble: 'r',
};

const PREFIX_MODE: Record<string, DiceInviteMode> = {
  d: 'duel',
  r: 'rumble',
};

export function buildDiceInviteUrl(mode: DiceInviteMode, code: string): string {
  const prefix = MODE_PREFIX[mode];
  const cleaned = code.trim().toUpperCase();
  return `${SHARE_ORIGIN}/${prefix}/${encodeURIComponent(cleaned)}`;
}

/** Map short path `/d/ABC` or `/r/ABC` → in-app lobby with ?code=. */
export function lobbyPathForDiceInvite(mode: DiceInviteMode, code: string): string {
  const cleaned = code.trim().toUpperCase();
  const base = mode === 'duel' ? '/arena/dice/duel' : '/arena/dice/rumble';
  return `${base}?code=${encodeURIComponent(cleaned)}`;
}

/** Parse short invite path from a URL or pathname. */
export function parseDiceInviteUrl(urlOrPath: string): { mode: DiceInviteMode; code: string } | null {
  try {
    const raw = urlOrPath.trim();
    if (!raw) return null;

    let pathname = raw;
    if (/^https?:\/\//i.test(raw) || raw.startsWith('//')) {
      pathname = new URL(raw, SHARE_ORIGIN).pathname;
    } else if (raw.startsWith('#')) {
      // HashRouter style: #/d/CODE or #/arena/...
      pathname = raw.slice(1).split('?')[0] || '/';
    }

    const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    if (parts.length < 2) return null;

    const mode = PREFIX_MODE[parts[0].toLowerCase()];
    if (!mode) return null;

    const code = decodeURIComponent(parts[1]).trim().toUpperCase();
    if (!code || code.length > 32) return null;
    return { mode, code };
  } catch {
    return null;
  }
}
