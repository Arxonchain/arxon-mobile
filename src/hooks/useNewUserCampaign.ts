import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ── Device ID — stored in localStorage, persists across app opens ──────────
function getDeviceId(): string {
  try {
    const key = 'arxon_device_id';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = `${Capacitor.isNativePlatform() ? 'native' : 'web'}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(key, id);
    return id;
  } catch {
    return 'unknown_' + Date.now();
  }
}

// ── Is this a brand new install? ───────────────────────────────────────────
// Returns true only on native AND if 'arxon_first_open' has never been set
function checkAndMarkFirstOpen(): boolean {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const key = 'arxon_first_open';
    const existing = localStorage.getItem(key);
    if (existing) return false; // Already opened before — not new
    // First time ever opening — mark it
    localStorage.setItem(key, new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

export interface CampaignState {
  isNewInstall: boolean;
  isEligible: boolean;
  daysRemaining: number;
  daysClaimed: number;
  canClaimToday: boolean;
  campaignEnded: boolean;
  loading: boolean;
  claiming: boolean;
  claim: () => Promise<{ success: boolean; pointsAwarded?: number; error?: string }>;
}

export function useNewUserCampaign(): CampaignState {
  const { user } = useAuth();
  const [isNewInstall, setIsNewInstall] = useState(false);
  const [deviceId,     setDeviceId]     = useState('');
  const [record,       setRecord]       = useState<any>(null);
  const [loading,      setLoading]      = useState(true);
  const [claiming,     setClaiming]     = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const id = getDeviceId();
      const isNew = checkAndMarkFirstOpen();

      if (cancelled) return;
      setDeviceId(id);
      setIsNewInstall(isNew);

      if (!user) { setLoading(false); return; }

      // If new install, register in DB
      if (isNew) {
        await supabase.from('new_user_campaign').insert({
          user_id: user.id,
          device_id: id,
          first_open_at: new Date().toISOString(),
          is_eligible: true,
        }).then(() => {}); // ignore conflict — UNIQUE constraint handles it
      }

      // Fetch campaign record
      const { data } = await supabase
        .from('new_user_campaign')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!cancelled) {
        setRecord(data);
        setLoading(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, [user]);

  const claim = useCallback(async () => {
    if (!user || !deviceId) return { success: false, error: 'Not ready' };
    setClaiming(true);
    try {
      const { data, error } = await supabase.rpc('claim_new_user_reward' as any, {
        p_device_id: deviceId,
      });
      if (error) return { success: false, error: error.message };
      const result = data as any;
      if (result?.success) {
        // Refresh record
        const { data: updated } = await supabase
          .from('new_user_campaign')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        setRecord(updated);
        return { success: true, pointsAwarded: result.points_awarded };
      }
      return { success: false, error: result?.error || 'Claim failed' };
    } catch (e: any) {
      return { success: false, error: e.message };
    } finally {
      setClaiming(false);
    }
  }, [user, deviceId]);

  // ── Derive state ───────────────────────────────────────────────────────
  const now = new Date();
  const firstOpen   = record?.first_open_at ? new Date(record.first_open_at) : now;
  const daysSince   = Math.floor((now.getTime() - firstOpen.getTime()) / 86_400_000);
  const daysClaimed = record?.days_claimed ?? 0;
  const campaignEnded = daysSince >= 7 || daysClaimed >= 7 || record?.is_eligible === false;
  const daysRemaining = Math.max(0, 7 - daysClaimed);
  const lastClaim   = record?.last_claim_at ? new Date(record.last_claim_at) : null;
  const claimedToday = lastClaim ? lastClaim.toDateString() === now.toDateString() : false;
  const canClaimToday = !!record && isNewInstall && !campaignEnded && !claimedToday;

  return {
    isNewInstall,
    isEligible: !!record && !campaignEnded,
    daysRemaining,
    daysClaimed,
    canClaimToday,
    campaignEnded,
    loading,
    claiming,
    claim,
  };
}
