import { supabase } from '@/integrations/supabase/client';
import type { RunRecord } from '../engine/types';

export async function saveDepthWatchRun(
  userId: string,
  levelReached: number,
  survivalSeconds: number,
  characterId: string,
): Promise<void> {
  const { error } = await supabase.from('depth_watch_runs' as never).insert({
    user_id: userId,
    level_reached: levelReached,
    survival_seconds: survivalSeconds,
    character_id: characterId,
  } as never);
  if (error) {
    console.warn('[DepthWatch] Failed to save run:', error.message);
  }
}

export async function fetchDepthWatchLeaderboard(limit = 20): Promise<RunRecord[]> {
  const { data, error } = await supabase
    .from('depth_watch_runs' as never)
    .select('id,user_id,level_reached,survival_seconds,character_id,created_at')
    .order('level_reached', { ascending: false })
    .order('survival_seconds', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[DepthWatch] Leaderboard fetch failed:', error.message);
    return [];
  }
  return (data ?? []) as RunRecord[];
}

export async function fetchUserBestRun(userId: string): Promise<RunRecord | null> {
  const { data, error } = await supabase
    .from('depth_watch_runs' as never)
    .select('*')
    .eq('user_id', userId)
    .order('level_reached', { ascending: false })
    .order('survival_seconds', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('[DepthWatch] Best run fetch failed:', error.message);
    return null;
  }
  return (data as RunRecord | null) ?? null;
}

export async function fetchUnlockedCharacters(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('depth_watch_unlocks' as never)
    .select('character_id')
    .eq('user_id', userId);
  if (error) return new Set();
  return new Set((data ?? []).map((r: { character_id: string }) => r.character_id));
}

export async function unlockCharacter(userId: string, characterId: string): Promise<void> {
  await supabase.from('depth_watch_unlocks' as never).upsert({
    user_id: userId,
    character_id: characterId,
  } as never, { onConflict: 'user_id,character_id' });
}
