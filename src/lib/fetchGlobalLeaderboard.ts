import { supabase } from '@/integrations/supabase/client';

export interface GlobalLeaderboardEntry {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  total_points: number;
  daily_streak?: number;
}

/**
 * Global mining leaderboard — always user_points.total_points (same source as mobile).
 * Falls back to leaderboard_view if user_points RLS blocks anon reads.
 */
export async function fetchGlobalLeaderboard(
  limit: number,
): Promise<{ entries: GlobalLeaderboardEntry[]; blocked: boolean }> {
  const { data: pts, error: ptsErr } = await supabase
    .from('user_points')
    .select('user_id, total_points, daily_streak')
    .order('total_points', { ascending: false })
    .limit(limit);

  if (!ptsErr && pts?.length) {
    const userIds = pts.map((p) => p.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, username, avatar_url')
      .in('user_id', userIds);

    const profMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    return {
      blocked: false,
      entries: pts.map((p) => ({
        user_id: p.user_id,
        username: profMap.get(p.user_id)?.username ?? null,
        avatar_url: profMap.get(p.user_id)?.avatar_url ?? null,
        total_points: Math.round(Number(p.total_points) || 0),
        daily_streak: p.daily_streak ?? 0,
      })),
    };
  }

  const { data: viewData, error: viewErr } = await supabase
    .from('leaderboard_view')
    .select('user_id, username, avatar_url, total_points, daily_streak')
    .order('total_points', { ascending: false })
    .limit(limit);

  if (viewErr || !viewData?.length) {
    return { blocked: true, entries: [] };
  }

  return {
    blocked: false,
    entries: viewData.map((entry) => ({
      user_id: entry.user_id || '',
      username: entry.username ?? null,
      avatar_url: entry.avatar_url ?? null,
      total_points: Math.round(Number(entry.total_points) || 0),
      daily_streak: entry.daily_streak ?? 0,
    })),
  };
}
