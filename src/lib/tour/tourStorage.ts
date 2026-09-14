const STORAGE_KEY = 'arxon_app_tour_v1';
const ACTIVE_KEY = 'arxon_app_tour_active';

export type TourStepId = 'welcome' | 'verify' | 'tasks' | 'mining';

export type TourProgress = {
  version: 1;
  finishedAt: string | null;
  skippedAt: string | null;
  lastStep: TourStepId | null;
};

function emptyProgress(): TourProgress {
  return { version: 1, finishedAt: null, skippedAt: null, lastStep: null };
}

export function loadTourProgress(userId: string): TourProgress {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${userId}`);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as TourProgress;
    if (parsed.version !== 1) return emptyProgress();
    return parsed;
  } catch {
    return emptyProgress();
  }
}

export function saveTourProgress(userId: string, progress: TourProgress) {
  try {
    localStorage.setItem(`${STORAGE_KEY}:${userId}`, JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

export function resetTourProgress(userId: string) {
  try {
    localStorage.removeItem(`${STORAGE_KEY}:${userId}`);
  } catch {
    /* ignore */
  }
}

export function isTourFinished(userId: string): boolean {
  const p = loadTourProgress(userId);
  return Boolean(p.finishedAt || p.skippedAt);
}

export function markTourFinished(userId: string, lastStep: TourStepId) {
  saveTourProgress(userId, {
    version: 1,
    finishedAt: new Date().toISOString(),
    skippedAt: null,
    lastStep,
  });
  setAppTourActive(false);
}

export function markTourSkipped(userId: string, lastStep: TourStepId | null) {
  saveTourProgress(userId, {
    version: 1,
    finishedAt: null,
    skippedAt: new Date().toISOString(),
    lastStep,
  });
  setAppTourActive(false);
}

export function setAppTourActive(active: boolean) {
  try {
    if (active) sessionStorage.setItem(ACTIVE_KEY, '1');
    else sessionStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

export function isAppTourBlockingOverlays(): boolean {
  try {
    return sessionStorage.getItem(ACTIVE_KEY) === '1';
  } catch {
    return false;
  }
}
