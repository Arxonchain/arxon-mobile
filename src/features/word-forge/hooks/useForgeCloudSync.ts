import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  loadForgeProgress, saveForgeProgress, progressFromCloud, progressToCloud, mergeForgeProgress, type ForgeProgress,
} from './useForgeProgress';

export function useForgeCloudSync(preview = false) {
  const { user } = useAuth();
  const syncedRef = useRef<string | null>(null);

  const pull = useCallback(async (): Promise<ForgeProgress | null> => {
    if (preview || !user) return null;
    const { data, error } = await supabase
      .from('word_forge_progress')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      console.warn('[ForgeCloudSync] pull failed:', error.message);
      return null;
    }
    if (!data) return null;
    const cloud = progressFromCloud(data as Record<string, unknown>);
    const local = loadForgeProgress(false);
    const merged = mergeForgeProgress(local, cloud);
    saveForgeProgress(merged, false);
    return merged;
  }, [preview, user]);

  const push = useCallback(async (patch: Partial<ForgeProgress>) => {
    if (preview || !user) return;
    const next = saveForgeProgress(patch, false);
    const cloudFields = progressToCloud(next);
    const { error } = await supabase.rpc('sync_word_forge_consumables', {
      p_hints_left: cloudFields.hints_left as number,
      p_shuffles_left: cloudFields.shuffles_left as number,
      p_tutorial_completed: cloudFields.tutorial_completed as boolean,
      p_daily_completed_date: (cloudFields.daily_completed_date as string) || null,
      p_daily_streak: cloudFields.daily_streak as number,
      p_unlocked_skins: cloudFields.unlocked_skins as number,
    });
    if (error) console.warn('[ForgeCloudSync] push failed:', error.message);
  }, [preview, user]);

  useEffect(() => {
    if (preview || !user) return;
    if (syncedRef.current === user.id) return;
    syncedRef.current = user.id;
    void pull();
  }, [preview, user, pull]);

  return { pull, push };
}
