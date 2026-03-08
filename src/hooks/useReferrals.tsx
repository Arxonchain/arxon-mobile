import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { cacheGet, cacheSet } from '@/lib/localCache';
import { withTimeout } from '@/lib/utils';
import { ensureProfileFields } from '@/lib/profile/ensureProfileFields';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ReferralData {
  id: string;
  referred_id: string;
  referral_code_used: string;
  points_awarded: number;
  created_at: string;
  referred_username?: string;
  is_active?: boolean; // Whether this referral is currently mining
}

interface ReferralStats {
  totalReferrals: number;
  activeMiners: number;
  inactiveMiners: number;
  totalEarnings: number;
}

const referralCodeCacheKey = (userId: string) => `arxon:referral_code:v1:${userId}`;
const referralsCacheKey = (userId: string) => `arxon:referrals:v1:${userId}`;
const referralStatsCacheKey = (userId: string) => `arxon:referral_stats:v1:${userId}`;

export const useReferrals = (user: User | null) => {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    activeMiners: 0,
    inactiveMiners: 0,
    totalEarnings: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchReferralCode = useCallback(async (forceRefresh?: boolean) => {
    if (!user) return;

    // Clear cache if forcing refresh
    if (forceRefresh) {
      try {
        localStorage.removeItem(referralCodeCacheKey(user.id));
      } catch {}
    }

    // Retry a few times because some devices/networks occasionally time out,
    // which made users appear to have "no referral code" even when it existed.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const timeoutMs = 12_000 + attempt * 4_000;
        const { data, error } = await withTimeout(
          supabase.from('profiles').select('referral_code').eq('user_id', user.id).maybeSingle(),
          timeoutMs
        );

        if (!error && data?.referral_code) {
          setReferralCode(data.referral_code);
          cacheSet(referralCodeCacheKey(user.id), data.referral_code);
          setLoading(false);
          return;
        }

        // If the code is missing for this account, self-heal to generate it
        if (!data?.referral_code) {
          const ensured = await ensureProfileFields(user.id);
          if (ensured?.referral_code) {
            setReferralCode(ensured.referral_code);
            cacheSet(referralCodeCacheKey(user.id), ensured.referral_code);
            setLoading(false);
            return;
          }
        }
      } catch {
        // keep cached UI
      }

      await sleep(250 + attempt * 250);
    }
    setLoading(false);
  }, [user]);

  const fetchReferrals = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await withTimeout(
        supabase
          .from('referrals')
          .select('*')
          .eq('referrer_id', user.id)
          .order('created_at', { ascending: false }),
        12_000
      );

      if (error) return;

      const rows = (data || []) as any[];

      if (rows.length === 0) {
        setReferrals([]);
        setStats({ totalReferrals: 0, activeMiners: 0, inactiveMiners: 0, totalEarnings: 0 });
        cacheSet(referralsCacheKey(user.id), []);
        cacheSet(referralStatsCacheKey(user.id), { totalReferrals: 0, activeMiners: 0, inactiveMiners: 0, totalEarnings: 0 });
        return;
      }

      const totalEarnings = rows.reduce((sum, r) => sum + Number(r.points_awarded || 0), 0);
      const referredIds = rows.map((r) => r.referred_id).filter(Boolean);

      // Fetch usernames for referred users (profiles table is publicly readable)
      let profiles: any[] = [];
      if (referredIds.length > 0) {
        try {
          // Batch in chunks of 50 to avoid URL length limits
          const chunks: string[][] = [];
          for (let i = 0; i < referredIds.length; i += 50) {
            chunks.push(referredIds.slice(i, i + 50));
          }
          const chunkResults = await Promise.all(
            chunks.map((chunk) =>
              withTimeout(
                supabase.from('profiles').select('user_id, username').in('user_id', chunk),
                12_000
              ).catch(() => ({ data: [] } as any))
            )
          );
          profiles = chunkResults.flatMap((r) => (r as any)?.data || []);
        } catch {
          // profiles stay empty - referrals still show
        }
      }

      // Try to get active mining sessions via RPC, then fallback
      let activeUserIds = new Set<string>();
      if (referredIds.length > 0) {
        try {
          // Try the security-definer RPC first
          const rpcRes = await withTimeout(
            supabase.rpc('get_active_referral_sessions' as any),
            10_000
          ).catch(() => null);
          const rpcData = (rpcRes as any)?.data;
          if (Array.isArray(rpcData) && rpcData.length > 0) {
            for (const session of rpcData) {
              if (session.user_id && referredIds.includes(session.user_id)) {
                activeUserIds.add(session.user_id);
              }
            }
          } else {
            // RPC missing or empty — try direct query (works if RLS allows it)
            const directRes = await withTimeout(
              supabase
                .from('mining_sessions')
                .select('user_id')
                .in('user_id', referredIds.slice(0, 50))
                .eq('is_active', true),
              10_000
            ).catch(() => null);
            const directData = (directRes as any)?.data;
            if (Array.isArray(directData)) {
              for (const s of directData) {
                if (s.user_id) activeUserIds.add(s.user_id);
              }
            }
          }
        } catch {
          // active status unknown — all show as inactive, referrals still display
        }
      }

      const referralsWithUsernames: ReferralData[] = rows.map((r) => ({
        ...r,
        referred_username: profiles.find((p) => p.user_id === r.referred_id)?.username || 'Miner',
        is_active: activeUserIds.has(r.referred_id),
      }));

      const activeCount = activeUserIds.size;
      const nextStats: ReferralStats = {
        totalReferrals: rows.length,
        activeMiners: activeCount,
        inactiveMiners: rows.length - activeCount,
        totalEarnings,
      };

      setReferrals(referralsWithUsernames);
      setStats(nextStats);
      cacheSet(referralsCacheKey(user.id), referralsWithUsernames);
      cacheSet(referralStatsCacheKey(user.id), nextStats);
    } catch {
      // keep cached UI
    }
  }, [user]);

  const applyReferralCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'You must be logged in' };
    }

    // Check if user already used a referral code
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_id', user.id)
      .maybeSingle();

    if (existingReferral) {
      return { success: false, error: 'You have already used a referral code' };
    }

    // Find the referrer by code
    const { data: referrerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('referral_code', code.toUpperCase())
      .maybeSingle();

    if (profileError || !referrerProfile) {
      return { success: false, error: 'Invalid referral code' };
    }

    if (referrerProfile.user_id === user.id) {
      return { success: false, error: 'You cannot use your own referral code' };
    }

    // Create the referral record
    const { error: insertError } = await supabase.from('referrals').insert({
      referrer_id: referrerProfile.user_id,
      referred_id: user.id,
      referral_code_used: code.toUpperCase(),
      points_awarded: 100, // Base referral bonus
    });

    if (insertError) {
      return { success: false, error: 'Failed to apply referral code' };
    }

    // Keep UI fresh
    void fetchReferrals();

    return { success: true };
  };

  // Initial fetch + cache hydration
  useEffect(() => {
    if (!user) {
      setReferralCode(null);
      setReferrals([]);
      setStats({ totalReferrals: 0, activeMiners: 0, inactiveMiners: 0, totalEarnings: 0 });
      setLoading(false);
      return;
    }

    // Hydrate from cache initially
    const cachedCode = cacheGet<string>(referralCodeCacheKey(user.id), { maxAgeMs: 24 * 60 * 60_000 });
    if (cachedCode?.data) setReferralCode(cachedCode.data);

    const cachedRefs = cacheGet<ReferralData[]>(referralsCacheKey(user.id), { maxAgeMs: 5 * 60_000 });
    if (cachedRefs?.data) setReferrals(cachedRefs.data);

    const cachedStats = cacheGet<ReferralStats>(referralStatsCacheKey(user.id), { maxAgeMs: 5 * 60_000 });
    if (cachedStats?.data) setStats(cachedStats.data);

    // Don't show loading if we have cached data
    if (cachedCode?.data) {
      setLoading(false);
    }

    // Always fetch fresh data from server (force refresh to bypass any stale cache)
    void fetchReferralCode(true);
    void fetchReferrals();
  }, [user, fetchReferralCode, fetchReferrals]);

  // Real-time subscription for referrals and mining sessions (for active miners count)
  useEffect(() => {
    if (!user) return;

    // Get the referred user IDs to filter mining session updates
    const referredIds = referrals.map(r => r.referred_id).filter(Boolean);

    const channel = supabase
      .channel('referrals-and-mining-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'referrals',
          filter: `referrer_id=eq.${user.id}`,
        },
        () => {
          void fetchReferrals();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mining_sessions',
        },
        (payload) => {
          // Only refresh if this mining session belongs to one of our referrals
          const sessionUserId = (payload.new as any)?.user_id || (payload.old as any)?.user_id;
          if (referredIds.length === 0 || referredIds.includes(sessionUserId)) {
            void fetchReferrals();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchReferrals, referrals]);

  const getReferralLink = () => {
    if (!referralCode) return '';

    // Prefer a canonical public URL (set this in Vercel as VITE_PUBLIC_SITE_URL=https://arxonchain.xyz)
    const configured = (import.meta.env as any).VITE_PUBLIC_SITE_URL as string | undefined;
    const normalizedConfigured = configured?.replace(/\/+$/, '');

    // Fallback: if someone is on a vercel.app preview URL, still generate the arxonchain.xyz link
    const origin =
      normalizedConfigured ||
      (window.location.hostname.endsWith('vercel.app') ? 'https://arxonchain.xyz' : window.location.origin);

    return `${origin}/?ref=${referralCode}`;
  };

  return {
    referralCode,
    referrals,
    stats,
    loading,
    getReferralLink,
    applyReferralCode,
    refreshReferrals: fetchReferrals,
  };
};
