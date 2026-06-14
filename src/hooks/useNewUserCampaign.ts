import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Gets or creates a persistent device ID using Capacitor Preferences
async function getDeviceId(): Promise<string> {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: 'arxon_device_id' });
    if (value) return value;
    const id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await Preferences.set({ key: 'arxon_device_id', value: id });
    return id;
  } catch {
    // Fallback for web
    try {
      const stored = localStorage.getItem('arxon_device_id');
      if (stored) return stored;
      const id = `web_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem('arxon_device_id', id);
      return id;
    } catch {
      return 'unknown';
    }
  }
}

// Checks if this is a NEW device install (never opened app before)
// Returns true only on native platform with no existing device record
async function checkIsNewInstall(deviceId: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key: 'arxon_first_open' });
    return !value; // No first_open = brand new install
  } catch {
    return false;
  }
}

async function markFirstOpen(deviceId: string) {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key: 'arxon_first_open', value: new Date().toISOString() });
  } catch {}
}

export interface CampaignState {
  isNewInstall: boolean;       // True only for brand new device installs
  isEligible: boolean;         // Within 7-day window
  daysRemaining: number;       // Days left to claim
  daysClaimed: number;         // Days already claimed
  canClaimToday: boolean;      // Haven't claimed yet today
  campaignEnded: boolean;      // 7 days passed or all claimed
  loading: boolean;
  claiming: boolean;
  claim: () => Promise<{ success: boolean; pointsAwarded?: number; error?: string }>;
}

export function useNewUserCampaign(): CampaignState {
  const { user } = useAuth();
  const [deviceId,    setDeviceId]    = useState('');
  const [isNewInstall,setIsNewInstall]= useState(false);
  const [record,      setRecord]      = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [claiming,    setClaiming]    = useState(false);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const id = await getDeviceId();
      if (cancelled) return;
      setDeviceId(id);

      const newInstall = await checkIsNewInstall(id);
      if (cancelled) return;
      setIsNewInstall(newInstall);

      if (!user) { setLoading(false); return; }

      // If new install, register in DB
      if (newInstall) {
        await markFirstOpen(id);
        // Register campaign record (ignore conflict — device_id UNIQUE handles dupes)
        await supabase.from('new_user_campaign').insert({
          user_id: user.id,
          device_id: id,
          first_open_at: new Date().toISOString(),
          is_eligible: true,
        }).then(() => {}); // ignore error (may already exist)
      }

      // Fetch campaign record for this user
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
      const { data, error } = await supabase.rpc('claim_new_user_reward', {
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

  // Derive state from record
  const now = new Date();
  const firstOpen = record?.first_open_at ? new Date(record.first_open_at) : now;
  const daysSinceInstall = Math.floor((now.getTime() - firstOpen.getTime()) / 86400000);
  const daysClaimed = record?.days_claimed ?? 0;
  const campaignEnded = daysSinceInstall >= 7 || daysClaimed >= 7 || record?.is_eligible === false;
  const daysRemaining = Math.max(0, 7 - daysClaimed);

  const lastClaim = record?.last_claim_at ? new Date(record.last_claim_at) : null;
  const claimedToday = lastClaim
    ? lastClaim.toDateString() === now.toDateString()
    : false;

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
