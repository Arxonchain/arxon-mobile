type BackendHealthStatus = 'up' | 'down';

type BackendHealthState = {
  status: BackendHealthStatus;
  consecutiveFailures: number;
  lastErrorMessage?: string;
  lastErrorAt?: number;
  nextRetryAt?: number;
};

type Listener = () => void;

const listeners = new Set<Listener>();
let installed = false;

// Require more failures before opening circuit (avoids single transient glitch)
const FAILURE_THRESHOLD = 3;
const BASE_COOLDOWN_MS = 3_000;
const MAX_COOLDOWN_MS = 30_000;

let state: BackendHealthState = {
  status: 'up',
  consecutiveFailures: 0,
};

function emit() {
  for (const l of listeners) l();
}

function setState(next: BackendHealthState) {
  state = next;
  emit();
}

export class BackendUnavailableError extends Error {
  retryAfterMs: number;

  constructor(retryAfterMs: number) {
    const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    super(`Service temporarily unavailable. Retrying in ${seconds}s.`);
    this.name = 'BackendUnavailableError';
    this.retryAfterMs = retryAfterMs;
  }
}

export function getBackendHealthState(): BackendHealthState {
  return state;
}

export function subscribeBackendHealth(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isBackendCircuitOpen(now = Date.now()) {
  return state.status === 'down' && typeof state.nextRetryAt === 'number' && now < state.nextRetryAt;
}

export function resetBackendCircuit() {
  setState({
    status: 'up',
    consecutiveFailures: 0,
  });
}

function markFailure(message: string) {
  const now = Date.now();
  const consecutiveFailures = Math.min(state.consecutiveFailures + 1, 50);

  // Only open circuit after meeting threshold
  if (consecutiveFailures >= FAILURE_THRESHOLD) {
    const cooldown = Math.min(BASE_COOLDOWN_MS * 2 ** Math.max(0, consecutiveFailures - FAILURE_THRESHOLD), MAX_COOLDOWN_MS);

    setState({
      status: 'down',
      consecutiveFailures,
      lastErrorMessage: message,
      lastErrorAt: now,
      nextRetryAt: now + cooldown,
    });
  } else {
    // Below threshold: increment failures but stay up
    setState({
      ...state,
      consecutiveFailures,
      lastErrorMessage: message,
      lastErrorAt: now,
    });
  }
}

function markSuccess() {
  if (state.consecutiveFailures === 0 && state.status === 'up') return;
  resetBackendCircuit();
}

function isAbortError(err: unknown) {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as any).name === 'AbortError'
  );
}

function getUrlFromFetchArgs(input: RequestInfo | URL): string | null {
  try {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.toString();
    // Request
    return (input as Request).url ?? null;
  } catch {
    return null;
  }
}

export function installBackendFetchGuard() {
  if (installed) return;
  installed = true;

  // Guard only requests to the backend origin.
  let backendOrigin: string | null = null;
  try {
    backendOrigin = new URL(import.meta.env.VITE_SUPABASE_URL).origin;
  } catch {
    backendOrigin = null;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = getUrlFromFetchArgs(input);

    // Guard only REST/function traffic; never block auth/session bootstrap.
    const shouldGuard =
      !!backendOrigin &&
      !!url &&
      url.startsWith(backendOrigin) &&
      !url.includes('/auth/v1') &&
      !url.includes('/realtime/v1');

    if (shouldGuard && isBackendCircuitOpen()) {
      const retryAfterMs = Math.max(1_000, (state.nextRetryAt ?? Date.now()) - Date.now());
      throw new BackendUnavailableError(retryAfterMs);
    }

    try {
      const res = await originalFetch(input, init);

      if (shouldGuard) {
        // Treat backend 5xx/429 as outage signals.
        if (res.status >= 500 || res.status === 429) {
          markFailure(`HTTP ${res.status}`);
        } else {
          markSuccess();
        }
      }

      return res;
    } catch (err: any) {
      if (shouldGuard && !(err instanceof BackendUnavailableError) && !isAbortError(err)) {
        markFailure(err?.message || 'Network error');
      }
      throw err;
    }
  };
}
