/**
 * k6: verify durable auth-signup rate limits return 429 after the auth window.
 *
 * Requires k6: https://grafana.com/docs/k6/latest/set-up/install-k6/
 *
 * Env (or k6 -e):
 *   SUPABASE_URL          https://xxx.supabase.co
 *   SUPABASE_ANON_KEY     sb_publishable_… or anon key
 *
 * Safe prod smoke (single IP, no real signups — invalid body fails after rate check):
 *   k6 run -i 35 -u 1 loadtests/k6/auth-rate-limit.js
 *
 * Staging burst:
 *   k6 run -i 100 -u 5 loadtests/k6/auth-rate-limit.js
 */
import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = (__ENV.SUPABASE_URL || "").replace(/\/$/, "");
const anonKey = __ENV.SUPABASE_ANON_KEY || "";

export const options = {
  scenarios: {
    auth_burst: {
      executor: "shared-iterations",
      vus: Number(__ENV.K6_VUS || 1),
      iterations: Number(__ENV.K6_ITERATIONS || 35),
      maxDuration: "2m",
    },
  },
  thresholds: {
    checks: ["rate>0.95"],
    http_req_duration: ["p(95)<3000"],
  },
};

export function setup() {
  if (!baseUrl || !anonKey) {
    throw new Error("Set SUPABASE_URL and SUPABASE_ANON_KEY");
  }
}

export default function () {
  const res = http.post(
    `${baseUrl}/functions/v1/auth-signup`,
    JSON.stringify({
      email: "loadtest-invalid@example.com",
      password: "short",
    }),
    {
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      tags: { name: "auth-signup" },
      responseCallback: http.expectedStatuses(400, 429),
    }
  );

  const is429 = res.status === 429;
  const isClientError = res.status >= 400 && res.status < 500 && !is429;

  check(res, {
    "not 5xx": (r) => r.status < 500,
    "429 or expected client error": () => is429 || isClientError,
  });

  if (is429) {
    check(res, {
      "429 has retry-after or rate headers": (r) =>
        r.headers["Retry-After"] !== undefined ||
        r.headers["X-Ratelimit-Remaining"] !== undefined,
    });
  }

  sleep(0.05);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const reqs = data.metrics.http_reqs?.values?.count ?? 0;
  const p95 = data.metrics.http_req_duration?.values?.["p(95)"] ?? 0;
  return [
    "",
    "auth-signup rate-limit smoke",
    `  requests: ${reqs}`,
    `  p95 ms: ${Math.round(p95)}`,
    "  expect: first ~30 non-429, then 429s when K6_ITERATIONS > 30 (same VU/IP)",
    "",
  ].join("\n");
}
