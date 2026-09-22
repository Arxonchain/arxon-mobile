import type { Session } from '@supabase/supabase-js';

const BACKUP_KEY = 'arxon-auth-session-backup-v1';
const STORAGE_KEY = 'arxon-auth-session';

function parseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Session | { currentSession?: Session | null };
    if (data && typeof data === 'object' && 'access_token' in data) {
      return data as Session;
    }
    if (data && typeof data === 'object' && 'currentSession' in data) {
      return (data as { currentSession?: Session | null }).currentSession ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

export function sessionStillValid(session: Session | null, skewSeconds = 90): boolean {
  if (!session?.access_token || !session.user?.id) return false;
  const exp = session.expires_at;
  if (!exp) return true;
  return exp * 1000 > Date.now() + skewSeconds * 1000;
}

export function readPrimaryStoredSession(): Session | null {
  try {
    return parseSession(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function readBackupSession(): Session | null {
  try {
    return parseSession(window.localStorage.getItem(BACKUP_KEY));
  } catch {
    return null;
  }
}

export function backupAuthSession(session: Session | null): void {
  if (!session || !sessionStillValid(session, 0)) {
    try {
      window.localStorage.removeItem(BACKUP_KEY);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    window.localStorage.setItem(BACKUP_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function clearAuthSessionBackup(): void {
  try {
    window.localStorage.removeItem(BACKUP_KEY);
  } catch {
    /* ignore */
  }
}

/** Best local session when Auth API is slow/down (primary storage, then backup). */
export function readBestLocalSession(): Session | null {
  const primary = readPrimaryStoredSession();
  if (sessionStillValid(primary)) return primary;
  const backup = readBackupSession();
  if (sessionStillValid(backup)) return backup;
  return null;
}
