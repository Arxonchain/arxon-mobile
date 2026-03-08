import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cacheGet, cacheSet } from "@/lib/localCache";
import { useAuth } from "./useAuth";

const cacheKey = (userId: string) => `arxon:arena_boost_total:v2:${userId}`;

export const useArenaBoostTotal = () => {
  const { user } = useAuth();
  const [totalArenaBoost, setTotalArenaBoost] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchTotal = useCallback(async () => {
    if (!user) {
      setTotalArenaBoost(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("arena_boosts")
        .select("boost_percentage")
        .eq("user_id", user.id)
        .gte("expires_at", new Date().toISOString());

      if (error) throw error;

      const total = (data ?? []).reduce((sum, row) => sum + (row.boost_percentage || 0), 0);
      setTotalArenaBoost(total);
      cacheSet(cacheKey(user.id), total);
    } catch (e) {
      // Keep cached/previous value on error
      console.error("Error fetching arena boost total:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const userId = user?.id;

    if (!userId) {
      setTotalArenaBoost(0);
      setLoading(false);
      return;
    }

    const cached = cacheGet<number>(cacheKey(userId), { maxAgeMs: 5 * 60_000 });
    if (cached?.data !== undefined) {
      setTotalArenaBoost(cached.data);
      setLoading(false);
    }

    void fetchTotal();
  }, [fetchTotal, user?.id]);

  return { totalArenaBoost, loading, refresh: fetchTotal };
};
