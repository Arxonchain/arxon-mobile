const RETRY_STATUS = new Set([502, 503, 504, 520, 521, 522, 524]);
const MAX_ATTEMPTS = 3;

/** Retry idempotent-safe requests when Supabase edge/API is recovering. */
export async function resilientFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const canRetry = method === 'GET' || method === 'HEAD';

  let last: Response | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(input, init);
      last = res;
      if (!canRetry || res.ok || !RETRY_STATUS.has(res.status) || attempt === MAX_ATTEMPTS - 1) {
        return res;
      }
    } catch (err) {
      if (!canRetry || attempt === MAX_ATTEMPTS - 1) throw err;
    }
    await new Promise((r) => window.setTimeout(r, 400 * (attempt + 1)));
  }
  return last ?? fetch(input, init);
}
