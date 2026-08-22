/**
 * k6: bounded arena RPC read load (PostgREST rpc/*).
 *
 * Env:
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 *   SUPABASE_USER_JWT   optional — authenticated RPCs; omit for anon-only checks
 *
 * Example:
 *   k6 run -u 10 -d 30s loadtests/k6/arena-rpcs.js
 */
import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = (__ENV.SUPABASE_URL || "").replace(/\/$/, "");
const anonKey = __ENV.SUPABASE_ANON_KEY || "";
const userJwt = __ENV.SUPABASE_USER_JWT || "";

export const options = {
  vus: Number(__ENV.K6_VUS || 10),
  duration: __ENV.K6_DURATION || "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
    checks: ["rate>0.95"],
  },
};

const RPCS = [
  { name: 'get_arena_analytics', body: {} },
  { name: 'get_arena_staker_leaderboard', body: { p_limit: 50 } },
];

function rpcHeaders() {
  const token = userJwt || anonKey;
  return {
    "Content-Type": "application/json",
    apikey: anonKey,
    Authorization: `Bearer ${token}`,
  };
}

export function setup() {
  if (!baseUrl || !anonKey) {
    throw new Error("Set SUPABASE_URL and SUPABASE_ANON_KEY");
  }
  const res = http.get(
    `${baseUrl}/rest/v1/arena_battles?select=id&order=created_at.desc&limit=1`,
    { headers: rpcHeaders() }
  );
  let battleId = null;
  if (res.status === 200) {
    try {
      const rows = res.json();
      battleId = rows?.[0]?.id ?? null;
    } catch {
      battleId = null;
    }
  }
  return { battleId };
}

export default function (data) {
  const rpcs = [...RPCS];
  if (data?.battleId) {
    rpcs.push(
      { name: "get_recent_battle_votes", body: { p_battle_id: data.battleId, p_limit: 50 } },
      { name: "get_battle_vote_summary", body: { p_battle_id: data.battleId } }
    );
  }

  for (const rpc of rpcs) {
    const res = http.post(
      `${baseUrl}/rest/v1/rpc/${rpc.name}`,
      JSON.stringify(rpc.body),
      {
        headers: rpcHeaders(),
        tags: { name: rpc.name },
      }
    );

    check(res, {
      [`${rpc.name} ok`]: (r) => r.status === 200,
      [`${rpc.name} bounded payload`]: (r) => {
        if (r.status !== 200) return true;
        try {
          const body = r.json();
          if (Array.isArray(body)) return body.length <= 500;
          return true;
        } catch {
          return false;
        }
      },
    });
  }

  sleep(0.2);
}
