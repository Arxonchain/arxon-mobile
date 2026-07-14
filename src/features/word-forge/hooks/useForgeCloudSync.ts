import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  loadForgeProgress, saveForgeProgress, progressFromCloud, progressToCloud, type ForgeProgress,
} from './useForgeProgress';

export function useForgeCloudSync(preview = false) {
  const { user } = useAuth();
  const syncedRef = useRef(false);

  const pull = useCallback(async (): Promise<ForgeProgress | null> => {
    if (preview || !user) return null;
    const { data, error } = await supabase
      .from('word_forge_progress' as 'user_points')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error || !data) return null;
    const cloud = progressFromCloud(data as Record<string, unknown>);
    const local = loadForgeProgress(false);
    const merged = cloud.bestLevel >= local.bestLevel ? cloud : { ...cloud, ...local, bestLevel: Math.max(cloud.bestLevel, local.bestLevel) };
    saveForgeProgress(merged, false);
    return merged;
  }, [preview, user]);

  const push = useCallback(async (patch: Partial<ForgeProgress>) => {
    if (preview || !user) return;
    const next = saveForgeProgress(patch, false);
    await supabase
      .from('word_forge_progress' as 'user_points')
      .upsert({ user_id: user.id, ...progressToCloud(next), updated_at: new Date().toISOString() } as never, { onConflict: 'user_id' });
  }, [preview, user]);

  useEffect(() => {
    if (preview || !user || syncedRef.current) return;
    syncedRef.current = true;
    void pull();
  }, [preview, user, pull]);

  return { pull, push };
}
